"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Save, Send, BookOpen, Zap, MessageSquare, Clock,
  CheckCircle2, Loader2, AlertCircle, RefreshCw, Check, CheckCheck,
  ShieldAlert, Flag, Trash2, Bot, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

// ─── Types ────────────────────────────────────────────────────────────────────

type Segment = {
  id: string;
  segmentIndex: number;
  sourceText: string;
  translatedText: string | null;
  isDraft: boolean;
};

type TmEntry = { sourceText: string; targetText: string };
type StudioTm = { id: string; name: string; sourceLang: string; targetLang: string; entries: TmEntry[] };
type GlossaryTerm = { source: string; target: string; doNotTranslate?: boolean; keepUppercase?: boolean };
type StudioGlossary = { id: string; name: string; sourceLang: string; targetLang: string; terms: GlossaryTerm[] };
type StudioStyleGuide = { id: string; name: string; content: string };

type TmMatch = { sourceText: string; targetText: string; matchScore: number; tmName: string };

type LocalIssue = {
  id: string;
  segmentId: string;
  category: string;
  subType: string;
  severity: string;
  note: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SEG_DOT_COLOR: Record<string, string> = {
  done: "bg-teal",
  draft: "bg-amber-300",
  empty: "bg-gray-200",
};

const GLOSSARY_COLORS = [
  "bg-teal/10 text-teal border-b-2 border-teal/40",
  "bg-gold/10 text-amber-700 border-b-2 border-gold/40",
  "bg-purple-100 text-purple-700 border-b-2 border-purple-300",
  "bg-blue-100 text-blue-700 border-b-2 border-blue-300",
];

const ISSUE_CATEGORIES = [
  { value: "ACCURACY", label: "Accuracy" },
  { value: "TERMINOLOGY", label: "Terminology" },
  { value: "GRAMMAR", label: "Grammar" },
  { value: "STYLE_TONE", label: "Style / Tone" },
  { value: "LOCALE", label: "Locale" },
  { value: "FORMATTING_TAGS", label: "Formatting & Tags" },
  { value: "CONSISTENCY", label: "Consistency" },
  { value: "COMPLIANCE", label: "Compliance" },
];

const ISSUE_SUBTYPES: Record<string, string[]> = {
  ACCURACY: ["Omission", "Addition", "Mistranslation", "Untranslated"],
  TERMINOLOGY: ["Glossary violation", "Wrong term", "Inconsistent term"],
  GRAMMAR: ["Grammar error", "Syntax error", "Punctuation"],
  STYLE_TONE: ["Style / register", "Tone inappropriate", "Awkward phrasing"],
  LOCALE: ["Date / number format", "Cultural reference", "Currency"],
  FORMATTING_TAGS: ["Placeholder broken", "Tag missing", "Tag wrong", "Whitespace"],
  CONSISTENCY: ["Inconsistency across segments", "Repeated error"],
  COMPLIANCE: ["Policy violation", "Brand guideline", "Legal"],
};

const SEVERITY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  LOW:      { label: "Low",      bg: "bg-teal/10",  text: "text-teal"       },
  MEDIUM:   { label: "Medium",   bg: "bg-amber-50", text: "text-amber-600"  },
  CRITICAL: { label: "Critical", bg: "bg-red-50",   text: "text-red-600"    },
};

// ─── Fuzzy TM match helper ────────────────────────────────────────────────────

function levenshteinSimilarity(a: string, b: string): number {
  const al = a.toLowerCase(), bl = b.toLowerCase();
  if (al === bl) return 100;
  const m = al.length, n = bl.length;
  if (m === 0 || n === 0) return 0;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = al[i - 1] === bl[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return Math.round((1 - dp[m][n] / Math.max(m, n)) * 100);
}

function getTmMatches(sourceText: string, tms: StudioTm[]): TmMatch[] {
  const results: TmMatch[] = [];
  for (const tm of tms) {
    for (const entry of (tm.entries as TmEntry[])) {
      const score = levenshteinSimilarity(sourceText, entry.sourceText);
      if (score >= 50) {
        results.push({ sourceText: entry.sourceText, targetText: entry.targetText, matchScore: score, tmName: tm.name });
      }
    }
  }
  return results.sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);
}

// ─── Glossary highlight helper ────────────────────────────────────────────────

type GlossaryPart = { text: string; isGlossary: boolean; term?: GlossaryTerm; colorIdx?: number };

function highlightSource(text: string, terms: Array<GlossaryTerm & { colorIdx: number }>): GlossaryPart[] {
  const parts: GlossaryPart[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    let found = false;
    for (const g of terms) {
      const idx = remaining.toLowerCase().indexOf(g.source.toLowerCase());
      if (idx === 0) {
        parts.push({ text: remaining.slice(0, g.source.length), isGlossary: true, term: g, colorIdx: g.colorIdx });
        remaining = remaining.slice(g.source.length);
        found = true;
        break;
      } else if (idx > 0) {
        parts.push({ text: remaining.slice(0, idx), isGlossary: false });
        parts.push({ text: remaining.slice(idx, idx + g.source.length), isGlossary: true, term: g, colorIdx: g.colorIdx });
        remaining = remaining.slice(idx + g.source.length);
        found = true;
        break;
      }
    }
    if (!found) { parts.push({ text: remaining, isGlossary: false }); break; }
  }
  return parts;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StudioEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = use(params);
  const router = useRouter();

  // ── Data loading ──
  const { data: job, isLoading: jobLoading } = useQuery<any>({
    queryKey: ["/api/studio/jobs", jobId],
    queryFn: () => fetch(`/api/studio/jobs/${jobId}`).then((r) => r.json()),
  });

  const { data: tms = [] } = useQuery<StudioTm[]>({
    queryKey: ["/api/studio/tm"],
    queryFn: () => fetch("/api/studio/tm").then((r) => r.json()),
  });

  const { data: glossaries = [] } = useQuery<StudioGlossary[]>({
    queryKey: ["/api/studio/glossaries"],
    queryFn: () => fetch("/api/studio/glossaries").then((r) => r.json()),
  });

  const { data: styleGuides = [] } = useQuery<StudioStyleGuide[]>({
    queryKey: ["/api/studio/style-guides"],
    queryFn: () => fetch("/api/studio/style-guides").then((r) => r.json()),
  });

  // ── Derived state ──
  const segments: Segment[] = job?.files?.[0]?.translations ?? [];
  const isReviewMode = job?.translationMethod === "AI_DRAFT_HUMAN_REVISION";

  // Flatten glossary terms with color indices
  const allGlossaryTerms = glossaries.flatMap((g, gi) =>
    (g.terms as GlossaryTerm[]).map((t, ti) => ({ ...t, colorIdx: (gi + ti) % GLOSSARY_COLORS.length }))
  );

  // ── Editor state ──
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [activeSegId, setActiveSegId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [activeTab, setActiveTab] = useState<"glossary" | "tm" | "history" | "qa" | "issues">(
    isReviewMode ? "issues" : "glossary"
  );
  const [tmMatches, setTmMatches] = useState<TmMatch[]>([]);
  const [history, setHistory] = useState<Array<{ text: string; savedAt: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reviewedSegIds, setReviewedSegIds] = useState<Set<string>>(new Set());
  const [retrying, setRetrying] = useState(false);

  // Issues (local only — no backend persistence in Studio)
  const [localIssues, setLocalIssues] = useState<LocalIssue[]>([]);
  const [issueCategory, setIssueCategory] = useState("ACCURACY");
  const [issueSubType, setIssueSubType] = useState("");
  const [issueSeverity, setIssueSeverity] = useState("MEDIUM");
  const [issueNote, setIssueNote] = useState("");
  const [issueSaving, setIssueSaving] = useState(false);

  const draftsRef = useRef<Record<string, string>>({});
  const saveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const segRefs = useRef<(HTMLDivElement | null)[]>([]);

  // ── Init drafts when segments load ──
  useEffect(() => {
    if (segments.length > 0 && Object.keys(drafts).length === 0) {
      const init: Record<string, string> = {};
      segments.forEach((s) => { init[s.id] = s.translatedText ?? ""; });
      setDrafts(init);
      draftsRef.current = init;
      setActiveSegId(segments[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments.length]);

  // ── Switch to issues tab when review mode detected ──
  useEffect(() => {
    if (isReviewMode) setActiveTab("issues");
  }, [isReviewMode]);

  // ── Update TM matches when segment or tab changes ──
  useEffect(() => {
    if (!activeSegId || activeTab !== "tm") return;
    const seg = segments.find((s) => s.id === activeSegId);
    if (!seg) return;
    setTmMatches(getTmMatches(seg.sourceText, tms));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSegId, activeTab, tms]);

  // ── Reset sidebar panels on segment change ──
  useEffect(() => {
    setTmMatches([]);
    setHistory([]);
    setIssueCategory("ACCURACY");
    setIssueSubType("");
    setIssueSeverity("MEDIUM");
    setIssueNote("");
  }, [activeSegId]);

  // ── Scroll active segment into view ──
  useEffect(() => {
    if (!activeSegId) return;
    const idx = segments.findIndex((s) => s.id === activeSegId);
    if (idx >= 0) segRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSegId]);

  // ── Debounced auto-save (batch PATCH) ──
  function debouncedSave(segId: string, text: string) {
    if (saveTimersRef.current[segId]) clearTimeout(saveTimersRef.current[segId]);
    setSaveStatus("saving");
    saveTimersRef.current[segId] = setTimeout(async () => {
      try {
        await fetch(`/api/studio/jobs/${jobId}/segments`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates: [{ id: segId, translatedText: text }] }),
        });
        setHistory((prev) => [{ text, savedAt: new Date().toLocaleTimeString() }, ...prev.slice(0, 4)]);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch {
        setSaveStatus("error");
      }
    }, 800);
  }

  function handleDraftChange(segId: string, text: string) {
    draftsRef.current[segId] = text;
    setDrafts((prev) => ({ ...prev, [segId]: text }));
    debouncedSave(segId, text);
  }

  async function handleSegmentFocus(segId: string) {
    if (isReviewMode) {
      setReviewedSegIds((prev) => new Set([...prev, segId]));
    }
    setActiveSegId(segId);
  }

  function applyTmMatch(text: string) {
    if (!activeSegId) return;
    draftsRef.current[activeSegId] = text;
    setDrafts((prev) => ({ ...prev, [activeSegId!]: text }));
    debouncedSave(activeSegId, text);
  }

  // ── AI Draft (retranslate all segments) ──
  async function handleAiDraft() {
    setRetrying(true);
    try {
      await fetch(`/api/studio/jobs/${jobId}/draft`, { method: "POST" });
      // Reload page to pick up new translations
      router.refresh();
      window.location.reload();
    } catch {
      /* silent */
    } finally {
      setRetrying(false);
    }
  }

  // ── Add local issue ──
  function addIssue() {
    if (!activeSegId || !issueSubType) return;
    setIssueSaving(true);
    const issue: LocalIssue = {
      id: Math.random().toString(36).slice(2),
      segmentId: activeSegId,
      category: issueCategory,
      subType: issueSubType,
      severity: issueSeverity,
      note: issueNote,
    };
    setLocalIssues((prev) => [...prev, issue]);
    setIssueSubType("");
    setIssueNote("");
    setIssueSaving(false);
  }

  function deleteIssue(issueId: string) {
    setLocalIssues((prev) => prev.filter((i) => i.id !== issueId));
  }

  // ── Submit / Complete ──
  async function handleSubmit() {
    setSubmitting(true);
    // Flush all pending saves
    for (const segId of Object.keys(saveTimersRef.current)) {
      clearTimeout(saveTimersRef.current[segId]);
    }
    await Promise.all(
      segments.map((seg) => {
        const draft = draftsRef.current[seg.id] ?? "";
        if (draft !== (seg.translatedText ?? "")) {
          return fetch(`/api/studio/jobs/${jobId}/segments`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ updates: [{ id: seg.id, translatedText: draft }] }),
          });
        }
        return Promise.resolve();
      })
    );
    // Mark job as DELIVERED
    await fetch(`/api/studio/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DELIVERED" }),
    });
    setSubmitted(true);
    setTimeout(() => router.push(`/portal/studio/jobs/${jobId}`), 2000);
    setSubmitting(false);
  }

  // ── Progress ──
  const translatedCount = segments.filter((s) => {
    const d = draftsRef.current[s.id] ?? s.translatedText ?? "";
    return d.trim().length > 0;
  }).length;
  const reviewedCount = isReviewMode ? reviewedSegIds.size : 0;
  const progress = segments.length > 0 ? (translatedCount / segments.length) * 100 : 0;
  const reviewedProgress = segments.length > 0 ? (reviewedCount / segments.length) * 100 : 0;
  const activeIdx = segments.findIndex((s) => s.id === activeSegId);
  const activeSeg = segments.find((s) => s.id === activeSegId) ?? null;

  const glossaryMatches = allGlossaryTerms.filter((g) =>
    activeSeg?.sourceText.toLowerCase().includes(g.source.toLowerCase())
  );

  const issuesBySegment: Record<string, LocalIssue[]> = {};
  for (const issue of localIssues) {
    if (!issuesBySegment[issue.segmentId]) issuesBySegment[issue.segmentId] = [];
    issuesBySegment[issue.segmentId].push(issue);
  }
  const activeSegIssues = activeSegId ? (issuesBySegment[activeSegId] ?? []) : [];

  function worstSeverity(issues: LocalIssue[]): string | null {
    if (issues.some((i) => i.severity === "CRITICAL")) return "CRITICAL";
    if (issues.some((i) => i.severity === "MEDIUM")) return "MEDIUM";
    if (issues.some((i) => i.severity === "LOW")) return "LOW";
    return null;
  }

  const qaIssueCount = segments.reduce((acc, s) => {
    const draft = draftsRef.current[s.id] ?? s.translatedText ?? "";
    if (draft.trim() === "") return acc + 1;
    if (draft.trim() === s.sourceText.trim()) return acc + 1;
    return acc;
  }, 0);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (jobLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#FAFBFC]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#0091AE] animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Loading segments…</p>
        </div>
      </div>
    );
  }

  // ── Submitted ─────────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#FAFBFC]">
        <div className="text-center">
          <div className="w-16 h-16 bg-[#0091AE]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-[#0091AE]" />
          </div>
          <h2 className="text-xl font-bold text-[#33475B] mb-2">
            {isReviewMode ? "Review Completed" : "Job Marked as Delivered"}
          </h2>
          <p className="text-sm text-gray-500">Returning to job…</p>
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-[#F4F5F7] overflow-hidden">

      {/* ── Header ── */}
      <header className={`border-b px-4 py-2.5 flex items-center gap-3 shrink-0 shadow-sm ${
        isReviewMode ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200"
      }`}>
        <Link
          href={`/portal/studio/jobs/${jobId}`}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#33475B] transition-colors shrink-0"
          data-testid="btn-back"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </Link>

        <div className="w-px h-5 bg-gray-200 shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-[#33475B] truncate leading-tight">{job?.title ?? "Editor"}</p>
            {isReviewMode && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
                <Bot className="w-3 h-3" /> AI Review Mode
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 leading-tight">{job?.sourceLanguage} → {job?.targetLanguage}</p>
        </div>

        {activeIdx >= 0 && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
            <span className="font-semibold text-[#33475B]">{activeIdx + 1}</span>
            <span>/</span>
            <span>{segments.length}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs shrink-0">
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1 text-amber-500 font-medium">
              <Loader2 className="w-3 h-3 animate-spin" /> Saving…
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-[#0091AE] font-medium">
              <Check className="w-3 h-3" /> Auto-saved
            </span>
          )}
          {saveStatus === "error" && (
            <span className="flex items-center gap-1 text-red-500 font-medium">
              <AlertCircle className="w-3 h-3" /> Save failed
            </span>
          )}
        </div>

        {isReviewMode && localIssues.length > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-bold bg-red-100 text-red-600 px-2.5 py-1 rounded-full">
              {localIssues.filter((i) => i.severity === "CRITICAL").length} critical
            </span>
            <span className="text-xs font-bold bg-amber-100 text-amber-600 px-2.5 py-1 rounded-full">
              {localIssues.length} total
            </span>
          </div>
        )}

        {!isReviewMode && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleAiDraft}
            disabled={retrying}
            className="text-xs shrink-0 border-[#0091AE] text-[#0091AE] hover:bg-[#0091AE]/10"
            data-testid="btn-ai-draft"
          >
            {retrying ? <Loader2 className="w-3.5 h-3.5 me-1.5 animate-spin" /> : <Bot className="w-3.5 h-3.5 me-1.5" />}
            AI Draft
          </Button>
        )}

        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={submitting}
          data-testid="btn-submit"
          className={`text-xs shrink-0 text-white ${
            isReviewMode ? "bg-amber-500 hover:bg-amber-600" : "bg-[#0091AE] hover:bg-[#007a95]"
          }`}
        >
          {submitting
            ? <Loader2 className="w-3.5 h-3.5 me-1.5 animate-spin" />
            : isReviewMode
              ? <Flag className="w-3.5 h-3.5 me-1.5" />
              : <Send className="w-3.5 h-3.5 me-1.5" />
          }
          {isReviewMode ? "Complete Review" : "Mark as Delivered"}
        </Button>
      </header>

      {/* ── Progress bar ── */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 flex items-center gap-4 shrink-0">
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              {isReviewMode ? (
                <>
                  <span>
                    <span className="font-semibold text-[#33475B]">{reviewedCount}</span>/{segments.length} segments reviewed
                  </span>
                  <span className="flex items-center gap-1 text-amber-600">
                    <Flag className="w-3 h-3" />
                    <span className="font-semibold">{localIssues.length}</span> issues flagged
                  </span>
                </>
              ) : (
                <>
                  <span>
                    <span className="font-semibold text-[#33475B]">{translatedCount}</span>/{segments.length} segments translated
                  </span>
                  {reviewedCount > 0 && (
                    <span className="flex items-center gap-1 text-[#0091AE]">
                      <CheckCheck className="w-3 h-3" />
                      <span className="font-semibold">{reviewedCount}</span> reviewed
                    </span>
                  )}
                </>
              )}
            </div>
            <span className="text-xs font-bold text-[#0091AE]">
              {Math.round(isReviewMode ? reviewedProgress : progress)}%
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${isReviewMode ? reviewedProgress : progress}%`,
                background: isReviewMode
                  ? "linear-gradient(90deg, #FF7A59 0%, #e06040 100%)"
                  : "linear-gradient(90deg, #0091AE 0%, #007a95 100%)",
              }}
            />
          </div>
        </div>

        {/* Segment indicator dots */}
        <div className="flex items-center gap-0.5 shrink-0">
          {segments.slice(0, Math.min(segments.length, 40)).map((s, i) => {
            const segIssues = issuesBySegment[s.id] ?? [];
            const worst = worstSeverity(segIssues);
            const draft = draftsRef.current[s.id] ?? s.translatedText ?? "";
            const dotColor = isReviewMode && worst
              ? worst === "CRITICAL" ? "bg-red-500" : worst === "MEDIUM" ? "bg-amber-400" : "bg-[#0091AE]"
              : isReviewMode && reviewedSegIds.has(s.id)
              ? "bg-[#33475B]/40"
              : draft.trim() ? SEG_DOT_COLOR.done
              : s.isDraft ? SEG_DOT_COLOR.draft
              : SEG_DOT_COLOR.empty;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSegId(s.id)}
                className={`rounded-sm transition-all duration-150 ${
                  s.id === activeSegId
                    ? "w-5 h-2.5 bg-[#33475B] ring-2 ring-[#33475B] ring-offset-1"
                    : `w-2 h-2.5 ${dotColor} hover:scale-125`
                }`}
                title={`Segment ${i + 1}${segIssues.length > 0 ? ` — ${segIssues.length} issue${segIssues.length > 1 ? "s" : ""}` : ""}`}
                data-testid={`seg-indicator-${i}`}
              />
            );
          })}
          {segments.length > 40 && (
            <span className="text-xs text-gray-400 ml-1">+{segments.length - 40}</span>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 overflow-hidden flex min-h-0">

        {/* ── Segment list ── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-w-0" data-testid="segment-list">
          {segments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <p className="text-sm">No segments found.</p>
              <p className="text-xs mt-1">Upload a file and generate an AI draft to get started.</p>
            </div>
          ) : segments.map((seg, i) => {
            const isActive = seg.id === activeSegId;
            const draft = drafts[seg.id] ?? "";
            const hasDraft = draft.trim().length > 0;
            const isReviewed = isReviewMode && reviewedSegIds.has(seg.id);
            const segParts = highlightSource(seg.sourceText, allGlossaryTerms);
            const wordCount = draft.trim().split(/\s+/).filter(Boolean).length;
            const segIssues = issuesBySegment[seg.id] ?? [];
            const worst = worstSeverity(segIssues);

            return (
              <div
                key={seg.id}
                ref={(el) => { segRefs.current[i] = el; }}
                className={`rounded-2xl border-2 bg-white overflow-hidden transition-all duration-200 ${
                  isActive
                    ? isReviewMode
                      ? "border-amber-300 shadow-lg shadow-amber-100"
                      : "border-[#33475B] shadow-lg shadow-[#33475B]/10"
                    : worst === "CRITICAL" ? "border-red-200 hover:border-red-300 cursor-pointer"
                    : worst === "MEDIUM" ? "border-amber-200 hover:border-amber-300 cursor-pointer"
                    : isReviewed ? "border-[#0091AE]/40 opacity-90 hover:opacity-100 cursor-pointer"
                    : "border-gray-200 hover:border-gray-300 cursor-pointer"
                }`}
                onClick={() => {
                  if (!isActive) {
                    setActiveSegId(seg.id);
                    if (isReviewMode) setReviewedSegIds((prev) => new Set([...prev, seg.id]));
                  }
                }}
                data-testid={`segment-row-${i}`}
              >
                <div className="flex">
                  {/* Left rail */}
                  <div className={`w-10 shrink-0 flex flex-col items-center pt-3 pb-2 gap-1 border-e transition-colors ${
                    isActive
                      ? isReviewMode ? "border-amber-200 bg-amber-50/50" : "border-[#33475B]/20 bg-[#33475B]/5"
                      : worst ? "border-red-100 bg-red-50/30"
                      : isReviewed ? "border-[#0091AE]/20 bg-[#0091AE]/5"
                      : "border-gray-100 bg-gray-50"
                  }`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all ${
                      worst === "CRITICAL" ? "bg-red-500 text-white shadow-sm"
                      : worst === "MEDIUM" ? "bg-amber-400 text-white"
                      : worst === "LOW" ? "bg-[#0091AE] text-white"
                      : isReviewed ? "bg-[#33475B]/20 text-[#33475B]"
                      : hasDraft ? "bg-[#0091AE]/20 text-[#0091AE]"
                      : isActive ? "bg-[#33475B]/10 text-[#33475B]"
                      : "bg-gray-200 text-gray-400"
                    }`}>
                      {worst ? <Flag className="w-3 h-3" /> : isReviewed ? <Eye className="w-3 h-3" /> : i + 1}
                    </div>
                    {segIssues.length > 0 && (
                      <span className="text-[9px] font-bold text-red-500">{segIssues.length}</span>
                    )}
                    {isActive && <div className="w-0.5 flex-1 min-h-[20px] bg-[#33475B]/20 rounded-full mt-1" />}
                  </div>

                  {/* Source + Target */}
                  <div className="flex-1 min-w-0">
                    {/* Source text */}
                    <div className={`px-4 py-3 border-b transition-colors ${
                      isActive
                        ? isReviewMode ? "border-amber-100 bg-amber-50/30" : "border-[#33475B]/10 bg-[#33475B]/[0.02]"
                        : "border-gray-100 bg-gray-50/60"
                    }`}>
                      {isReviewMode && (
                        <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Source</p>
                      )}
                      <p className={`text-sm leading-6 select-text transition-colors ${
                        isActive ? "text-[#33475B] font-medium" : "text-gray-500"
                      }`}>
                        {segParts.map((part, j) =>
                          part.isGlossary && part.term ? (
                            <span
                              key={j}
                              className={`px-0.5 rounded cursor-help ${GLOSSARY_COLORS[part.colorIdx ?? 0]}`}
                              title={`${part.text} → ${part.term.target}`}
                            >
                              {part.text}
                            </span>
                          ) : (
                            <span key={j}>{part.text}</span>
                          )
                        )}
                      </p>
                    </div>

                    {/* Target area */}
                    <div className="px-4 py-2.5">
                      {isReviewMode && hasDraft && (
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="text-[9px] font-bold text-[#0091AE] uppercase tracking-wider">AI Translation</span>
                          <Bot className="w-3 h-3 text-[#0091AE]" />
                        </div>
                      )}
                      <textarea
                        value={draft}
                        onChange={(e) => handleDraftChange(seg.id, e.target.value)}
                        onFocus={() => handleSegmentFocus(seg.id)}
                        rows={isActive ? 4 : 2}
                        className={`w-full resize-none text-sm leading-6 focus:outline-none bg-transparent transition-all duration-200 ${
                          isActive
                            ? "text-[#33475B] placeholder-gray-300 min-h-[88px]"
                            : hasDraft ? "text-gray-700 cursor-pointer min-h-[44px]"
                            : "text-gray-400 italic cursor-pointer min-h-[44px]"
                        }`}
                        placeholder={
                          isActive
                            ? (isReviewMode ? "AI translation will appear here — edit if needed…" : "Type your translation…")
                            : hasDraft ? "" : (isReviewMode ? "No AI translation" : "Click to translate…")
                        }
                        dir="auto"
                        readOnly={!isActive}
                        data-testid={`textarea-seg-${i}`}
                      />
                    </div>

                    {/* Active segment footer */}
                    {isActive && (
                      <div className={`px-4 py-2 border-t flex items-center justify-between ${
                        isReviewMode ? "border-amber-100 bg-amber-50/20" : "border-[#33475B]/10 bg-[#33475B]/[0.02]"
                      }`}>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400">
                            {draft.length} chars · {wordCount} words
                          </span>
                          {segIssues.length > 0 && (
                            <span className="text-[11px] text-red-500 font-medium flex items-center gap-1">
                              <Flag className="w-3 h-3" /> {segIssues.length} issue{segIssues.length > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isReviewMode ? (
                            <div className="flex items-center gap-2">
                              {!hasDraft && (
                                <button
                                  onClick={handleAiDraft}
                                  disabled={retrying}
                                  className="text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-60"
                                  data-testid={`btn-retry-ai-${i}`}
                                >
                                  {retrying
                                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating…</>
                                    : <><RefreshCw className="w-3 h-3" /> AI Draft</>}
                                </button>
                              )}
                              <button
                                onClick={() => setActiveTab("issues")}
                                className="text-xs font-semibold text-amber-600 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                                data-testid={`btn-flag-issue-${i}`}
                              >
                                <Flag className="w-3 h-3" /> Flag Issue
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-400">Focus next to auto-save ↓</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div className="h-16" />
        </div>

        {/* ── Right sidebar ── */}
        <div className="w-72 xl:w-80 border-s border-gray-200 bg-white flex flex-col shrink-0 overflow-hidden">

          {/* Sidebar header */}
          <div className={`px-4 py-2.5 border-b shrink-0 ${isReviewMode ? "bg-amber-50 border-amber-100" : "bg-gray-50 border-gray-100"}`}>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              {activeSeg ? `Segment ${activeIdx + 1} tools` : "Select a segment"}
            </p>
          </div>

          {/* Tabs */}
          <div className={`grid border-b border-gray-200 shrink-0 ${isReviewMode ? "grid-cols-3" : "grid-cols-4"}`}>
            {(isReviewMode
              ? [
                  { key: "issues" as const, icon: Flag,        label: "Issues",   count: activeSegIssues.length },
                  { key: "glossary" as const, icon: BookOpen,  label: "Glossary", count: glossaryMatches.length },
                  { key: "history" as const, icon: Clock,      label: "History",  count: history.length },
                ]
              : [
                  { key: "glossary" as const, icon: BookOpen,  label: "Glossary", count: glossaryMatches.length },
                  { key: "tm" as const,       icon: Zap,       label: "TM",       count: tmMatches.length       },
                  { key: "history" as const,  icon: Clock,     label: "History",  count: history.length         },
                  { key: "qa" as const,       icon: ShieldAlert, label: "QA",     count: qaIssueCount           },
                ]
            ).map(({ key, icon: Icon, label, count }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-all border-b-2 ${
                  activeTab === key
                    ? isReviewMode
                      ? "border-amber-500 text-amber-600 bg-amber-50"
                      : "border-[#33475B] text-[#33475B] bg-[#33475B]/5"
                    : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                }`}
                data-testid={`tab-${key}`}
                title={label}
              >
                <div className="relative">
                  <Icon className="w-4 h-4" />
                  {count > 0 && (
                    <span className={`absolute -top-1.5 -right-2 w-3.5 h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center ${
                      key === "issues" ? "bg-amber-500 text-white" :
                      activeTab === key ? "bg-[#33475B] text-white" : "bg-[#0091AE] text-white"
                    }`}>{count}</span>
                  )}
                </div>
                <span className="leading-none">{label}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">

            {/* ── Issues tab ── */}
            {activeTab === "issues" && (
              <div className="flex flex-col h-full">
                <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                  {activeSeg ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2.5">
                      <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                        <Flag className="w-3 h-3" /> Flag Issue — Seg {activeIdx + 1}
                      </p>

                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Category</label>
                        <select
                          value={issueCategory}
                          onChange={(e) => { setIssueCategory(e.target.value); setIssueSubType(""); }}
                          className="w-full text-xs px-2.5 py-2 rounded-lg border border-amber-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 text-[#33475B]"
                          data-testid="select-issue-category"
                        >
                          {ISSUE_CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Sub-type</label>
                        <select
                          value={issueSubType}
                          onChange={(e) => setIssueSubType(e.target.value)}
                          className="w-full text-xs px-2.5 py-2 rounded-lg border border-amber-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 text-[#33475B]"
                          data-testid="select-issue-subtype"
                        >
                          <option value="">Select sub-type…</option>
                          {(ISSUE_SUBTYPES[issueCategory] ?? []).map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Severity</label>
                        <div className="flex gap-1.5">
                          {(["LOW", "MEDIUM", "CRITICAL"] as const).map((sev) => {
                            const cfg = SEVERITY_CONFIG[sev];
                            return (
                              <button
                                key={sev}
                                onClick={() => setIssueSeverity(sev)}
                                className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg border transition-all ${
                                  issueSeverity === sev
                                    ? `${cfg.bg} ${cfg.text} border-current ring-2 ring-current/20`
                                    : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"
                                }`}
                                data-testid={`btn-severity-${sev.toLowerCase()}`}
                              >
                                {cfg.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Note (optional)</label>
                        <textarea
                          value={issueNote}
                          onChange={(e) => setIssueNote(e.target.value)}
                          rows={2}
                          placeholder="Add context or suggested correction…"
                          className="w-full text-xs px-2.5 py-2 rounded-lg border border-amber-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 text-[#33475B] resize-none"
                          data-testid="textarea-issue-note"
                        />
                      </div>

                      <button
                        onClick={addIssue}
                        disabled={!issueSubType || issueSaving}
                        className="w-full text-xs font-bold py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                        data-testid="btn-add-issue"
                      >
                        {issueSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Flag className="w-3 h-3" />}
                        Flag Issue
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-6">Select a segment to flag an issue.</p>
                  )}

                  {/* Issues on this segment */}
                  {activeSegIssues.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">This segment</p>
                      {activeSegIssues.map((issue) => {
                        const cfg = SEVERITY_CONFIG[issue.severity];
                        return (
                          <div key={issue.id} className={`rounded-lg p-2.5 border ${cfg.bg} border-current/20`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className={`text-[9px] font-bold uppercase ${cfg.text}`}>{issue.severity}</span>
                                  <span className="text-[9px] text-gray-400">·</span>
                                  <span className="text-[10px] font-semibold text-[#33475B]">{issue.subType}</span>
                                </div>
                                <p className="text-[10px] text-gray-500">{issue.category.replace("_", " ")}</p>
                                {issue.note && <p className="text-[10px] text-gray-600 mt-1 italic">"{issue.note}"</p>}
                              </div>
                              <button
                                onClick={() => deleteIssue(issue.id)}
                                className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* All issues summary */}
                  {localIssues.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">All issues ({localIssues.length})</p>
                      {(["CRITICAL", "MEDIUM", "LOW"] as const).map((sev) => {
                        const count = localIssues.filter((i) => i.severity === sev).length;
                        if (!count) return null;
                        const cfg = SEVERITY_CONFIG[sev];
                        return (
                          <div key={sev} className="flex items-center justify-between text-xs mb-1">
                            <span className={cfg.text}>{cfg.label}</span>
                            <span className={`font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Glossary tab ── */}
            {activeTab === "glossary" && (
              <div className="p-3 space-y-2">
                {!activeSeg ? (
                  <p className="text-xs text-gray-400 text-center py-6">Select a segment to see glossary matches.</p>
                ) : glossaryMatches.length === 0 ? (
                  <div className="text-center py-6">
                    <BookOpen className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">No glossary terms found in this segment.</p>
                    {glossaries.length === 0 && (
                      <Link href="/portal/studio/glossaries" className="text-xs mt-2 block" style={{ color: "#0091AE" }}>
                        Create a glossary
                      </Link>
                    )}
                  </div>
                ) : (
                  glossaryMatches.map((g, i) => (
                    <div key={i} className={`rounded-lg px-3 py-2.5 border text-xs ${GLOSSARY_COLORS[g.colorIdx % GLOSSARY_COLORS.length]}`}>
                      <div className="font-semibold">{g.source}</div>
                      <div className="text-[11px] opacity-70 mt-0.5">{g.target}</div>
                      {g.doNotTranslate && (
                        <span className="text-[9px] font-bold text-red-500 mt-1 block">Do Not Translate</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── TM tab ── */}
            {activeTab === "tm" && (
              <div className="p-3 space-y-2">
                {!activeSeg ? (
                  <p className="text-xs text-gray-400 text-center py-6">Select a segment to see TM matches.</p>
                ) : tmMatches.length === 0 ? (
                  <div className="text-center py-6">
                    <Zap className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">No TM matches found.</p>
                    {tms.length === 0 && (
                      <Link href="/portal/studio/tm" className="text-xs mt-2 block" style={{ color: "#0091AE" }}>
                        Create a Translation Memory
                      </Link>
                    )}
                  </div>
                ) : (
                  tmMatches.map((match, i) => (
                    <div key={i} className="rounded-xl border border-gray-200 p-3 hover:border-[#0091AE]/40 transition-colors group">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${
                          match.matchScore === 100 ? "bg-green-100 text-green-700"
                          : match.matchScore >= 75 ? "bg-[#0091AE]/10 text-[#0091AE]"
                          : "bg-gray-100 text-gray-500"
                        }`}>
                          {match.matchScore}% match
                        </span>
                        <span className="text-[9px] text-gray-400">{match.tmName}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mb-1 leading-relaxed">{match.sourceText}</p>
                      <p className="text-xs font-medium text-[#33475B] leading-relaxed">{match.targetText}</p>
                      <button
                        onClick={() => applyTmMatch(match.targetText)}
                        className="mt-2 text-[10px] font-semibold text-[#0091AE] hover:text-[#007a95] opacity-0 group-hover:opacity-100 transition-opacity"
                        data-testid={`btn-apply-tm-${i}`}
                      >
                        Apply match →
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── History tab ── */}
            {activeTab === "history" && (
              <div className="p-3 space-y-2">
                {history.length === 0 ? (
                  <div className="text-center py-6">
                    <Clock className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">No save history yet.</p>
                    <p className="text-[10px] text-gray-300 mt-1">Start editing a segment to see history.</p>
                  </div>
                ) : (
                  history.map((h, i) => (
                    <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 p-2.5">
                      <p className="text-[10px] text-gray-400 mb-1">{h.savedAt}</p>
                      <p className="text-xs text-[#33475B] leading-relaxed line-clamp-3">{h.text || <span className="italic text-gray-300">empty</span>}</p>
                      {activeSeg && (
                        <button
                          onClick={() => applyTmMatch(h.text)}
                          className="mt-1.5 text-[10px] font-semibold text-[#0091AE] hover:underline"
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── QA tab ── */}
            {activeTab === "qa" && (
              <div className="p-3 space-y-3">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Quality checks</p>
                  <div className="space-y-2">
                    {[
                      {
                        label: "Empty translations",
                        count: segments.filter((s) => !(draftsRef.current[s.id] ?? s.translatedText ?? "").trim()).length,
                        severity: "error",
                      },
                      {
                        label: "Untouched (source = target)",
                        count: segments.filter((s) => {
                          const d = draftsRef.current[s.id] ?? s.translatedText ?? "";
                          return d.trim() !== "" && d.trim() === s.sourceText.trim();
                        }).length,
                        severity: "warning",
                      },
                      {
                        label: "Translated",
                        count: segments.filter((s) => (draftsRef.current[s.id] ?? s.translatedText ?? "").trim() !== "").length,
                        severity: "ok",
                      },
                    ].map(({ label, count, severity }) => (
                      <div key={label} className="flex items-center justify-between text-xs">
                        <span className={severity === "error" ? "text-red-500" : severity === "warning" ? "text-amber-600" : "text-[#0091AE]"}>
                          {label}
                        </span>
                        <span className={`font-bold px-2 py-0.5 rounded-full ${
                          severity === "error" ? "bg-red-50 text-red-500"
                          : severity === "warning" ? "bg-amber-50 text-amber-600"
                          : "bg-[#0091AE]/10 text-[#0091AE]"
                        }`}>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {styleGuides.length > 0 && (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Style Guides</p>
                    {styleGuides.slice(0, 2).map((sg) => (
                      <div key={sg.id} className="mb-2 last:mb-0">
                        <p className="text-[10px] font-semibold text-[#33475B] mb-0.5">{sg.name}</p>
                        <p className="text-[10px] text-gray-500 line-clamp-3 leading-relaxed">{sg.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
