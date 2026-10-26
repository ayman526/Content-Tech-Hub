import Link from "next/link";
import {
  UserCheck,
  CheckCircle,
  ArrowRight,
  Shield,
  Award,
  Lock,
  Star,
  ChevronRight,
  FileText,
  Heart,
  Scale,
  Zap,
} from "lucide-react";
import MarketingNav from "@/components/marketing/nav";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Contentech Human™ — Zero AI Tolerance Premium Translation | Contentech",
  description:
    "Certified human specialists for legal, life sciences, and high-stakes content. Zero AI involvement guaranteed with full audit trail.",
};

export default function ContentechHumanPage() {
  return (
    <main className="min-h-screen bg-[#FAFBFC]">
      <MarketingNav />

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-gold/5 to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto relative">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-gold" />
            </div>
            <span className="text-gold font-semibold text-sm uppercase tracking-widest">
              Contentech Human™
            </span>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-navy/5 rounded-full border border-navy/10 text-sm text-navy font-medium mb-6">
            <Lock className="w-4 h-4" />
            Certified Zero AI Guarantee
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-navy mb-6 leading-tight">
            Zero AI Tolerance.
            <br />
            <span className="text-gold">Pure Human Expertise.</span>
          </h1>

          <p className="text-xl text-gray-500 max-w-2xl mb-10 leading-relaxed">
            When a single mistranslation means millions in damages or a patient safety risk, you don't gamble on AI. Contentech Human™ is our certified human-only translation service for content where precision is non-negotiable.
          </p>

          <div className="flex flex-wrap gap-4 mb-14">
            <Link href="/register">
              <Button size="xl" className="bg-gold hover:bg-gold/90 text-white">
                Request Human Translation
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/register">
              <Button size="xl" variant="outline">
                Talk to a Specialist
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap gap-6 text-sm text-gray-500 border-t border-gray-200 pt-8">
            {[
              { icon: Lock, text: "ISO 17100 certified process" },
              { icon: Award, text: "Domain-certified translators" },
              { icon: Shield, text: "Full audit trail included" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-gold" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Guarantee */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-gold font-semibold text-sm uppercase tracking-widest mb-3">
              Our Promise
            </p>
            <h2 className="text-3xl font-bold text-navy mb-4">
              The Contentech Human™ Guarantee
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Three pillars that distinguish truly professional translation from everything else on the market.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: "Zero AI Involvement",
                desc: "Every word is translated by a certified human specialist. No AI tools, no AI assistance, no AI post-editing. We contractually guarantee it.",
                highlight: true,
              },
              {
                icon: Award,
                title: "Certified Specialists",
                desc: "Domain-specific translators with legal, medical, or technical qualifications. Not just bilingual — they're qualified experts in your industry.",
                highlight: false,
              },
              {
                icon: Lock,
                title: "Full Audit Trail",
                desc: "Complete documentation with translator certification, peer review chain, and quality assurance sign-off — ready for regulatory submission.",
                highlight: false,
              },
            ].map(({ icon: Icon, title, desc, highlight }) => (
              <div
                key={title}
                className={`p-7 rounded-2xl border-2 ${
                  highlight
                    ? "border-gold bg-gold/5"
                    : "border-gray-200 bg-[#FAFBFC]"
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${
                    highlight ? "bg-gold text-white" : "bg-gold/10 text-gold"
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-navy mb-3">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Specializations */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-gold font-semibold text-sm uppercase tracking-widest mb-3">
              Specializations
            </p>
            <h2 className="text-3xl font-bold text-navy mb-4">
              Built for high-stakes industries
            </h2>
            <p className="text-gray-500">
              Our linguists hold domain certifications — not just language qualifications.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: Scale,
                title: "Legal & Contracts",
                bullets: [
                  "Commercial contracts and NDAs",
                  "Patent filings and IP documentation",
                  "Regulatory submissions",
                  "Court documents and sworn translations",
                ],
              },
              {
                icon: Heart,
                title: "Life Sciences & Medical",
                bullets: [
                  "Clinical trial documentation",
                  "Medical device labeling",
                  "Pharmaceutical submissions (FDA, EMA)",
                  "Patient-facing health materials",
                ],
              },
              {
                icon: FileText,
                title: "Financial & Compliance",
                bullets: [
                  "Annual reports and prospectuses",
                  "Regulatory compliance filings",
                  "KYC/AML documentation",
                  "Financial product disclosures",
                ],
              },
              {
                icon: Zap,
                title: "Marketing Transcreation",
                bullets: [
                  "Brand campaigns and slogans",
                  "Product naming and taglines",
                  "UX/UI copy localization",
                  "Video and multimedia localization",
                ],
              },
            ].map(({ icon: Icon, title, bullets }) => (
              <div
                key={title}
                className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center">
                    <Icon className="w-5 h-5 text-gold" />
                  </div>
                  <h3 className="font-bold text-navy text-lg">{title}</h3>
                </div>
                <ul className="space-y-2">
                  {bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 bg-navy text-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-gold font-semibold text-sm uppercase tracking-widest mb-3">
              The Process
            </p>
            <h2 className="text-3xl font-bold">
              Rigorous. Documented. Guaranteed.
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { step: "01", title: "Specialist Matching", desc: "We select a translator with your specific domain certification and language pair." },
              { step: "02", title: "Primary Translation", desc: "The specialist translates your document using your glossary and TM — zero AI tools." },
              { step: "03", title: "Peer Review", desc: "A second certified specialist reviews the translation for accuracy and register." },
              { step: "04", title: "Certified Delivery", desc: "You receive the translation with full certification and audit trail documentation." },
            ].map(({ step, title, desc }) => (
              <div key={step}>
                <div className="text-4xl font-bold text-gold/20 mb-3">{step}</div>
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
            "Zero AI tolerance was non-negotiable for our drug trial documentation. Contentech Human™ gave us certified medical translators and a full audit trail that satisfied both the FDA and EMA reviewers. We've made this our standard process."
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold to-navy flex items-center justify-center text-white font-bold">
              ER
            </div>
            <div className="text-left">
              <p className="font-semibold text-navy">Elena Ruiz</p>
              <p className="text-sm text-gray-500">Director, PharmaTrans Global</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-gold/5 to-navy/5 border-y border-gray-200">
        <div className="max-w-3xl mx-auto text-center">
          <UserCheck className="w-12 h-12 text-gold mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-navy mb-4">
            Ready for certified human translation?
          </h2>
          <p className="text-gray-500 mb-8 max-w-xl mx-auto">
            Tell us about your project. We'll match you with the right specialist within the hour.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/register">
              <Button size="xl" className="bg-gold hover:bg-gold/90 text-white">
                Request a Specialist
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
            <Link href="/services/localization-engineering" className="hover:text-white transition-colors">Localization Engineering</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
