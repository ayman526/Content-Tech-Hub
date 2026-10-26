"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Cpu, TrendingUp, DollarSign, Zap, RefreshCw,
  ChevronLeft, ChevronRight, BarChart2, Info,
  AlertTriangle, Calendar, Filter, Coins, Briefcase,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ModelSummary {
  modelId: string | null;
  modelKey: string | null;
  billingMode: string;
  displayName: string;
  apiModelId: string;
  callCount: number;
  eventCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number | null;
  firstSeen: string | null;
  lastSeen: string | null;
}

interface SummaryResponse {
  summary: ModelSummary[];
  totals: {
    callCount: number;
    eventCount: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
  };
  range: string;
  since: string;
  until: string;
  availableModels: { id: string; displayName: string; apiModelId: string }[];
  availableKinds: string[];
}

interface UsageEvent {
  id: string;
  createdAt: string;
  organizationId: string | null;
  organizationName: string | null;
  projectId: string | null;
  jobId: string | null;
  jobTitle: string | null;
  targetLanguage: string | null;
  modelKey: string | null;
  billingMode: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  callCount: number;
  costUsd: string | null;
  creditsCharged: number;
  kind: string;
  model: { displayName: string; apiModelId: string } | null;
}

interface EventsResponse {
  events: UsageEvent[];
  total: number;
  page: number;
  pages: number;
}

interface JobUsageRow {
  jobId: string | null;
  jobTitle: string;
  jobCreatedAt: string | null;
  sourceLanguage: string | null;
  targetLanguage: string | null;
  status: string | null;
  organizationId: string | null;
  organizationName: string | null;
  modelId: string | null;
  modelName: string | null;
  modelProvider: string | null;
  billingMode: string;
  callCount: number;
  eventCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number | null;
  creditsCharged: number;
  firstActivityAt: string | null;
  lastActivityAt: string | null;
}

interface JobsResponse {
  jobs: JobUsageRow[];
  total: number;
  page: number;
  pages: number;
}

interface TimeseriesPoint {
  date: string;
  modelId: string | null;
  modelKey: string | null;
  displayName: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number | null;
  callCount: number;
}

interface TimeseriesResponse {
  timeseries: TimeseriesPoint[];
  since: string;
  until: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtCost(usd: number | null): string {
  if (usd == null) return "—";
  if (usd === 0) return "$0.00";
  if (usd < 0.0001) return "<$0.0001";
  if (usd < 1) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateTime(s: string): string {
  return new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(n: number): string {
  return new Date(Date.now() - n * 86400_000).toISOString().slice(0, 10);
}

function Spinner() {
  return <div className="w-5 h-5 border-2 border-gray-300 border-t-[#0091AE] rounded-full animate-spin" />;
}

function StatCard({ icon: Icon, label, value, sub, color = "#0091AE" }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-[#33475B] mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const MODEL_PALETTE = [
  "#0091AE",
  "#FF7A59",
  "#00BDA5",
  "#F5A623",
  "#6B7ED6",
  "#E87FA0",
  "#84C897",
  "#B87333",
];

const BILLING_COLORS: Record<string, string> = {
  CREDITS: "bg-[#0091AE]/10 text-[#0091AE]",
  AI_HUMAN: "bg-emerald-100 text-emerald-700",
  BYOK: "bg-purple-100 text-purple-700",
  HUMAN_ONLY: "bg-gray-100 text-gray-500",
};

function BillingBadge({ mode }: { mode: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${BILLING_COLORS[mode] ?? "bg-gray-100 text-gray-500"}`}>
      {mode}
    </span>
  );
}

const selectCls = "rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0091AE]/30 focus:border-[#0091AE]";
const dateCls = "rounded-lg border border-gray-200 px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0091AE]/30 focus:border-[#0091AE]";

// ─── Cost/Token Trend Chart ───────────────────────────────────────────────────

type ChartMetric = "cost" | "tokens";

function LlmCostChart({
  rangeParams,
  modelId,
  billingMode,
  includeBYOK,
  kindFilter,
}: {
  rangeParams: Record<string, string>;
  modelId: string;
  billingMode: string;
  includeBYOK: boolean;
  kindFilter: string;
}) {
  const [metric, setMetric] = useState<ChartMetric>("cost");

  const params = new URLSearchParams({
    view: "timeseries",
    includeBYOK: String(includeBYOK),
    ...rangeParams,
    ...(modelId ? { modelId } : {}),
    ...(billingMode ? { billingMode } : {}),
    ...(kindFilter ? { kind: kindFilter } : {}),
  });

  const { data, isLoading } = useQuery<TimeseriesResponse>({
    queryKey: ["/api/admin/llm-usage", "timeseries", rangeParams, modelId, billingMode, includeBYOK, kindFilter],
    queryFn: () => fetch(`/api/admin/llm-usage?${params.toString()}`).then((r) => r.json()),
  });

  const { chartData, modelKeys, modelColors, modelNames, safeGradientId } = useMemo(() => {
    if (!data?.timeseries?.length) {
      return { chartData: [], modelKeys: [], modelColors: {}, modelNames: {}, safeGradientId: (_k: string) => "" };
    }

    const points = data.timeseries;

    const uniqueModels = Array.from(
      new Map(
        points.map((p) => {
          const key = p.modelId ?? p.modelKey ?? p.displayName;
          return [key, { key, displayName: p.displayName }];
        })
      ).values()
    );

    const colorMap: Record<string, string> = Object.fromEntries(
      uniqueModels.map(({ key }, i) => [key, MODEL_PALETTE[i % MODEL_PALETTE.length]])
    );

    const nameMap: Record<string, string> = Object.fromEntries(
      uniqueModels.map(({ key, displayName }) => [key, displayName])
    );

    function safeGradientId(key: string) {
      return key.replace(/[^a-zA-Z0-9]/g, "_");
    }

    const dateMap: Record<string, Record<string, number>> = {};
    for (const p of points) {
      const key = p.modelId ?? p.modelKey ?? p.displayName;
      if (!dateMap[p.date]) dateMap[p.date] = {};
      const val = metric === "cost" ? (p.costUsd ?? 0) : p.totalTokens;
      dateMap[p.date][key] = (dateMap[p.date][key] ?? 0) + val;
    }

    const sorted = Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => {
        const label = new Date(date + "T00:00:00Z").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        });
        return { date: label, ...vals };
      });

    return {
      chartData: sorted,
      modelKeys: uniqueModels.map(({ key }) => key),
      modelColors: colorMap,
      modelNames: nameMap,
      safeGradientId,
    };
  }, [data, metric]);

  const isEmpty = !isLoading && chartData.length === 0;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6" data-testid="llm-cost-chart">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-[#33475B]">Daily Trend by Model</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {metric === "cost" ? "Estimated USD cost per day" : "Total tokens per day"} · each model a separate line
          </p>
        </div>
        <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setMetric("cost")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${metric === "cost" ? "bg-[#0091AE] text-white" : "text-gray-500 hover:bg-gray-50"}`}
            data-testid="llm-chart-metric-cost"
          >
            Cost
          </button>
          <button
            onClick={() => setMetric("tokens")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${metric === "tokens" ? "bg-[#0091AE] text-white" : "text-gray-500 hover:bg-gray-50"}`}
            data-testid="llm-chart-metric-tokens"
          >
            Tokens
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <Spinner />
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mb-2">
            <BarChart2 className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-xs text-gray-500">No data to chart for this period</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              {modelKeys.map((key) => (
                <linearGradient key={key} id={`grad-${safeGradientId(key)}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={modelColors[key]} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={modelColors[key]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) =>
                metric === "cost"
                  ? v === 0 ? "$0" : v < 0.01 ? `$${v.toFixed(4)}` : `$${v.toFixed(2)}`
                  : v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : String(v)
              }
              width={62}
            />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
              formatter={(value: number, name: string) =>
                metric === "cost"
                  ? [`$${value.toFixed(4)}`, name]
                  : [value.toLocaleString(), name]
              }
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              iconType="circle"
              iconSize={8}
            />
            {modelKeys.map((key) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                name={modelNames[key] ?? key}
                stroke={modelColors[key]}
                strokeWidth={2}
                fill={`url(#grad-${safeGradientId(key)})`}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Summary Card ────────────────────────────────────────────────────────────

function ModelSummaryCard({ m }: { m: ModelSummary }) {
  const inputPct = m.totalTokens > 0 ? Math.round((m.promptTokens / m.totalTokens) * 100) : 0;
  const outputPct = 100 - inputPct;
  const isBYOK = m.billingMode === "BYOK";

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5" data-testid={`llm-model-card-${m.modelKey ?? m.modelId}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#33475B]/10 rounded-xl flex items-center justify-center">
            <Cpu className="w-4 h-4 text-[#33475B]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#33475B]">{m.displayName}</p>
            <p className="text-[10px] text-gray-400 font-mono">{m.apiModelId}</p>
          </div>
        </div>
        <BillingBadge mode={m.billingMode} />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <p className="text-xs text-gray-400">API Calls</p>
          <p className="text-base font-bold text-[#33475B]">{m.callCount.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">Total Tokens</p>
          <p className="text-base font-bold text-[#33475B]">{fmtTokens(m.totalTokens)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">Est. Cost</p>
          <p className="text-base font-bold text-[#33475B]">
            {isBYOK ? <span className="text-purple-500 text-xs">BYOK</span> : fmtCost(m.estimatedCostUsd)}
          </p>
          {isBYOK && (
            <p className="text-[9px] text-purple-500 mt-0.5">org pays directly</p>
          )}
        </div>
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-[10px] text-gray-400 mb-1">
          <span>Input: {fmtTokens(m.promptTokens)} ({inputPct}%)</span>
          <span>Output: {fmtTokens(m.completionTokens)} ({outputPct}%)</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden flex">
          <div className="h-full rounded-l-full" style={{ width: `${inputPct}%`, background: "#0091AE" }} />
          <div className="h-full rounded-r-full flex-1" style={{ background: "#FF7A59" }} />
        </div>
      </div>

      {m.lastSeen && (
        <p className="text-[10px] text-gray-400 mt-2">Last used: {fmtDate(m.lastSeen)}</p>
      )}
    </div>
  );
}

// ─── Per-Job Aggregated Table (primary view) ─────────────────────────────────

function JobsTable({ rangeParams, modelId, billingMode, includeBYOK, kindFilter, onDrillDown }: {
  rangeParams: Record<string, string>;
  modelId: string;
  billingMode: string;
  includeBYOK: boolean;
  kindFilter: string;
  onDrillDown: (jobId: string) => void;
}) {
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({
    view: "jobs",
    page: String(page),
    includeBYOK: String(includeBYOK),
    ...rangeParams,
    ...(modelId ? { modelId } : {}),
    ...(billingMode ? { billingMode } : {}),
    ...(kindFilter ? { kind: kindFilter } : {}),
  });

  const { data, isLoading } = useQuery<JobsResponse>({
    queryKey: ["/api/admin/llm-usage", "jobs", rangeParams, page, modelId, billingMode, includeBYOK, kindFilter],
    queryFn: () => fetch(`/api/admin/llm-usage?${params.toString()}`).then(r => r.json()),
  });

  if (isLoading) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (!data || data.jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
          <Briefcase className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-500">No jobs with AI usage in this period</p>
        <p className="text-xs text-gray-400 mt-1">One row per job · BYOK excluded by default</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {[
                "Created",
                "Last activity",
                "Job",
                "Organization",
                "Model",
                "Mode",
                "Calls",
                "Total tokens",
                "Input / Output",
                "Credits charged",
                "Est. Cost",
                "",
              ].map((h, idx) => (
                <th
                  key={`${h}-${idx}`}
                  className="text-left py-2.5 px-3 text-[11px] font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.jobs.map(j => (
              <tr key={j.jobId ?? Math.random()} className="border-b border-gray-50 hover:bg-gray-50/50" data-testid={`llm-job-row-${j.jobId}`}>
                <td className="py-2.5 px-3 text-[11px] text-gray-500 whitespace-nowrap" data-testid={`llm-job-created-${j.jobId}`}>
                  {j.jobCreatedAt ? fmtDateTime(j.jobCreatedAt) : "—"}
                </td>
                <td className="py-2.5 px-3 text-[11px] text-gray-500 whitespace-nowrap">
                  {j.lastActivityAt ? fmtDateTime(j.lastActivityAt) : "—"}
                </td>
                <td className="py-2.5 px-3 max-w-[220px]">
                  <p className="text-xs font-medium text-[#33475B] truncate" title={j.jobTitle}>{j.jobTitle}</p>
                  <p className="text-[10px] text-gray-400">
                    {j.sourceLanguage ?? "?"} → {j.targetLanguage ?? "?"} · {j.jobId ? j.jobId.slice(-6) : "—"}
                  </p>
                </td>
                <td className="py-2.5 px-3 text-[11px] text-gray-600 max-w-[140px] truncate" title={j.organizationName ?? j.organizationId ?? ""}>
                  {j.organizationName ?? (j.organizationId ? j.organizationId.slice(0, 8) + "…" : "—")}
                </td>
                <td className="py-2.5 px-3 text-[11px] text-gray-600 max-w-[140px] truncate" title={j.modelName ?? ""} data-testid={`llm-job-model-${j.jobId}`}>
                  {j.modelName ? (
                    <>
                      <span className="font-medium text-[#33475B]">{j.modelName}</span>
                      {j.modelProvider && <span className="text-gray-400"> · {j.modelProvider}</span>}
                    </>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="py-2.5 px-3"><BillingBadge mode={j.billingMode} /></td>
                <td className="py-2.5 px-3 text-xs font-medium text-[#33475B]">{j.callCount.toLocaleString()}</td>
                <td className="py-2.5 px-3 text-xs font-medium text-[#33475B]">{j.totalTokens.toLocaleString()}</td>
                <td className="py-2.5 px-3 text-[11px] text-gray-600 whitespace-nowrap">
                  {j.promptTokens.toLocaleString()} / {j.completionTokens.toLocaleString()}
                </td>
                <td className="py-2.5 px-3 text-xs text-gray-600">
                  {j.creditsCharged > 0
                    ? <span className="inline-flex items-center gap-1"><Coins className="w-3 h-3 text-amber-500" />{j.creditsCharged.toLocaleString()}</span>
                    : <span className="text-gray-400">—</span>}
                </td>
                <td className="py-2.5 px-3 text-xs font-medium text-[#33475B]">
                  {j.billingMode === "BYOK"
                    ? <span className="text-purple-500 text-[10px]">BYOK</span>
                    : fmtCost(j.costUsd)}
                </td>
                <td className="py-2.5 px-3">
                  {j.jobId && (
                    <button
                      onClick={() => onDrillDown(j.jobId!)}
                      className="text-[11px] text-[#0091AE] hover:underline whitespace-nowrap"
                      data-testid={`llm-job-drilldown-${j.jobId}`}
                    >
                      {j.eventCount} calls →
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.pages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-gray-400">{data.total} jobs · page {data.page} of {data.pages}</p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 disabled:opacity-40"
              data-testid="llm-jobs-prev"
            ><ChevronLeft className="w-3.5 h-3.5" /></button>
            <button
              onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 disabled:opacity-40"
              data-testid="llm-jobs-next"
            ><ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Events Table ─────────────────────────────────────────────────────────────

function EventsTable({ rangeParams, modelId, billingMode, includeBYOK, kindFilter, jobId }: {
  rangeParams: Record<string, string>;
  modelId: string;
  billingMode: string;
  includeBYOK: boolean;
  kindFilter: string;
  jobId?: string;
}) {
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({
    view: "events",
    page: String(page),
    includeBYOK: String(includeBYOK),
    ...rangeParams,
    ...(modelId ? { modelId } : {}),
    ...(billingMode ? { billingMode } : {}),
    ...(kindFilter ? { kind: kindFilter } : {}),
    ...(jobId ? { jobId } : {}),
  });

  const { data, isLoading } = useQuery<EventsResponse>({
    queryKey: ["/api/admin/llm-usage", "events", rangeParams, page, modelId, billingMode, includeBYOK, kindFilter, jobId],
    queryFn: () => fetch(`/api/admin/llm-usage?${params.toString()}`).then(r => r.json()),
  });

  if (isLoading) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (!data || data.events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
          <BarChart2 className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-500">No usage events in this period</p>
        <p className="text-xs text-gray-400 mt-1">Each translated segment creates one row here</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {[
                "Created",
                "Job",
                "Organization",
                "Model",
                "Mode",
                "Kind",
                "Total tokens",
                "Input / Output",
                "Credits charged",
                "Est. Cost",
              ].map(h => (
                <th key={h} className="text-left py-2.5 px-3 text-[11px] font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.events.map(ev => (
              <tr key={ev.id} className="border-b border-gray-50 hover:bg-gray-50/50" data-testid={`llm-event-row-${ev.id}`}>
                <td className="py-2.5 px-3 text-[11px] text-gray-500 whitespace-nowrap">{fmtDateTime(ev.createdAt)}</td>
                <td className="py-2.5 px-3 max-w-[180px]">
                  <p className="text-xs font-medium text-[#33475B] truncate" title={ev.jobTitle ?? ""}>
                    {ev.jobTitle ?? "—"}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    → {ev.targetLanguage ?? "?"} · {ev.jobId ? ev.jobId.slice(-6) : "—"}
                  </p>
                </td>
                <td className="py-2.5 px-3 text-[11px] text-gray-600 max-w-[120px] truncate" title={ev.organizationName ?? ev.organizationId ?? ""}>
                  {ev.organizationName ?? (ev.organizationId ? ev.organizationId.slice(0, 8) + "…" : "—")}
                </td>
                <td className="py-2.5 px-3">
                  <p className="text-xs font-medium text-[#33475B]">{ev.model?.displayName ?? ev.modelKey ?? "—"}</p>
                  <p className="text-[10px] text-gray-400 font-mono">{ev.model?.apiModelId ?? ev.modelKey ?? "—"}</p>
                </td>
                <td className="py-2.5 px-3"><BillingBadge mode={ev.billingMode} /></td>
                <td className="py-2.5 px-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600" data-testid={`llm-event-kind-${ev.id}`}>
                    {ev.kind ?? "—"}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-xs font-medium text-[#33475B]">{ev.totalTokens.toLocaleString()}</td>
                <td className="py-2.5 px-3 text-[11px] text-gray-600 whitespace-nowrap">
                  {ev.promptTokens.toLocaleString()} / {ev.completionTokens.toLocaleString()}
                </td>
                <td className="py-2.5 px-3 text-xs text-gray-600">
                  {ev.creditsCharged > 0
                    ? <span className="inline-flex items-center gap-1"><Coins className="w-3 h-3 text-amber-500" />{ev.creditsCharged.toLocaleString()}</span>
                    : <span className="text-gray-400">—</span>}
                </td>
                <td className="py-2.5 px-3 text-xs font-medium text-[#33475B]">
                  {ev.billingMode === "BYOK"
                    ? <span className="text-purple-500 text-[10px]">BYOK</span>
                    : (ev.costUsd != null ? fmtCost(Number(ev.costUsd)) : "—")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.pages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-gray-400">{data.total} total events · page {data.page} of {data.pages}</p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 disabled:opacity-40"
              data-testid="llm-events-prev"
            ><ChevronLeft className="w-3.5 h-3.5" /></button>
            <button
              onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 disabled:opacity-40"
              data-testid="llm-events-next"
            ><ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type DateMode = "7" | "30" | "90" | "custom";

export default function LlmUsagePage() {
  const [dateMode, setDateMode] = useState<DateMode>("30");
  const [customFrom, setCustomFrom] = useState<string>(daysAgoIso(30));
  const [customTo, setCustomTo] = useState<string>(todayIso());
  // "jobs" is the primary view (one row per job, what admins manage in billing).
  // "events" is the per-call drill-down. "summary" is the model breakdown.
  const [activeTab, setActiveTab] = useState<"jobs" | "summary" | "events">("jobs");
  const [drillDownJobId, setDrillDownJobId] = useState<string | null>(null);

  // Filters
  const [modelFilter, setModelFilter] = useState("");
  const [billingFilter, setBillingFilter] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  // BYOK excluded by default per spec — system-credit primary view
  const [includeBYOK, setIncludeBYOK] = useState(false);

  // Date params sent to the API: either {days} or {from,to}
  const rangeParams: Record<string, string> = useMemo(() => {
    if (dateMode === "custom") {
      return { from: customFrom, to: customTo };
    }
    return { days: dateMode };
  }, [dateMode, customFrom, customTo]);

  const params = new URLSearchParams({
    view: "summary",
    includeBYOK: String(includeBYOK),
    ...rangeParams,
    ...(modelFilter ? { modelId: modelFilter } : {}),
    ...(billingFilter ? { billingMode: billingFilter } : {}),
    ...(kindFilter ? { kind: kindFilter } : {}),
  });

  const { data, isLoading, refetch, isFetching } = useQuery<SummaryResponse>({
    queryKey: ["/api/admin/llm-usage", "summary", rangeParams, modelFilter, billingFilter, kindFilter, includeBYOK],
    queryFn: () => fetch(`/api/admin/llm-usage?${params.toString()}`).then(r => r.json()),
  });

  const totals = data?.totals;
  const hasCostData = (totals?.estimatedCostUsd ?? 0) > 0;
  const hasEvents = (totals?.callCount ?? 0) > 0;

  return (
    <div className="p-6 max-w-[1280px] mx-auto">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-[#33475B]">LLM Cost &amp; Token Usage</h1>
          <p className="text-sm text-gray-500 mt-0.5">Per-call instrumentation across all AI translation jobs (BYOK excluded by default)</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden">
            {(["7", "30", "90", "custom"] as DateMode[]).map(d => (
              <button
                key={d}
                onClick={() => setDateMode(d)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${dateMode === d ? "bg-[#0091AE] text-white" : "text-gray-500 hover:bg-gray-50"}`}
                data-testid={`llm-days-${d}`}
              >
                {d === "custom" ? "Custom" : `${d}d`}
              </button>
            ))}
          </div>
          {dateMode === "custom" && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className={dateCls}
                data-testid="llm-date-from"
              />
              <span className="text-xs text-gray-400">→</span>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className={dateCls}
                data-testid="llm-date-to"
              />
            </div>
          )}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            data-testid="llm-refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3 mb-5 p-3.5 bg-gray-50 border border-gray-200 rounded-xl">
        <Filter className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <select
          className={selectCls}
          value={modelFilter}
          onChange={e => setModelFilter(e.target.value)}
          data-testid="llm-filter-model"
        >
          <option value="">All models</option>
          {(data?.availableModels ?? []).map(m => (
            <option key={m.id} value={m.id}>{m.displayName}</option>
          ))}
        </select>
        <select
          className={selectCls}
          value={billingFilter}
          onChange={e => setBillingFilter(e.target.value)}
          data-testid="llm-filter-billing"
        >
          <option value="">All billing modes (excluding BYOK)</option>
          <option value="CREDITS">CREDITS (AI-only)</option>
          <option value="AI_HUMAN">AI_HUMAN (AI + Review)</option>
          <option value="BYOK">BYOK only</option>
        </select>
        <select
          className={selectCls}
          value={kindFilter}
          onChange={e => setKindFilter(e.target.value)}
          data-testid="llm-filter-kind"
        >
          <option value="">All call kinds</option>
          {(data?.availableKinds ?? []).map(k => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer" data-testid="llm-toggle-byok">
          <input
            type="checkbox"
            checked={includeBYOK}
            onChange={e => setIncludeBYOK(e.target.checked)}
            className="rounded"
          />
          Include BYOK in totals
        </label>
        {(modelFilter || billingFilter || kindFilter || includeBYOK) && (
          <button
            onClick={() => { setModelFilter(""); setBillingFilter(""); setKindFilter(""); setIncludeBYOK(false); }}
            className="text-xs text-[#0091AE] hover:underline"
            data-testid="llm-clear-filters"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Period note ── */}
      {data?.since && data?.until && (
        <div className="flex items-center gap-2 mb-5 text-xs text-gray-400">
          <Calendar className="w-3.5 h-3.5" />
          {fmtDate(data.since)} → {fmtDate(data.until)} ({data.range})
        </div>
      )}

      {/* ── KPI cards ── */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              icon={Zap}
              label="Total API Calls"
              value={totals?.callCount.toLocaleString() ?? "0"}
              sub="successful chat-completions"
            />
            <StatCard
              icon={TrendingUp}
              label="Total Tokens"
              value={fmtTokens(totals?.totalTokens ?? 0)}
              sub={`${fmtTokens(totals?.promptTokens ?? 0)} in · ${fmtTokens(totals?.completionTokens ?? 0)} out`}
              color="#33475B"
            />
            <StatCard
              icon={DollarSign}
              label="Estimated Cost"
              value={hasCostData ? fmtCost(totals?.estimatedCostUsd ?? 0) : "—"}
              sub={hasCostData ? "based on configured pricing" : "set pricing in AI Config → Models"}
              color={hasCostData ? "#FF7A59" : "#999"}
            />
            <StatCard
              icon={Cpu}
              label="Active Models"
              value={String(data?.summary.length ?? 0)}
              sub="models with usage in period"
              color="#0091AE"
            />
          </div>

          {!hasCostData && hasEvents && (
            <div className="flex items-start gap-2.5 mb-5 p-3.5 bg-yellow-50 border border-yellow-200 rounded-xl text-xs text-yellow-800">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <strong>No pricing configured.</strong> Cost estimates are unavailable. Go to{" "}
                <a href="/admin/ai-config" className="underline font-medium">AI Configuration → Model Catalog</a>{" "}
                and enter the cost per 1M tokens for each model to enable cost tracking.
              </div>
            </div>
          )}

          {!hasEvents && (
            <div className="flex items-start gap-2.5 mb-5 p-3.5 bg-[#0091AE]/5 border border-[#0091AE]/20 rounded-xl text-xs text-[#33475B]">
              <Info className="w-3.5 h-3.5 text-[#0091AE] flex-shrink-0 mt-0.5" />
              <div>
                No system-credit AI calls in this period. {!includeBYOK && "Tick \"Include BYOK in totals\" to also see organisations using their own keys."}
              </div>
            </div>
          )}

          {/* ── Daily Trend Chart ── */}
          <LlmCostChart
            rangeParams={rangeParams}
            modelId={modelFilter}
            billingMode={billingFilter}
            includeBYOK={includeBYOK}
            kindFilter={kindFilter}
          />

          {/* ── Tabs ── */}
          <div className="flex gap-1 mb-4 border-b border-gray-200">
            {([
              { id: "jobs" as const, label: "Per-Job Usage" },
              { id: "summary" as const, label: "Model Summary" },
              { id: "events" as const, label: "Per-Call Events" },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); if (tab.id !== "events") setDrillDownJobId(null); }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  activeTab === tab.id
                    ? "border-[#0091AE] text-[#0091AE]"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                data-testid={`llm-tab-${tab.id}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "jobs" && (
            <JobsTable
              rangeParams={rangeParams}
              modelId={modelFilter}
              billingMode={billingFilter}
              includeBYOK={includeBYOK}
              kindFilter={kindFilter}
              onDrillDown={(jobId) => { setDrillDownJobId(jobId); setActiveTab("events"); }}
            />
          )}

          {activeTab === "summary" && (
            data?.summary.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                  <BarChart2 className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-500">No model usage data yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {(data?.summary ?? []).map(m => (
                  <ModelSummaryCard key={`${m.modelKey}-${m.billingMode}`} m={m} />
                ))}
              </div>
            )
          )}

          {activeTab === "events" && (
            <>
              {drillDownJobId && (
                <div className="flex items-center gap-2 mb-3 p-2.5 bg-[#0091AE]/5 border border-[#0091AE]/20 rounded-lg text-xs">
                  <Filter className="w-3.5 h-3.5 text-[#0091AE]" />
                  <span className="text-gray-600">
                    Filtered to job <code className="font-mono text-[10px] text-[#33475B]">{drillDownJobId.slice(-12)}</code>
                  </span>
                  <button
                    onClick={() => setDrillDownJobId(null)}
                    className="ml-auto text-[#0091AE] hover:underline"
                    data-testid="llm-clear-drilldown"
                  >
                    Clear filter
                  </button>
                </div>
              )}
              <EventsTable
                rangeParams={rangeParams}
                modelId={modelFilter}
                billingMode={billingFilter}
                includeBYOK={includeBYOK}
                kindFilter={kindFilter}
                jobId={drillDownJobId ?? undefined}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
