import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as any).organizationId;
  const { id } = await params;

  const sub = await prisma.webhookSubscription.findUnique({ where: { id } });
  if (!sub || sub.organizationId !== orgId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { events, isActive } = await req.json();
  const updated = await prisma.webhookSubscription.update({
    where: { id },
    data: {
      ...(events !== undefined && { events }),
      ...(isActive !== undefined && { isActive, failureCount: isActive ? 0 : sub.failureCount }),
    },
    select: { id: true, url: true, events: true, isActive: true, failureCount: true, lastFiredAt: true, createdAt: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as any).organizationId;
  const { id } = await params;

  const sub = await prisma.webhookSubscription.findUnique({ where: { id } });
  if (!sub || sub.organizationId !== orgId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.webhookSubscription.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
