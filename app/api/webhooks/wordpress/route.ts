import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/wordpress-client";
import crypto from "crypto";

/**
 * Inbound WordPress webhook receiver.
 * Accepts events from the companion WP plugin: post.updated, post.deleted, post.published.
 * Marks delivered WordpressJobLocale rows as OUT_OF_DATE when source content changes.
 *
 * Security: when a webhookSecret is configured for the connection, the
 * x-contentech-signature header is REQUIRED. Requests without a valid
 * signature are rejected with 401.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();

  let payload: any;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = payload?.event ?? req.headers.get("x-contentech-event") ?? "";
  const siteUrl: string = payload?.siteUrl ?? payload?.site_url ?? "";
  const postId = parseInt(payload?.postId ?? payload?.post_id ?? "0", 10);
  const signature = req.headers.get("x-contentech-signature") ?? "";

  if (!siteUrl || !postId) return NextResponse.json({ ok: true });

  // Normalize incoming siteUrl to origin (scheme + host + port, no trailing slash)
  // so we can do exact matching against the stored siteUrl.
  let normalizedIncoming: string;
  try {
    const parsed = new URL(siteUrl.trim().replace(/\/$/, ""));
    normalizedIncoming = parsed.origin; // e.g. "https://example.com"
  } catch {
    return NextResponse.json({ ok: true }); // unparseable — ignore silently
  }

  // Find candidate connections by exact origin match — multiple orgs may connect
  // the same WP site, so we must disambiguate via HMAC signature validation.
  const candidates = await prisma.wordpressConnection.findMany({
    where: { siteUrl: normalizedIncoming },
  });
  if (candidates.length === 0) return NextResponse.json({ ok: true });

  // HMAC signature is required for all connections — webhookSecret is always
  // generated at connect time, so there are no legitimate secret-less connections.
  if (!signature) {
    return NextResponse.json({ error: "Missing X-Contentech-Signature header" }, { status: 401 });
  }

  // Iterate candidates and select the first whose HMAC validates against our stored secret.
  // This handles the rare case of multiple orgs connected to the same WP site.
  let conn: (typeof candidates)[0] | undefined;
  for (const candidate of candidates) {
    if (candidate.webhookSecret && verifyWebhookSignature(body, signature, candidate.webhookSecret)) {
      conn = candidate;
      break;
    }
  }

  if (!conn) {
    // No candidate's secret matched the signature — reject to prevent cross-tenant events
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (event === "post.deleted") {
    // Cancel active jobs and their locales for this post
    const jobs = await prisma.wordpressJob.findMany({
      where: {
        organizationId: conn.organizationId,
        sourcePostId: postId,
        status: { in: ["QUEUED", "IN_PROGRESS"] },
      },
      include: { locales: true },
    });
    for (const job of jobs) {
      await prisma.wordpressJobLocale.updateMany({
        where: { wordpressJobId: job.id },
        data: { status: "CANCELLED" },
      });
      await prisma.wordpressJob.update({
        where: { id: job.id },
        data: { status: "CANCELLED" },
      });
    }
    return NextResponse.json({ ok: true, action: "cancelled" });
  }

  if (event === "post.updated" || event === "post.published") {
    // The WP plugin may send a pre-computed SHA-256 contentHash, or raw content to hash.
    // Use the pre-computed hash directly to avoid double-hashing; only hash when raw content is provided.
    const providedHash: string | undefined = payload?.contentHash ?? payload?.content_hash;
    const incomingContentHash: string = providedHash
      ? providedHash                                                        // already a SHA-256 hex
      : crypto.createHash("sha256")
          .update(JSON.stringify(payload?.content ?? {}))
          .digest("hex");

    // Find all DELIVERED jobs for this post
    const relatedJobs = await prisma.wordpressJob.findMany({
      where: {
        organizationId: conn.organizationId,
        sourcePostId: postId,
        status: "DELIVERED",
      },
      include: { locales: true },
    });

    if (relatedJobs.length === 0) return NextResponse.json({ ok: true });

    for (const job of relatedJobs) {
      const snapshot = job.sourceSnapshot as any;
      // snapshot.contentHash is already a sha256 hex (stored as raw hex since the snapshot
      // was created by jobs/route.ts using crypto.createHash('sha256')).
      const storedContentHash = snapshot?.contentHash ?? null;

      // If content has changed (or no stored hash), mark all DELIVERED locales as OUT_OF_DATE
      if (!storedContentHash || incomingContentHash !== storedContentHash) {
        await prisma.wordpressJobLocale.updateMany({
          where: { wordpressJobId: job.id, status: "DELIVERED" },
          data: { status: "OUT_OF_DATE" },
        });
        // Also update the parent job status
        await prisma.wordpressJob.update({
          where: { id: job.id },
          data: { status: "OUT_OF_DATE" },
        });
      }
    }

    return NextResponse.json({ ok: true, action: "staleness_checked" });
  }

  return NextResponse.json({ ok: true });
}
