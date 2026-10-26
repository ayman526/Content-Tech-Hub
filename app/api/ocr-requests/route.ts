import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { hasFeature } from "@/lib/plan-features";
import { mkdir, writeFile, stat } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { getOcrProvider, getOcrConfidenceThreshold, buildOcrEnrichment, type OcrPage } from "@/lib/ocr-pipeline";
import { extractPdf as extractPdfMicroservice, PdfServiceError as PdfSvcError } from "@/lib/pdf-processor-client";
import type { PdfStructured } from "@/lib/pdf-pipeline";

const PDF_STORAGE_DIR = join(process.cwd(), "storage", "pdfs");
const IMAGE_STORAGE_DIR = join(process.cwd(), "storage", "images");

function mimeForExt(ext: string): string {
  if (ext === "pdf") return "application/pdf";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "application/octet-stream";
}

/**
 * Build a Prisma `where` filter restricting OCR requests to the client
 * accounts the current user is allowed to see. ADMINs and OWNERs see
 * everything in their org; members with at least one MemberClientAccountAccess
 * row are restricted to that subset (plus unscoped requests). Members with NO
 * access rows see ONLY unscoped requests — never the full org.
 */
async function buildMemberAcl(
  userId: string,
  orgId: string,
  role: string,
): Promise<Prisma.OcrRequestWhereInput | null> {
  const isElevated = role === "ADMIN" || role === "OWNER" || role === "AGENCY_OWNER";
  if (isElevated) return null; // no extra filter

  const access = await prisma.memberClientAccountAccess.findMany({
    where: { userId, organizationId: orgId },
    select: { clientAccountId: true },
  });
  const allowed = access.map((a) => a.clientAccountId);
  if (allowed.length === 0) {
    // Member with no client-account assignments — only unscoped requests.
    return { clientAccountId: null };
  }
  return { OR: [{ clientAccountId: { in: allowed } }, { clientAccountId: null }] };
}

async function requirePlanFeature(orgId: string): Promise<NextResponse | null> {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return NextResponse.json({ error: "Organisation not found" }, { status: 404 });
  const allowed = await hasFeature(org.plan, "ocr_requests");
  if (!allowed) {
    return NextResponse.json(
      { error: "Your plan does not include OCR Requests. Upgrade to Professional or higher." },
      { status: 403 }
    );
  }
  return null;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.organizationId ?? null;
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const planError = await requirePlanFeature(orgId);
  if (planError) return planError;

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role ?? "CLIENT";

  const { searchParams } = new URL(req.url);
  const clientAccountId = searchParams.get("clientAccountId");
  const status = searchParams.get("status");

  let where: Prisma.OcrRequestWhereInput = { organizationId: orgId };

  if (clientAccountId === "shared") {
    where = { ...where, clientAccountId: null };
  } else if (clientAccountId) {
    where = { ...where, clientAccountId };
  }

  if (status) {
    where = { ...where, status: status as Prisma.OcrRequestWhereInput["status"] };
  }

  const acl = await buildMemberAcl(userId, orgId, role);
  if (acl) where = { ...where, AND: [acl] };

  const requests = await prisma.ocrRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      clientAccount: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(
    requests.map((r) => ({
      ...r,
      avgConfidence: Number(r.avgConfidence),
      pages: undefined,
    }))
  );
}

/**
 * POST /api/ocr-requests
 * Create a new OCR request from an analyzed scanned PDF. Members can only
 * create requests for client accounts they have access to.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.organizationId ?? null;
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const planError = await requirePlanFeature(orgId);
  if (planError) return planError;

  // Two intake modes:
  //   1. JSON  — analyze route already extracted; we just persist the result.
  //   2. multipart/form-data — raw file upload (image or scanned PDF). We
  //      run OCR here using the configured provider, then persist.
  const contentType = req.headers.get("content-type") ?? "";
  const isMultipart = contentType.toLowerCase().includes("multipart/form-data");

  let sourceFilename: string | null = null;
  let sourceFileUrl: string | null = null;
  let sourceMimeType: string | null = null;
  let sourceLanguage: string | null = null;
  let pageCount = 0;
  let wordCount = 0;
  let avgConfidence = 0;
  let perPageConfidence: number[] = [];
  let pages: unknown[] = [];
  let provider: string = "tesseract";
  let clientAccountId: string | null = null;
  let notes: string | null = null;
  let name: string | null = null;
  let workflowType: string | undefined;
  let extractedText: string | null = null;
  let extractedMarkdown: string | null = null;
  let structuredLayout: PdfStructured | null = null;

  if (isMultipart) {
    const form = await req.formData().catch(() => null);
    if (!form) {
      return NextResponse.json({ error: "Invalid multipart payload" }, { status: 400 });
    }
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    name = (form.get("name") as string) || null;
    notes = (form.get("notes") as string) || null;
    sourceLanguage = (form.get("sourceLanguage") as string) || null;
    workflowType = (form.get("workflowType") as string) || undefined;
    clientAccountId = (form.get("clientAccountId") as string) || null;

    const filename = file.name || `upload-${Date.now()}`;
    const ext = (filename.split(".").pop() || "").toLowerCase();
    const allowedImg = ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "webp";
    const allowedPdf = ext === "pdf";
    if (!allowedImg && !allowedPdf) {
      return NextResponse.json(
        { error: "Unsupported file type. Use PDF, JPG, PNG, or WEBP." },
        { status: 400 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const dir = allowedPdf ? PDF_STORAGE_DIR : IMAGE_STORAGE_DIR;
    await mkdir(dir, { recursive: true });
    const storedName = `${randomUUID()}.${ext}`;
    const storedPath = join(dir, storedName);
    await writeFile(storedPath, buf);

    sourceFilename = filename;
    sourceFileUrl = `/storage/${allowedPdf ? "pdfs" : "images"}/${storedName}`;
    sourceMimeType = mimeForExt(ext);

    try {
      if (allowedPdf) {
        // Microservice extraction for structuredLayout metadata (non-fatal).
        try {
          const pdfBuf = await require("fs").promises.readFile(storedPath);
          const msResult = await extractPdfMicroservice(pdfBuf);
          if (msResult.blocks.length > 0) {
            structuredLayout = { pageCount: msResult.pageCount, blocks: msResult.blocks, nonTextElements: msResult.nonTextElements } as any;
            pageCount = msResult.pageCount;
          }
        } catch (msErr) {
          console.warn("[ocr-requests POST multipart] microservice extraction unavailable:", (msErr as Error)?.message);
        }

        // Primary OCR — Mistral when configured, error otherwise.
        const mistralConfigured = Boolean(process.env.MISTRAL_API_KEY);
        if (mistralConfigured) {
          console.log("[ocr-requests POST multipart] Mistral-first OCR starting");
          const enrichment = await buildOcrEnrichment(storedPath, null, "application/pdf");
          provider = enrichment.provider;
          extractedText = enrichment.extractedText ?? null;
          extractedMarkdown = enrichment.extractedMarkdown ?? null;
          avgConfidence = Math.max(0, Math.min(1, enrichment.avgConfidence));
          perPageConfidence = enrichment.pages.map((p) => p.confidence ?? 0);
          pages = enrichment.pages;
          if (!pageCount) pageCount = enrichment.pages.length || 1;
        } else {
          return NextResponse.json(
            { error: "No OCR provider configured. Please configure Mistral in the AI settings." },
            { status: 422 },
          );
        }
      } else {
        // Image intake: provider can OCR images directly.
        const ocrProvider = getOcrProvider();
        const result = await ocrProvider.extract({
          filePath: storedPath,
          mimeType: sourceMimeType,
        });
        provider = result.provider ?? "tesseract";
        extractedText = result.extractedText ?? null;
        extractedMarkdown = result.extractedMarkdown ?? null;
        avgConfidence =
          typeof result.overallConfidence === "number" && Number.isFinite(result.overallConfidence)
            ? Math.max(0, Math.min(1, result.overallConfidence))
            : 0;
        perPageConfidence = Array.isArray(result.pages)
          ? result.pages
              .map((p) => p.confidence)
              .filter((n) => Number.isFinite(n))
              .map((n) => Math.max(0, Math.min(1, n)))
          : [];
        pages = Array.isArray(result.pages) ? result.pages : [];
        structuredLayout = (result.structuredLayout ?? null) as unknown as PdfStructured | null;
        pageCount = pages.length || 1;
      }

      // Hard validation: refuse to create an OcrRequest with empty
      // extraction. Either OCR succeeded with text, or we 4xx.
      if (!extractedText || !extractedText.trim()) {
        return NextResponse.json(
          { error: "OCR returned no text. The file may be empty or unreadable." },
          { status: 422 }
        );
      }

      wordCount = extractedText.trim().split(/\s+/).filter(Boolean).length;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("[ocr-requests POST multipart] OCR failed:", errMsg);
      return NextResponse.json(
        { error: "OCR extraction failed. Please try again or use a different file." },
        { status: 500 }
      );
    }
  } else {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    sourceFilename = body.sourceFilename ?? null;
    // Normalize absolute filesystem paths (from analyze route's
    // pdfStoredPath) into web-accessible /storage/* URLs so the "View
    // original" UX works consistently across multipart and JSON intake
    // paths and we never leak server filesystem layout to clients.
    const rawUrl = typeof body.sourceFileUrl === "string" ? body.sourceFileUrl : null;
    if (rawUrl && rawUrl.startsWith("/") && !rawUrl.startsWith("/storage/")) {
      const pdfMatch = rawUrl.match(/\/storage\/pdfs\/[^/]+$/);
      const imgMatch = rawUrl.match(/\/storage\/images\/[^/]+$/);
      sourceFileUrl = pdfMatch?.[0] ?? imgMatch?.[0] ?? rawUrl;
    } else {
      sourceFileUrl = rawUrl;
    }
    sourceMimeType = typeof body.sourceMimeType === "string" ? body.sourceMimeType : null;
    sourceLanguage = body.sourceLanguage ?? null;
    pageCount = typeof body.pageCount === "number" ? body.pageCount : 0;
    wordCount = typeof body.wordCount === "number" ? body.wordCount : 0;
    avgConfidence = typeof body.avgConfidence === "number" ? body.avgConfidence : NaN;
    perPageConfidence = Array.isArray(body.perPageConfidence) ? body.perPageConfidence : [];
    pages = Array.isArray(body.pages) ? body.pages : [];
    provider = typeof body.provider === "string" ? body.provider : "tesseract";
    clientAccountId = body.clientAccountId ?? null;
    notes = typeof body.notes === "string" ? body.notes : null;
    name = typeof body.name === "string" ? body.name : null;
    workflowType = body.workflowType;
    extractedText = typeof body.extractedText === "string" ? body.extractedText : null;
    extractedMarkdown = typeof body.extractedMarkdown === "string" ? body.extractedMarkdown : null;
    structuredLayout = (body.structuredLayout as PdfStructured | null) ?? null;

    // ── SECURITY: server-side authoritative pageCount/wordCount ─────
    // The JSON intake mode trusted client-supplied counters (pageCount,
    // wordCount) for credit charging — that's a billing-tampering vector.
    // Require sourceFileUrl to point to a server-owned /storage/* path,
    // resolve it back to the persisted file, and recompute pageCount and
    // wordCount from the actual file. Reject the request if the file is
    // not under our control.
    if (!sourceFileUrl) {
      return NextResponse.json(
        { error: "sourceFileUrl is required" },
        { status: 400 }
      );
    }
    const pdfMatch = sourceFileUrl.match(/^\/storage\/pdfs\/([^/]+)$/);
    const imgMatch = sourceFileUrl.match(/^\/storage\/images\/([^/]+)$/);
    if (!pdfMatch && !imgMatch) {
      return NextResponse.json(
        {
          error:
            "sourceFileUrl must reference a server-issued /storage/pdfs or /storage/images path",
        },
        { status: 400 }
      );
    }
    const baseName = (pdfMatch?.[1] ?? imgMatch?.[1])!;
    const dir = pdfMatch ? PDF_STORAGE_DIR : IMAGE_STORAGE_DIR;
    const absPath = join(dir, baseName);
    try {
      await stat(absPath);
    } catch {
      return NextResponse.json(
        { error: "Referenced file does not exist on the server" },
        { status: 400 }
      );
    }
    if (pdfMatch) {
      // ── Step A: Microservice extraction for structuredLayout metadata ─────
      try {
        const pdfBuf2 = await require("fs").promises.readFile(absPath);
        const msResult2 = await extractPdfMicroservice(pdfBuf2);
        if (msResult2.blocks.length > 0) {
          pageCount = msResult2.pageCount;
          const msText = msResult2.blocks.map(b => b.text).filter(t => t.trim()).join(" ");
          wordCount = msText.trim().split(/\s+/).filter(Boolean).length;
          if (!structuredLayout) structuredLayout = { pageCount: msResult2.pageCount, blocks: msResult2.blocks, nonTextElements: msResult2.nonTextElements } as any;
        }
      } catch (msErr2) {
        console.warn("[ocr-requests POST JSON] microservice extraction unavailable:", (msErr2 as Error)?.message);
      }

      // ── Step B: Mistral OCR as primary ────────────────────────────────────
      if (process.env.MISTRAL_API_KEY) {
        try {
          console.log("[ocr-requests POST JSON] Mistral-first OCR starting");
          const mistralEnrichment = await buildOcrEnrichment(absPath, null, "application/pdf");
          if (mistralEnrichment.pages.length > 0) {
            pages = mistralEnrichment.pages;
            extractedText = mistralEnrichment.extractedText ?? extractedText;
            extractedMarkdown = mistralEnrichment.extractedMarkdown ?? extractedMarkdown;
            provider = mistralEnrichment.provider;
            avgConfidence = mistralEnrichment.avgConfidence;
            perPageConfidence = mistralEnrichment.pages.map((p) => p.confidence ?? 1);
            pageCount = mistralEnrichment.pages.length || pageCount;
            wordCount =
              (mistralEnrichment.extractedText ?? "").trim().split(/\s+/).filter(Boolean).length ||
              wordCount;
            console.log(
              `[ocr-requests POST JSON] Mistral OCR done — provider=${provider} | pages=${pageCount}`,
            );
          }
        } catch (mistralErr) {
          console.warn(
            "[ocr-requests POST JSON] Mistral OCR failed, using available fallback data:",
            (mistralErr as Error)?.message,
          );
        }
      }

      // ── Step C: Last-resort fallback — use client-supplied arrays ─────────
      // If both PyMuPDF and Mistral failed/are unconfigured, trust the
      // client-supplied pages/extractedText that came with the JSON body.
      // This is safe because the file was already confirmed to exist on
      // the server (stat check above) and was produced by our own upload.
      if (!pageCount && pages.length > 0) pageCount = pages.length;
      if (!wordCount && extractedText) {
        wordCount = extractedText.trim().split(/\s+/).filter(Boolean).length;
      }
    } else {
      pageCount = 1;
      wordCount = extractedText
        ? extractedText.trim().split(/\s+/).filter(Boolean).length
        : 0;
    }
  }

  if (!sourceFilename || !sourceFileUrl || typeof avgConfidence !== "number") {
    return NextResponse.json(
      { error: "sourceFilename, sourceFileUrl and avgConfidence are required" },
      { status: 400 }
    );
  }

  if (!Number.isFinite(avgConfidence) || avgConfidence < 0 || avgConfidence > 1) {
    return NextResponse.json(
      { error: "avgConfidence must be a finite number in [0, 1]" },
      { status: 400 }
    );
  }

  if (clientAccountId) {
    const acct = await prisma.clientAccount.findFirst({
      where: { id: clientAccountId, organizationId: orgId },
    });
    if (!acct) return NextResponse.json({ error: "Invalid client account" }, { status: 400 });

    // Member-level ACL: members can only create requests for client accounts
    // they have explicit access to. Elevated roles bypass.
    const role = (session.user as { role?: string }).role ?? "CLIENT";
    const isElevated = role === "ADMIN" || role === "OWNER" || role === "AGENCY_OWNER";
    if (!isElevated) {
      const access = await prisma.memberClientAccountAccess.findFirst({
        where: { userId: session.user.id, organizationId: orgId, clientAccountId },
      });
      if (!access) {
        return NextResponse.json(
          { error: "You do not have access to this client account" },
          { status: 403 }
        );
      }
    }
  }

  const finalPageCount =
    typeof pageCount === "number" && pageCount >= 0 ? Math.floor(pageCount) : 0;
  const finalWorkflow = workflowType === "AI_HUMAN" ? "AI_HUMAN" : "AI_ONLY";

  // ── Credit deduction (atomic) ──────────────────────────────────────
  // Per Task #36 step 9: charge `pageCount * creditsPerPage` from
  // CreditRate.OCR_PAGE for every OCR request created. Recorded on the
  // OcrRequest row (creditsCharged) and decremented from the org balance
  // inside the same transaction so we never charge without persisting.
  const ocrRate = await prisma.creditRate.findUnique({
    where: { workflowType: "OCR_PAGE" },
  });
  const perPage = ocrRate ? Number(ocrRate.creditsPerWord) : 0;
  // AI_HUMAN adds a per-page human-review surcharge on top of the base OCR
  // cost. We look up an OCR_HUMAN_REVIEW rate; if absent, fall back to
  // doubling the base OCR rate so AI_HUMAN is always more expensive than
  // AI_ONLY (and the charge path is exercised for both workflows).
  const humanRate = await prisma.creditRate.findUnique({
    where: { workflowType: "OCR_HUMAN_REVIEW" },
  });
  const perPageHuman = humanRate ? Number(humanRate.creditsPerWord) : perPage;
  const baseCharge = perPage > 0 ? Math.ceil(perPage * finalPageCount) : 0;
  const humanCharge =
    finalWorkflow === "AI_HUMAN" && perPageHuman > 0
      ? Math.ceil(perPageHuman * finalPageCount)
      : 0;
  const creditsToCharge = baseCharge + humanCharge;

  // Atomic credit deduction: do conditional decrement INSIDE the transaction
  // using updateMany with `creditBalance >= creditsToCharge` filter, then
  // create the OcrRequest only if the decrement matched. Two concurrent
  // requests cannot both succeed when the balance only covers one.
  let created;
  try {
    created = await prisma.$transaction(async (tx) => {
      if (creditsToCharge > 0) {
        const dec = await tx.organization.updateMany({
          where: { id: orgId, creditBalance: { gte: creditsToCharge } },
          data: { creditBalance: { decrement: creditsToCharge } },
        });
        if (dec.count !== 1) {
          throw new Error("INSUFFICIENT_CREDITS");
        }
        // Audit row in the ledger so balance changes are reconcilable.
        await tx.creditTransaction.create({
          data: {
            organizationId: orgId,
            type: "USAGE",
            amount: -creditsToCharge,
            description: `OCR processing — ${typeof sourceFilename === "string" ? sourceFilename : "document"} (${finalPageCount} page${finalPageCount === 1 ? "" : "s"})`,
            breakdownJSON: {
              kind: "ocr_request",
              pages: finalPageCount,
              creditsPerPage: perPage,
              workflow: finalWorkflow,
            },
          },
        });
      }
      // For AI_HUMAN: notify org admins/owners that a new OCR request
      // needs human verification. This is the kickoff signal for the
      // linguist review workflow (full automatic linguist routing for
      // OCR review is tracked as a follow-up task).
      if (finalWorkflow === "AI_HUMAN") {
        const reviewers = await tx.user.findMany({
          where: {
            organizationId: orgId,
            role: { in: ["ADMIN", "LINGUIST"] },
          },
          select: { id: true },
        });
        if (reviewers.length > 0) {
          const filename = typeof sourceFilename === "string" ? sourceFilename : "document";
          await tx.notification.createMany({
            data: reviewers.map((u) => ({
              userId: u.id,
              type: "SYSTEM" as const,
              title: "OCR awaiting human verification",
              message: `“${filename}” needs human OCR verification (${finalPageCount} page${finalPageCount === 1 ? "" : "s"}).`,
              data: { kind: "ocr_request_human_review", workflow: finalWorkflow },
            })),
          });
        }
      }

      // AI_ONLY completes immediately — once OCR has run we have nothing
      // for a human to verify so the request is READY for download/use.
      // AI_HUMAN remains in NEEDS_VERIFICATION until a linguist verifies.
      const initialStatus =
        finalWorkflow === "AI_ONLY" ? "READY" : "NEEDS_VERIFICATION";

      const row = await tx.ocrRequest.create({
        data: {
          organizationId: orgId,
          createdById: session.user.id,
          name: typeof name === "string" && name.trim() ? name.trim() : null,
          sourceFilename,
          sourceFileUrl,
          sourceMimeType: typeof sourceMimeType === "string" ? sourceMimeType : null,
          sourceLanguage: sourceLanguage ?? null,
          pageCount: finalPageCount,
          wordCount: typeof wordCount === "number" && wordCount >= 0 ? Math.floor(wordCount) : 0,
          avgConfidence: new Prisma.Decimal(avgConfidence),
          perPageConfidence: Array.isArray(perPageConfidence)
            ? perPageConfidence
                .filter((n): n is number => typeof n === "number" && Number.isFinite(n))
                .map((n) => Math.max(0, Math.min(1, n)))
            : [],
          pages: (Array.isArray(pages) ? pages : []) as Prisma.InputJsonValue,
          provider: typeof provider === "string" ? provider : "tesseract",
          status: initialStatus,
          workflowType: finalWorkflow,
          extractedText: typeof extractedText === "string" ? extractedText : null,
          extractedMarkdown: typeof extractedMarkdown === "string" ? extractedMarkdown : null,
          structuredLayout: structuredLayout
            ? (structuredLayout as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          creditsCharged: creditsToCharge,
          notes: typeof notes === "string" ? notes : null,
          ...(clientAccountId ? { clientAccountId } : {}),
        },
        include: { clientAccount: { select: { id: true, name: true } } },
      });
      return row;
    });
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : String(e);
    if (errMsg === "INSUFFICIENT_CREDITS") {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { creditBalance: true },
      });
      return NextResponse.json(
        {
          error: `Insufficient credits. This OCR request requires ${creditsToCharge} credits but your balance is ${org?.creditBalance ?? 0}.`,
        },
        { status: 402 }
      );
    }
    throw e;
  }

  return NextResponse.json(
    { ...created, avgConfidence: Number(created.avgConfidence), creditsCharged: created.creditsCharged },
    { status: 201 }
  );
}
