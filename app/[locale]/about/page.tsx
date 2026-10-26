import Link from "next/link";
import type { Metadata } from "next";
import { Globe2, ArrowRight, Users, Zap, ShieldCheck } from "lucide-react";
import MarketingNav from "@/components/marketing/nav";
import { Button } from "@/components/ui/button";
import { getPageMeta, buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const meta = await getPageMeta("about", locale);
  return buildMetadata(meta, locale, `/${locale}/about`);
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isRtl = locale === "ar";

  const content = {
    en: {
      tagline: "Our Story",
      headline: "We believe language should never\nbe a barrier to business.",
      intro: "Contentech was founded by linguists and engineers who saw a gap: AI translation was getting fast, but accuracy was still unreliable for high-stakes content. We built the platform that fixes that.",
      pillars: [
        { title: "AI-First, Human-Verified", desc: "We don't replace human expertise — we amplify it. AI handles speed, humans ensure accuracy." },
        { title: "Zero Compromise on Quality", desc: "Every project has a human expert as the final checkpoint. Precision is non-negotiable." },
        { title: "Built for Enterprises", desc: "From SMBs to Fortune 500 — our platform scales to your needs with enterprise-grade security." },
      ],
      ctaHeading: "Ready to speak every language?",
      ctaBody: "Join 1,000+ companies translating smarter with Contentech.",
      ctaBtn: "Start FREE",
    },
    ar: {
      tagline: "قصتنا",
      headline: "نؤمن بأن اللغة يجب أن لا تكون\nعائقًا أمام الأعمال.",
      intro: "أسست كونتنتك فريق من اللغويين والمهندسين الذين رأوا فجوة: كانت الترجمة بالذكاء الاصطناعي تتسارع، لكن الدقة لا تزال غير موثوقة للمحتوى عالي المخاطر. بنينا المنصة التي تحل هذه المشكلة.",
      pillars: [
        { title: "الذكاء الاصطناعي أولًا، التحقق البشري دائمًا", desc: "لا نستبدل الخبرة البشرية، بل نضاعفها. الذكاء الاصطناعي يتولى السرعة والإنسان يضمن الدقة." },
        { title: "لا تنازل في الجودة", desc: "كل مشروع لديه خبير بشري كنقطة تحقق نهائية. الدقة أمر غير قابل للتفاوض." },
        { title: "مصمم للمؤسسات", desc: "من الشركات الصغيرة إلى Fortune 500، تتوسع منصتنا لتلبية احتياجاتك مع أمان على مستوى المؤسسات." },
      ],
      ctaHeading: "هل أنت مستعد للتحدث بكل لغة؟",
      ctaBody: "انضم إلى 1,000+ شركة تترجم بذكاء مع كونتنتك.",
      ctaBtn: "ابدأ مجانًا",
    },
  };

  const c = content[locale as keyof typeof content] ?? content.en;

  return (
    <main className="min-h-screen bg-[#FAFBFC]" dir={isRtl ? "rtl" : "ltr"}>
      <MarketingNav locale={locale} />

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="font-semibold text-sm uppercase tracking-widest mb-4" style={{ color: "#0091AE" }}>{c.tagline}</p>
          <h1 className="text-5xl font-bold mb-6 leading-tight" style={{ color: "#33475B" }}>
            {c.headline.split("\n").map((line, i) => <span key={i}>{line}{i === 0 && <br />}</span>)}
          </h1>
          <p className="text-xl leading-relaxed mb-10 max-w-2xl" style={{ color: "#516F90" }}>
            {c.intro}
          </p>
        </div>
      </section>

      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {c.pillars.map(({ title, desc }, i) => {
              const icons = [Zap, ShieldCheck, Users];
              const Icon = icons[i];
              return (
                <div key={title} className="text-center">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ background: "#EEF1F5" }}>
                    <Icon className="w-6 h-6" style={{ color: "#33475B" }} />
                  </div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: "#33475B" }}>{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#516F90" }}>{desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 text-white text-center" style={{ background: "#2D3E50" }}>
        <div className="max-w-2xl mx-auto">
          <Globe2 className="w-12 h-12 mx-auto mb-6" style={{ color: "#00BDA5" }} />
          <h2 className="text-3xl font-bold mb-4">{c.ctaHeading}</h2>
          <p className="mb-8" style={{ color: "rgba(255,255,255,0.6)" }}>{c.ctaBody}</p>
          <Link href="/register">
            <Button size="lg" className="px-10 text-white border-0 font-semibold" style={{ background: "#FF7A59" }}>
              {c.ctaBtn}
              <ArrowRight className={`w-5 h-5 ${isRtl ? "mr-2 rotate-180" : "ml-2"}`} />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="py-8 px-6 text-center text-sm" style={{ background: "#1A2E3A", color: "rgba(255,255,255,0.4)" }}>
        <Link href={`/${locale}`} style={{ color: "#0091AE" }} className="hover:underline">
          {locale === "ar" ? "← العودة إلى كونتنتك" : "← Back to Contentech"}
        </Link>
      </footer>
    </main>
  );
}
