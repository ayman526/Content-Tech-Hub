import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const PlanSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  price: z.number().min(0),
  period: z.string().default("/mo"),
  description: z.string().optional(),
  features: z.array(z.string()),
  creditsPerCycle: z.number().int().min(0),
  isPopular: z.boolean().default(false),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
  ctaText: z.string().default("Get Started"),
  ctaHref: z.string().default("/register"),
  nameAr: z.string().optional(),
  descriptionAr: z.string().optional(),
  featuresAr: z.array(z.string()).optional(),
  limitsJson: z.record(z.unknown()).optional(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const plans = await prisma.planConfig.findMany({ orderBy: { displayOrder: "asc" } });
  return NextResponse.json(plans);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = PlanSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { name, slug, price, period, description, features, creditsPerCycle,
    isPopular, isActive, displayOrder, ctaText, ctaHref,
    nameAr, descriptionAr, featuresAr, limitsJson } = parsed.data;
  const plan = await prisma.planConfig.create({
    data: {
      name, slug, price, period, creditsPerCycle, isPopular, isActive, displayOrder, ctaText, ctaHref,
      features: features ?? [],
      featuresAr: featuresAr ?? [],
      description: description ?? null,
      nameAr: nameAr ?? null,
      descriptionAr: descriptionAr ?? null,
      limitsJson: limitsJson ? limitsJson as import("@prisma/client").Prisma.InputJsonObject : undefined,
    },
  });
  return NextResponse.json(plan, { status: 201 });
}
