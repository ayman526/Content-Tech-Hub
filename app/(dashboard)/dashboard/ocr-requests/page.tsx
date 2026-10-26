"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ScanText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  Plus,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOcrThreshold } from "@/lib/use-ocr-threshold";

type OcrRequest = {
  id: string;
  sourceFilename: string;
  sourceLanguage: string | null;
  pageCount: number;
  wordCount: number;
  status: "NEEDS_VERIFICATION" | "IN_REVIEW" | "VERIFIED" | "READY" | "FAILED";
  workflowType: "AI_ONLY" | "AI_HUMAN";
  provider: string;
  avgConfidence: number;
  createdAt: string;
  clientAccount?: { id: string; name: string } | null;
};

type ClientAccount = { id: string; name: string };

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusBadge(status: OcrRequest["status"]) {
  switch (status) {
    case "NEEDS_VERIFICATION":
      return (
        <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
          <Clock className="w-3 h-3 mr-1" /> Needs verification
        </Badge>
      );
    case "IN_REVIEW":
      return (
        <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50">
          <Eye className="w-3 h-3 mr-1" /> In review
        </Badge>
      );
    case "VERIFIED":
      return (
        <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
        </Badge>
      );
    case "READY":
      return (
        <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Ready
        </Badge>
      );
    case "FAILED":
      return (
        <Badge variant="outline" className="border-red-300 text-red-700 bg-red-50">
          <AlertCircle className="w-3 h-3 mr-1" /> Failed
        </Badge>
      );
  }
}

export default function OcrRequestsPage() {
  const [requests, setRequests] = useState<OcrRequest[]>([]);
  const threshold = useOcrThreshold();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [accounts, setAccounts] = useState<ClientAccount[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [workflowType, setWorkflowType] = useState<"AI_ONLY" | "AI_HUMAN">("AI_HUMAN");
  const [clientAccountId, setClientAccountId] = useState<string>("");
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch("/api/ocr-requests");
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        setError(e.error ?? "Failed to load OCR requests");
        return;
      }
      const data = await res.json();
      setRequests(data);
      setError(null);
    } catch {
      setError("Network error loading OCR requests");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // Best-effort load of client accounts for the create dialog
    (async () => {
      try {
        const res = await fetch("/api/client-accounts");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setAccounts(data);
        }
      } catch {}
    })();
  }, []);

  function resetForm() {
    setPickedFile(null);
    setWorkflowType("AI_HUMAN");
    setClientAccountId("");
    setCreateError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleCreate() {
    if (!pickedFile) {
      setCreateError("Please choose a file to scan.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      // 1. Analyze the file (runs OCR via OcrProvider).
      const fd = new FormData();
      fd.append("file", pickedFile);
      const analyzeRes = await fetch("/api/upload/analyze", {
        method: "POST",
        body: fd,
      });
      if (!analyzeRes.ok) {
        const e = await analyzeRes.json().catch(() => ({}));
        setCreateError(e.error ?? "Could not analyze the file.");
        return;
      }
      const analyze = await analyzeRes.json();
      const enrichment = analyze.ocrEnrichment ?? null;
      const pages = enrichment?.pages ?? [];
      const conf =
        typeof analyze.ocrConfidence === "number" && Number.isFinite(analyze.ocrConfidence)
          ? Math.max(0, Math.min(1, analyze.ocrConfidence))
          : 0;

      // 2. Create the OCR request.
      const createRes = await fetch("/api/ocr-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceFilename: analyze.filename,
          sourceFileUrl: analyze.pdfStoredPath ?? "",
          sourceMimeType: analyze.sourceMimeType ?? null,
          sourceLanguage: analyze.sourceLanguage,
          pageCount: analyze.pageCount ?? pages.length,
          wordCount: analyze.wordCount,
          avgConfidence: conf,
          perPageConfidence: pages.map((p: { confidence?: unknown }) =>
            typeof p.confidence === "number" ? p.confidence : 0
          ),
          pages,
          provider: enrichment?.provider ?? "tesseract",
          extractedText: enrichment?.extractedText ?? null,
          extractedMarkdown: enrichment?.extractedMarkdown ?? null,
          structuredLayout: enrichment?.structuredLayout ?? null,
          workflowType,
          ...(clientAccountId ? { clientAccountId } : {}),
        }),
      });
      if (!createRes.ok) {
        const e = await createRes.json().catch(() => ({}));
        setCreateError(e.error ?? "Could not create the OCR request.");
        return;
      }
      setDialogOpen(false);
      resetForm();
      await load();
    } catch {
      setCreateError("Network error.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="page-ocr-requests">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#33475B] flex items-center gap-2">
            <ScanText className="w-6 h-6 text-[#FF7A59]" />
            OCR Requests
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Scanned documents and image uploads land here for OCR extraction
            and (optional) human verification before translation. Once verified,
            the cleaned text can be promoted to a full translation project.
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-[#FF7A59] hover:bg-[#FF8F73]"
          data-testid="button-new-ocr-request"
        >
          <Plus className="w-4 h-4 mr-2" /> New OCR Request
        </Button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-slate-500 py-12 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading…
        </div>
      )}

      {error && !loading && (
        <div
          className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          data-testid="text-ocr-error"
        >
          {error}
        </div>
      )}

      {!loading && !error && requests.length === 0 && (
        <div
          className="rounded-md border border-dashed border-slate-300 bg-white p-12 text-center"
          data-testid="text-ocr-empty"
        >
          <ScanText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-medium text-[#33475B] mb-1">
            No OCR requests yet
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Upload a low-quality scanned PDF through the wizard, or click
            "New OCR Request" above to start one directly.
          </p>
        </div>
      )}

      {!loading && !error && requests.length > 0 && (
        <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3">Workflow</th>
                <th className="px-4 py-3">Pages</th>
                <th className="px-4 py-3">Words</th>
                <th className="px-4 py-3">Confidence</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-slate-100 hover:bg-slate-50"
                  data-testid={`row-ocr-${r.id}`}
                >
                  <td className="px-4 py-3 font-medium text-[#33475B]">
                    {r.sourceFilename}
                    {r.clientAccount && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        {r.clientAccount.name}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {r.workflowType === "AI_HUMAN" ? "AI + Linguist Review" : "AI Only"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.pageCount}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.wordCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        r.avgConfidence >= threshold
                          ? "text-emerald-600 font-medium"
                          : r.avgConfidence >= threshold * 0.85
                          ? "text-amber-600 font-medium"
                          : "text-red-600 font-medium"
                      }
                    >
                      {(Number(r.avgConfidence) * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">{statusBadge(r.status)}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatDate(r.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/dashboard/ocr-requests/${r.id}`}>
                      <Button
                        size="sm"
                        variant="outline"
                        data-testid={`button-open-${r.id}`}
                      >
                        Open
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          data-testid="dialog-new-ocr"
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#33475B]">
                New OCR Request
              </h2>
              <button
                onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}
                className="text-slate-400 hover:text-slate-600"
                data-testid="button-close-dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  File (PDF, JPG, PNG, WEBP)
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => setPickedFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm border border-slate-300 rounded-md px-3 py-2 file:mr-3 file:px-3 file:py-1.5 file:border-0 file:bg-[#FF7A59] file:text-white file:rounded"
                  data-testid="input-ocr-file"
                />
                {pickedFile && (
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Upload className="w-3 h-3" /> {pickedFile.name}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Workflow
                </label>
                <select
                  value={workflowType}
                  onChange={(e) =>
                    setWorkflowType(e.target.value as "AI_ONLY" | "AI_HUMAN")
                  }
                  className="block w-full text-sm border border-slate-300 rounded-md px-3 py-2"
                  data-testid="select-workflow"
                >
                  <option value="AI_ONLY">AI Only — auto-extract & verify by user</option>
                  <option value="AI_HUMAN">AI + Linguist Review — human verification</option>
                </select>
              </div>

              {accounts.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Client Account (optional)
                  </label>
                  <select
                    value={clientAccountId}
                    onChange={(e) => setClientAccountId(e.target.value)}
                    className="block w-full text-sm border border-slate-300 rounded-md px-3 py-2"
                    data-testid="select-client-account"
                  >
                    <option value="">— Unscoped —</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {createError && (
                <div className="text-sm text-red-600" data-testid="text-create-error">
                  {createError}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={creating || !pickedFile}
                className="bg-[#FF7A59] hover:bg-[#FF8F73]"
                data-testid="button-submit-ocr-request"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Scanning…
                  </>
                ) : (
                  <>Create</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
