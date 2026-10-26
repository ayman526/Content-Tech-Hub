import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle,
  ArrowRight,
  Zap,
  AlertTriangle,
  FileSearch,
  Scale,
  Globe,
  Star,
  ChevronRight,
  Clock,
  BarChart2,
  Lock,
} from "lucide-react";
import MarketingNav from "@/components/marketing/nav";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "AI Quality Shield — Enterprise AI Translation Validation | Contentech",
  description:
    "Human experts validate AI-generated translations for accuracy, cultural fit, and legal compliance. Get your free linguistic risk assessment.",
};

export default function AIQualityShieldPage() {
  return (
    <main className="min-h-screen bg-[#FAFBFC]">
      <MarketingNav />

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-teal/5 to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto relative">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-teal/10 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-teal" />
            </div>
            <span className="text-teal font-semibold text-sm uppercase tracking-widest">
              AI Quality Shield
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-navy mb-6 leading-tight">
            Your AI Safety Net.
            <br />
            <span className="text-teal">Human Experts on Guard.</span>
          </h1>

          <p className="text-xl text-gray-500 max-w-2xl mb-10 leading-relaxed">
            You trust AI for speed — but can you trust it for accuracy? Our certified linguists perform a Linguistic Risk Assessment on every AI-generated translation before it reaches your audience.
          </p>

          <div className="flex flex-wrap gap-4 mb-14">
            <Link href="/register">
              <Button size="xl" data-testid="btn-hero-cta">
                Get Free Risk Assessment
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/register">
              <Button size="xl" variant="outline">
                Start Translation Audit
              </Button>
            </Link>
          </div>

          {/* Inline trust stats */}
          <div className="flex flex-wrap gap-8 text-sm text-gray-500 border-t border-gray-200 pt-8">
            {[
              { icon: Clock, stat: "< 4h", label: "Average turnaround" },
              { icon: BarChart2, stat: "99.2%", label: "Accuracy rate" },
              { icon: Lock, stat: "ISO 17100", label: "Certified process" },
            ].map(({ icon: Icon, stat, label }) => (
              <div key={label} className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-teal" />
                <span>
                  <strong className="text-navy font-bold">{stat}</strong>{" "}
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The problem we solve */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-teal font-semibold text-sm uppercase tracking-widest mb-3">
                The Challenge
              </p>
              <h2 className="text-3xl font-bold text-navy mb-6">
                AI translation is fast — but it's not perfect
              </h2>
              <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
                <p>
                  GPT-4 and DeepL are remarkable tools. But they hallucinate legal terms, miss cultural nuance, and occasionally invert meaning in ways that pass automated quality checks.
                </p>
                <p>
                  For a tweet, that's fine. For a pharmaceutical label, a patent filing, or a regulated financial disclosure — it can cost you millions, or worse.
                </p>
                <p className="font-semibold text-navy">
                  AI Quality Shield is the human checkpoint between your AI output and your audience.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { risk: "Terminology errors in legal documents", severity: "Critical" },
                { risk: "Cultural misalignments in marketing copy", severity: "High" },
                { risk: "Regulatory non-compliance in pharma", severity: "Critical" },
                { risk: "Safety warnings lost in technical manuals", severity: "Critical" },
                { risk: "Brand voice inconsistency across markets", severity: "Medium" },
              ].map(({ risk, severity }) => (
                <div
                  key={risk}
                  className="flex items-center justify-between p-4 bg-[#FAFBFC] rounded-xl border border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{risk}</span>
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-full ${
                      severity === "Critical"
                        ? "bg-red-100 text-red-600"
                        : severity === "High"
                        ? "bg-orange-100 text-orange-600"
                        : "bg-yellow-100 text-yellow-600"
                    }`}
                  >
                    {severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-teal font-semibold text-sm uppercase tracking-widest mb-3">
              The Process
            </p>
            <h2 className="text-3xl font-bold text-navy">
              How AI Quality Shield Works
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Submit AI Output",
                desc: "Upload your AI-generated translation — any file format, any language, any AI model output.",
                color: "bg-teal",
              },
              {
                step: "02",
                title: "Risk Assessment",
                desc: "Our linguist runs a structured Linguistic Risk Assessment: accuracy, cultural, legal, and terminological checks.",
                color: "bg-navy",
              },
              {
                step: "03",
                title: "Certified Delivery",
                desc: "Receive your validated translation with a detailed risk report and certification of accuracy.",
                color: "bg-gold",
              },
            ].map(({ step, title, desc, color }) => (
              <div key={step} className="relative text-center">
                <div
                  className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center mx-auto mb-5`}
                >
                  <span className="text-white font-bold text-lg">{step}</span>
                </div>
                <h3 className="text-lg font-bold text-navy mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-teal font-semibold text-sm uppercase tracking-widest mb-3">
              Use Cases
            </p>
            <h2 className="text-3xl font-bold text-navy mb-3">
              When you can't afford mistakes
            </h2>
            <p className="text-gray-500">
              AI Quality Shield is essential for high-stakes content in regulated industries.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: Scale,
                title: "Legal Documents",
                description:
                  "Contracts, patents, regulatory filings where a single mistranslation can cost millions. We provide legal terminology audits with certified translator sign-off.",
              },
              {
                icon: AlertTriangle,
                title: "Marketing & Brand",
                description:
                  "Product launches, campaigns, and brand messaging where cultural missteps are catastrophic. Full cultural appropriateness review before publication.",
              },
              {
                icon: FileSearch,
                title: "Technical Manuals",
                description:
                  "Safety-critical documentation for medical devices, aerospace, and industrial equipment. Terminology consistency checks against your glossary.",
              },
              {
                icon: Globe,
                title: "Regulated Industries",
                description:
                  "Pharmaceutical submissions, financial disclosures, and compliance documentation. Regulatory compliance verification with audit trail.",
              },
            ].map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="bg-[#FAFBFC] rounded-2xl p-6 border border-gray-200 flex gap-4 hover:shadow-md transition-shadow"
              >
                <div className="w-11 h-11 bg-teal/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-teal" />
                </div>
                <div>
                  <h3 className="font-bold text-navy mb-2">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What we check */}
      <section className="py-20 px-6 bg-navy text-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-teal font-semibold text-sm uppercase tracking-widest mb-3">
              The Checklist
            </p>
            <h2 className="text-3xl font-bold">
              Our Linguistic Risk Assessment covers 8 dimensions
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              "Semantic accuracy",
              "Terminology consistency",
              "Cultural appropriateness",
              "Legal compliance",
              "Formatting integrity",
              "Register and tone",
              "Brand voice alignment",
              "Back-translation check",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 bg-white/5 rounded-xl p-4 border border-white/10"
              >
                <CheckCircle className="w-4 h-4 text-teal flex-shrink-0" />
                <span className="text-sm text-white/80">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex gap-1 justify-center mb-6">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className="w-5 h-5 text-gold fill-gold" />
            ))}
          </div>
          <blockquote className="text-xl text-gray-700 leading-relaxed mb-8 italic">
            "The AI Quality Shield saved us from a critical mistranslation in a patent filing. The risk assessment identified three high-risk segments our in-house team missed entirely. The ROI on that single review paid for a full year of service."
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-navy to-teal flex items-center justify-center text-white font-bold">
              SA
            </div>
            <div className="text-left">
              <p className="font-semibold text-navy">Sarah Ahmed</p>
              <p className="text-sm text-gray-500">
                Head of Localization, LexCorp
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-teal/10 to-navy/10 border-y border-gray-200">
        <div className="max-w-3xl mx-auto text-center">
          <Zap className="w-12 h-12 text-teal mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-navy mb-4">
            Free Linguistic Risk Assessment
          </h2>
          <p className="text-gray-500 mb-8 max-w-xl mx-auto">
            Submit your AI-generated content for a free risk scan. We'll identify the 5 highest-risk segments and tell you exactly what to fix — no commitment required.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/register">
              <Button size="xl">
                Claim Free Assessment
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="xl" variant="outline">
                View Pricing
                <ChevronRight className="ml-1.5 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0E1C2F] text-white/50 py-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Link href="/" className="text-teal hover:underline font-medium">
            ← Back to Contentech
          </Link>
          <div className="flex gap-6 text-sm">
            <Link href="/services/ai-training-data" className="hover:text-white transition-colors">AI Training Data</Link>
            <Link href="/services/contentech-human" className="hover:text-white transition-colors">Contentech Human™</Link>
            <Link href="/services/localization-engineering" className="hover:text-white transition-colors">Localization Engineering</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
