import Link from "next/link";
import type { Metadata } from "next";
import {
  Lock, FileText, Database, Briefcase, Zap, Activity,
  Globe2, Server, CheckCircle, UserCheck, Clock,
  ArrowRight, ChevronRight, ShieldCheck,
} from "lucide-react";
import MarketingNav from "@/components/marketing/nav";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Quality Engine — How Contentech Guarantees Translation Accuracy",
  description:
    "Explore all 11 interlocking quality mechanisms built into every Contentech translation job: DNT enforcement, glossary injection, TM matching, context windows, LLM routing, human review, and more.",
};

const LAYERS = [
  {
    num: 1,
    icon: Lock,
    iconColor: "text-red-400",
    iconBg: "bg-red-400/10",
    badge: "mandatory",
    badgeStyle: { background: "rgba(239,68,68,0.12)", color: "#F87171" },
    title: "Do-Not-Translate Fast-Path",
    tagline: "Highest-priority protection — no model call, no risk.",
    body: "Certain terms must never be translated: brand names, product codes, legal entity names, scientific nomenclature, and proprietary identifiers. Contentech maintains a Do-Not-Translate list per project. Any segment whose entire text matches a DNT entry is copied verbatim and never sent to the LLM — zero model call, zero hallucination risk, zero cost. This is the unconditional top-priority rule; nothing else in the pipeline can override it.",
    detail: "DNT entries are sourced from your project Glossary (any term with the doNotTranslate flag set). They are matched at segment level on exact trimmed text.",
  },
  {
    num: 2,
    icon: FileText,
    iconColor: "text-[#FF7A59]",
    iconBg: "bg-[#FF7A59]/10",
    badge: "mandatory",
    badgeStyle: { background: "rgba(255,122,89,0.12)", color: "#FF7A59" },
    title: "Glossary Enforcement",
    tagline: "Exact translations for every approved term — no synonyms, no exceptions.",
    body: "Every project carries a glossary of approved term–translation pairs. Before each segment is translated, all relevant glossary entries are injected into the system prompt at the highest non-DNT priority. The model is instructed to use these exact translations — no paraphrasing, no contextual alternatives, no synonyms. A keepUppercase flag preserves casing when the same term appears in different cases across the document. Glossary entries can be imported from CSV, TSV, XLSX, or TMX files.",
    detail: "Glossary is loaded per job and filtered to terms relevant to the source language. It is injected as a structured priority block before any other prompt content.",
  },
  {
    num: 3,
    icon: Database,
    iconColor: "text-[#00BDA5]",
    iconBg: "bg-[#00BDA5]/10",
    badge: "automatic",
    badgeStyle: { background: "rgba(0,189,165,0.12)", color: "#00BDA5" },
    title: "Translation Memory",
    tagline: "Approved translations reused instantly — exact matches bypass the LLM entirely.",
    body: "Each project accumulates a Translation Memory of previously approved segment translations. Before translating any segment, up to 20 TM entries are loaded and ordered by usage frequency. Segments that exactly match a TM entry are used verbatim with no LLM call — guaranteeing consistency and saving cost. Partial matches are presented to the model as high-confidence reference examples, guiding phrasing, register, and terminology continuity across long documents.",
    detail: "TM is loaded per job and scored by exact match first, then fuzzy match percentage. Entries are ordered by usage count so the most battle-tested translations surface first.",
  },
  {
    num: 4,
    icon: Briefcase,
    iconColor: "text-[#A78BFA]",
    iconBg: "bg-[#6E5BA6]/10",
    badge: "contextual",
    badgeStyle: { background: "rgba(110,91,166,0.12)", color: "#A78BFA" },
    title: "Style Guides",
    tagline: "Brand voice and register enforced across every segment.",
    body: "A legal contract demands formal register and passive constructions. A marketing campaign needs dynamic, first-person energy. A medical IFU requires clinically precise phrasing. Project-level Style Guides define tone, register, formatting conventions, and brand-specific language rules. Multiple guides are combined (up to 2,000 characters) and injected into every segment's system prompt. They sit below DNT, Glossary, and TM in priority — meaning they shape style and voice without ever overriding approved terminology.",
    detail: "Style guides can be authored manually or generated from a URL using Cento, the AI assistant. They are attached per project and automatically activated on every job.",
  },
  {
    num: 5,
    icon: Zap,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-400/10",
    badge: "automatic",
    badgeStyle: { background: "rgba(251,191,36,0.12)", color: "#FCD34D" },
    title: "Document Terminology Pre-scan",
    tagline: "Zero-cost consistency scan before the first LLM call.",
    body: "Before any LLM call is made, Contentech runs a zero-cost in-process scan over every segment in the document. It extracts all 1–4-word n-gram candidates, counts how many distinct segments each candidate appears in, filters to terms present in at least two segments, removes sub-phrases dominated by longer phrases, and returns the top 30 by segment frequency. These terms are injected into every segment's system prompt as a mandatory consistency block — the model is explicitly told to translate each recurring term the same way throughout the entire document. No manual setup required; it runs automatically on every job.",
    detail: "The pre-scan runs entirely in-process before the first API call, adding zero latency. It is document-scoped, so recurring terms within the same document are always consistent — even when they don't appear in the glossary.",
  },
  {
    num: 6,
    icon: Activity,
    iconColor: "text-sky-400",
    iconBg: "bg-sky-400/10",
    badge: "automatic",
    badgeStyle: { background: "rgba(56,189,248,0.12)", color: "#38BDF8" },
    title: "Sliding Context Window (±2)",
    tagline: "Every segment translated with awareness of what comes before and after.",
    body: "Translation coherence breaks when each segment is processed in isolation. Contentech gives every segment visibility into its two preceding and two following segments as labelled [CONTEXT] blocks. The model translates only the marked [TARGET] segment but uses the surrounding text for pronoun agreement, register continuity, and terminology consistency. Table cells are restricted to context from within the same table to prevent column-header confusion bleeding into cell translations. Document-level headers and footers are translated independently to avoid their register infecting body text.",
    detail: "Context blocks are built at runtime from the full ordered segment list. Table cells look up siblings by matching tableId. Headers and footers are identified by blockType metadata captured during PDF extraction.",
  },
  {
    num: 7,
    icon: Globe2,
    iconColor: "text-[#A78BFA]",
    iconBg: "bg-[#6E5BA6]/10",
    badge: "contextual",
    badgeStyle: { background: "rgba(110,91,166,0.12)", color: "#A78BFA" },
    title: "Business & Brand Context",
    tagline: "Domain fluency without ever overriding higher-priority rules.",
    body: "Enterprise clients bring their own brand voice, industry specialisation, and product terminology. Contentech accepts an optional website URL, industry sector, and brand biography per organisation and per client account. These are injected as a sandboxed UNTRUSTED REFERENCE block — the model can adapt its register, domain framing, and tone, but the block is explicitly labelled as low-priority so it cannot override glossary terms, DNT entries, TM matches, or style guides above it in the chain. Client-account context always wins over organisation-level context when both are populated.",
    detail: "Business context is sanitised server-side: control characters are stripped and fields are length-capped (URL ≤300, industry ≤120, bio ≤1500 chars). It is injected after all higher-priority assets.",
  },
  {
    num: 8,
    icon: Server,
    iconColor: "text-[#FF7A59]",
    iconBg: "bg-[#FF7A59]/10",
    badge: "automatic",
    badgeStyle: { background: "rgba(255,122,89,0.12)", color: "#FF7A59" },
    title: "Domain-Smart LLM Routing",
    tagline: "The right model for every document type, with automatic failover.",
    body: "Not every language model performs equally across domains. A model optimised for marketing copy may produce fluent but imprecise output for a legal contract. Contentech's routing engine analyses the detected document type — Legal, Medical, Financial, Technical, Marketing, or General — and routes each job to the provider and model best suited for that domain, following a configurable priority-ordered rule chain. If the primary provider is unreachable or returns an error, automatic fallback chains ensure continuity across OpenAI, Anthropic, Google Gemini, Cohere, and Moonshot.",
    detail: "Document type is detected at upload time by the AI analysis step. Routing rules are configurable per workspace from the Admin → AI Configuration panel. Each rule carries conditions (language pair, domain, client tier) and a policy (model + fallback chain).",
  },
  {
    num: 9,
    icon: CheckCircle,
    iconColor: "text-[#00BDA5]",
    iconBg: "bg-[#00BDA5]/10",
    badge: "automatic",
    badgeStyle: { background: "rgba(0,189,165,0.12)", color: "#00BDA5" },
    title: "Built-in Prompt QC Checklist",
    tagline: "The model self-verifies quality before producing any output.",
    body: "Every translation prompt ends with an explicit quality checklist the model must verify before producing output. The checklist covers: Has the approved glossary been applied correctly? Are all protected terms (DNT entries, placeholders, codes) intact and unchanged? Is the full meaning preserved with no omissions, additions, or distortions? Is the output fluent and natural-sounding in the target language? Are all formatting elements — markdown, HTML tags, placeholders, number and date formats — preserved correctly? This self-verification step materially reduces hallucination rates and formatting errors without any added runtime overhead.",
    detail: "The QC checklist is hardcoded at the end of every system prompt and cannot be disabled. It is a zero-cost addition that consistently outperforms equivalent post-processing checks.",
  },
  {
    num: 10,
    icon: UserCheck,
    iconColor: "text-[#C9A227]",
    iconBg: "bg-[#C9A227]/10",
    badge: "certified",
    badgeStyle: { background: "rgba(201,162,39,0.15)", color: "#C9A227" },
    title: "Human Linguist Review",
    tagline: "AI speed. Human certification. Every time.",
    body: "AI speed without human accountability is not enterprise-grade. Every Contentech job passes through a certified linguist in the built-in CAT editor. The editor presents source and target side-by-side with glossary terms highlighted, TM matches surfaced inline, and segment-by-segment approval or rejection controls. Linguists can add inline comments, flag segments for rework, and track changes across revision rounds. Only after human sign-off does a job status advance to Complete — ensuring every delivered file carries individual human certification.",
    detail: "The CAT editor supports RTL languages, inline glossary lookups, comment threads, and full revision history. It is accessible from the Linguist Portal and requires no local software installation.",
  },
  {
    num: 11,
    icon: Clock,
    iconColor: "text-[#00BDA5]",
    iconBg: "bg-[#00BDA5]/10",
    badge: "automatic",
    badgeStyle: { background: "rgba(0,189,165,0.12)", color: "#00BDA5" },
    title: "TM Auto-Population",
    tagline: "Every approved segment grows the project memory — automatically.",
    body: "Approved translations don't stay locked inside a single job. Every segment that a linguist approves is automatically written back into the project's Translation Memory. The next job that touches the same or similar content benefits immediately: exact matches bypass the LLM at zero cost, and partial matches accelerate the human review step with high-confidence suggestions. Over time, every project's TM grows into a precision asset that compounds quality and reduces cost with each translation cycle — with no manual maintenance, exports, or imports required.",
    detail: "TM auto-population fires on segment approval in the CAT editor and on job completion via the complete-review API. Entries are stored with language pair, usage count, and creation timestamp.",
  },
];

const PRIORITY_CHAIN = [
  { num: 1, label: "DNT List", color: "#F87171", bg: "rgba(239,68,68,0.12)" },
  { num: 2, label: "Glossary", color: "#FF7A59", bg: "rgba(255,122,89,0.12)" },
  { num: 3, label: "TM Exact / Partial", color: "#00BDA5", bg: "rgba(0,189,165,0.12)" },
  { num: 4, label: "Style Guide", color: "#A78BFA", bg: "rgba(110,91,166,0.12)" },
  { num: 5, label: "Brand Context", color: "#38BDF8", bg: "rgba(56,189,248,0.12)" },
  { num: 6, label: "Best Practice", color: "#94A3B8", bg: "rgba(255,255,255,0.06)" },
];

export default async function QualityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as "en" | "ar";
  const isRtl = locale === "ar";

  return (
    <main className="min-h-screen bg-white" dir={isRtl ? "rtl" : "ltr"}>
      <MarketingNav locale={locale} />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-20 px-6" style={{ background: "#1E3A5F" }}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6"
            style={{ background: "rgba(78,205,196,0.12)", color: "#4ECDC4", border: "1px solid rgba(78,205,196,0.25)" }}>
            <ShieldCheck className="w-3.5 h-3.5" />
            Quality Engine
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            11 layers of quality.<br />
            <span style={{ color: "#4ECDC4" }}>Built into every job.</span>
          </h1>
          <p className="text-xl max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
            Enterprise translation isn&apos;t just about choosing the right AI model.
            It&apos;s about a system of interlocking guarantees that compound across every
            segment, every document, every cycle.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/register">
              <Button size="lg" className="font-semibold text-white border-0" style={{ background: "#FF7A59" }}>
                Start FREE <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="hover:bg-white/10"
                style={{ borderColor: "rgba(255,255,255,0.2)", color: "#fff" }}>
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Priority Chain ────────────────────────────────────────────────── */}
      <section className="py-12 px-6" style={{ background: "#2D3E50" }}>
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest mb-6 text-center" style={{ color: "rgba(255,255,255,0.4)" }}>
            Term enforcement priority chain — higher always wins
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {PRIORITY_CHAIN.map(({ num, label, color, bg }, idx) => (
              <div key={num} className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full"
                  style={{ background: bg, border: `1px solid ${color}30` }}>
                  <span className="text-[10px] font-black tabular-nums w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: color, color: "#1a1a2e" }}>{num}</span>
                  <span className="text-sm font-semibold whitespace-nowrap" style={{ color }}>{label}</span>
                </div>
                {idx < PRIORITY_CHAIN.length - 1 && (
                  <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.2)" }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── All 11 layers ─────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-16">
            {LAYERS.map(({ num, icon: Icon, iconColor, iconBg, badge, badgeStyle, title, tagline, body, detail }) => (
              <div key={num} className="group">
                <div className="flex items-start gap-6">
                  {/* Number + icon column */}
                  <div className="flex flex-col items-center gap-2 flex-shrink-0 pt-1">
                    <div className={`w-12 h-12 ${iconBg} rounded-2xl flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${iconColor}`} />
                    </div>
                    <span className="text-xs font-black tabular-nums" style={{ color: "#CBD6E2" }}>
                      {String(num).padStart(2, "0")}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h2 className="text-xl font-bold" style={{ color: "#33475B" }}>{title}</h2>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                        style={badgeStyle}>{badge}</span>
                    </div>
                    <p className="text-sm font-semibold mb-3 italic" style={{ color: "#0091AE" }}>{tagline}</p>
                    <p className="text-base leading-relaxed mb-4" style={{ color: "#516F90" }}>{body}</p>
                    <div className="rounded-xl px-4 py-3 text-sm leading-relaxed"
                      style={{ background: "#F5F8FA", color: "#516F90", borderLeft: "3px solid #CBD6E2" }}>
                      <span className="font-semibold" style={{ color: "#33475B" }}>Implementation note: </span>
                      {detail}
                    </div>
                  </div>
                </div>

                {/* Divider */}
                {num < 11 && (
                  <div className="mt-16 border-t border-gray-100" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6" style={{ background: "#1E3A5F" }}>
        <div className="max-w-3xl mx-auto text-center">
          <p className="font-semibold text-sm uppercase tracking-widest mb-4" style={{ color: "#4ECDC4" }}>
            See it in action
          </p>
          <h2 className="text-4xl font-bold text-white mb-5">
            All 11 layers. Every job. No configuration required.
          </h2>
          <p className="text-lg mb-10" style={{ color: "rgba(255,255,255,0.6)" }}>
            Upload a document and watch the Quality Engine run — DNT protection, glossary injection,
            terminology pre-scan, context windows, and human review in one seamless workflow.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="font-semibold text-white border-0" style={{ background: "#FF7A59" }}>
                Start FREE — no credit card <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/contact-sales">
              <Button size="lg" variant="outline" className="hover:bg-white/10"
                style={{ borderColor: "rgba(255,255,255,0.2)", color: "#fff" }}>
                Talk to Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer note ───────────────────────────────────────────────────── */}
      <div className="py-8 px-6 text-center border-t border-gray-100">
        <Link href={`/${locale}`} className="text-sm font-medium hover:underline" style={{ color: "#0091AE" }}>
          ← Back to homepage
        </Link>
      </div>
    </main>
  );
}
