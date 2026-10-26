import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  if ((session.user as any).role !== "ADMIN") return null;
  return session;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { ratePerWord, businessCutPct, label, description } = body;

  if (ratePerWord !== undefined && (isNaN(Number(ratePerWord)) || Number(ratePerWord) < 0)) {
    return NextResponse.json({ error: "Invalid ratePerWord" }, { status: 400 });
  }
  if (businessCutPct !== undefined && (isNaN(Number(businessCutPct)) || Number(businessCutPct) < 0 || Number(businessCutPct) > 100)) {
    return NextResponse.json({ error: "businessCutPct must be 0–100" }, { status: 400 });
  }

  const updated = await prisma.linguistRate.update({
    where: { id },
    data: {
      ...(ratePerWord !== undefined && { ratePerWord: Number(ratePerWord) }),
      ...(businessCutPct !== undefined && { businessCutPct: Number(businessCutPct) }),
      ...(label !== undefined && { label: String(label) }),
      ...(description !== undefined && { description: String(description) }),
    },
  });

  return NextResponse.json(updated);
}
