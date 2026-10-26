import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateWorkspace, isSubscribed } from "@/lib/studio";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "LINGUIST" && session.user.role !== "ADMIN"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ws = await getOrCreateWorkspace(session.user.id!);
  if (!isSubscribed(ws)) return NextResponse.json({ error: "Studio subscription required" }, { status: 403 });

  const { id } = await params;
  const tm = await prisma.studioTm.findFirst({ where: { id, workspaceId: ws.id } });
  if (!tm) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(tm);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "LINGUIST" && session.user.role !== "ADMIN"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ws = await getOrCreateWorkspace(session.user.id!);
  if (!isSubscribed(ws)) return NextResponse.json({ error: "Studio subscription required" }, { status: 403 });

  const { id } = await params;
  const tm = await prisma.studioTm.findFirst({ where: { id, workspaceId: ws.id } });
  if (!tm) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.studioTm.update({
    where: { id },
    data: {
      name: body.name ?? tm.name,
      entries: body.entries ?? tm.entries,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "LINGUIST" && session.user.role !== "ADMIN"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ws = await getOrCreateWorkspace(session.user.id!);
  if (!isSubscribed(ws)) return NextResponse.json({ error: "Studio subscription required" }, { status: 403 });

  const { id } = await params;
  const tm = await prisma.studioTm.findFirst({ where: { id, workspaceId: ws.id } });
  if (!tm) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.studioTm.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
