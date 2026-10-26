import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateWorkspace, isSubscribed, logActivity } from "@/lib/studio";
import { translateSegment, inferDocType, fetchBizContextForOrg, LocContext } from "@/lib/ai-translate";

/**
 * Build a LocContext from the Studio job's attached TM, glossary, and style guide.
 * Maps Studio's JSON-based schema to the shared LocContext interface used by the
 * main platform's translateSegment() function so the same prompt injection applies.
 */
async function buildStudioLocContext(
  attachedTmId: string | null,
  attachedGlossaryId: string | null,
  attachedStyleGuideId: string | null,
  targetLanguage: string
): Promise<LocContext> {
  const [tm, glossary, styleGuide] = await Promise.all([
    attachedTmId
      ? prisma.studioTm.findUnique({ where: { id: attachedTmId } })
      : null,
    attachedGlossaryId
      ? prisma.studioGlossary.findUnique({ where: { id: attachedGlossaryId } })
      : null,
    attachedStyleGuideId
      ? prisma.studioStyleGuide.findUnique({ where: { id: attachedStyleGuideId } })
      : null,
  ]);

  // TM entries — Studio stores them as [{sourceText, targetText}], same shape as LocContext
  const tmEntries: LocContext["tmEntries"] = tm
    ? (tm.entries as { sourceText: string; targetText: string }[]).slice(0, 20)
    : [];

  // Glossary terms — Studio stores [{source, target, doNotTranslate?, keepUppercase?}]
  // Map to {term, translations: {[langKey]: target}, doNotTranslate, keepUppercase}
  const langKey = targetLanguage.split(" ")[0].toLowerCase();
  const glossaryTerms: LocContext["glossaryTerms"] = glossary
    ? (glossary.terms as { source: string; target: string; doNotTranslate?: boolean; keepUppercase?: boolean }[])
        .slice(0, 40)
        .map((t) => ({
          term: t.source,
          translations: { [langKey]: t.target, default: t.target },
          doNotTranslate: Boolean(t.doNotTranslate),
          keepUppercase: Boolean(t.keepUppercase),
        }))
    : [];

  // Style guide — same shape as LocContext
  const styleGuides: LocContext["styleGuides"] = styleGuide
    ? [{ name: styleGuide.name, content: styleGuide.content }]
    : [];

  return { tmEntries, glossaryTerms, styleGuides };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "LINGUIST" && session.user.role !== "ADMIN"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ws = await getOrCreateWorkspace(session.user.id!);
  if (!isSubscribed(ws)) return NextResponse.json({ error: "Studio subscription required" }, { status: 403 });

  const { id: jobId } = await params;
  const body = await req.json().catch(() => ({}));
  const fileId: string | undefined = body.fileId;

  const job = await prisma.studioJob.findFirst({
    where: { id: jobId, workspaceId: ws.id },
    include: {
      files: {
        ...(fileId ? { where: { id: fileId } } : {}),
        include: { translations: { orderBy: { segmentIndex: "asc" } } },
      },
    },
  });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.translationMethod === "FULLY_HUMAN")
    return NextResponse.json(
      { error: "This job uses fully human translation — AI draft is disabled." },
      { status: 400 }
    );
  if (job.files.length === 0)
    return NextResponse.json({ error: "No files found. Upload a file first." }, { status: 400 });

  // ── Build localization context from attached assets (once, shared across all segments) ──
  const locCtx = await buildStudioLocContext(
    job.attachedTmId ?? null,
    job.attachedGlossaryId ?? null,
    job.attachedStyleGuideId ?? null,
    job.targetLanguage
  );

  // ── Attach business context from the linguist's workspace organization (if any) ──
  // Studio jobs belong to a workspace tied to a user — we look up that user's org
  // for industry/URL/bio context to inject into the prompt.
  const linguistUser = await prisma.user.findUnique({
    where: { id: session.user.id! },
    select: { organizationId: true },
  });
  if (linguistUser?.organizationId) {
    locCtx.bizContext = await fetchBizContextForOrg(prisma, linguistUser.organizationId);
  }

  const hasContext =
    locCtx.tmEntries.length > 0 ||
    locCtx.glossaryTerms.length > 0 ||
    locCtx.styleGuides.length > 0 ||
    Boolean(locCtx.bizContext);

  // ── Infer document type from first segments (keyword heuristic — no AI call) ──
  const allSourceText = job.files
    .flatMap((f) => f.translations.slice(0, 10).map((s) => s.sourceText))
    .join(" ");
  const docType = inferDocType(allSourceText);

  console.log(
    `[studio-draft] job=${jobId} docType="${docType}" TM=${locCtx.tmEntries.length} terms, ` +
    `glossary=${locCtx.glossaryTerms.length} terms, ` +
    `styleGuides=${locCtx.styleGuides.length}, ` +
    `contextActive=${hasContext}`
  );

  let totalGenerated = 0;
  let totalFailed = 0;
  const BATCH = 3;

  for (const jobFile of job.files) {
    const segs = jobFile.translations;
    if (segs.length === 0) continue;

    for (let i = 0; i < segs.length; i += BATCH) {
      const batch = segs.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (seg) => {
          try {
            const translatedText = await translateSegment(
              seg.sourceText,
              job.sourceLanguage,
              job.targetLanguage,
              3,
              hasContext ? locCtx : undefined,
              undefined,
              docType,
              {
                jobId: job.id,
                segmentId: seg.id,
                billingMode: "CREDITS",
                kind: "studio_draft",
              }
            );
            await prisma.studioSegmentTranslation.update({
              where: { id: seg.id },
              data: { translatedText, isDraft: true },
            });
            totalGenerated++;
          } catch (err) {
            console.error(`[studio-draft] segment ${seg.id} failed:`, err);
            totalFailed++;
          }
        })
      );
    }

    await prisma.studioJobFile.update({
      where: { id: jobFile.id },
      data: { aiDraftGenerated: true },
    });
  }

  await logActivity(ws.id, "ai_draft.generated", {
    jobId,
    totalSegments: totalGenerated,
    failed: totalFailed,
    tmEntries: locCtx.tmEntries.length,
    glossaryTerms: locCtx.glossaryTerms.length,
  });

  return NextResponse.json({
    ok: true,
    segmentsGenerated: totalGenerated,
    failed: totalFailed,
    contextUsed: {
      docType,
      tmEntries: locCtx.tmEntries.length,
      glossaryTerms: locCtx.glossaryTerms.length,
      styleGuides: locCtx.styleGuides.length,
    },
  });
}
