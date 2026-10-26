import { prisma as defaultPrisma } from "@/lib/prisma";

/**
 * Populate the project's Translation Memory with human-reviewed segment translations.
 *
 * Called non-blocking from POST /api/jobs/[id]/complete-review after the linguist
 * marks their work done. Errors are caught internally — this function never throws.
 *
 * Upsert guarantee: TmEntry has @@unique([tmId, sourceText]), so Prisma upsert on
 * that compound key provides race-safe deduplication at the DB level.
 *
 * Logic:
 * 1. Load job → project (org, attachedTmIds, source/target language).
 * 2. Load all JobTranslation rows for this job (AI pre-translation or editor saves).
 * 3. Load TranslationSegment rows for those IDs to get sourceText and any
 *    editor-saved translatedText (editor writes to TranslationSegment.translatedText;
 *    the AI pipeline writes to JobTranslation.translatedText — prefer the former).
 * 4. Filter: skip nulls, < 3 chars, and verbatim passthroughs (source === target).
 * 5. Pre-deduplicate by sourceText within the job (last-write-wins) so multiple
 *    segments with identical source text collapse to a single upsert candidate.
 * 6. Resolve or auto-create the TM (auto-creates if project has none attached).
 * 7. Upsert each entry on @@unique([tmId, sourceText]):
 *    - On conflict: update targetText, increment usageCount, set lastUsed=now.
 *    - On create: set usageCount=1, createdBy="human-review", confidence=1.0.
 * 8. Increment TranslationMemory.entryCount by the number of newly-created rows.
 */
export async function populateTmFromJob(
  jobId: string,
  prismaClient: typeof defaultPrisma = defaultPrisma
): Promise<void> {
  try {
    const job = await prismaClient.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        sourceLanguage: true,
        targetLanguage: true,
        project: {
          select: {
            id: true,
            name: true,
            organizationId: true,
            attachedTmIds: true,
          },
        },
      },
    });

    if (!job?.project) {
      console.warn(`[TM auto-populate] WARN: job=${jobId} not found or has no project`);
      return;
    }

    const { project } = job;

    const jobTranslations = await prismaClient.jobTranslation.findMany({
      where: { jobId },
      select: { segmentId: true, translatedText: true },
    });

    if (jobTranslations.length === 0) {
      console.log(`[TM auto-populate] job=${jobId} has no JobTranslations — skipping`);
      return;
    }

    const segmentIds = jobTranslations.map((jt) => jt.segmentId);
    const jtMap = new Map(jobTranslations.map((jt) => [jt.segmentId, jt.translatedText]));

    const segments = await prismaClient.translationSegment.findMany({
      where: { id: { in: segmentIds } },
      select: { id: true, sourceText: true, translatedText: true },
    });

    // ── Collect + filter ───────────────────────────────────────────────────────
    // Prefer TranslationSegment.translatedText (editor saves); fall back to
    // JobTranslation.translatedText (AI pre-translation). Skip blanks, very short
    // strings, and verbatim passthroughs where source === target.
    const raw: { sourceText: string; targetText: string }[] = [];
    for (const seg of segments) {
      const targetText = (seg.translatedText ?? jtMap.get(seg.id) ?? "").trim();
      if (!targetText || targetText.length < 3) continue;
      const src = seg.sourceText.trim();
      if (targetText === src) continue;
      raw.push({ sourceText: src, targetText });
    }

    if (raw.length === 0) {
      console.log(`[TM auto-populate] job=${jobId} no qualifying entries after filtering`);
      return;
    }

    // ── Pre-deduplicate by sourceText (last-write-wins within the job) ─────────
    // If multiple segments share identical source text, collapse to one candidate.
    // This prevents the upsert loop from issuing conflicting writes on the same key
    // within a single job run, and ensures the reported count is accurate.
    const deduped = new Map<string, string>();
    for (const { sourceText, targetText } of raw) {
      deduped.set(sourceText, targetText);
    }
    const entries = Array.from(deduped.entries()).map(([sourceText, targetText]) => ({
      sourceText,
      targetText,
    }));

    // ── Resolve or auto-create the TM ─────────────────────────────────────────
    let tmId: string;
    if (project.attachedTmIds.length > 0) {
      tmId = project.attachedTmIds[0];
    } else {
      const newTm = await prismaClient.translationMemory.create({
        data: {
          organizationId: project.organizationId,
          name: `Auto — ${project.name}`,
          sourceLanguage: job.sourceLanguage,
          targetLanguage: job.targetLanguage,
          entryCount: 0,
        },
      });
      tmId = newTm.id;
      await prismaClient.project.update({
        where: { id: project.id },
        data: { attachedTmIds: { push: tmId } },
      });
      console.log(
        `[TM auto-populate] job=${jobId} auto-created TM tmId=${tmId} for project=${project.id}`
      );
    }

    // ── Upsert all entries on @@unique([tmId, sourceText]) ────────────────────
    // On conflict (same TM + same source text): update targetText and bump usageCount.
    // On create: set usageCount=1 so freshly added terms rank naturally in TM lookups.
    //
    // To distinguish newly created rows from updates without a race-prone
    // find-then-write pattern: record a timestamp just before the upsert loop,
    // then compare each row's createdAt against it — rows created during this run
    // will have createdAt >= beforeUpserts.
    const beforeUpserts = new Date();
    const now = new Date();
    let created = 0;
    let updated = 0;

    for (const entry of entries) {
      const result = await prismaClient.tmEntry.upsert({
        where: { tmId_sourceText: { tmId, sourceText: entry.sourceText } },
        create: {
          tmId,
          sourceText: entry.sourceText,
          targetText: entry.targetText,
          createdBy: "human-review",
          confidence: 1.0,
          usageCount: 1,
          lastUsed: now,
        },
        update: {
          targetText: entry.targetText,
          usageCount: { increment: 1 },
          lastUsed: now,
        },
        select: { id: true, createdAt: true },
      });
      if (result.createdAt >= beforeUpserts) {
        created++;
      } else {
        updated++;
      }
    }

    // Increment entryCount only for genuinely new rows
    if (created > 0) {
      await prismaClient.translationMemory.update({
        where: { id: tmId },
        data: { entryCount: { increment: created } },
      });
    }

    console.log(
      `[TM auto-populate] job=${jobId} wrote ${entries.length} entries into TM tmId=${tmId} ` +
        `(${updated} updated, ${created} new)`
    );
  } catch (err) {
    console.warn(
      `[TM auto-populate] WARN: job=${jobId} TM write failed:`,
      (err as Error)?.message ?? err
    );
  }
}
