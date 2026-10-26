import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const PlanUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  price: z.union([z.number(), z.string().transform(Number)]).pipe(z.number().min(0)).optional(),
  period: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  features: z.array(z.string()).optional(),
  creditsPerCycle: z.union([z.number(), z.string().transform(Number)]).pipe(z.number().int().min(0)).optional(),
  isPopular: z.boolean().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.union([z.number(), z.string().transform(Number)]).pipe(z.number().int()).optional(),
  ctaText: z.string().optional().nullable(),
  ctaHref: z.string().optional().nullable(),
  nameAr: z.string().optional().nullable(),
  descriptionAr: z.string().optional().nullable(),
  featuresAr: z.array(z.string()).optional(),
  limitsJson: z.record(z.unknown()).optional().nullable(),
  stripePriceId: z.string().optional().nullable(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") return null;
  return session;
}

async function createStripePrice(_planName: string, _newPriceUsd: number): Promise<string | null> {
  return null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const parsed = PlanUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const before = await prisma.planConfig.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let updateData: any = { ...parsed.data };

  if (parsed.data.price !== undefined && Number(parsed.data.price) !== Number(before.price) && Number(parsed.data.price) > 0) {
    const newStripePriceId = await createStripePrice(before.name, parsed.data.price);
    if (newStripePriceId) updateData.stripePriceId = newStripePriceId;
  }

  const plan = await prisma.planConfig.update({ where: { id }, data: updateData });

  await prisma.changeLog.create({
    data: {
      adminId: (session.user as any).id ?? "unknown",
      adminEmail: session.user?.email ?? undefined,
      entityType: "PLAN",
      entityKey: before.slug,
      before: before as any,
      after: plan as any,
    },
  }).catch(() => {});

  return NextResponse.json(plan);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const before = await prisma.planConfig.findUnique({ where: { id } }).catch(() => null);
  await prisma.planConfig.delete({ where: { id } });
  await prisma.changeLog.create({
    data: {
      adminId: (session.user as any).id ?? "unknown",
      adminEmail: session.user?.email ?? undefined,
      entityType: "PLAN",
      entityKey: before?.slug,
      before: before as any,
      after: null,
    },
  }).catch(() => {});
  return NextResponse.json({ ok: true });
}
