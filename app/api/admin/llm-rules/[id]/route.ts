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
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  priority: z.number().int().min(1).max(9999).optional(),
  enabled: z.boolean().optional(),
  conditions: z.record(z.unknown()).optional(),
  primaryModelId: z.string().optional().nullable(),
  secondaryModelId: z.string().optional().nullable(),
  tertiaryModelId: z.string().optional().nullable(),
  policy: z.record(z.unknown()).optional(),
  isTemplate: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const before = await prisma.llmRoutingRule.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { conditions, policy, ...rest } = parsed.data;
  const actorEmail = (session.user as { email?: string }).email ?? null;

  const rule = await prisma.llmRoutingRule.update({
    where: { id },
    data: {
      ...rest,
      ...(conditions !== undefined ? { conditions: conditions as Prisma.InputJsonObject } : {}),
      ...(policy !== undefined ? { policy: policy as Prisma.InputJsonObject } : {}),
      updatedBy: actorEmail,
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
      action: "rule_updated",
      entityType: "rule",
      entityId: id,
      entityName: rule.name,
      before: { priority: before.priority, enabled: before.enabled } satisfies Prisma.InputJsonObject,
      after: { priority: rule.priority, enabled: rule.enabled } satisfies Prisma.InputJsonObject,
    },
  });

  return NextResponse.json(rule);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const rule = await prisma.llmRoutingRule.findUnique({ where: { id } });
  if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.llmRoutingRule.delete({ where: { id } });

  await prisma.llmAuditLog.create({
    data: {
      actorId: (session.user as { id?: string }).id ?? null,
      actorEmail: (session.user as { email?: string }).email ?? null,
      action: "rule_deleted",
      entityType: "rule",
      entityId: id,
      entityName: rule.name,
      before: { priority: rule.priority, enabled: rule.enabled } satisfies Prisma.InputJsonObject,
    },
  });

  return NextResponse.json({ ok: true });
}
