import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrgFeatureFlags } from "@/lib/plan-features";
import { maybeRefreshMonthlyCredits } from "@/lib/monthly-credits";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          plan: true,
          creditBalance: true,
          websiteUrl: true,
          industry: true,
          companyBio: true,
        },
      },
    },
  });

  const org = user?.organization ?? null;
  if (!org) return NextResponse.json(null);

  // Trigger monthly credit refresh (no-op if not yet due)
  await maybeRefreshMonthlyCredits(org.id).catch(() => {});

  // Re-fetch balance in case a refresh just ran
  const fresh = await prisma.organization.findUnique({
    where: { id: org.id },
    select: { creditBalance: true },
  });

  const featureFlags = await getOrgFeatureFlags(org.plan);
  return NextResponse.json({ ...org, creditBalance: fresh?.creditBalance ?? org.creditBalance, featureFlags });
}

/**
 * Update business-context fields (websiteUrl, industry, companyBio) on the
 * caller's organization. These fields are passed into the AI translation
 * prompt to ground drafts in the customer's domain and brand voice.
 *
 * Restricted to org admins/owners — regular members cannot change these.
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { organizationId: true, role: true },
  });
  if (!user?.organizationId)
    return NextResponse.json({ error: "No organization" }, { status: 400 });

  // Role enum in this codebase is { CLIENT, LINGUIST, ADMIN }.
  // CLIENT users own/manage their organization; ADMIN is the platform admin.
  // Linguists may belong to an org but should not edit org-wide business context.
  const allowedRoles = new Set(["CLIENT", "ADMIN"]);
  if (!allowedRoles.has(user.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { websiteUrl, industry, companyBio } = body as {
    websiteUrl?: string | null;
    industry?: string | null;
    companyBio?: string | null;
  };

  // Strip control chars (newlines/tabs etc. would inflate the prompt or be used for
  // prompt-injection tricks) and apply hard length caps that bound prompt size.
  const clean = (v: string | null | undefined, max: number): string | null => {
    if (v === undefined) return undefined as unknown as null;
    if (v === null) return null;
    const stripped = String(v).replace(/[\u0000-\u001F\u007F]/g, " ").trim();
    if (!stripped) return null;
    return stripped.length > max ? stripped.slice(0, max) : stripped;
  };

  const data: Record<string, string | null> = {};
  if (websiteUrl !== undefined) data.websiteUrl = clean(websiteUrl, 300);
  if (industry !== undefined) data.industry = clean(industry, 120);
  if (companyBio !== undefined) {
    const bio = companyBio === null ? null : String(companyBio).replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, " ").trim();
    data.companyBio = !bio ? null : bio.length > 1500 ? bio.slice(0, 1500) : bio;
  }

  const updated = await prisma.organization.update({
    where: { id: user.organizationId },
    data,
    select: {
      id: true,
      name: true,
      websiteUrl: true,
      industry: true,
      companyBio: true,
    },
  });

  return NextResponse.json(updated);
}
