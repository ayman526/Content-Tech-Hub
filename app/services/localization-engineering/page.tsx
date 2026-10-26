import Link from "next/link";
import {
  Code2,
  ArrowRight,
  Terminal,
  Database,
  Globe,
  Layers,
  CheckCircle,
  Star,
  ChevronRight,
  GitBranch,
  Settings,
  Cpu,
} from "lucide-react";
import MarketingNav from "@/components/marketing/nav";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Localization Engineering — i18n Architecture & TMS Solutions | Contentech",
  description:
    "i18n architecture, TMS implementation, RTL engineering, and strategic localization consulting from engineering specialists.",
};

export default function LocalizationEngineeringPage() {
  return (
    <main className="min-h-screen bg-[#FAFBFC]">
      <MarketingNav />

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-purple-500/5 to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto relative">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Code2 className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-purple-600 font-semibold text-sm uppercase tracking-widest">
              Localization Engineering
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-navy mb-6 leading-tight">
            Beyond Translation.
            <br />
            <span className="text-purple-600">Engineering for Global Scale.</span>
          </h1>

          <p className="text-xl text-gray-500 max-w-2xl mb-10 leading-relaxed">
            AI can translate words — but it can't architect your i18n infrastructure, configure your TMS, or debug RTL layout issues. Our engineering team handles the technical side of going global.
          </p>

          <div className="flex flex-wrap gap-4 mb-14">
            <Link href="/register">
              <Button size="xl" className="bg-purple-600 hover:bg-purple-700 text-white">
                Book Engineering Consultation
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/register">
              <Button size="xl" variant="outline">
                Get i18n Audit
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap gap-6 text-sm text-gray-500 border-t border-gray-200 pt-8">
            {[
              { text: "React, Vue, Angular, iOS, Android" },
              { text: "All major TMS platforms" },
              { text: "RTL language experts" },
            ].map(({ text }) => (
              <div key={text} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-purple-500" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why engineering matters */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-purple-600 font-semibold text-sm uppercase tracking-widest mb-3">
                The Technical Gap
              </p>
              <h2 className="text-3xl font-bold text-navy mb-6">
                Translation is 20% of going global
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">
                Most companies underestimate the engineering work required for true localization. They translate the words but forget the architecture — and then wonder why their Arabic site breaks, their dates format wrong, or their TMS import fails.
              </p>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                Our localization engineers close the gap between "translated text" and "actually works for global users."
              </p>
              <div className="space-y-3">
                {[
                  "Hardcoded strings in legacy codebases",
                  "RTL layout failures in Arabic and Hebrew",
                  "Date, currency, and number formatting errors",
                  "Missing pluralization rules for Slavic languages",
                  "TMS integration that doesn't round-trip correctly",
                ].map((issue) => (
                  <div key={issue} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                    {issue}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {[
                { icon: GitBranch, label: "i18n frameworks supported", value: "React-i18next, vue-i18n, Angular i18n, iOS NSLocalizedString, Android resources" },
                { icon: Settings, label: "TMS platforms", value: "Phrase, Lokalise, Crowdin, Smartcat, Transifex, custom solutions" },
                { icon: Globe, label: "RTL languages", value: "Arabic, Hebrew, Farsi, Urdu — full bidirectional text support" },
                { icon: Layers, label: "File formats", value: "XLIFF 2.0, MXLIFF, TMX, TBX, IDML, PO, JSON, YAML" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-[#FAFBFC] rounded-2xl p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
                  </div>
                  <p className="text-sm text-gray-700">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-purple-600 font-semibold text-sm uppercase tracking-widest mb-3">
              Engineering Services
            </p>
            <h2 className="text-3xl font-bold text-navy">
              The full localization engineering stack
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                icon: Globe,
                title: "i18n Architecture Audit",
                desc: "Comprehensive audit of your codebase's internationalization readiness. We identify hardcoded strings, date/currency formatting issues, and RTL incompatibilities.",
                tag: "Start here",
              },
              {
                icon: Database,
                title: "TMS Setup & Integration",
                desc: "Configuration, implementation, and integration of Translation Management Systems. We handle the full setup from onboarding through automated sync pipelines.",
                tag: null,
              },
              {
                icon: Terminal,
                title: "RTL Language Support",
                desc: "Bidirectional text implementation for Arabic, Hebrew, Farsi, and Urdu. CSS mirroring, layout adjustments, and character rendering optimization.",
                tag: "Specialized",
              },
              {
                icon: Layers,
                title: "Complex File Format Processing",
                desc: "XLIFF 2.0, MXLIFF, TMX, TBX, IDML, and custom XML/JSON format handling with round-trip integrity validation and transformation pipelines.",
                tag: null,
              },
              {
                icon: Code2,
                title: "i18n Framework Implementation",
                desc: "Implementation and configuration of React-i18next, vue-i18n, Angular i18n, iOS NSLocalizedString, and Android resource files with proper pluralization.",
                tag: null,
              },
              {
                icon: Cpu,
                title: "Continuous Localization Pipeline",
                desc: "Automated workflows that extract strings on commit, route to translators, and merge back on completion — fully integrated with your CI/CD pipeline.",
                tag: "Enterprise",
              },
            ].map(({ icon: Icon, title, desc, tag }) => (
              <div
                key={title}
                className="flex gap-4 p-5 bg-white rounded-2xl border border-gray-200 hover:shadow-md transition-shadow relative"
              >
                {tag && (
                  <div className="absolute top-3 right-3">
                    <span className="text-xs font-bold bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                      {tag}
                    </span>
                  </div>
                )}
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-navy mb-1.5">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-20 px-6 bg-navy text-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-purple-300 font-semibold text-sm uppercase tracking-widest mb-3">
              Engagement Model
            </p>
            <h2 className="text-3xl font-bold">
              Engineering-first approach to localization
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { step: "01", title: "Discovery Call", desc: "We map your tech stack, current i18n state, target markets, and timeline." },
              { step: "02", title: "Technical Audit", desc: "Engineers audit your codebase or platform and produce a detailed remediation report." },
              { step: "03", title: "Implementation", desc: "We fix the issues: i18n setup, TMS integration, RTL fixes, and pipeline automation." },
              { step: "04", title: "Handover & Training", desc: "Full documentation and team training so your developers can maintain the system independently." },
            ].map(({ step, title, desc }) => (
              <div key={step}>
                <div className="text-4xl font-bold text-purple-300/20 mb-3">{step}</div>
                <h3 className="font-bold text-white mb-2">{title}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{desc}</p>
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
            "We'd been struggling with our Arabic launch for 6 months. Contentech's engineering team audited our codebase, identified 47 RTL issues, and fixed them all in two weeks. Our Arabic product launched perfectly — something we couldn't have done without real localization engineers."
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-navy flex items-center justify-center text-white font-bold">
              AH
            </div>
            <div className="text-left">
              <p className="font-semibold text-navy">Amir Hassan</p>
              <p className="text-sm text-gray-500">CTO, TechExpand MENA</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-purple-600/5 to-navy/5 border-y border-gray-200">
        <div className="max-w-3xl mx-auto text-center">
          <Code2 className="w-12 h-12 text-purple-600 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-navy mb-4">
            Ready to engineer your global expansion?
          </h2>
          <p className="text-gray-500 mb-8 max-w-xl mx-auto">
            Start with a free i18n readiness assessment. We'll tell you exactly what needs to be fixed before you spend money on translation.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/register">
              <Button size="xl" className="bg-purple-600 hover:bg-purple-700 text-white">
                Book Free i18n Audit
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
            <Link href="/services/ai-quality-shield" className="hover:text-white transition-colors">AI Quality Shield</Link>
            <Link href="/services/ai-training-data" className="hover:text-white transition-colors">AI Training Data</Link>
            <Link href="/services/contentech-human" className="hover:text-white transition-colors">Contentech Human™</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
