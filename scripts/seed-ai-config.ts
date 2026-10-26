/**
 * Seed starter LLM providers, models, and routing rules.
 * These are clearly marked as sample/template data so admins know to review them.
 * Run via: npx tsx scripts/seed-ai-config.ts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 8000 });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  // ── Check if already seeded ─────────────────────────────────────────────────
  const existing = await prisma.aiProvider.count();
  if (existing > 0) {
    console.log("  ✓ AI providers already seeded — skipping");
    await prisma.$disconnect(); await pool.end(); return;
  }

  // ── Seed Providers ───────────────────────────────────────────────────────────
  const openai = await prisma.aiProvider.create({ data: {
    name: "OpenAI", type: "openai",
    baseUrl: "https://api.openai.com",
    region: "us-east-1", environment: "production", status: "active",
    rateLimitRpm: 60, costProfile: "standard",
    notes: "[SAMPLE] OpenAI API — update credentials before use",
  }});

  const anthropic = await prisma.aiProvider.create({ data: {
    name: "Anthropic", type: "anthropic",
    baseUrl: "https://api.anthropic.com",
    region: "us-east-1", environment: "production", status: "active",
    rateLimitRpm: 50, costProfile: "premium",
    notes: "[SAMPLE] Anthropic Claude — update credentials before use",
  }});

  const google = await prisma.aiProvider.create({ data: {
    name: "Google (Vertex AI)", type: "vertex",
    baseUrl: "https://us-central1-aiplatform.googleapis.com",
    region: "us-central1", environment: "production", status: "active",
    rateLimitRpm: 60, costProfile: "standard",
    notes: "[SAMPLE] Google Gemini via Vertex AI — update credentials before use",
  }});

  const cohere = await prisma.aiProvider.create({ data: {
    name: "Cohere", type: "cohere",
    baseUrl: "https://api.cohere.ai",
    region: "global", environment: "production", status: "active",
    rateLimitRpm: 100,
    notes: "[SAMPLE] Cohere — strong multilingual and low-resource language support",
  }});

  const moonshot = await prisma.aiProvider.create({ data: {
    name: "Moonshot AI", type: "moonshot",
    baseUrl: "https://api.moonshot.cn",
    region: "cn-east", environment: "production", status: "active",
    rateLimitRpm: 30,
    notes: "[SAMPLE] Moonshot Kimi — strong CJK language performance",
  }});

  console.log("  ✓ Seeded 5 example providers");

  // ── Seed Models ──────────────────────────────────────────────────────────────
  const models: Record<string, string> = {};

  const m1 = await prisma.aiModel.create({ data: {
    providerId: openai.id, displayName: "GPT-4o",
    apiModelId: "gpt-4o", internalKey: "openai-gpt4o",
    version: "2024-11-20", contextWindow: 128000, outputLimit: 16384,
    status: "production", latencyTier: "balanced", costTier: "premium", qualityTier: "flagship",
    capabilities: { jsonMode: true, toolCalling: true, glossaryInjection: true,
      styleGuidance: true, terminologyLocking: true, longDocument: true, multilingualReasoning: true },
    domains: ["legal", "medical", "technical", "software", "marketing", "literary", "finance"],
    languageGroups: ["european", "arabic", "cjk", "indic", "multilingual"],
    notes: "[SAMPLE] OpenAI flagship — excellent for terminology-heavy and quality-critical work",
  }});
  models["gpt4o"] = m1.id;

  const m2 = await prisma.aiModel.create({ data: {
    providerId: openai.id, displayName: "GPT-4o mini",
    apiModelId: "gpt-4o-mini", internalKey: "openai-gpt4o-mini",
    version: "2024-07-18", contextWindow: 128000, outputLimit: 16384,
    status: "production", latencyTier: "fast", costTier: "low", qualityTier: "standard",
    capabilities: { jsonMode: true, toolCalling: true, glossaryInjection: true, styleGuidance: true },
    domains: ["ecommerce", "customer-support", "education", "media"],
    languageGroups: ["european", "multilingual"],
    notes: "[SAMPLE] Cost-efficient option for standard content",
  }});
  models["gpt4omini"] = m2.id;

  const m3 = await prisma.aiModel.create({ data: {
    providerId: anthropic.id, displayName: "Claude 3.5 Sonnet",
    apiModelId: "claude-3-5-sonnet-20241022", internalKey: "anthropic-claude35-sonnet",
    version: "20241022", contextWindow: 200000, outputLimit: 8192,
    status: "production", latencyTier: "balanced", costTier: "premium", qualityTier: "flagship",
    capabilities: { jsonMode: true, toolCalling: true, glossaryInjection: true,
      styleGuidance: true, terminologyLocking: true, longDocument: true, multilingualReasoning: true },
    domains: ["literary", "marketing", "ecommerce", "legal", "government", "EU-legal"],
    languageGroups: ["european", "arabic", "multilingual"],
    notes: "[SAMPLE] Anthropic — excellent for creative, literary, tone-sensitive content",
  }});
  models["claude35sonnet"] = m3.id;

  const m4 = await prisma.aiModel.create({ data: {
    providerId: google.id, displayName: "Gemini 1.5 Pro",
    apiModelId: "gemini-1.5-pro-002", internalKey: "google-gemini15-pro",
    version: "002", contextWindow: 2000000, outputLimit: 8192,
    status: "production", latencyTier: "balanced", costTier: "medium", qualityTier: "advanced",
    capabilities: { jsonMode: true, toolCalling: true, glossaryInjection: true,
      styleGuidance: true, longDocument: true, multilingualReasoning: true, lowResourceLanguages: true },
    domains: ["long-document", "technical", "life-sciences", "patents", "government"],
    languageGroups: ["european", "indic", "multilingual"],
    notes: "[SAMPLE] Google — 2M token context window ideal for very long documents",
  }});
  models["gemini15pro"] = m4.id;

  const m5 = await prisma.aiModel.create({ data: {
    providerId: cohere.id, displayName: "Command R+",
    apiModelId: "command-r-plus-08-2024", internalKey: "cohere-command-r-plus",
    version: "08-2024", contextWindow: 128000, outputLimit: 4096,
    status: "production", latencyTier: "fast", costTier: "low", qualityTier: "standard",
    capabilities: { jsonMode: true, toolCalling: false, glossaryInjection: true,
      multilingualReasoning: true, lowResourceLanguages: true },
    domains: ["low-resource", "education", "customer-support", "ecommerce"],
    languageGroups: ["european", "african", "low-resource", "multilingual"],
    warnings: ["Less suited for highly technical legal translation"],
    notes: "[SAMPLE] Cohere — broad multilingual support including low-resource languages",
  }});
  models["commandrplus"] = m5.id;

  const m6 = await prisma.aiModel.create({ data: {
    providerId: moonshot.id, displayName: "Kimi k1.5",
    apiModelId: "moonshot-v1-128k", internalKey: "moonshot-kimi-128k",
    version: "128k", contextWindow: 128000, outputLimit: 8192,
    status: "beta", latencyTier: "balanced", costTier: "low", qualityTier: "advanced",
    capabilities: { jsonMode: true, toolCalling: false, glossaryInjection: true, multilingualReasoning: true },
    domains: ["CJK", "software", "technical", "ecommerce"],
    languageGroups: ["cjk", "european"],
    warnings: ["Beta — validate output quality before production use"],
    notes: "[SAMPLE] Moonshot Kimi — strong Chinese/Japanese/Korean translation performance",
  }});
  models["moonshot128k"] = m6.id;

  console.log("  ✓ Seeded 6 example models");

  // ── Seed Routing Rules ───────────────────────────────────────────────────────
  await prisma.llmRoutingRule.createMany({ data: [
    {
      name: "Technical, Legal & Medical Specialized",
      description: "High-reasoning flagship models for terminology-critical translation",
      priority: 10, enabled: true, isTemplate: false,
      conditions: { domains: ["legal", "medical", "technical", "software", "life-sciences", "patents", "finance", "EU-legal"] },
      primaryModelId: models["gpt4o"],
      secondaryModelId: models["claude35sonnet"],
      tertiaryModelId: models["gemini15pro"],
      policy: { terminologyMode: "strict", styleGuideMode: "professional" },
      createdBy: "seed",
    },
    {
      name: "Creative, Literary & Marketing Translation",
      description: "Tone-aware models for nuanced, style-sensitive content",
      priority: 20, enabled: true, isTemplate: false,
      conditions: { domains: ["literary", "marketing", "ecommerce", "media"] },
      primaryModelId: models["claude35sonnet"],
      secondaryModelId: models["gpt4o"],
      tertiaryModelId: models["gpt4omini"],
      policy: { terminologyMode: "flexible", styleGuideMode: "creative" },
      createdBy: "seed",
    },
    {
      name: "Very Long Documents (50k+ tokens)",
      description: "Long-context model for books, policy manuals, and lengthy reports",
      priority: 15, enabled: true, isTemplate: false,
      conditions: { tokenMin: 50000 },
      primaryModelId: models["gemini15pro"],
      secondaryModelId: models["gpt4o"],
      policy: { terminologyMode: "flexible" },
      createdBy: "seed",
    },
    {
      name: "CJK Language Pairs",
      description: "Models validated for Chinese, Japanese, Korean",
      priority: 25, enabled: true, isTemplate: false,
      conditions: { languageGroups: ["cjk"] },
      primaryModelId: models["moonshot128k"],
      secondaryModelId: models["gpt4o"],
      tertiaryModelId: models["gemini15pro"],
      policy: { terminologyMode: "strict" },
      createdBy: "seed",
    },
    {
      name: "Arabic & RTL Content",
      description: "Models validated for RTL formatting and Arabic nuance",
      priority: 30, enabled: true, isTemplate: false,
      conditions: { languageGroups: ["arabic"] },
      primaryModelId: models["gpt4o"],
      secondaryModelId: models["claude35sonnet"],
      policy: { terminologyMode: "strict" },
      createdBy: "seed",
    },
    {
      name: "Low-Resource Languages",
      description: "Multilingual models with broad low-resource language coverage",
      priority: 35, enabled: true, isTemplate: false,
      conditions: { languageGroups: ["low-resource", "african"] },
      primaryModelId: models["commandrplus"],
      secondaryModelId: models["gemini15pro"],
      tertiaryModelId: models["gpt4o"],
      policy: { terminologyMode: "flexible" },
      createdBy: "seed",
    },
    {
      name: "Budget-Sensitive Routing",
      description: "Lowest-cost approved model for standard priority requests",
      priority: 90, enabled: true, isTemplate: false,
      conditions: { priorityModes: ["cost"] },
      primaryModelId: models["gpt4omini"],
      secondaryModelId: models["commandrplus"],
      policy: { terminologyMode: "flexible" },
      createdBy: "seed",
    },
    {
      name: "Premium Quality Routing",
      description: "Highest-quality approved model for enterprise premium requests",
      priority: 5, enabled: true, isTemplate: false,
      conditions: { priorityModes: ["quality"], clientTiers: ["enterprise"] },
      primaryModelId: models["gpt4o"],
      secondaryModelId: models["claude35sonnet"],
      tertiaryModelId: models["gemini15pro"],
      policy: { terminologyMode: "strict", styleGuideMode: "professional" },
      createdBy: "seed",
    },
  ]});

  console.log("  ✓ Seeded 8 routing rules (editable templates)");

  // ── Audit events for the seed ────────────────────────────────────────────────
  await prisma.llmAuditLog.create({ data: {
    actorEmail: "seed@contentech.io",
    action: "seed_applied",
    entityType: "system",
    entityName: "Initial seed",
    after: { providers: 5, models: 6, rules: 8 },
    notes: "Initial example data seeded — review and update before production use",
  }});

  console.log("  ✓ AI Config seed complete");
  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => { console.error("AI config seed error:", e); process.exit(1); });
