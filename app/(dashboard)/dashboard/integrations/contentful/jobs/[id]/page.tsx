"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, ExternalLink, Send, RefreshCw, CheckCircle, XCircle, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type JobLocale = {
  id: string;
  targetLocale: string;
  status: string;
  deliveredAt: string | null;
  error: string | null;
};

type ContentfulJob = {
  id: string;
  entryId: string;
  entryTitle: string | null;
  contentTypeId: string;
  spaceId: string;
  environmentId: string;
  sourceLocale: string;
  wordCount: number;
  workflowType: string;
  status: string;
  selectedFields: string[];
  createdAt: string;
  locales: JobLocale[];
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  QUEUED:      { label: "Queued",       color: "#516F90", bg: "#F5F8FA" },
  TRANSLATING: { label: "Translating",  color: "#0091AE", bg: "#E8F5F8" },
  READY:       { label: "Ready",        color: "#00BDA5", bg: "#E6FAF8" },
  DELIVERED:   { label: "Delivered",    color: "#00BDA5", bg: "#E6FAF8" },
  FAILED:      { label: "Failed",       color: "#EF4444", bg: "#FEF2F2" },
  REVIEW:      { label: "In Review",    color: "#FF7A59", bg: "#FFF3F0" },
  OUT_OF_DATE: { label: "Out of Date",  color: "#F59E0B", bg: "#FFFBEB" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "#516F90", bg: "#F5F8FA" };
  return (
    <span
      className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}

export default function ContentfulJobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<ContentfulJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [pushing, setPushing] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/integrations/contentful/jobs/${id}`);
    if (res.ok) setJob(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function runTranslation() {
    setTranslating(true);
    await fetch(`/api/integrations/contentful/jobs/${id}/translate`, { method: "POST" });
    await load();
    setTranslating(false);
  }

  async function pushLocale(localeId: string) {
    setPushing(localeId);
    await fetch(`/api/integrations/contentful/jobs/${id}/push`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ localeIds: [localeId] }),
    });
    await load();
    setPushing(null);
  }

  async function pushAll() {
    setPushing("all");
    await fetch(`/api/integrations/contentful/jobs/${id}/push`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await load();
    setPushing(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#0091AE" }} />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-8 text-center">
        <p style={{ color: "#516F90" }}>Job not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const contentfulUrl = `https://app.contentful.com/spaces/${job.spaceId}/environments/${job.environmentId}/entries/${job.entryId}`;
  const readyLocales = job.locales.filter((l) => l.status === "READY");

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Back */}
      <Link href="/dashboard/integrations/contentful?tab=jobs" className="inline-flex items-center gap-1.5 text-sm mb-6 hover:underline" style={{ color: "#0091AE" }}>
        <ArrowLeft className="w-4 h-4" /> Back to Jobs
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold" style={{ color: "#33475B" }}>
              {job.entryTitle ?? job.entryId}
            </h1>
            <StatusBadge status={job.status} />
          </div>
          <p className="text-sm" style={{ color: "#99ACC2" }}>
            Entry ID: <code className="font-mono text-xs">{job.entryId}</code>
            &nbsp;·&nbsp;{job.contentTypeId}
            &nbsp;·&nbsp;{job.wordCount} words
          </p>
        </div>
        <a href={contentfulUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ExternalLink className="w-3.5 h-3.5" /> Open in Contentful
          </Button>
        </a>
      </div>

      {/* Job metadata */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Source Locale", value: job.sourceLocale },
          { label: "Workflow", value: job.workflowType.replace("_", " + ") },
          { label: "Fields", value: (job.selectedFields as string[]).join(", ") || "—" },
          { label: "Created", value: new Date(job.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-[#CBD6E2] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#99ACC2" }}>{label}</p>
            <p className="text-sm font-medium truncate" style={{ color: "#33475B" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mb-6">
        {["QUEUED", "OUT_OF_DATE"].includes(job.status) && (
          <Button
            data-testid="btn-run-translation"
            onClick={runTranslation}
            disabled={translating}
            style={{ background: "#0091AE" }}
            className="gap-2"
          >
            {translating
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Translating…</>
              : <><Zap className="w-4 h-4" /> Run AI Translation</>
            }
          </Button>
        )}
        {readyLocales.length > 0 && (
          <Button
            data-testid="btn-push-all"
            onClick={pushAll}
            disabled={pushing === "all"}
            style={{ background: "#FF7A59" }}
            className="gap-2"
          >
            {pushing === "all"
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Pushing…</>
              : <><Send className="w-4 h-4" /> Push All to Contentful</>
            }
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5 ml-auto">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Locales table */}
      <div className="bg-white rounded-2xl border border-[#CBD6E2] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#F5F8FA]" style={{ background: "#F5F8FA" }}>
          <h2 className="text-sm font-semibold" style={{ color: "#33475B" }}>Target Locales</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#F5F8FA]">
              <th className="text-left px-5 py-3 text-xs font-semibold" style={{ color: "#516F90" }}>Locale</th>
              <th className="text-left px-5 py-3 text-xs font-semibold" style={{ color: "#516F90" }}>Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold" style={{ color: "#516F90" }}>Delivered</th>
              <th className="text-left px-5 py-3 text-xs font-semibold" style={{ color: "#516F90" }}>Error</th>
              <th className="px-5 py-3 w-32" />
            </tr>
          </thead>
          <tbody>
            {job.locales.map((locale) => (
              <tr key={locale.id} className="border-t border-[#F5F8FA] hover:bg-[#F5F8FA]" data-testid={`locale-row-${locale.id}`}>
                <td className="px-5 py-3 font-mono font-medium" style={{ color: "#33475B" }}>{locale.targetLocale}</td>
                <td className="px-5 py-3"><StatusBadge status={locale.status} /></td>
                <td className="px-5 py-3 text-xs" style={{ color: "#99ACC2" }}>
                  {locale.deliveredAt
                    ? new Date(locale.deliveredAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                    : "—"}
                </td>
                <td className="px-5 py-3 text-xs text-red-500 max-w-xs truncate">
                  {locale.error ?? "—"}
                </td>
                <td className="px-5 py-3 text-right">
                  {locale.status === "READY" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs h-7"
                      data-testid={`btn-push-locale-${locale.id}`}
                      onClick={() => pushLocale(locale.id)}
                      disabled={pushing === locale.id}
                    >
                      {pushing === locale.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Send className="w-3 h-3" />
                      }
                      Push
                    </Button>
                  )}
                  {locale.status === "DELIVERED" && (
                    <CheckCircle className="w-4 h-4 ml-auto text-teal-500" />
                  )}
                  {locale.status === "FAILED" && (
                    <XCircle className="w-4 h-4 ml-auto text-red-400" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
