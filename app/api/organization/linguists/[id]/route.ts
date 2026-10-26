import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = (session.user as any).organizationId;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { id } = await params;
  const body = await req.json();

  const targetUser = await prisma.user.findFirst({
    where: { id, organizationId: orgId, role: "LINGUIST" },
    include: { linguistProfile: true },
  });

  if (!targetUser || !targetUser.linguistProfile) {
    return NextResponse.json({ error: "Linguist not found" }, { status: 404 });
  }

  const profile = targetUser.linguistProfile;

  if (body.isActive !== undefined) {
    await prisma.linguistProfile.update({
      where: { id: profile.id },
      data: { isActive: body.isActive },
    });
  }

  if (Array.isArray(body.languagePairs)) {
    await prisma.linguistLanguagePair.deleteMany({
      where: { linguistProfileId: profile.id },
    });

    for (const pair of body.languagePairs as { sourceLang: string; targetLang: string }[]) {
      const langPair = await prisma.languagePair.upsert({
        where: { sourceLang_targetLang: { sourceLang: pair.sourceLang, targetLang: pair.targetLang } },
        create: { sourceLang: pair.sourceLang, targetLang: pair.targetLang },
        update: {},
      });
      await prisma.linguistLanguagePair.upsert({
        where: { linguistProfileId_languagePairId: { linguistProfileId: profile.id, languagePairId: langPair.id } },
        create: { linguistProfileId: profile.id, languagePairId: langPair.id },
        update: {},
      });
    }
  }

  return NextResponse.json({ success: true });
}
