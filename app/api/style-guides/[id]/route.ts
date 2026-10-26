import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as any).organizationId;
  const { id } = await params;

  const guide = await prisma.styleGuide.findUnique({ where: { id } });
  if (!guide || guide.organizationId !== orgId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(guide);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as any).organizationId;
  const { id } = await params;

  const guide = await prisma.styleGuide.findUnique({ where: { id } });
  if (!guide || guide.organizationId !== orgId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.styleGuide.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
