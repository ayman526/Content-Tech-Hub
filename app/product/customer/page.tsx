import Link from "next/link";
import {
  ArrowRight, Building2, CheckCircle, Upload, Languages,
  Brain, UserCheck, BookOpen, Shield, BarChart2, FileText,
  Key, Layers, Bell, Zap, ChevronRight,
} from "lucide-react";
import MarketingNav from "@/components/marketing/nav";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Product for Customers — Multilingual Content Management | Contentech",
  description:
    "Upload documents, choose AI or human workflows, attach glossaries and TM, manage approvals, and deliver translations with full enterprise governance.",
};

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Upload and define your project",
    body: "Drag-and-drop PDFs, DOCX, XLIFF, or plain text. Our conversational order wizard walks you through source and target languages, document type, and delivery preferences in minutes.",
    icon: Upload,
    color: "text-orange-500",
    bg: "bg-orange-50",
  },
  {
    step: "02",
    title: "Choose your workflow",
    body: "Select AI-only for speed, human-only for certified precision, or AI + human review for the best of both. Attach your own API key (BYOK) to route through your preferred LLM.",
    icon: Brain,
    color: "text-teal-500",
    bg: "bg-teal-50",
  },
  {
    step: "03",
    title: "Connect your assets",
    body: "Attach translation memories, glossaries, and style guides scoped to your project or shared across your organization. Every linguist and AI model works from the same source of truth.",
    icon: Layers,
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    step: "04",
    title: "Review, approve, and deliver",
    body: "Manage multi-stage review workflows with in-context comments, segment-level history, and approval gates. Download clean translated PDFs, DOCX, or XLIFF on completion.",
    icon: CheckCircle,
    color: "text-green-600",
    bg: "bg-green-50",
  },
];

const CAPABILITIES = [
  {
    icon: FileText,
    title: "Conversational order wizard",
    body: "Upload a document and get AI-analyzed language detection, word count, and segment breakdown instantly. Create a fully scoped project in under two minutes.",
  },
  {
    icon: Brain,
    title: "AI routing by language pair and domain",
    body: "Intelligent LLM selection based on language pair, subject domain, and quality tier. Configure routing rules once — the platform applies them to every job automatically.",
  },
  {
    icon: BookOpen,
    title: "Translation memory and glossary",
    body: "Leverage existing translations automatically. Enforce critical terminology with enforced glossary terms and do-not-translate rules across AI and human workflows.",
  },
  {
    icon: Key,
    title: "Bring your own API keys",
    body: "Connect your own OpenAI, Anthropic, or other LLM credentials. Your data never touches our model infrastructure — full BYOK data sovereignty.",
  },
  {
    icon: UserCheck,
    title: "Bring your own linguists",
    body: "Invite trusted translators and reviewers directly into your workspace. Set up preferred linguist routing so your specialists are always first in line.",
  },
  {
    icon: Shield,
    title: "Review and approval workflow",
    body: "Multi-stage review with in-context comments, segment history, and configurable approval gates before delivery. Full audit trail per document and per segment.",
  },
  {
    icon: Bell,
    title: "Notifications and audit trail",
    body: "Real-time email and in-app notifications for every project milestone. Immutable audit logs for compliance, SOC 2, and enterprise governance requirements.",
  },
  {
    icon: BarChart2,
    title: "Analytics and project visibility",
    body: "Track word count, progress, quality scores, and delivery timelines across all your projects from a single dashboard.",
  },
];

const INDUSTRIES = [
  { title: "Legal and compliance", body: "Contract localization, regulatory filings, and policy documents with enforced terminology and certified review." },
  { title: "Life sciences", body: "Clinical trial documents, regulatory submissions, and patient-facing materials with zero tolerance for inaccuracy." },
  { title: "Financial services", body: "Investor reports, disclosures, and product documentation localized for regional regulatory requirements." },
  { title: "Technology", body: "Software UI, developer docs, help centers, and release notes maintained in sync across 20+ language markets." },
  { title: "E-commerce and retail", body: "Product catalogs, marketing copy, and customer communications localized and launched at speed." },
  { title: "Government and public sector", body: "Sensitive multilingual content with on-premise deployment options and full data residency control." },
];

export default function ProductCustomerPage() {
  return (
    <main className="min-h-screen bg-[#FAFBFC]">
      <MarketingNav />

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-orange-50 to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto relative">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-orange-500" />
            </div>
            <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#FF7A59" }}>
              Product for Customers
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight" style={{ color: "#33475B" }}>
            One platform for all<br />
            <span style={{ color: "#0091AE" }}>your multilingual content.</span>
          </h1>

          <p className="text-xl max-w-2xl mb-10 leading-relaxed" style={{ color: "#516F90" }}>
            Manage translation projects end-to-end — AI models, in-house linguists, trusted vendors, glossaries, translation memories, and review workflows — all connected in one enterprise-grade workspace.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link href="/register">
              <Button size="lg" className="text-white border-0 shadow-sm" style={{ background: "#FF7A59" }} data-testid="btn-customer-start">
                Start FREE
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/contact-sales">
              <Button size="lg" variant="outline" data-testid="btn-customer-sales">
                Contact Sales
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap gap-8 text-sm mt-14 pt-8 border-t border-gray-200" style={{ color: "#516F90" }}>
            {[
              { stat: "PDF, DOCX, XLIFF", label: "Format support" },
              { stat: "100+ languages", label: "Translation pairs" },
              { stat: "AI + human", label: "Flexible workflows" },
              { stat: "BYOK + BYOL", label: "Full data control" },
            ].map(({ stat, label }) => (
              <div key={label}>
                <strong className="block text-lg font-bold" style={{ color: "#33475B" }}>{stat}</strong>
                <span className="text-xs">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 bg-white" id="workflows">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#0091AE" }}>How it works</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: "#33475B" }}>
            From upload to delivery — fully managed.
          </h2>
          <p className="text-lg mb-14 max-w-2xl" style={{ color: "#516F90" }}>
            Every project follows a structured workflow you control — no IT integration required to get started.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {HOW_IT_WORKS.map((step) => (
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

      {/* Capabilities */}
      <section className="py-20 px-6" id="capabilities">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#0091AE" }}>Core capabilities</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-14" style={{ color: "#33475B" }}>
            Built for enterprise localization operations.
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CAPABILITIES.map((cap) => (
              <div key={cap.title} className="p-6 rounded-2xl border border-gray-100 bg-white hover:shadow-sm transition-shadow">
                <div className="w-10 h-10 bg-[#F5F8FA] rounded-xl flex items-center justify-center mb-4">
                  <cap.icon className="w-5 h-5" style={{ color: "#0091AE" }} />
                </div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: "#33475B" }}>{cap.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "#516F90" }}>{cap.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data control */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#0091AE" }}>Data sovereignty</p>
              <h2 className="text-3xl font-bold mb-5" style={{ color: "#33475B" }}>
                Full control over your data and infrastructure.
              </h2>
              <p className="text-base mb-8 leading-relaxed" style={{ color: "#516F90" }}>
                Contentech is built for enterprises where data governance is non-negotiable. Connect your own LLM API keys, route through your own models, and keep every document within your chosen data boundary.
              </p>
              <ul className="space-y-3">
                {[
                  "Bring your own API keys (BYOK) — OpenAI, Anthropic, Azure, and more",
                  "Bring your own linguists (BYOL) — invite trusted specialists directly",
                  "On-premise deployment available for regulated industries",
                  "Configurable data retention and audit log access",
                  "Role-based access control per user, project, and language pair",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm" style={{ color: "#516F90" }}>
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl p-8 border border-gray-100" style={{ background: "linear-gradient(135deg, #F5F8FA 0%, #E8F5F8 100%)" }}>
              <Shield className="w-12 h-12 mb-5" style={{ color: "#0091AE" }} />
              <p className="text-2xl font-bold mb-2" style={{ color: "#33475B" }}>Enterprise governance, not an afterthought.</p>
              <p className="text-sm leading-relaxed" style={{ color: "#516F90" }}>
                Every action in Contentech is logged, timestamped, and auditable. From AI model selection to linguist assignment and approval sign-off — the complete trail is always available.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Industries */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#0091AE" }}>Use cases by industry</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-14" style={{ color: "#33475B" }}>
            Purpose-built for regulated and high-volume sectors.
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {INDUSTRIES.map((ind) => (
              <div key={ind.title} className="p-5 rounded-xl border border-gray-100 bg-white hover:border-[#0091AE]/30 transition-colors">
                <h3 className="text-sm font-semibold mb-1.5" style={{ color: "#33475B" }}>{ind.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "#516F90" }}>{ind.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="rounded-3xl p-12 border border-gray-100" style={{ background: "linear-gradient(135deg, #33475B 0%, #1E3A5F 100%)" }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-white/60">Get started</p>
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to centralize your multilingual operations?
            </h2>
            <p className="text-white/70 mb-8 leading-relaxed">
              Join hundreds of organizations using Contentech to manage translation with AI precision and human accountability.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/register">
                <Button size="lg" className="text-[#33475B] border-0 font-semibold" style={{ background: "white" }}>
                  Start FREE
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link href="/contact-sales">
                <Button size="lg" variant="outline" className="text-white border-white/30 hover:bg-white/10">
                  Contact Sales
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
            <Link href="/product/agency" className="group flex items-center gap-4 p-5 rounded-xl border border-gray-100 bg-white hover:border-[#0091AE]/30 hover:shadow-sm transition-all">
              <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-teal-500" />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#33475B" }}>Product for Agencies</p>
                <p className="text-xs" style={{ color: "#99ACC2" }}>Multi-client workspaces, shared linguist pools, and agency-scale delivery</p>
              </div>
              <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0 group-hover:translate-x-1 transition-transform" style={{ color: "#99ACC2" }} />
            </Link>
            <Link href="/product/linguist" className="group flex items-center gap-4 p-5 rounded-xl border border-gray-100 bg-white hover:border-[#0091AE]/30 hover:shadow-sm transition-all">
              <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Languages className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#33475B" }}>Product for Linguists</p>
                <p className="text-xs" style={{ color: "#99ACC2" }}>Task inbox, AI draft review, TM and glossary access for professional translators</p>
              </div>
              <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0 group-hover:translate-x-1 transition-transform" style={{ color: "#99ACC2" }} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
