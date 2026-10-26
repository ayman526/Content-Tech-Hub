import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = (session.user as any).organizationId;
  if (!orgId) return NextResponse.json({ internal: [], preferred: [], pool: [] });

  const url = new URL(req.url);
  const search = url.searchParams.get("search")?.toLowerCase() ?? "";
  const typeFilter = url.searchParams.get("type") ?? "all";
  const sourceLang = url.searchParams.get("sourceLang") ?? "";
  const targetLang = url.searchParams.get("targetLang") ?? "";
  const statusFilter = url.searchParams.get("status") ?? "all";

  const [internalUsers, favorites, pool, pendingInvites] = await Promise.all([
    prisma.user.findMany({
      where: {
        organizationId: orgId,
        role: "LINGUIST",
        linguistProfile: { linguistType: "INTERNAL" },
      },
      include: {
        linguistProfile: {
          include: { languagePairsStructured: { include: { languagePair: true } } },
        },
      },
    }),
    prisma.favoriteLinguist.findMany({
      where: { organizationId: orgId },
      include: {
        linguist: {
          include: {
            linguistProfile: {
              include: { languagePairsStructured: { include: { languagePair: true } } },
            },
          },
        },
      },
    }),
    prisma.user.findMany({
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
    }),
    prisma.linguistInvitation.findMany({
      where: { organizationId: orgId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  function matchesLangFilter(pairs: { sourceLang: string; targetLang: string }[]) {
    if (!sourceLang && !targetLang) return true;
    return pairs.some(
      (p) =>
        (!sourceLang || p.sourceLang === sourceLang) &&
        (!targetLang || p.targetLang === targetLang)
    );
  }

  function formatLinguist(u: any, type: "INTERNAL" | "PREFERRED" | "SYSTEM") {
    const profile = u.linguistProfile;
    const pairs: { sourceLang: string; targetLang: string }[] =
      profile?.languagePairsStructured?.map((lp: any) => ({
        sourceLang: lp.languagePair.sourceLang,
        targetLang: lp.languagePair.targetLang,
      })) ?? [];
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      type,
      isActive: profile?.isActive ?? true,
      languagePairs: pairs,
      rating: profile ? Number(profile.rating) : 0,
      completedJobs: profile?.completedJobs ?? 0,
      specializations: profile?.specializations ?? [],
    };
  }

  const preferredIds = new Set(favorites.map((f: any) => f.linguistId));

  let internal = internalUsers.map((u: any) => formatLinguist(u, "INTERNAL"));
  let preferred = favorites.map((f: any) => formatLinguist(f.linguist, "PREFERRED"));
  let systemPool = pool
    .filter((u: any) => !preferredIds.has(u.id))
    .map((u: any) => formatLinguist(u, "SYSTEM"));

  function applyFilters(list: ReturnType<typeof formatLinguist>[]) {
    return list.filter((l) => {
      if (search && !l.name?.toLowerCase().includes(search) && !l.email.toLowerCase().includes(search)) return false;
      if (statusFilter === "active" && !l.isActive) return false;
      if (statusFilter === "inactive" && l.isActive) return false;
      if (!matchesLangFilter(l.languagePairs)) return false;
      return true;
    });
  }

  if (typeFilter === "internal") {
    internal = applyFilters(internal);
    preferred = [];
    systemPool = [];
  } else if (typeFilter === "preferred") {
    internal = [];
    preferred = applyFilters(preferred);
    systemPool = [];
  } else if (typeFilter === "pool") {
    internal = [];
    preferred = [];
    systemPool = applyFilters(systemPool);
  } else {
    internal = applyFilters(internal);
    preferred = applyFilters(preferred);
    systemPool = applyFilters(systemPool);
  }

  const invitations = pendingInvites.map((inv: any) => ({
    id: inv.id,
    email: inv.email,
    languagePairs: inv.languagePairs,
    createdAt: inv.createdAt.toISOString(),
    expiresAt: inv.expiresAt.toISOString(),
  }));

  return NextResponse.json({ internal, preferred, pool: systemPool, invitations });
}
