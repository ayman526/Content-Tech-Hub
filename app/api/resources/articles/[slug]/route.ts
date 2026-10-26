import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const article = await prisma.resourceArticle.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: {
      category: { select: { name: true, slug: true, color: true, icon: true } },
      author: { select: { name: true } },
    },
  });
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let related: any[] = [];
  if (article.relatedIds.length > 0) {
    related = await prisma.resourceArticle.findMany({
      where: { id: { in: article.relatedIds }, status: "PUBLISHED" },
      include: { category: { select: { name: true, slug: true } } },
      omit: { body: true },
    });
  }

  return NextResponse.json({ ...article, related });
}
