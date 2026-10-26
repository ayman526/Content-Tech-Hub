import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { decrypt } from "@/lib/encrypt";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") return null;
  return session;
}

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const provider = await prisma.aiProvider.findUnique({
    where: { id },
    include: { secret: true },
  });
  if (!provider) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const start = Date.now();
  let status: "ok" | "failed" | "degraded" | "timeout" = "failed";
  const diagnostics: Record<string, string | number | boolean | null> = {
    provider: provider.name, type: provider.type, environment: provider.environment,
  };

  try {
    if (!provider.secret) {
      diagnostics.error = "No credentials configured";
      diagnostics.hint = "Add an API key via the Credentials section";
    } else {
      const apiKey = decrypt(provider.secret.encryptedKey);
      const baseUrl = provider.baseUrl || resolveDefaultEndpoint(provider.type);

      if (!baseUrl) {
        diagnostics.error = "No base URL configured for this provider type";
      } else {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        try {
          const endpoint = buildTestEndpoint(provider.type, baseUrl);
          const headers: Record<string, string> = { "Content-Type": "application/json" };

          if (["openai", "azure", "custom"].includes(provider.type)) {
            headers["Authorization"] = `Bearer ${apiKey}`;
            if (provider.secret.orgProjectId) headers["OpenAI-Organization"] = provider.secret.orgProjectId;
          } else if (provider.type === "anthropic") {
            headers["x-api-key"] = apiKey;
            headers["anthropic-version"] = "2023-06-01";
          } else {
            headers["Authorization"] = `Bearer ${apiKey}`;
          }

          const response = await fetch(endpoint, { method: "GET", headers, signal: controller.signal });
          const latency = Date.now() - start;
          diagnostics.latencyMs = latency;
          diagnostics.httpStatus = response.status;
          diagnostics.endpoint = endpoint;

          if (response.ok) {
            status = latency > 3000 ? "degraded" : "ok";
            diagnostics.message = "Connection successful";
            try {
              const data = await response.json();
              if (data?.data && Array.isArray(data.data)) {
                diagnostics.modelsAvailable = data.data.length;
              } else if (data?.models && Array.isArray(data.models)) {
                diagnostics.modelsAvailable = data.models.length;
              }
            } catch { /* ignore */ }
          } else if (response.status === 401 || response.status === 403) {
            diagnostics.error = "Authentication failed — check API key";
          } else if (response.status === 429) {
            status = "degraded";
            diagnostics.message = "Rate limited but credentials valid";
          } else {
            diagnostics.error = `HTTP ${response.status}`;
          }
        } finally {
          clearTimeout(timeout);
        }
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      status = "timeout";
      diagnostics.error = "Connection timed out after 8s";
    } else {
      diagnostics.error = err instanceof Error ? err.message : "Unknown error";
    }
  }

  const latencyMs = Date.now() - start;

  await prisma.llmHealthCheck.create({
    data: { providerId: id, status, latencyMs, diagnostics: diagnostics satisfies Prisma.InputJsonObject },
  });

  await prisma.llmAuditLog.create({
    data: {
      actorId: (session.user as { id?: string }).id ?? null,
      actorEmail: (session.user as { email?: string }).email ?? null,
      action: "connection_test",
      entityType: "provider",
      entityId: id,
      entityName: provider.name,
      after: { status, latencyMs, ...diagnostics } satisfies Prisma.InputJsonObject,
    },
  });

  return NextResponse.json({ status, latencyMs, diagnostics });
}

function resolveDefaultEndpoint(type: string): string | null {
  const map: Record<string, string> = {
    openai: "https://api.openai.com",
    anthropic: "https://api.anthropic.com",
    google: "https://generativelanguage.googleapis.com",
    cohere: "https://api.cohere.ai",
    moonshot: "https://api.moonshot.cn",
    bedrock: "https://bedrock.us-east-1.amazonaws.com",
    vertex: "https://us-central1-aiplatform.googleapis.com",
  };
  return map[type] ?? null;
}

function buildTestEndpoint(type: string, baseUrl: string): string {
  const base = baseUrl.replace(/\/$/, "");
  if (["openai", "azure", "custom"].includes(type)) return `${base}/v1/models`;
  if (type === "anthropic") return `${base}/v1/models`;
  if (type === "cohere") return `${base}/v1/models`;
  if (type === "moonshot") return `${base}/v1/models`;
  return `${base}/`;
}
