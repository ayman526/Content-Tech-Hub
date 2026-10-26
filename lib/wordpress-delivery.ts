/**
 * WordPress translation delivery helper.
 * Called after Contentech translations are complete (any workflow type) to push
 * translated content back to the originating WordPress site.
 *
 * DELIVERY DETERMINISM: at job-creation time the source post and all segment keys
 * are stored in WordpressJob.sourceSnapshot.  Delivery uses that immutable snapshot
 * so segment alignment cannot drift if the WP source post is edited during translation.
 * A live content-hash check is also performed; if the source changed we refuse
 * delivery and mark the locale OUT_OF_DATE instead of pushing garbled content.
 */

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { WorkflowType } from "@prisma/client";
import {
  getWPClient,
  extractPostSegments,
  extractMenuSegments,
  rebuildPostPayload,
  countSegmentWords,
  type WPPost,
} from "@/lib/wordpress-client";
import { createInternalProject } from "@/lib/project-pipeline";

// ─── Types for stored snapshot ────────────────────────────────────────────────

interface StoredSnapshot {
  contentHash?: string;
  segmentKeys?: string[];
  postData?: WPPost;
  /** Legacy field — kept for backward compat; prefer contentHash */
  wordCount?: number;
  segmentCount?: number;
}

/**
 * Canonical content hash covering ALL translatable source fields.
 * Uses segment texts (joined by newline) so that changes to title, content,
 * excerpt, slug, ACF, Yoast, or taxonomy are all captured.  Must use the
 * same extracted segments as the job creation path to ensure hash parity.
 */
export function computeSegmentHash(segments: { text: string }[]): string {
  return crypto
    .createHash("sha256")
    .update(segments.map((s) => s.text).join("\n"))
    .digest("hex");
}

// ─── Deliver ──────────────────────────────────────────────────────────────────

/**
 * Deliver a completed Contentech job back to WordPress.
 *
 * @param contentechJobId  The ID of the completed Contentech Job record.
 */
export async function deliverTranslationBackByJobId(contentechJobId: string): Promise<void> {
  const wpLocale = await prisma.wordpressJobLocale.findFirst({
    where: { contentechJobId },
    include: { wordpressJob: true },
  });
  if (!wpLocale) return; // Not a WP-sourced job — no-op

  const wpJob = wpLocale.wordpressJob;
  const orgId = wpJob.organizationId;

  if (wpLocale.status === "DELIVERED" || wpLocale.status === "CANCELLED") return;

  try {
    const { adapter, conn } = await getWPClient(orgId);

    // ── 1. Load the immutable source snapshot ──────────────────────────────
    const snapshot = (wpJob.sourceSnapshot ?? {}) as StoredSnapshot;
    const storedPostData = snapshot.postData as WPPost | undefined;
    const storedSegmentKeys = snapshot.segmentKeys as string[] | undefined;

    // Retrieve mapping settings
    const mapping = await prisma.wordpressMapping.findFirst({
      where: { organizationId: orgId, postType: wpJob.sourcePostType },
    });
    const extractionMapping = {
      includeTitle: mapping?.includeTitle ?? true,
      includeContent: mapping?.includeContent ?? true,
      includeExcerpt: mapping?.includeExcerpt ?? false,
      includeSlug: mapping?.includeSlug ?? false,
      includeAcf: mapping?.includeAcf ?? false,
      includeYoast: mapping?.includeYoast ?? false,
    };

    // ── 2. Stale-content guard ─────────────────────────────────────────────
    // Re-fetch the current post and re-extract all translatable segments using
    // the same mapping config to compute a canonical hash over ALL translatable
    // fields (title, content, excerpt, slug, ACF, Yoast, taxonomies).
    // We do NOT use this live version for rebuild — snapshot data is always used.
    if (snapshot.contentHash) {
      try {
        const livePost = await adapter.getPost(wpJob.sourcePostId, wpJob.sourcePostType);
        let liveSegments = extractPostSegments(livePost, extractionMapping);
        // Include menu segments when mapping requests them to maintain hash parity with job creation.
        if (mapping?.includeMenus) {
          try { liveSegments = [...liveSegments, ...(await extractMenuSegments(adapter))]; } catch { /* best-effort */ }
        }
        const liveHash = computeSegmentHash(liveSegments);
        if (liveHash !== snapshot.contentHash) {
          // Source changed — mark locale OUT_OF_DATE and reconcile parent job
          await prisma.wordpressJobLocale.update({
            where: { id: wpLocale.id },
            data: {
              status: "OUT_OF_DATE",
              error: "Source post was modified during translation. Re-trigger translation to deliver.",
            },
          });
          // Reconcile parent job status so retry UI/API can reach it
          const sibling = await prisma.wordpressJobLocale.findMany({
            where: { wordpressJobId: wpJob.id },
          });
          const allSettledOrStale = sibling.every(
            (l) => l.status === "DELIVERED" || l.status === "FAILED" ||
                   l.status === "CANCELLED" || l.status === "OUT_OF_DATE"
          );
          if (allSettledOrStale) {
            await prisma.wordpressJob.update({
              where: { id: wpJob.id },
              data: { status: "OUT_OF_DATE" },
            });
          }
          return;
        }
      } catch { /* live-fetch is best-effort; proceed if WP is temporarily unreachable */ }
    }

    // ── 3. Build translation map from stored segment keys ──────────────────
    // Fetch translations for this Contentech job, ordered by segment index.
    const jobTranslations = await prisma.jobTranslation.findMany({
      where: { jobId: contentechJobId },
      include: { segment: { select: { segmentIndex: true } } },
      orderBy: { segment: { segmentIndex: "asc" } },
    });

    if (jobTranslations.length === 0) {
      await prisma.wordpressJobLocale.update({
        where: { id: wpLocale.id },
        data: { status: "FAILED", error: "No translated segments found" },
      });
      return;
    }

    const translationMap = new Map<string, string>();

    if (storedSegmentKeys && storedSegmentKeys.length > 0) {
      // Happy path: use deterministic segment key list from snapshot
      jobTranslations.forEach((jt) => {
        const segIdx = jt.segment.segmentIndex;
        const key = storedSegmentKeys[segIdx];
        if (key && jt.translatedText) translationMap.set(key, jt.translatedText);
      });
    } else {
      // Fallback for jobs created before snapshot-key storage was introduced:
      // re-extract segments from stored post data (or live fetch if no postData)
      const sourcePost = storedPostData ?? await adapter.getPost(wpJob.sourcePostId, wpJob.sourcePostType);
      let segments = extractPostSegments(sourcePost, extractionMapping);
      // Include menu segments when mapping requests them — same as job creation — for key parity.
      if (mapping?.includeMenus) {
        try { segments = [...segments, ...(await extractMenuSegments(adapter))]; } catch { /* best-effort */ }
      }
      jobTranslations.forEach((jt) => {
        const segIdx = jt.segment.segmentIndex;
        const wpSeg = segments[segIdx];
        if (wpSeg && jt.translatedText) translationMap.set(wpSeg.key, jt.translatedText);
      });
    }

    // ── 4. Rebuild payload from snapshot post data ─────────────────────────
    // ALWAYS use the stored post data — never the live version — so the rebuilt
    // payload matches exactly what the linguist/AI translated.
    const sourcePost: WPPost = storedPostData ?? await adapter.getPost(wpJob.sourcePostId, wpJob.sourcePostType);
    const payload = rebuildPostPayload(sourcePost, translationMap, {
      ...extractionMapping,
      includeTitle: mapping?.includeTitle ?? true,
      includeYoast: mapping?.includeYoast ?? false,
      includeAcf: mapping?.includeAcf ?? false,
    });

    // Per-post-type target status takes priority over the global connection deliveryMode
    const targetStatus = mapping?.targetStatus ?? conn.deliveryMode;
    const wpStatus = targetStatus === "PUBLISH" ? "publish" : "draft";

    // ── 5. Push translation to WordPress ──────────────────────────────────
    const { postId: newPostId, link: translatedPostLink } = await adapter.createTranslation({
      originalPostId: wpJob.sourcePostId,
      postType: wpJob.sourcePostType,
      targetLanguage: wpLocale.targetLanguage,
      title: payload.title,
      content: payload.content,
      excerpt: payload.excerpt,
      slug: payload.slug,
      status: wpStatus,
      acf: payload.acf,
      yoast: payload.yoast,
      featuredMediaId: payload.featuredMediaId,
      featuredImageAlt: payload.featuredImageAlt,
      taxonomies: payload.taxonomies,
    });

    // ── 6. Write translated menu item labels back to WordPress ─────────────
    // Executes only when mapping.includeMenus is true AND this is the FIRST delivery
    // for this target language on this connection, preventing repeated cross-job
    // overwrites (menu items are site-wide, not post-scoped — WP REST API does not
    // expose which menus reference a given post).
    const MENU_KEY_RE = /^menu:\d+:item:(\d+):label$/;
    const hasMenuKeys = [...translationMap.keys()].some((k) => MENU_KEY_RE.test(k));
    if (hasMenuKeys) {
      const priorDelivery = await prisma.wordpressJobLocale.findFirst({
        where: {
          wordpressJob: { organizationId: orgId },
          targetLanguage: wpLocale.targetLanguage,
          status: "DELIVERED",
          id: { not: wpLocale.id },
        },
      });
      if (!priorDelivery) {
        // First delivery for this target language — push all translated menu labels
        for (const [key, translatedLabel] of translationMap.entries()) {
          const m = MENU_KEY_RE.exec(key);
          if (!m) continue;
          const menuItemId = parseInt(m[1], 10);
          try {
            await adapter.updateMenuItemLabel(menuItemId, translatedLabel);
          } catch { /* best-effort; menu REST endpoint may not be available */ }
        }
      }
    }

    await prisma.wordpressJobLocale.update({
      where: { id: wpLocale.id },
      data: {
        status: "DELIVERED",
        targetPostId: newPostId,
        translatedData: JSON.parse(JSON.stringify({ ...payload, translatedPostLink })),
        deliveredAt: new Date(),
      },
    });

    // Notify the agency admin that the WordPress post has been updated
    if (conn.connectedByUserId) {
      const postTitle = snapshot.postData?.title ?? `Post #${wpJob.sourcePostId}`;
      prisma.notification.create({
        data: {
          userId: conn.connectedByUserId,
          type: "SYSTEM",
          title: "WordPress post updated",
          message: `"${postTitle}" has been translated into ${wpLocale.targetLanguage} and delivered to WordPress.`,
        },
      }).catch(() => {}); // best-effort
    }

    // Update parent WP job status if all locales are settled
    const allLocales = await prisma.wordpressJobLocale.findMany({
      where: { wordpressJobId: wpJob.id },
    });
    const allDone = allLocales.every(
      (l) => l.status === "DELIVERED" || l.status === "FAILED" || l.status === "CANCELLED"
    );
    const allDelivered = allLocales.every((l) => l.status === "DELIVERED");
    if (allDone) {
      await prisma.wordpressJob.update({
        where: { id: wpJob.id },
        data: { status: allDelivered ? "DELIVERED" : "FAILED" },
      });
      // Update lastSyncAt on the connection to track operational sync time
      await prisma.wordpressConnection.update({
        where: { organizationId: orgId },
        data: { lastSyncAt: new Date() },
      }).catch(() => {}); // best-effort
    }
  } catch (err: any) {
    console.error(`[WP Delivery] Failed for locale ${wpLocale.id}:`, err);
    await prisma.wordpressJobLocale.update({
      where: { id: wpLocale.id },
      data: { status: "FAILED", error: err.message ?? String(err) },
    });
    // Reconcile parent WP job status — same allDone logic as the success path
    // so parent is not left in IN_PROGRESS when all locales have settled.
    const allLocalesAfterFailure = await prisma.wordpressJobLocale.findMany({
      where: { wordpressJobId: wpJob.id },
    });
    const allSettled = allLocalesAfterFailure.every(
      (l) => l.status === "DELIVERED" || l.status === "FAILED" || l.status === "CANCELLED"
    );
    if (allSettled) {
      const allDeliveredAfterFailure = allLocalesAfterFailure.every((l) => l.status === "DELIVERED");
      await prisma.wordpressJob.update({
        where: { id: wpJob.id },
        data: { status: allDeliveredAfterFailure ? "DELIVERED" : "FAILED" },
      });
    }
  }
}

// ─── Retranslate ──────────────────────────────────────────────────────────────

/**
 * Re-run the full translation pipeline for an OUT_OF_DATE WP locale.
 *
 * Fetches fresh content from WordPress, creates a new Contentech project/job,
 * and links it back to the WP locale.  The new job will trigger delivery via
 * the normal complete-review hook once it finishes.
 *
 * @param wpLocaleId  The `WordpressJobLocale.id` to retranslate.
 */
export async function retranslateWordpressLocale(wpLocaleId: string): Promise<void> {
  const wpLocale = await prisma.wordpressJobLocale.findUnique({
    where: { id: wpLocaleId },
    include: { wordpressJob: true },
  });
  if (!wpLocale) throw new Error(`WP locale ${wpLocaleId} not found`);

  const wpJob = wpLocale.wordpressJob;
  const orgId = wpJob.organizationId;

  await prisma.wordpressJobLocale.update({
    where: { id: wpLocaleId },
    data: { status: "IN_PROGRESS", error: null },
  });

  try {
    const { adapter, conn } = await getWPClient(orgId);

    const post = await adapter.getPost(wpJob.sourcePostId, wpJob.sourcePostType);

    const mapping = await prisma.wordpressMapping.findFirst({
      where: { organizationId: orgId, postType: wpJob.sourcePostType },
    });
    const extractionMapping = {
      includeTitle: mapping?.includeTitle ?? true,
      includeContent: mapping?.includeContent ?? true,
      includeExcerpt: mapping?.includeExcerpt ?? false,
      includeSlug: mapping?.includeSlug ?? false,
      includeAcf: mapping?.includeAcf ?? false,
      includeYoast: mapping?.includeYoast ?? false,
    };

    let segments = extractPostSegments(post, extractionMapping);
    // Include menu segments when mapping requests them — site-wide labels (WP REST API
    // does not expose post-to-menu linkage); first-delivery guard prevents overwrites.
    if (mapping?.includeMenus) {
      try { segments = [...segments, ...(await extractMenuSegments(adapter))]; } catch { /* best-effort */ }
    }

    if (segments.length === 0) throw new Error("No translatable segments found in post");

    const wordCount = countSegmentWords(segments);
    // Use canonical segment hash (covers all translatable fields, not just content)
    const contentHash = computeSegmentHash(segments);

    // Update snapshot on the parent job so delivery will use the fresh data
    await prisma.wordpressJob.update({
      where: { id: wpJob.id },
      data: {
        sourceSnapshot: {
          contentHash,
          segmentKeys: segments.map((s) => s.key),
          postData: post as object,
          segmentCount: segments.length,
          wordCount,
          title: post.title,
        },
      },
    });

    const sourceLang = conn.sourceLanguage;
    const targetLang = wpLocale.targetLanguage;

    const connectionRecord = await prisma.wordpressConnection.findUnique({
      where: { organizationId: orgId },
    });
    if (!connectionRecord) throw new Error("WordPress connection not found");
    const clientId = connectionRecord.connectedByUserId;
    if (!clientId) throw new Error("WordPress connection has no creator user");

    const workflowType = (wpJob.workflowType ?? "AI_HUMAN") as WorkflowType;

    const result = await createInternalProject({
      name: `[WP Retry] ${post.title.slice(0, 50)} → ${targetLang}`,
      organizationId: orgId,
      clientId,
      sourceLanguage: sourceLang,
      targetLanguages: [targetLang],
      workflowType,
      wordCount,
      filename: `wp-${post.type}-${post.id}.txt`,
      fileUrl: post.link ?? `wp:${post.id}`,
      fileType: "text",
      segments: segments.map((s) => ({ text: s.text, formatHint: "p" })),
      structuredData: segments.map((s) => s.key),
    });

    const ctJob = result.jobs[0];
    if (!ctJob) throw new Error("Pipeline did not create a job");

    await prisma.wordpressJobLocale.update({
      where: { id: wpLocaleId },
      data: { contentechJobId: ctJob.id, status: "IN_PROGRESS" },
    });
    await prisma.wordpressJob.update({ where: { id: wpJob.id }, data: { status: "IN_PROGRESS" } });

    if (workflowType === "CREDITS") {
      const { translateSegmentsForJob } = await import("@/lib/ai-translate");
      const dbSegments = await prisma.translationSegment.findMany({
        where: { documentId: result.documentId },
        orderBy: { segmentIndex: "asc" },
      });
      await translateSegmentsForJob(
        dbSegments.map((s) => s.id),
        dbSegments.map((s) => s.sourceText),
        sourceLang,
        ctJob.targetLanguage,
        prisma,
        ctJob.id
      );
      await deliverTranslationBackByJobId(ctJob.id);
    }
  } catch (err: any) {
    console.error(`[WP Retranslate] Failed for locale ${wpLocaleId}:`, err);
    await prisma.wordpressJobLocale.update({
      where: { id: wpLocaleId },
      data: { status: "FAILED", error: err.message ?? String(err) },
    });
  }
}
