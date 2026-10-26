import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Globe,
  Languages,
  Users,
  Zap,
  ShieldCheck,
  BarChart3,
  CheckCircle,
  ArrowRight,
  Star,
  ChevronRight,
  FileText,
  Clock,
  Cpu,
  BookOpen,
  Building2,
  Award,
  TrendingUp,
  MessageSquare,
} from "lucide-react";

const FEATURES = [
  {
    icon: Cpu,
    title: "AI-Powered Translation",
    description:
      "GPT-4 translation engine delivers first drafts instantly, cutting turnaround time by up to 80% while maintaining context and nuance.",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: Users,
    title: "Expert Linguist Network",
    description:
      "300+ vetted professional translators across 80+ language pairs. Smart routing matches your project to the right specialist every time.",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    icon: BookOpen,
    title: "Translation Memory & Glossary",
    description:
      "Reuse previously approved translations and enforce brand terminology automatically, slashing costs on repetitive content.",
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description:
      "Full visibility into project progress, linguist performance, spending, and quality metrics through a powerful admin dashboard.",
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise Security",
    description:
      "SOC 2 compliant infrastructure, end-to-end encryption, SSO support, and granular role-based access controls.",
    color: "text-red-600",
    bg: "bg-red-50",
  },
  {
    icon: Zap,
    title: "API & Integrations",
    description:
      "Connect to your CMS, code repo, or design tools. Native integrations with Figma, GitHub, Contentful, and more.",
    color: "text-yellow-600",
    bg: "bg-yellow-50",
  },
];

const PLANS = [
  {
    name: "Basic",
    price: "$49",
    period: "/ month",
    description: "Perfect for individuals and small teams getting started.",
    highlight: false,
    features: [
      "Up to 50,000 words / month",
      "5 language pairs",
      "AI translation drafts",
      "3 user seats",
      "Email support",
      "Basic analytics",
    ],
    cta: "Start FREE",
    badge: null,
  },
  {
    name: "Professional",
    price: "$149",
    period: "/ month",
    description: "For growing teams that need power and flexibility.",
    highlight: true,
    features: [
      "Up to 250,000 words / month",
      "25 language pairs",
      "AI + expert human review",
      "15 user seats",
      "Translation memory & glossary",
      "Priority support",
      "Full analytics dashboard",
      "API access",
    ],
    cta: "Start FREE",
    badge: "Most Popular",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Unlimited scale with dedicated support and SLAs.",
    highlight: false,
    features: [
      "Unlimited words",
      "Unlimited language pairs",
      "Dedicated linguist team",
      "Unlimited seats",
      "Custom workflows",
      "SSO & advanced security",
      "SLA guarantees",
      "Dedicated account manager",
    ],
    cta: "Contact Sales",
    badge: null,
  },
];

const TESTIMONIALS = [
  {
    name: "Sarah Chen",
    role: "Head of Localization, TechCorp",
    avatar: "SC",
    stars: 5,
    text: "TranslateHub cut our time-to-market for new markets from 3 weeks to 4 days. The AI drafts combined with human review is a game changer.",
  },
  {
    name: "Marcus Oliveira",
    role: "VP Operations, GlobalRetail",
    avatar: "MO",
    stars: 5,
    text: "We process over 2 million words a month. The translation memory alone has saved us $80K annually. The ROI was clear within the first quarter.",
  },
  {
    name: "Amira Khalil",
    role: "Content Director, MediaGroup",
    avatar: "AK",
    stars: 5,
    text: "The linguist matching is brilliant. We always get domain experts — our legal and medical content has never been more accurately translated.",
  },
];

const STATS = [
  { value: "180+", label: "Languages Supported" },
  { value: "98.7%", label: "Client Satisfaction" },
  { value: "2.4M+", label: "Words Translated Daily" },
  { value: "300+", label: "Expert Linguists" },
];

function NavBar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled
          ? "bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">TranslateHub</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Features</a>
          <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
          <a href="#testimonials" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Customers</a>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.href = "/api/login"}
            data-testid="nav-login"
          >
            Sign In
          </Button>
          <Button
            size="sm"
            onClick={() => window.location.href = "/api/login"}
            data-testid="nav-get-started"
          >
            Get Started Free
          </Button>
        </div>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="pt-32 pb-20 px-6 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto text-center">
        <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium bg-blue-100 text-blue-700 border-blue-200">
          <Zap className="w-3.5 h-3.5 mr-1.5 inline" />
          Now with GPT-4 Translation Engine
        </Badge>

        <h1 className="text-5xl md:text-7xl font-bold text-gray-900 leading-tight mb-6">
          Enterprise Translation{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            at the speed of AI
          </span>
        </h1>

        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed">
          The all-in-one platform that combines AI-powered translation drafts with a network of 300+ expert linguists. Ship global products faster, at lower cost, without sacrificing quality.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Button
            size="lg"
            className="px-8 h-12 text-base shadow-lg"
            onClick={() => window.location.href = "/api/login"}
            data-testid="hero-cta-primary"
          >
            Start FREE
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="px-8 h-12 text-base"
            data-testid="hero-cta-demo"
          >
            Watch Demo
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <p className="text-sm text-gray-500 mb-12">
          No credit card required · 14-day free trial · Cancel anytime
        </p>

        <div className="relative mx-auto max-w-5xl rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-white">
          <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <div className="flex-1 mx-4 bg-white rounded-md px-4 py-1 text-xs text-gray-400 text-left">
              app.translatehub.com/dashboard
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 p-10 min-h-64 flex items-center justify-center">
            <div className="grid grid-cols-3 gap-6 w-full max-w-2xl">
              {[
                { icon: FileText, label: "Active Orders", value: "24", color: "bg-white/10" },
                { icon: Languages, label: "Languages", value: "12", color: "bg-white/10" },
                { icon: TrendingUp, label: "Words/Month", value: "1.2M", color: "bg-white/10" },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className={`${color} backdrop-blur rounded-xl p-6 text-white text-center`}>
                  <Icon className="w-8 h-8 mx-auto mb-3 opacity-80" />
                  <div className="text-3xl font-bold mb-1">{value}</div>
                  <div className="text-sm opacity-70">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  return (
    <section className="py-16 bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
              <div className="text-4xl font-bold text-gray-900 mb-2">{value}</div>
              <div className="text-sm text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 bg-blue-100 text-blue-700 border-blue-200">
            Platform Features
          </Badge>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Everything you need to go global
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            A complete translation management system built for modern teams — from startup to enterprise.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map(({ icon: Icon, title, description, color, bg }) => (
            <div
              key={title}
              className="bg-white rounded-2xl p-8 border border-gray-200 hover:shadow-lg transition-shadow duration-200"
              data-testid={`feature-${title.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center mb-5`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      step: "01",
      title: "Upload your content",
      description: "Drop in files or connect via API. We support DOCX, XLIFF, HTML, JSON, SRT and more.",
      icon: FileText,
    },
    {
      step: "02",
      title: "AI creates a draft",
      description: "GPT-4 generates a high-quality first draft in seconds using your glossary and TM.",
      icon: Cpu,
    },
    {
      step: "03",
      title: "Expert review & delivery",
      description: "A matched linguist reviews, refines, and approves. You get polished, accurate copy.",
      icon: Award,
    },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 bg-purple-100 text-purple-700 border-purple-200">
            How It Works
          </Badge>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            From upload to delivery in hours, not weeks
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Our hybrid AI + human workflow delivers fast, accurate translations at every scale.
          </p>
        </div>

        <div className="relative">
          <div className="hidden md:block absolute top-16 left-1/2 -translate-x-1/2 w-2/3 h-0.5 bg-gradient-to-r from-blue-200 via-purple-200 to-blue-200" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {steps.map(({ step, title, description, icon: Icon }) => (
              <div key={step} className="text-center relative">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg relative z-10">
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <div className="text-sm font-mono text-blue-500 font-bold mb-2">{step}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
                <p className="text-gray-600 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 bg-green-100 text-green-700 border-green-200">
            Pricing
          </Badge>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Start for free, scale as you grow. All plans include AI translation, TM, and glossary features.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {PLANS.map(({ name, price, period, description, highlight, features, cta, badge }) => (
            <div
              key={name}
              className={`relative rounded-2xl p-8 border ${
                highlight
                  ? "bg-gradient-to-br from-blue-600 to-purple-700 border-transparent text-white shadow-2xl scale-105"
                  : "bg-white border-gray-200 text-gray-900"
              }`}
              data-testid={`plan-${name.toLowerCase()}`}
            >
              {badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-yellow-400 text-yellow-900 border-0 px-4 py-1 shadow">
                    <Star className="w-3 h-3 mr-1 inline fill-current" />
                    {badge}
                  </Badge>
                </div>
              )}

              <div className="mb-6">
                <h3 className={`text-lg font-semibold mb-1 ${highlight ? "text-white" : "text-gray-900"}`}>
                  {name}
                </h3>
                <div className="flex items-end gap-1 mb-3">
                  <span className={`text-5xl font-bold ${highlight ? "text-white" : "text-gray-900"}`}>
                    {price}
                  </span>
                  <span className={`text-sm mb-2 ${highlight ? "text-blue-200" : "text-gray-500"}`}>
                    {period}
                  </span>
                </div>
                <p className={`text-sm ${highlight ? "text-blue-100" : "text-gray-600"}`}>
                  {description}
                </p>
              </div>

              <Button
                className={`w-full mb-8 ${
                  highlight
                    ? "bg-white text-blue-700 hover:bg-blue-50"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
                size="lg"
                onClick={() => window.location.href = "/api/login"}
                data-testid={`plan-cta-${name.toLowerCase()}`}
              >
                {cta}
              </Button>

              <ul className="space-y-3">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <CheckCircle
                      className={`w-4 h-4 mt-0.5 flex-shrink-0 ${highlight ? "text-blue-200" : "text-green-500"}`}
                    />
                    <span className={highlight ? "text-blue-100" : "text-gray-600"}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 bg-orange-100 text-orange-700 border-orange-200">
            Customer Stories
          </Badge>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Trusted by global teams
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            From Series A startups to Fortune 500 companies, teams rely on TranslateHub to reach global audiences.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TESTIMONIALS.map(({ name, role, avatar, stars, text }) => (
            <div
              key={name}
              className="bg-gray-50 rounded-2xl p-8 border border-gray-200"
              data-testid={`testimonial-${name.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: stars }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 mb-6 leading-relaxed text-sm">"{text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  {avatar}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{name}</div>
                  <div className="text-gray-500 text-xs">{role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 items-center opacity-40">
          {["Acme Corp", "GlobalTech", "MediaGroup", "RetailPlus"].map((company) => (
            <div key={company} className="flex items-center justify-center">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                <span className="font-bold text-lg tracking-tight">{company}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className="py-24 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
          Ready to go global?
        </h2>
        <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
          Join 1,000+ companies using TranslateHub to ship faster, spend smarter, and reach every market.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            className="bg-white text-blue-700 hover:bg-blue-50 px-8 h-12 text-base shadow-lg"
            onClick={() => window.location.href = "/api/login"}
            data-testid="cta-start-trial"
          >
            Start FREE
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="border-white/40 text-white hover:bg-white/10 px-8 h-12 text-base"
            data-testid="cta-contact-sales"
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Talk to Sales
          </Button>
        </div>
        <p className="text-blue-200 text-sm mt-6">
          14-day free trial · No credit card · Full access
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-bold text-xl">TranslateHub</span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs">
              The enterprise translation platform that combines AI speed with human expertise.
            </p>
          </div>
          {[
            {
              title: "Product",
              links: ["Features", "Pricing", "Integrations", "Changelog"],
            },
            {
              title: "Company",
              links: ["About", "Blog", "Careers", "Press"],
            },
            {
              title: "Legal",
              links: ["Privacy", "Terms", "Security", "Cookies"],
            },
          ].map(({ title, links }) => (
            <div key={title}>
              <h4 className="text-white font-semibold text-sm mb-4">{title}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm hover:text-white transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm">© 2026 TranslateHub. All rights reserved.</p>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4" />
            <span>Average delivery: 4 hours</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <TestimonialsSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
