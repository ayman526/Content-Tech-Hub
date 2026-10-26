import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

const SITE_URL = process.env.NEXTAUTH_URL ?? "https://contentech.ai";

interface PageMetaData {
  title?: string | null;
  description?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
  canonical?: string | null;
  noIndex?: boolean;
}

const DEFAULTS: Record<string, Record<string, PageMetaData>> = {
  home: {
    en: {
      title: "Contentech — Enterprise Multilingual Translation Platform",
      description: "Combine AI speed with certified human expertise. Full control, every time.",
      ogTitle: "Contentech — Enterprise Translation Without Compromise",
      ogDescription: "AI-powered translation with human-grade accuracy. Trusted by 1,000+ organizations.",
    },
    ar: {
      title: "كونتنتك — منصة الترجمة متعددة اللغات للمؤسسات",
      description: "اجمع بين سرعة الذكاء الاصطناعي وخبرة المترجمين البشريين المعتمدين.",
      ogTitle: "كونتنتك — ترجمة احترافية بلا تنازلات",
      ogDescription: "ترجمة مدعومة بالذكاء الاصطناعي بدقة بشرية.",
    },
  },
  pricing: {
    en: {
      title: "Pricing — Contentech Translation Platform",
      description: "Transparent pricing for every team size. Start free, scale as you grow.",
      ogTitle: "Contentech Pricing — Start Free, Scale as You Grow",
      ogDescription: "Flexible plans for individuals, teams, and enterprises. No hidden fees.",
    },
    ar: {
      title: "الأسعار — منصة كونتنتك للترجمة",
      description: "أسعار شفافة لكل حجم من الفرق. ابدأ مجانًا وتوسع مع نمو احتياجاتك.",
      ogTitle: "أسعار كونتنتك — ابدأ مجانًا",
      ogDescription: "خطط مرنة للأفراد والفرق والمؤسسات.",
    },
  },
  about: {
    en: {
      title: "About Contentech — Our Mission & Story",
      description: "We build the hybrid translation ecosystem combining AI speed with human precision.",
      ogTitle: "About Contentech",
      ogDescription: "Founded by linguists and engineers. Building the future of translation.",
    },
    ar: {
      title: "عن كونتنتك — مهمتنا وقصتنا",
      description: "نبني نظام الترجمة الهجين الذي يجمع بين سرعة الذكاء الاصطناعي ودقة الإنسان.",
      ogTitle: "عن كونتنتك",
      ogDescription: "أسسها لغويون ومهندسون. نبني مستقبل الترجمة.",
    },
  },
};

export async function getPageMeta(pageKey: string, locale: string): Promise<PageMetaData> {
  try {
    const record = await prisma.pageMeta.findUnique({
      where: { pageKey_locale: { pageKey, locale } },
    });
    if (record) return record;
  } catch {
    // DB unavailable — fall through to defaults
  }
  return DEFAULTS[pageKey]?.[locale] ?? DEFAULTS[pageKey]?.en ?? {};
}

export function buildMetadata(meta: PageMetaData, locale: string, canonicalPath?: string): Metadata {
  const title = meta.title ?? "Contentech";
  const description = meta.description ?? "Enterprise multilingual translation platform.";
  const ogTitle = meta.ogTitle ?? title;
  const ogDescription = meta.ogDescription ?? description;
  const ogImage = meta.ogImage ?? `${SITE_URL}/og-default.png`;
  const canonical = meta.canonical ?? (canonicalPath ? `${SITE_URL}${canonicalPath}` : undefined);

  return {
    title,
    description,
    ...(meta.noIndex ? { robots: { index: false, follow: false } } : {}),
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      locale: locale === "ar" ? "ar_SA" : "en_US",
      type: "website",
      siteName: "Contentech",
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: [ogImage],
    },
  };
}
