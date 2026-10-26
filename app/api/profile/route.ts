import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const profile = await prisma.linguistProfile.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json(profile ?? {});
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { bio, languagePairs, specializations, hourlyRate, certifications, cvUrl } = body;

  const profile = await prisma.linguistProfile.upsert({
    where: { userId: session.user.id },
    update: {
      bio: bio ?? undefined,
      languagePairs: languagePairs ?? undefined,
      specializations: specializations ?? undefined,
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
      certifications: certifications ?? undefined,
      cvUrl: cvUrl ?? undefined,
      updatedAt: new Date(),
    },
    create: {
      userId: session.user.id,
      bio: bio ?? "",
      languagePairs: languagePairs ?? [],
      specializations: specializations ?? [],
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
      certifications: certifications ?? [],
      cvUrl: cvUrl ?? null,
    },
  });

  return NextResponse.json(profile);
}
