import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") return null;
  return session;
}

/**
 * Build the date window from query params.
 * Supports either preset (?days=7|30|90) or custom range (?from=ISO&to=ISO).
 * Custom range takes precedence when both `from` and `to` are valid.
 */
function parseDateWindow(searchParams: URLSearchParams): {
  since: Date;
  until: Date;
  label: string;
} {
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  if (fromStr && toStr) {
    const from = new Date(fromStr);
    const to = new Date(toStr);
    if (!isNaN(from.getTime()) && !isNaN(to.getTime()) && from < to) {
      // Make `to` inclusive of the selected end day by advancing one day so
      // `createdAt < until` still captures events created on that day.
      const until = new Date(to.getTime() + 24 * 60 * 60 * 1000);
      return { since: from, until, label: "custom" };
    }
  }
  const days = Math.min(Math.max(parseInt(searchParams.get("days") ?? "30", 10) || 30, 1), 365);
  return {
    since: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
    until: new Date(),
    label: `${days}d`,
  };
}

/**
 * Build the Prisma `where` clause respecting the BYOK exclusion rule:
 *  - Default behavior: exclude BYOK (system-credit primary view)
 *  - includeBYOK=true: include BYOK rows
 *  - billingMode=BYOK explicit filter: ALWAYS show BYOK (overrides includeBYOK)
 *  - billingMode=other explicit filter: only that mode (BYOK is naturally excluded)
 *
 * Resolves the double-billingMode bug by giving the explicit filter priority.
 */
function buildWhere(opts: {
  since: Date;
  until: Date;
  modelId?: string;
  billingMode?: string;
  includeBYOK: boolean;
  kind?: string;
}): Prisma.LlmUsageEventWhereInput {
  const { since, until, modelId, billingMode, includeBYOK, kind } = opts;
  const where: Prisma.LlmUsageEventWhereInput = {
    createdAt: { gte: since, lt: until },
    ...(modelId ? { modelId } : {}),
    ...(kind ? { kind } : {}),
  };
  if (billingMode) {
    // Explicit billing filter wins — don't add a NOT BYOK clause on top.
    where.billingMode = billingMode;
  } else if (!includeBYOK) {
    where.billingMode = { not: "BYOK" };
  }
  return where;
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") ?? "summary"; // summary | jobs | events
  const { since, until, label: rangeLabel } = parseDateWindow(searchParams);

  // Filters
  const modelFilter = searchParams.get("modelId") ?? undefined;
  const billingModeFilter = searchParams.get("billingMode") ?? undefined;
  const kindFilter = searchParams.get("kind") ?? undefined;
  // Per spec: BYOK is excluded by default (system-credit primary view)
  const includeBYOK = searchParams.get("includeBYOK") === "true";

  const baseWhere = buildWhere({
    since,
    until,
    modelId: modelFilter,
    billingMode: billingModeFilter,
    includeBYOK,
    kind: kindFilter,
  });

  // ── Timeseries view: daily cost + tokens bucketed per model ───────────
  if (view === "timeseries") {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`"createdAt" >= ${since}`,
      Prisma.sql`"createdAt" < ${until}`,
    ];

    if (modelFilter) {
      conditions.push(Prisma.sql`"modelId" = ${modelFilter}`);
    }

    if (kindFilter) {
      conditions.push(Prisma.sql`"kind" = ${kindFilter}`);
    }

    if (billingModeFilter) {
      conditions.push(Prisma.sql`"billingMode" = ${billingModeFilter}`);
    } else if (!includeBYOK) {
      conditions.push(Prisma.sql`"billingMode" != 'BYOK'`);
    }

    const whereClause = Prisma.join(conditions, " AND ");

    type TimeseriesRow = {
      date: Date;
      modelId: string | null;
      modelKey: string | null;
      promptTokens: bigint;
      completionTokens: bigint;
      totalTokens: bigint;
      costUsd: string | null;
      callCount: bigint;
    };

    const rows = await prisma.$queryRaw<TimeseriesRow[]>(Prisma.sql`
      SELECT
        DATE_TRUNC('day', "createdAt") AS date,
        "modelId",
        "modelKey",
        SUM("promptTokens")::bigint AS "promptTokens",
        SUM("completionTokens")::bigint AS "completionTokens",
        SUM("totalTokens")::bigint AS "totalTokens",
        SUM("costUsd") AS "costUsd",
        SUM("callCount")::bigint AS "callCount"
      FROM "LlmUsageEvent"
      WHERE ${whereClause}
      GROUP BY DATE_TRUNC('day', "createdAt"), "modelId", "modelKey"
      ORDER BY date ASC
    `);

    const modelIds = [...new Set(rows.map((r) => r.modelId).filter(Boolean))] as string[];
    const models = modelIds.length
      ? await prisma.aiModel.findMany({
          where: { id: { in: modelIds } },
          select: {
            id: true,
            displayName: true,
            costPerInputTokenUsd: true,
            costPerOutputTokenUsd: true,
          },
        })
      : [];
    const modelMap = Object.fromEntries(models.map((m) => [m.id, m]));

    const timeseries = rows.map((r) => {
      const model = r.modelId ? modelMap[r.modelId] : null;
      const promptTokens = Number(r.promptTokens);
      const completionTokens = Number(r.completionTokens);

      let costUsd: number | null = r.costUsd != null ? Number(r.costUsd) : null;
      if (
        costUsd == null &&
        model?.costPerInputTokenUsd != null &&
        model?.costPerOutputTokenUsd != null
      ) {
        costUsd =
          promptTokens * Number(model.costPerInputTokenUsd) +
          completionTokens * Number(model.costPerOutputTokenUsd);
      }

      return {
        date: (r.date as Date).toISOString().slice(0, 10),
        modelId: r.modelId,
        modelKey: r.modelKey,
        displayName: model?.displayName ?? r.modelKey ?? "Unknown",
        promptTokens,
        completionTokens,
        totalTokens: Number(r.totalTokens),
        costUsd,
        callCount: Number(r.callCount),
      };
    });

    return NextResponse.json({ timeseries, since, until });
  }

  // ── Per-Job aggregated view (the primary admin table) ──────────────────
  if (view === "jobs") {
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = 50;

    const grouped = await prisma.llmUsageEvent.groupBy({
      by: ["jobId"],
      where: { ...baseWhere, jobId: { not: null } },
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        callCount: true,
        costUsd: true,
      },
      _count: { id: true },
      _min: { createdAt: true },
      _max: { createdAt: true, billingMode: true },
    });

    const total = grouped.length;
    const sortedAll = grouped.sort(
      (a, b) =>
        (b._max.createdAt?.getTime() ?? 0) - (a._max.createdAt?.getTime() ?? 0)
    );
    const slice = sortedAll.slice((page - 1) * limit, page * limit);

    const jobIds = slice.map((g) => g.jobId).filter(Boolean) as string[];
    const jobsData = jobIds.length
      ? await prisma.job.findMany({
          where: { id: { in: jobIds } },
          select: {
            id: true,
            targetLanguage: true,
            sourceLanguage: true,
            status: true,
            createdAt: true,
            projectId: true,
            project: {
              select: { id: true, name: true, organizationId: true },
            },
          },
        })
      : [];

    const orgIds = [...new Set(jobsData.map((j) => j.project?.organizationId).filter(Boolean))] as string[];
    const projectIds = [...new Set(jobsData.map((j) => j.projectId).filter(Boolean))] as string[];

    const [orgs, allProjectJobs, creditTxns, modelsForBackfill] = await Promise.all([
      orgIds.length
        ? prisma.organization.findMany({
            where: { id: { in: orgIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      // Count ALL jobs per project so the credit split is stable.
      projectIds.length
        ? prisma.job.groupBy({
            by: ["projectId"],
            where: { projectId: { in: projectIds } },
            _count: { _all: true },
          })
        : Promise.resolve([] as { projectId: string; _count: { _all: number } }[]),
      projectIds.length
        ? prisma.creditTransaction.findMany({
            where: {
              relatedProjectId: { in: projectIds },
              amount: { lt: 0 },
              breakdownJSON: { path: ["kind"], equals: "project_translation" },
            },
            select: { relatedProjectId: true, amount: true },
          })
        : Promise.resolve([]),
      // For cost backfill when stored cost is null + display fields.
      prisma.aiModel.findMany({
        select: {
          id: true,
          displayName: true,
          provider: { select: { name: true } },
          costPerInputTokenUsd: true,
          costPerOutputTokenUsd: true,
        },
      }),
    ]);

    const orgMap = Object.fromEntries(orgs.map((o) => [o.id, o.name]));
    const jobsPerProject: Record<string, number> = Object.fromEntries(
      allProjectJobs.map((g) => [g.projectId, g._count._all])
    );
    const projectCreditTotal: Record<string, number> = {};
    for (const t of creditTxns) {
      if (!t.relatedProjectId) continue;
      projectCreditTotal[t.relatedProjectId] =
        (projectCreditTotal[t.relatedProjectId] ?? 0) + Math.abs(t.amount);
    }

    // Per-job dominant model (max callCount, modelId tiebreak).
    const callModelStats = jobIds.length
      ? await prisma.llmUsageEvent.groupBy({
          by: ["jobId", "modelId"],
          where: { ...baseWhere, jobId: { in: jobIds } },
          _sum: { callCount: true },
        })
      : [];
    const jobModelMap: Record<string, string | null> = {};
    const jobModelScore: Record<string, number> = {};
    for (const cm of callModelStats) {
      if (!cm.jobId) continue;
      const score = cm._sum.callCount ?? 0;
      const prev = jobModelScore[cm.jobId];
      const prevModel = jobModelMap[cm.jobId];
      const better =
        prev === undefined ||
        score > prev ||
        (score === prev && (prevModel ?? "") > (cm.modelId ?? ""));
      if (better) {
        jobModelMap[cm.jobId] = cm.modelId;
        jobModelScore[cm.jobId] = score;
      }
    }
    const modelMap = Object.fromEntries(modelsForBackfill.map((m) => [m.id, m]));

    const jobsRowMap = Object.fromEntries(jobsData.map((j) => [j.id, j]));

    const rows = slice.map((g) => {
      const job = g.jobId ? jobsRowMap[g.jobId] : null;
      const projectId = job?.projectId ?? null;
      const orgId = job?.project?.organizationId ?? null;
      const orgName = orgId ? (orgMap[orgId] ?? null) : null;
      const billingMode = g._max.billingMode ?? "CREDITS";
      const isBYOK = billingMode === "BYOK";

      // Backfill only when stored aggregate is null; preserve real 0.
      let costUsd: number | null = null;
      if (!isBYOK) {
        if (g._sum.costUsd != null) {
          costUsd = Number(g._sum.costUsd);
        } else if (g.jobId) {
          const modelId = jobModelMap[g.jobId];
          const m = modelId ? modelMap[modelId] : null;
          if (m?.costPerInputTokenUsd != null && m?.costPerOutputTokenUsd != null) {
            costUsd =
              (g._sum.promptTokens ?? 0) * Number(m.costPerInputTokenUsd) +
              (g._sum.completionTokens ?? 0) * Number(m.costPerOutputTokenUsd);
          }
        }
      }

      // Credits charged once per job: project total / project's job count.
      let creditsCharged = 0;
      if (projectId) {
        const projTotal = projectCreditTotal[projectId] ?? 0;
        if (projTotal > 0) {
          const jc = jobsPerProject[projectId] || 1;
          creditsCharged = Math.round(projTotal / jc);
        }
      }

      const modelId = g.jobId ? jobModelMap[g.jobId] : null;
      const modelRec = modelId ? modelMap[modelId] : null;
      const modelName = modelRec?.displayName ?? modelId ?? null;
      const modelProvider = modelRec?.provider?.name ?? null;

      return {
        jobId: g.jobId,
        jobTitle: job?.project?.name ?? "—",
        jobCreatedAt: job?.createdAt ?? null,
        sourceLanguage: job?.sourceLanguage ?? null,
        targetLanguage: job?.targetLanguage ?? null,
        status: job?.status ?? null,
        organizationId: orgId,
        organizationName: orgName,
        modelId,
        modelName,
        modelProvider,
        billingMode,
        callCount: g._sum.callCount ?? g._count.id,
        eventCount: g._count.id,
        promptTokens: g._sum.promptTokens ?? 0,
        completionTokens: g._sum.completionTokens ?? 0,
        totalTokens: g._sum.totalTokens ?? 0,
        costUsd,
        creditsCharged,
        firstActivityAt: g._min.createdAt,
        lastActivityAt: g._max.createdAt,
      };
    });

    return NextResponse.json({
      jobs: rows,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  }

  if (view === "events") {
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = 50;
    const skip = (page - 1) * limit;

    // Optional drill-down to a single job
    const jobIdFilter = searchParams.get("jobId");
    const eventsWhere: Prisma.LlmUsageEventWhereInput = jobIdFilter
      ? { ...baseWhere, jobId: jobIdFilter }
      : baseWhere;

    const [total, events] = await Promise.all([
      prisma.llmUsageEvent.count({ where: eventsWhere }),
      prisma.llmUsageEvent.findMany({
        where: eventsWhere,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          model: { select: { displayName: true, apiModelId: true } },
        },
      }),
    ]);

    // Batch lookups to avoid N+1: orgs, jobs (with project + target lang),
    // and translation-related credit charges. Credits are computed PER JOB
    // (not per project lifetime) so the table doesn't repeat the same
    // project total on every event row.
    const orgIds = [...new Set(events.map((e) => e.organizationId).filter(Boolean))] as string[];
    const jobIds = [...new Set(events.map((e) => e.jobId).filter(Boolean))] as string[];
    const projectIds = [...new Set(events.map((e) => e.projectId).filter(Boolean))] as string[];

    const [orgs, jobs, creditTxns, projectJobCounts] = await Promise.all([
      orgIds.length
        ? prisma.organization.findMany({
            where: { id: { in: orgIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      jobIds.length
        ? prisma.job.findMany({
            where: { id: { in: jobIds } },
            select: {
              id: true,
              targetLanguage: true,
              projectId: true,
              project: { select: { name: true } },
            },
          })
        : Promise.resolve([]),
      projectIds.length
        ? prisma.creditTransaction.findMany({
            where: {
              relatedProjectId: { in: projectIds },
              amount: { lt: 0 }, // negative = credits charged
              // Only translation-related charges. OCR handoffs and other
              // ledger items have their own kinds and shouldn't be attributed
              // to LLM translation jobs.
              breakdownJSON: { path: ["kind"], equals: "project_translation" },
            },
            select: {
              relatedProjectId: true,
              amount: true,
              breakdownJSON: true,
            },
          })
        : Promise.resolve([]),
      // Count ALL jobs per project (not just those on the current page) so
      // the per-job credit split is stable across pagination/filters.
      projectIds.length
        ? prisma.job.groupBy({
            by: ["projectId"],
            where: { projectId: { in: projectIds } },
            _count: { _all: true },
          })
        : Promise.resolve([] as { projectId: string; _count: { _all: number } }[]),
    ]);

    const orgMap = Object.fromEntries(orgs.map((o) => [o.id, o.name]));
    const jobMap = Object.fromEntries(
      jobs.map((j) => [
        j.id,
        {
          title: j.project?.name ?? "—",
          targetLanguage: j.targetLanguage,
          projectId: j.projectId,
        },
      ])
    );

    // Stable denominator: total job count per project, regardless of paging.
    const jobsPerProject: Record<string, number> = Object.fromEntries(
      projectJobCounts.map((g) => [g.projectId, g._count._all])
    );

    // Per-project total translation credits charged (sum across any
    // matching transactions for that project).
    const projectCreditTotal: Record<string, number> = {};
    for (const t of creditTxns) {
      if (!t.relatedProjectId) continue;
      projectCreditTotal[t.relatedProjectId] =
        (projectCreditTotal[t.relatedProjectId] ?? 0) + Math.abs(t.amount);
    }

    // Per-job credits = project total / total job count for that project.
    // One project_translation transaction covers all target languages, so we
    // divide evenly among ALL jobs in the project (stable across paging).
    function creditsForEvent(ev: typeof events[number]): number {
      if (!ev.jobId) return 0;
      const job = jobMap[ev.jobId];
      if (!job?.projectId) return 0;
      const projTotal = projectCreditTotal[job.projectId] ?? 0;
      if (projTotal === 0) return 0;
      const jobCount = jobsPerProject[job.projectId] || 1;
      return Math.round(projTotal / jobCount);
    }

    const enriched = events.map((e) => {
      const job = e.jobId ? jobMap[e.jobId] : null;
      return {
        ...e,
        organizationName: e.organizationId ? (orgMap[e.organizationId] ?? null) : null,
        jobTitle: job?.title ?? null,
        targetLanguage: job?.targetLanguage ?? null,
        creditsCharged: creditsForEvent(e),
      };
    });

    return NextResponse.json({
      events: enriched,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  }

  // ── Summary view: aggregate per model + billingMode ───────────────────────────
  const rawGroups = await prisma.llmUsageEvent.groupBy({
    by: ["modelId", "modelKey", "billingMode"],
    where: baseWhere,
    _sum: {
      promptTokens: true,
      completionTokens: true,
      totalTokens: true,
      callCount: true,
      costUsd: true,
    },
    _count: { id: true },
    _min: { createdAt: true },
    _max: { createdAt: true },
  });

  const modelIds = [...new Set(rawGroups.map((g) => g.modelId).filter(Boolean))] as string[];
  const models = modelIds.length
    ? await prisma.aiModel.findMany({
        where: { id: { in: modelIds } },
        select: {
          id: true,
          displayName: true,
          apiModelId: true,
          costPerInputTokenUsd: true,
          costPerOutputTokenUsd: true,
        },
      })
    : [];
  const modelMap = Object.fromEntries(models.map((m) => [m.id, m]));

  const summary = rawGroups.map((g) => {
    const m = g.modelId ? modelMap[g.modelId] : null;
    const promptTokens = g._sum.promptTokens ?? 0;
    const completionTokens = g._sum.completionTokens ?? 0;
    const totalTokens = g._sum.totalTokens ?? 0;
    const callCount = g._sum.callCount ?? g._count.id;
    const eventCount = g._count.id;
    const isBYOK = g.billingMode === "BYOK";

    // BYOK never has internal cost. Backfill only when stored aggregate
    // is null (pre-pricing rows); a real stored 0 is preserved.
    let estimatedCostUsd: number | null = null;
    if (!isBYOK) {
      if (g._sum.costUsd != null) {
        estimatedCostUsd = Number(g._sum.costUsd);
      } else if (m?.costPerInputTokenUsd != null && m?.costPerOutputTokenUsd != null) {
        estimatedCostUsd =
          promptTokens * Number(m.costPerInputTokenUsd) +
          completionTokens * Number(m.costPerOutputTokenUsd);
      }
    }

    return {
      modelId: g.modelId,
      modelKey: g.modelKey,
      billingMode: g.billingMode,
      displayName: m?.displayName ?? g.modelKey ?? "Unknown",
      apiModelId: m?.apiModelId ?? g.modelKey ?? "—",
      callCount,
      eventCount,
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCostUsd,
      firstSeen: g._min.createdAt,
      lastSeen: g._max.createdAt,
    };
  });

  const totals = summary.reduce(
    (acc, s) => ({
      callCount: acc.callCount + s.callCount,
      eventCount: acc.eventCount + s.eventCount,
      promptTokens: acc.promptTokens + s.promptTokens,
      completionTokens: acc.completionTokens + s.completionTokens,
      totalTokens: acc.totalTokens + s.totalTokens,
      estimatedCostUsd: acc.estimatedCostUsd + (s.estimatedCostUsd ?? 0),
    }),
    {
      callCount: 0,
      eventCount: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
    }
  );

  const availableModels = models.map((m) => ({
    id: m.id,
    displayName: m.displayName,
    apiModelId: m.apiModelId,
  }));

  // Distinct kind values observed in the time window for the filter dropdown.
  const kindRows = await prisma.llmUsageEvent.findMany({
    where: { createdAt: { gte: since, lt: until } },
    select: { kind: true },
    distinct: ["kind"],
    orderBy: { kind: "asc" },
  });
  const availableKinds = kindRows
    .map((r) => r.kind)
    .filter((k): k is string => typeof k === "string" && k.length > 0);

  return NextResponse.json({
    summary,
    totals,
    range: rangeLabel,
    since,
    until,
    availableModels,
    availableKinds,
  });
}
