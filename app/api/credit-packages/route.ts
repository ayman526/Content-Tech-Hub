import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [packages, rates] = await Promise.all([
    prisma.creditPackage.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.creditRate.findMany(),
  ]);
  return NextResponse.json({ packages, rates });
}
