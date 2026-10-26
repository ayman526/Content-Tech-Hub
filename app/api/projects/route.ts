import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { translateSegmentsForJob } from "@/lib/ai-translate";
import { fireWebhooks } from "@/lib/webhook-delivery";
import { notifyAsync } from "@/lib/notifications";
import { LinguistSource } from "@prisma/client";

const CREDIT_RATE_MAP: Record<string, string> = {
  CREDITS: "AI_TRANSLATION",
  AI_HUMAN: "HUMAN_REVISION",
  HUMAN_ONLY: "HUMAN_TRANSLATION",
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.organizationId;
  if (!orgId) return NextResponse.json([]);

  const projects = await prisma.project.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    include: { documents: true, jobs: true },
  });

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.organizationId;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const body = await req.json();
  const {
    name,
    sourceLanguage,
    targetLanguages,
    workflowType,
    dueDate,
    notes,
    wordCount,
    linguistSource,
    segments,
    filename,
    docType,
    layoutHtml,
    structuredData,
    pdfStoredPath,
    pptxStoredPath,
    docxStoredPath,
    attachedTmIds,
    attachedGlossaryIds,
    attachedStyleGuideIds,
    clientAccountId,
    attachedOcrRequestId,
    ocrConfidenceWarning,
  } = body;

  const resolvedWorkflow = (workflowType ?? "AI_HUMAN") as import("@prisma/client").WorkflowType;
  const resolvedWordCount: number = Number(wordCount) || 0;
  const resolvedLinguistSource = (linguistSource ?? "SYSTEM_POOL") as import("@prisma/client").LinguistSource;

  /* ── Validate clientAccountId belongs to this org ─────────────────── */
  if (clientAccountId) {
    const acct = await prisma.clientAccount.findFirst({
      where: { id: clientAccountId, organizationId: orgId },
    });
    if (!acct) return NextResponse.json({ error: "Invalid client account" }, { status: 400 });
  }

  /* ── Validate attachedOcrRequestId belongs to this org ────────────── */
  // Cross-tenant linkage protection: only allow attaching an OCR request
  // that belongs to the caller's organization AND has been verified by a
  // linguist. VERIFIED is the only valid gate — READY indicates AI-only
  // OCR completion (no human review yet) and is intentionally rejected
  // so callers can't bypass the verification step or trigger the
  // OCR_PAGE handoff debit on unreviewed text.
  let attachedOcrPageCount = 0;
  if (typeof attachedOcrRequestId === "string" && attachedOcrRequestId.length > 0) {
    const ocrReq = await prisma.ocrRequest.findFirst({
      where: { id: attachedOcrRequestId, organizationId: orgId },
      select: { id: true, status: true, pageCount: true },
    });
    if (!ocrReq) {
      return NextResponse.json(
        { error: "Invalid OCR request" },
        { status: 400 }
      );
    }
    if (ocrReq.status !== "VERIFIED") {
      return NextResponse.json(
        { error: "OCR request must be verified before starting a translation project" },
        { status: 409 }
      );
    }
    attachedOcrPageCount = ocrReq.pageCount ?? 0;
  }

  /* ── 1. Create the project ────────────────────────────────────────── */
  // When attaching an OCR request, also stamp the reverse linkage on the
  // OcrRequest itself (`linkedProjectId`) so the lineage is bidirectional
  // and the OCR detail page can show "Translation project started". Done
  // in a transaction so we never end up with one side set but not the
  // other. We also debit the OCR_PAGE rate (5 credits/page by default)
  // here — this is the "OCR-derived translation project" surcharge that
  // covers layout-preserving delivery using the persisted bounding-box
  // layout. It's recorded as a CreditTransaction tied to the new project.
  const hasAttachedOcr =
    typeof attachedOcrRequestId === "string" && attachedOcrRequestId.length > 0;

  // Look up the OCR_PAGE rate once outside the transaction; this is a
  // read-only config row and won't change underneath us during the small
  // window of the project create. Page count was captured during the
  // verified-status check above.
  let ocrPageCharge = 0;
  let ocrPerPage = 0;
  if (hasAttachedOcr && attachedOcrPageCount > 0) {
    const ocrRate = await prisma.creditRate.findUnique({
      where: { workflowType: "OCR_PAGE" },
    });
    ocrPerPage = ocrRate ? Number(ocrRate.creditsPerWord) : 0;
    ocrPageCharge =
      ocrPerPage > 0 ? Math.ceil(ocrPerPage * attachedOcrPageCount) : 0;
  }

  /* ── 1a. Pre-compute main translation credit charge ───────────────── */
  // Compute the per-word credit charge for this workflow up front so we
  // can include it in the single atomic balance check below. This used
  // to be deducted later via an unconditional `decrement`, which let
  // the org balance go negative under concurrent submissions or when
  // the client started a project they couldn't afford. The total cost
  // (OCR handoff + translation credits) is now charged atomically with
  // a `creditBalance >= total` guard so the gate cannot be bypassed.
  const creditRateKey = CREDIT_RATE_MAP[resolvedWorkflow as string];
  let mainCreditsToDeduct = 0;
  let mainCreditsPerWord = 0;
  const targetLangArr = (targetLanguages as string[]) ?? [];
  if (creditRateKey && resolvedWordCount > 0) {
    const creditRate = await prisma.creditRate.findUnique({
      where: { workflowType: creditRateKey },
    });
    if (creditRate) {
      mainCreditsPerWord = Number(creditRate.creditsPerWord);
      mainCreditsToDeduct = Math.ceil(
        resolvedWordCount * mainCreditsPerWord * Math.max(targetLangArr.length, 1)
      );
    }
  }

  const totalCharge = ocrPageCharge + mainCreditsToDeduct;

  let project;
  try {
    project = await prisma.$transaction(async (tx) => {
      // Atomic, balance-guarded debit. updateMany returns count=1 only
      // when the WHERE clause (including `creditBalance >= totalCharge`)
      // matched. Any concurrent submission racing for the same balance
      // will fail this check and roll back the project create below.
      if (totalCharge > 0) {
        const dec = await tx.organization.updateMany({
          where: { id: orgId, creditBalance: { gte: totalCharge } },
          data: { creditBalance: { decrement: totalCharge } },
        });
        if (dec.count !== 1) {
          throw new Error("INSUFFICIENT_CREDITS");
        }
      }

      const created = await tx.project.create({
        data: {
          name,
          sourceLanguage,
          targetLanguages,
          workflowType: resolvedWorkflow,
          organizationId: orgId,
          clientId: session.user.id!,
          status: "PENDING",
          totalWordCount: resolvedWordCount,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          notes,
          attachedTmIds: Array.isArray(attachedTmIds) ? attachedTmIds : [],
          attachedGlossaryIds: Array.isArray(attachedGlossaryIds) ? attachedGlossaryIds : [],
          attachedStyleGuideIds: Array.isArray(attachedStyleGuideIds) ? attachedStyleGuideIds : [],
          ...(clientAccountId ? { clientAccountId } : {}),
          ...(hasAttachedOcr ? { attachedOcrRequestId } : {}),
          ocrConfidenceWarning: !!ocrConfidenceWarning,
        },
      });

      if (hasAttachedOcr) {
        // Best-effort back-pointer. Org ownership was already validated
        // above, so a missing record here means it was deleted between
        // checks — silently no-op rather than fail the whole project.
        await tx.ocrRequest.updateMany({
          where: { id: attachedOcrRequestId, organizationId: orgId },
          data: { linkedProjectId: created.id },
        });

        if (ocrPageCharge > 0) {
          await tx.creditTransaction.create({
            data: {
              organizationId: orgId,
              type: "USAGE",
              amount: -ocrPageCharge,
              description: `OCR-derived project — layout-preserving delivery (${attachedOcrPageCount} page${attachedOcrPageCount === 1 ? "" : "s"})`,
              relatedProjectId: created.id,
              breakdownJSON: {
                kind: "ocr_project_handoff",
                pages: attachedOcrPageCount,
                creditsPerPage: ocrPerPage,
                ocrRequestId: attachedOcrRequestId,
              },
            },
          });
        }
      }

      if (mainCreditsToDeduct > 0) {
        await tx.creditTransaction.create({
          data: {
            organizationId: orgId,
            type: "USAGE",
            amount: -mainCreditsToDeduct,
            description: `Translation credits — ${created.name} (${resolvedWordCount} word${resolvedWordCount === 1 ? "" : "s"} × ${targetLangArr.length || 1} language${targetLangArr.length === 1 ? "" : "s"})`,
            relatedProjectId: created.id,
            breakdownJSON: {
              kind: "project_translation",
              workflow: resolvedWorkflow,
              wordCount: resolvedWordCount,
              languages: targetLangArr.length || 1,
              creditsPerWord: mainCreditsPerWord,
            },
          },
        });
      }

      return created;
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
          error: `Insufficient credits. This project requires ${totalCharge} credits but your balance is ${org?.creditBalance ?? 0}.`,
        },
        { status: 402 }
      );
    }
    throw e;
  }

  /* ── 2. Determine job routing ─────────────────────────────────────── */
  // EXCLUSIVE status is reserved for clients who explicitly pick the
  // "Preferred Linguists" pool AND have at least one favorite linguist.
  // SYSTEM_POOL and INTERNAL must always create AVAILABLE jobs so the open
  // job feed (or internal team) can pick them up immediately.
  let jobStatus: "AVAILABLE" | "EXCLUSIVE" = "AVAILABLE";
  let exclusiveUntil: Date | undefined;

  if (resolvedLinguistSource === "PREFERRED") {
    const hasFavorites = await prisma.favoriteLinguist.findFirst({
      where: { customerId: session.user.id! },
    });

    if (hasFavorites) {
      jobStatus = "EXCLUSIVE";
      exclusiveUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
  }

  /* ── 3. Create one job per target language ────────────────────────── */
  const humanInvolvedWorkflows = ["HUMAN_ONLY", "AI_HUMAN"];
  const isInternal = resolvedLinguistSource === "INTERNAL";

  // Fetch rate from DB; fall back to safe defaults if not configured yet
  const dbRate = humanInvolvedWorkflows.includes(resolvedWorkflow)
    ? await prisma.linguistRate.findUnique({ where: { workflowType: resolvedWorkflow } })
    : null;

  const baseRate = dbRate ? Number(dbRate.ratePerWord) : 0;
  const businessCutPct = dbRate ? Number(dbRate.businessCutPct) : 10;

  // Internal linguists are salaried — no per-word payout, no platform cut
  const effectiveRate = isInternal ? 0 : baseRate;
  const payoutAmount = Math.round(resolvedWordCount * effectiveRate * 100) / 100;
  const businessShare = isInternal
    ? 0
    : Math.round(payoutAmount * (businessCutPct / 100) * 100) / 100;

  const breakdownJSON = {
    workflowType: resolvedWorkflow,
    wordCount: resolvedWordCount,
    linguistSource: resolvedLinguistSource,
    humanRate: baseRate,
    businessCutPct,
    effectiveRate,
    humanCredits: payoutAmount,
    businessShare,
    aiCredits: 0,
    ...(isInternal && { reasonIfZero: "Internal linguist — no per-word payout or platform cut" }),
  };

  const languages = (targetLanguages as string[]) ?? [];
  const jobs = await Promise.all(
    languages.map((targetLanguage) =>
      prisma.job.create({
        data: {
          projectId: project.id,
          sourceLanguage,
          targetLanguage,
          wordCount: resolvedWordCount,
          payoutAmount,
          businessShare,
          linguistSource: resolvedLinguistSource as LinguistSource,
          breakdownJSON,
          status: jobStatus,
          exclusiveUntil,
        },
      })
    )
  );

  /* ── 3b. Fire project.created notification ────────────────────────── */
  // Translation credit deduction was performed atomically inside the
  // project-create transaction above (see "Pre-compute main translation
  // credit charge"). It is intentionally not repeated here.
  const appUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "https://contentech.io";
  notifyAsync({
    eventKey: "project.created",
    recipients: [{ userId: session.user.id!, email: session.user.email! }],
    vars: {
      user_name: session.user.name ?? "there",
      project_name: project.name,
      project_id: project.id,
      source_language: sourceLanguage,
      target_languages: (targetLanguages as string[]).join(", "),
      workflow_type: resolvedWorkflow,
      word_count: resolvedWordCount,
      credit_estimate: resolvedWordCount,
      project_url: `${appUrl}/dashboard/projects/${project.id}`,
    },
  });

  /* ── 3c. Fire webhooks for each created job ────────────────────────── */
  for (const job of jobs) {
    fireWebhooks(orgId, "job.created", {
      jobId: job.id,
      projectId: project.id,
      projectName: project.name,
      sourceLanguage: job.sourceLanguage,
      targetLanguage: job.targetLanguage,
      wordCount: job.wordCount,
      workflowType: resolvedWorkflow,
      status: job.status,
    }).catch(() => {});
  }

  /* ── 4. Create Document + Segments if provided ────────────────────── */
  // Support both legacy string[] and new { text, formatHint }[] formats
  type SegInput = string | { text: string; formatHint?: string };
  const rawSegments: SegInput[] = Array.isArray(segments) ? segments : [];
  const segmentList = rawSegments.map((s) =>
    typeof s === "string"
      ? { text: s, formatHint: "p" }
      : { text: s.text, formatHint: s.formatHint ?? "p" }
  );

  if (segmentList.length > 0) {
    const document = await prisma.document.create({
      data: {
        projectId: project.id,
        originalFilename: filename ?? `${name}.txt`,
        originalFileUrl: docxStoredPath ?? pdfStoredPath ?? pptxStoredPath ?? "#",
        fileType: (filename ?? "txt").split(".").pop()?.toLowerCase() ?? "txt",
        wordCount: resolvedWordCount,
        processingStatus: "PENDING",
        detectedLanguage: sourceLanguage,
        detectedDocType: docType ?? "General Document",
        layoutHtml: layoutHtml ?? null,
        structuredData: structuredData ?? null,
      },
    });

    const createdSegments = await Promise.all(
      segmentList.map((seg, i) => {
        const s = seg as any;
        return prisma.translationSegment.create({
          data: {
            documentId: document.id,
            segmentIndex: i + 1,
            sourceText: seg.text,
            formatHint: seg.formatHint,
            status: "PENDING",
            // Rich typography / geometry metadata (only present for microservice-extracted PDFs)
            blockId:       s.blockId       ?? null,
            blockType:     s.blockType     ?? null,
            blockPage:     s.blockPage     ?? null,
            fontFamily:    s.fontFamily    ?? null,
            fontSize:      s.fontSize      ?? null,
            fontWeight:    s.fontWeight    ?? null,
            fontColor:     s.fontColor     ?? null,
            textAlignment: s.textAlignment ?? null,
            lineHeight:    s.lineHeight    ?? null,
            bboxJson:      s.bboxJson      ?? null,
            direction:     s.direction     ?? null,
            columnIndex:   s.columnIndex   ?? null,
            readingOrder:  s.readingOrder  ?? null,
            tableId:       s.tableId       ?? null,
            tableRow:      s.tableRow      ?? null,
            tableCol:      s.tableCol      ?? null,
          },
        });
      })
    );

    /* ── 5. AI pre-translation for AI/Credits workflows ─────────────── */
    const isPureAI = resolvedWorkflow === "CREDITS" || resolvedWorkflow === "BYOK";
    const needsAI = isPureAI || resolvedWorkflow === "AI_HUMAN";

    if (needsAI && jobs.length > 0) {
      const segmentIds = createdSegments.map((s) => s.id);
      const segmentTexts = segmentList.map((s) => s.text);

      // Translate for each target language
      // billingMode uses the workflow type directly: CREDITS | AI_HUMAN | BYOK
      for (const job of jobs) {
        await translateSegmentsForJob(
          segmentIds,
          segmentTexts,
          sourceLanguage,
          job.targetLanguage,
          prisma,
          job.id,
          { organizationId: orgId, projectId: project.id, billingMode: resolvedWorkflow }
        );
      }

      // Mark document as completed
      await prisma.document.update({
        where: { id: document.id },
        data: { processingStatus: "COMPLETED" },
      });

      // For pure-AI workflows, mark jobs + project as COMPLETED immediately
      if (isPureAI) {
        await prisma.job.updateMany({
          where: { projectId: project.id },
          data: { status: "COMPLETED", completedAt: new Date() },
        });
        await prisma.project.update({
          where: { id: project.id },
          data: { status: "COMPLETED" },
        });
      } else {
        // AI+Human: AI done, awaiting human review — set project to IN_PROGRESS
        await prisma.project.update({
          where: { id: project.id },
          data: { status: "IN_PROGRESS" },
        });
      }
    }
  }

  // Re-fetch jobs with updated statuses
  const updatedJobs = await prisma.job.findMany({ where: { projectId: project.id } });

  return NextResponse.json({ ...project, jobs: updatedJobs }, { status: 201 });
}
