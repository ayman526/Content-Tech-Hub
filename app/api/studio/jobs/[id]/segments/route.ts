import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateWorkspace, isSubscribed } from "@/lib/studio";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "LINGUIST" && session.user.role !== "ADMIN"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ws = await getOrCreateWorkspace(session.user.id!);
  if (!isSubscribed(ws)) return NextResponse.json({ error: "Studio subscription required" }, { status: 403 });

  const { id: jobId } = await params;
  const url = new URL(req.url);
  const fileId = url.searchParams.get("fileId");

  const job = await prisma.studioJob.findFirst({ where: { id: jobId, workspaceId: ws.id } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const where = fileId
    ? { file: { jobId }, fileId }
    : { file: { jobId } };

  const segments = await prisma.studioSegmentTranslation.findMany({
    where,
    orderBy: [{ fileId: "asc" }, { segmentIndex: "asc" }],
    include: { file: { select: { id: true, originalFilename: true } } },
  });

  return NextResponse.json(segments);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "LINGUIST" && session.user.role !== "ADMIN"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ws = await getOrCreateWorkspace(session.user.id!);
  if (!isSubscribed(ws)) return NextResponse.json({ error: "Studio subscription required" }, { status: 403 });

  const { id: jobId } = await params;
  const job = await prisma.studioJob.findFirst({ where: { id: jobId, workspaceId: ws.id } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const body = await req.json();
  const { updates } = body as { updates: { id: string; translatedText: string }[] };

  if (!Array.isArray(updates) || updates.length === 0)
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });

  await Promise.all(
    updates.map((u) =>
      prisma.studioSegmentTranslation.update({
        where: { id: u.id },
        data: { translatedText: u.translatedText, isDraft: false },
      })
    )
  );

  return NextResponse.json({ ok: true, saved: updates.length });
}
