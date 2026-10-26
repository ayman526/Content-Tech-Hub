import { hasFeature } from "@/lib/plan-features";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/integrations/wordpress/jobs/[id]
 * Actions: cancel | retry
 *
 * Retry semantics:
 *   FAILED        → Re-deliver existing translations (delivery to WP failed).
 *   OUT_OF_DATE   → Re-run the full translation pipeline from a fresh WP fetch.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as any).organizationId;

  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { plan: true } });
  if (!(await hasFeature(org?.plan ?? "STARTER", "wordpress_integration"))) {
    return NextResponse.json({ error: "WordPress integration requires an Agency or Enterprise plan" }, { status: 403 });
  }

  const { id: wpJobId } = await params;
  const { action } = await req.json();

  const job = await prisma.wordpressJob.findUnique({
    where: { id: wpJobId },
    include: { locales: true },
  });
  if (!job || job.organizationId !== orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ── CANCEL ────────────────────────────────────────────────────────────────
  if (action === "cancel") {
    if (!["QUEUED", "IN_PROGRESS", "FAILED"].includes(job.status)) {
      return NextResponse.json(
        { error: "Job cannot be cancelled in its current state" },
        { status: 400 }
      );
    }
    await prisma.wordpressJobLocale.updateMany({
      where: { wordpressJobId: wpJobId, status: { in: ["QUEUED", "IN_PROGRESS"] } },
      data: { status: "CANCELLED" },
    });
    await prisma.wordpressJob.update({ where: { id: wpJobId }, data: { status: "CANCELLED" } });
    return NextResponse.json({ ok: true, status: "CANCELLED" });
  }

  // ── RETRY ─────────────────────────────────────────────────────────────────
  if (action === "retry") {
    if (!["FAILED", "OUT_OF_DATE"].includes(job.status)) {
      return NextResponse.json(
        { error: "Only FAILED or OUT_OF_DATE jobs can be retried" },
        { status: 400 }
      );
    }

    const isOutOfDate = job.status === "OUT_OF_DATE";

    // Reset affected locales
    await prisma.wordpressJobLocale.updateMany({
      where: { wordpressJobId: wpJobId, status: { in: ["FAILED", "OUT_OF_DATE"] } },
      data: { status: "QUEUED", error: null },
    });
    await prisma.wordpressJob.update({ where: { id: wpJobId }, data: { status: "QUEUED" } });

    const affectedLocales = await prisma.wordpressJobLocale.findMany({
      where: { wordpressJobId: wpJobId, status: "QUEUED" },
    });

    if (isOutOfDate) {
      // OUT_OF_DATE: source content changed — re-run the full translation pipeline
      const { retranslateWordpressLocale } = await import("@/lib/wordpress-delivery");
      for (const locale of affectedLocales) {
        retranslateWordpressLocale(locale.id).catch((err) => {
          console.error(`[WP Retry/OUT_OF_DATE] Re-translation failed for locale ${locale.id}:`, err);
        });
      }
    } else {
      // FAILED: delivery to WP failed — re-deliver existing translations
      const { deliverTranslationBackByJobId } = await import("@/lib/wordpress-delivery");
      for (const locale of affectedLocales) {
        if (locale.contentechJobId) {
          deliverTranslationBackByJobId(locale.contentechJobId).catch((err) => {
            console.error(`[WP Retry/FAILED] Re-delivery failed for locale ${locale.id}:`, err);
          });
        }
      }
    }

    return NextResponse.json({
      ok: true,
      status: "QUEUED",
      retriedLocales: affectedLocales.length,
      mode: isOutOfDate ? "retranslate" : "redeliver",
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
