/**
 * Additive seed: Qwen, DeepSeek, EuroLLM providers + Asian / European routing rules.
 * Run via: npx tsx scripts/seed-ai-extra.ts
 * Safe to re-run — checks existence before creating.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 8000 });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  // ── Qwen (Alibaba Cloud) ────────────────────────────────────────────────────
  let qwen = await prisma.aiProvider.findFirst({ where: { name: "Qwen (Alibaba Cloud)" } });
  if (!qwen) {
    qwen = await prisma.aiProvider.create({ data: {
      name: "Qwen (Alibaba Cloud)", type: "qwen",
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode",
      region: "cn-east", environment: "production", status: "active",
      rateLimitRpm: 60, costProfile: "low",
      notes: "[SAMPLE] Qwen2.5 — state-of-the-art multilingual with exceptional Asian language coverage",
    }});
    console.log("  ✓ Created provider: Qwen (Alibaba Cloud)");
  } else {
    console.log("  · Qwen already exists — skipping");
  }

  let qwenModel = await prisma.aiModel.findUnique({ where: { internalKey: "qwen-qwen25-72b" } });
  if (!qwenModel) {
    qwenModel = await prisma.aiModel.create({ data: {
      providerId: qwen.id,
      displayName: "Qwen2.5-72B-Instruct",
      apiModelId: "qwen2.5-72b-instruct",
      internalKey: "qwen-qwen25-72b",
      version: "2.5", contextWindow: 131072, outputLimit: 8192,
      status: "production", latencyTier: "balanced", costTier: "low", qualityTier: "advanced",
      capabilities: { jsonMode: true, toolCalling: true, glossaryInjection: true,
        styleGuidance: true, multilingualReasoning: true, longDocument: true },
      domains: ["ecommerce", "software", "technical", "marketing", "customer-support", "education"],
      languageGroups: ["cjk", "southeast-asian", "asian", "european", "multilingual"],
      notes: "[SAMPLE] Qwen2.5-72B — exceptional Chinese, Japanese, Korean, and SEA language quality",
    }});
    console.log("  ✓ Created model: Qwen2.5-72B-Instruct");
  } else {
    console.log("  · Qwen2.5-72B already exists — skipping");
  }

  // ── DeepSeek ────────────────────────────────────────────────────────────────
  let deepseek = await prisma.aiProvider.findFirst({ where: { name: "DeepSeek" } });
  if (!deepseek) {
    deepseek = await prisma.aiProvider.create({ data: {
      name: "DeepSeek", type: "deepseek",
      baseUrl: "https://api.deepseek.com",
      region: "global", environment: "production", status: "active",
      rateLimitRpm: 60, costProfile: "low",
      notes: "[SAMPLE] DeepSeek — high-performance reasoning model with strong CJK and multilingual capability",
    }});
    console.log("  ✓ Created provider: DeepSeek");
  } else {
    console.log("  · DeepSeek already exists — skipping");
  }

  let deepseekModel = await prisma.aiModel.findUnique({ where: { internalKey: "deepseek-v3" } });
  if (!deepseekModel) {
    deepseekModel = await prisma.aiModel.create({ data: {
      providerId: deepseek.id,
      displayName: "DeepSeek-V3",
      apiModelId: "deepseek-chat",
      internalKey: "deepseek-v3",
      version: "V3", contextWindow: 131072, outputLimit: 8192,
      status: "production", latencyTier: "fast", costTier: "low", qualityTier: "advanced",
      capabilities: { jsonMode: true, toolCalling: true, glossaryInjection: true,
        multilingualReasoning: true, styleGuidance: true },
      domains: ["software", "technical", "ecommerce", "customer-support", "education", "finance"],
      languageGroups: ["cjk", "southeast-asian", "asian", "multilingual"],
      notes: "[SAMPLE] DeepSeek-V3 — excellent CJK reasoning, fast and very cost-efficient",
    }});
    console.log("  ✓ Created model: DeepSeek-V3");
  } else {
    console.log("  · DeepSeek-V3 already exists — skipping");
  }

  // ── EuroLLM ─────────────────────────────────────────────────────────────────
  let eurollm = await prisma.aiProvider.findFirst({ where: { name: "EuroLLM" } });
  if (!eurollm) {
    eurollm = await prisma.aiProvider.create({ data: {
      name: "EuroLLM", type: "custom",
      baseUrl: "https://api-inference.huggingface.co/models/utter-project/EuroLLM-9B-Instruct",
      region: "eu-west", environment: "production", status: "active",
      rateLimitRpm: 30, costProfile: "low",
      notes: "[SAMPLE] EuroLLM-9B — open-weight EU-focused model trained on all 24 EU official languages; self-host or use via HuggingFace",
    }});
    console.log("  ✓ Created provider: EuroLLM");
  } else {
    console.log("  · EuroLLM already exists — skipping");
  }

  let eurollmModel = await prisma.aiModel.findUnique({ where: { internalKey: "eurollm-9b-instruct" } });
  if (!eurollmModel) {
    eurollmModel = await prisma.aiModel.create({ data: {
      providerId: eurollm.id,
      displayName: "EuroLLM-9B-Instruct",
      apiModelId: "utter-project/EuroLLM-9B-Instruct",
      internalKey: "eurollm-9b-instruct",
      version: "9B", contextWindow: 4096, outputLimit: 2048,
      status: "production", latencyTier: "fast", costTier: "low", qualityTier: "standard",
      capabilities: { jsonMode: false, toolCalling: false, glossaryInjection: true,
        multilingualReasoning: true, styleGuidance: false },
      domains: ["ecommerce", "customer-support", "education", "government", "media"],
      languageGroups: ["european"],
      notes: "[SAMPLE] EuroLLM-9B — all 24 EU official languages; GDPR-friendly; ideal for European content at low cost",
      warnings: ["Smaller context window (4k tokens) — split long documents", "No tool calling — pure text generation"],
    }});
    console.log("  ✓ Created model: EuroLLM-9B-Instruct");
  } else {
    console.log("  · EuroLLM-9B already exists — skipping");
  }

  // ── Get existing model IDs needed for rules ──────────────────────────────────
  const moonshot = await prisma.aiModel.findUnique({ where: { internalKey: "moonshot-kimi-128k" } });
  const gpt4o = await prisma.aiModel.findUnique({ where: { internalKey: "openai-gpt4o" } });
  const claude = await prisma.aiModel.findUnique({ where: { internalKey: "anthropic-claude35-sonnet" } });
  const gemini = await prisma.aiModel.findUnique({ where: { internalKey: "google-gemini15-pro" } });

  // ── Update CJK rule to use Qwen + DeepSeek ──────────────────────────────────
  const cjkRule = await prisma.llmRoutingRule.findFirst({ where: { name: "CJK Language Pairs" } });
  if (cjkRule) {
    await prisma.llmRoutingRule.update({
      where: { id: cjkRule.id },
      data: {
        name: "CJK Languages (Chinese, Japanese, Korean)",
        description: "Models validated for CJK language pairs — Qwen and DeepSeek lead",
        primaryModelId: qwenModel.id,
        secondaryModelId: deepseekModel.id,
        tertiaryModelId: moonshot?.id ?? null,
        conditions: { languageGroups: ["cjk"] },
        updatedBy: "seed-extra",
      },
    });
    console.log("  ✓ Updated rule: CJK Language Pairs → Qwen primary, DeepSeek secondary");
  }

  // ── Add: Asian Languages (broader) ─────────────────────────────────────────
  const asianRuleExists = await prisma.llmRoutingRule.findFirst({ where: { name: "Asian Languages (Broad)" } });
  if (!asianRuleExists) {
    await prisma.llmRoutingRule.create({ data: {
      name: "Asian Languages (Broad)",
      description: "Southeast Asian, South Asian, and all other Asian target languages — Qwen and DeepSeek",
      priority: 26, enabled: true, isTemplate: false,
      conditions: { languageGroups: ["asian", "southeast-asian", "indic"] },
      primaryModelId: qwenModel.id,
      secondaryModelId: deepseekModel.id,
      tertiaryModelId: gpt4o?.id ?? null,
      policy: { terminologyMode: "flexible" },
      createdBy: "seed-extra",
    }});
    console.log("  ✓ Created rule: Asian Languages (Broad)");
  } else {
    console.log("  · Asian Languages rule already exists — skipping");
  }

  // ── Add: European Languages ─────────────────────────────────────────────────
  const euRuleExists = await prisma.llmRoutingRule.findFirst({ where: { name: "European Languages (EuroLLM)" } });
  if (!euRuleExists) {
    await prisma.llmRoutingRule.create({ data: {
      name: "European Languages (EuroLLM)",
      description: "All 24 EU official languages — EuroLLM-9B with Claude and GPT-4o fallback",
      priority: 40, enabled: true, isTemplate: false,
      conditions: { languageGroups: ["european"] },
      primaryModelId: eurollmModel.id,
      secondaryModelId: claude?.id ?? null,
      tertiaryModelId: gpt4o?.id ?? null,
      policy: { terminologyMode: "flexible" },
      createdBy: "seed-extra",
    }});
    console.log("  ✓ Created rule: European Languages (EuroLLM)");
  } else {
    console.log("  · European Languages rule already exists — skipping");
  }

  // ── Audit ────────────────────────────────────────────────────────────────────
  await prisma.llmAuditLog.create({ data: {
    actorEmail: "seed@contentech.io",
    action: "seed_applied",
    entityType: "system",
    entityName: "Extra providers seed (Qwen, DeepSeek, EuroLLM)",
    after: {
      addedProviders: ["Qwen (Alibaba Cloud)", "DeepSeek", "EuroLLM"],
      addedModels: ["Qwen2.5-72B-Instruct", "DeepSeek-V3", "EuroLLM-9B-Instruct"],
      addedRules: ["Asian Languages (Broad)", "European Languages (EuroLLM)"],
      updatedRules: ["CJK Languages"],
    },
    notes: "Extra providers added for Asian and European language specialization",
  }});

  console.log("  ✓ Extra AI config seed complete");
  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => { console.error("Extra AI config seed error:", e); process.exit(1); });
