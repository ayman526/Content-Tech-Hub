import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLATFORM_FEATURES, PLAN_SLUGS, type PlanSlug } from "@/lib/plan-features";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") return null;
  return session;
}

/**
 * GET /api/admin/plan-features
 * Returns the full feature × plan matrix, merging DB rows with hardcoded defaults.
 * Response shape: { features: [{ key, label, description, plans: { starter: bool, ... } }] }
 */
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.planFeature.findMany();
  const rowMap = new Map<string, boolean>();
  for (const r of rows) rowMap.set(`${r.feature}::${r.planSlug}`, r.enabled);

  const features = PLATFORM_FEATURES.map((feat) => {
    const plans: Record<PlanSlug, boolean> = {} as Record<PlanSlug, boolean>;
    for (const slug of PLAN_SLUGS) {
      const key = `${feat.key}::${slug}`;
      plans[slug] = rowMap.has(key) ? rowMap.get(key)! : feat.defaults[slug];
    }
    return { key: feat.key, label: feat.label, description: feat.description, plans };
  });

  return NextResponse.json({ features });
}

/**
 * PATCH /api/admin/plan-features
 * Body: { feature: string, planSlug: string, enabled: boolean }
 * Upserts a single feature flag for the given plan.
 */
export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { feature, planSlug, enabled } = body as {
    feature: string;
    planSlug: string;
    enabled: boolean;
  };

  if (!feature || !planSlug || typeof enabled !== "boolean") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!(PLAN_SLUGS as readonly string[]).includes(planSlug)) {
    return NextResponse.json({ error: "Unknown plan slug" }, { status: 400 });
  }

  if (!PLATFORM_FEATURES.find((f) => f.key === feature)) {
    return NextResponse.json({ error: "Unknown feature" }, { status: 400 });
  }

  const row = await prisma.planFeature.upsert({
    where: { feature_planSlug: { feature, planSlug } },
    update: { enabled },
    create: { feature, planSlug, enabled },
  });

  return NextResponse.json(row);
}
