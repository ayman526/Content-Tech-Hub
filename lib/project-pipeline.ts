/**
 * Internal project creation pipeline.
 * Mirrors the behavior of POST /api/projects but usable from server-side code
 * (e.g. WordPress integration) without an HTTP session.
 *
 * Handles:
 *  - Project + Document + TranslationSegment creation
 *  - Per-language Job creation with correct payoutAmount / businessShare
 *  - Credit deduction for CREDITS workflow
 *  - project.created notification + job.created webhooks
 */

import { prisma } from "@/lib/prisma";
import { fireWebhooks } from "@/lib/webhook-delivery";
import { notifyAsync } from "@/lib/notifications";
import { LinguistSource, WorkflowType } from "@prisma/client";

const CREDIT_RATE_MAP: Record<string, string> = {
  CREDITS: "AI_TRANSLATION",
  AI_HUMAN: "HUMAN_REVISION",
  HUMAN_ONLY: "HUMAN_TRANSLATION",
};

export interface CreateInternalProjectInput {
  name: string;
  organizationId: string;
  clientId: string;       // user who owns this project (org admin / WP connection creator)
  sourceLanguage: string;
  targetLanguages: string[];
  workflowType: WorkflowType;
  wordCount: number;
  filename: string;
  fileUrl: string;
  fileType?: string;
  segments: { text: string; formatHint?: string }[];
  structuredData?: any;
}

export interface CreateInternalProjectResult {
  projectId: string;
  documentId: string;
  /** One Job record per target language */
  jobs: { id: string; targetLanguage: string }[];
}

export async function createInternalProject(
  input: CreateInternalProjectInput
): Promise<CreateInternalProjectResult> {
  const {
    name, organizationId, clientId, sourceLanguage, targetLanguages,
    workflowType, wordCount, filename, fileUrl, fileType, segments, structuredData,
  } = input;

  // ── 1. Create project ──────────────────────────────────────────────
  const project = await prisma.project.create({
    data: {
      name,
      sourceLanguage,
      targetLanguages,
      workflowType,
      organizationId,
      clientId,
      status: "PENDING",
      totalWordCount: wordCount,
    },
  });

  // ── 2. Create document ─────────────────────────────────────────────
  const document = await prisma.document.create({
    data: {
      projectId: project.id,
      originalFilename: filename,
      originalFileUrl: fileUrl,
      fileType: fileType ?? "text",
      wordCount,
      processingStatus: "COMPLETED",
      detectedLanguage: sourceLanguage,
      structuredData: structuredData ?? null,
    },
  });

  // ── 3. Create TranslationSegments ──────────────────────────────────
  await prisma.translationSegment.createMany({
    data: segments.map((seg, i) => ({
      documentId: document.id,
      segmentIndex: i,
      sourceText: seg.text,
      formatHint: seg.formatHint ?? "p",
    })),
  });

  // ── 4. Compute per-job payout (mirrors projects/route.ts logic) ────
  const humanInvolvedWorkflows: WorkflowType[] = ["HUMAN_ONLY", "AI_HUMAN"];
  const dbRate = humanInvolvedWorkflows.includes(workflowType)
    ? await prisma.linguistRate.findUnique({ where: { workflowType } })
    : null;

  const baseRate = dbRate ? Number(dbRate.ratePerWord) : 0;
  const businessCutPct = dbRate ? Number(dbRate.businessCutPct) : 10;
  const payoutAmount = Math.round(wordCount * baseRate * 100) / 100;
  const businessShare = Math.round(payoutAmount * (businessCutPct / 100) * 100) / 100;

  const breakdownJSON = {
    workflowType, wordCount, linguistSource: "SYSTEM_POOL",
    humanRate: baseRate, businessCutPct, effectiveRate: baseRate,
    humanCredits: payoutAmount, businessShare, aiCredits: 0,
  };

  // ── 5. Create one job per target language ──────────────────────────
  const createdJobs: { id: string; targetLanguage: string }[] = [];
  for (const targetLanguage of targetLanguages) {
    const job = await prisma.job.create({
      data: {
        projectId: project.id,
        sourceLanguage,
        targetLanguage,
        wordCount,
        payoutAmount,
        businessShare,
        linguistSource: LinguistSource.SYSTEM_POOL,
        breakdownJSON,
        status: "AVAILABLE",
      },
    });
    createdJobs.push({ id: job.id, targetLanguage });
  }

  // ── 6. Credit deduction ────────────────────────────────────────────
  const creditRateKey = CREDIT_RATE_MAP[workflowType as string];
  if (creditRateKey && wordCount > 0) {
    const creditRate = await prisma.creditRate.findUnique({ where: { workflowType: creditRateKey } });
    if (creditRate) {
      const creditsToDeduct = Math.ceil(wordCount * Number(creditRate.creditsPerWord) * targetLanguages.length);
      if (creditsToDeduct > 0) {
        await prisma.organization.update({
          where: { id: organizationId },
          data: { creditBalance: { decrement: creditsToDeduct } },
        });
      }
    }
  }

  // ── 7. Notifications + webhooks ────────────────────────────────────
  const appUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "https://contentech.io";
  const user = await prisma.user.findUnique({ where: { id: clientId }, select: { name: true, email: true } });

  notifyAsync({
    eventKey: "project.created",
    recipients: [{ userId: clientId, email: user?.email ?? "" }],
    vars: {
      user_name: user?.name ?? "there",
      project_name: name,
      project_id: project.id,
      source_language: sourceLanguage,
      target_languages: targetLanguages.join(", "),
      workflow_type: workflowType,
      word_count: wordCount,
      credit_estimate: wordCount,
      project_url: `${appUrl}/dashboard/projects/${project.id}`,
    },
  });

  for (const job of createdJobs) {
    fireWebhooks(organizationId, "job.created", {
      jobId: job.id,
      projectId: project.id,
      projectName: name,
      sourceLanguage,
      targetLanguage: job.targetLanguage,
      wordCount,
      workflowType,
      status: "AVAILABLE",
    }).catch(() => {});
  }

  return { projectId: project.id, documentId: document.id, jobs: createdJobs };
}

// ─── Batch helper: add a document + jobs to an existing project ───────────────

export interface AddDocumentInput {
  projectId: string;
  organizationId: string;
  sourceLanguage: string;
  targetLanguages: string[];
  workflowType: WorkflowType;
  wordCount: number;
  filename: string;
  fileUrl: string;
  fileType?: string;
  segments: { text: string; formatHint?: string }[];
  structuredData?: any;
}

export interface AddDocumentResult {
  documentId: string;
  jobs: { id: string; targetLanguage: string }[];
}

/**
 * Adds a new Document (with segments and Jobs) to an already-created Project.
 * Used by the WordPress bulk-translate flow to attach one document per selected
 * post to a single shared Contentech Project.
 *
 * NOTE: Does NOT deduct credits or send notifications — the calling batch
 * function handles those once for the whole project.
 */
export async function addDocumentAndJobsToProject(
  input: AddDocumentInput
): Promise<AddDocumentResult> {
  const {
    projectId, organizationId, sourceLanguage, targetLanguages, workflowType,
    wordCount, filename, fileUrl, fileType, segments, structuredData,
  } = input;

  const document = await prisma.document.create({
    data: {
      projectId,
      originalFilename: filename,
      originalFileUrl: fileUrl,
      fileType: fileType ?? "text",
      wordCount,
      processingStatus: "COMPLETED",
      detectedLanguage: sourceLanguage,
      structuredData: structuredData ?? null,
    },
  });

  await prisma.translationSegment.createMany({
    data: segments.map((seg, i) => ({
      documentId: document.id,
      segmentIndex: i,
      sourceText: seg.text,
      formatHint: seg.formatHint ?? "p",
    })),
  });

  const humanInvolvedWorkflows: WorkflowType[] = ["HUMAN_ONLY", "AI_HUMAN"];
  const dbRate = humanInvolvedWorkflows.includes(workflowType)
    ? await prisma.linguistRate.findUnique({ where: { workflowType } })
    : null;

  const baseRate = dbRate ? Number(dbRate.ratePerWord) : 0;
  const businessCutPct = dbRate ? Number(dbRate.businessCutPct) : 10;
  const payoutAmount = Math.round(wordCount * baseRate * 100) / 100;
  const businessShare = Math.round(payoutAmount * (businessCutPct / 100) * 100) / 100;

  const breakdownJSON = {
    workflowType, wordCount, linguistSource: "SYSTEM_POOL",
    humanRate: baseRate, businessCutPct, effectiveRate: baseRate,
    humanCredits: payoutAmount, businessShare, aiCredits: 0,
  };

  const createdJobs: { id: string; targetLanguage: string }[] = [];
  for (const targetLanguage of targetLanguages) {
    const job = await prisma.job.create({
      data: {
        projectId,
        sourceLanguage,
        targetLanguage,
        wordCount,
        payoutAmount,
        businessShare,
        linguistSource: LinguistSource.SYSTEM_POOL,
        breakdownJSON,
        status: "AVAILABLE",
      },
    });
    createdJobs.push({ id: job.id, targetLanguage });
  }

  // ── Credit deduction (mirrors createInternalProject logic) ────────────────
  const creditRateKey = CREDIT_RATE_MAP[workflowType as string];
  if (creditRateKey && wordCount > 0) {
    const creditRate = await prisma.creditRate.findUnique({ where: { workflowType: creditRateKey } });
    if (creditRate) {
      const creditsToDeduct = Math.ceil(wordCount * Number(creditRate.creditsPerWord) * targetLanguages.length);
      if (creditsToDeduct > 0) {
        await prisma.organization.update({
          where: { id: organizationId },
          data: { creditBalance: { decrement: creditsToDeduct } },
        });
      }
    }
  }

  return { documentId: document.id, jobs: createdJobs };
}
