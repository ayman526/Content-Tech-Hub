import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name")?.trim();
  if (!name || name.length < 2) {
    return NextResponse.json({ exists: false });
  }

  const org = await prisma.organization.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true, name: true, slug: true, _count: { select: { users: true } } },
  });

  if (!org) {
    return NextResponse.json({ exists: false });
  }

  return NextResponse.json({
    exists: true,
    org: { id: org.id, name: org.name, memberCount: org._count.users },
  });
}
