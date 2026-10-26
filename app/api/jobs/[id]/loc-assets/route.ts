import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/jobs/[id]/loc-assets
 * Returns ONLY the localization assets explicitly attached to the project this job belongs to.
 * Never returns all org-level assets — scoped to what the client selected at project creation.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: jobId } = await params;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      project: {
        select: {
          organizationId: true,
          attachedTmIds: true,
          attachedGlossaryIds: true,
          attachedStyleGuideIds: true,
        },
      },
    },
  });

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const {
    attachedTmIds = [],
    attachedGlossaryIds = [],
    attachedStyleGuideIds = [],
  } = job.project;

  // All three arrays empty → no assets attached, return empty
  if (
    attachedTmIds.length === 0 &&
    attachedGlossaryIds.length === 0 &&
    attachedStyleGuideIds.length === 0
  ) {
    return NextResponse.json({ tmEntries: [], glossaryTerms: [], styleGuides: [] });
  }

  const [tmEntries, glossaries, styleGuides] = await Promise.all([
    attachedTmIds.length > 0
      ? prisma.tmEntry.findMany({
          where: { tmId: { in: attachedTmIds } },
          select: { id: true, sourceText: true, targetText: true, confidence: true },
          orderBy: { usageCount: "desc" },
          take: 200,
        })
      : [],
    attachedGlossaryIds.length > 0
      ? prisma.glossary.findMany({
          where: { id: { in: attachedGlossaryIds } },
          include: { terms: { take: 500 } },
        })
      : [],
    attachedStyleGuideIds.length > 0
      ? prisma.styleGuide.findMany({
          where: { id: { in: attachedStyleGuideIds } },
          select: { id: true, name: true, content: true },
        })
      : [],
  ]);

  const glossaryTerms = (glossaries as any[]).flatMap((g: any) =>
    g.terms.map((t: any) => ({
      id: t.id,
      glossaryId: g.id,
      glossaryName: g.name,
      term: t.term,
      translations: t.translations,
      definition: t.definition,
      doNotTranslate: t.doNotTranslate,
    }))
  );

  return NextResponse.json({ tmEntries, glossaryTerms, styleGuides });
}
