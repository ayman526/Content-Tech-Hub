import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const PkgSchema = z.object({
  name: z.string().min(1),
  credits: z.number().int().min(1),
  bonusCredits: z.number().int().min(0).default(0),
  priceUsd: z.number().min(0),
  isPopular: z.boolean().default(false),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pkgs = await prisma.creditPackage.findMany({ orderBy: { displayOrder: "asc" } });
  return NextResponse.json(pkgs);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = PkgSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { name, credits, bonusCredits, priceUsd, isPopular, isActive, displayOrder } = parsed.data;
  const pkg = await prisma.creditPackage.create({ data: { name, credits, bonusCredits, priceUsd, isPopular, isActive, displayOrder } });
  return NextResponse.json(pkg, { status: 201 });
}
