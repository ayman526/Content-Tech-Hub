import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const audience = url.searchParams.get("audience");
  const featured = url.searchParams.get("featured");

  const where: any = { status: "PUBLISHED" };
  if (category) where.category = { slug: category };
  if (audience) where.audiences = { has: audience };
  if (featured === "true") where.featured = true;

  const faqs = await prisma.resourceFaqItem.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: {
      category: { select: { name: true, slug: true } },
    },
  });
  return NextResponse.json(faqs);
}
