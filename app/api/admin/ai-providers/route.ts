import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encrypt";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") return null;
  return session;
}

const ProviderSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  baseUrl: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  environment: z.enum(["dev", "staging", "production"]).default("production"),
  status: z.enum(["active", "inactive"]).default("active"),
  rateLimitRpm: z.number().int().positive().optional().nullable(),
  costProfile: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  apiKey: z.string().optional(),
  orgProjectId: z.string().optional(),
});

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const providers = await prisma.aiProvider.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      secret: { select: { id: true, keyMasked: true, orgProjectId: true, rotatedAt: true, updatedBy: true } },
      _count: { select: { models: true } },
    },
  });
  return NextResponse.json(providers);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = ProviderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { apiKey, orgProjectId, ...providerData } = parsed.data;
  const actorEmail = (session.user as { email?: string }).email ?? null;
  const actorId = (session.user as { id?: string }).id ?? null;

  const provider = await prisma.aiProvider.create({
    data: {
      name: providerData.name,
      type: providerData.type,
      baseUrl: providerData.baseUrl ?? null,
      region: providerData.region ?? null,
      environment: providerData.environment,
      status: providerData.status,
      rateLimitRpm: providerData.rateLimitRpm ?? null,
      costProfile: providerData.costProfile ?? null,
      notes: providerData.notes ?? null,
    },
    include: {
      secret: { select: { id: true, keyMasked: true, orgProjectId: true, rotatedAt: true } },
      _count: { select: { models: true } },
    },
  });

  if (apiKey && apiKey.length > 0) {
    await prisma.providerSecret.create({
      data: {
        providerId: provider.id,
        encryptedKey: encrypt(apiKey),
        keyMasked: "…" + apiKey.slice(-4),
        orgProjectId: orgProjectId ?? null,
        updatedBy: actorEmail ?? null,
        rotatedAt: new Date(),
      },
    });
  }

  await prisma.llmAuditLog.create({
    data: {
      actorId,
      actorEmail,
      action: "provider_added",
      entityType: "provider",
      entityId: provider.id,
      entityName: provider.name,
      after: { name: provider.name, type: provider.type, environment: provider.environment },
    },
  });

  return NextResponse.json(provider, { status: 201 });
}
