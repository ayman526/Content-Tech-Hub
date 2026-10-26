import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") return null;
  return session;
}

const ModelSchema = z.object({
  providerId: z.string().min(1),
  displayName: z.string().min(1),
  apiModelId: z.string().min(1),
  internalKey: z.string().min(1),
  version: z.string().optional().nullable(),
  contextWindow: z.number().int().positive().optional().nullable(),
  outputLimit: z.number().int().positive().optional().nullable(),
  status: z.enum(["draft", "beta", "approved", "production", "deprecated", "retired", "disabled"]).default("draft"),
  latencyTier: z.enum(["fast", "balanced", "high-quality"]).default("balanced"),
  costTier: z.enum(["low", "medium", "premium"]).default("medium"),
  qualityTier: z.enum(["standard", "advanced", "flagship"]).default("standard"),
  capabilities: z.record(z.boolean()).default({}),
  domains: z.array(z.string()).default([]),
  languageGroups: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  benchmarkNotes: z.string().optional().nullable(),
  effectiveFrom: z.string().optional().nullable(),
  deprecatedAt: z.string().optional().nullable(),
  retiredAt: z.string().optional().nullable(),
  isDefault: z.boolean().default(false),
  notes: z.string().optional().nullable(),
  costPerInputTokenUsd: z.number().nonnegative().optional().nullable(),
  costPerOutputTokenUsd: z.number().nonnegative().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const providerId = searchParams.get("providerId");
  const status = searchParams.get("status");

  const models = await prisma.aiModel.findMany({
    where: {
      ...(providerId ? { providerId } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: [{ providerId: "asc" }, { displayName: "asc" }],
    include: { provider: { select: { name: true, type: true, status: true } } },
  });
  return NextResponse.json(models);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = ModelSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.aiModel.findUnique({ where: { internalKey: parsed.data.internalKey } });
  if (existing) return NextResponse.json({ error: "A model with this internal key already exists" }, { status: 409 });

  const { effectiveFrom, deprecatedAt, retiredAt, capabilities,
    providerId, displayName, apiModelId, internalKey, version,
    contextWindow, outputLimit, status, latencyTier, costTier, qualityTier,
    domains, languageGroups, warnings, benchmarkNotes, isDefault, notes,
    costPerInputTokenUsd, costPerOutputTokenUsd } = parsed.data;

  const model = await prisma.aiModel.create({
    data: {
      providerId, displayName, apiModelId, internalKey,
      version: version ?? null,
      contextWindow: contextWindow ?? null,
      outputLimit: outputLimit ?? null,
      status, latencyTier, costTier, qualityTier,
      capabilities: capabilities as Prisma.InputJsonObject,
      domains, languageGroups, warnings,
      benchmarkNotes: benchmarkNotes ?? null,
      isDefault: isDefault ?? false,
      notes: notes ?? null,
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null,
      deprecatedAt: deprecatedAt ? new Date(deprecatedAt) : null,
      retiredAt: retiredAt ? new Date(retiredAt) : null,
      costPerInputTokenUsd: costPerInputTokenUsd ?? null,
      costPerOutputTokenUsd: costPerOutputTokenUsd ?? null,
    },
    include: { provider: { select: { name: true, type: true, status: true } } },
  });

  await prisma.llmAuditLog.create({
    data: {
      actorId: (session.user as { id?: string }).id ?? null,
      actorEmail: (session.user as { email?: string }).email ?? null,
      action: "model_added",
      entityType: "model",
      entityId: model.id,
      entityName: model.displayName,
      after: { internalKey: model.internalKey, status: model.status, qualityTier: model.qualityTier } satisfies Prisma.InputJsonObject,
    },
  });

  return NextResponse.json(model, { status: 201 });
}
