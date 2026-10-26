import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const plans = await prisma.planConfig.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
    select: {
      id: true, name: true, slug: true, price: true, period: true,
      description: true, features: true, creditsPerCycle: true,
      isPopular: true, ctaText: true, ctaHref: true, displayOrder: true,
      nameAr: true, descriptionAr: true, featuresAr: true,
    },
  });
  return NextResponse.json(plans);
}
