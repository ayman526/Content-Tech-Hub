import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateWorkspace, isSubscribed, logActivity } from "@/lib/studio";
import {
  saveTmpPdf,
  saveTmpPptx,
  extractPptxStructured,
  persistPptx,
} from "@/lib/pdf-pipeline";
import { extractPdf as extractPdfMicroservice, PdfServiceError } from "@/lib/pdf-processor-client";
import { parseDocx, parsePlainText } from "@/lib/segment-parser";
import { unlink, copyFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const PDF_STORAGE_DIR = join(process.cwd(), "storage", "studio-pdfs");

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "LINGUIST" && session.user.role !== "ADMIN"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ws = await getOrCreateWorkspace(session.user.id!);
  if (!isSubscribed(ws)) return NextResponse.json({ error: "Studio subscription required" }, { status: 403 });

  const { id: jobId } = await params;
  const job = await prisma.studioJob.findFirst({ where: { id: jobId, workspaceId: ws.id } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: "Invalid form data" }, { status: 400 }); }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const filename = file.name;
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";

  type Seg = { text: string; formatHint?: string };
  let segments: Seg[] = [];
  let layoutHtml: string | null = null;
  let structuredData: object | null = null;
  let storedPath: string | null = null;
  let tmpPdf: string | null = null;
  let tmpPptx: string | null = null;

  try {
    if (ext === "txt" || ext === "md") {
      const text = await file.text();
      segments = parsePlainText(text).map((s: any) => ({ text: s.text ?? s, formatHint: "p" }));
    } else if (ext === "docx") {
      const buf = Buffer.from(await file.arrayBuffer());
      segments = (await parseDocx(buf)).map((s: any) => ({ text: s.text ?? s, formatHint: "p" }));
    } else if (ext === "pdf") {
      tmpPdf = await saveTmpPdf(file);
      const pdfBuf = Buffer.from(await file.arrayBuffer());
      let msResult: Awaited<ReturnType<typeof extractPdfMicroservice>> | null = null;
      try {
        msResult = await extractPdfMicroservice(pdfBuf);
      } catch (err) {
        if (err instanceof PdfServiceError)
          return NextResponse.json({ error: "PDF processor service unavailable." }, { status: 503 });
        return NextResponse.json({ error: "Could not extract content from PDF." }, { status: 422 });
      }
      if (!msResult || msResult.blocks.length === 0)
        return NextResponse.json({ error: "Could not extract content from PDF." }, { status: 422 });

      const MIN_TEXT = 3;
      segments = msResult.blocks
        .filter(b => b.text.trim().length >= MIN_TEXT)
        .map(b => ({ text: b.text, formatHint: b.blockType === "heading" ? "h1" : b.blockType === "table-cell" ? "td" : "p" }));
      structuredData = { pageCount: msResult.pageCount, blocks: msResult.blocks, nonTextElements: msResult.nonTextElements };

      await mkdir(PDF_STORAGE_DIR, { recursive: true });
      const name = `${randomUUID()}.pdf`;
      storedPath = join(PDF_STORAGE_DIR, name);
      await copyFile(tmpPdf, storedPath);
    } else if (ext === "pptx" || ext === "ppt") {
      tmpPptx = await saveTmpPptx(file);
      const extracted = await extractPptxStructured(tmpPptx).catch(() => null);
      if (!extracted || extracted.segments.length === 0)
        return NextResponse.json({ error: "Could not extract content from PPTX." }, { status: 422 });
      segments = extracted.segments.map((s: any) => ({ text: s.text, formatHint: s.formatHint }));
      storedPath = await persistPptx(tmpPptx).catch(() => null);
    } else {
      return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
    }
  } finally {
    if (tmpPdf) await unlink(tmpPdf).catch(() => {});
    if (tmpPptx) await unlink(tmpPptx).catch(() => {});
  }

  if (segments.length === 0)
    return NextResponse.json({ error: "No content found in file." }, { status: 422 });

  const wordCount = segments.reduce((n, s) => n + s.text.trim().split(/\s+/).filter(Boolean).length, 0);

  const jobFile = await prisma.studioJobFile.create({
    data: {
      jobId,
      originalFilename: filename,
      fileType: ext,
      storedPath,
      wordCount,
      segments: segments as any,
      structuredData: structuredData as any,
      layoutHtml,
    },
  });

  await prisma.studioSegmentTranslation.createMany({
    data: segments.map((s, i) => ({
      fileId: jobFile.id,
      segmentIndex: i + 1,
      sourceText: s.text,
      formatHint: s.formatHint ?? "p",
    })),
  });

  await prisma.studioJob.update({
    where: { id: jobId },
    data: { wordCount: { increment: wordCount }, status: "IN_PROGRESS" },
  });

  await logActivity(ws.id, "file.uploaded", { jobId, filename, wordCount });

  return NextResponse.json({
    fileId: jobFile.id,
    filename,
    wordCount,
    segmentCount: segments.length,
  }, { status: 201 });
}
