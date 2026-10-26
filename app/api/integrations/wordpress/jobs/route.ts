import { hasFeature } from "@/lib/plan-features";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WorkflowType } from "@prisma/client";
import crypto from "crypto";
import { getWpAuthContext } from "@/lib/wordpress-plugin-auth";
import {
  getWPClient,
  extractPostSegments,
  extractMenuSegments,
  countSegmentWords,
  type WPSegment,
  type WPPost,
} from "@/lib/wordpress-client";
import { deliverTranslationBackByJobId } from "@/lib/wordpress-delivery";
import { createInternalProject, addDocumentAndJobsToProject } from "@/lib/project-pipeline";

export async function GET(req: NextRequest) {
  const ctx = await getWpAuthContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = ctx.orgId;

  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { plan: true } });
  if (!(await hasFeature(org?.plan ?? "STARTER", "wordpress_integration"))) {
    return NextResponse.json({ error: "WordPress integration requires an Agency or Enterprise plan" }, { status: 403 });
  }

  const jobs = await prisma.wordpressJob.findMany({
    where: { organizationId: orgId },
    include: { locales: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
  const ctx = await getWpAuthContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = ctx.orgId;

  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { plan: true } });
  if (!(await hasFeature(org?.plan ?? "STARTER", "wordpress_integration"))) {
    return NextResponse.json({ error: "WordPress integration requires an Agency or Enterprise plan." }, { status: 403 });
  }

  // Resolve the user ID: use session user when available (dashboard), fall back to
  // the user who originally connected the site (plugin-authenticated calls).
  let userId: string;
  if (!ctx.isPluginAuth) {
    const session = await import("@/lib/auth").then(m => m.auth());
    userId = (session?.user as any)?.id ?? "";
  } else {
    const conn = await prisma.wordpressConnection.findUnique({
      where: { organizationId: orgId },
      select: { connectedByUserId: true },
    });
    userId = conn?.connectedByUserId ?? "";
  }

  const { postIds, postType, targetLanguages, workflowType } = await req.json();
  if (!Array.isArray(postIds) || postIds.length === 0)
    return NextResponse.json({ error: "postIds required" }, { status: 400 });
  if (!Array.isArray(targetLanguages) || targetLanguages.length === 0)
    return NextResponse.json({ error: "targetLanguages required" }, { status: 400 });
  if (!postType)
    return NextResponse.json({ error: "postType required" }, { status: 400 });

  const { adapter, conn } = await getWPClient(orgId);

  const mapping = await prisma.wordpressMapping.findFirst({
    where: { organizationId: orgId, postType },
  });
  const resolvedWorkflow: WorkflowType =
    (workflowType ?? mapping?.workflowType ?? "AI_HUMAN") as WorkflowType;

  const extractionMapping = {
    includeTitle: mapping?.includeTitle ?? true,
    includeContent: mapping?.includeContent ?? true,
    includeExcerpt: mapping?.includeExcerpt ?? false,
    includeSlug: mapping?.includeSlug ?? false,
    includeAcf: mapping?.includeAcf ?? false,
    includeYoast: mapping?.includeYoast ?? false,
  };

  // Collect all (post, segments, wpJob) tuples — we create ONE Contentech
  // Project for the entire batch (one document per WP post within that project).
  type BatchEntry = {
    wpJob: { id: string; locales: { id: string; targetLanguage: string }[] };
    post: WPPost;
    segments: WPSegment[];
    wordCount: number;
  };
  const batchEntries: BatchEntry[] = [];
  const createdJobs: any[] = [];
  const failedPosts: { postId: number | string; error: string }[] = [];

  // Pre-fetch menu segments once for the whole batch if the mapping requests them.
  // Note: WordPress REST API does not expose which menu items are linked to a given
  // post, so menu extraction is site-wide (all nav menus) rather than post-scoped.
  // The first-delivery guard in delivery.ts prevents repeated cross-job writes.
  let menuSegments: WPSegment[] = [];
  if (mapping?.includeMenus) {
    try { menuSegments = await extractMenuSegments(adapter); } catch { /* best-effort */ }
  }

  for (const postId of postIds) {
    let post: WPPost;
    try {
      post = await adapter.getPost(Number(postId), postType);
    } catch (err: any) {
      failedPosts.push({ postId, error: err.message ?? "Failed to fetch post" });
      continue;
    }

    let segments: WPSegment[] = [
      ...extractPostSegments(post, extractionMapping),
      ...menuSegments,
    ];

    const wordCount = countSegmentWords(segments);

    // Canonical hash covering ALL translatable fields via extracted segment texts
    const contentHash = crypto
      .createHash("sha256")
      .update(segments.map((s) => s.text).join("\n"))
      .digest("hex");

    const sourceSnapshot = {
      title: post.title,
      contentHash,
      segmentCount: segments.length,
      wordCount,
      segmentKeys: segments.map((s) => s.key),
      postData: post as object,
    };

    const wpJob = await prisma.wordpressJob.create({
      data: {
        organizationId: orgId,
        siteUrl: conn.siteUrl,
        sourcePostId: Number(postId),
        sourcePostType: postType,
        sourcePostTitle: post.title,
        sourceLanguage: conn.sourceLanguage,
        sourceSnapshot,
        wordCount,
        workflowType: resolvedWorkflow,
        status: "QUEUED",
        locales: {
          create: targetLanguages.map((lang: string) => ({
            targetLanguage: lang,
            status: "QUEUED",
          })),
        },
      },
      include: { locales: true },
    });

    batchEntries.push({
      wpJob: { id: wpJob.id, locales: wpJob.locales.map((l) => ({ id: l.id, targetLanguage: l.targetLanguage })) },
      post,
      segments,
      wordCount,
    });
    createdJobs.push(wpJob);
  }

  // Fire ONE Contentech project for the whole batch
  if (batchEntries.length > 0) {
    fireBatchTranslationAsync({
      orgId,
      userId,
      batchEntries,
      workflowType: resolvedWorkflow,
      sourceLanguage: conn.sourceLanguage,
    }).catch((err) => {
      console.error("[WP] Batch translation fire failed:", err);
    });
  }

  return NextResponse.json({
    created: createdJobs.length,
    failed: failedPosts.length,
    jobs: createdJobs,
    errors: failedPosts.length > 0 ? failedPosts : undefined,
  }, { status: 201 });
}

// ─── Internal: fire ONE Contentech project for a batch of WP posts ────────────

interface FireBatchArgs {
  orgId: string;
  userId: string;
  batchEntries: Array<{
    wpJob: { id: string; locales: { id: string; targetLanguage: string }[] };
    post: WPPost;
    segments: WPSegment[];
    wordCount: number;
  }>;
  workflowType: WorkflowType;
  sourceLanguage: string;
}

async function fireBatchTranslationAsync(args: FireBatchArgs) {
  const { orgId, userId, batchEntries, workflowType, sourceLanguage } = args;

  if (batchEntries.length === 0) return;

  const firstEntry = batchEntries[0];
  const totalWords = batchEntries.reduce((sum, e) => sum + e.wordCount, 0);

  // Determine a meaningful project name
  const batchName = batchEntries.length === 1
    ? `WP: ${(firstEntry.post.title ?? "Post").slice(0, 50)}`
    : `WP Batch: ${batchEntries.length} posts`;

  // ── Create ONE Contentech project using the first post's content ──────────
  // Failure here marks ALL batch jobs as FAILED so no job is left stuck in QUEUED.
  let firstResult: Awaited<ReturnType<typeof createInternalProject>>;
  try {
    firstResult = await createInternalProject({
      name: batchName,
      organizationId: orgId,
      clientId: userId,
      sourceLanguage,
      targetLanguages: firstEntry.wpJob.locales.map((l) => l.targetLanguage),
      workflowType,
      wordCount: firstEntry.wordCount,
      filename: `wp-${firstEntry.post.type}-${firstEntry.post.id}.txt`,
      fileUrl: firstEntry.post.link ?? `wp:${firstEntry.post.id}`,
      fileType: "text",
      segments: firstEntry.segments.map((s) => ({ text: s.text, formatHint: "p" })),
      structuredData: firstEntry.segments.map((s) => s.key),
    });
  } catch (err: any) {
    console.error("[WP Batch] Failed to create Contentech project:", err);
    // Mark every job in the batch FAILED with actionable error text
    await Promise.allSettled(batchEntries.map(async (entry) => {
      await prisma.wordpressJob.update({ where: { id: entry.wpJob.id }, data: { status: "FAILED" } });
      await prisma.wordpressJobLocale.updateMany({
        where: { wordpressJobId: entry.wpJob.id },
        data: { status: "FAILED", error: `Project creation failed: ${err.message ?? String(err)}` },
      });
    }));
    return;
  }

  // Link first WP job's locales to their Contentech jobs
  await linkLocalesToCtJobs(firstEntry.wpJob.locales, firstResult.jobs);
  await prisma.wordpressJob.update({ where: { id: firstEntry.wpJob.id }, data: { status: "IN_PROGRESS" } });

  // Collect all (documentId, [ctJob]) for AI translation
  const allDocs: Array<{ documentId: string; jobs: { id: string; targetLanguage: string }[] }> = [
    { documentId: firstResult.documentId, jobs: firstResult.jobs },
  ];

  // ── For subsequent posts, add a document to the same project ─────────────
  for (let i = 1; i < batchEntries.length; i++) {
    const entry = batchEntries[i];
    try {
      const docResult = await addDocumentAndJobsToProject({
        projectId: firstResult.projectId,
        organizationId: orgId,
        sourceLanguage,
        targetLanguages: entry.wpJob.locales.map((l) => l.targetLanguage),
        workflowType,
        wordCount: entry.wordCount,
        filename: `wp-${entry.post.type}-${entry.post.id}.txt`,
        fileUrl: entry.post.link ?? `wp:${entry.post.id}`,
        fileType: "text",
        segments: entry.segments.map((s) => ({ text: s.text, formatHint: "p" })),
        structuredData: entry.segments.map((s) => s.key),
      });

      await linkLocalesToCtJobs(entry.wpJob.locales, docResult.jobs);
      await prisma.wordpressJob.update({
        where: { id: entry.wpJob.id },
        data: { status: "IN_PROGRESS" },
      });

      allDocs.push({ documentId: docResult.documentId, jobs: docResult.jobs });
    } catch (err: any) {
      console.error(`[WP Batch] Failed to add document for post ${entry.post.id}:`, err);
      // Mark both parent job AND locales FAILED so retry/UI show correct state
      await prisma.wordpressJob.update({
        where: { id: entry.wpJob.id },
        data: { status: "FAILED" },
      });
      await prisma.wordpressJobLocale.updateMany({
        where: { wordpressJobId: entry.wpJob.id },
        data: { status: "FAILED", error: `Document creation failed: ${err.message ?? String(err)}` },
      });
    }
  }

  // ── For AI-only workflows, translate + deliver each document's jobs ───────
  if (workflowType === "CREDITS") {
    const { translateSegmentsForJob } = await import("@/lib/ai-translate");

    for (const doc of allDocs) {
      const dbSegments = await prisma.translationSegment.findMany({
        where: { documentId: doc.documentId },
        orderBy: { segmentIndex: "asc" },
      });
      const segIds = dbSegments.map((s) => s.id);
      const segTexts = dbSegments.map((s) => s.sourceText);

      for (const ctJob of doc.jobs) {
        try {
          await translateSegmentsForJob(segIds, segTexts, sourceLanguage, ctJob.targetLanguage, prisma, ctJob.id);
          await deliverTranslationBackByJobId(ctJob.id);
        } catch (err) {
          console.error(`[WP Batch] AI translation failed for job ${ctJob.id} (${ctJob.targetLanguage}):`, err);
          // Mark the locale FAILED by looking up which WP locale owns this Contentech job
          const wpLocale = await prisma.wordpressJobLocale.findFirst({ where: { contentechJobId: ctJob.id } });
          if (wpLocale) {
            await prisma.wordpressJobLocale.update({
              where: { id: wpLocale.id },
              data: { status: "FAILED", error: String(err) },
            });
          }
        }
      }
    }
  }
  // For AI_HUMAN / HUMAN_ONLY, jobs go to the linguist pool.
  // deliverTranslationBackByJobId is called when a linguist completes review.
}

async function linkLocalesToCtJobs(
  wpLocales: { id: string; targetLanguage: string }[],
  ctJobs: { id: string; targetLanguage: string }[]
) {
  await Promise.all(
    ctJobs.map(async (ctJob) => {
      const wpLocale = wpLocales.find((l) => l.targetLanguage === ctJob.targetLanguage);
      if (!wpLocale) return;
      await prisma.wordpressJobLocale.update({
        where: { id: wpLocale.id },
        data: { contentechJobId: ctJob.id, status: "IN_PROGRESS" },
      });
    })
  );
}
