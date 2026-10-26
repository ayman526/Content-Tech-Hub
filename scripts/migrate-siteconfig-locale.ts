import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 8000 });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const records = await prisma.siteConfig.findMany();
  let migrated = 0;

  for (const record of records) {
    const val = record.value as any;
    if (val && typeof val === "object" && !Array.isArray(val) && ("en" in val || "ar" in val)) {
      continue;
    }
    await prisma.siteConfig.update({
      where: { key: record.key },
      data: { value: { en: val, ar: null } },
    });
    migrated++;
  }

  if (migrated > 0) {
    console.log(`  ✓ Migrated ${migrated} SiteConfig record(s) to bilingual format`);
  } else {
    console.log("  ✓ SiteConfig already in bilingual format — skipping");
  }

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
