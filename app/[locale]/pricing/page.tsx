import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle, Star, ArrowRight } from "lucide-react";
import MarketingNav from "@/components/marketing/nav";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { getPageMeta, buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

const FALLBACK_PLANS = {
  en: [
    {
      id: "fallback-starter",
      name: "Starter",
      price: "0",
      period: "",
      description: "Perfect for individuals and small teams getting started with translation.",
      features: [
        "BYOK Translation (OpenAI, DeepL, Google)",
        "1 Translation Memory",
        "100 Glossary Terms",
        "10 documents/month",
        "Email support",
        "Basic analytics",
      ],
      isPopular: false,
      creditsPerCycle: 0,
      ctaText: "Get Started Free",
      ctaHref: "/register",
    },
    {
      id: "fallback-professional",
      name: "Professional",
      price: "49",
      period: "/mo",
      description: "For growing teams that need power, flexibility, and preferred linguists.",
      features: [
        "Everything in Starter",
        "1,000 platform credits/month",
        "Favorite Linguist routing",
        "5 Translation Memories",
        "1,000 Glossary Terms",
        "Unlimited documents",
        "Priority support",
        "REST API access",
        "Advanced analytics",
      ],
      isPopular: true,
      creditsPerCycle: 1000,
      ctaText: "Start FREE",
      ctaHref: "/register",
    },
    {
      id: "fallback-agency",
      name: "Agency",
      price: "100",
      period: "/mo",
      description: "For agencies and bureaus managing multiple end-client workspaces under one account.",
      features: [
        "Everything in Professional",
        "Multi-client workspace management",
        "Per-client translation memories",
        "Per-client glossaries and style guides",
        "Client-level analytics and reporting",
        "3,000 platform credits/month",
        "Favorite linguist pools per client",
        "Priority support",
      ],
      isPopular: false,
      creditsPerCycle: 3000,
      ctaText: "Start Agency Trial",
      ctaHref: "/register",
    },
    {
      id: "fallback-enterprise",
      name: "Enterprise",
      price: "249",
      period: "/mo",
      description: "For large organizations with complex workflows and compliance requirements.",
      features: [
        "Everything in Agency",
        "Dedicated linguist team",
        "Unlimited TM & Glossary",
        "SSO / SAML authentication",
        "SLA guarantees",
        "Dedicated account manager",
        "Custom workflows",
        "Compliance & audit trails",
      ],
      isPopular: false,
      creditsPerCycle: 5000,
      ctaText: "Contact Sales",
      ctaHref: "/contact-sales",
    },
  ],
  ar: [
    {
      id: "fallback-starter-ar",
      name: "المجاني",
      price: "0",
      period: "",
      description: "مثالي للأفراد والفرق الصغيرة التي تبدأ في مجال الترجمة.",
      features: [
        "ترجمة BYOK (OpenAI، DeepL، Google)",
        "ذاكرة ترجمة واحدة",
        "100 مصطلح في المسرد",
        "10 وثائق/شهريًا",
        "دعم عبر البريد الإلكتروني",
        "تحليلات أساسية",
      ],
      isPopular: false,
      creditsPerCycle: 0,
      ctaText: "ابدأ مجانًا",
      ctaHref: "/register",
    },
    {
      id: "fallback-professional-ar",
      name: "الاحترافي",
      price: "49",
      period: "/شهر",
      description: "للفرق المتنامية التي تحتاج إلى قوة ومرونة ومترجمين مفضلين.",
      features: [
        "كل ميزات المجاني",
        "1,000 رصيد/شهريًا",
        "توجيه المترجم المفضل",
        "5 ذاكرات ترجمة",
        "1,000 مصطلح في المسرد",
        "وثائق غير محدودة",
        "دعم ذو أولوية",
        "وصول REST API",
        "تحليلات متقدمة",
      ],
      isPopular: true,
      creditsPerCycle: 1000,
      ctaText: "ابدأ مجانًا",
      ctaHref: "/register",
    },
    {
      id: "fallback-agency-ar",
      name: "الوكالات",
      price: "100",
      period: "/شهر",
      description: "للوكالات ومكاتب الترجمة التي تدير مساحات عمل منفصلة لعدة عملاء.",
      features: [
        "كل ميزات الاحترافي",
        "إدارة مساحات عمل متعددة للعملاء",
        "ذاكرات ترجمة مخصصة لكل عميل",
        "مسارد وأدلة أسلوب لكل عميل",
        "تحليلات على مستوى العميل",
        "3,000 رصيد/شهريًا",
        "مجموعات مترجمين مفضلين لكل عميل",
        "دعم ذو أولوية",
      ],
      isPopular: false,
      creditsPerCycle: 3000,
      ctaText: "ابدأ تجربة الوكالات",
      ctaHref: "/register",
    },
    {
      id: "fallback-enterprise-ar",
      name: "المؤسسات",
      price: "249",
      period: "/شهر",
      description: "للمؤسسات الكبيرة ذات سير العمل المعقدة ومتطلبات الامتثال.",
      features: [
        "كل ميزات الوكالات",
        "فريق مترجمين مخصص",
        "ذاكرة ترجمة ومسرد غير محدود",
        "مصادقة SSO / SAML",
        "ضمانات مستوى الخدمة",
        "مدير حساب مخصص",
        "سير عمل مخصصة",
        "مسارات الامتثال والتدقيق",
      ],
      isPopular: false,
      creditsPerCycle: 5000,
      ctaText: "تواصل مع فريقنا",
      ctaHref: "/contact-sales",
    },
  ],
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const meta = await getPageMeta("pricing", locale);
  return buildMetadata(meta, locale, `/${locale}/pricing`);
}

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as "en" | "ar";
  const isRtl = locale === "ar";

  const dbPlans = await prisma.planConfig.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
  }).catch(() => []);

  const plans = dbPlans.length > 0
    ? dbPlans.map((p) => ({
        id: p.id,
        name: p.name,
        price: String(Number(p.price) === 0 ? "0" : Number(p.price)),
        period: p.period,
        description: p.description ?? "",
        features: p.features,
        isPopular: p.isPopular,
        creditsPerCycle: p.creditsPerCycle,
        ctaText: p.ctaText,
        ctaHref: p.ctaHref,
      }))
    : (FALLBACK_PLANS[locale] ?? FALLBACK_PLANS.en);

  return (
    <main className="min-h-screen bg-[#FAFBFC]" dir={isRtl ? "rtl" : "ltr"}>
      <MarketingNav locale={locale} />

      <section className="pt-32 pb-16 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="font-semibold text-sm uppercase tracking-widest mb-3" style={{ color: "#0091AE" }}>
            {locale === "ar" ? "الأسعار" : "Pricing"}
          </p>
          <h1 className="text-5xl font-bold mb-4" style={{ color: "#33475B" }}>
            {locale === "ar" ? "ابدأ مجانًا. توسع مع نموك." : "Start free. Scale as you grow."}
          </h1>
          <p className="text-xl" style={{ color: "#516F90" }}>
            {locale === "ar"
              ? "جميع الخطط تشمل ترجمة BYOK وذاكرة الترجمة وإدارة المسرد. بدون رسوم مخفية."
              : "All plans include BYOK translation, translation memory, and glossary management. No hidden fees."}
          </p>
        </div>
      </section>

      <section className="pb-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className={`grid grid-cols-1 gap-6 items-stretch ${
            plans.length === 1 ? "max-w-sm mx-auto" :
            plans.length === 2 ? "sm:grid-cols-2 max-w-3xl mx-auto" :
            plans.length === 3 ? "md:grid-cols-3" :
            "sm:grid-cols-2 lg:grid-cols-4"
          }`}>
            {plans.map((plan) => {
              const priceNum = Number(plan.price);
              const displayPrice = priceNum === 0 ? (locale === "ar" ? "مجاني" : "Free") : `$${priceNum}`;
              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl p-8 border relative flex flex-col ${
                    plan.isPopular ? "shadow-2xl border-transparent" : "bg-white border-[#CBD6E2]"
                  }`}
                  style={plan.isPopular ? { background: "#2D3E50", color: "#fff" } : {}}
                  data-testid={`plan-${plan.name.toLowerCase()}`}
                >
                  {plan.isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 text-white text-xs font-bold px-3 py-1 rounded-full"
                        style={{ background: "#FF7A59" }}>
                        <Star className="w-3 h-3 fill-current" />
                        {locale === "ar" ? "الأكثر شيوعًا" : "Most Popular"}
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <p className="text-sm font-semibold mb-1"
                      style={plan.isPopular ? { color: "#00BDA5" } : { color: "#516F90" }}>
                      {plan.name}
                    </p>
                    <div className="flex items-end gap-1 mb-3">
                      <span className="text-5xl font-bold"
                        style={plan.isPopular ? { color: "#fff" } : { color: "#33475B" }}>
                        {displayPrice}
                      </span>
                      <span className="text-sm mb-2"
                        style={plan.isPopular ? { color: "rgba(255,255,255,0.6)" } : { color: "#99ACC2" }}>
                        {plan.period}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed"
                      style={plan.isPopular ? { color: "rgba(255,255,255,0.7)" } : { color: "#516F90" }}>
                      {plan.description}
                    </p>
                    {plan.creditsPerCycle > 0 && (
                      <div className="mt-2 text-xs font-medium rounded-lg px-3 py-1.5 inline-block"
                        style={plan.isPopular
                          ? { background: "rgba(0,189,165,0.15)", color: "#00BDA5" }
                          : { background: "#F5F8FA", color: "#0091AE" }}>
                        {plan.creditsPerCycle.toLocaleString()} {locale === "ar" ? "رصيد/شهر" : "credits/month included"}
                      </div>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((f: string) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm"
                        style={plan.isPopular ? { color: "rgba(255,255,255,0.8)" } : { color: "#516F90" }}>
                        <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#00BDA5" }} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link href={plan.ctaHref}>
                    <Button
                      className="w-full"
                      size="lg"
                      data-testid={`btn-plan-${plan.name.toLowerCase()}`}
                      style={plan.isPopular
                        ? { background: "#00BDA5", color: "#2D3E50", fontWeight: 700 }
                        : { background: "#FF7A59", color: "#fff", border: "none" }}
                    >
                      {plan.ctaText}
                      <ArrowRight className={`w-4 h-4 ${isRtl ? "mr-2 rotate-180" : "ml-2"}`} />
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="mt-16 text-center">
            <p className="text-sm" style={{ color: "#516F90" }}>
              {locale === "ar" ? "تحتاج خطة مخصصة لفريقك؟" : "Need a custom plan for your team?"}{" "}
              <Link href="/contact-sales" className="font-semibold hover:underline" style={{ color: "#33475B" }}>
                {locale === "ar" ? "تحدث مع فريقنا ←" : "Talk to our team →"}
              </Link>
            </p>
          </div>
        </div>
      </section>

      <footer className="py-8 px-6 text-center text-sm" style={{ background: "#1A2E3A", color: "rgba(255,255,255,0.4)" }}>
        <Link href={`/${locale}`} className="hover:underline" style={{ color: "#00BDA5" }}>
          {locale === "ar" ? "← العودة إلى كونتنتك" : "← Back to Contentech"}
        </Link>
      </footer>
    </main>
  );
}
