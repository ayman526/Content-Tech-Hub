import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildOcrEnrichment } from "@/lib/ocr-pipeline";
import { toAbsoluteStoragePath } from "@/lib/storage-path";
import { existsSync } from "fs";
import { hasFeature } from "@/lib/plan-features";

/**
 * POST /api/ocr-requests/[id]/rerun
 *
 * Re-runs OCR on the stored source file using the best available provider
 * (Mistral when configured, Tesseract otherwise).  Useful when a request was
 * originally processed with Tesseract but the Mistral key has since been added.
 *
 * Only the request owner org may trigger a re-run.
 * VERIFIED requests are locked — they cannot be re-processed.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.organizationId ?? null;
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return NextResponse.json({ error: "Organisation not found" }, { status: 404 });
  const allowed = await hasFeature(org.plan, "ocr_requests");
  if (!allowed) {
    return NextResponse.json(
      { error: "Your plan does not include OCR Requests." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const record = await prisma.ocrRequest.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (record.status === "VERIFIED") {
    return NextResponse.json(
      { error: "Verified OCR requests cannot be re-processed." },
      { status: 409 },
    );
  }

  const absPath = toAbsoluteStoragePath(record.sourceFileUrl);
  if (!absPath || !existsSync(absPath)) {
    return NextResponse.json(
      { error: "Source file not found on server. Cannot re-run OCR." },
      { status: 422 },
    );
  }

  const mime = record.sourceMimeType ?? "application/pdf";

  let enrichment;
  try {
    enrichment = await buildOcrEnrichment(absPath, null, mime);
  } catch (err) {
    console.error("[rerun-ocr] buildOcrEnrichment failed:", err);
    return NextResponse.json(
      { error: "OCR processing failed. Please try again." },
      { status: 500 },
    );
  }

  const pages = enrichment.pages;
  const wordCount = pages.reduce(
    (sum, p) => sum + (p.text ?? "").trim().split(/\s+/).filter(Boolean).length,
    0,
  );
  const perPageConfidence = pages.map((p) => p.confidence ?? 0);

  const updated = await prisma.ocrRequest.update({
    where: { id },
    data: {
      provider: enrichment.provider,
      avgConfidence: enrichment.avgConfidence,
      perPageConfidence,
      pages: pages as object[],
      wordCount,
      extractedText: enrichment.extractedText ?? null,
      extractedMarkdown: enrichment.extractedMarkdown ?? null,
      structuredLayout: enrichment.structuredLayout
        ? (enrichment.structuredLayout as object)
        : undefined,
      // Reset status so the user can re-verify if confidence now passes the gate
      status: "NEEDS_VERIFICATION",
    },
  });

  return NextResponse.json({ ...updated, avgConfidence: Number(updated.avgConfidence) });
}
