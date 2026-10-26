import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 8000 });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  console.log("  Seeding PlanConfig...");
  const plans = [
    {
      name: "Starter",
      slug: "starter",
      price: 0,
      period: "",
      description: "Perfect for individuals and small teams getting started with translation.",
      features: [
        "100 platform credits/month",
        "BYOK Translation (OpenAI, DeepL, Google)",
        "1 Translation Memory",
        "100 Glossary Terms",
        "10 documents/month",
        "Email support",
        "Basic analytics",
      ],
      creditsPerCycle: 100,
      isPopular: false,
      isActive: true,
      displayOrder: 0,
      ctaText: "Get Started Free",
      ctaHref: "/register",
    },
    {
      name: "Professional",
      slug: "professional",
      price: 49,
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
      creditsPerCycle: 1000,
      isPopular: true,
      isActive: true,
      displayOrder: 1,
      ctaText: "Start FREE",
      ctaHref: "/register",
    },
    {
      name: "Enterprise",
      slug: "enterprise",
      price: 249,
      period: "/mo",
      description: "For large organizations with advanced compliance and dedicated linguist teams.",
      features: [
        "Everything in Professional",
        "5,000 platform credits/month",
        "Dedicated linguist team",
        "Unlimited Translation Memories",
        "Unlimited Glossaries",
        "SSO / SAML",
        "DPA & compliance docs",
        "Custom on-prem LLM",
        "SLA guarantee",
        "Dedicated account manager",
      ],
      creditsPerCycle: 5000,
      isPopular: false,
      isActive: true,
      displayOrder: 2,
      ctaText: "Contact Sales",
      ctaHref: "/contact-sales",
    },
  ];

  for (const plan of plans) {
    const { price, isPopular, isActive, ...structuralFields } = plan;
    await prisma.planConfig.upsert({
      where: { slug: plan.slug },
      // On update: only refresh structural/display fields — never overwrite
      // admin-editable fields (price, isPopular, isActive) set via the UI.
      update: structuralFields,
      create: plan,
    });
  }
  console.log("  ✓ PlanConfig seeded");

  console.log("  Seeding CreditPackage...");
  const packages = [
    { name: "Starter Pack", credits: 500, bonusCredits: 0, priceUsd: 29, isPopular: false, isActive: true, displayOrder: 0 },
    { name: "Growth Pack", credits: 1000, bonusCredits: 100, priceUsd: 49, isPopular: true, isActive: true, displayOrder: 1 },
    { name: "Business Pack", credits: 3000, bonusCredits: 400, priceUsd: 129, isPopular: false, isActive: true, displayOrder: 2 },
    { name: "Enterprise Pack", credits: 10000, bonusCredits: 2000, priceUsd: 399, isPopular: false, isActive: true, displayOrder: 3 },
  ];
  const existingPkgs = await prisma.creditPackage.count();
  if (existingPkgs === 0) {
    await prisma.creditPackage.createMany({ data: packages });
    console.log("  ✓ CreditPackage seeded");
  } else {
    console.log("  ✓ CreditPackage already exists — skipping");
  }

  console.log("  Seeding CreditRate...");
  const rates = [
    {
      workflowType: "AI_TRANSLATION",
      creditsPerWord: 0.2, // 1 credit = 5 words => 0.2 credits/word
      label: "AI Translation",
      description: "1 credit = 5 words. $49/1,000 credits ≈ $0.0098/word.",
    },
    {
      workflowType: "HUMAN_REVISION",
      creditsPerWord: 0.5, // 1 credit = 2 words => 0.5 credits/word
      label: "Human Revision",
      description: "1 credit = 2 words. $49/1,000 credits ≈ $0.0245/word.",
    },
    {
      workflowType: "HUMAN_TRANSLATION",
      creditsPerWord: 2.0, // 2 credits = 1 word => 2 credits/word
      label: "Human Translation",
      description: "2 credits = 1 word. $49/1,000 credits ≈ $0.098/word.",
    },
    {
      workflowType: "OCR_PAGE",
      creditsPerWord: 5.0, // Reused field — for OCR this represents credits-per-PAGE
      label: "OCR (per page)",
      description: "OCR processing of scanned/non-editable documents. 5 credits per page covers Mistral OCR + Tesseract verification.",
    },
  ];
  for (const rate of rates) {
    const { creditsPerWord, ...rateDisplayFields } = rate;
    await prisma.creditRate.upsert({
      where: { workflowType: rate.workflowType },
      // Never overwrite creditsPerWord — admin edits it via /admin/credit-rates
      update: rateDisplayFields,
      create: rate,
    });
  }
  console.log("  ✓ CreditRate seeded");

  console.log("  Seeding SiteConfig...");
  const configs = [
    {
      key: "hero",
      value: {
        badge: "Trusted by 500+ enterprises worldwide",
        headline: "The AI-Powered OS for Multilingual Content Creation",
        subheadline: "Unify AI, linguists, terminology, content memory, and project workflows in one place built for business.",
        ctaPrimary: { text: "Start Free Today", href: "/register" },
        ctaSecondary: { text: "Contact Sales", href: "/contact-sales" },
      },
    },
    {
      key: "stats",
      value: [
        { label: "Languages Supported", value: "180+" },
        { label: "Certified Linguists", value: "2,400+" },
        { label: "Words Translated", value: "1.2B+" },
        { label: "Enterprise Clients", value: "500+" },
      ],
    },
    {
      key: "value_props",
      value: [
        { title: "Speed at Scale", description: "AI pre-translation delivers a high-quality first draft in minutes, not days. Handle millions of words without expanding your team." },
        { title: "Human-Grade Accuracy", description: "Every AI draft is reviewed by certified linguists. Your Content Memory and Glossary ensure consistent terminology across every project." },
        { title: "Complete Data Control", description: "Use your own API keys, your own linguists, or your own on-premises LLM. Your data never trains a public model." },
        { title: "180+ Languages", description: "Deep specialist coverage for Arabic, Japanese, German, French, and all major language pairs with domain expertise." },
      ],
    },
    {
      key: "footer_links",
      value: {
        Platform: [
          { label: "Dashboard", href: "/dashboard" },
          { label: "Translation Wizard", href: "/dashboard/wizard" },
          { label: "Translation Memory", href: "/dashboard/memory" },
          { label: "Glossary", href: "/dashboard/glossary" },
          { label: "Linguist Portal", href: "/linguist-login" },
        ],
        Services: [
          { label: "AI Quality Shield", href: "/services/ai-quality-shield" },
          { label: "AI Training Data", href: "/services/ai-training-data" },
          { label: "Contentech Human™", href: "/services/contentech-human" },
          { label: "Localization Engineering", href: "/services/localization-engineering" },
        ],
        Company: [
          { label: "About", href: "/about" },
          { label: "Pricing", href: "/pricing" },
          { label: "Careers", href: "/careers" },
          { label: "Blog", href: "/blog" },
        ],
        Resources: [
          { label: "Documentation", href: "/docs" },
          { label: "API Reference", href: "/docs/api" },
          { label: "Contact Sales", href: "/contact" },
          { label: "Status", href: "/status" },
        ],
      },
    },
    {
      key: "faq",
      value: [
        { q: "What is Contentech?", a: "Contentech is an enterprise content platform that combines AI automation with certified linguists. You can use platform credits, bring your own API keys, invite your own in-house creators, or connect a private on-premises language model — all in one workspace with shared content memory and glossary." },
        { q: "What does 'Bring Your Own Keys' (BYOK) mean?", a: "BYOK means you connect your own OpenAI, Anthropic, or Azure AI API credentials to Contentech. Your documents are processed under your account — so your content never touches a shared endpoint, is never stored by us, and is never used to train any public AI model." },
        { q: "Can I invite my in-house creators to the platform?", a: "Yes. You can invite your in-house linguists, subject-matter experts, or preferred vendors directly into your Contentech workspace. They join your organization, share your Content Memory and Glossary, and can be assigned jobs through the platform." },
        { q: "How does the AI + Human hybrid workflow work?", a: "You upload a document through the chat-based wizard, and our AI generates a high-quality first draft using your preferred model. The draft is then assigned to a matched linguist who reviews, refines, and approves each segment using your Content Memory and Glossary." },
        { q: "What languages do you support?", a: "We support over 180 languages, with strong specialist coverage for Arabic (MSA and regional dialects), French, German, Spanish, Japanese, Chinese, Turkish, and all major European and MENA languages." },
        { q: "How is pricing calculated?", a: "Pricing depends on your workflow. BYOK users pay only for platform access (Starter is free). Platform-credit users purchase credit packages and pay per word. Human-only jobs use our transparent rate card. Enterprise plans include dedicated teams and custom SLAs." },
        { q: "Is Contentech compliant with GDPR and HIPAA?", a: "Yes. When using BYOK or on-prem LLM mode, your content is processed entirely within your own infrastructure. We do not retain document content after processing. Enterprise plans include DPA agreements, SSO/SAML, and custom data residency." },
      ],
    },
    {
      key: "nav_links",
      value: [
        { label: "Pricing", href: "/pricing" },
        { label: "About", href: "/about" },
        { label: "Contact Sales", href: "/contact-sales" },
      ],
    },
    {
      key: "home.trust_companies",
      value: ["LexCorp Legal", "DataScale AI", "PharmaTrans", "AlphaBank", "NovaMed Group", "OmniRetail", "TechBridge"],
    },
    {
      key: "home.services",
      value: [
        {
          name: "AI Quality Shield",
          tagline: "Your AI Safety Net",
          href: "/services/ai-quality-shield",
          description: "Companies trust AI for speed but fear embarrassing errors and legal liability. Our experts perform Linguistic Risk Assessment — verifying accuracy, cultural appropriateness, and legal compliance before your content goes live.",
          bullets: ["Accuracy & cultural validation", "Legal compliance review", "Risk-tiered pricing model", "Free initial risk assessment"],
        },
        {
          name: "AI Training Data",
          tagline: "Fuel the AI Revolution",
          href: "/services/ai-training-data",
          description: "LLMs require high-quality human-verified training data. Contentech's linguist network provides data annotation, RLHF, code comment correction, and dataset validation at scale.",
          bullets: ["Data annotation & labeling", "RLHF — human feedback ranking", "Dataset quality validation", "Multilingual data pipelines"],
        },
        {
          name: "Contentech Human™",
          tagline: "Zero AI Tolerance",
          href: "/services/contentech-human",
          description: "When a single mistranslation means millions in damages or a health hazard, you need certified specialists. Legal, life sciences, and high-end marketing transcreation handled by domain experts exclusively.",
          bullets: ["Certified legal translators", "Medical translation specialists", "Transcreation for marketing", "Zero AI involvement guarantee"],
        },
        {
          name: "Localization Engineering",
          tagline: "Beyond Translation",
          href: "/services/localization-engineering",
          description: "AI can't build RTL architecture or manage complex i18n repositories. Our engineering team handles i18n audits, TMS implementation, complex file format processing, and strategic localization consulting.",
          bullets: ["Internationalization architecture", "TMS setup & management", "RTL language support", "Strategic i18n consulting"],
        },
      ],
    },
    {
      key: "home.steps",
      value: [
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
          description: "AI generates a high-quality draft. Your matched linguists review and refine in the CAT editor. Download when ready.",
          detail: "Typical turnaround: 2–8 hours.",
        },
      ],
    },
    {
      key: "home.use_cases",
      value: [
        { title: "Legal & Compliance", description: "Contracts, patents, court filings. Certified translators with legal specialization and full audit trail." },
        { title: "Life Sciences", description: "Clinical trial protocols, regulatory submissions, and IFUs. ICH E6 GCP compliant workflows." },
        { title: "Marketing & Brand", description: "Campaigns, transcreation, and social content. Cultural adaptation that resonates, not just translates." },
        { title: "eCommerce", description: "Product catalogues, listings, and support content. Consistent tone at scale with TM-driven efficiency." },
        { title: "Software & Tech", description: "UI strings, developer docs, and release notes. Full i18n support with XLIFF and JSON file formats." },
        { title: "Financial Services", description: "Annual reports, prospectuses, and investor communications. Precision terminology for regulated markets." },
      ],
    },
    {
      key: "home.testimonials",
      value: [
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
      ],
    },
  ];

  for (const cfg of configs) {
    await prisma.siteConfig.upsert({
      where: { key: cfg.key },
      // Never overwrite on subsequent runs — admin edits all content via /admin/content
      // The seed only provides initial values for fresh deployments.
      update: {},
      create: cfg,
    });
  }
  console.log("  ✓ SiteConfig seeded");

  // ── PageMeta defaults ──────────────────────────────────────────────────────
  const pageMetaDefaults = [
    {
      pageKey: "home",
      locale: "en",
      title: "Contentech — Enterprise Multilingual Translation Platform",
      description: "Combine AI speed with certified human expertise. Use your own API keys, your own linguists, your own LLM — or ours. Full control, every time.",
      ogTitle: "Contentech — Enterprise Translation Without Compromise",
      ogDescription: "AI-powered translation with human-grade accuracy. Trusted by 1,000+ organizations across 40+ countries.",
    },
    {
      pageKey: "home",
      locale: "ar",
      title: "كونتنتك — منصة الترجمة متعددة اللغات للمؤسسات",
      description: "اجمع بين سرعة الذكاء الاصطناعي وخبرة المترجمين البشريين المعتمدين. تحكم كامل في كل خطوة.",
      ogTitle: "كونتنتك — ترجمة احترافية بلا تنازلات",
      ogDescription: "ترجمة مدعومة بالذكاء الاصطناعي بدقة بشرية. موثوق به من أكثر من 1000 مؤسسة.",
    },
    {
      pageKey: "pricing",
      locale: "en",
      title: "Pricing — Contentech Translation Platform",
      description: "Transparent pricing for every team size. Start free, scale as you grow. From $0/mo to enterprise.",
      ogTitle: "Contentech Pricing — Start Free, Scale as You Grow",
      ogDescription: "Flexible plans for individuals, teams, and enterprises. No hidden fees.",
    },
    {
      pageKey: "pricing",
      locale: "ar",
      title: "الأسعار — منصة كونتنتك للترجمة",
      description: "أسعار شفافة لكل حجم من الفرق. ابدأ مجانًا وتوسع مع نمو احتياجاتك.",
      ogTitle: "أسعار كونتنتك — ابدأ مجانًا",
      ogDescription: "خطط مرنة للأفراد والفرق والمؤسسات. بدون رسوم مخفية.",
    },
    {
      pageKey: "about",
      locale: "en",
      title: "About Contentech — Our Mission & Story",
      description: "We build the hybrid translation ecosystem that combines AI speed with human precision. Learn our story.",
      ogTitle: "About Contentech",
      ogDescription: "Founded by linguists and engineers. Building the future of translation.",
    },
    {
      pageKey: "about",
      locale: "ar",
      title: "عن كونتنتك — مهمتنا وقصتنا",
      description: "نبني نظام الترجمة الهجين الذي يجمع بين سرعة الذكاء الاصطناعي ودقة الإنسان.",
      ogTitle: "عن كونتنتك",
      ogDescription: "أسسها لغويون ومهندسون. نبني مستقبل الترجمة.",
    },
  ];

  for (const meta of pageMetaDefaults) {
    await prisma.pageMeta.upsert({
      where: { pageKey_locale: { pageKey: meta.pageKey, locale: meta.locale } },
      update: {},
      create: meta,
    });
  }
  console.log("  ✓ PageMeta defaults seeded");
}

main()
  .catch((e) => { console.error(e); process.exit(1); });
