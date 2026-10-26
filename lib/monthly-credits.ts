import { prisma } from "@/lib/prisma";

const MONTHLY_CREDITS: Record<string, number> = {
  STARTER: 100,
  PROFESSIONAL: 1000,
  ENTERPRISE: 5000,
  AGENCY: 5000,
};

/**
 * Check whether the organisation is due a monthly credit refresh and, if so,
 * top it up to the plan allowance and record a BONUS ledger entry.
 *
 * Uses creditsResetAt as the watermark. On first call the field is null, so
 * we treat the org as immediately due and set creditsResetAt to now + 30 days.
 *
 * Safe to call on every authenticated request — the DB read is lightweight and
 * the update only fires once per 30-day window.
 */
export async function maybeRefreshMonthlyCredits(orgId: string): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { plan: true, creditsResetAt: true, creditBalance: true },
  });
  if (!org) return;

  const now = new Date();
  const isDue = !org.creditsResetAt || org.creditsResetAt <= now;
  if (!isDue) return;

  const amount = MONTHLY_CREDITS[org.plan] ?? 100;
  const nextReset = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.organization.update({
      where: { id: orgId },
      data: {
        creditBalance: { increment: amount },
        creditsResetAt: nextReset,
      },
    }),
    prisma.creditTransaction.create({
      data: {
        organizationId: orgId,
        type: "BONUS",
        amount,
        description: `Monthly ${org.plan.charAt(0) + org.plan.slice(1).toLowerCase()} plan credit refresh (${amount} credits)`,
        breakdownJSON: { kind: "monthly_refresh", plan: org.plan, nextReset: nextReset.toISOString() },
      },
    }),
  ]);
}
