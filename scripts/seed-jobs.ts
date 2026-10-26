/**
 * Seed demo projects + jobs for the linguist portal.
 * Safe to re-run — skips if demo jobs already exist.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 8000,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  // ── Resolve org and client user ─────────────────────────────────────────
  const org = await prisma.organization.findUnique({ where: { slug: "contentech-demo" } });
  if (!org) {
    console.error("  ✗ Contentech org not found — run main seed first.");
    process.exit(1);
  }

  const client = await prisma.user.findUnique({ where: { email: "testclient@test.com" } });
  if (!client) {
    console.error("  ✗ testclient@test.com not found — run main seed first.");
    process.exit(1);
  }

  // ── Skip if demo data already exists ────────────────────────────────────
  const existingCount = await prisma.job.count();
  if (existingCount > 0) {
    console.log(`  ✓ ${existingCount} jobs already exist — skipping demo seed.`);
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  const now = new Date();
  const days = (n: number) => new Date(now.getTime() + n * 86_400_000);

  // ── Projects ─────────────────────────────────────────────────────────────
  const projects = await Promise.all([
    prisma.project.create({
      data: {
        name: "Annual Report 2025 — Arabic Edition",
        organizationId: org.id,
        clientId: client.id,
        status: "IN_PROGRESS",
        workflowType: "HUMAN_ONLY",
        sourceLanguage: "en",
        targetLanguages: ["ar"],
        totalWordCount: 9600,
        dueDate: days(8),
        notes: "Legal/financial document. Formal MSA Arabic required. No colloquialisms.",
      },
    }),
    prisma.project.create({
      data: {
        name: "Mobile App UI — French & Spanish Localisation",
        organizationId: org.id,
        clientId: client.id,
        status: "IN_PROGRESS",
        workflowType: "AI_HUMAN",
        sourceLanguage: "en",
        targetLanguages: ["fr", "es"],
        totalWordCount: 4400,
        dueDate: days(5),
        notes: "Short UI strings. Keep placeholders like {{username}} intact.",
      },
    }),
    prisma.project.create({
      data: {
        name: "Clinical Trial Protocol — German",
        organizationId: org.id,
        clientId: client.id,
        status: "IN_PROGRESS",
        workflowType: "HUMAN_ONLY",
        sourceLanguage: "en",
        targetLanguages: ["de"],
        totalWordCount: 13000,
        dueDate: days(14),
        notes: "ICH E6 GCP compliance required. Medical/pharma specialist only.",
      },
    }),
    prisma.project.create({
      data: {
        name: "MENA Marketing Campaign — Ramadan 2026",
        organizationId: org.id,
        clientId: client.id,
        status: "IN_PROGRESS",
        workflowType: "AI_HUMAN",
        sourceLanguage: "en",
        targetLanguages: ["ar"],
        totalWordCount: 3600,
        dueDate: days(4),
        notes: "Culturally sensitive content. Brand voice: warm, aspirational. Gulf dialect preferred.",
      },
    }),
    prisma.project.create({
      data: {
        name: "Developer Docs — Japanese SDK Reference",
        organizationId: org.id,
        clientId: client.id,
        status: "IN_PROGRESS",
        workflowType: "AI_HUMAN",
        sourceLanguage: "en",
        targetLanguages: ["ja"],
        totalWordCount: 6400,
        dueDate: days(10),
        notes: "Technical software documentation. Code blocks must not be translated.",
      },
    }),
    prisma.project.create({
      data: {
        name: "E-Commerce Product Catalogue — Turkish",
        organizationId: org.id,
        clientId: client.id,
        status: "IN_PROGRESS",
        workflowType: "CREDITS",
        sourceLanguage: "en",
        targetLanguages: ["tr"],
        totalWordCount: 5200,
        dueDate: days(7),
        notes: "800 product descriptions, ~6–7 words each. Consistent terminology across all entries.",
      },
    }),
  ]);

  const [annualReport, mobileApp, clinicalTrial, marketing, devDocs, ecommerce] = projects;

  // ── Jobs ──────────────────────────────────────────────────────────────────
  const jobs = [
    // Annual Report — 2 jobs (split by chapter)
    {
      projectId: annualReport.id,
      status: "AVAILABLE",
      sourceLanguage: "English",
      targetLanguage: "Arabic",
      wordCount: 4800,
      payoutAmount: 240.0,
      dueDate: days(8),
    },
    {
      projectId: annualReport.id,
      status: "AVAILABLE",
      sourceLanguage: "English",
      targetLanguage: "Arabic",
      wordCount: 4800,
      payoutAmount: 240.0,
      dueDate: days(9),
    },
    // Mobile App — one per target language, French is exclusive
    {
      projectId: mobileApp.id,
      status: "EXCLUSIVE",
      exclusiveUntil: new Date(now.getTime() + 45 * 60_000), // 45 min window
      sourceLanguage: "English",
      targetLanguage: "French",
      wordCount: 2200,
      payoutAmount: 88.0,
      dueDate: days(5),
    },
    {
      projectId: mobileApp.id,
      status: "AVAILABLE",
      sourceLanguage: "English",
      targetLanguage: "Spanish",
      wordCount: 2200,
      payoutAmount: 88.0,
      dueDate: days(5),
    },
    // Clinical Trial — large single job
    {
      projectId: clinicalTrial.id,
      status: "AVAILABLE",
      sourceLanguage: "English",
      targetLanguage: "German",
      wordCount: 6500,
      payoutAmount: 455.0,
      dueDate: days(14),
    },
    // Marketing — translation + review pass
    {
      projectId: marketing.id,
      status: "AVAILABLE",
      sourceLanguage: "English",
      targetLanguage: "Arabic",
      wordCount: 1800,
      payoutAmount: 90.0,
      dueDate: days(4),
    },
    {
      projectId: marketing.id,
      status: "AVAILABLE",
      sourceLanguage: "English",
      targetLanguage: "Arabic",
      wordCount: 1800,
      payoutAmount: 45.0,
      dueDate: days(5),
    },
    // Developer Docs
    {
      projectId: devDocs.id,
      status: "AVAILABLE",
      sourceLanguage: "English",
      targetLanguage: "Japanese",
      wordCount: 3200,
      payoutAmount: 224.0,
      dueDate: days(10),
    },
    {
      projectId: devDocs.id,
      status: "AVAILABLE",
      sourceLanguage: "English",
      targetLanguage: "Japanese",
      wordCount: 3200,
      payoutAmount: 224.0,
      dueDate: days(11),
    },
    // E-Commerce
    {
      projectId: ecommerce.id,
      status: "AVAILABLE",
      sourceLanguage: "English",
      targetLanguage: "Turkish",
      wordCount: 2600,
      payoutAmount: 78.0,
      dueDate: days(7),
    },
    {
      projectId: ecommerce.id,
      status: "AVAILABLE",
      sourceLanguage: "English",
      targetLanguage: "Turkish",
      wordCount: 2600,
      payoutAmount: 78.0,
      dueDate: days(8),
    },
  ];

  let created = 0;
  for (const job of jobs) {
    await prisma.job.create({
      data: {
        projectId: job.projectId,
        status: job.status as any,
        exclusiveUntil: (job as any).exclusiveUntil ?? null,
        sourceLanguage: job.sourceLanguage,
        targetLanguage: job.targetLanguage,
        wordCount: job.wordCount,
        payoutAmount: job.payoutAmount,
      },
    });
    created++;
  }

  console.log(`  ✓ Created ${projects.length} demo projects`);
  console.log(`  ✓ Created ${created} demo jobs (1 exclusive, ${created - 1} available)`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error("Seed error:", e.message);
  process.exit(1);
});
