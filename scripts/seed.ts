import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 8000,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  // ── Seed demo organization ────────────────────────────────────────────────
  const DEMO_CREDIT_BALANCE = 100_000;
  let org = await prisma.organization.findUnique({ where: { slug: "contentech-demo" } });
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "Contentech",
        slug: "contentech-demo",
        plan: "PROFESSIONAL",
        creditBalance: DEMO_CREDIT_BALANCE,
      },
    });
    console.log("  ✓ Created organization: Contentech");
  } else {
    // Always top-up the demo org to ensure testclient@test.com can run OCR
    // requests and translation jobs without running into credit walls.
    org = await prisma.organization.update({
      where: { id: org.id },
      data: { creditBalance: DEMO_CREDIT_BALANCE },
    });
    console.log(`  ✓ Organization Contentech exists — balance set to ${DEMO_CREDIT_BALANCE}`);
  }

  // ── Seed users ────────────────────────────────────────────────────────────
  const users = [
    {
      email: "Ayman@f-g.com",
      name: "Ayman",
      password: "Torjoman11",
      role: "ADMIN" as const,
      organizationId: null,
    },
    {
      email: "testlinguist@test.com",
      name: "Test Linguist",
      password: "Test1234!",
      role: "LINGUIST" as const,
      organizationId: null,
    },
    {
      email: "testclient@test.com",
      name: "Test Client",
      password: "Test1234!",
      role: "CLIENT" as const,
      organizationId: org.id,
    },
  ];

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      // Ensure client is linked to the org
      if (u.organizationId && !existing.organizationId) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { organizationId: u.organizationId },
        });
        console.log(`  ✓ ${u.email} linked to organization`);
      } else {
        console.log(`  ✓ ${u.email} already exists`);
      }
      continue;
    }

    const hashedPassword = await bcrypt.hash(u.password, 12);
    const created = await prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        password: hashedPassword,
        role: u.role,
        organizationId: u.organizationId,
      },
    });
    console.log(`  ✓ Created ${u.role}: ${u.email}`);

    if (u.role === "LINGUIST") {
      await prisma.linguistProfile.create({
        data: {
          userId: created.id,
          languagePairs: [{ source: "en", target: "ar" }],
          specializations: ["Legal", "Medical"],
          isVerified: true,
          rating: 4.8,
          reviewCount: 12,
          completedJobs: 20,
          acceptanceRate: 95,
        },
      });
      console.log(`    ✓ Created linguist profile`);
    }
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error("Seed error:", e.message);
  process.exit(1);
});
