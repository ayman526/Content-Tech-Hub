import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight, CheckCircle, Star, Zap, ChevronRight,
  Globe2, Clock, FileText,
  ShieldCheck, Database, UserCheck, Lock,
  KeyRound, Server, Users2,
  Code2, Scale, Activity, Megaphone, ShoppingBag, BarChart3,
  Mail, Briefcase, MessageSquare,
} from "lucide-react";
import MarketingNav from "@/components/marketing/nav";
import { Button } from "@/components/ui/button";
import { HomeFAQ } from "@/components/marketing/home-faq";
import HeroWizardDemo from "@/components/marketing/hero-wizard-demo";
import { prisma } from "@/lib/prisma";
import { getPageMeta, buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

const TRUST_COMPANIES = [
  "LexCorp Legal", "DataScale AI", "PharmaTrans", "AlphaBank",
  "NovaMed Group", "OmniRetail", "TechBridge",
];

const DEFAULT_STATS = {
  en: [
    { value: "180+", label: "Languages Supported" },
    { value: "300+", label: "Certified Linguists" },
    { value: "99.2%", label: "Client Satisfaction" },
    { value: "4h", label: "Average Turnaround" },
  ],
  ar: [
    { value: "180+", label: "لغة مدعومة" },
    { value: "300+", label: "استراتيجي محتوى معتمد" },
    { value: "99.2%", label: "رضا العملاء" },
    { value: "4h", label: "متوسط وقت التسليم" },
  ],
};

const VALUE_PROPS = {
  en: [
    { icon: Zap, color: "text-[#FF7A59]", bg: "bg-[#FFF1EC]", title: "Speed at Scale", description: "AI pre-translation delivers a high-quality first draft in minutes, not days." },
    { icon: ShieldCheck, color: "text-[#0091AE]", bg: "bg-[#E8F5F8]", title: "Human-Grade Accuracy", description: "Every AI draft is reviewed by certified linguists with your Translation Memory and Glossary." },
    { icon: Lock, color: "text-[#33475B]", bg: "bg-[#EEF1F5]", title: "Complete Data Control", description: "Use your own API keys, your own linguists, or your own on-premises LLM. Your data stays yours." },
    { icon: Globe2, color: "text-[#6E5BA6]", bg: "bg-purple-50", title: "180+ Languages", description: "Deep specialist coverage for Arabic, Japanese, German, French, and all major language pairs." },
  ],
  ar: [
    { icon: Zap, color: "text-[#FF7A59]", bg: "bg-[#FFF1EC]", title: "السرعة على نطاق واسع", description: "الترجمة المسبقة بالذكاء الاصطناعي تنتج مسودة عالية الجودة في دقائق وليس أيام." },
    { icon: ShieldCheck, color: "text-[#0091AE]", bg: "bg-[#E8F5F8]", title: "دقة على مستوى الإنسان", description: "كل مسودة ذكاء اصطناعي تُراجع من قِبل استراتيجيي محتوى معتمدين مع ذاكرة الترجمة والمسرد." },
    { icon: Lock, color: "text-[#33475B]", bg: "bg-[#EEF1F5]", title: "تحكم كامل بالبيانات", description: "استخدم مفاتيح API الخاصة بك، استراتيجيي المحتوى الخاصين بك، أو نموذج اللغة الخاص بك. بياناتك تبقى ملكك." },
    { icon: Globe2, color: "text-[#6E5BA6]", bg: "bg-purple-50", title: "180+ لغة", description: "تغطية متخصصة عميقة للعربية واليابانية والألمانية والفرنسية وجميع أزواج اللغات الرئيسية." },
  ],
};

const FOOTER_LINKS_DEFAULT = {
  Platform: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Translation Wizard", href: "/dashboard/wizard" },
    { label: "Translation Memory", href: "/dashboard/memory" },
    { label: "Linguist Portal", href: "/linguist-login" },
  ],
  Services: [
    { label: "AI Quality Shield", href: "/services/ai-quality-shield" },
    { label: "Contentech Human™", href: "/services/contentech-human" },
    { label: "Localization Engineering", href: "/services/localization-engineering" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Pricing", href: "/pricing" },
    { label: "Careers", href: "/careers" },
  ],
  Resources: [
    { label: "Documentation", href: "/docs" },
    { label: "Contact Sales", href: "/contact" },
    { label: "Status", href: "/status" },
  ],
};

const STEPS = [
  {
    step: "01",
    title: "Upload your document",
    description: "Drop a PDF, DOCX, or XLIFF into the chat. The AI instantly identifies language, document type, and word count.",
    detail: "No forms. No friction. Just drag and drop.",
  },
  {
    step: "02",
    title: "Configure your workflow",
    description: "Choose target languages and how you want the work done: BYOK, platform credits, human-only, or AI + human review.",
    detail: "You stay in control of every step.",
  },
  {
    step: "03",
    title: "Review and deliver",
    description: "AI generates a high-quality draft. Your matched linguists review and refine in the editor. Download when ready.",
    detail: "Typical turnaround: 2–8 hours.",
  },
];

const USE_CASES = [
  {
    icon: Scale, color: "text-[#33475B]", bg: "bg-[#EEF1F5]",
    title: "Legal & Compliance",
    description: "Contracts, patents, court filings. Certified translators with legal specialization and full audit trail.",
  },
  {
    icon: Activity, color: "text-[#FF5C35]", bg: "bg-red-50",
    title: "Life Sciences",
    description: "Clinical trial protocols, regulatory submissions, and IFUs. ICH E6 GCP compliant workflows.",
  },
  {
    icon: Megaphone, color: "text-[#FF7A59]", bg: "bg-[#FFF1EC]",
    title: "Marketing & Brand",
    description: "Campaigns, transcreation, and social content. Cultural adaptation that resonates, not just translates.",
  },
  {
    icon: ShoppingBag, color: "text-[#0091AE]", bg: "bg-[#E8F5F8]",
    title: "eCommerce",
    description: "Product catalogues, listings, and support content. Consistent tone at scale with TM-driven efficiency.",
  },
  {
    icon: Code2, color: "text-[#6E5BA6]", bg: "bg-purple-50",
    title: "Software & Tech",
    description: "UI strings, developer docs, and release notes. Full i18n support with XLIFF and JSON file formats.",
  },
  {
    icon: BarChart3, color: "text-emerald-600", bg: "bg-emerald-50",
    title: "Financial Services",
    description: "Annual reports, prospectuses, and investor communications. Precision terminology for regulated markets.",
  },
];

const TESTIMONIALS = [
  {
    name: "Sarah Ahmed",
    role: "Head of Localization",
    company: "LexCorp",
    stars: 5,
    quote: "The AI Quality Shield saved us from a critical mistranslation in a patent filing. The risk assessment identified three high-risk segments our in-house team missed entirely.",
    metric: "Caught 3 critical errors before filing",
  },
  {
    name: "Marcus Chen",
    role: "VP Engineering",
    company: "DataScale",
    stars: 5,
    quote: "We needed 50,000 annotated training samples in 12 languages. Contentech delivered in 3 weeks with 99.8% quality. Their RLHF pipeline is exceptional.",
    metric: "99.8% quality · 3-week delivery",
  },
  {
    name: "Elena Ruiz",
    role: "Director, Clinical Operations",
    company: "PharmaTrans",
    stars: 5,
    quote: "Zero AI tolerance was non-negotiable for our drug trial documentation. Contentech Human™ gave us certified medical translators and the audit trail our regulators required.",
    metric: "100% certified human translation",
  },
];

const QUALITY_LAYERS = {
  en: [
    {
      num: 1, icon: Lock, iconColor: "text-red-400", iconBg: "bg-red-400/10",
      badge: "mandatory", badgeStyle: { background: "rgba(239,68,68,0.15)", color: "#F87171" },
      title: "Do-Not-Translate Fast-Path",
      description: "Segments that are 100% a DNT term bypass the LLM entirely — copied verbatim with zero model call and zero hallucination risk.",
    },
    {
      num: 2, icon: FileText, iconColor: "text-[#FF7A59]", iconBg: "bg-[#FF7A59]/10",
      badge: "mandatory", badgeStyle: { background: "rgba(255,122,89,0.15)", color: "#FF7A59" },
      title: "Glossary Enforcement",
      description: "Per-term exact translations injected at the highest non-DNT priority. keepUppercase and synonym-free — the model has no discretion on enforced terms.",
    },
    {
      num: 3, icon: Database, iconColor: "text-[#00BDA5]", iconBg: "bg-[#00BDA5]/10",
      badge: "automatic", badgeStyle: { background: "rgba(0,189,165,0.15)", color: "#00BDA5" },
      title: "Translation Memory",
      description: "Up to 20 prior-approved entries loaded per job. Exact matches used verbatim; partial matches guide phrasing and compound efficiency gains at volume.",
    },
    {
      num: 4, icon: Briefcase, iconColor: "text-[#A78BFA]", iconBg: "bg-[#6E5BA6]/10",
      badge: "contextual", badgeStyle: { background: "rgba(110,91,166,0.15)", color: "#A78BFA" },
      title: "Style Guides",
      description: "Custom tone, register, and formatting rules per project — combined and injected into every segment's prompt. Up to 2,000 characters of enforced brand voice.",
    },
    {
      num: 5, icon: Zap, iconColor: "text-amber-400", iconBg: "bg-amber-400/10",
      badge: "automatic", badgeStyle: { background: "rgba(251,191,36,0.15)", color: "#FCD34D" },
      title: "Document Terminology Pre-scan",
      description: "A zero-cost in-process scan runs before any LLM call. It extracts the top 30 repeated n-grams and injects them as a consistency mandate so no term shifts meaning mid-document.",
    },
    {
      num: 6, icon: Activity, iconColor: "text-sky-400", iconBg: "bg-sky-400/10",
      badge: "automatic", badgeStyle: { background: "rgba(56,189,248,0.15)", color: "#38BDF8" },
      title: "Sliding Context Window (±2)",
      description: "Every segment sees its 2 preceding and 2 following segments as context. Table cells use same-table context only; headers and footers are isolated to prevent register bleed.",
    },
    {
      num: 7, icon: Globe2, iconColor: "text-[#A78BFA]", iconBg: "bg-[#6E5BA6]/10",
      badge: "contextual", badgeStyle: { background: "rgba(110,91,166,0.15)", color: "#A78BFA" },
      title: "Business & Brand Context",
      description: "Client industry, website, and brand bio are injected as a sandboxed reference block. The model adapts register without overriding any higher-priority rule above it.",
    },
    {
      num: 8, icon: Server, iconColor: "text-[#FF7A59]", iconBg: "bg-[#FF7A59]/10",
      badge: "automatic", badgeStyle: { background: "rgba(255,122,89,0.15)", color: "#FF7A59" },
      title: "Domain-Smart LLM Routing",
      description: "AI document-type detection (Legal, Medical, Financial, Technical) triggers priority-based provider routing across OpenAI, Anthropic, Google, Cohere, and Moonshot with automatic fallback chains.",
    },
    {
      num: 9, icon: CheckCircle, iconColor: "text-[#00BDA5]", iconBg: "bg-[#00BDA5]/10",
      badge: "automatic", badgeStyle: { background: "rgba(0,189,165,0.15)", color: "#00BDA5" },
      title: "Built-in Prompt QC Checklist",
      description: "Every prompt ends with an explicit checklist: glossary applied? protected terms intact? meaning preserved with no omissions? output fluent? formatting and placeholders correct?",
    },
    {
      num: 10, icon: UserCheck, iconColor: "text-white", iconBg: "bg-white/10",
      badge: "certified", badgeStyle: { background: "rgba(201,162,39,0.2)", color: "#FCD34D" },
      title: "Human Linguist Review",
      description: "The AI draft is refined by a certified linguist in the CAT editor. Segment-by-segment approval, inline comments, and TM integration — AI speed with human certification.",
    },
    {
      num: 11, icon: Clock, iconColor: "text-[#00BDA5]", iconBg: "bg-[#00BDA5]/10",
      badge: "automatic", badgeStyle: { background: "rgba(0,189,165,0.15)", color: "#00BDA5" },
      title: "TM Auto-Population",
      description: "Every segment approved by a linguist is automatically written back into the project Translation Memory. Future jobs benefit immediately — exact and partial matches compound savings across every cycle.",
    },
  ],
  ar: [
    {
      num: 1, icon: Lock, iconColor: "text-red-400", iconBg: "bg-red-400/10",
      badge: "إلزامي", badgeStyle: { background: "rgba(239,68,68,0.15)", color: "#F87171" },
      title: "المسار السريع للمحمي من الترجمة",
      description: "المقاطع التي تكون بالكامل مصطلحاً محمياً تتجاوز نموذج اللغة كلياً — تُنسخ حرفياً دون أي استدعاء للنموذج وبدون خطر الهلوسة.",
    },
    {
      num: 2, icon: FileText, iconColor: "text-[#FF7A59]", iconBg: "bg-[#FF7A59]/10",
      badge: "إلزامي", badgeStyle: { background: "rgba(255,122,89,0.15)", color: "#FF7A59" },
      title: "تطبيق المسرد الإلزامي",
      description: "الترجمات الدقيقة لكل مصطلح تُحقن بأعلى الأولويات. دعم keepUppercase ومنع المرادفات — النموذج ليس له أي صلاحية تقديرية على المصطلحات المُطبَّقة.",
    },
    {
      num: 3, icon: Database, iconColor: "text-[#00BDA5]", iconBg: "bg-[#00BDA5]/10",
      badge: "تلقائي", badgeStyle: { background: "rgba(0,189,165,0.15)", color: "#00BDA5" },
      title: "ذاكرة الترجمة",
      description: "يُحمَّل ما يصل إلى 20 إدخالاً معتمداً مسبقاً لكل مهمة. التطابقات الدقيقة تُستخدم حرفياً؛ التطابقات الجزئية توجّه الصياغة وتُضاعف الكفاءة على الحجم الكبير.",
    },
    {
      num: 4, icon: Briefcase, iconColor: "text-[#A78BFA]", iconBg: "bg-[#6E5BA6]/10",
      badge: "سياقي", badgeStyle: { background: "rgba(110,91,166,0.15)", color: "#A78BFA" },
      title: "أدلة الأسلوب",
      description: "قواعد النبرة والسجل والتنسيق المخصصة لكل مشروع — مُدمجة ومُحقنة في طلب كل مقطع. ما يصل إلى 2000 حرف من صوت العلامة التجارية المُطبَّق.",
    },
    {
      num: 5, icon: Zap, iconColor: "text-amber-400", iconBg: "bg-amber-400/10",
      badge: "تلقائي", badgeStyle: { background: "rgba(251,191,36,0.15)", color: "#FCD34D" },
      title: "المسح المسبق لمصطلحات الوثيقة",
      description: "مسح معالجي صفري التكلفة يعمل قبل أي استدعاء لنموذج اللغة. يستخرج أكثر 30 تعبيراً تكراراً ويحقنها كتفويض للاتساق لمنع أي مصطلح من تغيير معناه داخل الوثيقة.",
    },
    {
      num: 6, icon: Activity, iconColor: "text-sky-400", iconBg: "bg-sky-400/10",
      badge: "تلقائي", badgeStyle: { background: "rgba(56,189,248,0.15)", color: "#38BDF8" },
      title: "نافذة السياق المتحركة (±2)",
      description: "كل مقطع يرى المقطعين السابقين والتاليين كسياق. خلايا الجداول تستخدم سياق نفس الجدول فقط؛ الرؤوس والتذييلات معزولة لمنع نزيف السجل.",
    },
    {
      num: 7, icon: Globe2, iconColor: "text-[#A78BFA]", iconBg: "bg-[#6E5BA6]/10",
      badge: "سياقي", badgeStyle: { background: "rgba(110,91,166,0.15)", color: "#A78BFA" },
      title: "سياق الأعمال والعلامة التجارية",
      description: "القطاع والموقع الإلكتروني والنبذة التعريفية تُحقن كتلقة مرجعية محمية. يُكيّف النموذج السجل دون تجاوز أي قاعدة أعلى أولوية.",
    },
    {
      num: 8, icon: Server, iconColor: "text-[#FF7A59]", iconBg: "bg-[#FF7A59]/10",
      badge: "تلقائي", badgeStyle: { background: "rgba(255,122,89,0.15)", color: "#FF7A59" },
      title: "توجيه نموذج اللغة بذكاء القطاع",
      description: "اكتشاف نوع المستند بالذكاء الاصطناعي (قانوني، طبي، مالي، تقني) يُفعّل توجيهاً قائماً على الأولوية عبر OpenAI وAnthropic وGoogle وCohere وMoonshot مع سلاسل احتياطية تلقائية.",
    },
    {
      num: 9, icon: CheckCircle, iconColor: "text-[#00BDA5]", iconBg: "bg-[#00BDA5]/10",
      badge: "تلقائي", badgeStyle: { background: "rgba(0,189,165,0.15)", color: "#00BDA5" },
      title: "قائمة مراجعة جودة الطلب المدمجة",
      description: "كل طلب ينتهي بقائمة فحص صريحة: هل طُبّق المسرد؟ هل المصطلحات المحمية سليمة؟ هل المعنى محفوظ؟ هل الإخراج طبيعي؟ هل التنسيق والعناصر النائبة صحيحة؟",
    },
    {
      num: 10, icon: UserCheck, iconColor: "text-white", iconBg: "bg-white/10",
      badge: "معتمد", badgeStyle: { background: "rgba(201,162,39,0.2)", color: "#FCD34D" },
      title: "مراجعة المترجم البشري المعتمد",
      description: "تُنقَّح المسودة الذكية من قِبل مترجم معتمد في محرر CAT. اعتماد مقطع بمقطع، تعليقات مضمّنة، وتكامل مع ذاكرة الترجمة — سرعة الذكاء الاصطناعي مع اعتماد الإنسان.",
    },
    {
      num: 11, icon: Clock, iconColor: "text-[#00BDA5]", iconBg: "bg-[#00BDA5]/10",
      badge: "تلقائي", badgeStyle: { background: "rgba(0,189,165,0.15)", color: "#00BDA5" },
      title: "التعبئة التلقائية لذاكرة الترجمة",
      description: "كل مقطع يعتمده المترجم يُكتب تلقائياً في ذاكرة ترجمة المشروع. المهام المستقبلية تستفيد فوراً — التطابقات الدقيقة والجزئية تُضاعف الوفورات مع كل دورة ترجمة.",
    },
  ],
};

const PRIORITY_CHAIN = {
  en: [
    { num: 1, label: "DNT List", color: "#F87171", bg: "rgba(239,68,68,0.15)" },
    { num: 2, label: "Glossary", color: "#FF7A59", bg: "rgba(255,122,89,0.15)" },
    { num: 3, label: "TM Exact / Partial", color: "#00BDA5", bg: "rgba(0,189,165,0.15)" },
    { num: 4, label: "Style Guide", color: "#A78BFA", bg: "rgba(110,91,166,0.15)" },
    { num: 5, label: "Brand Context", color: "#38BDF8", bg: "rgba(56,189,248,0.15)" },
    { num: 6, label: "Best Practice", color: "#CBD6E2", bg: "rgba(255,255,255,0.06)" },
  ],
  ar: [
    { num: 1, label: "قائمة المحمي", color: "#F87171", bg: "rgba(239,68,68,0.15)" },
    { num: 2, label: "المسرد", color: "#FF7A59", bg: "rgba(255,122,89,0.15)" },
    { num: 3, label: "ذاكرة الترجمة", color: "#00BDA5", bg: "rgba(0,189,165,0.15)" },
    { num: 4, label: "دليل الأسلوب", color: "#A78BFA", bg: "rgba(110,91,166,0.15)" },
    { num: 5, label: "سياق العلامة", color: "#38BDF8", bg: "rgba(56,189,248,0.15)" },
    { num: 6, label: "أفضل الممارسات", color: "#CBD6E2", bg: "rgba(255,255,255,0.06)" },
  ],
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const meta = await getPageMeta("home", locale);
  return buildMetadata(meta, locale, `/${locale}`);
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as "en" | "ar";

  const siteConfigs = await prisma.siteConfig.findMany().catch(() => []);
  const rawMap: Record<string, any> = {};
  for (const c of siteConfigs) rawMap[c.key] = c.value;

  function localized(key: string) {
    const val = rawMap[key];
    if (!val) return null;
    if (val && typeof val === "object" && ("en" in val || "ar" in val)) {
      return val[locale] ?? val["en"] ?? null;
    }
    return val;
  }

  const dbStats: Array<{ value: string; label: string }> =
    localized("stats") ?? DEFAULT_STATS[locale] ?? DEFAULT_STATS.en;
  const dbFooterLinks: Record<string, Array<{ label: string; href: string }>> =
    localized("footer_links") ?? FOOTER_LINKS_DEFAULT;
  const dbFaq: Array<{ q: string; a: string }> = localized("faq") ?? [];
  const dbValueProps: Array<{ title: string; description: string }> | null =
    localized("value_props");

  const valueProps = dbValueProps
    ? dbValueProps.map((vp, i) => ({ ...(VALUE_PROPS[locale]?.[i] ?? VALUE_PROPS.en[i] ?? VALUE_PROPS.en[0]), ...vp }))
    : (VALUE_PROPS[locale] ?? VALUE_PROPS.en);

  const dbTrustCompanies: string[] = (localized("home.trust_companies") as string[]) ?? TRUST_COMPANIES;
  const dbServices: any[] = (localized("home.services") as any[]) ?? [];
  const dbSteps: any[] = (localized("home.steps") as any[]) ?? STEPS;
  const dbUseCases: any[] = (localized("home.use_cases") as any[]) ?? USE_CASES.map(({ title, description }) => ({ title, description }));
  const dbTestimonials: any[] = (localized("home.testimonials") as any[]) ?? TESTIMONIALS;

  const dbHero = localized("hero") as {
    badge?: string;
    headline?: string;
    subheadline?: string;
    ctaPrimary?: { text: string; href: string };
    ctaSecondary?: { text: string; href: string };
  } | null;

  const dbPlans = await prisma.planConfig.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
  }).catch(() => []);

  const isRtl = locale === "ar";

  return (
    <main className="min-h-screen bg-white" dir={isRtl ? "rtl" : "ltr"}>
      <MarketingNav locale={locale} />

      {/* Hero */}
      <section className="relative pt-24 pb-16 px-6 overflow-hidden bg-[#F5F8FA]">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(0,145,174,0.08) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(255,122,89,0.07) 0%, transparent 70%)" }} />

        <div className={`max-w-7xl mx-auto relative flex flex-col lg:flex-row items-center gap-12 lg:gap-16 ${isRtl ? "lg:flex-row-reverse" : ""}`}>

          {/* Left — copy */}
          <div className={`flex-1 min-w-0 ${isRtl ? "text-right" : "text-left"}`}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-7"
              style={{ background: "#FFF1EC", border: "1px solid #FFD6C7", color: "#FF7A59" }}>
              <Zap className="w-3.5 h-3.5 fill-current" />
              {locale === "ar"
                ? "منصة الترجمة الهجينة: ذكاء اصطناعي + إنسان"
                : (dbHero?.badge || "Hybrid AI + Human Translation Platform")}
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.06] mb-5 tracking-tight"
              style={{ color: "#33475B" }}>
              {locale === "ar" ? (
                <>ترجمة احترافية للمؤسسات.{" "}<br /><span className="gradient-hubspot">بلا تنازلات.</span></>
              ) : (
                dbHero?.headline || (
                  <>Enterprise translation.<br /><span className="gradient-hubspot">Without compromise.</span></>
                )
              )}
            </h1>

            <p className="text-lg md:text-xl mb-8 leading-relaxed max-w-lg" style={{ color: "#516F90" }}>
              {locale === "ar"
                ? "اجمع بين سرعة الذكاء الاصطناعي وخبرة المترجمين البشريين المعتمدين. استخدم مفاتيحك الخاصة أو نموذجنا — تحكم كامل في كل خطوة."
                : (dbHero?.subheadline || "Combine AI speed with certified human expertise. Use your own API keys, your own linguists, your own LLM — or ours. Full control, every time.")}
            </p>

            <div className={`flex flex-wrap gap-3 mb-5 ${isRtl ? "justify-end" : ""}`}>
              <Link href={locale === "ar" ? "/register" : (dbHero?.ctaPrimary?.href || "/register")}>
                <Button size="lg" className="px-8 h-12 text-base font-semibold text-white border-0 shadow-md"
                  style={{ background: "#FF7A59" }} data-testid="hero-cta-primary">
                  {locale === "ar" ? "ابدأ مجانًا" : (dbHero?.ctaPrimary?.text || "Start FREE")}
                  <ArrowRight className={`w-4 h-4 ${isRtl ? "mr-2 rotate-180" : "ml-2"}`} />
                </Button>
              </Link>
              <Link href={locale === "ar" ? "/services/ai-quality-shield" : (dbHero?.ctaSecondary?.href || "/services/ai-quality-shield")}>
                <Button variant="outline" size="lg" className="px-8 h-12 text-base gap-2"
                  style={{ borderColor: "#CBD6E2", color: "#33475B" }}>
                  {locale === "ar" ? "احصل على تقييم مجاني" : (dbHero?.ctaSecondary?.text || "Get Free Risk Assessment")}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            <p className="text-sm mb-8" style={{ color: "#99ACC2" }}>
              {locale === "ar"
                ? "تجربة مجانية 14 يومًا · لا بطاقة ائتمانية · إلغاء في أي وقت"
                : "14-day free trial · No credit card required · Cancel anytime"}
            </p>

            {/* Mini trust row */}
            <div className={`flex flex-wrap gap-x-5 gap-y-2 ${isRtl ? "justify-end" : ""}`}>
              {[
                { icon: ShieldCheck, text: "ISO 17100 certified" },
                { icon: Globe2, text: "180+ languages" },
                { icon: Clock, text: "Avg 4h turnaround" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1.5 text-sm" style={{ color: "#516F90" }}>
                  <Icon className="w-4 h-4 text-[#0091AE]" />
                  {text}
                </div>
              ))}
            </div>
          </div>

          {/* Right — interactive wizard demo */}
          <div className="flex-1 min-w-0 w-full">
            <HeroWizardDemo />
          </div>

        </div>
      </section>

      {/* Trust logos */}
      <section className="py-10 bg-white" style={{ borderTop: "1px solid #E5EAF0", borderBottom: "1px solid #E5EAF0" }}>
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-widest mb-6" style={{ color: "#99ACC2" }}>
            {locale === "ar" ? "موثوق به من قِبل فرق في" : "Trusted by teams at"}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {dbTrustCompanies.map((name) => (
              <span key={name} className="px-4 py-2 rounded-full text-sm font-medium"
                style={{ background: "#F5F8FA", border: "1px solid #CBD6E2", color: "#516F90" }}>
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-16" style={{ background: "#2D3E50" }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {dbStats.map(({ value, label }) => (
              <div key={label}>
                <div className="text-4xl font-bold text-white mb-1">{value}</div>
                <div className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="py-24 px-6" style={{ background: "#F5F8FA" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p className="font-semibold text-sm uppercase tracking-widest mb-3" style={{ color: "#FF7A59" }}>
              {locale === "ar" ? "لماذا كونتنتك" : "Why Contentech"}
            </p>
            <h2 className="text-4xl font-bold mb-4" style={{ color: "#33475B" }}>
              {locale === "ar" ? "منظومة الترجمة المصممة للمؤسسات" : "The translation stack built for enterprise"}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {valueProps.map(({ icon: Icon, color, bg, title, description }: any) => (
              <div key={title} className="rounded-2xl border p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                style={{ background: "#FFFFFF", borderColor: "#CBD6E2" }}>
                <div className={`w-12 h-12 ${bg} rounded-2xl flex items-center justify-center mb-5`}>
                  <Icon className={`w-6 h-6 ${color}`} />
                </div>
                <h3 className="text-base font-bold mb-2" style={{ color: "#33475B" }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#516F90" }}>{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {false ? <section id="services" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p className="font-semibold text-sm uppercase tracking-widest mb-3" style={{ color: "#FF7A59" }}>Service Portfolio</p>
            <h2 className="text-4xl font-bold mb-4" style={{ color: "#33475B" }}>
              Four ways to solve your language challenge
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: "#516F90" }}>
              Each service is engineered for a specific context where quality and trust are non-negotiable.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(dbServices.length > 0 ? dbServices : [
              { name: "AI Quality Shield", tagline: "Your AI Safety Net", href: "/services/ai-quality-shield", description: "Companies trust AI for speed but fear embarrassing errors and legal liability.", bullets: ["Accuracy & cultural validation", "Legal compliance review", "Risk-tiered pricing model", "Free initial risk assessment"] },
              { name: "AI Training Data", tagline: "Fuel the AI Revolution", href: "/services/ai-training-data", description: "LLMs require high-quality human-verified training data.", bullets: ["Data annotation & labeling", "RLHF — human feedback ranking", "Dataset quality validation", "Multilingual data pipelines"] },
              { name: "Contentech Human™", tagline: "Zero AI Tolerance", href: "/services/contentech-human", description: "When a single mistranslation means millions in damages or a health hazard.", bullets: ["Certified legal translators", "Medical translation specialists", "Transcreation for marketing", "Zero AI involvement guarantee"] },
              { name: "Localization Engineering", tagline: "Beyond Translation", href: "/services/localization-engineering", description: "AI can't build RTL architecture or manage complex i18n repositories.", bullets: ["Internationalization architecture", "TMS setup & management", "RTL language support", "Strategic i18n consulting"] },
            ]).map((svc: any, i) => {
              const SVCSTYLES = [
                { icon: ShieldCheck, iconColor: "text-[#0091AE]", iconBg: "bg-[#E8F5F8]", borderStyle: { borderColor: "rgba(0,145,174,0.2)" }, accentColor: "#0091AE" },
                { icon: Database, iconColor: "text-[#33475B]", iconBg: "bg-[#EEF1F5]", borderStyle: { borderColor: "rgba(51,71,91,0.15)" }, accentColor: "#33475B" },
                { icon: UserCheck, iconColor: "text-[#FF7A59]", iconBg: "bg-[#FFF1EC]", borderStyle: { borderColor: "rgba(255,122,89,0.2)" }, accentColor: "#FF7A59" },
                { icon: Code2, iconColor: "text-[#6E5BA6]", iconBg: "bg-purple-50", borderStyle: { borderColor: "rgba(110,91,166,0.2)" }, accentColor: "#6E5BA6" },
              ];
              const { icon: Icon, iconColor, iconBg, borderStyle, accentColor } = SVCSTYLES[i % SVCSTYLES.length];
              return (
                <div key={svc.name} className="bg-white rounded-2xl p-8 border hover:shadow-xl transition-all duration-300" style={borderStyle}
                  data-testid={`service-${svc.name.toLowerCase().replace(/\s+/g, "-")}`}>
                  <div className={`w-12 h-12 ${iconBg} rounded-2xl flex items-center justify-center mb-6`}>
                    <Icon className={`w-6 h-6 ${iconColor}`} />
                  </div>
                  <h3 className="text-xl font-bold mb-1" style={{ color: "#33475B" }}>{svc.name}</h3>
                  <p className="text-sm italic font-medium mb-3" style={{ color: accentColor }}>"{svc.tagline}"</p>
                  <p className="text-sm leading-relaxed mb-5" style={{ color: "#516F90" }}>{svc.description}</p>
                  {svc.bullets?.length > 0 && (
                    <ul className="space-y-2 mb-6">
                      {(svc.bullets as string[]).map((b) => (
                        <li key={b} className="flex items-center gap-2.5 text-sm" style={{ color: "#516F90" }}>
                          <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#00BDA5" }} />
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link href={svc.href ?? "#"} className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: accentColor }}>
                    Learn more <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section> : null}

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="py-24 px-6 relative overflow-hidden" style={{ background: "#2D3E50" }}>
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(255,122,89,0.12) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(0,145,174,0.12) 0%, transparent 70%)" }} />

        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-16">
            <p className="font-semibold text-sm uppercase tracking-widest mb-3" style={{ color: "#FF7A59" }}>The Process</p>
            <h2 className="text-4xl font-bold text-white mb-4">From upload to delivery in hours</h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.6)" }}>
              Our conversational order wizard guides you through every step. No forms, no friction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {dbSteps.map(({ step, title, description, detail }: any) => (
              <div key={step}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
                    <span className="text-lg font-bold" style={{ color: "#FF7A59" }}>{step}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white leading-snug">{title}</h3>
                </div>
                <p className="text-sm leading-relaxed mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>{description}</p>
                <p className="text-xs font-medium" style={{ color: "rgba(255,122,89,0.8)" }}>{detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 text-center">
            <Link href="/register">
              <Button size="lg" className="px-8 font-semibold text-white border-0 shadow-md" style={{ background: "#FF7A59" }}>
                Try the Wizard Free
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Feature split 1: BYOK ─────────────────────────────────────────── */}
      <section className="py-24 px-6" style={{ background: "#F5F8FA" }}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-6"
              style={{ background: "#FFF1EC", border: "1px solid #FFD6C7", color: "#FF7A59" }}>
              <KeyRound className="w-3.5 h-3.5" /> Bring Your Own Keys
            </div>
            <h2 className="text-4xl font-bold mb-5 leading-tight" style={{ color: "#33475B" }}>
              Your API. Your data.{" "}
              <span className="gradient-hubspot">Never used for training.</span>
            </h2>
            <p className="leading-relaxed mb-8" style={{ color: "#516F90" }}>
              Connect your own OpenAI, Anthropic, or Azure AI API credentials. Every document is processed under your own account — your confidential content never touches a shared endpoint, and is never ingested to improve any public AI model. You get AI speed without sacrificing data sovereignty.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                "Zero data retention on shared models",
                "Your content is never used to train LLMs",
                "GDPR & HIPAA-aligned workflows",
                "Works with OpenAI, Azure OpenAI, Anthropic, and more",
              ].map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm" style={{ color: "#516F90" }}>
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#00BDA5" }} />
                  {point}
                </li>
              ))}
            </ul>
            <Link href="/register">
              <Button size="lg" className="gap-2 font-semibold text-white border-0" style={{ background: "#FF7A59" }}>
                Set Up BYOK Free <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="rounded-2xl border overflow-hidden"
            style={{ background: "#FFFFFF", borderColor: "#CBD6E2", boxShadow: "0 8px 32px rgba(45,62,80,0.08)" }}>
            <div className="flex items-center justify-between px-5 py-3.5" style={{ background: "#F5F8FA", borderBottom: "1px solid #E5EAF0" }}>
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4" style={{ color: "#99ACC2" }} />
                <span className="text-sm font-semibold" style={{ color: "#33475B" }}>API Configuration</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                style={{ background: "#E6FAF8", border: "1px solid #B3EDE8", color: "#00BDA5" }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#00BDA5" }} />
                Connected
              </div>
            </div>
            <div className="p-5 space-y-4">
              {[
                { label: "API Provider", value: "OpenAI", type: "select" },
                { label: "API Key", value: "sk-proj-●●●●●●●●●●●●●●●", type: "secret" },
                { label: "Model", value: "gpt-4o", type: "select" },
                { label: "Base URL (optional)", value: "https://api.openai.com/v1", type: "text" },
              ].map(({ label, value, type }) => (
                <div key={label}>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "#516F90" }}>{label}</label>
                  <div className="w-full px-3 py-2.5 rounded-xl text-sm flex items-center justify-between"
                    style={{
                      border: "1px solid #CBD6E2",
                      background: "#F5F8FA",
                      color: type === "secret" ? "#99ACC2" : "#33475B",
                      fontFamily: type === "secret" ? "monospace" : undefined,
                      letterSpacing: type === "secret" ? "0.1em" : undefined,
                    }}>
                    <span>{value}</span>
                    {type === "select" && <ChevronRight className="w-4 h-4 rotate-90" style={{ color: "#CBD6E2" }} />}
                  </div>
                </div>
              ))}
              <div className="pt-2 space-y-2.5">
                {[
                  "Your data stays within your own account",
                  "Zero usage by Contentech for training",
                  "Full billing control — pay your provider directly",
                ].map((point) => (
                  <div key={point} className="flex items-center gap-2 text-xs" style={{ color: "#516F90" }}>
                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#00BDA5" }} />
                    {point}
                  </div>
                ))}
              </div>
              <button className="w-full text-white text-sm font-semibold py-2.5 rounded-xl transition-opacity hover:opacity-90"
                style={{ background: "#FF7A59" }}>
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature split 2: Linguist team ───────────────────────────────── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="rounded-2xl border overflow-hidden order-2 lg:order-1"
            style={{ background: "#F5F8FA", borderColor: "#CBD6E2", boxShadow: "0 8px 32px rgba(45,62,80,0.08)" }}>
            <div className="flex items-center justify-between px-5 py-3.5" style={{ background: "#FFFFFF", borderBottom: "1px solid #E5EAF0" }}>
              <div className="flex items-center gap-2">
                <Users2 className="w-4 h-4" style={{ color: "#0091AE" }} />
                <span className="text-sm font-semibold" style={{ color: "#33475B" }}>Your Linguist Team</span>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ background: "#E8F5F8", border: "1px solid rgba(0,145,174,0.2)", color: "#0091AE" }}>
                3 active
              </span>
            </div>
            <div className="p-4 space-y-3">
              {[
                { name: "Sara Al-Rashid", pair: "EN → AR", domain: "Legal", rating: "4.9", jobs: 120, preferred: true },
                { name: "Marc Leblanc", pair: "EN → FR", domain: "Tech", rating: "4.8", jobs: 98, preferred: true },
                { name: "Elena Müller", pair: "EN → DE", domain: "Medical", rating: "5.0", jobs: 87, preferred: false },
              ].map(({ name, pair, domain, rating, jobs, preferred }) => (
                <div key={name} className="rounded-xl border p-4 flex items-center gap-4"
                  style={{ background: "#FFFFFF", borderColor: preferred ? "rgba(255,122,89,0.25)" : "#E5EAF0" }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #2D3E50 0%, #0091AE 100%)" }}>
                    {name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-bold" style={{ color: "#33475B" }}>{name}</p>
                      {preferred && <Star className="w-3 h-3 fill-current" style={{ color: "#FF7A59" }} />}
                    </div>
                    <p className="text-xs" style={{ color: "#99ACC2" }}>{pair} · {domain} · {jobs} jobs</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold" style={{ color: "#33475B" }}>{rating}</p>
                    <div className="flex gap-0.5 justify-end mt-0.5">
                      {[1,2,3,4,5].map((s) => (
                        <Star key={s} className="w-2.5 h-2.5 fill-current" style={{ color: "#FF7A59" }} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 mt-4 px-4 py-3 rounded-xl cursor-pointer text-sm"
                style={{ border: "2px dashed #CBD6E2", color: "#99ACC2" }}>
                <Users2 className="w-4 h-4" />
                Invite a linguist to your team
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-6"
              style={{ background: "#E8F5F8", border: "1px solid rgba(0,145,174,0.2)", color: "#0091AE" }}>
              <Users2 className="w-3.5 h-3.5" /> Bring Your Own Linguists
            </div>
            <h2 className="text-4xl font-bold mb-5 leading-tight" style={{ color: "#33475B" }}>
              Your trusted translators.{" "}
              <span className="gradient-hubspot">Inside your workspace.</span>
            </h2>
            <p className="leading-relaxed mb-8" style={{ color: "#516F90" }}>
              Stop forwarding files by email. Invite your in-house translators, subject-matter experts, or preferred vendors directly into Contentech. They work inside your shared Translation Memory and Glossary — reviewing AI drafts, accepting jobs, and collaborating in one place. You stay in full control of every assignment and delivery.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                "Shared TM & Glossary — no duplicate effort across teams",
                "Role-based access: translator, reviewer, or manager",
                "Preferred linguists get first access to matching jobs",
                "Full activity and delivery audit trail for every project",
              ].map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm" style={{ color: "#516F90" }}>
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#00BDA5" }} />
                  {point}
                </li>
              ))}
            </ul>
            <Link href="/register">
              <Button size="lg" className="gap-2 font-semibold text-white border-0" style={{ background: "#0091AE" }}>
                Build Your Team <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Enterprise control: 3 pillars ─────────────────────────────────── */}
      <section className="py-24 px-6" style={{ background: "#F5F8FA" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p className="font-semibold text-sm uppercase tracking-widest mb-3" style={{ color: "#FF7A59" }}>Enterprise Control</p>
            <h2 className="text-4xl font-bold mb-4" style={{ color: "#33475B" }}>Your team. Your data. Your AI.</h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: "#516F90" }}>
              Three capabilities that make Contentech the only translation platform built for organizations that cannot compromise on privacy, trust, or control.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Users2, iconColor: "text-[#0091AE]", iconBg: "bg-[#E8F5F8]",
                borderStyle: { borderColor: "rgba(0,145,174,0.2)" },
                badge: "BYOL", badgeStyle: { background: "#E8F5F8", color: "#0091AE" },
                title: "Bring Your Own Linguists",
                sub: "Your trusted experts, inside your workspace.",
                subColor: "#0091AE",
                body: "Stop forwarding files by email. Invite your in-house translators, subject-matter experts, or preferred vendors directly into Contentech. They work inside your shared Translation Memory and Glossary.",
                bullets: ["Shared TM & Glossary", "Role-based access controls", "Priority routing for preferred linguists", "Full activity audit trail"],
                bulletColor: "#00BDA5",
              },
              {
                icon: KeyRound, iconColor: "text-[#FF7A59]", iconBg: "bg-[#FFF1EC]",
                borderStyle: { borderColor: "rgba(255,122,89,0.2)" },
                badge: "BYOK", badgeStyle: { background: "#FFF1EC", color: "#FF7A59" },
                title: "Bring Your Own API Keys",
                sub: "Your credentials. Your data. Never shared for training.",
                subColor: "#FF7A59",
                body: "Connect your own OpenAI, Anthropic, or Azure AI API keys. Your confidential content never touches a shared endpoint and is never used to train or improve any public AI model.",
                bullets: ["Zero data retention on shared models", "Content never used to train LLMs", "GDPR & HIPAA-aligned workflows", "Works with OpenAI, Azure, Anthropic"],
                bulletColor: "#00BDA5",
              },
              {
                icon: Server, iconColor: "text-[#33475B]", iconBg: "bg-[#EEF1F5]",
                borderStyle: { borderColor: "rgba(51,71,91,0.15)" },
                badge: "On-Prem LLM", badgeStyle: { background: "#EEF1F5", color: "#33475B" },
                title: "Run Your Own LLM",
                sub: "Air-gapped translation. Your infrastructure, your rules.",
                subColor: "#516F90",
                body: "Point Contentech at your privately-hosted or on-premises model — Llama, Mistral, a private Azure OpenAI endpoint, or any OpenAI-compatible server. Content never leaves your infrastructure.",
                bullets: ["True on-premises deployment", "Any OpenAI-compatible API", "Classified content ready", "No egress. No exceptions."],
                bulletColor: "#00BDA5",
              },
            ].map(({ icon: Icon, iconColor, iconBg, borderStyle, badge, badgeStyle, title, sub, subColor, body, bullets, bulletColor }) => (
              <div key={title} className="bg-white rounded-2xl border p-8 flex flex-col hover:shadow-xl transition-all duration-300"
                style={borderStyle}>
                <div className={`w-14 h-14 ${iconBg} rounded-2xl flex items-center justify-center mb-6`}>
                  <Icon className={`w-7 h-7 ${iconColor}`} />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full self-start mb-3" style={badgeStyle}>{badge}</span>
                <h3 className="text-xl font-bold mb-2" style={{ color: "#33475B" }}>{title}</h3>
                <p className="text-sm font-medium mb-4" style={{ color: subColor }}>{sub}</p>
                <p className="text-sm leading-relaxed mb-6 flex-1" style={{ color: "#516F90" }}>{body}</p>
                <ul className="space-y-2">
                  {bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-sm" style={{ color: "#516F90" }}>
                      <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: bulletColor }} />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-14 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6"
            style={{ background: "#2D3E50" }}>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Ready to take full control?</h3>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>Set up BYOK, invite your linguists, and connect your own LLM — all within minutes.</p>
            </div>
            <div className="flex gap-3 flex-shrink-0">
              <Link href="/register">
                <Button size="lg" className="font-semibold text-white border-0" style={{ background: "#FF7A59" }}>
                  Start FREE <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="hover:bg-white/10" style={{ borderColor: "rgba(255,255,255,0.2)", color: "#FFFFFF" }}>
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Quality Engine ────────────────────────────────────────────────── */}
      <section className="py-24 px-6" style={{ background: "#2D3E50" }}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <p className="font-semibold text-sm uppercase tracking-widest mb-3" style={{ color: "#4ECDC4" }}>Quality Engine</p>
            <h2 className="text-4xl font-bold mb-4 text-white">
              {locale === "ar"
                ? "جودة الترجمة بنية تحتية، ليست فكرة لاحقة."
                : "Translation quality is infrastructure, not an afterthought."}
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: "rgba(255,255,255,0.6)" }}>
              {locale === "ar"
                ? "أحد عشر آلية متشابكة تعمل على كل مهمة ترجمة — تلقائياً وباستمرار، دون أي إعداد يدوي."
                : "Eleven interlocking mechanisms run on every job — automatically, consistently, without any manual configuration."}
            </p>
          </div>

          {/* 6 featured layer cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {(QUALITY_LAYERS[locale] ?? QUALITY_LAYERS.en)
              .filter(l => [2, 5, 6, 8, 9, 11].includes(l.num))
              .map(({ num, icon: Icon, iconColor, iconBg, badge, badgeStyle, title, description }) => (
                <div
                  key={num}
                  className="rounded-2xl p-5 flex flex-col gap-3 hover:scale-[1.02] transition-transform duration-200"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${iconColor}`} />
                    </div>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                      style={badgeStyle}
                    >{badge}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-bold tabular-nums" style={{ color: "rgba(255,255,255,0.3)" }}>
                        {String(num).padStart(2, "0")}
                      </span>
                      <h3 className="text-sm font-bold text-white leading-snug">{title}</h3>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>{description}</p>
                  </div>
                </div>
              ))}
          </div>

          {/* See all link */}
          <div className="text-center">
            <Link
              href={`/${locale}/quality`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all hover:scale-105"
              style={{ background: "rgba(78,205,196,0.12)", color: "#4ECDC4", border: "1px solid rgba(78,205,196,0.3)" }}
            >
              {locale === "ar" ? "اكتشف جميع طبقات الجودة الـ 11" : "Explore all 11 quality layers"}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Use cases ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p className="font-semibold text-sm uppercase tracking-widest mb-3" style={{ color: "#FF7A59" }}>Use Cases</p>
            <h2 className="text-4xl font-bold mb-4" style={{ color: "#33475B" }}>Built for every high-stakes industry</h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: "#516F90" }}>
              From courtrooms to clinical trials to product listings — Contentech adapts to the precision demands of your sector.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dbUseCases.map((uc: any, i) => {
              const UC_ICONS = [
                { icon: Scale, color: "text-[#33475B]", bg: "bg-[#EEF1F5]" },
                { icon: Activity, color: "text-[#FF5C35]", bg: "bg-red-50" },
                { icon: Megaphone, color: "text-[#FF7A59]", bg: "bg-[#FFF1EC]" },
                { icon: ShoppingBag, color: "text-[#0091AE]", bg: "bg-[#E8F5F8]" },
                { icon: Code2, color: "text-[#6E5BA6]", bg: "bg-purple-50" },
                { icon: BarChart3, color: "text-emerald-600", bg: "bg-emerald-50" },
              ];
              const { icon: Icon, color, bg } = UC_ICONS[i % UC_ICONS.length];
              return (
                <div key={uc.title} className="rounded-2xl border p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer"
                  style={{ background: "#F5F8FA", borderColor: "#CBD6E2" }}>
                  <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <h3 className="text-base font-bold mb-2 transition-colors group-hover:text-[#0091AE]" style={{ color: "#33475B" }}>{uc.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#516F90" }}>{uc.description}</p>
                  <div className="mt-4 flex items-center gap-1 text-xs font-semibold" style={{ color: "#0091AE" }}>
                    Explore <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────── */}
      <section className="py-24 px-6" style={{ background: "#F5F8FA" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p className="font-semibold text-sm uppercase tracking-widest mb-3" style={{ color: "#FF7A59" }}>Client Stories</p>
            <h2 className="text-4xl font-bold mb-4" style={{ color: "#33475B" }}>Trusted by teams that can't afford mistakes</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {dbTestimonials.map(({ name, role, company, stars, quote, metric }: any) => (
              <div key={name} className="rounded-2xl border p-8 flex flex-col" style={{ background: "#FFFFFF", borderColor: "#CBD6E2" }}>
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" style={{ color: "#FF7A59" }} />
                  ))}
                </div>
                <p className="text-sm leading-relaxed mb-6 flex-1" style={{ color: "#516F90" }}>"{quote}"</p>
                <div className="pt-5 mt-auto" style={{ borderTop: "1px solid #E5EAF0" }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #2D3E50 0%, #0091AE 100%)" }}>
                      {name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "#33475B" }}>{name}</p>
                      <p className="text-xs" style={{ color: "#99ACC2" }}>{role}, {company}</p>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                    style={{ background: "#E8F5F8", border: "1px solid rgba(0,145,174,0.2)", color: "#0091AE" }}>
                    {metric}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing preview ───────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="font-semibold text-sm uppercase tracking-widest mb-3" style={{ color: "#FF7A59" }}>Pricing</p>
            <h2 className="text-4xl font-bold mb-4" style={{ color: "#33475B" }}>Start free, scale as you grow</h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: "#516F90" }}>
              All plans include BYOK translation, translation memory, and glossary management.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {(dbPlans.length > 0 ? dbPlans : [
              { id: "starter", name: "Starter", slug: "starter", price: 0, period: "", features: ["BYOK Translation", "1 Translation Memory", "100 Glossary Terms", "10 docs/month", "Email support"], isPopular: false, ctaText: "Get Started", ctaHref: "/register" },
              { id: "professional", name: "Professional", slug: "professional", price: 49, period: "/mo", features: ["BYOK + Platform Credits", "Favorite Linguists", "5 Translation Memories", "1,000 Glossary Terms", "Unlimited documents", "Priority support", "API access"], isPopular: true, ctaText: "Start FREE", ctaHref: "/register" },
              { id: "enterprise", name: "Enterprise", slug: "enterprise", price: -1, period: "", features: ["Everything in Pro", "Dedicated linguist team", "Unlimited TM & Glossary", "SSO / SAML", "SLA guarantees", "Custom LLM / On-prem", "Dedicated manager"], isPopular: false, ctaText: "Contact Sales", ctaHref: "/contact" },
            ]).map((plan: any) => {
              const highlight = plan.isPopular;
              const priceNum = Number(plan.price ?? 0);
              const priceDisplay = priceNum < 0 ? "Custom" : priceNum === 0 ? "Free" : `$${priceNum}`;
              const features: string[] = locale === "ar" && plan.featuresAr?.length ? plan.featuresAr : plan.features ?? [];
              const displayName = locale === "ar" && plan.nameAr ? plan.nameAr : plan.name;
              return (
                <div key={plan.id} className="rounded-2xl p-8 border relative"
                  style={highlight
                    ? { background: "#2D3E50", borderColor: "#2D3E50", boxShadow: "0 16px 48px rgba(45,62,80,0.2)", transform: "scale(1.04)" }
                    : { background: "#F5F8FA", borderColor: "#CBD6E2" }}
                  data-testid={`pricing-${plan.slug}`}>
                  {highlight && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full text-white"
                        style={{ background: "#FF7A59" }}>
                        <Star className="w-3 h-3 fill-current" /> Most Popular
                      </span>
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className="text-lg font-bold mb-1" style={{ color: highlight ? "#FFFFFF" : "#33475B" }}>{displayName}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold" style={{ color: highlight ? "#FFFFFF" : "#33475B" }}>{priceDisplay}</span>
                      {plan.period && priceNum > 0 && <span className="text-sm" style={{ color: highlight ? "rgba(255,255,255,0.5)" : "#99ACC2" }}>{plan.period}</span>}
                    </div>
                  </div>
                  <ul className="space-y-2.5 mb-8">
                    {features.map((f: string) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: highlight ? "rgba(255,255,255,0.75)" : "#516F90" }}>
                        <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#00BDA5" }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href={plan.ctaHref ?? "/register"}>
                    <button className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                      style={highlight
                        ? { background: "#FF7A59", color: "#FFFFFF" }
                        : { background: "transparent", color: "#33475B", border: "1px solid #CBD6E2" }}>
                      {plan.ctaText}
                    </button>
                  </Link>
                </div>
              );
            })}
          </div>

          <p className="text-center text-sm mt-10" style={{ color: "#99ACC2" }}>
            All plans include a 14-day free trial.{" "}
            <Link href={`/${locale}/pricing`} className="font-medium hover:underline" style={{ color: "#0091AE" }}>See full pricing details</Link>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6" style={{ background: "#F5F8FA" }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="font-semibold text-sm uppercase tracking-widest mb-3" style={{ color: "#FF7A59" }}>FAQ</p>
            <h2 className="text-4xl font-bold mb-4" style={{ color: "#33475B" }}>
              {locale === "ar" ? "أسئلة شائعة" : "Common questions"}
            </h2>
          </div>
          {dbFaq.length > 0 && (
            <div className="rounded-2xl border px-8 py-4 shadow-sm" style={{ background: "#FFFFFF", borderColor: "#CBD6E2" }}>
              <HomeFAQ items={dbFaq} />
            </div>
          )}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 relative overflow-hidden" style={{ background: "#2D3E50" }}>
        <div className="max-w-4xl mx-auto relative text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
            {locale === "ar" ? "ابدأ الترجمة بثقة اليوم." : "Start translating with confidence today."}
          </h2>
          <p className="text-xl mb-12 max-w-2xl mx-auto leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
            {locale === "ar"
              ? "انضم إلى 1,000+ مؤسسة تستخدم كونتنتك للانطلاق عالميًا دون المساس بالدقة أو الخصوصية."
              : "Join 1,000+ organizations using Contentech to go global — without sacrificing accuracy, privacy, or control."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="px-10 font-semibold text-white border-0 shadow-md text-base" style={{ background: "#FF7A59" }}>
                {locale === "ar" ? "ابدأ مجانًا" : "Start FREE"}
                <ArrowRight className={`w-5 h-5 ${isRtl ? "mr-2 rotate-180" : "ml-2"}`} />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: "#1A2E3A", color: "#FFFFFF" }}>
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10 mb-14">
            <div className="md:col-span-1">
              <Link href={`/${locale}`} className="block mb-4">
                <span className="text-lg font-bold text-white">Contentech</span>
              </Link>
              <p className="text-sm leading-relaxed mb-5" style={{ color: "rgba(255,255,255,0.45)" }}>
                {locale === "ar"
                  ? "منصة ترجمة متعددة اللغات على مستوى المؤسسات تجمع بين أتمتة الذكاء الاصطناعي وخبرة الإنسان."
                  : "Enterprise-grade multilingual translation combining AI automation with certified human expertise."}
              </p>
              <div className="flex items-center gap-3">
                {[Mail, MessageSquare, Briefcase].map((Icon, i) => (
                  <a key={i} href="#" className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.45)" }}>
                    <Icon className="w-3.5 h-3.5" />
                  </a>
                ))}
              </div>
            </div>
            {Object.entries(dbFooterLinks).map(([section, links]) => (
              <div key={section}>
                <h4 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>{section}</h4>
                <ul className="space-y-2.5">
                  {links.map(({ label, href }) => (
                    <li key={label}>
                      <Link href={href} className="text-sm transition-colors hover:text-white" style={{ color: "rgba(255,255,255,0.55)" }}>
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
              &copy; {new Date().getFullYear()} Contentech. {locale === "ar" ? "جميع الحقوق محفوظة." : "All rights reserved."}
            </p>
            <div className="flex items-center gap-6">
              {(locale === "ar"
                ? ["سياسة الخصوصية", "شروط الاستخدام", "سياسة الكوكيز", "GDPR"]
                : ["Privacy Policy", "Terms of Service", "Cookie Policy", "GDPR"]
              ).map((link) => (
                <Link key={link} href="#" className="text-xs transition-colors hover:text-white/60" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {link}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
