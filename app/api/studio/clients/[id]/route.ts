import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateWorkspace, isSubscribed } from "@/lib/studio";

async function getClient(clientId: string, workspaceId: string) {
  return prisma.studioClient.findFirst({ where: { id: clientId, workspaceId } });
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "LINGUIST" && session.user.role !== "ADMIN"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ws = await getOrCreateWorkspace(session.user.id!);
  if (!isSubscribed(ws)) return NextResponse.json({ error: "Studio subscription required" }, { status: 403 });

  const { id } = await params;
  const client = await getClient(id, ws.id);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const jobs = await prisma.studioJob.findMany({
    where: { clientId: id, workspaceId: ws.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ ...client, jobs });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "LINGUIST" && session.user.role !== "ADMIN"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ws = await getOrCreateWorkspace(session.user.id!);
  if (!isSubscribed(ws)) return NextResponse.json({ error: "Studio subscription required" }, { status: 403 });

  const { id } = await params;
  const existing = await getClient(id, ws.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.studioClient.update({
    where: { id },
    data: {
      name: body.name ?? existing.name,
      contactName: body.contactName ?? existing.contactName,
      contactEmail: body.contactEmail ?? existing.contactEmail,
      companyName: body.companyName ?? existing.companyName,
      notes: body.notes ?? existing.notes,
      preferredLanguages: body.preferredLanguages ?? existing.preferredLanguages,
      status: body.status ?? existing.status,
      defaultTmId: body.defaultTmId !== undefined ? body.defaultTmId : existing.defaultTmId,
      defaultGlossaryId: body.defaultGlossaryId !== undefined ? body.defaultGlossaryId : existing.defaultGlossaryId,
      defaultStyleGuideId: body.defaultStyleGuideId !== undefined ? body.defaultStyleGuideId : existing.defaultStyleGuideId,
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
  const existing = await getClient(id, ws.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.studioClient.update({ where: { id }, data: { status: "ARCHIVED" } });
  return NextResponse.json({ ok: true });
}
