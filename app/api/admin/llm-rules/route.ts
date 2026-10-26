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

const RuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  priority: z.number().int().min(1).max(9999).default(100),
  enabled: z.boolean().default(true),
  conditions: z.record(z.unknown()).default({}),
  primaryModelId: z.string().optional().nullable(),
  secondaryModelId: z.string().optional().nullable(),
  tertiaryModelId: z.string().optional().nullable(),
  policy: z.record(z.unknown()).default({}),
  isTemplate: z.boolean().default(false),
});

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rules = await prisma.llmRoutingRule.findMany({
    orderBy: { priority: "asc" },
    include: {
      primaryModel: { select: { id: true, displayName: true, internalKey: true, status: true, qualityTier: true } },
      secondaryModel: { select: { id: true, displayName: true, internalKey: true, status: true } },
      tertiaryModel: { select: { id: true, displayName: true, internalKey: true, status: true } },
    },
  });
  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = RuleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { conditions, policy, name, description, priority, enabled,
    primaryModelId, secondaryModelId, tertiaryModelId, isTemplate } = parsed.data;
  const actorEmail = (session.user as { email?: string }).email ?? null;

  const rule = await prisma.llmRoutingRule.create({
    data: {
      name,
      description: description ?? null,
      priority: priority ?? 100,
      enabled: enabled ?? true,
      conditions: conditions as Prisma.InputJsonObject,
      policy: policy as Prisma.InputJsonObject,
      primaryModelId: primaryModelId ?? null,
      secondaryModelId: secondaryModelId ?? null,
      tertiaryModelId: tertiaryModelId ?? null,
      isTemplate: isTemplate ?? false,
      createdBy: actorEmail,
    },
    include: {
      primaryModel: { select: { id: true, displayName: true, internalKey: true, status: true, qualityTier: true } },
      secondaryModel: { select: { id: true, displayName: true, internalKey: true, status: true } },
      tertiaryModel: { select: { id: true, displayName: true, internalKey: true, status: true } },
    },
  });

  await prisma.llmAuditLog.create({
    data: {
      actorId: (session.user as { id?: string }).id ?? null,
      actorEmail,
      action: "rule_created",
      entityType: "rule",
      entityId: rule.id,
      entityName: rule.name,
      after: { priority: rule.priority, enabled: rule.enabled } satisfies Prisma.InputJsonObject,
    },
  });

  return NextResponse.json(rule, { status: 201 });
}
