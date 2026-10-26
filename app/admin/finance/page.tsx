import { prisma } from "@/lib/prisma";
import {
  CreditCard, DollarSign, TrendingUp, Briefcase, Building2, Zap,
  BarChart3, BadgeDollarSign, Banknote, HandCoins, Receipt,
} from "lucide-react";
import TopUpButton from "./TopUpButton";

export const dynamic = "force-dynamic";

const planColors: Record<string, string> = {
  STARTER: "bg-gray-100 text-gray-600",
  PROFESSIONAL: "bg-[#E8F5F8] text-[#0091AE]",
  ENTERPRISE: "bg-amber-100 text-amber-700",
};

const PRICE_PER_1000_CREDITS = 49;

function creditsToUsd(credits: number): number {
  return (credits / 1000) * PRICE_PER_1000_CREDITS;
}

export default async function AdminFinancePage() {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    orgs,
    completedJobs,
    payoutAgg,
    businessShareAgg,
    creditPurchases,
    recentJobs,
    creditRates,
    linguistRates,
    plans,
  ] = await Promise.all([
    prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { projects: true } } },
    }),
    prisma.job.count({ where: { status: "COMPLETED" } }),
    prisma.job.aggregate({
      where: { status: "COMPLETED", payoutAmount: { not: null } },
      _sum: { payoutAmount: true },
    }),
    prisma.job.aggregate({
      where: { status: "COMPLETED", businessShare: { not: null } },
      _sum: { businessShare: true },
    }),
    prisma.creditTransaction.aggregate({
      where: { type: "PURCHASE" },
      _sum: { amount: true },
    }),
    prisma.job.findMany({
      where: { status: "COMPLETED", breakdownJSON: { not: null } },
      select: { breakdownJSON: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.creditRate.findMany(),
    prisma.linguistRate.findMany({ orderBy: { workflowType: "asc" } }),
    prisma.planConfig.findMany({ where: { isActive: true } }),
  ]);

  // ── Revenue stream 1: Subscriptions ───────────────────────────────
  const planPriceMap: Record<string, number> = {};
  for (const p of plans) {
    planPriceMap[p.slug.toUpperCase()] = Number(p.price);
  }
  // Count orgs per plan, multiply by plan price for MRR estimate
  const planCountMap: Record<string, number> = {};
  for (const org of orgs) {
    planCountMap[org.plan] = (planCountMap[org.plan] ?? 0) + 1;
  }
  let subscriptionMRR = 0;
  for (const [plan, count] of Object.entries(planCountMap)) {
    const price = planPriceMap[plan] ?? 0;
    subscriptionMRR += price * count;
  }

  // ── Revenue stream 2: Extra credits (purchases) ────────────────────
  const totalCreditsPurchased = Number(creditPurchases._sum.amount ?? 0);
  const creditRevenue = creditsToUsd(totalCreditsPurchased);

  // ── Revenue stream 3: Linguist revenue share ───────────────────────
  const revenueShare = Number(businessShareAgg._sum.businessShare ?? 0);

  // ── Totals ─────────────────────────────────────────────────────────
  const totalPayout = Number(payoutAgg._sum.payoutAmount ?? 0);
  const totalCredits = orgs.reduce((acc: number, o: any) => acc + o.creditBalance, 0);
  const totalRevenue = subscriptionMRR + creditRevenue + revenueShare;

  // ── Credit consumption breakdown ──────────────────────────────────
  let aiCreditsUsed = 0;
  let humanRevisionCreditsUsed = 0;
  let humanTranslationCreditsUsed = 0;

  for (const job of recentJobs) {
    const b = job.breakdownJSON as any;
    if (!b) continue;
    if (typeof b.creditsCharged === "number") {
      const workflow = b.workflow ?? b.workflowType ?? "";
      if (workflow === "ai" || workflow === "AI_TRANSLATION") aiCreditsUsed += b.creditsCharged;
      else if (workflow === "revision" || workflow === "HUMAN_REVISION") humanRevisionCreditsUsed += b.creditsCharged;
      else if (workflow === "human" || workflow === "HUMAN_TRANSLATION") humanTranslationCreditsUsed += b.creditsCharged;
    }
  }
  const totalUsed = aiCreditsUsed + humanRevisionCreditsUsed + humanTranslationCreditsUsed;

  // ── Per-org usage this month ───────────────────────────────────────
  const orgTransactionsThisMonth = await prisma.creditTransaction.findMany({
    where: { createdAt: { gte: firstOfMonth }, type: "USAGE" },
    select: { organizationId: true, amount: true },
  });
  const orgUsageMap: Record<string, number> = {};
  for (const tx of orgTransactionsThisMonth) {
    if (!tx.organizationId) continue;
    orgUsageMap[tx.organizationId] = (orgUsageMap[tx.organizationId] ?? 0) + Math.abs(tx.amount);
  }

  const fmt = (n: number) =>
    `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: "#33475B" }}>Finance</h1>
        <p className="text-sm mt-0.5" style={{ color: "#516F90" }}>Platform revenue streams, credits, and linguist payout overview</p>
      </div>

      {/* ── Top-line KPIs ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Orgs", value: orgs.length, icon: Building2, color: "#33475B", bg: "#EEF1F5", format: (v: number) => v.toString() },
          { label: "Platform Credits (live)", value: totalCredits, icon: CreditCard, color: "#0091AE", bg: "#E8F5F8", format: (v: number) => v.toLocaleString() },
          { label: "Completed Jobs", value: completedJobs, icon: Briefcase, color: "#FF7A59", bg: "#FFF1EC", format: (v: number) => v.toString() },
          { label: "Total Revenue (all-time)", value: totalRevenue, icon: DollarSign, color: "#00BDA5", bg: "#E6F7F5", format: fmt },
        ].map(({ label, value, icon: Icon, color, bg, format }) => (
          <div key={label} className="bg-white rounded-2xl border border-[#CBD6E2] p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg, color }}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: "#33475B" }}>{format(value)}</div>
              <div className="text-xs" style={{ color: "#99ACC2" }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Revenue Streams ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#CBD6E2] p-6 mb-6">
        <h2 className="text-sm font-semibold mb-5 flex items-center gap-2" style={{ color: "#33475B" }}>
          <TrendingUp className="w-4 h-4" style={{ color: "#00BDA5" }} />
          Revenue Streams
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Stream 1: Subscriptions */}
          <div className="rounded-xl border border-[#CBD6E2] p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#E8F5F8" }}>
                <Receipt className="w-4 h-4" style={{ color: "#0091AE" }} />
              </div>
              <div>
                <div className="text-xs font-semibold" style={{ color: "#33475B" }}>Subscriptions</div>
                <div className="text-[10px]" style={{ color: "#99ACC2" }}>Monthly recurring</div>
              </div>
            </div>
            <div className="text-3xl font-bold mb-1" style={{ color: "#33475B" }}>{fmt(subscriptionMRR)}</div>
            <div className="text-xs mb-3" style={{ color: "#99ACC2" }}>Estimated MRR</div>
            <div className="space-y-1.5">
              {Object.entries(planCountMap).map(([plan, count]) => {
                const price = planPriceMap[plan] ?? 0;
                return (
                  <div key={plan} className="flex justify-between text-xs">
                    <span style={{ color: "#516F90" }}>{plan} ({count} org{count > 1 ? "s" : ""})</span>
                    <span className="font-semibold" style={{ color: "#33475B" }}>
                      {price === 0 ? "Free" : fmt(price * count)}
                    </span>
                  </div>
                );
              })}
              {Object.keys(planCountMap).length === 0 && (
                <div className="text-xs" style={{ color: "#99ACC2" }}>No active subscribers</div>
              )}
            </div>
          </div>

          {/* Stream 2: Extra Credits */}
          <div className="rounded-xl border border-[#CBD6E2] p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#FFF1EC" }}>
                <Zap className="w-4 h-4" style={{ color: "#FF7A59" }} />
              </div>
              <div>
                <div className="text-xs font-semibold" style={{ color: "#33475B" }}>Credit Packages</div>
                <div className="text-[10px]" style={{ color: "#99ACC2" }}>One-time purchases</div>
              </div>
            </div>
            <div className="text-3xl font-bold mb-1" style={{ color: "#33475B" }}>{fmt(creditRevenue)}</div>
            <div className="text-xs mb-3" style={{ color: "#99ACC2" }}>All-time</div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span style={{ color: "#516F90" }}>Credits purchased</span>
                <span className="font-semibold" style={{ color: "#33475B" }}>{totalCreditsPurchased.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: "#516F90" }}>Rate</span>
                <span className="font-semibold" style={{ color: "#33475B" }}>$49 / 1,000 credits</span>
              </div>
            </div>
          </div>

          {/* Stream 3: Revenue Share */}
          <div className="rounded-xl border border-[#CBD6E2] p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#E6F7F5" }}>
                <HandCoins className="w-4 h-4" style={{ color: "#00BDA5" }} />
              </div>
              <div>
                <div className="text-xs font-semibold" style={{ color: "#33475B" }}>Linguist Revenue Share</div>
                <div className="text-[10px]" style={{ color: "#99ACC2" }}>Platform cut from payouts</div>
              </div>
            </div>
            <div className="text-3xl font-bold mb-1" style={{ color: "#33475B" }}>{fmt(revenueShare)}</div>
            <div className="text-xs mb-3" style={{ color: "#99ACC2" }}>All-time (completed jobs)</div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span style={{ color: "#516F90" }}>Total linguist payouts</span>
                <span className="font-semibold" style={{ color: "#33475B" }}>{fmt(totalPayout)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: "#516F90" }}>Completed jobs</span>
                <span className="font-semibold" style={{ color: "#33475B" }}>{completedJobs}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: "#516F90" }}>Rates config</span>
                <a href="/admin/linguist-rates" className="font-semibold underline" style={{ color: "#0091AE" }}>
                  Manage rates
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Total bar */}
        <div className="mt-5 rounded-xl border border-[#CBD6E2] bg-[#F5F8FA] px-5 py-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold" style={{ color: "#33475B" }}>Revenue mix</span>
            <span className="text-xs font-bold" style={{ color: "#33475B" }}>Total: {fmt(totalRevenue)}</span>
          </div>
          {totalRevenue > 0 ? (
            <div className="h-3 bg-[#CBD6E2] rounded-full overflow-hidden flex">
              {[
                { val: subscriptionMRR, color: "#0091AE" },
                { val: creditRevenue, color: "#FF7A59" },
                { val: revenueShare, color: "#00BDA5" },
              ].map(({ val, color }, i) => {
                const pct = (val / totalRevenue) * 100;
                return pct > 0 ? (
                  <div key={i} className="h-full transition-all" style={{ width: `${pct}%`, background: color }} />
                ) : null;
              })}
            </div>
          ) : (
            <div className="h-3 bg-[#CBD6E2] rounded-full" />
          )}
          <div className="flex gap-5 mt-2">
            {[
              { label: "Subscriptions", color: "#0091AE", val: subscriptionMRR },
              { label: "Credit Packages", color: "#FF7A59", val: creditRevenue },
              { label: "Revenue Share", color: "#00BDA5", val: revenueShare },
            ].map(({ label, color, val }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs" style={{ color: "#516F90" }}>
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                {label}: <span className="font-semibold" style={{ color: "#33475B" }}>{fmt(val)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Linguist Rate Reference ───────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl border border-[#CBD6E2] p-6">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "#33475B" }}>
            <Banknote className="w-4 h-4" style={{ color: "#FF7A59" }} />
            Linguist Rates (Current)
          </h2>
          {linguistRates.length === 0 ? (
            <p className="text-sm" style={{ color: "#99ACC2" }}>No rates configured.</p>
          ) : (
            <div className="space-y-3">
              {linguistRates.map((r) => {
                const rate = Number(r.ratePerWord);
                const cut = Number(r.businessCutPct);
                const linguistNet = rate * (1 - cut / 100);
                const bizShare = rate * (cut / 100);
                return (
                  <div key={r.id} className="py-3 border-b border-[#F5F8FA] last:border-0">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-sm font-medium" style={{ color: "#33475B" }}>{r.label}</div>
                        <div className="text-xs font-mono" style={{ color: "#99ACC2" }}>{r.workflowType}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold" style={{ color: "#33475B" }}>${rate.toFixed(4)}/word (gross)</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-lg bg-[#F5F8FA] px-2 py-1.5 text-center">
                        <div style={{ color: "#99ACC2" }}>Platform cut</div>
                        <div className="font-bold" style={{ color: "#FF7A59" }}>{cut}%</div>
                      </div>
                      <div className="rounded-lg bg-[#F5F8FA] px-2 py-1.5 text-center">
                        <div style={{ color: "#99ACC2" }}>Linguist net</div>
                        <div className="font-bold" style={{ color: "#00BDA5" }}>${linguistNet.toFixed(4)}</div>
                      </div>
                      <div className="rounded-lg bg-[#F5F8FA] px-2 py-1.5 text-center">
                        <div style={{ color: "#99ACC2" }}>Biz share</div>
                        <div className="font-bold" style={{ color: "#FF7A59" }}>${bizShare.toFixed(4)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-3">
            <a href="/admin/linguist-rates" className="text-xs font-medium underline" style={{ color: "#0091AE" }}>
              Edit rates
            </a>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#CBD6E2] p-6">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "#33475B" }}>
            <BarChart3 className="w-4 h-4" style={{ color: "#0091AE" }} />
            Credit Consumption Breakdown
          </h2>
          {totalUsed === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: "#99ACC2" }}>No usage data yet.</p>
          ) : (
            <div className="space-y-3">
              {[
                { label: "AI Translation", value: aiCreditsUsed, color: "#0091AE" },
                { label: "Human Revision", value: humanRevisionCreditsUsed, color: "#FF7A59" },
                { label: "Human Translation", value: humanTranslationCreditsUsed, color: "#00BDA5" },
              ].map(({ label, value, color }) => {
                const pct = totalUsed > 0 ? Math.round((value / totalUsed) * 100) : 0;
                return (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: "#516F90" }}>{label}</span>
                      <span className="font-semibold" style={{ color: "#33475B" }}>{value.toLocaleString()} credits ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-[#F5F8FA] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-[#F5F8FA] flex justify-between text-xs">
                <span style={{ color: "#516F90" }}>Total credits consumed</span>
                <span className="font-bold" style={{ color: "#33475B" }}>{totalUsed.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: "#516F90" }}>Est. spend ($49/1K credits)</span>
                <span className="font-bold" style={{ color: "#00BDA5" }}>${creditsToUsd(totalUsed).toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Organizations table ───────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#CBD6E2] overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-[#F5F8FA] flex items-center gap-2">
          <Building2 className="w-4 h-4" style={{ color: "#0091AE" }} />
          <h2 className="text-sm font-semibold" style={{ color: "#33475B" }}>Organizations &amp; Billing ({orgs.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F5F8FA]" style={{ background: "#F5F8FA" }}>
                <th className="text-left py-3 px-5 text-xs font-semibold" style={{ color: "#516F90" }}>Organization</th>
                <th className="text-left py-3 px-5 text-xs font-semibold" style={{ color: "#516F90" }}>Plan</th>
                <th className="text-left py-3 px-5 text-xs font-semibold" style={{ color: "#516F90" }}>Credit Balance</th>
                <th className="text-left py-3 px-5 text-xs font-semibold" style={{ color: "#516F90" }}>Used This Month</th>
                <th className="text-left py-3 px-5 text-xs font-semibold" style={{ color: "#516F90" }}>Est. Spend</th>
                <th className="text-left py-3 px-5 text-xs font-semibold" style={{ color: "#516F90" }}>Projects</th>
                <th className="text-left py-3 px-5 text-xs font-semibold" style={{ color: "#516F90" }}>Created</th>
                <th className="text-right py-3 px-5 text-xs font-semibold" style={{ color: "#516F90" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org: any) => {
                const usedThisMonth = orgUsageMap[org.id] ?? 0;
                const estSpend = creditsToUsd(usedThisMonth);
                return (
                  <tr key={org.id} className="border-b border-[#F5F8FA] hover:bg-[#F5F8FA] transition-colors"
                    data-testid={`org-row-${org.id}`}>
                    <td className="py-3 px-5">
                      <p className="font-medium text-xs" style={{ color: "#33475B" }}>{org.name}</p>
                      <p className="text-[10px]" style={{ color: "#99ACC2" }}>{org.slug}</p>
                    </td>
                    <td className="py-3 px-5">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${planColors[org.plan] ?? "bg-gray-100 text-gray-600"}`}>
                        {org.plan}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-xs font-semibold" style={{ color: "#33475B" }}>
                      {org.creditBalance.toLocaleString()}
                    </td>
                    <td className="py-3 px-5 text-xs" style={{ color: "#516F90" }}>
                      {usedThisMonth > 0 ? usedThisMonth.toLocaleString() : "—"}
                    </td>
                    <td className="py-3 px-5 text-xs font-medium" style={{ color: "#00BDA5" }}>
                      {usedThisMonth > 0 ? `$${estSpend.toFixed(2)}` : "—"}
                    </td>
                    <td className="py-3 px-5 text-xs" style={{ color: "#516F90" }}>
                      {org._count.projects}
                    </td>
                    <td className="py-3 px-5 text-xs" style={{ color: "#99ACC2" }}>
                      {new Date(org.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="py-3 px-5 text-right">
                      <TopUpButton
                        orgId={org.id}
                        orgName={org.name}
                        currentBalance={org.creditBalance}
                      />
                    </td>
                  </tr>
                );
              })}
              {orgs.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm" style={{ color: "#99ACC2" }}>
                    No organizations yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-2xl border border-[#CBD6E2]" style={{ background: "#F5F8FA" }}>
        <TrendingUp className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#0091AE" }} />
        <div>
          <p className="text-sm font-medium" style={{ color: "#33475B" }}>Stripe Billing — Ready to Enable</p>
          <p className="text-xs mt-0.5" style={{ color: "#516F90" }}>
            Full Stripe checkout (plans + credit packages), webhook handling, and customer portal are implemented and ready. To activate: set <code className="font-mono">STRIPE_SECRET_KEY</code>, <code className="font-mono">STRIPE_PUBLISHABLE_KEY</code>, and <code className="font-mono">STRIPE_WEBHOOK_SECRET</code> in Replit Secrets, then re-enable <code className="font-mono">lib/stripe.ts</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
