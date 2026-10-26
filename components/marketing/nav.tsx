"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck, Database, UserCheck, Code2,
  ChevronDown, Menu, X, Zap, ArrowRight,
  LogIn, LayoutDashboard, LifeBuoy, Phone,
  Building2, Briefcase, Languages, LayoutGrid,
  BookOpen, Cpu, Globe2, HelpCircle, FileText, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";

const PRODUCT = [
  {
    id: "customer",
    name: "Customer",
    tagline: "For companies managing multilingual content",
    description: "AI, in-house linguists, glossaries, and review workflows in one platform — with full enterprise control.",
    icon: Building2,
    color: "text-orange-500",
    bg: "bg-orange-50",
    href: "/product/customer",
  },
  {
    id: "agency",
    name: "Agency",
    tagline: "For agencies serving multiple clients",
    description: "Separate workspaces per client, shared linguist pools, AI + human orchestration, and audit-ready delivery.",
    icon: Briefcase,
    color: "text-teal-500",
    bg: "bg-teal-50",
    href: "/product/agency",
  },
  {
    id: "linguist",
    name: "Linguist",
    tagline: "For translators inside structured workflows",
    description: "Task inbox, AI draft review, TM and glossary access, revision handling, and delivery tools built for professionals.",
    icon: Languages,
    color: "text-violet-600",
    bg: "bg-violet-50",
    href: "/product/linguist",
  },
];

const SERVICES = [
  {
    id: "ai-quality-shield",
    name: "AI Quality Shield",
    tagline: "Your AI Safety Net",
    description: "Human experts validate AI-generated translations for accuracy, cultural fit, and legal compliance.",
    icon: ShieldCheck,
    color: "text-teal-400",
    bg: "bg-teal-50",
    href: "/services/ai-quality-shield",
  },
  {
    id: "ai-training-data",
    name: "AI Training Data",
    tagline: "Fuel the AI Revolution",
    description: "High-quality annotated datasets, RLHF, and human-verified training data for LLM development.",
    icon: Database,
    color: "text-navy-600",
    bg: "bg-navy-50",
    href: "/services/ai-training-data",
  },
  {
    id: "contentech-human",
    name: "Contentech Human™",
    tagline: "Zero AI Tolerance",
    description: "Certified specialists for legal, life sciences, and high-stakes content where precision is non-negotiable.",
    icon: UserCheck,
    color: "text-gold-500",
    bg: "bg-gold-50",
    href: "/services/contentech-human",
  },
  {
    id: "localization-engineering",
    name: "Localization Engineering",
    tagline: "Beyond Translation",
    description: "i18n architecture, TMS implementation, RTL engineering, and strategic localization consulting.",
    icon: Code2,
    color: "text-purple-600",
    bg: "bg-purple-50",
    href: "/services/localization-engineering",
  },
];

const PRODUCT_FOOTER = [
  { label: "Compare workflows", href: "/product/customer#workflows" },
  { label: "Platform capabilities", href: "/product/customer#capabilities" },
  { label: "See all roles", href: "/product/agency" },
];

const RESOURCES = [
  {
    group: "By Role",
    items: [
      { label: "Customers", href: "/resources/category/by-role", icon: Users, color: "text-orange-500", bg: "bg-orange-50" },
      { label: "Agencies", href: "/resources/category/by-role", icon: Briefcase, color: "text-teal-500", bg: "bg-teal-50" },
      { label: "Linguists", href: "/resources/category/by-role", icon: Languages, color: "text-violet-500", bg: "bg-violet-50" },
      { label: "Admins / IT Teams", href: "/resources/category/by-role", icon: ShieldCheck, color: "text-slate-500", bg: "bg-slate-50" },
    ],
  },
  {
    group: "Product Guides",
    items: [
      { label: "Getting Started", href: "/resources/category/product-guides", icon: BookOpen, color: "text-teal-500", bg: "bg-teal-50" },
      { label: "Credits & Usage", href: "/resources/category/product-guides", icon: Database, color: "text-blue-500", bg: "bg-blue-50" },
      { label: "AI + Human Workflow", href: "/resources/category/ai-llms", icon: Cpu, color: "text-violet-500", bg: "bg-violet-50" },
      { label: "CMS & Connectors", href: "/resources/category/integrations", icon: Globe2, color: "text-green-500", bg: "bg-green-50" },
    ],
  },
  {
    group: "References",
    items: [
      { label: "AI & LLMs", href: "/resources/category/ai-llms", icon: Cpu, color: "text-purple-500", bg: "bg-purple-50" },
      { label: "File Formats", href: "/resources/category/file-formats", icon: FileText, color: "text-amber-500", bg: "bg-amber-50" },
      { label: "Integrations", href: "/resources/category/integrations", icon: Globe2, color: "text-cyan-500", bg: "bg-cyan-50" },
      { label: "Help Center / FAQ", href: "/resources/category/help-center", icon: HelpCircle, color: "text-orange-500", bg: "bg-orange-50" },
    ],
  },
];

function extractLocale(pathname: string): string {
  const match = pathname.match(/^\/([a-z]{2})(\/|$)/);
  return match ? match[1] : "en";
}

export default function MarketingNav({ locale: localeProp }: { locale?: string }) {
  const [productOpen, setProductOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileProductOpen, setMobileProductOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [mobileResourcesOpen, setMobileResourcesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  const productTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const servicesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resourcesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMenu = (set: (v: boolean) => void, timer: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) => {
    if (timer.current) clearTimeout(timer.current);
    set(true);
  };
  const closeMenu = (set: (v: boolean) => void, timer: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) => {
    timer.current = setTimeout(() => set(false), 120);
  };

  const locale = localeProp ?? extractLocale(pathname);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setProductOpen(false);
    setServicesOpen(false);
    setResourcesOpen(false);
  }, [pathname]);

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled ? "bg-white/97 backdrop-blur-md shadow-sm" : "bg-white/80 backdrop-blur-sm"
        )}
      >
        {/* Utility bar */}
        <div
          className={cn("hidden md:block border-b transition-colors duration-300", scrolled ? "border-gray-200/80" : "border-gray-200/50")}
          style={{ background: scrolled ? "#F5F8FA" : "#F0F3F7" }}
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center justify-between h-9">
              <p className="text-xs" style={{ color: "#99ACC2" }}>
                Trusted by 1,000+ organizations in 40+ countries
              </p>
              <div className="flex items-center divide-x divide-gray-200/80">
                <div className="pr-4">
                  <LanguageSwitcher compact locale={locale} />
                </div>
                <Link href="/support" className="flex items-center gap-1.5 px-4 text-xs font-medium transition-colors hover:text-[#33475B]"
                  style={{ color: "#516F90" }} data-testid="util-support">
                  <LifeBuoy className="w-3 h-3" />
                  Customer Support
                </Link>
                <Link href="/contact-sales" className="flex items-center gap-1.5 px-4 text-xs font-medium transition-colors hover:text-[#33475B]"
                  style={{ color: "#516F90" }} data-testid="util-contact-sales">
                  <Phone className="w-3 h-3" />
                  Contact Sales
                </Link>
                <Link href="/login" className="flex items-center gap-1.5 px-4 text-xs font-medium transition-colors hover:text-[#33475B]"
                  style={{ color: "#516F90" }} data-testid="util-sign-in">
                  <LogIn className="w-3 h-3" />
                  Log In
                </Link>
                <Link href="/linguist-login" className="flex items-center gap-1.5 pl-4 text-xs font-medium transition-colors hover:text-[#33475B]"
                  style={{ color: "#516F90" }} data-testid="util-linguist-portal">
                  <LayoutDashboard className="w-3 h-3" />
                  Linguist Portal
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main nav row */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex h-14 items-center justify-between">
            <Link href={`/${locale}`} className="group flex-shrink-0">
              <span className="block text-2xl font-bold tracking-tight group-hover:opacity-80 transition-opacity" style={{ color: "#33475B" }}>
                Contentech
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {/* ── Product ── */}
              <div className="relative">
                <button
                  onMouseEnter={() => openMenu(setProductOpen, productTimer)}
                  onMouseLeave={() => closeMenu(setProductOpen, productTimer)}
                  onClick={() => setProductOpen(!productOpen)}
                  data-testid="nav-product"
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    productOpen ? "text-[#33475B] bg-[#F5F8FA]" : "text-[#516F90] hover:text-[#33475B] hover:bg-[#F5F8FA]"
                  )}
                >
                  Product
                  <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", productOpen && "rotate-180")} />
                </button>

                {productOpen && (
                  <div
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[620px] bg-white rounded-2xl shadow-2xl border border-gray-100 mega-menu-enter overflow-hidden"
                    onMouseEnter={() => openMenu(setProductOpen, productTimer)}
                    onMouseLeave={() => closeMenu(setProductOpen, productTimer)}
                  >
                    <div className="p-2">
                      <div className="grid grid-cols-3 gap-1">
                        {PRODUCT.map((item) => (
                          <Link key={item.id} href={item.href}
                            className="group flex flex-col gap-3 p-4 rounded-xl hover:bg-[#F5F8FA] transition-colors"
                            data-testid={`nav-product-${item.id}`}>
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", item.bg)}>
                              <item.icon className={cn("w-5 h-5", item.color)} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold mb-1 transition-colors group-hover:text-[#33475B]" style={{ color: "#33475B" }}>
                                {item.name}
                              </p>
                              <p className="text-xs font-medium mb-1.5 italic" style={{ color: "#0091AE" }}>
                                {item.tagline}
                              </p>
                              <p className="text-xs leading-relaxed" style={{ color: "#99ACC2" }}>
                                {item.description}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                      <div className="mt-2 px-4 py-3 rounded-xl flex items-center justify-between gap-4"
                        style={{ background: "linear-gradient(to right, #F5F8FA, #FFF4F0)" }}>
                        <div className="flex items-center gap-4">
                          {PRODUCT_FOOTER.map((f) => (
                            <Link key={f.label} href={f.href}
                              className="flex items-center gap-1 text-xs font-medium transition-colors hover:text-[#FF7A59]"
                              style={{ color: "#516F90" }}>
                              <LayoutGrid className="w-3 h-3" />
                              {f.label}
                            </Link>
                          ))}
                        </div>
                        <Link href="/register">
                          <Button size="sm" className="gap-1.5 text-white border-0 shrink-0" style={{ background: "#FF7A59" }}>
                            <Zap className="w-3.5 h-3.5" />
                            Start FREE
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Resources ── */}
              <div className="relative">
                <button
                  onMouseEnter={() => openMenu(setResourcesOpen, resourcesTimer)}
                  onMouseLeave={() => closeMenu(setResourcesOpen, resourcesTimer)}
                  onClick={() => setResourcesOpen(!resourcesOpen)}
                  data-testid="nav-resources"
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    resourcesOpen ? "text-[#33475B] bg-[#F5F8FA]" : "text-[#516F90] hover:text-[#33475B] hover:bg-[#F5F8FA]"
                  )}
                >
                  Resources
                  <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", resourcesOpen && "rotate-180")} />
                </button>

                {resourcesOpen && (
                  <div
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[720px] bg-white rounded-2xl shadow-2xl border border-gray-100 mega-menu-enter overflow-hidden"
                    onMouseEnter={() => openMenu(setResourcesOpen, resourcesTimer)}
                    onMouseLeave={() => closeMenu(setResourcesOpen, resourcesTimer)}
                  >
                    <div className="p-4">
                      <div className="grid grid-cols-3 gap-4">
                        {RESOURCES.map((group) => (
                          <div key={group.group}>
                            <p className="text-[10px] font-bold uppercase tracking-widest px-2 mb-2" style={{ color: "#99ACC2" }}>
                              {group.group}
                            </p>
                            <div className="space-y-0.5">
                              {group.items.map((item) => (
                                <Link
                                  key={item.label}
                                  href={item.href}
                                  className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-[#F5F8FA] transition-colors group"
                                >
                                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", item.bg)}>
                                    <item.icon className={cn("w-3.5 h-3.5", item.color)} />
                                  </div>
                                  <span className="text-sm font-medium group-hover:text-[#0091AE] transition-colors" style={{ color: "#33475B" }}>
                                    {item.label}
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 p-4 rounded-xl flex items-center justify-between"
                        style={{ background: "linear-gradient(to right, #F0F8FA, #E8F5F8)" }}>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: "#33475B" }}>Browse all resources</p>
                          <p className="text-xs mt-0.5" style={{ color: "#99ACC2" }}>Guides, FAQs, integrations, file formats and more</p>
                        </div>
                        <Link href="/resources">
                          <Button size="sm" className="gap-1.5 text-white border-0" style={{ background: "#0091AE" }}>
                            <BookOpen className="w-3.5 h-3.5" />
                            Resources Hub
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Link href={`/${locale}/quality`}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[#F5F8FA] hover:text-[#33475B]"
                style={{ color: "#516F90" }}
                data-testid="nav-quality">
                {locale === "ar" ? "الجودة" : "Quality"}
              </Link>
              <Link href={`/${locale}/pricing`}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[#F5F8FA] hover:text-[#33475B]"
                style={{ color: "#516F90" }}>
                {locale === "ar" ? "الأسعار" : "Pricing"}
              </Link>
              <Link href={`/${locale}/about`}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[#F5F8FA] hover:text-[#33475B]"
                style={{ color: "#516F90" }}>
                {locale === "ar" ? "عن كونتنتك" : "About"}
              </Link>
            </nav>

            <div className="hidden md:flex items-center">
              <Link href="/register">
                <Button size="sm" className="font-semibold text-white border-0 shadow-sm"
                  style={{ background: "#FF7A59" }} data-testid="nav-start-free">
                  {locale === "ar" ? "ابدأ مجانًا" : "Start FREE"}
                  <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>

            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              style={{ color: "#516F90" }}
              onClick={() => setMobileOpen(!mobileOpen)}
              data-testid="nav-mobile-toggle"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-0 right-0 h-full w-80 bg-white shadow-2xl overflow-y-auto">
            <div className="p-6 pt-20">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-6 pb-4 border-b border-gray-100">
                <LanguageSwitcher compact locale={locale} />
                <Link href="/support" className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#516F90" }}>
                  <LifeBuoy className="w-3 h-3" /> Support
                </Link>
                <Link href="/contact-sales" className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#516F90" }}>
                  <Phone className="w-3 h-3" /> Contact Sales
                </Link>
                <Link href="/login" className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#516F90" }}>
                  <LogIn className="w-3 h-3" /> Log In
                </Link>
                <Link href="/linguist-login" className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#516F90" }}>
                  <LayoutDashboard className="w-3 h-3" /> Linguist Portal
                </Link>
              </div>

              {/* Product accordion */}
              <button
                className="flex items-center justify-between w-full py-2.5 text-sm font-semibold"
                style={{ color: "#33475B" }}
                onClick={() => setMobileProductOpen(!mobileProductOpen)}
                data-testid="mobile-product-toggle"
              >
                Product
                <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", mobileProductOpen && "rotate-180")}
                  style={{ color: "#99ACC2" }} />
              </button>
              {mobileProductOpen && (
                <div className="mb-2 pl-1">
                  {PRODUCT.map((item) => (
                    <Link key={item.id} href={item.href}
                      className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0"
                      data-testid={`mobile-product-${item.id}`}>
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", item.bg)}>
                        <item.icon className={cn("w-4 h-4", item.color)} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "#33475B" }}>{item.name}</p>
                        <p className="text-xs" style={{ color: "#99ACC2" }}>{item.tagline}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Resources accordion */}
              <button
                className="flex items-center justify-between w-full py-2.5 text-sm font-semibold border-t border-gray-100"
                style={{ color: "#33475B" }}
                onClick={() => setMobileResourcesOpen(!mobileResourcesOpen)}
                data-testid="mobile-resources-toggle"
              >
                Resources
                <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", mobileResourcesOpen && "rotate-180")}
                  style={{ color: "#99ACC2" }} />
              </button>
              {mobileResourcesOpen && (
                <div className="mb-2 pl-1">
                  {RESOURCES.map((group) => (
                    <div key={group.group} className="mb-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-2 mb-1">{group.group}</p>
                      {group.items.map((item) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
                          data-testid={`mobile-resource-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", item.bg)}>
                            <item.icon className={cn("w-3.5 h-3.5", item.color)} />
                          </div>
                          <p className="text-sm font-medium" style={{ color: "#33475B" }}>{item.label}</p>
                        </Link>
                      ))}
                    </div>
                  ))}
                  <Link href="/resources" className="flex items-center gap-1.5 py-2 text-sm font-semibold" style={{ color: "#0091AE" }}>
                    <BookOpen className="w-3.5 h-3.5" /> View all resources
                  </Link>
                </div>
              )}

              <div className="mt-2 space-y-1 border-t border-gray-100 pt-2">
                <Link href={`/${locale}/quality`} className="block py-2.5 text-sm font-medium" style={{ color: "#516F90" }}
                  data-testid="mobile-nav-quality">
                  {locale === "ar" ? "الجودة" : "Quality"}
                </Link>
                <Link href={`/${locale}/pricing`} className="block py-2.5 text-sm font-medium" style={{ color: "#516F90" }}>
                  {locale === "ar" ? "الأسعار" : "Pricing"}
                </Link>
                <Link href={`/${locale}/about`} className="block py-2.5 text-sm font-medium" style={{ color: "#516F90" }}>
                  {locale === "ar" ? "عن كونتنتك" : "About"}
                </Link>
              </div>

              <div className="mt-6">
                <Link href="/register">
                  <Button className="w-full text-white border-0" style={{ background: "#FF7A59" }}>
                    {locale === "ar" ? "ابدأ مجانًا" : "Start FREE"}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
