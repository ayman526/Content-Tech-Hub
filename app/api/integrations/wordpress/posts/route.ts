import { hasFeature } from "@/lib/plan-features";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWPClient } from "@/lib/wordpress-client";
import { getWpAuthContext } from "@/lib/wordpress-plugin-auth";

export async function GET(req: NextRequest) {
  const ctx = await getWpAuthContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = ctx.orgId;

  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { plan: true } });
  if (!(await hasFeature(org?.plan ?? "STARTER", "wordpress_integration"))) {
    return NextResponse.json({ error: "WordPress integration requires an Agency or Enterprise plan" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);

  // ── Plugin-facing: single-post locale status ────────────────────────────────
  // When the companion plugin queries status for a specific post it sends ?wpPostId=<id>.
  // Return the per-locale breakdown from WordpressJobLocale so the sidebar and
  // list-table column can render accurate status badges.
  const wpPostIdRaw = searchParams.get("wpPostId");
  if (wpPostIdRaw) {
    return getPostLocaleStatus(orgId, parseInt(wpPostIdRaw, 10));
  }

  // ── Dashboard / list-table: paginated post browser ─────────────────────────
  const postType = searchParams.get("postType") ?? "post";
  const page     = parseInt(searchParams.get("page")    ?? "1",  10);
  const perPage  = parseInt(searchParams.get("perPage") ?? "20", 10);
  const lang     = searchParams.get("lang")   ?? undefined;
  // Optional status filter used by the WP plugin list-table filter dropdown.
  const statusFilter = searchParams.get("status") ?? undefined;

  try {
    const { adapter, conn } = await getWPClient(orgId);
    const { posts, total } = await adapter.listPosts(postType, page, perPage, lang ?? conn.sourceLanguage);

    // Enrich with translation job status from DB
    const sourcePostIds = posts.map((p) => p.id);
    const jobs = await prisma.wordpressJob.findMany({
      where: { organizationId: orgId, sourcePostId: { in: sourcePostIds }, sourcePostType: postType },
      include: { locales: true },
      orderBy: { createdAt: "desc" },
    });

    const jobsByPostId = new Map<number, typeof jobs[0]>();
    for (const job of jobs) {
      if (!jobsByPostId.has(job.sourcePostId)) jobsByPostId.set(job.sourcePostId, job);
    }

    const conn2 = await prisma.wordpressConnection.findUnique({ where: { organizationId: orgId } });
    const targetLangs: string[] = (conn2?.targetLanguages as string[]) ?? [];

    let enriched = posts.map((p) => {
      const job = jobsByPostId.get(p.id);
      const translationStatus: Record<string, string> = {};
      let aggregateStatus = "MISSING";
      for (const tl of targetLangs) {
        if (!job) { translationStatus[tl] = "MISSING"; continue; }
        const locale = job.locales.find((l) => l.targetLanguage === tl);
        if (!locale) { translationStatus[tl] = "MISSING"; continue; }
        translationStatus[tl] = locale.status;
      }
      // Compute aggregate status: worst-case across all locales
      const statuses = Object.values(translationStatus);
      if (statuses.includes("FAILED"))      aggregateStatus = "FAILED";
      else if (statuses.includes("OUT_OF_DATE")) aggregateStatus = "OUT_OF_DATE";
      else if (statuses.includes("IN_PROGRESS") || statuses.includes("QUEUED")) aggregateStatus = "IN_PROGRESS";
      else if (statuses.every((s) => s === "DELIVERED")) aggregateStatus = "DELIVERED";
      else aggregateStatus = "MISSING";

      return {
        ...p,
        jobId: job?.id ?? null,
        jobStatus: job?.status ?? null,
        wpJobId: job?.id ?? null,
        status: aggregateStatus,
        translationStatus,
        lastTranslatedAt: job?.updatedAt ?? null,
        wpPostId: p.id,
      };
    });

    // Apply status filter if provided (for list-table filter dropdown)
    if (statusFilter) {
      const normalize = (s: string) =>
        s === "IN_PROGRESS" ? ["IN_PROGRESS", "QUEUED"] : [s];
      const allowed = normalize(statusFilter);
      enriched = enriched.filter((p) => allowed.includes(p.status));
    }

    return NextResponse.json({ posts: enriched, total, page, perPage });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to fetch posts" }, { status: 500 });
  }
}

/**
 * Return per-locale translation status for a single post.
 * Response shape: { posts: [{ locale, localeName, status, wpJobId }] }
 */
async function getPostLocaleStatus(orgId: string, wpPostId: number): Promise<NextResponse> {
  const job = await prisma.wordpressJob.findFirst({
    where: { organizationId: orgId, sourcePostId: wpPostId },
    include: { locales: true },
    orderBy: { createdAt: "desc" },
  });

  if (!job) {
    return NextResponse.json({ posts: [], jobUrl: null });
  }

  const locales = job.locales.map((loc) => ({
    locale:    loc.targetLanguage,
    localeName: loc.targetLanguage,  // backend stores the locale code; display uses code
    status:    loc.status,
    wpJobId:   job.id,
  }));

  return NextResponse.json({ posts: locales, jobUrl: null, wpJobId: job.id });
}
