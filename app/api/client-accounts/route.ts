import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeShort, sanitizeBio } from "@/lib/sanitize";

async function getOrgId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user) return null;
  return session.user.organizationId ?? null;
}

export async function GET() {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await prisma.clientAccount.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          projects: true,
          translationMemories: true,
          glossaries: true,
          styleGuides: true,
        },
      },
    },
  });

  return NextResponse.json(
    accounts.map((a) => ({
      id: a.id,
      name: a.name,
      notes: a.notes,
      websiteUrl: a.websiteUrl,
      industry: a.industry,
      companyBio: a.companyBio,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      projectCount: a._count.projects,
      tmCount: a._count.translationMemories,
      glossaryCount: a._count.glossaries,
      styleGuideCount: a._count.styleGuides,
    }))
  );
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, notes, websiteUrl, industry, companyBio } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

  const account = await prisma.clientAccount.create({
    data: {
      organizationId: orgId,
      name: sanitizeShort(name, 200) ?? name.trim(),
      notes: sanitizeShort(notes, 500),
      websiteUrl: sanitizeShort(websiteUrl, 300),
      industry: sanitizeShort(industry, 120),
      companyBio: sanitizeBio(companyBio),
    },
  });

  return NextResponse.json(account, { status: 201 });
}
