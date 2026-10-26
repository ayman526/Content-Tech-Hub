import Link from "next/link";
import {
  ArrowRight, Briefcase, CheckCircle, Building2, Languages,
  Users, Layers, BarChart2, Shield, Key, Star, FileText,
  ChevronRight, Zap, Lock, Globe,
} from "lucide-react";
import MarketingNav from "@/components/marketing/nav";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Product for Agencies — Multi-Client Translation Management | Contentech",
  description:
    "Manage multiple clients, separate workspaces, linguist networks, AI workflows, and brand assets from one central platform built for agency scale.",
};

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Create a workspace per client",
    body: "Each client operates in its own isolated project environment with separate assets, linguist pools, and permission boundaries — no cross-contamination, ever.",
    icon: Building2,
    color: "text-teal-500",
    bg: "bg-teal-50",
  },
  {
    step: "02",
    title: "Assign PMs, reviewers, and linguists",
    body: "Map your internal PM team to specific client workspaces. Assign preferred linguists per language pair and client, or draw from your shared agency pool.",
    icon: Users,
    color: "text-orange-500",
    bg: "bg-orange-50",
  },
  {
    step: "03",
    title: "Orchestrate AI and human workflows",
    body: "Configure per-client AI routing rules and review gates. Some clients want AI-only speed; others need certified human review. Both run on the same platform.",
    icon: Layers,
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    step: "04",
    title: "Deliver, report, and repeat",
    body: "Download client deliverables in the required format. Pull per-client or aggregate reporting on volume, quality, and delivery performance.",
    icon: BarChart2,
    color: "text-green-600",
    bg: "bg-green-50",
  },
];

const FEATURES = [
  {
    icon: Building2,
    title: "Client sub-workspaces",
    body: "Each client gets a dedicated workspace with isolated projects, assets, settings, and linguist assignments. Agency admins see everything; clients only see their own.",
  },
  {
    icon: Lock,
    title: "Separate project and asset isolation",
    body: "TMs, glossaries, style guides, and translation history are scoped per client by default. Share assets across clients explicitly when needed.",
  },
  {
    icon: Users,
    title: "Shared or dedicated linguist pools",
    body: "Build a shared pool of certified linguists across all clients, or reserve specialists for specific accounts. Preferred linguist routing applies per workspace.",
  },
  {
    icon: Star,
    title: "PM and reviewer roles",
    body: "Assign project managers and reviewers with granular role permissions. PMs manage workflow and assignments; reviewers access the editor without project-level controls.",
  },
  {
    icon: Globe,
    title: "Client-specific glossaries and TMs",
    body: "Every client's terminology and translation history is maintained separately, ensuring brand voice and regulatory terminology stays client-accurate.",
  },
  {
    icon: BarChart2,
    title: "Multi-client dashboards",
    body: "Aggregate and per-client reporting on active projects, delivery status, linguist workload, word volume, and quality indicators from one screen.",
  },
  {
    icon: Shield,
    title: "Workflow transparency and audit trail",
    body: "Every action — from AI translation to linguist assignment to approval sign-off — is logged per client. Audit-ready for any client governance requirement.",
  },
  {
    icon: Key,
    title: "Enterprise-grade controls for agency teams",
    body: "SSO, role-based access, API access, and configurable data retention policies. Run the platform on your agency's terms, not ours.",
  },
];

const CLIENT_ISOLATION = [
  "Projects visible only within client workspace",
  "TM and glossary scoped per client by default",
  "Linguist assignments per client, not global",
  "Delivery history isolated per client account",
  "Separate notification streams per workspace",
  "Optional client portal access (read-only reporting)",
];

export default function ProductAgencyPage() {
  return (
    <main className="min-h-screen bg-[#FAFBFC]">
      <MarketingNav />

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-teal-50/60 to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto relative">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-teal-500" />
            </div>
            <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#0091AE" }}>
              Product for Agencies
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight" style={{ color: "#33475B" }}>
            Serve every client.<br />
            <span style={{ color: "#0091AE" }}>From one platform.</span>
          </h1>

          <p className="text-xl max-w-2xl mb-10 leading-relaxed" style={{ color: "#516F90" }}>
            Contentech gives agencies the infrastructure to manage multiple clients, separate workspaces, shared and dedicated linguist networks, and AI-accelerated workflows — all within a single, audit-ready system.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link href="/contact-sales">
              <Button size="lg" className="text-white border-0 shadow-sm" style={{ background: "#0091AE" }} data-testid="btn-agency-demo">
                Book a Demo
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/contact-sales">
              <Button size="lg" variant="outline" data-testid="btn-agency-sales">
                Contact Sales
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap gap-8 text-sm mt-14 pt-8 border-t border-gray-200" style={{ color: "#516F90" }}>
            {[
              { stat: "Unlimited", label: "Client workspaces" },
              { stat: "Isolated", label: "Assets per client" },
              { stat: "Configurable", label: "AI + human routing" },
              { stat: "Full", label: "Audit trail access" },
            ].map(({ stat, label }) => (
              <div key={label}>
                <strong className="block text-lg font-bold" style={{ color: "#33475B" }}>{stat}</strong>
                <span className="text-xs">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Multi-client model */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#0091AE" }}>Multi-client workspace model</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: "#33475B" }}>
            One agency. Many clients. Zero confusion.
          </h2>
          <p className="text-lg mb-14 max-w-2xl" style={{ color: "#516F90" }}>
            Each client has their own fully isolated environment inside your agency account.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {WORKFLOW_STEPS.map((step) => (
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

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#0091AE" }}>Platform features for agencies</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-14" style={{ color: "#33475B" }}>
            Scalable delivery operations, built in.
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="p-6 rounded-2xl border border-gray-100 bg-white hover:shadow-sm transition-shadow">
                <div className="w-10 h-10 bg-[#E8F5F8] rounded-xl flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5" style={{ color: "#0091AE" }} />
                </div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: "#33475B" }}>{f.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "#516F90" }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Client isolation */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="rounded-2xl p-8 border border-gray-100" style={{ background: "linear-gradient(135deg, #E8F5F8 0%, #F5F8FA 100%)" }}>
              <Lock className="w-12 h-12 mb-5" style={{ color: "#0091AE" }} />
              <p className="text-2xl font-bold mb-2" style={{ color: "#33475B" }}>Client isolation is the default, not a setting.</p>
              <p className="text-sm leading-relaxed mb-6" style={{ color: "#516F90" }}>
                Contentech enforces workspace boundaries at every layer — data, assets, notifications, and reporting. You choose what to share and what to keep separate.
              </p>
              <ul className="space-y-2">
                {CLIENT_ISOLATION.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm" style={{ color: "#516F90" }}>
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-teal-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#0091AE" }}>Client permissions</p>
              <h2 className="text-3xl font-bold mb-5" style={{ color: "#33475B" }}>
                Your team runs the platform.<br />Clients see what you decide.
              </h2>
              <p className="text-base mb-6 leading-relaxed" style={{ color: "#516F90" }}>
                Agency admins and PMs have full control. Linguists see only their assigned tasks. Reviewers access the editor with no project admin rights. Clients can optionally receive a read-only dashboard for their own projects — no setup required.
              </p>
              <p className="text-base leading-relaxed" style={{ color: "#516F90" }}>
                Every role, every permission, every workspace boundary is configurable from your agency admin panel.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="rounded-3xl p-12 border border-gray-100" style={{ background: "linear-gradient(135deg, #0091AE 0%, #007A94 100%)" }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-white/60">For agencies</p>
            <h2 className="text-3xl font-bold text-white mb-4">
              Manage every client. Deliver with confidence.
            </h2>
            <p className="text-white/70 mb-8 leading-relaxed">
              Talk to our agency team about dedicated onboarding, volume pricing, and white-label options.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/contact-sales">
                <Button size="lg" className="text-[#0091AE] border-0 font-semibold" style={{ background: "white" }}>
                  Book a Demo
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
            <Link href="/product/linguist" className="group flex items-center gap-4 p-5 rounded-xl border border-gray-100 bg-white hover:border-[#0091AE]/30 hover:shadow-sm transition-all">
              <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Languages className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#33475B" }}>Product for Linguists</p>
                <p className="text-xs" style={{ color: "#99ACC2" }}>Task inbox, AI draft review, and delivery tools for professional translators</p>
              </div>
              <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0 group-hover:translate-x-1 transition-transform" style={{ color: "#99ACC2" }} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
