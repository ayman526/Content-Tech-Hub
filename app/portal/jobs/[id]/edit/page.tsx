"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Send,
  BookOpen,
  Zap,
  MessageSquare,
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Plus,
  RefreshCw,
  Check,
  CheckCheck,
  ShieldAlert,
  AlertTriangle,
  Info,
  XCircle,
  Flag,
  Trash2,
  ChevronDown,
  Bot,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/lib/i18n/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type Segment = {
  id: string;
  segmentIndex: number;
  sourceText: string;
  translatedText: string | null;
  status: string;
};

type TmMatch = {
  id: string;
  sourceText: string;
  targetText: string;
  matchScore: number;
  confidence: number;
};

type Comment = {
  id: string;
  text: string;
  resolved: boolean;
  createdAt: string;
  author: { id: string; name: string | null };
};

type SegmentIssue = {
  id: string;
  segmentId: string;
  jobId: string;
  category: string;
  subType: string;
  severity: string;
  note: string | null;
  source?: string;
  createdAt: string;
  reviewer: { name: string | null; email: string } | null;
};

type QualityFlag = {
  id: string;
  segmentId: string;
  category: string;
  subType: string;
  severity: string;
  note: string | null;
  segment: { segmentIndex: number; sourceText: string } | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  TRANSLATED: "Translated",
  REVIEWED: "Reviewed",
  APPROVED: "Approved",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-500 border-gray-200",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200",
  TRANSLATED: "bg-teal/10 text-teal border-teal/30",
  REVIEWED: "bg-blue-50 text-blue-700 border-blue-200",
  APPROVED: "bg-green-50 text-green-700 border-green-200",
};

const SEG_DOT_COLOR: Record<string, string> = {
  PENDING: "bg-gray-200",
  IN_PROGRESS: "bg-amber-300",
  TRANSLATED: "bg-teal/70",
  REVIEWED: "bg-teal",
  APPROVED: "bg-green-500",
};

const GLOSSARY_COLORS = [
  "bg-teal/10 text-teal border-b-2 border-teal/40",
  "bg-gold/10 text-amber-700 border-b-2 border-gold/40",
  "bg-purple-100 text-purple-700 border-b-2 border-purple-300",
  "bg-blue-100 text-blue-700 border-b-2 border-blue-300",
];

const DEMO_GLOSSARY = [
  { term: "Agreement", translation: "اتفاقية", color: 0 },
  { term: "Parties", translation: "الأطراف", color: 1 },
  { term: "Contractor", translation: "المقاول", color: 2 },
  { term: "Confidentiality", translation: "السرية", color: 3 },
  { term: "intellectual property", translation: "الملكية الفكرية", color: 0 },
  { term: "Force majeure", translation: "القوة القاهرة", color: 1 },
  { term: "arbitration", translation: "التحكيم", color: 2 },
  { term: "termination", translation: "إنهاء", color: 3 },
];

// Issue taxonomy
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

const SEVERITY_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  LOW: { label: "Low", bg: "bg-teal/10", text: "text-teal", dot: "bg-teal" },
  MEDIUM: { label: "Medium", bg: "bg-amber-50", text: "text-amber-600", dot: "bg-amber-400" },
  CRITICAL: { label: "Critical", bg: "bg-red-50", text: "text-red-600", dot: "bg-red-500" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function highlightSource(text: string) {
  const parts: Array<{ text: string; isGlossary: boolean; term?: typeof DEMO_GLOSSARY[0] }> = [];
  let remaining = text;
  while (remaining.length > 0) {
    let found = false;
    for (const g of DEMO_GLOSSARY) {
      const idx = remaining.toLowerCase().indexOf(g.term.toLowerCase());
      if (idx === 0) {
        parts.push({ text: remaining.slice(0, g.term.length), isGlossary: true, term: g });
        remaining = remaining.slice(g.term.length);
        found = true;
        break;
      } else if (idx > 0) {
        parts.push({ text: remaining.slice(0, idx), isGlossary: false });
        parts.push({ text: remaining.slice(idx, idx + g.term.length), isGlossary: true, term: g });
        remaining = remaining.slice(idx + g.term.length);
        found = true;
        break;
      }
    }
    if (!found) { parts.push({ text: remaining, isGlossary: false }); break; }
  }
  return parts;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TranslationEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { t } = useTranslation();
  const jobId = params.id as string;

  // Core editor state
  const [segments, setSegments] = useState<Segment[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [activeSegId, setActiveSegId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"glossary" | "tm" | "comments" | "history" | "qa" | "issues">("glossary");
  const [tmMatches, setTmMatches] = useState<TmMatch[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [jobName, setJobName] = useState("Translation Project");
  const [targetLang, setTargetLang] = useState("Arabic");
  const [sourceLang, setSourceLang] = useState("English");
  const [history, setHistory] = useState<Array<{ text: string; savedAt: string }>>([]);

  // Review mode state
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [allIssues, setAllIssues] = useState<SegmentIssue[]>([]);
  const [issueCategory, setIssueCategory] = useState("ACCURACY");
  const [issueSubType, setIssueSubType] = useState("");
  const [issueSeverity, setIssueSeverity] = useState("MEDIUM");
  const [issueNote, setIssueNote] = useState("");
  const [issueSaving, setIssueSaving] = useState(false);
  const [reviewedSegIds, setReviewedSegIds] = useState<Set<string>>(new Set());

  const [retrying, setRetrying] = useState<Record<string, boolean>>({});
  const [qaFlags, setQaFlags] = useState<QualityFlag[]>([]);
  const [qaScore, setQaScore] = useState<number | null>(null);
  const [qaScanning, setQaScanning] = useState(false);

  // Localization assets for real QA and suggestions
  const [locAssets, setLocAssets] = useState<{
    tmEntries: { id: string; sourceText: string; targetText: string; confidence: number }[];
    glossaryTerms: { id: string; term: string; translations: Record<string, string>; doNotTranslate: boolean }[];
    styleGuides: { id: string; name: string }[];
  }>({ tmEntries: [], glossaryTerms: [], styleGuides: [] });

  const draftsRef = useRef<Record<string, string>>({});
  const saveTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const segRefs = useRef<(HTMLDivElement | null)[]>([]);

  const activeSeg = segments.find((s) => s.id === activeSegId) ?? null;

  // Issues grouped by segment
  const issuesBySegment: Record<string, SegmentIssue[]> = {};
  for (const issue of allIssues) {
    if (!issuesBySegment[issue.segmentId]) issuesBySegment[issue.segmentId] = [];
    issuesBySegment[issue.segmentId].push(issue);
  }
  const activeSegIssues = activeSegId ? (issuesBySegment[activeSegId] ?? []) : [];

  const qaIssueCount = segments.reduce((acc, s) => {
    const draft = drafts[s.id] ?? s.translatedText ?? "";
    if (draft.trim() === "") return acc + 1;
    if (draft.trim() === s.sourceText.trim()) return acc + 1;
    return acc;
  }, 0) + qaFlags.length;

  // ── Load job + segments ──
  useEffect(() => {
    fetch(`/api/jobs/${jobId}`)
      .then((r) => r.json())
      .then((job) => {
        if (job?.project) {
          setJobName(job.project.name ?? "Translation Project");
          setSourceLang(job.sourceLanguage ?? "English");
          setTargetLang(job.targetLanguage ?? "Arabic");
          if (job.project.workflowType === "AI_HUMAN") {
            setIsReviewMode(true);
            setActiveTab("issues");
          }
        }
      });
    fetch(`/api/jobs/${jobId}/segments`)
      .then((r) => r.json())
      .then((raw: any) => {
        const segs: Segment[] = Array.isArray(raw) ? raw : (raw?.segments ?? []);
        setSegments(segs);
        const initial: Record<string, string> = {};
        segs.forEach((s) => { initial[s.id] = s.translatedText ?? ""; });
        setDrafts(initial);
        draftsRef.current = initial;
        if (segs.length > 0) setActiveSegId(segs[0].id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [jobId]);

  // ── Auto-fill missing AI translations when entering review mode ──
  useEffect(() => {
    if (!isReviewMode || segments.length === 0) return;
    const missing = segments.filter((s) => !s.translatedText);
    if (missing.length === 0) return;

    // Fire-and-forget: retranslate all missing segments, then refresh
    fetch(`/api/jobs/${jobId}/retranslate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}), // no segmentId = retranslate all missing
    })
      .then((r) => r.json())
      .then(({ translated }) => {
        if (translated > 0) {
          fetch(`/api/jobs/${jobId}/segments`)
            .then((r) => r.json())
            .then((raw: any) => {
              const segs: Segment[] = Array.isArray(raw) ? raw : (raw?.segments ?? []);
              setSegments(segs);
              setDrafts((prev) => {
                const next = { ...prev };
                segs.forEach((s) => { if (s.translatedText && !prev[s.id]) next[s.id] = s.translatedText; });
                return next;
              });
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReviewMode, jobId]);

  // ── Load all issues when in review mode ──
  useEffect(() => {
    if (!isReviewMode) return;
    fetch(`/api/jobs/${jobId}/issues`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setAllIssues(data); })
      .catch(() => {});
  }, [jobId, isReviewMode]);

  // ── Load localization assets once on mount ──
  useEffect(() => {
    fetch(`/api/jobs/${jobId}/loc-assets`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setLocAssets(data); })
      .catch(() => {});
  }, [jobId]);

  // ── Load quality engine flags once on mount ──
  useEffect(() => {
    fetch(`/api/jobs/${jobId}/quality-report`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setQaFlags(data.issues ?? []);
          setQaScore(data.score ?? null);
        }
      })
      .catch(() => {});
  }, [jobId]);

  // ── Load TM matches when active segment / tab changes ──
  useEffect(() => {
    if (!activeSeg || activeTab !== "tm") return;
    fetch(`/api/jobs/${jobId}/tm-matches?sourceText=${encodeURIComponent(activeSeg.sourceText)}`)
      .then((r) => r.json())
      .then(setTmMatches)
      .catch(() => {});
  }, [activeSegId, activeTab, jobId, activeSeg?.sourceText]);

  // ── Load comments ──
  useEffect(() => {
    if (!activeSeg || activeTab !== "comments") return;
    fetch(`/api/segments/${activeSeg.id}/comments`)
      .then((r) => r.json())
      .then(setComments)
      .catch(() => {});
  }, [activeSegId, activeTab, activeSeg?.id]);

  // ── Reset sidebar data when active segment changes ──
  useEffect(() => {
    setTmMatches([]);
    setComments([]);
    setHistory([]);
    // Reset issue form
    setIssueCategory("ACCURACY");
    setIssueSubType("");
    setIssueSeverity("MEDIUM");
    setIssueNote("");
  }, [activeSegId]);

  // ── Scroll active segment into view ──
  useEffect(() => {
    if (!activeSegId) return;
    const idx = segments.findIndex((s) => s.id === activeSegId);
    if (idx >= 0 && segRefs.current[idx]) {
      segRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [activeSegId]);

  // ── Retranslate a single segment that has no AI pre-translation ──
  async function handleRetranslate(segId: string) {
    setRetrying((prev) => ({ ...prev, [segId]: true }));
    try {
      const res = await fetch(`/api/jobs/${jobId}/retranslate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segmentId: segId }),
      });
      if (!res.ok) throw new Error("Retranslate failed");
      const { translated } = await res.json();
      if (translated > 0) {
        // Re-fetch segments to get the new translation
        const segsRes = await fetch(`/api/jobs/${jobId}/segments`);
        const raw = await segsRes.json();
        const segs: Segment[] = Array.isArray(raw) ? raw : (raw?.segments ?? []);
        setSegments(segs);
        setDrafts((prev) => {
          const updated = { ...prev };
          const updated_seg = segs.find((s: Segment) => s.id === segId);
          if (updated_seg?.translatedText) updated[segId] = updated_seg.translatedText;
          return updated;
        });
      }
    } catch {
      /* silent — user can retry again */
    } finally {
      setRetrying((prev) => ({ ...prev, [segId]: false }));
    }
  }

  // ── Per-segment debounced auto-save ──
  function debouncedSave(segId: string, text: string) {
    if (saveTimersRef.current[segId]) clearTimeout(saveTimersRef.current[segId]);
    setSaveStatus("saving");
    saveTimersRef.current[segId] = setTimeout(async () => {
      try {
        const status = text.trim() ? "TRANSLATED" : "IN_PROGRESS";
        await fetch(`/api/segments/${segId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ translatedText: text, status, jobId }),
        });
        setSegments((prev) =>
          prev.map((s) => s.id === segId ? { ...s, translatedText: text, status } : s)
        );
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

  // ── On focus: mark segment as visited (review mode) or auto-review (translate mode) ──
  async function handleSegmentFocus(segId: string) {
    if (isReviewMode) {
      setReviewedSegIds((prev) => new Set([...prev, segId]));
    } else if (activeSegId && activeSegId !== segId) {
      const prevDraft = draftsRef.current[activeSegId] ?? "";
      if (prevDraft.trim()) {
        if (saveTimersRef.current[activeSegId]) clearTimeout(saveTimersRef.current[activeSegId]);
        try {
          await fetch(`/api/segments/${activeSegId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ translatedText: prevDraft, status: "REVIEWED", jobId }),
          });
          setSegments((prev) =>
            prev.map((s) => s.id === activeSegId ? { ...s, translatedText: prevDraft, status: "REVIEWED" } : s)
          );
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 1500);
        } catch {}
      }
    }
    setActiveSegId(segId);
  }

  function applyTmMatch(text: string) {
    if (!activeSegId) return;
    draftsRef.current[activeSegId] = text;
    setDrafts((prev) => ({ ...prev, [activeSegId]: text }));
    debouncedSave(activeSegId, text);
  }

  async function addComment() {
    if (!activeSeg || !newComment.trim()) return;
    const res = await fetch(`/api/segments/${activeSeg.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newComment }),
    });
    if (res.ok) {
      const c = await res.json();
      setComments((prev) => [...prev, c]);
      setNewComment("");
    }
  }

  // ── Add issue ──
  async function addIssue() {
    if (!activeSeg || !issueSubType) return;
    setIssueSaving(true);
    const res = await fetch(`/api/segments/${activeSeg.id}/issues`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId,
        category: issueCategory,
        subType: issueSubType,
        severity: issueSeverity,
        note: issueNote || undefined,
      }),
    });
    if (res.ok) {
      const created = await res.json();
      setAllIssues((prev) => [...prev, created]);
      setIssueSubType("");
      setIssueNote("");
    }
    setIssueSaving(false);
  }

  // ── Delete issue ──
  async function deleteIssue(issueId: string) {
    const res = await fetch(`/api/segments/${activeSegId}/issues/${issueId}`, { method: "DELETE" });
    if (res.ok) {
      setAllIssues((prev) => prev.filter((i) => i.id !== issueId));
    }
  }

  // ── Submit / Complete Review ──
  async function handleSubmit() {
    setSubmitting(true);
    for (const segId of Object.keys(saveTimersRef.current)) {
      clearTimeout(saveTimersRef.current[segId]);
    }
    await Promise.all(
      segments.map((seg) => {
        const draft = draftsRef.current[seg.id] ?? "";
        if (draft !== (seg.translatedText ?? "")) {
          return fetch(`/api/segments/${seg.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ translatedText: draft, status: draft.trim() ? "TRANSLATED" : "IN_PROGRESS", jobId }),
          });
        }
        return Promise.resolve();
      })
    );

    if (isReviewMode) {
      const res = await fetch(`/api/jobs/${jobId}/complete-review`, { method: "POST" });
      if (res.ok) {
        setSubmitted(true);
        setTimeout(() => router.push("/portal/assignments"), 2500);
      }
    } else {
      const res = await fetch(`/api/jobs/${jobId}/submit`, { method: "POST" });
      if (res.ok) {
        setSubmitted(true);
        setTimeout(() => router.push("/portal/assignments"), 2000);
      }
    }
    setSubmitting(false);
  }

  // ── Progress ──
  const translatedCount = segments.filter((s) => {
    const d = draftsRef.current[s.id] ?? s.translatedText ?? "";
    return d.trim().length > 0;
  }).length;
  const reviewedCount = isReviewMode
    ? reviewedSegIds.size
    : segments.filter((s) => s.status === "REVIEWED" || s.status === "APPROVED").length;
  const progress = segments.length > 0 ? (translatedCount / segments.length) * 100 : 0;
  const reviewedProgress = segments.length > 0 ? (reviewedCount / segments.length) * 100 : 0;
  const activeIdx = segments.findIndex((s) => s.id === activeSegId);

  const glossaryMatches = DEMO_GLOSSARY.filter((g) =>
    activeSeg?.sourceText.toLowerCase().includes(g.term.toLowerCase())
  );

  // Worst severity badge per segment
  function worstSeverity(issues: SegmentIssue[]): string | null {
    if (issues.some((i) => i.severity === "CRITICAL")) return "CRITICAL";
    if (issues.some((i) => i.severity === "MEDIUM")) return "MEDIUM";
    if (issues.some((i) => i.severity === "LOW")) return "LOW";
    return null;
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#FAFBFC]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-teal animate-spin mx-auto mb-3" />
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
          <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-teal" />
          </div>
          <h2 className="text-xl font-bold text-navy mb-2">
            {isReviewMode ? "Review Completed" : t("editor.submittedTitle")}
          </h2>
          <p className="text-sm text-gray-500">
            {isReviewMode
              ? `${allIssues.length} issue${allIssues.length !== 1 ? "s" : ""} flagged. Audit report ready for the client.`
              : t("editor.submittedDesc")}
          </p>
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
          href={`/portal/jobs/${jobId}`}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-navy transition-colors shrink-0"
          data-testid="btn-back"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{t("editor.back")}</span>
        </Link>

        <div className="w-px h-5 bg-gray-200 shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-navy truncate leading-tight">{jobName}</p>
            {isReviewMode && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
                <Bot className="w-3 h-3" /> AI Review Mode
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 leading-tight">{sourceLang} → {targetLang}</p>
        </div>

        {activeIdx >= 0 && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
            <span className="font-semibold text-navy">{activeIdx + 1}</span>
            <span>/</span>
            <span>{segments.length}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs shrink-0">
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1 text-amber-500 font-medium">
              <Loader2 className="w-3 h-3 animate-spin" /> {t("editor.saving")}
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-teal font-medium">
              <Check className="w-3 h-3" /> {t("editor.autoSaved")}
            </span>
          )}
          {saveStatus === "error" && (
            <span className="flex items-center gap-1 text-red-500 font-medium">
              <AlertCircle className="w-3 h-3" /> {t("editor.saveFailed")}
            </span>
          )}
        </div>

        {isReviewMode && allIssues.length > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-bold bg-red-100 text-red-600 px-2.5 py-1 rounded-full">
              {allIssues.filter((i) => i.severity === "CRITICAL").length} critical
            </span>
            <span className="text-xs font-bold bg-amber-100 text-amber-600 px-2.5 py-1 rounded-full">
              {allIssues.length} total
            </span>
          </div>
        )}

        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={submitting}
          data-testid="btn-submit-review"
          className={`text-xs shrink-0 ${isReviewMode ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}`}
        >
          {submitting ? <Loader2 className="w-3.5 h-3.5 me-1.5 animate-spin" /> : (
            isReviewMode ? <Flag className="w-3.5 h-3.5 me-1.5" /> : <Send className="w-3.5 h-3.5 me-1.5" />
          )}
          {isReviewMode ? "Complete Review" : "Mark as Completed"}
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
                    <span className="font-semibold text-navy">{reviewedCount}</span>/{segments.length} segments reviewed
                  </span>
                  <span className="flex items-center gap-1 text-amber-600">
                    <Flag className="w-3 h-3" />
                    <span className="font-semibold">{allIssues.length}</span> issues flagged
                  </span>
                </>
              ) : (
                <>
                  <span>
                    <span className="font-semibold text-navy">{translatedCount}</span>/{segments.length} {t("editor.segmentsTranslated")}
                  </span>
                  {reviewedCount > 0 && (
                    <span className="flex items-center gap-1 text-teal">
                      <CheckCheck className="w-3 h-3" />
                      <span className="font-semibold">{reviewedCount}</span> reviewed
                    </span>
                  )}
                </>
              )}
            </div>
            <span className="text-xs font-bold text-teal">{Math.round(isReviewMode ? reviewedProgress : progress)}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full relative transition-all duration-500"
              style={{
                width: `${isReviewMode ? reviewedProgress : progress}%`,
                background: isReviewMode
                  ? "linear-gradient(90deg, #FF7A59 0%, #e06040 100%)"
                  : "linear-gradient(90deg, #4ECDC4 0%, #3aada5 100%)",
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          {segments.slice(0, Math.min(segments.length, 40)).map((s, i) => {
            const segIssues = issuesBySegment[s.id] ?? [];
            const worst = worstSeverity(segIssues);
            const dotColor = isReviewMode && worst
              ? worst === "CRITICAL" ? "bg-red-500" : worst === "MEDIUM" ? "bg-amber-400" : "bg-teal"
              : isReviewMode && reviewedSegIds.has(s.id)
              ? "bg-navy/40"
              : SEG_DOT_COLOR[s.status] ?? "bg-gray-200";
            return (
              <button
                key={s.id}
                onClick={() => setActiveSegId(s.id)}
                className={`rounded-sm transition-all duration-150 ${
                  s.id === activeSegId
                    ? "w-5 h-2.5 bg-navy ring-2 ring-navy ring-offset-1"
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
          {segments.map((seg, i) => {
            const isActive = seg.id === activeSegId;
            const draft = drafts[seg.id] ?? "";
            const hasDraft = draft.trim().length > 0;
            const isReviewed = isReviewMode
              ? reviewedSegIds.has(seg.id)
              : seg.status === "REVIEWED" || seg.status === "APPROVED";
            const segParts = highlightSource(seg.sourceText);
            const wordCount = draft.trim().split(/\s+/).filter(Boolean).length;
            const segIssues = issuesBySegment[seg.id] ?? [];
            const worst = worstSeverity(segIssues);

            return (
              <div
                key={seg.id}
                ref={(el) => { segRefs.current[i] = el; }}
                className={`rounded-2xl border-2 bg-white overflow-hidden transition-all duration-200 ${
                  isActive
                    ? isReviewMode ? "border-amber-300 shadow-lg shadow-amber-100" : "border-navy shadow-lg shadow-navy/10"
                    : worst === "CRITICAL" ? "border-red-200 hover:border-red-300 cursor-pointer"
                    : worst === "MEDIUM" ? "border-amber-200 hover:border-amber-300 cursor-pointer"
                    : isReviewed ? "border-teal/40 opacity-90 hover:opacity-100 cursor-pointer"
                    : "border-gray-200 hover:border-gray-300 cursor-pointer"
                }`}
                onClick={() => { if (!isActive) { setActiveSegId(seg.id); if (isReviewMode) setReviewedSegIds((prev) => new Set([...prev, seg.id])); } }}
                data-testid={`segment-row-${i}`}
              >
                <div className="flex">
                  {/* Left rail */}
                  <div className={`w-10 shrink-0 flex flex-col items-center pt-3 pb-2 gap-1 border-e transition-colors ${
                    isActive
                      ? isReviewMode ? "border-amber-200 bg-amber-50/50" : "border-navy/20 bg-navy/5"
                      : worst ? "border-red-100 bg-red-50/30"
                      : isReviewed ? "border-teal/20 bg-teal/5"
                      : "border-gray-100 bg-gray-50"
                  }`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all ${
                      worst === "CRITICAL" ? "bg-red-500 text-white shadow-sm"
                      : worst === "MEDIUM" ? "bg-amber-400 text-white"
                      : worst === "LOW" ? "bg-teal text-white"
                      : isReviewed ? "bg-navy/20 text-navy"
                      : hasDraft ? "bg-teal/20 text-teal"
                      : isActive ? "bg-navy/10 text-navy"
                      : "bg-gray-200 text-gray-400"
                    }`}>
                      {worst ? <Flag className="w-3 h-3" /> : isReviewed ? <Eye className="w-3 h-3" /> : i + 1}
                    </div>
                    {segIssues.length > 0 && (
                      <span className="text-[9px] font-bold text-red-500">{segIssues.length}</span>
                    )}
                    {isActive && <div className="w-0.5 flex-1 min-h-[20px] bg-navy/20 rounded-full mt-1" />}
                  </div>

                  {/* Source + Target */}
                  <div className="flex-1 min-w-0">
                    {/* Source text */}
                    <div className={`px-4 py-3 border-b transition-colors ${
                      isActive
                        ? isReviewMode ? "border-amber-100 bg-amber-50/30" : "border-navy/10 bg-navy/[0.02]"
                        : "border-gray-100 bg-gray-50/60"
                    }`}>
                      {isReviewMode && (
                        <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Source</p>
                      )}
                      <p className={`text-sm leading-6 select-text transition-colors ${
                        isActive ? "text-navy font-medium" : "text-gray-500"
                      }`}>
                        {segParts.map((part, j) =>
                          part.isGlossary && part.term ? (
                            <span
                              key={j}
                              className={`px-0.5 rounded cursor-help ${GLOSSARY_COLORS[part.term.color % GLOSSARY_COLORS.length]}`}
                              title={`${part.text} → ${part.term.translation}`}
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
                          <span className="text-[9px] font-bold text-teal uppercase tracking-wider">AI Translation</span>
                          <Bot className="w-3 h-3 text-teal" />
                        </div>
                      )}
                      <textarea
                        value={draft}
                        onChange={(e) => handleDraftChange(seg.id, e.target.value)}
                        onFocus={() => handleSegmentFocus(seg.id)}
                        rows={isActive ? 4 : 2}
                        className={`w-full resize-none text-sm leading-6 focus:outline-none bg-transparent transition-all duration-200 ${
                          isActive
                            ? "text-navy placeholder-gray-300 min-h-[88px]"
                            : hasDraft ? "text-gray-700 cursor-pointer min-h-[44px]"
                            : "text-gray-400 italic cursor-pointer min-h-[44px]"
                        }`}
                        placeholder={isActive
                          ? (isReviewMode ? "AI translation will appear here — edit if needed…" : t("editor.translationPlaceholder"))
                          : hasDraft ? "" : (isReviewMode ? "No AI translation" : "Click to translate…")}
                        dir="auto"
                        readOnly={!isActive}
                        data-testid={`textarea-seg-${i}`}
                      />
                    </div>

                    {/* Footer for active segment */}
                    {isActive && (
                      <div className={`px-4 py-2 border-t flex items-center justify-between ${
                        isReviewMode ? "border-amber-100 bg-amber-50/20" : "border-navy/10 bg-navy/[0.02]"
                      }`}>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400">
                            {draft.length} {t("editor.characters")} · {wordCount} {t("editor.words")}
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
                                  onClick={() => handleRetranslate(seg.id)}
                                  disabled={retrying[seg.id]}
                                  className="text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-60"
                                  data-testid={`btn-retry-ai-${i}`}
                                >
                                  {retrying[seg.id]
                                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Retrying…</>
                                    : <><RefreshCw className="w-3 h-3" /> Retry AI</>}
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
                            <>
                              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLOR[seg.status] ?? STATUS_COLOR.PENDING}`}>
                                {STATUS_LABEL[seg.status] ?? seg.status}
                              </span>
                              <span className="text-[10px] text-gray-400">Focus next to auto-review ↓</span>
                            </>
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
          <div className={`grid border-b border-gray-200 shrink-0 ${isReviewMode ? "grid-cols-3" : "grid-cols-5"}`}>
            {(isReviewMode
              ? [
                  { key: "issues" as const, icon: Flag, label: "Issues", count: activeSegIssues.length },
                  { key: "comments" as const, icon: MessageSquare, label: t("editor.comments"), count: comments.length },
                  { key: "glossary" as const, icon: BookOpen, label: t("editor.glossary"), count: glossaryMatches.length },
                ]
              : [
                  { key: "glossary" as const, icon: BookOpen, label: t("editor.glossary"), count: glossaryMatches.length },
                  { key: "tm" as const, icon: Zap, label: t("editor.tmMatches"), count: tmMatches.length },
                  { key: "comments" as const, icon: MessageSquare, label: t("editor.comments"), count: comments.length },
                  { key: "history" as const, icon: Clock, label: t("editor.history"), count: history.length },
                  { key: "qa" as const, icon: ShieldAlert, label: "QA", count: qaIssueCount },
                ]
            ).map(({ key, icon: Icon, label, count }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-all border-b-2 ${
                  activeTab === key
                    ? isReviewMode
                      ? "border-amber-500 text-amber-600 bg-amber-50"
                      : "border-navy text-navy bg-navy/5"
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
                      activeTab === key ? "bg-navy text-white" : "bg-teal text-white"
                    }`}>{count}</span>
                  )}
                </div>
                <span className="leading-none">{label}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">

            {/* ── Issues tab (review mode) ── */}
            {activeTab === "issues" && isReviewMode && (
              <div className="flex flex-col h-full">
                <div className="p-3 space-y-3 flex-1 overflow-y-auto">

                  {/* Add issue form */}
                  {activeSeg ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2.5">
                      <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                        <Flag className="w-3 h-3" /> Flag Issue — Seg {activeIdx + 1}
                      </p>

                      {/* Category */}
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Category</label>
                        <select
                          value={issueCategory}
                          onChange={(e) => { setIssueCategory(e.target.value); setIssueSubType(""); }}
                          className="w-full text-xs px-2.5 py-2 rounded-lg border border-amber-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 text-navy"
                          data-testid="select-issue-category"
                        >
                          {ISSUE_CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Sub-type */}
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Sub-type</label>
                        <select
                          value={issueSubType}
                          onChange={(e) => setIssueSubType(e.target.value)}
                          className="w-full text-xs px-2.5 py-2 rounded-lg border border-amber-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 text-navy"
                          data-testid="select-issue-subtype"
                        >
                          <option value="">Select sub-type…</option>
                          {(ISSUE_SUBTYPES[issueCategory] ?? []).map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      {/* Severity */}
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

                      {/* Note */}
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Note (optional)</label>
                        <textarea
                          value={issueNote}
                          onChange={(e) => setIssueNote(e.target.value)}
                          rows={2}
                          placeholder="Add context or suggested correction…"
                          className="w-full text-xs px-2.5 py-2 rounded-lg border border-amber-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 text-navy resize-none"
                          data-testid="textarea-issue-note"
                        />
                      </div>

                      <button
                        onClick={addIssue}
                        disabled={!issueSubType || issueSaving}
                        className="w-full text-xs font-bold py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                        data-testid="btn-add-issue"
                      >
                        {issueSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Flag className="w-3 h-3" />}
                        Add Issue
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Flag className="w-7 h-7 text-gray-200 mx-auto mb-2" />
                      <p className="text-xs text-gray-400">Select a segment to flag issues</p>
                    </div>
                  )}

                  {/* Existing issues for this segment */}
                  {activeSegIssues.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1">
                        {activeSegIssues.length} issue{activeSegIssues.length > 1 ? "s" : ""} on this segment
                      </p>
                      {activeSegIssues.map((issue) => {
                        const sevCfg = SEVERITY_CONFIG[issue.severity] ?? SEVERITY_CONFIG.LOW;
                        const catLabel = ISSUE_CATEGORIES.find((c) => c.value === issue.category)?.label ?? issue.category;
                        return (
                          <div key={issue.id} className={`rounded-xl border p-3 ${sevCfg.bg}`} data-testid={`issue-card-${issue.id}`}>
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/70 ${sevCfg.text}`}>
                                  {sevCfg.label}
                                </span>
                                <span className="text-[10px] font-semibold text-navy bg-white/70 px-2 py-0.5 rounded-full">{catLabel}</span>
                              </div>
                              <button
                                onClick={() => deleteIssue(issue.id)}
                                className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                                data-testid={`btn-delete-issue-${issue.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-xs font-semibold text-navy mb-0.5">{issue.subType}</p>
                            {issue.note && <p className="text-[11px] text-gray-600 italic">{issue.note}</p>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* All issues summary */}
                  {allIssues.length > 0 && (
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Job Summary</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                          {allIssues.filter((i) => i.severity === "CRITICAL").length} critical
                        </span>
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">
                          {allIssues.filter((i) => i.severity === "MEDIUM").length} medium
                        </span>
                        <span className="text-[10px] font-bold bg-teal/10 text-teal px-2 py-0.5 rounded-full">
                          {allIssues.filter((i) => i.severity === "LOW").length} low
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Glossary ── */}
            {activeTab === "glossary" && (
              <div className="p-3">
                {glossaryMatches.length === 0 ? (
                  <div className="text-center py-10">
                    <BookOpen className="w-7 h-7 text-gray-200 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">{t("editor.noGlossary")}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
                      {glossaryMatches.length} matches
                    </p>
                    {glossaryMatches.map((g) => (
                      <div key={g.term} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${GLOSSARY_COLORS[g.color % GLOSSARY_COLORS.length]}`}>
                            {g.term}
                          </span>
                          <button
                            onClick={() => {
                              if (!activeSegId) return;
                              const cur = draftsRef.current[activeSegId] ?? "";
                              const next = cur + (cur ? " " : "") + g.translation;
                              draftsRef.current[activeSegId] = next;
                              setDrafts((prev) => ({ ...prev, [activeSegId]: next }));
                              debouncedSave(activeSegId, next);
                            }}
                            className="text-[10px] font-semibold text-teal bg-teal/10 hover:bg-teal/20 px-2 py-1 rounded-lg transition-colors"
                          >
                            {t("editor.insert")}
                          </button>
                        </div>
                        <p className="text-sm font-semibold text-navy" dir="rtl">{g.translation}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── TM ── */}
            {activeTab === "tm" && (
              <div className="p-3">
                {tmMatches.length === 0 ? (
                  <div className="text-center py-10">
                    <Zap className="w-7 h-7 text-gray-200 mx-auto mb-2" />
                    <p className="text-xs text-gray-400 mb-3">{t("editor.noTmMatches")}</p>
                    <button
                      onClick={() => { setActiveTab("glossary"); setTimeout(() => setActiveTab("tm"), 50); }}
                      className="inline-flex items-center gap-1.5 text-xs text-teal hover:underline"
                    >
                      <RefreshCw className="w-3 h-3" /> Refresh
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tmMatches.map((match) => (
                      <div key={match.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            match.matchScore >= 80 ? "bg-teal/10 text-teal" :
                            match.matchScore >= 60 ? "bg-amber-100 text-amber-700" :
                            "bg-gray-100 text-gray-600"
                          }`}>{match.matchScore}{t("editor.match")}</span>
                          <button
                            onClick={() => applyTmMatch(match.targetText)}
                            className="text-[10px] font-semibold text-navy hover:text-teal bg-navy/5 hover:bg-teal/10 px-2 py-1 rounded-lg transition-colors"
                            data-testid={`apply-tm-${match.id}`}
                          >
                            {t("editor.apply")}
                          </button>
                        </div>
                        <p className="text-[11px] text-gray-400 italic mb-1.5">"{match.sourceText.slice(0, 60)}…"</p>
                        <p className="text-sm text-navy font-medium" dir="rtl">{match.targetText}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Comments ── */}
            {activeTab === "comments" && (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {comments.length === 0 ? (
                    <div className="text-center py-10">
                      <MessageSquare className="w-7 h-7 text-gray-200 mx-auto mb-2" />
                      <p className="text-xs text-gray-400">No comments yet</p>
                    </div>
                  ) : (
                    comments.map((c) => (
                      <div key={c.id} className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-navy to-teal flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                          {c.author.name?.slice(0, 2).toUpperCase() ?? "?"}
                        </div>
                        <div className="flex-1 bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                          <div className="flex items-baseline gap-1.5 mb-1">
                            <span className="text-xs font-semibold text-navy">{c.author.name ?? "User"}</span>
                            <span className="text-[9px] text-gray-400">{new Date(c.createdAt).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-xs text-gray-700">{c.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-3 border-t border-gray-100 shrink-0">
                  <div className="flex gap-2">
                    <input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addComment()}
                      placeholder={t("editor.addComment")}
                      className="flex-1 text-xs px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition-colors"
                      data-testid="input-comment"
                    />
                    <button
                      onClick={addComment}
                      disabled={!newComment.trim()}
                      className="w-8 h-8 rounded-xl bg-navy text-white flex items-center justify-center hover:bg-navy/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── History ── */}
            {activeTab === "history" && (
              <div className="p-3">
                {history.length === 0 ? (
                  <div className="text-center py-10">
                    <Clock className="w-7 h-7 text-gray-200 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">{t("editor.noHistory")}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
                      Recent auto-saves
                    </p>
                    {history.map((h, i) => (
                      <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] text-gray-400 font-medium">{h.savedAt}</span>
                          <button
                            onClick={() => {
                              if (!activeSegId) return;
                              draftsRef.current[activeSegId] = h.text;
                              setDrafts((prev) => ({ ...prev, [activeSegId]: h.text }));
                              debouncedSave(activeSegId, h.text);
                            }}
                            className="text-[10px] font-semibold text-teal hover:underline"
                          >
                            {t("editor.restore")}
                          </button>
                        </div>
                        <p className="text-xs text-navy" dir="auto">{h.text || "(empty)"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── QA (translation mode only) ── */}
            {activeTab === "qa" && !isReviewMode && (() => {
              const emptySegs = segments.filter((s) => {
                const draft = drafts[s.id] ?? s.translatedText ?? "";
                return draft.trim() === "";
              });
              const untranslatedSegs = segments.filter((s) => {
                const draft = drafts[s.id] ?? s.translatedText ?? "";
                return draft.trim() !== "" && draft.trim() === s.sourceText.trim();
              });
              const sevConfig: Record<string, { icon: typeof XCircle; color: string; bg: string; badge: string }> = {
                CRITICAL: { icon: XCircle, color: "text-red-500", bg: "bg-red-50 border-red-100", badge: "bg-red-100 text-red-600" },
                MEDIUM: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50 border-amber-100", badge: "bg-amber-100 text-amber-600" },
                LOW: { icon: Info, color: "text-blue-400", bg: "bg-blue-50 border-blue-100", badge: "bg-blue-100 text-blue-600" },
              };
              const totalIssues = qaFlags.length + emptySegs.length + untranslatedSegs.length;

              const rescan = () => {
                setQaScanning(true);
                fetch(`/api/jobs/${jobId}/quality-report`, { method: "POST" })
                  .then((r) => r.ok ? r.json() : null)
                  .then((data) => {
                    if (data) {
                      setQaFlags(data.issues ?? []);
                      setQaScore(data.score ?? null);
                    }
                  })
                  .catch(() => {})
                  .finally(() => setQaScanning(false));
              };

              return (
                <div className="p-3 space-y-3" data-testid="qa-panel">
                  {/* Header row */}
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                    <ShieldAlert className={`w-4 h-4 flex-shrink-0 ${totalIssues > 0 ? "text-amber-500" : "text-teal"}`} />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-navy">
                        {totalIssues === 0 ? "No issues found" : `${totalIssues} issue${totalIssues > 1 ? "s" : ""} detected`}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {qaScore !== null ? `Quality score: ${qaScore}/100` : "Auto QA scan"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {qaScore !== null && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          qaScore >= 90 ? "bg-teal/10 text-teal" :
                          qaScore >= 70 ? "bg-amber-100 text-amber-600" :
                          "bg-red-100 text-red-600"
                        }`}>{qaScore}</span>
                      )}
                      <button
                        onClick={rescan}
                        disabled={qaScanning}
                        className="text-gray-400 hover:text-navy transition-colors disabled:opacity-50"
                        title="Re-run QA scan"
                        data-testid="btn-qa-rescan"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${qaScanning ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                  </div>

                  {/* Real-time draft issues */}
                  {emptySegs.length > 0 && (
                    <div className="rounded-xl border border-red-100 bg-red-50 p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <XCircle className="w-3.5 h-3.5 text-red-500" />
                        <span className="text-[10px] font-bold text-red-600 uppercase tracking-wide">Empty Targets</span>
                      </div>
                      <p className="text-xs text-red-700">{emptySegs.length} segment{emptySegs.length > 1 ? "s" : ""} have no translation yet.</p>
                    </div>
                  )}
                  {untranslatedSegs.length > 0 && (
                    <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">Untranslated</span>
                      </div>
                      <p className="text-xs text-amber-700">{untranslatedSegs.length} segment{untranslatedSegs.length > 1 ? "s" : ""} identical to source.</p>
                    </div>
                  )}

                  {/* Quality engine flags */}
                  {qaFlags.length > 0 && (
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1">Linguistic QA</p>
                  )}
                  {qaFlags.map((flag) => {
                    const cfg = sevConfig[flag.severity] ?? sevConfig.LOW;
                    const SevIcon = cfg.icon;
                    const segRef = flag.segment ? `Seg ${flag.segment.segmentIndex + 1}` : "";
                    return (
                      <div key={flag.id} className={`rounded-xl border p-3 ${cfg.bg}`}>
                        <div className="flex items-start gap-2">
                          <SevIcon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${cfg.color}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${cfg.badge}`}>{flag.subType}</span>
                              {segRef && <span className="text-[10px] text-gray-400">{segRef}</span>}
                            </div>
                            {flag.note && <p className="text-xs text-gray-700 leading-relaxed">{flag.note}</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {totalIssues === 0 && (
                    <div className="text-center py-6">
                      <p className="text-xs text-gray-400">All checks passed</p>
                    </div>
                  )}
                </div>
              );
            })()}

          </div>
        </div>
      </div>
    </div>
  );
}
