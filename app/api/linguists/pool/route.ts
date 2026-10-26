import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const search = url.searchParams.get("search")?.toLowerCase() ?? "";
  const sourceLang = url.searchParams.get("sourceLang") ?? "";
  const targetLang = url.searchParams.get("targetLang") ?? "";

  const users = await prisma.user.findMany({
    where: {
      role: "LINGUIST",
      linguistProfile: { linguistType: "SYSTEM", isActive: true },
    },
    include: {
      linguistProfile: {
        include: { languagePairsStructured: { include: { languagePair: true } } },
      },
    },
    take: 100,
  });

  const results = users
    .map((u) => {
      const profile = u.linguistProfile;
      const pairs: { sourceLang: string; targetLang: string }[] =
        profile?.languagePairsStructured?.map((lp) => ({
          sourceLang: lp.languagePair.sourceLang,
          targetLang: lp.languagePair.targetLang,
        })) ?? [];
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        type: "SYSTEM" as const,
        isActive: profile?.isActive ?? true,
        languagePairs: pairs,
        rating: profile ? Number(profile.rating) : 0,
        reviewCount: profile?.reviewCount ?? 0,
        completedJobs: profile?.completedJobs ?? 0,
        specializations: profile?.specializations ?? [],
      };
    })
    .filter((l) => {
      if (search && !l.name?.toLowerCase().includes(search) && !l.email.toLowerCase().includes(search)) return false;
      if (sourceLang || targetLang) {
        const match = l.languagePairs.some(
          (p) =>
            (!sourceLang || p.sourceLang === sourceLang) &&
            (!targetLang || p.targetLang === targetLang)
        );
        if (!match) return false;
      }
      return true;
    });

  return NextResponse.json(results);
}
