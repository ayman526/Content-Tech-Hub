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
  const categoryId = url.searchParams.get("categoryId");
  const status = url.searchParams.get("status");
  const where: any = {};
  if (categoryId) where.categoryId = categoryId;
  if (status) where.status = status;
  const faqs = await prisma.resourceFaqItem.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: { category: { select: { name: true, slug: true } } },
  });
  return NextResponse.json(faqs);
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { question, answer, categoryId, audiences, sortOrder, featured, status } = body;
  if (!question || !answer) return NextResponse.json({ error: "question and answer required" }, { status: 400 });
  const faq = await prisma.resourceFaqItem.create({
    data: {
      question,
      answer,
      categoryId: categoryId ?? null,
      audiences: audiences ?? [],
      sortOrder: sortOrder ?? 0,
      featured: featured ?? false,
      status: status ?? "PUBLISHED",
    },
  });
  return NextResponse.json(faq);
}
