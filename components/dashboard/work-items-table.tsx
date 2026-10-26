"use client";

import { useState, useRef, useEffect } from "react";
import {
  Globe,
  Zap,
  UserCheck,
  Download,
  Loader2,
  Star,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Flag,
  UserPlus,
  UserMinus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type WorkItemJob = {
  id: string;
  sourceLanguage: string;
  targetLanguage: string;
  wordCount: number;
  status: string;
  linguistId: string | null;
  linguistName: string | null;
  linguistEmail: string | null;
  existingReview: { rating: number; comment: string | null } | null;
  isBlacklisted: boolean;
  isFavorited: boolean;
  auditReportUrl: string | null;
  hasLayout?: boolean;
};

export type WorkItemDoc = {
  id: string;
  originalFilename: string;
  translatedFileUrl: string | null;
  fileType: string;
};

const jobStatusColors: Record<string, string> = {
  AVAILABLE: "bg-teal-50 text-teal-700",
  EXCLUSIVE: "bg-amber-50 text-amber-700",
  ACCEPTED: "bg-blue-50 text-blue-700",
  IN_PROGRESS: "bg-purple-50 text-purple-700",
  COMPLETED: "bg-green-50 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

const workflowLabel: Record<string, string> = {
  AI_HUMAN: "AI + Human Review",
  HUMAN_ONLY: "Human Only",
  BYOK: "AI (BYOK)",
  CREDITS: "AI (Credits)",
};

function StarRating({
  value,
  onChange,
  readonly,
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => !readonly && setHovered(n)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={cn(
            "transition-transform",
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
          )}
          data-testid={`star-${n}`}
        >
          <Star
            className={cn(
              "w-4 h-4",
              (hovered || value) >= n
                ? "fill-amber-400 text-amber-400"
                : "fill-transparent text-gray-300"
            )}
          />
        </button>
      ))}
    </div>
  );
}

function JobRow({
  job,
  docs,
  workflowType,
}: {
  job: WorkItemJob;
  docs: WorkItemDoc[];
  workflowType: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [rating, setRating] = useState(job.existingReview?.rating ?? 0);
  const [comment, setComment] = useState(job.existingReview?.comment ?? "");
  const [submitted, setSubmitted] = useState(!!job.existingReview);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [favorited, setFavorited] = useState(job.isFavorited);
  const [blacklisted, setBlacklisted] = useState(job.isBlacklisted);
  const [actionPending, setActionPending] = useState(false);

  const isComplete = job.status === "COMPLETED";
  const hasLinguist = !!job.linguistId;

  const sourceFileType = docs[0]?.fileType ?? "pdf";
  const defaultFormat =
    sourceFileType === "pptx" ? "pptx" :
    sourceFileType === "docx" ? "docx" :
    "pdf";

  const altFormats = defaultFormat === "pptx"
    ? ([] as string[])
    : defaultFormat === "docx"
      ? ["pdf"]
      : ["docx"];

  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  async function handleDownload(format = defaultFormat) {
    setGenerating(format);
    setDownloadError("");
    try {
      const res = await fetch(`/api/jobs/${job.id}/deliver?format=${format}`);
      if (!res.ok) {
        let msg = "Download failed. Please try again.";
        try { const d = await res.json(); msg = d.error ?? msg; } catch { /* ignore */ }
        setDownloadError(msg);
        return;
      }

      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = cd.match(/filename="([^"]+)"/);
      const langSlug = job.targetLanguage.replace(/\s+/g, "_");
      const fallbackExt = format === "docx" ? "docx" : format === "pptx" ? "pptx" : "pdf";
      const filename = match?.[1] ?? `translation_${langSlug}.${fallbackExt}`;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError("Download failed. Please check your connection and try again.");
    } finally {
      setGenerating(null);
    }
  }

  async function submitReview() {
    if (!rating) { setError("Please select a rating."); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/jobs/${job.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Could not submit review.");
      } else {
        setSubmitted(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleFavorite() {
    if (!job.linguistId) return;
    setActionPending(true);
    const res = await fetch(`/api/linguists/${job.linguistId}/favorite`, { method: "POST" });
    if (res.ok) {
      const d = await res.json();
      setFavorited(d.favorited ?? !favorited);
      if (d.favorited) setBlacklisted(false);
    }
    setActionPending(false);
  }

  async function toggleBlacklist() {
    if (!job.linguistId) return;
    setActionPending(true);
    const res = await fetch(`/api/linguists/${job.linguistId}/blacklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: comment }),
    });
    if (res.ok) {
      const d = await res.json();
      setBlacklisted(d.blacklisted ?? !blacklisted);
      if (d.blacklisted) setFavorited(false);
    }
    setActionPending(false);
  }

  return (
    <>
      {/* Main task row */}
      <tr
        className={cn(
          "hover:bg-gray-50 transition-colors",
          expanded && "bg-gray-50"
        )}
        data-testid={`job-row-${job.id}`}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 shrink-0" style={{ color: "#0091AE" }} />
            <div>
              <p className="font-semibold" style={{ color: "#33475B" }}>
                {job.sourceLanguage} → {job.targetLanguage}
              </p>
              <p className="text-[11px]" style={{ color: "#99ACC2" }}>
                Task ID: {job.id.slice(-6).toUpperCase()}
              </p>
            </div>
          </div>
        </td>

        <td className="px-4 py-3 font-medium" style={{ color: "#516F90" }}>
          {job.wordCount.toLocaleString()}
        </td>

        <td className="px-4 py-3">
          <span className="flex items-center gap-1 text-xs" style={{ color: "#516F90" }}>
            <Zap className="w-3.5 h-3.5" style={{ color: "#FF7A59" }} />
            {workflowLabel[workflowType] ?? workflowType}
          </span>
        </td>

        <td className="px-4 py-3">
          {hasLinguist ? (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: "#516F90" }}>
              <UserCheck className="w-3.5 h-3.5 shrink-0" style={{ color: "#00BDA5" }} />
              {job.linguistName ?? job.linguistEmail}
            </span>
          ) : (
            <span className="text-xs" style={{ color: "#99ACC2" }}>Unassigned</span>
          )}
        </td>

        <td className="px-4 py-3">
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${jobStatusColors[job.status] ?? "bg-gray-100 text-gray-500"}`}>
            {job.status.replace(/_/g, " ")}
          </span>
        </td>

        {/* Actions */}
        <td className="px-4 py-3">
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2 justify-end">
            {isComplete && (
              <>
                {/* Split download button — primary = original format, chevron = alternate formats */}
                <div className="relative flex rounded-lg overflow-visible" ref={dropdownRef} data-testid={`download-group-${job.id}`}>
                  {/* Primary action: original format */}
                  <button
                    onClick={() => handleDownload(defaultFormat)}
                    disabled={!!generating}
                    data-testid={`btn-download-${job.id}`}
                    className="flex items-center gap-1.5 text-xs font-semibold pl-3 pr-2.5 py-1.5 text-white transition-opacity hover:opacity-90 disabled:opacity-60 rounded-l-lg"
                    style={{ background: "#0091AE" }}
                  >
                    {generating === defaultFormat ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    {generating === defaultFormat ? "…" : defaultFormat.toUpperCase()}
                  </button>

                  {/* Divider + chevron — only shown if there are alternate formats */}
                  {altFormats.length > 0 && (
                    <button
                      onClick={() => setDropdownOpen((o) => !o)}
                      disabled={!!generating}
                      data-testid={`btn-download-chevron-${job.id}`}
                      title="More download formats"
                      className="flex items-center justify-center w-7 py-1.5 text-white transition-opacity hover:opacity-90 disabled:opacity-60 rounded-r-lg border-l border-white/30"
                      style={{ background: "#0091AE" }}
                    >
                      <ChevronDown className={cn("w-3 h-3 transition-transform", dropdownOpen && "rotate-180")} />
                    </button>
                  )}

                  {/* Dropdown menu */}
                  {dropdownOpen && altFormats.length > 0 && (
                    <div
                      className="absolute right-0 top-full mt-1 z-50 min-w-[140px] bg-white rounded-xl shadow-lg border border-gray-100 py-1 overflow-hidden"
                      style={{ borderColor: "#CBD6E2" }}
                    >
                      {/* Current format (greyed out label) */}
                      <div className="px-3 py-1.5 flex items-center gap-2 opacity-50 cursor-default select-none">
                        <Download className="w-3 h-3" />
                        <span className="text-xs font-medium" style={{ color: "#516F90" }}>
                          {defaultFormat.toUpperCase()} <span className="text-[10px]">(original)</span>
                        </span>
                      </div>
                      {/* Alternate formats */}
                      {altFormats.map((fmt) => (
                        <button
                          key={fmt}
                          onClick={() => { setDropdownOpen(false); handleDownload(fmt); }}
                          disabled={!!generating}
                          data-testid={`btn-download-${fmt}-${job.id}`}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
                          style={{ color: "#33475B" }}
                        >
                          {generating === fmt ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Download className="w-3 h-3" />
                          )}
                          {fmt === "docx" ? "Word (.docx)" : fmt.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
            {isComplete && (
              <button
                onClick={() => setExpanded((e) => !e)}
                data-testid={`btn-expand-${job.id}`}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors hover:bg-gray-100"
                style={{ borderColor: "#CBD6E2", color: "#516F90" }}
              >
                {submitted ? (
                  <><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> Rated</>
                ) : (
                  <><Star className="w-3.5 h-3.5 text-gray-400" /> Rate</>
                )}
                {expanded
                  ? <ChevronUp className="w-3 h-3 ml-0.5" />
                  : <ChevronDown className="w-3 h-3 ml-0.5" />}
              </button>
            )}
            </div>
            {downloadError && (
              <p className="text-[11px] text-red-500 max-w-[220px] text-right leading-tight" data-testid={`download-error-${job.id}`}>
                {downloadError}
              </p>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded panel for rating + audit report */}
      {expanded && (
        <tr data-testid={`expand-panel-${job.id}`}>
          <td colSpan={6} className="px-4 pb-4 pt-0">
            <div
              className="rounded-xl border p-4 space-y-4"
              style={{ background: "#F5F8FA", borderColor: "#CBD6E2" }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Rating section */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#99ACC2" }}>
                    Rate this task
                  </p>
                  {submitted ? (
                    <div className="flex items-center gap-2">
                      <StarRating value={rating} readonly />
                      <span className="text-xs" style={{ color: "#516F90" }}>Review submitted</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <StarRating value={rating} onChange={setRating} />
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Leave a comment (optional)…"
                        rows={2}
                        className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 resize-none"
                        style={{ borderColor: "#CBD6E2" }}
                        data-testid={`review-comment-${job.id}`}
                      />
                      {error && <p className="text-xs text-red-500">{error}</p>}
                      <Button
                        size="sm"
                        onClick={submitReview}
                        disabled={submitting || !rating}
                        data-testid={`btn-submit-review-${job.id}`}
                        className="gap-1.5"
                      >
                        {submitting
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Submit Review
                      </Button>
                    </div>
                  )}
                </div>

                {/* Linguist management + audit report */}
                <div className="space-y-3">
                  {hasLinguist && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#99ACC2" }}>
                        Linguist
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={toggleFavorite}
                          disabled={actionPending}
                          data-testid={`btn-favorite-${job.id}`}
                          className={cn(
                            "flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors",
                            favorited
                              ? "bg-teal-50 border-teal-200 text-teal-700"
                              : "border-gray-200 text-gray-600 hover:bg-gray-50"
                          )}
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          {favorited ? "Preferred" : "Add to Preferred"}
                        </button>
                        <button
                          onClick={toggleBlacklist}
                          disabled={actionPending}
                          data-testid={`btn-blacklist-${job.id}`}
                          className={cn(
                            "flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors",
                            blacklisted
                              ? "bg-red-50 border-red-200 text-red-600"
                              : "border-red-100 text-red-500 hover:bg-red-50"
                          )}
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          {blacklisted ? "Blacklisted" : "Blacklist"}
                        </button>
                      </div>
                    </div>
                  )}

                  {job.auditReportUrl && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#99ACC2" }}>
                        Audit Report
                      </p>
                      <a
                        href={job.auditReportUrl}
                        target="_blank"
                        rel="noreferrer"
                        data-testid={`btn-audit-${job.id}`}
                        className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border transition-colors hover:bg-amber-50"
                        style={{ borderColor: "#F0C040", color: "#B07D00", background: "#FFFBEB" }}
                      >
                        <Flag className="w-3.5 h-3.5" />
                        View Linguist Audit Report
                      </a>
                    </div>
                  )}

                  {docs.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#99ACC2" }}>
                        Source Document
                      </p>
                      <div className="space-y-1">
                        {docs.map((doc) => (
                          <div key={doc.id} className="flex items-center gap-2 text-xs" style={{ color: "#516F90" }}>
                            <FileText className="w-3.5 h-3.5 shrink-0" style={{ color: "#0091AE" }} />
                            <span className="truncate">{doc.originalFilename}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function WorkItemsTable({
  jobs,
  docs,
  workflowType,
  docCount,
}: {
  jobs: WorkItemJob[];
  docs: WorkItemDoc[];
  workflowType: string;
  docCount: number;
}) {
  return (
    <section className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#CBD6E2" }}>
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#E8EEF4" }}>
        <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#99ACC2" }}>
          Work Items — {jobs.length} task{jobs.length !== 1 ? "s" : ""}
        </h2>
        <span className="text-[11px]" style={{ color: "#99ACC2" }}>
          {docCount} document{docCount !== 1 ? "s" : ""}
        </span>
      </div>

      {jobs.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm" style={{ color: "#99ACC2" }}>
            No tasks yet — tasks are created automatically when processing starts.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#F5F8FA" }}>
                {["Language task", "Words", "Workflow", "Assigned linguist", "Status", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: "#99ACC2" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "#E8EEF4" }}>
              {jobs.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  docs={docs}
                  workflowType={workflowType}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
