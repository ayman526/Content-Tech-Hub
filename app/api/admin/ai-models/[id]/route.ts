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

const UpdateSchema = z.object({
  displayName: z.string().min(1).optional(),
  apiModelId: z.string().min(1).optional(),
  version: z.string().optional().nullable(),
  contextWindow: z.number().int().positive().optional().nullable(),
  outputLimit: z.number().int().positive().optional().nullable(),
  status: z.enum(["draft", "beta", "approved", "production", "deprecated", "retired", "disabled"]).optional(),
  latencyTier: z.enum(["fast", "balanced", "high-quality"]).optional(),
  costTier: z.enum(["low", "medium", "premium"]).optional(),
  qualityTier: z.enum(["standard", "advanced", "flagship"]).optional(),
  capabilities: z.record(z.boolean()).optional(),
  domains: z.array(z.string()).optional(),
  languageGroups: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
  benchmarkNotes: z.string().optional().nullable(),
  effectiveFrom: z.string().optional().nullable(),
  deprecatedAt: z.string().optional().nullable(),
  retiredAt: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
  notes: z.string().optional().nullable(),
  costPerInputTokenUsd: z.number().nonnegative().optional().nullable(),
  costPerOutputTokenUsd: z.number().nonnegative().optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const before = await prisma.aiModel.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { effectiveFrom, deprecatedAt, retiredAt, capabilities, costPerInputTokenUsd, costPerOutputTokenUsd, ...rest } = parsed.data;

  const model = await prisma.aiModel.update({
    where: { id },
    data: {
      ...rest,
      ...(capabilities !== undefined ? { capabilities: capabilities as Prisma.InputJsonObject } : {}),
      ...(effectiveFrom !== undefined ? { effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null } : {}),
      ...(deprecatedAt !== undefined ? { deprecatedAt: deprecatedAt ? new Date(deprecatedAt) : null } : {}),
      ...(retiredAt !== undefined ? { retiredAt: retiredAt ? new Date(retiredAt) : null } : {}),
      ...(costPerInputTokenUsd !== undefined ? { costPerInputTokenUsd: costPerInputTokenUsd ?? null } : {}),
      ...(costPerOutputTokenUsd !== undefined ? { costPerOutputTokenUsd: costPerOutputTokenUsd ?? null } : {}),
    },
    include: { provider: { select: { name: true, type: true, status: true } } },
  });

  let action = "model_updated";
  if (before.status !== model.status) {
    if (model.status === "deprecated") action = "model_deprecated";
    else if (model.status === "disabled") action = "model_disabled";
    else if (model.status === "production") action = "model_activated";
    else if (model.status === "retired") action = "model_retired";
  }

  await prisma.llmAuditLog.create({
    data: {
      actorId: (session.user as { id?: string }).id ?? null,
      actorEmail: (session.user as { email?: string }).email ?? null,
      action,
      entityType: "model",
      entityId: id,
      entityName: model.displayName,
      before: { status: before.status, qualityTier: before.qualityTier } satisfies Prisma.InputJsonObject,
      after: { status: model.status, qualityTier: model.qualityTier } satisfies Prisma.InputJsonObject,
    },
  });

  return NextResponse.json(model);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const model = await prisma.aiModel.findUnique({ where: { id } });
  if (!model) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const usedInRules = await prisma.llmRoutingRule.count({
    where: { OR: [{ primaryModelId: id }, { secondaryModelId: id }, { tertiaryModelId: id }] },
  });
  if (usedInRules > 0) {
    return NextResponse.json({ error: `Model is referenced in ${usedInRules} routing rule(s). Remove those references first.` }, { status: 409 });
  }

  await prisma.aiModel.delete({ where: { id } });

  await prisma.llmAuditLog.create({
    data: {
      actorId: (session.user as { id?: string }).id ?? null,
      actorEmail: (session.user as { email?: string }).email ?? null,
      action: "model_deleted",
      entityType: "model",
      entityId: id,
      entityName: model.displayName,
      before: { internalKey: model.internalKey, status: model.status } satisfies Prisma.InputJsonObject,
    },
  });

  return NextResponse.json({ ok: true });
}
