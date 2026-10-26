"use client";

import { useState } from "react";
import {
  Download,
  Star,
  UserPlus,
  UserMinus,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileText,
  Flag,
  LayoutTemplate,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Doc = {
  id: string;
  originalFilename: string;
  translatedFileUrl: string | null;
  fileType: string;
};

type Job = {
  id: string;
  sourceLanguage: string;
  targetLanguage: string;
  status: string;
  linguistId: string | null;
  linguistName: string | null;
  linguistEmail: string | null;
  totalSegments: number;
  doneSegments: number;
  existingReview: { rating: number; comment: string | null } | null;
  isBlacklisted: boolean;
  isFavorited: boolean;
  auditReportUrl: string | null;
  hasLayout?: boolean;
};

type Props = {
  jobs: Job[];
  docs: Doc[];
};

const RTL_LANGS = ["arabic", "hebrew", "urdu", "farsi", "persian", "ar", "he", "ur", "fa"];
function isRtl(lang: string) {
  return RTL_LANGS.some((l) => lang.toLowerCase().includes(l));
}

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
            "transition-colors",
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
          )}
          data-testid={`star-${n}`}
        >
          <Star
            className={cn(
              "w-5 h-5",
              (hovered || value) >= n
                ? "fill-gold text-gold"
                : "fill-transparent text-gray-300"
            )}
          />
        </button>
      ))}
    </div>
  );
}

type DownloadFormat = "auto" | "pdf" | "docx" | "layout" | "pptx";

const LANG_CODE_MAP: Record<string, string> = {
  arabic:"AR", french:"FR", german:"DE", spanish:"ES", japanese:"JA",
  chinese:"ZH", mandarin:"ZH", portuguese:"PT", italian:"IT", russian:"RU",
  korean:"KO", dutch:"NL", turkish:"TR", polish:"PL", swedish:"SV",
  danish:"DA", norwegian:"NO", hebrew:"HE", persian:"FA", farsi:"FA",
  urdu:"UR", hindi:"HI", bengali:"BN", thai:"TH", vietnamese:"VI",
  indonesian:"ID", malay:"MS", greek:"EL", czech:"CS", romanian:"RO",
  hungarian:"HU", finnish:"FI", ukrainian:"UK", swahili:"SW",
  tagalog:"TL", filipino:"TL", nepali:"NE",
};

function getLangCode(lang: string): string {
  const lower = lang.toLowerCase().trim();
  if (LANG_CODE_MAP[lower]) return LANG_CODE_MAP[lower];
  for (const [name, code] of Object.entries(LANG_CODE_MAP)) {
    if (lower.includes(name)) return code;
  }
  const parts = lang.split(/[-_]/);
  return (parts[0] || lang).toUpperCase().slice(0, 2);
}

function buildDownloadName(originalFilename: string | null | undefined, lang: string, ext: string): string {
  const langCode = getLangCode(lang);
  if (!originalFilename) return `translation_${langCode}.${ext}`;
  const base = originalFilename.replace(/\.[^/.]+$/, "").replace(/\s+/g, "_").slice(0, 60);
  return `${base}_${langCode}.${ext}`;
}

function FormatSelector({
  value,
  onChange,
  showLayout,
  showPptx,
}: {
  value: DownloadFormat;
  onChange: (f: DownloadFormat) => void;
  showLayout: boolean;
  showPptx: boolean;
}) {
  const options: Array<{ id: DownloadFormat; label: string; desc: string; icon: React.ReactNode }> = [
    ...(showPptx
      ? [
          {
            id: "pptx" as DownloadFormat,
            label: "Translated PPTX",
            desc: "Presentation with translations applied — preserves all slide layout, images, and design",
            icon: <LayoutTemplate className="w-4 h-4 text-orange-500" />,
          },
        ]
      : [
          {
            id: "auto" as DownloadFormat,
            label: "Same format as source",
            desc: "Delivers the file in the same format as the original — PDF stays PDF, PPTX stays PPTX",
            icon: <FileText className="w-4 h-4" style={{ color: "#FF7A59" }} />,
          },
          {
            id: "pdf" as DownloadFormat,
            label: "Translated PDF",
            desc: "Clean, formatted PDF — best for sharing and printing",
            icon: <FileText className="w-4 h-4" style={{ color: "#0091AE" }} />,
          },
          {
            id: "docx" as DownloadFormat,
            label: "DOCX (Word)",
            desc: "Editable Word document with correct text direction",
            icon: <FileText className="w-4 h-4 text-blue-600" />,
          },
          ...(showLayout
            ? [
                {
                  id: "layout" as DownloadFormat,
                  label: "Layout-preserving PDF",
                  desc: "Original page design preserved — or falls back to a bilingual Word table if layout cannot be reproduced",
                  icon: <LayoutTemplate className="w-4 h-4 text-amber-500" />,
                },
              ]
            : []),
        ]),
  ];

  return (
    <div className="space-y-1.5">
      {options.map((opt) => (
        <label
          key={opt.id}
          className={cn(
            "flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors",
            value === opt.id
              ? "border-teal/50 bg-teal/5"
              : "border-gray-200 hover:bg-gray-50"
          )}
        >
          <input
            type="radio"
            name="format"
            value={opt.id}
            checked={value === opt.id}
            onChange={() => onChange(opt.id)}
            className="mt-0.5 accent-teal shrink-0"
            data-testid={`format-${opt.id}`}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {opt.icon}
              <span className="text-xs font-semibold text-navy">{opt.label}</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">{opt.desc}</p>
          </div>
        </label>
      ))}
    </div>
  );
}

function JobDeliveryCard({ job, docs }: { job: Job; docs: Doc[] }) {
  const [expanded, setExpanded] = useState(false);
  const [rating, setRating] = useState(job.existingReview?.rating ?? 0);
  const [comment, setComment] = useState(job.existingReview?.comment ?? "");
  const [reviewed, setReviewed] = useState(!!job.existingReview);
  const [blacklisted, setBlacklisted] = useState(job.isBlacklisted);
  const [favorited, setFavorited] = useState(job.isFavorited);
  const [submitting, setSubmitting] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [submitted, setSubmitted] = useState(!!job.existingReview);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);

  const isPptx = docs.some((d) => d.fileType === "pptx" || d.fileType === "ppt");
  const [format, setFormat] = useState<DownloadFormat>(isPptx ? "pptx" : "auto");
  const primaryDoc = docs[0] ?? null;

  async function handleDownload() {
    setGenerating(true);
    try {
      const url = `/api/jobs/${job.id}/deliver?format=${format}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to generate file");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      // Detect actual delivered extension from content-type
      const ct = res.headers.get("content-type") ?? "";
      const ext = ct.includes("presentationml") ? "pptx"
        : ct.includes("wordprocessingml") ? "docx"
        : "pdf";
      a.download = buildDownloadName(primaryDoc?.originalFilename, job.targetLanguage, ext);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      /* silent */
    } finally {
      setGenerating(false);
    }
  }

  const hasLinguist = !!job.linguistId;
  const isComplete = job.status === "COMPLETED";
  const showLayout = !!job.hasLayout && !isPptx;

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
        setReviewed(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleFavorite() {
    if (!job.linguistId) return;
    setActionPending(true);
    const res = await fetch(`/api/linguists/${job.linguistId}/favorite`, {
      method: "POST",
    });
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
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded((e) => !e)}
        data-testid={`delivery-job-${job.id}`}
      >
        <div className="flex-1 min-w-0 me-4">
          <p className="text-sm font-semibold text-navy">
            {job.sourceLanguage} → {job.targetLanguage}
          </p>
          {hasLinguist && (
            <p className="text-xs text-gray-400 mt-0.5">
              Linguist: {job.linguistName ?? job.linguistEmail}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isComplete && (
            <CheckCircle2 className="w-4 h-4" style={{ color: "#00BDA5" }} />
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-5">
          {isComplete && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Output Options
              </p>

              <a
                href={`/api/jobs/${job.id}/preview`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 w-full mb-3 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors group"
                data-testid={`preview-btn-${job.id}`}
              >
                <Eye className="w-3.5 h-3.5 shrink-0" style={{ color: "#0091AE" }} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-navy">Preview in browser</span>
                  <p className="text-[10px] text-gray-400">View translated text instantly — no download needed</p>
                </div>
              </a>

              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Export format</p>

              <FormatSelector
                value={format}
                onChange={setFormat}
                showLayout={showLayout}
                showPptx={isPptx}
              />

              <Button
                size="sm"
                variant="teal"
                className="gap-1.5 w-full mt-3"
                onClick={handleDownload}
                disabled={generating}
                data-testid={`download-btn-${job.id}`}
              >
                {generating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                {generating
                  ? "Generating…"
                  : format === "docx"
                  ? "Download DOCX"
                  : format === "pptx"
                  ? "Download PPTX"
                  : "Download PDF"}
              </Button>
            </div>
          )}

          {job.auditReportUrl && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5 text-amber-500" /> AI Review Audit Report
              </p>
              <a
                href={job.auditReportUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 hover:bg-amber-100 transition-colors group"
                data-testid={`btn-audit-report-${job.id}`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-amber-800">Content Audit Report</p>
                    <p className="text-[10px] text-amber-600">AI translation review — issues &amp; corrections</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-amber-500 group-hover:text-amber-700 transition-colors shrink-0" />
              </a>
            </div>
          )}

          {hasLinguist && (
            <>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Linguist Management
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={favorited ? "default" : "outline"}
                    disabled={actionPending}
                    onClick={toggleFavorite}
                    className="gap-1.5"
                    data-testid="btn-favorite"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    {favorited ? "Remove from Preferred" : "Add to Preferred"}
                  </Button>
                  <Button
                    size="sm"
                    variant={blacklisted ? "destructive" : "outline"}
                    disabled={actionPending}
                    onClick={toggleBlacklist}
                    className={cn(
                      "gap-1.5",
                      !blacklisted && "border-red-200 text-red-600 hover:bg-red-50"
                    )}
                    data-testid="btn-blacklist"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                    {blacklisted ? "Remove from Blacklist" : "Blacklist"}
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Rate Linguist
                </p>
                {submitted ? (
                  <div className="flex items-center gap-2">
                    <StarRating value={rating} readonly />
                    <span className="text-xs text-gray-500">Review submitted</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <StarRating value={rating} onChange={setRating} />
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Leave a comment (optional)…"
                      rows={2}
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal/30 resize-none"
                      data-testid="review-comment"
                    />
                    {error && <p className="text-xs text-red-500">{error}</p>}
                    <Button
                      size="sm"
                      onClick={submitReview}
                      disabled={submitting || !rating}
                      className="gap-1.5"
                      data-testid="btn-submit-review"
                    >
                      {submitting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      Submit Review
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function DeliveryWidget({ jobs, docs }: Props) {
  if (jobs.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="text-sm font-semibold text-navy flex items-center gap-2 mb-4">
        <Download className="w-4 h-4" />
        Delivery &amp; Feedback
      </h2>
      <div className="space-y-3">
        {jobs.map((job) => (
          <JobDeliveryCard key={job.id} job={job} docs={docs} />
        ))}
      </div>
    </div>
  );
}
