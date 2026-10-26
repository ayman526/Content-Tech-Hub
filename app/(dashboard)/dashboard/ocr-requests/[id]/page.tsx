"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ScanText,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Save,
  AlertCircle,
  RefreshCw,
  Eye,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useOcrThreshold } from "@/lib/use-ocr-threshold";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type OcrPage = {
  pageNum: number;
  text: string;
  confidence?: number;
  mistralText?: string | null;
  blocks?: unknown[];
};

type OcrRequest = {
  id: string;
  sourceFilename: string;
  sourceFileUrl?: string | null;
  sourceLanguage: string | null;
  pageCount: number;
  wordCount: number;
  status: "NEEDS_VERIFICATION" | "IN_REVIEW" | "VERIFIED" | "READY" | "FAILED";
  provider: string;
  avgConfidence: number;
  pages: OcrPage[];
  notes: string | null;
  createdAt: string;
  verifiedAt: string | null;
};

export default function OcrRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [req, setReq] = useState<OcrRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<OcrPage[]>([]);
  const [notes, setNotes] = useState("");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [rerunning, setRerunning] = useState(false);
  const [rerunError, setRerunError] = useState<string | null>(null);
  const [editingPages, setEditingPages] = useState<Set<number>>(new Set());
  const threshold = useOcrThreshold();

  function toggleEditPage(idx: number) {
    setEditingPages((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/ocr-requests/${id}`);
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          if (mounted) setError(e.error ?? "Not found");
          return;
        }
        const data = await res.json();
        if (mounted) {
          setReq(data);
          setPages(Array.isArray(data.pages) ? data.pages : []);
          setNotes(data.notes ?? "");
        }
      } catch {
        if (mounted) setError("Network error");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  async function save(opts: { verify?: boolean } = {}) {
    if (!req) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/ocr-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pages,
          notes,
          status: opts.verify
            ? "VERIFIED"
            : req.status === "NEEDS_VERIFICATION"
            ? "IN_REVIEW"
            : req.status,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        setError(e.error ?? "Save failed");
      } else {
        const data = await res.json();
        setReq(data);
        setSavedAt(new Date());
        if (opts.verify) {
          setTimeout(() => router.push("/dashboard/ocr-requests"), 800);
        }
      }
    } catch {
      setError("Network error while saving");
    } finally {
      setSaving(false);
    }
  }

  function updatePageText(idx: number, text: string) {
    setPages((prev) => prev.map((p, i) => (i === idx ? { ...p, text } : p)));
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading…
      </div>
    );
  }

  if (error || !req) {
    return (
      <div className="p-6">
        <Link href="/dashboard/ocr-requests" className="text-sm text-[#0091AE] hover:underline">
          <ArrowLeft className="w-4 h-4 inline mr-1" /> Back
        </Link>
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error ?? "Not found"}
        </div>
      </div>
    );
  }

  // Only a linguist-verified OCR request can be handed off to a
  // translation project. READY (AI-only completion) is intentionally
  // excluded from this gate so the "Use in new translation project"
  // CTA stays disabled until a human has reviewed the text.
  const verified = req.status === "VERIFIED";

  async function rerunOcr() {
    if (!req || rerunning) return;
    setRerunning(true);
    setRerunError(null);
    try {
      const res = await fetch(`/api/ocr-requests/${req.id}/rerun`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setRerunError(data.error ?? "Re-run failed. Please try again.");
        return;
      }
      setReq(data);
      setPages(Array.isArray(data.pages) ? data.pages : []);
    } catch {
      setRerunError("Network error. Please try again.");
    } finally {
      setRerunning(false);
    }
  }

  function downloadTxt() {
    if (!req) return;
    const text =
      pages.length > 0
        ? pages.map((p) => `--- Page ${p.pageNum} ---\n${p.text}`).join("\n\n")
        : "";
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const baseName =
      (req.sourceFilename ?? "ocr").replace(/\.[^.]+$/, "") || "ocr";
    a.download = `${baseName}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto" data-testid="page-ocr-detail">
      <Link
        href="/dashboard/ocr-requests"
        className="text-sm text-[#0091AE] hover:underline inline-flex items-center"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> All OCR requests
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#33475B] flex items-center gap-2">
            <ScanText className="w-6 h-6 text-[#FF7A59]" />
            {req.sourceFilename}
          </h1>
          <div className="text-sm text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
            <span>{req.pageCount} pages</span>
            <span>·</span>
            <span>{req.wordCount.toLocaleString()} words</span>
            <span>·</span>
            <span>
              Avg confidence:{" "}
              <span
                className={
                  req.avgConfidence >= threshold
                    ? "text-emerald-600 font-medium"
                    : req.avgConfidence >= threshold * 0.85
                    ? "text-amber-600 font-medium"
                    : "text-red-600 font-medium"
                }
              >
                {(Number(req.avgConfidence) * 100).toFixed(1)}%
              </span>
            </span>
            <span>·</span>
            <span>Provider: {req.provider}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge
            variant="outline"
            className={
              verified
                ? "border-emerald-300 text-emerald-700 bg-emerald-50"
                : "border-amber-300 text-amber-700 bg-amber-50"
            }
          >
            {req.status}
          </Badge>
          <div className="flex items-center gap-2">
            {req.sourceFileUrl && (
              <a
                href={req.sourceFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#0091AE] hover:underline"
                data-testid="link-original-file"
              >
                View original
              </a>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={downloadTxt}
              data-testid="button-download-txt"
            >
              Download .txt
            </Button>
            <a
              href={`/api/ocr-requests/${req.id}/download?format=docx`}
              data-testid="button-download-docx"
            >
              <Button size="sm" variant="outline" type="button">
                Download .docx
              </Button>
            </a>
          </div>
          {savedAt && (
            <span className="text-xs text-emerald-600">
              Saved {savedAt.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {req.avgConfidence < threshold && !verified && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex gap-2 items-start">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p>
              Automatic OCR confidence is below the{" "}
              {(threshold * 100).toFixed(0)}% threshold. Review each page below —
              correct any mis-recognized characters, then mark the request as
              verified to enable translation.
            </p>
            {(req.provider === "tesseract" || req.provider === "native-text") && (
              <div className="mt-2 flex items-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={rerunOcr}
                  disabled={rerunning}
                  data-testid="button-rerun-ocr"
                  className="border-amber-400 text-amber-800 hover:bg-amber-100"
                >
                  {rerunning ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  {rerunning ? "Re-processing with Mistral..." : "Re-run with Mistral OCR"}
                </Button>
                <span className="text-xs text-amber-700">
                  Mistral produces higher-quality results and may push confidence above {(threshold * 100).toFixed(0)}% automatically.
                </span>
              </div>
            )}
            {rerunError && (
              <p className="mt-1.5 text-xs text-red-600" data-testid="text-rerun-error">{rerunError}</p>
            )}
          </div>
        </div>
      )}

      {req.provider === "native-text" && !verified && (
        <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 flex gap-2 items-start">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
          <div className="flex-1">
            <p className="font-medium mb-1">Layout-aware re-processing available</p>
            <p>
              This document was extracted using native PDF text, which reads text linearly and may
              not preserve tables, columns, or multi-column layouts (such as grade sheets or
              invoices). Running Mistral OCR will visually analyse the document and reconstruct
              proper tables in the preview.
            </p>
            <div className="mt-2 flex items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={rerunOcr}
                disabled={rerunning}
                data-testid="button-rerun-ocr-native"
                className="border-blue-400 text-blue-800 hover:bg-blue-100"
              >
                {rerunning ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                )}
                {rerunning ? "Re-processing with Mistral..." : "Re-run with Mistral OCR"}
              </Button>
              <span className="text-xs text-blue-700">
                Replaces the extracted text with a layout-preserving version.
              </span>
            </div>
            {rerunError && (
              <p className="mt-1.5 text-xs text-red-600" data-testid="text-rerun-error-native">{rerunError}</p>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {pages.map((p, i) => (
          <div
            key={i}
            className="rounded-md border border-slate-200 bg-white p-4"
            data-testid={`card-page-${p.pageNum ?? i + 1}`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-[#33475B]">
                Page {p.pageNum ?? i + 1}
              </h3>
              {typeof p.confidence === "number" && (
                <span
                  className={
                    "text-xs font-medium " +
                    (p.confidence >= threshold
                      ? "text-emerald-600"
                      : p.confidence >= threshold * 0.85
                      ? "text-amber-600"
                      : "text-red-600")
                  }
                >
                  Confidence: {(p.confidence * 100).toFixed(1)}%
                </span>
              )}
            </div>
            {/* Preview / Edit toggle */}
            {!verified && (
              <div className="flex items-center justify-end mb-2">
                <div className="inline-flex rounded-md border border-slate-200 overflow-hidden text-xs">
                  <button
                    onClick={() => editingPages.has(i) && toggleEditPage(i)}
                    className={`flex items-center gap-1 px-3 py-1.5 transition-colors ${!editingPages.has(i) ? "bg-[#0091AE] text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
                    data-testid={`button-preview-page-${p.pageNum ?? i + 1}`}
                  >
                    <Eye className="w-3 h-3" /> Preview
                  </button>
                  <button
                    onClick={() => !editingPages.has(i) && toggleEditPage(i)}
                    className={`flex items-center gap-1 px-3 py-1.5 transition-colors ${editingPages.has(i) ? "bg-[#0091AE] text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
                    data-testid={`button-edit-page-${p.pageNum ?? i + 1}`}
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                </div>
              </div>
            )}

            {/* Document preview — renders markdown as a Word-like page */}
            {!editingPages.has(i) ? (
              <div
                className="min-h-[200px] rounded border border-slate-200 bg-white overflow-auto"
                data-testid={`preview-page-${p.pageNum ?? i + 1}`}
              >
                <div className="px-10 py-8 max-w-none ocr-doc-preview">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => <h1 className="text-2xl font-bold text-[#33475B] mb-3 mt-4 first:mt-0">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-xl font-bold text-[#33475B] mb-2 mt-4 first:mt-0">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-lg font-semibold text-[#33475B] mb-2 mt-3 first:mt-0">{children}</h3>,
                      p: ({ children }) => <p className="text-sm text-slate-700 mb-3 leading-relaxed">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold text-slate-800">{children}</strong>,
                      em: ({ children }) => <em className="italic text-slate-700">{children}</em>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1 text-sm text-slate-700">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1 text-sm text-slate-700">{children}</ol>,
                      li: ({ children }) => <li className="text-sm text-slate-700">{children}</li>,
                      table: ({ children }) => (
                        <div className="mb-4 overflow-x-auto">
                          <table className="w-full border-collapse text-sm">{children}</table>
                        </div>
                      ),
                      thead: ({ children }) => <thead className="bg-slate-100">{children}</thead>,
                      tbody: ({ children }) => <tbody>{children}</tbody>,
                      tr: ({ children }) => <tr className="border-b border-slate-200">{children}</tr>,
                      th: ({ children }) => <th className="text-left px-3 py-2 font-semibold text-[#33475B] border border-slate-300 bg-slate-100">{children}</th>,
                      td: ({ children }) => <td className="px-3 py-2 text-slate-700 border border-slate-300">{children}</td>,
                      blockquote: ({ children }) => <blockquote className="border-l-4 border-[#0091AE] pl-4 italic text-slate-600 mb-3">{children}</blockquote>,
                      code: ({ children }) => <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono text-slate-700">{children}</code>,
                      hr: () => <hr className="border-slate-200 my-4" />,
                    }}
                  >
                    {p.text ?? ""}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              /* Edit mode — raw textarea for corrections */
              <Textarea
                value={p.text ?? ""}
                onChange={(e) => updatePageText(i, e.target.value)}
                disabled={saving}
                className="min-h-[280px] font-mono text-xs"
                data-testid={`textarea-page-${p.pageNum ?? i + 1}`}
                placeholder="OCR text — edit any mis-recognised characters here. Tables use Markdown pipe format."
              />
            )}
          </div>
        ))}

        {pages.length === 0 && (
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No page data captured for this request.
          </div>
        )}
      </div>

      <div className="mt-6">
        <label className="text-sm font-medium text-[#33475B] mb-1 block">
          Notes
        </label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={verified || saving}
          placeholder="Reviewer notes — what was changed, terminology decisions, etc."
          data-testid="textarea-notes"
        />
      </div>

      {!verified && (
        <div className="mt-6 flex items-center gap-3">
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => save()}
            data-testid="button-save-progress"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1.5" />
            )}
            Save progress
          </Button>
          <Button
            disabled={saving}
            onClick={() => save({ verify: true })}
            data-testid="button-mark-verified"
            className="bg-[#FF7A59] hover:bg-[#FF7A59]/90 text-white"
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            Mark verified
          </Button>
        </div>
      )}

      {verified && (
        <div className="mt-6 space-y-3">
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            This OCR request has been verified
            {req.verifiedAt
              ? ` on ${new Date(req.verifiedAt).toLocaleString()}`
              : ""}
            . The corrected text is available for translation projects.
          </div>
          <Button
            onClick={() => router.push(`/dashboard/wizard?fromOcrRequest=${req.id}`)}
            className="bg-[#FF7A59] hover:bg-[#FF8F73] text-white"
            data-testid="button-use-in-project"
          >
            Use in new translation project →
          </Button>
        </div>
      )}
    </div>
  );
}
