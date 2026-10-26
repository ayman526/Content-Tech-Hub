"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bot, FileText, Cpu, CheckCircle,
  Download, ChevronRight, Upload, Zap, Languages,
  BookMarked, List, AlignLeft, Users, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "upload",    label: "Upload",    title: "Drop your document",       subtitle: "PDF, DOCX, PPTX, XLIFF, HTML, JSON" },
  { id: "analyze",   label: "Analyze",   title: "Cento is analyzing...",    subtitle: "Language detection, word count, domain" },
  { id: "languages", label: "Languages", title: "Select target languages",  subtitle: "Each language becomes a parallel job" },
  { id: "workflow",  label: "Workflow",  title: "Choose your workflow",     subtitle: "AI only, AI + human review, or human only" },
  { id: "assets",    label: "Assets",    title: "Add localization assets",  subtitle: "TM, Glossary, Style Guide — optional but powerful" },
  { id: "linguist",  label: "Linguist",  title: "Who reviews the draft?",  subtitle: "Platform linguists, your own team, or AI-only" },
  { id: "processing",label: "Translating",title: "AI is translating...",   subtitle: "Real-time progress across all target languages" },
  { id: "done",      label: "Done",      title: "Ready to download",       subtitle: "PDF, DOCX, PPTX — layout preserved" },
];

const TARGET_LANGS = [
  { code: "AR", label: "Arabic",   flag: "🇸🇦" },
  { code: "FR", label: "French",   flag: "🇫🇷" },
  { code: "DE", label: "German",   flag: "🇩🇪" },
  { code: "JA", label: "Japanese", flag: "🇯🇵" },
  { code: "ES", label: "Spanish",  flag: "🇪🇸" },
  { code: "ZH", label: "Chinese",  flag: "🇨🇳" },
];

const WORKFLOW_OPTIONS = [
  { id: "ai-human", icon: Cpu,       label: "AI Draft + Expert Review", desc: "AI draft reviewed by a certified linguist",    badge: "Recommended", badgeColor: "#FF7A59" },
  { id: "ai-only",  icon: Zap,       label: "AI Only",           desc: "Fastest — for internal or low-stakes content", badge: "Fastest",      badgeColor: "#0091AE" },
  { id: "human",    icon: Languages,  label: "Native Creation",        desc: "Expert linguist — for creative or regulated",  badge: "Premium",      badgeColor: "#6E5BA6" },
];

const LOC_ASSETS = [
  {
    id: "tm",
    icon: BookMarked,
    label: "Translation Memory",
    desc: "Reuse previously approved translations — saves cost and enforces consistency.",
    color: "#0091AE",
    bg: "#E8F5F8",
  },
  {
    id: "glossary",
    icon: List,
    label: "Glossary",
    desc: "Define approved terms (brand names, legal terms, product names) in every language.",
    color: "#FF7A59",
    bg: "#FFF1EC",
  },
  {
    id: "style-guide",
    icon: AlignLeft,
    label: "Style Guide",
    desc: "Set tone-of-voice, formatting rules, and domain-specific guidance for linguists.",
    color: "#6E5BA6",
    bg: "#F0EDFB",
  },
];

const LINGUIST_OPTIONS = [
  {
    id: "platform",
    icon: ShieldCheck,
    label: "Contentech Linguists",
    desc: "Vetted professionals matched by language pair, domain, and content type. ISO 17100 certified.",
    badge: "Recommended",
    badgeColor: "#FF7A59",
    stats: ["300+ certified", "Legal & Technical", "24/7 coverage"],
  },
  {
    id: "own",
    icon: Users,
    label: "Your Own Linguists",
    desc: "Assign from your own team or preferred linguist pool already added to your account.",
    badge: "BYOS",
    badgeColor: "#0091AE",
    stats: ["Your trusted team", "Full control", "Custom rates"],
  },
  {
    id: "ai",
    icon: Cpu,
    label: "AI Only — No Review",
    desc: "Skip the human review step. Fastest turnaround — best for internal or gisting use cases.",
    badge: "Fastest",
    badgeColor: "#99ACC2",
    stats: ["Minutes, not hours", "No reviewer cost", "AI-grade quality"],
  },
];

const PROGRESS_LANGS = [
  { lang: "Arabic",   flag: "🇸🇦" },
  { lang: "French",   flag: "🇫🇷" },
  { lang: "Japanese", flag: "🇯🇵" },
];

/* ── Step screens ── */

function StepUpload() {
  const [dropped, setDropped] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDropped(true), 900);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-5 gap-3">
      <div className={cn(
        "w-full max-w-xs rounded-2xl border-2 border-dashed flex flex-col items-center justify-center py-7 px-4 transition-all duration-500",
        dropped ? "border-[#FF7A59] bg-[#FFF4F0]" : "border-[#CBD6E2] bg-white"
      )}>
        {!dropped ? (
          <>
            <div className="w-11 h-11 rounded-2xl bg-[#F5F8FA] flex items-center justify-center mb-3">
              <Upload className="w-5 h-5 text-[#99ACC2]" />
            </div>
            <p className="text-xs font-semibold text-[#33475B] mb-1">Drop your file here</p>
            <p className="text-[10px] text-[#99ACC2]">PDF · DOCX · PPTX · XLIFF · HTML · JSON</p>
          </>
        ) : (
          <div className="flex items-center gap-3 w-full px-1">
            <div className="w-9 h-9 rounded-xl bg-[#FFF1EC] flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-[#FF7A59]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#33475B] truncate">Q4_Legal_Contract.pdf</p>
              <p className="text-[10px] text-[#99ACC2]">2.4 MB · Uploaded</p>
            </div>
            <CheckCircle className="w-4 h-4 text-[#0091AE] shrink-0" />
          </div>
        )}
      </div>
      <div className="flex gap-1.5 flex-wrap justify-center">
        {["PDF", "DOCX", "PPTX", "XLIFF"].map((f) => (
          <span key={f} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F5F8FA] text-[#99ACC2] border border-[#E5EAF0]">{f}</span>
        ))}
      </div>
    </div>
  );
}

function StepAnalyze() {
  const [phase, setPhase] = useState(0);
  const messages = [
    "Detecting source language...",
    "Counting words: 2,847 found",
    "Classifying domain: Legal",
    "Analysis complete.",
  ];
  useEffect(() => {
    const ts = messages.map((_, i) => setTimeout(() => setPhase(i + 1), i * 600));
    return () => ts.forEach(clearTimeout);
  }, []);
  return (
    <div className="flex-1 flex flex-col justify-center p-5 gap-3">
      <div className="flex gap-3 items-start">
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "#2D3E50" }}>
          <Bot className="w-3.5 h-3.5" style={{ color: "#FF7A59" }} />
        </div>
        <div className="rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-[11px] shadow-sm max-w-xs leading-relaxed"
          style={{ background: "#FFFFFF", border: "1px solid #E5EAF0", color: "#516F90" }}>
          <span className="font-bold" style={{ color: "#FF7A59" }}>Cento is reading your document.</span>
          <div className="mt-1.5 space-y-1">
            {messages.slice(0, phase).map((m, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3 text-[#0091AE] shrink-0" />
                <span>{m}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {phase >= 4 && (
        <div className="rounded-xl p-3 text-xs" style={{ background: "#E8F5F8", border: "1px solid #B2DDE5" }}>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-3.5 h-3.5 text-[#0091AE]" />
            <span className="font-bold text-[#0091AE]">Q4_Legal_Contract.pdf</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[["Source", "English"], ["Words", "2,847"], ["Domain", "Legal"]].map(([k, v]) => (
              <div key={k}>
                <p className="text-[9px] text-[#99ACC2] uppercase tracking-wider">{k}</p>
                <p className="font-semibold text-[#33475B]">{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StepLanguages() {
  const [selected, setSelected] = useState<string[]>(["AR", "FR", "JA"]);
  return (
    <div className="flex-1 flex flex-col justify-center p-5 gap-2.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#99ACC2]">Target languages</p>
      <div className="grid grid-cols-2 gap-1.5">
        {TARGET_LANGS.map((lang) => {
          const isOn = selected.includes(lang.code);
          return (
            <button key={lang.code}
              onClick={() => setSelected((s) => s.includes(lang.code) ? s.filter((c) => c !== lang.code) : [...s, lang.code])}
              className={cn("flex items-center gap-2 px-2.5 py-2 rounded-xl border text-left transition-all text-xs font-medium",
                isOn ? "border-[#0091AE] bg-[#E8F5F8] text-[#0091AE]" : "border-[#E5EAF0] bg-white text-[#516F90] hover:border-[#CBD6E2]"
              )}>
              <span className="text-sm leading-none">{lang.flag}</span>
              <span className="flex-1 truncate">{lang.label}</span>
              {isOn && <CheckCircle className="w-3 h-3 shrink-0" />}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-[#99ACC2]">{selected.length} language{selected.length !== 1 ? "s" : ""} selected — each is a parallel job.</p>
    </div>
  );
}

function StepWorkflow() {
  const [selected, setSelected] = useState("ai-human");
  return (
    <div className="flex-1 flex flex-col justify-center p-5 gap-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#99ACC2] mb-0.5">Translation workflow</p>
      {WORKFLOW_OPTIONS.map((opt) => {
        const isOn = selected === opt.id;
        const Icon = opt.icon;
        return (
          <button key={opt.id} onClick={() => setSelected(opt.id)}
            className={cn("flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all",
              isOn ? "border-[#FF7A59] bg-[#FFF4F0]" : "border-[#E5EAF0] bg-white hover:border-[#CBD6E2]"
            )}>
            <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
              isOn ? "bg-[#FF7A59]" : "bg-[#F5F8FA]")}>
              <Icon className={cn("w-3 h-3", isOn ? "text-white" : "text-[#99ACC2]")} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={cn("text-xs font-semibold", isOn ? "text-[#33475B]" : "text-[#516F90]")}>{opt.label}</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0" style={{ background: opt.badgeColor }}>{opt.badge}</span>
              </div>
              <p className="text-[10px] text-[#99ACC2] leading-snug">{opt.desc}</p>
            </div>
            {isOn && <CheckCircle className="w-3.5 h-3.5 text-[#FF7A59] shrink-0 mt-0.5" />}
          </button>
        );
      })}
    </div>
  );
}

function StepLocAssets() {
  const [enabled, setEnabled] = useState<string[]>(["tm", "glossary"]);
  return (
    <div className="flex-1 flex flex-col justify-center p-5 gap-2">
      <div className="flex items-center justify-between mb-0.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#99ACC2]">Localization assets</p>
        <button onClick={() => setEnabled([])} className="text-[10px] text-[#99ACC2] hover:text-[#516F90] transition-colors">Skip all</button>
      </div>
      {LOC_ASSETS.map(({ id, icon: Icon, label, desc, color, bg }) => {
        const isOn = enabled.includes(id);
        return (
          <button key={id} onClick={() => setEnabled((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id])}
            className={cn("flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all",
              isOn ? "border-[#E5EAF0] bg-white" : "border-[#E5EAF0] bg-[#F5F8FA] opacity-60"
            )}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: isOn ? bg : "#EAECEE" }}>
              <Icon className="w-3.5 h-3.5" style={{ color: isOn ? color : "#99ACC2" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-semibold text-[#33475B]">{label}</span>
                <div className={cn("w-8 h-4 rounded-full flex items-center transition-all shrink-0 ml-2",
                  isOn ? "justify-end pr-0.5" : "justify-start pl-0.5"
                )} style={{ background: isOn ? color : "#CBD6E2" }}>
                  <div className="w-3 h-3 rounded-full bg-white shadow-sm" />
                </div>
              </div>
              <p className="text-[10px] text-[#99ACC2] leading-snug">{desc}</p>
            </div>
          </button>
        );
      })}
      <p className="text-[10px] text-[#99ACC2]">
        {enabled.length === 0 ? "No assets attached — you can add them later." : `${enabled.length} asset${enabled.length > 1 ? "s" : ""} attached — Cento will apply them automatically.`}
      </p>
    </div>
  );
}

function StepLinguist() {
  const [selected, setSelected] = useState("platform");
  return (
    <div className="flex-1 flex flex-col justify-center p-5 gap-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#99ACC2] mb-0.5">Linguist assignment</p>
      {LINGUIST_OPTIONS.map((opt) => {
        const isOn = selected === opt.id;
        const Icon = opt.icon;
        return (
          <button key={opt.id} onClick={() => setSelected(opt.id)}
            className={cn("flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all",
              isOn ? "border-[#FF7A59] bg-[#FFF4F0]" : "border-[#E5EAF0] bg-white hover:border-[#CBD6E2]"
            )}>
            <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
              isOn ? "bg-[#FF7A59]" : "bg-[#F5F8FA]")}>
              <Icon className={cn("w-3 h-3", isOn ? "text-white" : "text-[#99ACC2]")} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={cn("text-xs font-semibold", isOn ? "text-[#33475B]" : "text-[#516F90]")}>{opt.label}</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0" style={{ background: opt.badgeColor }}>{opt.badge}</span>
              </div>
              <p className="text-[10px] text-[#99ACC2] leading-snug mb-1.5">{opt.desc}</p>
              {isOn && (
                <div className="flex flex-wrap gap-1">
                  {opt.stats.map((s) => (
                    <span key={s} className="text-[9px] font-medium px-1.5 py-0.5 rounded-full border text-[#516F90] border-[#CBD6E2] bg-[#F5F8FA]">{s}</span>
                  ))}
                </div>
              )}
            </div>
            {isOn && <CheckCircle className="w-3.5 h-3.5 text-[#FF7A59] shrink-0 mt-0.5" />}
          </button>
        );
      })}
    </div>
  );
}

function StepProcessing() {
  const [pcts, setPcts] = useState([0, 0, 0]);
  useEffect(() => {
    const targets = [100, 78, 43];
    const id = setInterval(() =>
      setPcts((prev) => prev.map((p, i) => p < targets[i] ? Math.min(p + 3, targets[i]) : p)),
      40
    );
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex-1 flex flex-col justify-center p-5 gap-3">
      <div className="flex gap-3 items-start mb-1">
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 animate-pulse" style={{ background: "#2D3E50" }}>
          <Bot className="w-3.5 h-3.5" style={{ color: "#FF7A59" }} />
        </div>
        <div className="rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs shadow-sm"
          style={{ background: "#FFFFFF", border: "1px solid #E5EAF0", color: "#516F90" }}>
          Translating across <span className="font-bold text-[#0091AE]">3 languages</span> in parallel...
        </div>
      </div>
      <div className="space-y-3">
        {PROGRESS_LANGS.map(({ lang, flag }, i) => (
          <div key={lang}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-[#33475B] flex items-center gap-1.5">
                <span>{flag}</span>{lang}
              </span>
              <span className="text-[10px] text-[#99ACC2]">{pcts[i]}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#E5EAF0] overflow-hidden">
              <div className="h-full rounded-full transition-all duration-75"
                style={{ width: `${pcts[i]}%`, background: pcts[i] === 100 ? "#0091AE" : "#FF7A59" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepDone() {
  return (
    <div className="flex-1 flex flex-col justify-center p-5 gap-3">
      <div className="flex flex-col items-center text-center mb-1">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-2" style={{ background: "#E8F5F8" }}>
          <CheckCircle className="w-6 h-6 text-[#0091AE]" />
        </div>
        <p className="text-sm font-bold text-[#33475B]">Translation complete</p>
        <p className="text-[10px] text-[#99ACC2]">Q4_Legal_Contract.pdf · 3 languages · 2,847 words</p>
      </div>
      <div className="space-y-1.5">
        {[
          { lang: "Arabic",   flag: "🇸🇦" },
          { lang: "French",   flag: "🇫🇷" },
          { lang: "Japanese", flag: "🇯🇵" },
        ].map(({ lang, flag }) => (
          <div key={lang} className="flex items-center justify-between px-3 py-2 rounded-xl"
            style={{ background: "#F5F8FA", border: "1px solid #E5EAF0" }}>
            <div className="flex items-center gap-2">
              <span className="text-sm">{flag}</span>
              <div>
                <p className="text-xs font-semibold text-[#33475B]">{lang}</p>
                <p className="text-[10px] text-[#99ACC2]">PDF + DOCX</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-semibold text-[#0091AE] cursor-pointer hover:text-[#007A94] transition-colors">
              <Download className="w-3 h-3" />
              Download
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const STEP_SCREENS = [StepUpload, StepAnalyze, StepLanguages, StepWorkflow, StepLocAssets, StepLinguist, StepProcessing, StepDone];
const STEP_DURATIONS = [2800, 3200, 3500, 3500, 3800, 3800, 3500, 3500];

export default function HeroWizardDemo() {
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const advance = useCallback(() => {
    setStep((s) => (s + 1) % STEPS.length);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const t = setTimeout(advance, STEP_DURATIONS[step]);
    return () => clearTimeout(t);
  }, [step, isPlaying, advance]);

  const Screen = STEP_SCREENS[step];

  return (
    <div className="relative w-full max-w-lg mx-auto lg:mx-0 select-none">
      <div className="absolute -inset-4 rounded-3xl blur-2xl pointer-events-none opacity-40"
        style={{ background: "radial-gradient(ellipse at 60% 40%, rgba(0,145,174,0.25) 0%, rgba(255,122,89,0.12) 60%, transparent 80%)" }} />

      <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-[#CBD6E2]"
        style={{ boxShadow: "0 24px 64px rgba(45,62,80,0.20), 0 0 0 1px rgba(203,214,226,0.5)" }}>

        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "#2D3E50" }}>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.18)" }} />
            ))}
          </div>
          <div className="flex-1 mx-3 rounded-md px-3 py-1 text-[10px] text-center"
            style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
            app.contentech.ai / new-order
          </div>
        </div>

        {/* App chrome */}
        <div className="flex" style={{ minHeight: 420, background: "#F5F8FA" }}>
          {/* Main area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Progress stepper */}
            <div className="px-3 py-2.5 border-b flex items-center" style={{ background: "#FFFFFF", borderColor: "#E5EAF0" }}>
              <div className="flex items-center flex-1 min-w-0">
                {STEPS.map((s, i) => (
                  <button key={s.id} onClick={() => { setStep(i); setIsPlaying(false); }}
                    className="flex items-center shrink-0">
                    <div className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center font-bold transition-all",
                      i < step ? "bg-[#0091AE] text-white" : i === step ? "bg-[#FF7A59] text-white" : "bg-[#E5EAF0] text-[#99ACC2]"
                    )} style={{ fontSize: 8 }}>
                      {i < step ? <CheckCircle className="w-2.5 h-2.5" /> : i + 1}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={cn("h-px shrink-0 transition-all", i < step ? "bg-[#0091AE]" : "bg-[#E5EAF0]")}
                        style={{ width: 8 }} />
                    )}
                  </button>
                ))}
              </div>
              <span className="text-[10px] font-medium text-[#99ACC2] ml-2 shrink-0">{STEPS[step].label}</span>
            </div>

            {/* Step title */}
            <div className="px-4 py-2 border-b" style={{ background: "#FFFFFF", borderColor: "#E5EAF0" }}>
              <p className="text-xs font-bold text-[#33475B]">{STEPS[step].title}</p>
              <p className="text-[10px] text-[#99ACC2]">{STEPS[step].subtitle}</p>
            </div>

            {/* Step content */}
            <Screen key={step} />

            {/* Bottom bar */}
            <div className="px-4 py-2.5 border-t flex items-center justify-between" style={{ background: "#FFFFFF", borderColor: "#E5EAF0" }}>
              <button
                onClick={() => { setStep((s) => Math.max(0, s - 1)); setIsPlaying(false); }}
                className="text-[11px] text-[#99ACC2] hover:text-[#516F90] transition-colors disabled:opacity-30"
                disabled={step === 0}
              >
                Back
              </button>
              <button
                onClick={() => { advance(); setIsPlaying(false); }}
                className="flex items-center gap-1 text-[11px] font-semibold text-white px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
                style={{ background: step === STEPS.length - 1 ? "#0091AE" : "#FF7A59" }}
              >
                {step === STEPS.length - 1 ? "Start over" : "Next"}
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dots + pause */}
      <div className="flex items-center justify-center gap-3 mt-3">
        <button onClick={() => setIsPlaying((p) => !p)}
          className="text-[11px] font-medium transition-colors" style={{ color: "#99ACC2" }}>
          {isPlaying ? "Pause" : "Resume"} demo
        </button>
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <button key={i} onClick={() => { setStep(i); setIsPlaying(false); }}
              className={cn("rounded-full transition-all", i === step ? "w-4 h-2" : "w-2 h-2")}
              style={{ background: i === step ? "#FF7A59" : "#CBD6E2" }} />
          ))}
        </div>
      </div>
    </div>
  );
}
