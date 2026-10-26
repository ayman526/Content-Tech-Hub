import Link from "next/link";
import {
  Database,
  ArrowRight,
  CheckCircle,
  Star,
  ChevronRight,
  Layers,
  Brain,
  Globe2,
  Users,
  Award,
  Zap,
} from "lucide-react";
import MarketingNav from "@/components/marketing/nav";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "AI Training Data — Human-Verified Multilingual Datasets | Contentech",
  description:
    "High-quality annotated datasets, RLHF, and human-verified training data for LLM development at scale across 180+ languages.",
};

export default function AITrainingDataPage() {
  return (
    <main className="min-h-screen bg-[#FAFBFC]">
      <MarketingNav />

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-navy/5 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-5xl mx-auto relative">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-navy/10 rounded-xl flex items-center justify-center">
              <Database className="w-5 h-5 text-navy" />
            </div>
            <span className="text-navy font-semibold text-sm uppercase tracking-widest">
              AI Training Data
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-navy mb-6 leading-tight">
            Fuel the AI Revolution
            <br />
            <span className="text-teal">with Human Precision.</span>
          </h1>

          <p className="text-xl text-gray-500 max-w-2xl mb-10 leading-relaxed">
            LLMs are only as good as their training data. Our network of 300+ expert linguists provides human-verified, culturally nuanced training data across 180+ languages at scale.
          </p>

          <div className="flex flex-wrap gap-4 mb-14">
            <Link href="/register">
              <Button size="xl">
                Get a Dataset Quote
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/register">
              <Button size="xl" variant="outline">
                See Sample Dataset
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-8 border-t border-gray-200 pt-8">
            {[
              { value: "180+", label: "Languages covered" },
              { value: "300+", label: "Expert linguists" },
              { value: "99.8%", label: "Quality score" },
              { value: "100M+", label: "Tokens delivered" },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-2xl font-bold text-navy">{value}</p>
                <p className="text-sm text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why human data matters */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-navy font-semibold text-sm uppercase tracking-widest mb-3">
                Why It Matters
              </p>
              <h2 className="text-3xl font-bold text-navy mb-6">
                Synthetic data can't replace human judgment
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                AI-generated training data introduces compounding hallucinations. When you fine-tune on synthetic data, you amplify existing model errors rather than correcting them.
              </p>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                Human-verified data captures cultural nuance, domain expertise, and linguistic authenticity that no AI can generate reliably — especially in low-resource language pairs. Our linguists bring first-hand language expertise to every task.
              </p>
              <div className="space-y-3">
                {[
                  "Cultural and idiomatic accuracy",
                  "Domain-specific expertise (medical, legal, technical)",
                  "Human feedback for RLHF alignment",
                  "Bias detection and correction",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-teal flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Brain, label: "LLM Fine-tuning", value: "Instruction datasets" },
                { icon: Users, label: "RLHF", value: "Human preference ranking" },
                { icon: Layers, label: "Annotation", value: "Entity & sentiment labeling" },
                { icon: Globe2, label: "Coverage", value: "180+ languages" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-[#FAFBFC] rounded-2xl p-5 border border-gray-200 text-center">
                  <div className="w-10 h-10 bg-navy/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Icon className="w-5 h-5 text-navy" />
                  </div>
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <p className="text-sm font-semibold text-navy">{value}</p>
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
            <p className="text-teal font-semibold text-sm uppercase tracking-widest mb-3">
              Service Catalog
            </p>
            <h2 className="text-3xl font-bold text-navy">
              What We Provide
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                title: "Data Annotation & Labeling",
                desc: "Semantic tagging, entity recognition, sentiment labeling, and classification tasks across 180+ languages with domain-expert linguists.",
                badge: "Most Requested",
              },
              {
                title: "RLHF — Human Feedback Ranking",
                desc: "Quality ranking of AI model outputs to fine-tune responses for accuracy, safety, and cultural appropriateness in your target markets.",
                badge: null,
              },
              {
                title: "Multilingual QA Pairs",
                desc: "Carefully constructed question-answer pairs for instruction fine-tuning across domains and language pairs, reviewed by domain experts.",
                badge: null,
              },
              {
                title: "Dataset Validation & Cleaning",
                desc: "Expert review of existing datasets to identify errors, biases, and cultural misalignments before they corrupt your model training.",
                badge: "Essential",
              },
              {
                title: "Code Comment Translation",
                desc: "Technical code documentation and comments adapted by linguists who are also programmers — no loss of technical meaning.",
                badge: null,
              },
              {
                title: "Specialized Domain Data",
                desc: "Legal, medical, financial, and technical datasets requiring deep domain expertise beyond basic bilingual skill.",
                badge: null,
              },
            ].map(({ title, desc, badge }) => (
              <div
                key={title}
                className="flex gap-4 p-5 bg-white rounded-2xl border border-gray-200 hover:shadow-md transition-shadow relative"
              >
                {badge && (
                  <div className="absolute top-3 right-3">
                    <span className="text-xs font-bold bg-teal/10 text-teal px-2 py-0.5 rounded-full">
                      {badge}
                    </span>
                  </div>
                )}
                <CheckCircle className="w-5 h-5 text-teal flex-shrink-0 mt-0.5" />
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
            <p className="text-teal font-semibold text-sm uppercase tracking-widest mb-3">
              Our Process
            </p>
            <h2 className="text-3xl font-bold">
              From brief to delivery in 4 stages
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { step: "01", title: "Scoping", desc: "Define language pairs, domain, volume, quality tiers, and timeline." },
              { step: "02", title: "Linguist Selection", desc: "We match your task to domain-expert linguists with proven track records." },
              { step: "03", title: "Production", desc: "Linguists complete the task using our structured annotation platform." },
              { step: "04", title: "QA & Delivery", desc: "Independent QA review, calibration, and delivery in your preferred format." },
            ].map(({ step, title, desc }) => (
              <div key={step}>
                <div className="text-4xl font-bold text-white/10 mb-3">{step}</div>
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
            "We needed 50,000 annotated training samples in 12 languages. Contentech delivered in 3 weeks with 99.8% quality. Their RLHF pipeline is exceptional — it actually improved our model's performance measurably."
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-navy to-teal flex items-center justify-center text-white font-bold">
              MC
            </div>
            <div className="text-left">
              <p className="font-semibold text-navy">Marcus Chen</p>
              <p className="text-sm text-gray-500">VP Engineering, DataScale</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-navy/5 to-teal/5 border-y border-gray-200">
        <div className="max-w-3xl mx-auto text-center">
          <Award className="w-12 h-12 text-navy mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-navy mb-4">
            Ready to build better AI?
          </h2>
          <p className="text-gray-500 mb-8 max-w-xl mx-auto">
            Get a custom quote for your dataset requirements. We handle projects from 1,000 to 100M+ tokens across 180+ languages.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/register">
              <Button size="xl">
                Get Dataset Quote
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
            <Link href="/services/contentech-human" className="hover:text-white transition-colors">Contentech Human™</Link>
            <Link href="/services/localization-engineering" className="hover:text-white transition-colors">Localization Engineering</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
