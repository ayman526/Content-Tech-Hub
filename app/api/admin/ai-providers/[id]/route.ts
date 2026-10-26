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
  type: z.string().min(1).optional(),
  baseUrl: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  environment: z.enum(["dev", "staging", "production"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  rateLimitRpm: z.number().int().positive().optional().nullable(),
  costProfile: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const provider = await prisma.aiProvider.findUnique({
    where: { id },
    include: {
      secret: { select: { id: true, keyMasked: true, orgProjectId: true, rotatedAt: true, updatedBy: true } },
      models: { orderBy: { displayName: "asc" } },
      _count: { select: { models: true } },
    },
  });
  if (!provider) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(provider);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const before = await prisma.aiProvider.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const provider = await prisma.aiProvider.update({ where: { id }, data: parsed.data });

  await prisma.llmAuditLog.create({
    data: {
      actorId: (session.user as { id?: string }).id ?? null,
      actorEmail: (session.user as { email?: string }).email ?? null,
      action: "provider_updated",
      entityType: "provider",
      entityId: id,
      entityName: provider.name,
      before: { status: before.status, environment: before.environment } satisfies Prisma.InputJsonObject,
      after: parsed.data as Prisma.InputJsonObject,
    },
  });

  return NextResponse.json(provider);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const provider = await prisma.aiProvider.findUnique({ where: { id }, include: { _count: { select: { models: true } } } });
  if (!provider) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (provider._count.models > 0) {
    return NextResponse.json({ error: "Cannot delete provider with registered models. Deactivate or remove models first." }, { status: 409 });
  }
  await prisma.aiProvider.delete({ where: { id } });
  await prisma.llmAuditLog.create({
    data: {
      actorId: (session.user as { id?: string }).id ?? null,
      actorEmail: (session.user as { email?: string }).email ?? null,
      action: "provider_deleted",
      entityType: "provider",
      entityId: id,
      entityName: provider.name,
      before: { name: provider.name, type: provider.type } satisfies Prisma.InputJsonObject,
    },
  });
  return NextResponse.json({ ok: true });
}
