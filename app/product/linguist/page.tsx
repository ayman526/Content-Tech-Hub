import Link from "next/link";
import {
  ArrowRight, Languages, CheckCircle, Building2, Briefcase,
  Inbox, BookOpen, MessageSquare, Star, Shield, BarChart2,
  FileText, ChevronRight, Clock, Edit3, Zap,
} from "lucide-react";
import MarketingNav from "@/components/marketing/nav";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Product for Linguists — Professional Content Workspace | Contentech",
  description:
    "Accept assignments, review AI drafts, access TM and glossaries, collaborate with comments, and deliver work inside a structured professional content platform.",
};

const TASK_LIFECYCLE = [
  {
    step: "01",
    title: "Receive and review assignments",
    body: "New tasks appear in your inbox with full context: source document, target language, client notes, style guide, and estimated delivery time. Accept or decline with one action.",
    icon: Inbox,
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    step: "02",
    title: "Work in the content editor",
    body: "Open the side-by-side editor with source and target panels. AI drafts are pre-populated where available — review, refine, or replace segment by segment.",
    icon: Edit3,
    color: "text-orange-500",
    bg: "bg-orange-50",
  },
  {
    step: "03",
    title: "Use context and reference assets",
    body: "Access TM matches, glossary terms, and style guide rules directly in the editor. Color-coded glossary highlights and TM suggestions appear alongside your work.",
    icon: BookOpen,
    color: "text-teal-500",
    bg: "bg-teal-50",
  },
  {
    step: "04",
    title: "Submit and collaborate",
    body: "Submit completed segments or full documents for client review. Add comments per segment, respond to reviewer feedback, and track revision history in context.",
    icon: MessageSquare,
    color: "text-green-600",
    bg: "bg-green-50",
  },
];

const EDITOR_FEATURES = [
  {
    icon: Inbox,
    title: "Task dashboard",
    body: "One inbox for all your assignments across customers and agencies. Filter by language, deadline, workflow type, or status. No juggling spreadsheets or emails.",
  },
  {
    icon: Clock,
    title: "Accept or decline assignments",
    body: "Transparent task details before you commit — language pair, word count, deadline, workflow type, and any client notes attached at project creation.",
  },
  {
    icon: Zap,
    title: "AI draft review",
    body: "AI-translated segments are presented as editable drafts — not raw machine output. Review, correct, and approve at the segment level with full original context visible.",
  },
  {
    icon: BookOpen,
    title: "Shared TM and glossary access",
    body: "Translation memory matches and glossary terms are surfaced in-editor without switching tools. See match scores, alternative translations, and enforced do-not-translate terms.",
  },
  {
    icon: FileText,
    title: "Style guide and reference files",
    body: "Access client style guides, reference documents, and project notes directly inside your workspace. Consistent voice and tone are maintained from the first segment.",
  },
  {
    icon: MessageSquare,
    title: "Revision and comment workflow",
    body: "Reviewers leave comments at the segment level. You receive notified of feedback, respond in context, and revise without leaving the editor.",
  },
  {
    icon: BarChart2,
    title: "Delivery and progress tracking",
    body: "Track your completion percentage per document, per job, and across your active workload. Submit individual segments or entire documents when ready.",
  },
  {
    icon: Shield,
    title: "Role-based permissions",
    body: "You see only your assigned tasks and their associated assets. Project configuration, client data, and other linguists' assignments are never exposed across role boundaries.",
  },
];

const QUALITY_POINTS = [
  "Segment-level history with before/after revision visibility",
  "TM contribution after accepted translations",
  "Glossary match enforcement with inline alerts",
  "Comment threads anchored to specific segments",
  "Delivery confirmation with immutable submission timestamp",
  "Quality score tracking across your assignments",
];

export default function ProductLinguistPage() {
  return (
    <main className="min-h-screen bg-[#FAFBFC]">
      <MarketingNav />

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-violet-50/60 to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto relative">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
              <Languages className="w-5 h-5 text-violet-600" />
            </div>
            <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#7C3AED" }}>
              Product for Linguists
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight" style={{ color: "#33475B" }}>
            Professional tools.<br />
            <span style={{ color: "#0091AE" }}>Structured workflows.</span>
          </h1>

          <p className="text-xl max-w-2xl mb-10 leading-relaxed" style={{ color: "#516F90" }}>
            Contentech gives linguists and reviewers a purpose-built workspace — task inbox, AI draft review, in-context TM and glossary, revision handling, and delivery tracking — inside a single professional environment.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link href="/linguist-register">
              <Button size="lg" className="text-white border-0 shadow-sm" style={{ background: "#7C3AED" }} data-testid="btn-linguist-join">
                Join as a Linguist
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/linguist-login">
              <Button size="lg" variant="outline" data-testid="btn-linguist-portal">
                Access Linguist Portal
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap gap-8 text-sm mt-14 pt-8 border-t border-gray-200" style={{ color: "#516F90" }}>
            {[
              { stat: "Side-by-side", label: "CAT editor" },
              { stat: "In-context", label: "TM and glossary" },
              { stat: "Segment-level", label: "Comment and revision" },
              { stat: "Full", label: "Delivery tracking" },
            ].map(({ stat, label }) => (
              <div key={label}>
                <strong className="block text-lg font-bold" style={{ color: "#33475B" }}>{stat}</strong>
                <span className="text-xs">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Task lifecycle */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#0091AE" }}>Task lifecycle</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: "#33475B" }}>
            From assignment to delivery — clearly structured.
          </h2>
          <p className="text-lg mb-14 max-w-2xl" style={{ color: "#516F90" }}>
            Every task in Contentech follows a predictable lifecycle with clear ownership, full context, and no ambiguity.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {TASK_LIFECYCLE.map((step) => (
              <div key={step.step} className="flex gap-5 p-6 rounded-2xl border border-gray-100 bg-[#FAFBFC] hover:border-gray-200 transition-colors">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${step.bg}`}>
                  <step.icon className={`w-6 h-6 ${step.color}`} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#99ACC2" }}>{step.step}</p>
                  <h3 className="text-base font-semibold mb-2" style={{ color: "#33475B" }}>{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#516F90" }}>{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Editor features */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#0091AE" }}>Editor and tools</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-14" style={{ color: "#33475B" }}>
            Everything you need in one editor.
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {EDITOR_FEATURES.map((f) => (
              <div key={f.title} className="p-6 rounded-2xl border border-gray-100 bg-white hover:shadow-sm transition-shadow">
                <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-violet-600" />
                </div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: "#33475B" }}>{f.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "#516F90" }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quality and audit */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#0091AE" }}>Quality and audit</p>
              <h2 className="text-3xl font-bold mb-5" style={{ color: "#33475B" }}>
                Your work, your record — fully visible.
              </h2>
              <p className="text-base mb-8 leading-relaxed" style={{ color: "#516F90" }}>
                Contentech maintains a complete history of every content decision, revision, and delivery action. Your contribution is logged and attributed throughout the entire lifecycle.
              </p>
              <ul className="space-y-3">
                {QUALITY_POINTS.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm" style={{ color: "#516F90" }}>
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-violet-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl p-8 border border-gray-100" style={{ background: "linear-gradient(135deg, #F5F0FF 0%, #F5F8FA 100%)" }}>
              <Star className="w-12 h-12 mb-5 text-violet-500" />
              <p className="text-2xl font-bold mb-2" style={{ color: "#33475B" }}>Context always within reach.</p>
              <p className="text-sm leading-relaxed" style={{ color: "#516F90" }}>
                Linguists in Contentech are never working blind. Source context, client terminology, translation memory, style expectations, and reviewer comments are all accessible inside the editor — no switching tabs, no separate tools.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="rounded-3xl p-12 border border-gray-100" style={{ background: "linear-gradient(135deg, #4C1D95 0%, #7C3AED 100%)" }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-white/60">For linguists</p>
            <h2 className="text-3xl font-bold text-white mb-4">
              Work with structure, deliver with confidence.
            </h2>
            <p className="text-white/70 mb-8 leading-relaxed">
              Join the Contentech linguist network or access your portal if you are already registered.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/linguist-register">
                <Button size="lg" className="text-violet-900 border-0 font-semibold" style={{ background: "white" }}>
                  Join as a Linguist
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link href="/linguist-login">
                <Button size="lg" variant="outline" className="text-white border-white/30 hover:bg-white/10">
                  Access Linguist Portal
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Explore also */}
      <section className="py-12 px-6 border-t border-gray-100">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest mb-6 text-center" style={{ color: "#99ACC2" }}>Explore also</p>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/product/customer" className="group flex items-center gap-4 p-5 rounded-xl border border-gray-100 bg-white hover:border-[#0091AE]/30 hover:shadow-sm transition-all">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#33475B" }}>Product for Customers</p>
                <p className="text-xs" style={{ color: "#99ACC2" }}>AI + human workflows, BYOK, and enterprise governance for in-house teams</p>
              </div>
              <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0 group-hover:translate-x-1 transition-transform" style={{ color: "#99ACC2" }} />
            </Link>
            <Link href="/product/agency" className="group flex items-center gap-4 p-5 rounded-xl border border-gray-100 bg-white hover:border-[#0091AE]/30 hover:shadow-sm transition-all">
              <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-5 h-5 text-teal-500" />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#33475B" }}>Product for Agencies</p>
                <p className="text-xs" style={{ color: "#99ACC2" }}>Multi-client workspaces, shared linguist pools, and agency-scale delivery</p>
              </div>
              <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0 group-hover:translate-x-1 transition-transform" style={{ color: "#99ACC2" }} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
