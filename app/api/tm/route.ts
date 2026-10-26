import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

async function getSession() {
  return auth();
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.organizationId ?? null;
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const { searchParams } = new URL(req.url);
  const clientAccountId = searchParams.get("clientAccountId");

  let where: Prisma.TranslationMemoryWhereInput = { organizationId: orgId };

  if (clientAccountId === "shared") {
    where = { ...where, clientAccountId: null };
  } else if (clientAccountId) {
    where = { ...where, OR: [{ clientAccountId }, { clientAccountId: null }] };
  }

  const memberAccess = await prisma.memberClientAccountAccess.findMany({
    where: { userId, organizationId: orgId },
    select: { clientAccountId: true },
  });

  if (memberAccess.length > 0) {
    const allowedIds = memberAccess.map((a) => a.clientAccountId);
    const memberFilter: Prisma.TranslationMemoryWhereInput = {
      OR: [{ clientAccountId: { in: allowedIds } }, { clientAccountId: null }],
    };
    where = { ...where, AND: [memberFilter] };
  }

  const memories = await prisma.translationMemory.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { entries: true } },
      clientAccount: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(
    memories.map((m) => ({
      ...m,
      entryCount: m._count.entries,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.organizationId ?? null;
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, sourceLanguage, targetLanguage, clientAccountId } = await req.json();
  if (!name || !sourceLanguage || !targetLanguage)
    return NextResponse.json({ error: "name, sourceLanguage, targetLanguage required" }, { status: 400 });

  if (clientAccountId) {
    const acct = await prisma.clientAccount.findFirst({ where: { id: clientAccountId, organizationId: orgId } });
    if (!acct) return NextResponse.json({ error: "Invalid client account" }, { status: 400 });
  }

  const tm = await prisma.translationMemory.create({
    data: {
      organizationId: orgId,
      name,
      sourceLanguage,
      targetLanguage,
      entryCount: 0,
      ...(clientAccountId ? { clientAccountId } : {}),
    },
    include: { clientAccount: { select: { id: true, name: true } } },
  });

  return NextResponse.json(tm, { status: 201 });
}
