import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateWorkspace, isSubscribed, logActivity } from "@/lib/studio";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "LINGUIST" && session.user.role !== "ADMIN"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ws = await getOrCreateWorkspace(session.user.id!);
  if (!isSubscribed(ws)) return NextResponse.json({ error: "Studio subscription required" }, { status: 403 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const clientId = url.searchParams.get("clientId");

  const jobs = await prisma.studioJob.findMany({
    where: {
      workspaceId: ws.id,
      ...(status ? { status } : {}),
      ...(clientId ? { clientId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { id: true, name: true } },
      files: { select: { id: true, originalFilename: true, wordCount: true, aiDraftGenerated: true } },
    },
  });
  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "LINGUIST" && session.user.role !== "ADMIN"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ws = await getOrCreateWorkspace(session.user.id!);
  if (!isSubscribed(ws)) return NextResponse.json({ error: "Studio subscription required" }, { status: 403 });

  const body = await req.json();
  const {
    title, sourceLanguage, targetLanguage, clientId, deadline,
    notes, translationMethod, attachedTmId, attachedGlossaryId, attachedStyleGuideId,
  } = body;

  if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!sourceLanguage || !targetLanguage)
    return NextResponse.json({ error: "Source and target languages are required" }, { status: 400 });

  if (clientId) {
    const clientOk = await prisma.studioClient.findFirst({ where: { id: clientId, workspaceId: ws.id } });
    if (!clientOk) return NextResponse.json({ error: "Invalid client" }, { status: 400 });
  }

  const job = await prisma.studioJob.create({
    data: {
      workspaceId: ws.id,
      title: title.trim(),
      sourceLanguage,
      targetLanguage,
      clientId: clientId || null,
      deadline: deadline ? new Date(deadline) : null,
      notes: notes || null,
      translationMethod: translationMethod ?? "AI_DRAFT_HUMAN_REVISION",
      attachedTmId: attachedTmId || null,
      attachedGlossaryId: attachedGlossaryId || null,
      attachedStyleGuideId: attachedStyleGuideId || null,
      status: "DRAFT",
    },
    include: { client: { select: { id: true, name: true } } },
  });

  await logActivity(ws.id, "job.created", {
    jobId: job.id,
    title: job.title,
    method: job.translationMethod,
  });
  return NextResponse.json(job, { status: 201 });
}
