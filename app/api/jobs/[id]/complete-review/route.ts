import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deliverTranslationBackByJobId } from "@/lib/wordpress-delivery";
import { populateTmFromJob } from "@/lib/tm-utils";
import { runQualityChecks } from "@/lib/quality-engine";

/**
 * POST /api/jobs/[id]/complete-review
 * Called by the LINGUIST to mark their review/submission as complete.
 * This sets the job to COMPLETED and marks all segments as REVIEWED.
 * The task.approved notification fires separately when the CLIENT approves via /approve.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: jobId } = await params;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      project: {
        include: {
          client: { select: { id: true, email: true, name: true } },
        },
      },
    },
  });

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.linguistId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const auditReportUrl = `/api/jobs/${jobId}/audit-report`;

  await prisma.$transaction([
    prisma.job.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        auditReportUrl,
      },
    }),
    prisma.translationSegment.updateMany({
      where: {
        document: { projectId: job.projectId },
        assignedLinguistId: session.user.id,
      },
      data: { status: "REVIEWED", reviewedById: session.user.id, reviewedAt: new Date() },
    }),
  ]);

  // If this job originated from a WordPress integration, push translation back to WordPress
  deliverTranslationBackByJobId(jobId).catch((err) => {
    console.error(`[WP Delivery] post-complete-review delivery failed for job ${jobId}:`, err);
  });

  // Auto-populate Translation Memory from human-reviewed segments (non-blocking)
  populateTmFromJob(jobId).catch((err) => {
    console.warn(`[TM auto-populate] WARN: job=${jobId} outer catch:`, err?.message ?? err);
  });

  // Run automated quality checks on the completed job (non-blocking)
  runQualityChecks(jobId).catch((err) => {
    console.warn(`[Quality Engine] WARN: job=${jobId} outer catch:`, err?.message ?? err);
  });

  return NextResponse.json({ ok: true, auditReportUrl });
}
