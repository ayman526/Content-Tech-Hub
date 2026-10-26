import { prisma as defaultPrisma } from "@/lib/prisma";

export interface QualityReport {
  jobId: string;
  totalSegments: number;
  issuesFound: number;
  score: number;
  breakdown: {
    emptyTranslation: number;
    untranslated: number;
    intraDocInconsistency: number;
    tmMismatch: number;
    glossaryViolation: number;
    numberMismatch: number;
  };
}

/**
 * Regex for content that is safe to leave "untranslated":
 * pure numbers, currency, punctuation, URLs, email addresses, codes.
 */
const PASSTHROUGH_RE =
  /^[\d\s.,\-+()%$€£¥:\/\\\[\]{}@#!?;=&*^_|<>~`'"]+$|^https?:\/\/\S+$|^\S+@\S+\.\S+$/;

/** Extract distinct number tokens (integers + decimals) from a string. */
function extractNumbers(text: string): string[] {
  const raw = text.match(/\d[\d,.]*/g) ?? [];
  const cleaned = raw.map((n) => n.replace(/[,.]$/, "")).filter(Boolean);
  return [...new Set(cleaned)];
}

/**
 * runQualityChecks — automated QA engine.
 *
 * Runs 6 checks against every segment in the job's project:
 *  1. Empty Translation      — target is blank                         (ACCURACY / CRITICAL)
 *  2. Untranslated Segment   — target == source (non-passthrough)      (ACCURACY / MEDIUM)
 *  3. Intra-Doc Inconsistency — same source, different target elsewhere (CONSISTENCY / MEDIUM)
 *  4. TM Mismatch            — TM has a different approved translation  (CONSISTENCY / MEDIUM)
 *  5. Glossary Violation     — glossary term missing or not preserved   (TERMINOLOGY / CRITICAL|MEDIUM)
 *  6. Number Integrity       — numbers present in source absent in target (ACCURACY / MEDIUM)
 *
 * Idempotent: clears all source="quality-engine" issues for the job before writing new ones.
 * All errors are caught internally — never throws.
 *
 * Called non-blocking from POST /api/jobs/[id]/complete-review after TM auto-populate.
 */
export async function runQualityChecks(
  jobId: string,
  prismaClient: typeof defaultPrisma = defaultPrisma
): Promise<QualityReport> {
  try {
    // ── Load job context ─────────────────────────────────────────────────────
    const job = await prismaClient.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        targetLanguage: true,
        project: {
          select: {
            id: true,
            attachedTmIds: true,
            attachedGlossaryIds: true,
          },
        },
      },
    });

    if (!job?.project) {
      console.warn(`[Quality Engine] WARN: job=${jobId} not found or has no project`);
      return _emptyReport(jobId);
    }

    // ── Load segments with their best available translation ──────────────────
    const rawSegments = await prismaClient.translationSegment.findMany({
      where: { document: { projectId: job.project.id } },
      select: {
        id: true,
        sourceText: true,
        translatedText: true,
        jobTranslations: {
          where: { jobId },
          select: { translatedText: true },
          take: 1,
        },
      },
    });

    // Prefer editor-saved translatedText; fall back to JobTranslation (AI draft)
    const segments = rawSegments.map((seg) => ({
      id: seg.id,
      sourceText: seg.sourceText.trim(),
      targetText: (seg.translatedText ?? seg.jobTranslations[0]?.translatedText ?? "").trim(),
    }));

    if (segments.length === 0) {
      console.log(`[Quality Engine] job=${jobId} has no segments — skipping`);
      return _emptyReport(jobId);
    }

    // ── Load TM entries for project's attached TMs ───────────────────────────
    const tmEntries =
      job.project.attachedTmIds.length > 0
        ? await prismaClient.tmEntry.findMany({
            where: { tmId: { in: job.project.attachedTmIds } },
            select: { sourceText: true, targetText: true },
          })
        : [];

    // sourceText (lowercased + trimmed) → approved target
    const tmMap = new Map<string, string>();
    for (const entry of tmEntries) {
      tmMap.set(entry.sourceText.trim().toLowerCase(), entry.targetText.trim());
    }

    // ── Load glossary terms ──────────────────────────────────────────────────
    const glossaryTerms =
      job.project.attachedGlossaryIds.length > 0
        ? await prismaClient.glossaryTerm.findMany({
            where: { glossaryId: { in: job.project.attachedGlossaryIds } },
            select: {
              term: true,
              translations: true,
              doNotTranslate: true,
              caseSensitive: true,
            },
          })
        : [];

    // ── Clear previous quality-engine issues (idempotent re-runs) ────────────
    await prismaClient.segmentIssue.deleteMany({
      where: { jobId, source: "quality-engine" },
    });

    // ── Build intra-document consistency vote map ────────────────────────────
    // lowerSource → Map<lowerTarget, count>
    const docVoteMap = new Map<string, Map<string, number>>();
    for (const seg of segments) {
      if (!seg.targetText) continue;
      const srcKey = seg.sourceText.toLowerCase();
      if (!docVoteMap.has(srcKey)) docVoteMap.set(srcKey, new Map());
      const votes = docVoteMap.get(srcKey)!;
      const tgtKey = seg.targetText.toLowerCase();
      votes.set(tgtKey, (votes.get(tgtKey) ?? 0) + 1);
    }

    // For sources with multiple translations, determine the majority translation
    const majorityMap = new Map<string, string>();
    for (const [srcKey, votes] of docVoteMap) {
      if (votes.size < 2) continue;
      let maxCount = 0;
      let majority = "";
      for (const [tgt, count] of votes) {
        if (count > maxCount) {
          maxCount = count;
          majority = tgt;
        }
      }
      majorityMap.set(srcKey, majority);
    }

    // ── Run all checks ───────────────────────────────────────────────────────
    type IssueInput = {
      segmentId: string;
      jobId: string;
      category: string;
      subType: string;
      severity: string;
      note: string | null;
      source: string;
    };

    const issuesToCreate: IssueInput[] = [];
    const breakdown = {
      emptyTranslation: 0,
      untranslated: 0,
      intraDocInconsistency: 0,
      tmMismatch: 0,
      glossaryViolation: 0,
      numberMismatch: 0,
    };

    const targetLang = job.targetLanguage;
    const targetLangShort = targetLang.substring(0, 2).toLowerCase();

    for (const seg of segments) {
      // ── Check 1: Empty translation ─────────────────────────────────────────
      if (!seg.targetText) {
        issuesToCreate.push({
          segmentId: seg.id,
          jobId,
          category: "ACCURACY",
          subType: "Empty Translation",
          severity: "CRITICAL",
          note: "This segment has no translation.",
          source: "quality-engine",
        });
        breakdown.emptyTranslation++;
        continue;
      }

      // ── Check 2: Verbatim passthrough ──────────────────────────────────────
      if (
        seg.targetText.toLowerCase() === seg.sourceText.toLowerCase() &&
        !PASSTHROUGH_RE.test(seg.sourceText)
      ) {
        issuesToCreate.push({
          segmentId: seg.id,
          jobId,
          category: "ACCURACY",
          subType: "Untranslated Segment",
          severity: "MEDIUM",
          note: "Target text is identical to source — segment may not have been translated.",
          source: "quality-engine",
        });
        breakdown.untranslated++;
      }

      // ── Check 3: Intra-document consistency ────────────────────────────────
      const srcKey = seg.sourceText.toLowerCase();
      const majority = majorityMap.get(srcKey);
      if (majority && seg.targetText.toLowerCase() !== majority) {
        issuesToCreate.push({
          segmentId: seg.id,
          jobId,
          category: "CONSISTENCY",
          subType: "Inconsistent Translation",
          severity: "MEDIUM",
          note: "This source phrase is translated differently in other segments of the same document.",
          source: "quality-engine",
        });
        breakdown.intraDocInconsistency++;
      }

      // ── Check 4: TM consistency ────────────────────────────────────────────
      const tmTarget = tmMap.get(srcKey);
      if (tmTarget && tmTarget.toLowerCase() !== seg.targetText.toLowerCase()) {
        issuesToCreate.push({
          segmentId: seg.id,
          jobId,
          category: "CONSISTENCY",
          subType: "TM Mismatch",
          severity: "MEDIUM",
          note: "The Translation Memory has a previously approved translation that differs from this one.",
          source: "quality-engine",
        });
        breakdown.tmMismatch++;
      }

      // ── Check 5: Glossary terminology ──────────────────────────────────────
      for (const term of glossaryTerms) {
        const termInSource = term.caseSensitive
          ? seg.sourceText.includes(term.term)
          : seg.sourceText.toLowerCase().includes(term.term.toLowerCase());

        if (!termInSource) continue;

        if (term.doNotTranslate) {
          const inTarget = term.caseSensitive
            ? seg.targetText.includes(term.term)
            : seg.targetText.toLowerCase().includes(term.term.toLowerCase());

          if (!inTarget) {
            issuesToCreate.push({
              segmentId: seg.id,
              jobId,
              category: "TERMINOLOGY",
              subType: "Do-Not-Translate Violation",
              severity: "CRITICAL",
              note: `"${term.term}" must not be translated and should appear verbatim in the target.`,
              source: "quality-engine",
            });
            breakdown.glossaryViolation++;
          }
        } else {
          const translations = term.translations as Record<string, string> | null;
          const expected =
            translations?.[targetLang] ??
            translations?.[targetLangShort] ??
            translations?.[targetLang.toLowerCase()];

          if (expected) {
            const inTarget = seg.targetText.toLowerCase().includes(expected.toLowerCase());
            if (!inTarget) {
              issuesToCreate.push({
                segmentId: seg.id,
                jobId,
                category: "TERMINOLOGY",
                subType: "Missing Glossary Term",
                severity: "MEDIUM",
                note: `"${term.term}" should be rendered as "${expected}" per the project glossary.`,
                source: "quality-engine",
              });
              breakdown.glossaryViolation++;
            }
          }
        }
      }

      // ── Check 6: Number integrity ──────────────────────────────────────────
      const srcNums = extractNumbers(seg.sourceText);
      if (srcNums.length > 0) {
        const missing = srcNums.filter((n) => !seg.targetText.includes(n));
        if (missing.length > 0) {
          issuesToCreate.push({
            segmentId: seg.id,
            jobId,
            category: "ACCURACY",
            subType: "Missing Numbers",
            severity: "MEDIUM",
            note: `Number${missing.length > 1 ? "s" : ""} present in source but absent in target: ${missing.join(", ")}`,
            source: "quality-engine",
          });
          breakdown.numberMismatch++;
        }
      }
    }

    // ── Persist all issues in a single batch ─────────────────────────────────
    if (issuesToCreate.length > 0) {
      await prismaClient.segmentIssue.createMany({ data: issuesToCreate as any });
    }

    const totalSegments = segments.length;
    const issuesFound = issuesToCreate.length;
    const score =
      totalSegments > 0
        ? Math.max(0, Math.round(100 - (issuesFound / totalSegments) * 100))
        : 100;

    console.log(
      `[Quality Engine] job=${jobId} checked ${totalSegments} segments, ` +
        `${issuesFound} issues detected, score=${score} ` +
        `(empty:${breakdown.emptyTranslation} untranslated:${breakdown.untranslated} ` +
        `intraDoc:${breakdown.intraDocInconsistency} tm:${breakdown.tmMismatch} ` +
        `glossary:${breakdown.glossaryViolation} numbers:${breakdown.numberMismatch})`
    );

    return { jobId, totalSegments, issuesFound, score, breakdown };
  } catch (err) {
    console.warn(
      `[Quality Engine] WARN: job=${jobId} failed:`,
      (err as Error)?.message ?? err
    );
    return _emptyReport(jobId);
  }
}

function _emptyReport(jobId: string): QualityReport {
  return {
    jobId,
    totalSegments: 0,
    issuesFound: 0,
    score: 100,
    breakdown: {
      emptyTranslation: 0,
      untranslated: 0,
      intraDocInconsistency: 0,
      tmMismatch: 0,
      glossaryViolation: 0,
      numberMismatch: 0,
    },
  };
}
