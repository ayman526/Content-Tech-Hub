"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle,
  ArrowRight,
  Users,
  ShieldCheck,
  Clock,
  Zap,
  Calendar,
  Mail,
  Phone,
  Globe,
  Star,
} from "lucide-react";
import MarketingNav from "@/components/marketing/nav";
import { Button } from "@/components/ui/button";

const BENEFITS = [
  { icon: Zap, text: "Custom AI + human workflow designed around your content type" },
  { icon: ShieldCheck, text: "Enterprise-grade security: SOC 2 Type II, GDPR, HIPAA-ready" },
  { icon: Users, text: "Dedicated linguist team hand-picked for your domain" },
  { icon: Clock, text: "1-hour SLA with 24/7 on-call support" },
  { icon: Globe, text: "Coverage in 120+ languages and all major file formats" },
  { icon: Calendar, text: "Onboarding completed in under 5 business days" },
];

const NEXT_STEPS = [
  { step: "01", title: "We reach out within 1 business day", desc: "A solutions consultant will contact you to schedule an intro call at a time that suits you." },
  { step: "02", title: "Discovery call (30 min)", desc: "We listen first. We ask about your volume, languages, content types, and any compliance requirements." },
  { step: "03", title: "Custom proposal", desc: "You receive a tailored proposal with pricing, SLA commitments, and a recommended workflow — usually within 48 hours of the discovery call." },
  { step: "04", title: "Pilot project", desc: "We run a free pilot on a real project so you can evaluate quality and speed before signing anything." },
];

const TESTIMONIAL = {
  quote: "Within two weeks of talking to the Contentech sales team, we had our first 50,000-word legal corpus translated, reviewed, and delivered. The Enterprise onboarding was the smoothest vendor experience I've had in 15 years.",
  name: "Layla Al-Rashidi",
  role: "Head of Global Legal Operations",
  company: "Al Futtaim Group",
  initials: "LA",
};

const COMPANY_SIZES = [
  "1–10 employees",
  "11–50 employees",
  "51–200 employees",
  "201–500 employees",
  "501–1,000 employees",
  "1,000+ employees",
];

const USE_CASES = [
  "Legal & Compliance documents",
  "Life sciences & medical content",
  "Software & app localization",
  "Marketing & brand content",
  "E-learning & training material",
  "Financial & regulatory filings",
  "AI training data & RLHF",
  "Other",
];

export default function ContactSalesPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    size: "",
    country: "",
    useCase: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 1400);
  }

  const inputClass =
    "w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[#0091AE] focus:ring-2 focus:ring-[#0091AE]/10 bg-white";
  const inputStyle = { borderColor: "#CBD6E2", color: "#33475B" };

  return (
    <main className="min-h-screen" style={{ background: "#F5F8FA" }}>
      <MarketingNav />

      {/* ── Hero ── */}
      <section className="pt-32 pb-16 px-6" style={{ background: "linear-gradient(160deg, #2D3E50 0%, #1A2E3A 100%)" }}>
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 text-xs font-semibold uppercase tracking-widest"
            style={{ background: "rgba(255,122,89,0.2)", color: "#FFB09A" }}>
            Sales
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
            Talk to our team
          </h1>
          <p className="text-lg leading-relaxed max-w-2xl mx-auto" style={{ color: "#99ACC2" }}>
            Tell us about your translation needs and we&rsquo;ll design a solution around your workflows, compliance requirements, and budget.
          </p>
        </div>
      </section>

      {/* ── Main content: two-column ── */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">

          {/* Form — wider column */}
          <div className="lg:col-span-3">
            {submitted ? (
              <div className="bg-white rounded-2xl p-12 text-center border" style={{ borderColor: "#E8EEF4" }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "#E8F5F8" }}>
                  <CheckCircle className="w-8 h-8" style={{ color: "#00BDA5" }} />
                </div>
                <h3 className="text-2xl font-bold mb-3" style={{ color: "#2D3E50" }}>We&rsquo;ll be in touch soon</h3>
                <p className="text-sm mb-2" style={{ color: "#516F90" }}>
                  Thanks, <strong>{form.firstName}</strong>. A solutions consultant will contact you at <strong>{form.email}</strong> within 1 business day to schedule your discovery call.
                </p>
                <p className="text-sm mb-8" style={{ color: "#99ACC2" }}>
                  Need something urgent? Email us directly at{" "}
                  <a href="mailto:sales@contentech.com" className="underline" style={{ color: "#0091AE" }}>sales@contentech.com</a>
                </p>
                <Button
                  onClick={() => setSubmitted(false)}
                  variant="outline"
                  size="sm"
                >
                  Submit another enquiry
                </Button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-white rounded-2xl p-8 border space-y-5"
                style={{ borderColor: "#E8EEF4" }}
              >
                <div>
                  <h2 className="text-xl font-bold mb-1" style={{ color: "#2D3E50" }}>Get in touch</h2>
                  <p className="text-sm" style={{ color: "#99ACC2" }}>All fields marked * are required.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: "#33475B" }}>First name *</label>
                    <input
                      required
                      type="text"
                      placeholder="Sarah"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      data-testid="input-first-name"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: "#33475B" }}>Last name *</label>
                    <input
                      required
                      type="text"
                      placeholder="Chen"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      data-testid="input-last-name"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: "#33475B" }}>Work email *</label>
                    <input
                      required
                      type="email"
                      placeholder="sarah@company.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      data-testid="input-email"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: "#33475B" }}>Phone number</label>
                    <input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      data-testid="input-phone"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: "#33475B" }}>Company *</label>
                    <input
                      required
                      type="text"
                      placeholder="Acme Corporation"
                      value={form.company}
                      onChange={(e) => setForm({ ...form, company: e.target.value })}
                      data-testid="input-company"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: "#33475B" }}>Company size *</label>
                    <select
                      required
                      value={form.size}
                      onChange={(e) => setForm({ ...form, size: e.target.value })}
                      data-testid="select-size"
                      className={inputClass}
                      style={inputStyle}
                    >
                      <option value="">Select size</option>
                      {COMPANY_SIZES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: "#33475B" }}>Country *</label>
                    <input
                      required
                      type="text"
                      placeholder="United Arab Emirates"
                      value={form.country}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                      data-testid="input-country"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: "#33475B" }}>Primary use case *</label>
                    <select
                      required
                      value={form.useCase}
                      onChange={(e) => setForm({ ...form, useCase: e.target.value })}
                      data-testid="select-use-case"
                      className={inputClass}
                      style={inputStyle}
                    >
                      <option value="">Select use case</option>
                      {USE_CASES.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: "#33475B" }}>
                    Tell us more about your project
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Approximate monthly word volume, target languages, any compliance or confidentiality requirements…"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    data-testid="input-message"
                    className={`${inputClass} resize-none`}
                    style={inputStyle}
                  />
                </div>

                <p className="text-xs" style={{ color: "#99ACC2" }}>
                  By submitting this form you agree to our{" "}
                  <Link href="/privacy" className="underline" style={{ color: "#0091AE" }}>Privacy Policy</Link>.
                  We will never sell your data.
                </p>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full text-white border-0 h-12 font-semibold text-base"
                  style={{ background: "#FF7A59" }}
                  data-testid="button-contact-sales"
                >
                  {submitting ? "Sending…" : "Talk to Sales"}
                  {!submitting && <ArrowRight className="ml-2 w-4 h-4" />}
                </Button>
              </form>
            )}
          </div>

          {/* Info panel — narrower column */}
          <div className="lg:col-span-2 space-y-6 lg:sticky lg:top-28">

            {/* What you get */}
            <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: "#E8EEF4" }}>
              <h3 className="text-base font-bold mb-4" style={{ color: "#2D3E50" }}>What Enterprise customers get</h3>
              <ul className="space-y-3">
                {BENEFITS.map((b) => (
                  <li key={b.text} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#F5F8FA" }}>
                      <b.icon className="w-3.5 h-3.5" style={{ color: "#0091AE" }} />
                    </div>
                    <span className="text-sm leading-relaxed" style={{ color: "#516F90" }}>{b.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Testimonial */}
            <div className="rounded-2xl p-6 border" style={{ background: "#EEF1F5", borderColor: "#CBD6E2" }}>
              <div className="flex gap-0.5 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" style={{ color: "#FF7A59" }} />
                ))}
              </div>
              <blockquote className="text-sm italic leading-relaxed mb-5" style={{ color: "#33475B" }}>
                &ldquo;{TESTIMONIAL.quote}&rdquo;
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: "#2D3E50" }}>
                  {TESTIMONIAL.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#2D3E50" }}>{TESTIMONIAL.name}</p>
                  <p className="text-xs" style={{ color: "#99ACC2" }}>{TESTIMONIAL.role}, {TESTIMONIAL.company}</p>
                </div>
              </div>
            </div>

            {/* Direct contacts */}
            <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: "#E8EEF4" }}>
              <h3 className="text-sm font-bold mb-4" style={{ color: "#2D3E50" }}>Prefer to reach us directly?</h3>
              <div className="space-y-3">
                <a href="mailto:sales@contentech.com" className="flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#FFF1EC" }}>
                    <Mail className="w-3.5 h-3.5" style={{ color: "#FF7A59" }} />
                  </div>
                  <span className="text-sm group-hover:underline" style={{ color: "#0091AE" }}>sales@contentech.com</span>
                </a>
                <a href="tel:+97144000000" className="flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#E8F5F8" }}>
                    <Phone className="w-3.5 h-3.5" style={{ color: "#0091AE" }} />
                  </div>
                  <span className="text-sm group-hover:underline" style={{ color: "#0091AE" }}>+971 4 400 0000 (Dubai)</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── What happens next ── */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-10 text-center" style={{ color: "#2D3E50" }}>What happens after you submit</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {NEXT_STEPS.map((step) => (
              <div key={step.step} className="relative">
                <div className="text-4xl font-black mb-3" style={{ color: "#CBD6E2" }}>{step.step}</div>
                <h3 className="text-sm font-bold mb-2" style={{ color: "#2D3E50" }}>{step.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "#516F90" }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Support CTA ── */}
      <section className="py-12 px-6" style={{ background: "#F5F8FA", borderTop: "1px solid #E8EEF4" }}>
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: "#2D3E50" }}>Already a customer?</p>
            <p className="text-sm" style={{ color: "#99ACC2" }}>Visit the support center for help with your account.</p>
          </div>
          <Link href="/support">
            <Button variant="outline" size="sm" className="whitespace-nowrap">
              Go to Support Center
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
