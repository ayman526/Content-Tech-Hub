import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateWorkspace, isSubscribed } from "@/lib/studio";

async function getJob(jobId: string, workspaceId: string) {
  return prisma.studioJob.findFirst({
    where: { id: jobId, workspaceId },
    include: {
      client: { select: { id: true, name: true } },
      files: {
        include: {
          translations: { orderBy: { segmentIndex: "asc" } },
        },
      },
    },
  });
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "LINGUIST" && session.user.role !== "ADMIN"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ws = await getOrCreateWorkspace(session.user.id!);
  if (!isSubscribed(ws)) return NextResponse.json({ error: "Studio subscription required" }, { status: 403 });

  const { id } = await params;
  const job = await getJob(id, ws.id);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(job);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "LINGUIST" && session.user.role !== "ADMIN"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ws = await getOrCreateWorkspace(session.user.id!);
  if (!isSubscribed(ws)) return NextResponse.json({ error: "Studio subscription required" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.studioJob.findFirst({ where: { id, workspaceId: ws.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.studioJob.update({
    where: { id },
    data: {
      title: body.title ?? existing.title,
      sourceLanguage: body.sourceLanguage ?? existing.sourceLanguage,
      targetLanguage: body.targetLanguage ?? existing.targetLanguage,
      clientId: body.clientId !== undefined ? (body.clientId || null) : existing.clientId,
      deadline: body.deadline !== undefined ? (body.deadline ? new Date(body.deadline) : null) : existing.deadline,
      notes: body.notes !== undefined ? (body.notes || null) : existing.notes,
      status: body.status ?? existing.status,
      translationMethod: body.translationMethod ?? existing.translationMethod,
      attachedTmId: body.attachedTmId !== undefined ? (body.attachedTmId || null) : existing.attachedTmId,
      attachedGlossaryId: body.attachedGlossaryId !== undefined ? (body.attachedGlossaryId || null) : existing.attachedGlossaryId,
      attachedStyleGuideId: body.attachedStyleGuideId !== undefined ? (body.attachedStyleGuideId || null) : existing.attachedStyleGuideId,
    },
    include: { client: { select: { id: true, name: true } } },
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
  const existing = await prisma.studioJob.findFirst({ where: { id, workspaceId: ws.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.studioJob.update({ where: { id }, data: { status: "ARCHIVED" } });
  return NextResponse.json({ ok: true });
}
