import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { notifyAsync } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json();
  const { token, name, password } = body;

  if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

  const invitation = await prisma.linguistInvitation.findUnique({
    where: { token },
    include: { organization: true },
  });

  if (!invitation) return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });
  if (invitation.status !== "PENDING") {
    return NextResponse.json({ error: "Invitation already used" }, { status: 410 });
  }
  if (new Date() > invitation.expiresAt) {
    await prisma.linguistInvitation.update({ where: { token }, data: { status: "EXPIRED" } });
    return NextResponse.json({ error: "Invitation expired" }, { status: 410 });
  }

  let userId: string;

  if (session?.user) {
    userId = session.user.id!;
  } else {
    if (!name || !password) {
      return NextResponse.json({ error: "Name and password required to create an account" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: invitation.email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists. Please log in first." }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);
    const newUser = await prisma.user.create({
      data: {
        email: invitation.email,
        name,
        password: hashed,
        role: "LINGUIST",
        organizationId: invitation.organizationId,
      },
    });
    userId = newUser.id;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      role: "LINGUIST",
      organizationId: invitation.organizationId,
    },
  });

  const existingProfile = await prisma.linguistProfile.findUnique({ where: { userId } });
  let profileId: string;

  if (existingProfile) {
    await prisma.linguistProfile.update({
      where: { userId },
      data: { linguistType: "INTERNAL", isActive: true },
    });
    profileId = existingProfile.id;
  } else {
    const profile = await prisma.linguistProfile.create({
      data: {
        userId,
        linguistType: "INTERNAL",
        isActive: true,
        languagePairs: (invitation.languagePairs as any[]) ?? [],
      },
    });
    profileId = profile.id;
  }

  const pairs = (invitation.languagePairs as { sourceLang: string; targetLang: string }[]) ?? [];
  for (const pair of pairs) {
    const langPair = await prisma.languagePair.upsert({
      where: { sourceLang_targetLang: { sourceLang: pair.sourceLang, targetLang: pair.targetLang } },
      create: { sourceLang: pair.sourceLang, targetLang: pair.targetLang },
      update: {},
    });
    await prisma.linguistLanguagePair.upsert({
      where: { linguistProfileId_languagePairId: { linguistProfileId: profileId, languagePairId: langPair.id } },
      create: { linguistProfileId: profileId, languagePairId: langPair.id },
      update: {},
    });
  }

  await prisma.linguistInvitation.update({
    where: { token },
    data: {
      status: "ACCEPTED",
      acceptedAt: new Date(),
      acceptedByUserId: userId,
    },
  });

  // Notify the inviter that their invitation was accepted
  if (invitation.invitedById) {
    const inviter = await prisma.user.findUnique({ where: { id: invitation.invitedById } });
    if (inviter) {
      const acceptedUser = await prisma.user.findUnique({ where: { id: userId } });
      const appUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "https://contentech.io";
      notifyAsync({
        eventKey: "invitation.accepted",
        recipients: [{ userId: inviter.id, email: inviter.email }],
        vars: {
          inviter_name: inviter.name ?? "there",
          invitee_name: acceptedUser?.name ?? invitation.email,
          invitee_email: invitation.email,
          org_name: invitation.organization.name,
          linguists_url: `${appUrl}/dashboard/linguists`,
        },
      });
    }
  }

  return NextResponse.json({ success: true, userId });
}
