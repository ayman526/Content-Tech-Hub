import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { translateSegment, fetchBizContextForProject, type LocContext } from "@/lib/ai-translate";

/**
 * POST /api/jobs/[id]/retranslate
 * Body: { segmentId?: string }
 *
 * If segmentId is provided — retranslate that single segment.
 * If omitted — retranslate ALL segments that have no JobTranslation record for this job.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: jobId } = await params;
  const body = await req.json().catch(() => ({}));
  const { segmentId: singleSegmentId } = body as { segmentId?: string };

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      jobTranslations: { select: { segmentId: true } },
      project: {
        include: {
          organization: { select: { id: true } },
          documents: {
            include: { segments: { orderBy: { segmentIndex: "asc" } } },
          },
        },
      },
    },
  });

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const orgId = job.project.organization?.id ?? null;
  const billingMode: string = String(job.project.workflowType ?? "CREDITS");

  const allSegments = job.project.documents.flatMap((d: any) => d.segments);
  const alreadyTranslated = new Set(job.jobTranslations.map((jt: any) => jt.segmentId));

  // Determine which segments to retranslate
  const toTranslate = singleSegmentId
    ? allSegments.filter((s: any) => s.id === singleSegmentId)
    : allSegments.filter((s: any) => !alreadyTranslated.has(s.id));

  if (toTranslate.length === 0) {
    return NextResponse.json({ message: "Nothing to retranslate", count: 0 });
  }

  let translated = 0;
  let failed = 0;

  // Pull business context (industry, URL, bio) for this project's account so
  // the AI prompt is grounded in the customer's domain and brand voice.
  const bizContext = await fetchBizContextForProject(prisma, job.projectId);
  const locCtx: LocContext | undefined = bizContext
    ? { tmEntries: [], glossaryTerms: [], styleGuides: [], bizContext }
    : undefined;

  for (const seg of toTranslate) {
    try {
      const translatedText = await translateSegment(
        seg.sourceText,
        job.sourceLanguage,
        job.targetLanguage,
        3,
        locCtx,
        undefined,
        undefined,
        {
          organizationId: orgId,
          projectId: job.projectId,
          jobId,
          segmentId: seg.id,
          billingMode,
          kind: "retranslate",
        }
      );
      await prisma.jobTranslation.upsert({
        where: { jobId_segmentId: { jobId, segmentId: seg.id } },
        update: { translatedText },
        create: { jobId, segmentId: seg.id, translatedText },
      });
      await prisma.translationSegment.update({
        where: { id: seg.id },
        data: { status: "TRANSLATED" },
      });
      translated++;
    } catch (err) {
      failed++;
      console.error(`[retranslate] segment ${seg.id} failed:`, err);
    }
  }

  return NextResponse.json({ translated, failed });
}
