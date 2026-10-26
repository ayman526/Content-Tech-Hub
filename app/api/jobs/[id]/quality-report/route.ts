import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runQualityChecks } from "@/lib/quality-engine";

/**
 * GET /api/jobs/[id]/quality-report
 * Returns the latest automated quality-engine issues for a job + a quality score.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: jobId } = await params;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { projectId: true },
  });

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const [issues, totalSegments] = await Promise.all([
    prisma.segmentIssue.findMany({
      where: { jobId, source: "quality-engine" },
      include: {
        segment: {
          select: { segmentIndex: true, sourceText: true, translatedText: true },
        },
      },
      orderBy: [{ severity: "asc" }, { createdAt: "asc" }],
    }),
    prisma.translationSegment.count({
      where: { document: { projectId: job.projectId } },
    }),
  ]);

  const issuesFound = issues.length;
  const score =
    totalSegments > 0
      ? Math.max(0, Math.round(100 - (issuesFound / totalSegments) * 100))
      : 100;

  return NextResponse.json({ issues, issuesFound, totalSegments, score });
}

/**
 * POST /api/jobs/[id]/quality-report
 * Re-runs the quality engine on demand and returns a fresh report.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: jobId } = await params;

  const report = await runQualityChecks(jobId);
  return NextResponse.json(report);
}
