import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeShort, sanitizeBio } from "@/lib/sanitize";

async function getOrgId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user) return null;
  return session.user.organizationId ?? null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { name, notes, websiteUrl, industry, companyBio } = await req.json();

  const existing = await prisma.clientAccount.findFirst({ where: { id, organizationId: orgId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, string | null> = {};
  if (name?.trim()) data.name = sanitizeShort(name, 200) ?? name.trim();
  if (notes !== undefined) data.notes = sanitizeShort(notes, 500);
  if (websiteUrl !== undefined) data.websiteUrl = sanitizeShort(websiteUrl, 300);
  if (industry !== undefined) data.industry = sanitizeShort(industry, 120);
  if (companyBio !== undefined) data.companyBio = sanitizeBio(companyBio);

  const updated = await prisma.clientAccount.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.clientAccount.findFirst({ where: { id, organizationId: orgId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.clientAccount.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
