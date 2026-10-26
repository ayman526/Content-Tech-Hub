import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const audience = url.searchParams.get("audience");
  const contentType = url.searchParams.get("type");
  const featured = url.searchParams.get("featured");
  const q = url.searchParams.get("q");
  const limit = parseInt(url.searchParams.get("limit") ?? "50");

  const where: any = { status: "PUBLISHED" };
  if (category) where.category = { slug: category };
  if (audience) where.audiences = { has: audience };
  if (contentType) where.contentType = contentType;
  if (featured === "true") where.featured = true;
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { excerpt: { contains: q, mode: "insensitive" } },
      { tags: { has: q } },
    ];
  }

  const articles = await prisma.resourceArticle.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: limit,
    include: {
      category: { select: { name: true, slug: true, color: true, icon: true } },
      author: { select: { name: true } },
    },
    omit: { body: true },
  });
  return NextResponse.json(articles);
}
