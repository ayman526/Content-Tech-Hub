import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const categories = await prisma.resourceCategory.findMany({
    where: { isVisible: true },
    orderBy: { sortOrder: "asc" },
    include: {
      _count: {
        select: {
          articles: { where: { status: "PUBLISHED" } },
          faqs: { where: { status: "PUBLISHED" } },
        },
      },
    },
  });
  return NextResponse.json(categories);
}
