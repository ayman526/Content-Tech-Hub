"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Mail,
  MessageCircle,
  BookOpen,
  ShieldCheck,
  Clock,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ExternalLink,
  AlertCircle,
  Zap,
  Users,
} from "lucide-react";
import MarketingNav from "@/components/marketing/nav";
import { Button } from "@/components/ui/button";

const CHANNELS = [
  {
    icon: Mail,
    title: "Email Support",
    description: "Send us a detailed message and a dedicated support engineer will respond within your plan's SLA window.",
    action: "Submit a Ticket",
    href: "#submit-ticket",
    badge: "All plans",
    badgeColor: "#516F90",
    bg: "#F5F8FA",
    iconColor: "#0091AE",
  },
  {
    icon: MessageCircle,
    title: "Live Chat",
    description: "Real-time assistance from our support team. Available during business hours for Pro plans and 24/7 for Enterprise.",
    action: "Start Chat",
    href: "#",
    badge: "Pro & Enterprise",
    badgeColor: "#0091AE",
    bg: "#E8F5F8",
    iconColor: "#0091AE",
  },
  {
    icon: BookOpen,
    title: "Help Center",
    description: "Searchable documentation covering platform guides, API references, CAT editor tutorials, and troubleshooting steps.",
    action: "Browse Docs",
    href: "/docs",
    badge: "Self-service",
    badgeColor: "#516F90",
    bg: "#F5F8FA",
    iconColor: "#2D3E50",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise Support",
    description: "A named Technical Account Manager, priority escalation path, custom onboarding, and quarterly business reviews.",
    action: "Contact Sales",
    href: "/contact-sales",
    badge: "Enterprise only",
    badgeColor: "#FF7A59",
    bg: "#FFF1EC",
    iconColor: "#FF7A59",
  },
];

const SLA = [
  { plan: "Starter", initial: "48 hours", followUp: "72 hours", channels: "Email", hours: "Business hours" },
  { plan: "Professional", initial: "8 hours", followUp: "24 hours", channels: "Email + Live Chat", hours: "Business hours" },
  { plan: "Enterprise", initial: "1 hour", followUp: "4 hours", channels: "Email + Chat + Phone + TAM", hours: "24 / 7 / 365" },
];

const FAQS = [
  {
    q: "How do I reset my API key or BYOK credentials?",
    a: "Go to Settings → Integrations in your dashboard. Click the three-dot menu next to any integration and select Rotate Key. Your existing key is immediately invalidated — update your applications before rotating.",
  },
  {
    q: "My translation job has been stuck in Processing for over an hour. What should I do?",
    a: "First check the status banner at status.contentech.com. If no incident is active, open your project, click the job row, and use the Retry button. If retry fails, submit a support ticket with the Job ID (visible in the URL) and we'll investigate within your SLA window.",
  },
  {
    q: "Can I export my Translation Memory and Glossary to another platform?",
    a: "Yes. From the Translation Memory or Glossary page, click Export and choose TMX (industry-standard format) or CSV. Both formats are compatible with SDL Trados, memoQ, Phrase, and most other CAT tools.",
  },
  {
    q: "How do I add team members and control their access level?",
    a: "Go to Settings → Team. Click Invite Member, enter their work email, and assign a role: Viewer, Editor, or Project Manager. Invitations expire after 7 days. Enterprise plans also support SSO-based provisioning.",
  },
  {
    q: "What happens to my data if I cancel my subscription?",
    a: "Your account moves to read-only mode for 30 days after cancellation. During this window you can export all projects, Translation Memories, and Glossaries in standard formats. After 30 days, data is permanently deleted in accordance with our Privacy Policy.",
  },
  {
    q: "Is Contentech compliant with GDPR and HIPAA?",
    a: "Yes. Contentech is SOC 2 Type II certified, GDPR-compliant, and HIPAA-ready for Enterprise customers. Data Processing Agreements (DPAs) and Business Associate Agreements (BAAs) are available on request. Contact your account manager or email compliance@contentech.com.",
  },
];

const RESOURCES = [
  { title: "Platform Documentation", desc: "Step-by-step guides for every feature", icon: BookOpen, href: "/docs" },
  { title: "API Reference", desc: "Full REST API docs with interactive examples", icon: Zap, href: "/docs/api" },
  { title: "Video Tutorials", desc: "Recorded walkthroughs for key workflows", icon: ExternalLink, href: "/tutorials" },
  { title: "Community Forum", desc: "Ask questions and share solutions with peers", icon: Users, href: "/community" },
];

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", email: "", subject: "", priority: "normal", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 1200);
  }

  return (
    <main className="min-h-screen" style={{ background: "#F5F8FA" }}>
      <MarketingNav />

      {/* ── Hero ── */}
      <section className="pt-32 pb-20 px-6" style={{ background: "linear-gradient(160deg, #2D3E50 0%, #1A2E3A 100%)" }}>
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 text-xs font-semibold uppercase tracking-widest"
            style={{ background: "rgba(0,145,174,0.2)", color: "#7DCDE0" }}>
            Support Center
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
            We&rsquo;re here whenever<br />you need us
          </h1>
          <p className="text-lg leading-relaxed mb-10" style={{ color: "#99ACC2" }}>
            From quick how-to questions to complex enterprise integrations — our team is ready to help you succeed.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#submit-ticket">
              <Button size="lg" className="text-white border-0 w-full sm:w-auto" style={{ background: "#FF7A59" }}>
                Submit a Ticket
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </a>
            <Link href="/docs">
              <Button size="lg" variant="outline" className="w-full sm:w-auto" style={{ borderColor: "rgba(255,255,255,0.2)", color: "#CBD6E2", background: "transparent" }}>
                Browse Help Center
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Support channels ── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3" style={{ color: "#2D3E50" }}>Choose your support channel</h2>
            <p className="text-base" style={{ color: "#516F90" }}>Multiple ways to reach us — pick what works best for you.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {CHANNELS.map((ch) => (
              <div
                key={ch.title}
                className="bg-white rounded-2xl p-6 border flex flex-col"
                style={{ borderColor: "#E8EEF4" }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: ch.bg }}>
                  <ch.icon className="w-5 h-5" style={{ color: ch.iconColor }} />
                </div>
                <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-3 self-start"
                  style={{ background: `${ch.badgeColor}15`, color: ch.badgeColor }}>
                  {ch.badge}
                </span>
                <h3 className="text-base font-bold mb-2" style={{ color: "#2D3E50" }}>{ch.title}</h3>
                <p className="text-sm leading-relaxed flex-1" style={{ color: "#516F90" }}>{ch.description}</p>
                <a
                  href={ch.href}
                  className="inline-flex items-center gap-1.5 mt-5 text-sm font-semibold transition-opacity hover:opacity-75"
                  style={{ color: "#0091AE" }}
                >
                  {ch.action}
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SLA table ── */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-4 mb-10">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#E8F5F8" }}>
              <Clock className="w-5 h-5" style={{ color: "#0091AE" }} />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-1" style={{ color: "#2D3E50" }}>Response time commitments</h2>
              <p className="text-sm" style={{ color: "#516F90" }}>We measure from the moment you submit — not from when your email arrives in a queue.</p>
            </div>
          </div>

          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "#E8EEF4" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#F5F8FA" }}>
                  <th className="text-left px-5 py-3.5 font-semibold" style={{ color: "#33475B" }}>Plan</th>
                  <th className="text-left px-5 py-3.5 font-semibold" style={{ color: "#33475B" }}>Initial response</th>
                  <th className="text-left px-5 py-3.5 font-semibold" style={{ color: "#33475B" }}>Follow-up</th>
                  <th className="text-left px-5 py-3.5 font-semibold" style={{ color: "#33475B" }}>Channels</th>
                  <th className="text-left px-5 py-3.5 font-semibold" style={{ color: "#33475B" }}>Availability</th>
                </tr>
              </thead>
              <tbody>
                {SLA.map((row, i) => (
                  <tr
                    key={row.plan}
                    className="border-t"
                    style={{
                      borderColor: "#E8EEF4",
                      background: row.plan === "Enterprise" ? "#FFF6F3" : "white",
                    }}
                  >
                    <td className="px-5 py-4 font-semibold" style={{ color: row.plan === "Enterprise" ? "#FF7A59" : "#2D3E50" }}>
                      {row.plan}
                    </td>
                    <td className="px-5 py-4" style={{ color: "#33475B" }}>{row.initial}</td>
                    <td className="px-5 py-4" style={{ color: "#33475B" }}>{row.followUp}</td>
                    <td className="px-5 py-4" style={{ color: "#516F90" }}>{row.channels}</td>
                    <td className="px-5 py-4 font-medium" style={{ color: row.plan === "Enterprise" ? "#00BDA5" : "#516F90" }}>
                      {row.hours}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs mt-3 text-center" style={{ color: "#99ACC2" }}>
            SLAs apply to business-hours response for Starter and Professional plans (Mon–Fri, 09:00–18:00 GMT).
          </p>
        </div>
      </section>

      {/* ── Resources ── */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-8" style={{ color: "#2D3E50" }}>Self-service resources</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {RESOURCES.map((res) => (
              <Link
                key={res.title}
                href={res.href}
                className="group bg-white rounded-xl p-5 border flex items-start gap-4 hover:border-[#0091AE] transition-colors"
                style={{ borderColor: "#E8EEF4" }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#F5F8FA" }}>
                  <res.icon className="w-5 h-5" style={{ color: "#0091AE" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold mb-0.5 group-hover:text-[#0091AE] transition-colors" style={{ color: "#2D3E50" }}>{res.title}</p>
                  <p className="text-xs" style={{ color: "#99ACC2" }}>{res.desc}</p>
                </div>
                <ExternalLink className="w-4 h-4 ml-auto mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" style={{ color: "#0091AE" }} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-2" style={{ color: "#2D3E50" }}>Frequently asked questions</h2>
          <p className="text-sm mb-8" style={{ color: "#516F90" }}>Can&rsquo;t find your answer here? Submit a ticket below.</p>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className="rounded-xl border overflow-hidden"
                style={{ borderColor: openFaq === i ? "#0091AE" : "#E8EEF4" }}
              >
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-[#F5F8FA]"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  data-testid={`faq-${i}`}
                >
                  <span className="text-sm font-semibold pr-4" style={{ color: "#2D3E50" }}>{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: "#0091AE" }} />
                    : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: "#99ACC2" }} />
                  }
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 pt-0">
                    <p className="text-sm leading-relaxed" style={{ color: "#516F90" }}>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Submit ticket ── */}
      <section id="submit-ticket" className="py-20 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3" style={{ color: "#2D3E50" }}>Submit a support ticket</h2>
            <p className="text-base" style={{ color: "#516F90" }}>
              Include as much detail as possible — Job IDs, error messages, and screenshots help us resolve issues faster.
            </p>
          </div>

          {submitted ? (
            <div className="bg-white rounded-2xl p-12 text-center border" style={{ borderColor: "#E8EEF4" }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "#E8F5F8" }}>
                <CheckCircle className="w-8 h-8" style={{ color: "#00BDA5" }} />
              </div>
              <h3 className="text-xl font-bold mb-2" style={{ color: "#2D3E50" }}>Ticket received</h3>
              <p className="text-sm mb-6" style={{ color: "#516F90" }}>
                We&rsquo;ve sent a confirmation to <strong>{form.email}</strong>. You&rsquo;ll hear from us within your plan&rsquo;s SLA window.
              </p>
              <Button
                onClick={() => { setSubmitted(false); setForm({ name: "", email: "", subject: "", priority: "normal", message: "" }); }}
                variant="outline"
                size="sm"
              >
                Submit another ticket
              </Button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-2xl p-8 border space-y-5"
              style={{ borderColor: "#E8EEF4" }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: "#33475B" }}>Full name</label>
                  <input
                    required
                    type="text"
                    placeholder="Sarah Chen"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    data-testid="input-name"
                    className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[#0091AE] focus:ring-2 focus:ring-[#0091AE]/10"
                    style={{ borderColor: "#CBD6E2", color: "#33475B" }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: "#33475B" }}>Email address</label>
                  <input
                    required
                    type="email"
                    placeholder="sarah@company.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    data-testid="input-email"
                    className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[#0091AE] focus:ring-2 focus:ring-[#0091AE]/10"
                    style={{ borderColor: "#CBD6E2", color: "#33475B" }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: "#33475B" }}>Subject</label>
                <input
                  required
                  type="text"
                  placeholder="Brief description of your issue"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  data-testid="input-subject"
                  className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[#0091AE] focus:ring-2 focus:ring-[#0091AE]/10"
                  style={{ borderColor: "#CBD6E2", color: "#33475B" }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: "#33475B" }}>Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  data-testid="select-priority"
                  className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[#0091AE] focus:ring-2 focus:ring-[#0091AE]/10 bg-white"
                  style={{ borderColor: "#CBD6E2", color: "#33475B" }}
                >
                  <option value="low">Low — general question or feedback</option>
                  <option value="normal">Normal — feature not working as expected</option>
                  <option value="high">High — service degraded, workaround exists</option>
                  <option value="critical">Critical — service down, no workaround</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: "#33475B" }}>
                  Describe your issue
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Include steps to reproduce, any error messages you see, and your Job ID if applicable."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  data-testid="input-message"
                  className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[#0091AE] focus:ring-2 focus:ring-[#0091AE]/10 resize-none"
                  style={{ borderColor: "#CBD6E2", color: "#33475B" }}
                />
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "#FFF6F3", borderLeft: "3px solid #FF7A59" }}>
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#FF7A59" }} />
                <p className="text-xs" style={{ color: "#516F90" }}>
                  For critical production issues, email <strong>urgent@contentech.com</strong> directly — this bypasses the ticket queue and pages the on-call engineer immediately.
                </p>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full text-white border-0 h-11 font-semibold"
                style={{ background: "#FF7A59" }}
                data-testid="button-submit-ticket"
              >
                {submitting ? "Submitting…" : "Submit Ticket"}
              </Button>
            </form>
          )}
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section className="py-16 px-6" style={{ background: "#2D3E50" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Looking for more than support?</h2>
          <p className="text-sm mb-8" style={{ color: "#99ACC2" }}>
            Talk to our sales team about Enterprise SLAs, dedicated TAMs, and custom onboarding.
          </p>
          <Link href="/contact-sales">
            <Button size="lg" className="text-white border-0" style={{ background: "#FF7A59" }}>
              Contact Sales
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
