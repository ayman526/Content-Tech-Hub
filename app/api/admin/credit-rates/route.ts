import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rates = await prisma.creditRate.findMany({ orderBy: { workflowType: "asc" } });
  return NextResponse.json(rates);
}

const RateUpdateSchema = z.object({
  id: z.string(),
  creditsPerWord: z.number().min(0.0001),
  description: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = RateUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const rate = await prisma.creditRate.update({
    where: { id: parsed.data.id },
    data: { creditsPerWord: parsed.data.creditsPerWord, description: parsed.data.description },
  });
  return NextResponse.json(rate);
}
