import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") return null;
  return session;
}

export async function GET(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  const status = url.searchParams.get("status");
  const categoryId = url.searchParams.get("categoryId");

  const where: any = {};
  if (status) where.status = status;
  if (categoryId) where.categoryId = categoryId;
  if (q) where.OR = [
    { title: { contains: q, mode: "insensitive" } },
    { excerpt: { contains: q, mode: "insensitive" } },
  ];

  const articles = await prisma.resourceArticle.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    include: {
      category: { select: { name: true, slug: true } },
      author: { select: { name: true } },
    },
    omit: { body: true },
  });
  return NextResponse.json(articles);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { title, subtitle, slug, excerpt, body: bodyText, contentType, audiences, categoryId, tags, icon, featured, seoTitle, metaDescription, status, sortOrder, relatedIds } = body;
  if (!title || !slug) return NextResponse.json({ error: "title and slug required" }, { status: 400 });
  try {
    const article = await prisma.resourceArticle.create({
      data: {
        title,
        subtitle: subtitle ?? null,
        slug,
        excerpt: excerpt ?? null,
        body: bodyText ?? "",
        contentType: contentType ?? "GUIDE",
        audiences: audiences ?? [],
        categoryId: categoryId ?? null,
        tags: tags ?? [],
        icon: icon ?? null,
        featured: featured ?? false,
        seoTitle: seoTitle ?? null,
        metaDescription: metaDescription ?? null,
        status: status ?? "DRAFT",
        sortOrder: sortOrder ?? 0,
        authorId: (session.user as any).id ?? null,
        relatedIds: relatedIds ?? [],
      },
    });
    return NextResponse.json(article);
  } catch {
    return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
  }
}
