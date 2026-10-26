import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN")
    return null;
  return session;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const categories = await prisma.resourceCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { articles: true, faqs: true } },
    },
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { name, slug, description, icon, color, sortOrder, isVisible } = body;
  if (!name || !slug) return NextResponse.json({ error: "name and slug required" }, { status: 400 });
  try {
    const cat = await prisma.resourceCategory.create({
      data: { name, slug, description, icon, color, sortOrder: sortOrder ?? 0, isVisible: isVisible ?? true },
    });
    return NextResponse.json(cat);
  } catch {
    return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
  }
}
