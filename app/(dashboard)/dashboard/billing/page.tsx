import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreditCard, Package, Star } from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { InfoNote } from "@/components/ui/info-tip";
import { PlanUpgradeButton, BuyCreditsButton, ManageBillingButton } from "./BillingActions";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

function wordsPerPackage(totalCredits: number, creditsPerWord: number): string {
  if (!creditsPerWord || !totalCredits) return "—";
  return Math.floor(totalCredits / creditsPerWord).toLocaleString();
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const session = await auth();
  const orgId = (session!.user as any).organizationId;
  const params = await searchParams;

  const [org, transactions, creditPackages, creditRates] = await Promise.all([
    orgId ? prisma.organization.findUnique({ where: { id: orgId } }) : null,
    orgId
      ? prisma.creditTransaction.findMany({
          where: { organizationId: orgId },
          orderBy: { createdAt: "desc" },
          take: 15,
          include: { relatedProject: true },
        })
      : [],
    prisma.creditPackage.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.creditRate.findMany(),
  ]);

  const planLabel = org?.plan ?? "STARTER";
  const planBadge: Record<string, string> = {
    STARTER: "bg-gray-100 text-gray-600",
    PROFESSIONAL: "bg-[#E8F5F8] text-[#0091AE]",
    AGENCY: "bg-orange-100 text-orange-700",
    ENTERPRISE: "bg-amber-100 text-amber-700",
  };

  const txTypeColors: Record<string, string> = {
    PURCHASE: "text-[#00BDA5]",
    USAGE: "text-red-500",
    REFUND: "text-blue-500",
    BONUS: "text-amber-500",
  };

  const rateByType: Record<string, number> = {};
  for (const r of creditRates) rateByType[r.workflowType] = Number(r.creditsPerWord);

  const WORKFLOW_LABELS: Record<string, string> = {
    AI_TRANSLATION: "AI Translation",
    HUMAN_REVISION: "Human Revision",
    HUMAN_TRANSLATION: "Human Translation",
  };

  const hasStripeCustomer = !!org?.stripeCustomerId;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#33475B" }}>Billing & Credits</h1>
          <p className="text-sm mt-0.5" style={{ color: "#516F90" }}>Manage your plan and credit balance</p>
        </div>
        {hasStripeCustomer && <ManageBillingButton />}
      </div>

      {params.checkout === "success" && (
        <div
          className="mb-6 rounded-xl border px-5 py-4 flex items-center gap-3"
          style={{ background: "#E6F7F5", borderColor: "#00BDA5" }}
        >
          <span className="text-lg">✓</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: "#00796B" }}>Payment confirmed!</p>
            <p className="text-xs" style={{ color: "#516F90" }}>
              Your credits and plan changes are now active.
            </p>
          </div>
        </div>
      )}

      {params.checkout === "cancelled" && (
        <div
          className="mb-6 rounded-xl border px-5 py-4"
          style={{ background: "#FFF1EC", borderColor: "#FF7A59" }}
        >
          <p className="text-sm font-semibold" style={{ color: "#C0392B" }}>Checkout cancelled</p>
          <p className="text-xs mt-0.5" style={{ color: "#516F90" }}>
            No charge was made. You can try again whenever you&apos;re ready.
          </p>
        </div>
      )}

      <InfoNote className="mb-8">
        <strong>How Credits Work:</strong> Credits are the currency for all translation activity on Contentech. Each workflow type consumes a different number of credits per word — <strong>AI Translation</strong> is the most economical, <strong>Human Revision</strong> (MTPE) costs more, and <strong>Human Translation</strong> costs the most. Credits are deducted when a job is submitted. Any unused credits roll over and never expire.
      </InfoNote>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Current Plan */}
        <div className="bg-white rounded-2xl border border-[#CBD6E2] p-6">
          <h2 className="text-sm font-semibold mb-4" style={{ color: "#516F90" }}>Current Plan</h2>
          <div className="flex items-center gap-3 mb-4">
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${planBadge[planLabel] ?? "bg-gray-100 text-gray-600"}`}>
              {planLabel}
            </span>
          </div>

          {planLabel === "STARTER" && (
            <div>
              <p className="text-sm mb-4" style={{ color: "#516F90" }}>
                Upgrade to Professional for unlimited documents, favorite linguists, API access, and 1,000 monthly credits.
              </p>
              <div className="flex gap-2 flex-wrap">
                <PlanUpgradeButton planSlug="professional" label="Upgrade to Professional — $49/mo" />
              </div>
            </div>
          )}

          {planLabel === "PROFESSIONAL" && (
            <div>
              <p className="text-sm mb-4" style={{ color: "#516F90" }}>
                Upgrade to Agency to manage multiple client workspaces, per-client assets, and client-level analytics. Includes 3,000 monthly credits.
              </p>
              <div className="flex gap-2 flex-wrap">
                <PlanUpgradeButton planSlug="agency" label="Upgrade to Agency — $100/mo" />
                <Link href="/contact-sales">
                  <Button size="sm" variant="outline" data-testid="btn-contact-sales">Contact Sales</Button>
                </Link>
              </div>
            </div>
          )}

          {planLabel === "AGENCY" && (
            <div>
              <p className="text-sm mb-4" style={{ color: "#516F90" }}>
                You&apos;re on the Agency plan. Unlock dedicated linguist teams, SSO, and SLA guarantees with Enterprise.
              </p>
              <Link href="/contact-sales">
                <Button size="sm" variant="outline" data-testid="btn-contact-enterprise">Contact Sales for Enterprise</Button>
              </Link>
            </div>
          )}

          {planLabel === "ENTERPRISE" && (
            <p className="text-sm" style={{ color: "#516F90" }}>Enterprise plan. Contact your account manager for changes.</p>
          )}
        </div>

        {/* Credit Balance */}
        <div className="bg-white rounded-2xl border border-[#CBD6E2] p-6">
          <h2 className="text-sm font-semibold mb-4" style={{ color: "#516F90" }}>Platform Credits</h2>
          <div className="text-4xl font-bold mb-1" style={{ color: "#33475B" }}>
            {org?.creditBalance?.toLocaleString() ?? 0}
          </div>
          <p className="text-sm mb-4" style={{ color: "#99ACC2" }}>credits available</p>
          <div className="text-xs space-y-1" style={{ color: "#516F90" }}>
            {Object.entries(rateByType).map(([type, cpw]) => (
              <div key={type} className="flex justify-between">
                <span>{WORKFLOW_LABELS[type] ?? type}</span>
                <span className="font-medium" style={{ color: "#33475B" }}>
                  {cpw <= 1 ? `${(1 / cpw).toFixed(0)} words/credit` : `${cpw} credits/word`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Credit Packages */}
      {creditPackages.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-1" style={{ color: "#33475B" }}>Buy Credits</h2>
          <p className="text-sm mb-5" style={{ color: "#516F90" }}>One-time credit top-ups — credits never expire</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {creditPackages.map((pkg) => {
              const total = pkg.credits + pkg.bonusCredits;
              const price = Number(pkg.priceUsd);
              return (
                <div
                  key={pkg.id}
                  className={`relative bg-white rounded-2xl border p-5 flex flex-col ${pkg.isPopular ? "border-[#FF7A59] shadow-md" : "border-[#CBD6E2]"}`}
                  data-testid={`pkg-card-${pkg.id}`}
                >
                  {pkg.isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span
                        className="inline-flex items-center gap-1 text-white text-xs font-bold px-2.5 py-0.5 rounded-full"
                        style={{ background: "#FF7A59" }}
                      >
                        <Star className="w-3 h-3 fill-current" /> Popular
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-4 h-4" style={{ color: "#0091AE" }} />
                    <span className="font-semibold text-sm" style={{ color: "#33475B" }}>{pkg.name}</span>
                  </div>
                  <div className="mb-1">
                    <span className="text-2xl font-bold" style={{ color: "#33475B" }}>
                      {pkg.credits.toLocaleString()}
                    </span>
                    <span className="text-sm ml-1" style={{ color: "#99ACC2" }}>credits</span>
                  </div>
                  {pkg.bonusCredits > 0 && (
                    <div className="text-xs font-medium mb-3" style={{ color: "#00BDA5" }}>
                      + {pkg.bonusCredits.toLocaleString()} bonus credits
                    </div>
                  )}
                  <div className="text-xs space-y-0.5 mb-4 flex-1" style={{ color: "#516F90" }}>
                    {Object.entries(rateByType).map(([type, cpw]) => (
                      <div key={type} className="flex justify-between">
                        <span>{WORKFLOW_LABELS[type] ?? type}</span>
                        <span className="font-medium" style={{ color: "#33475B" }}>
                          {wordsPerPackage(total, cpw)} words
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-auto">
                    <div className="text-xl font-bold mb-3" style={{ color: "#33475B" }}>${price.toFixed(0)}</div>
                    <BuyCreditsButton packageId={pkg.id} isPopular={pkg.isPopular} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="bg-white rounded-2xl border border-[#CBD6E2] p-6">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "#33475B" }}>
          <CreditCard className="w-4 h-4" />
          Transaction History
        </h2>
        {transactions.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm" style={{ color: "#516F90" }}>No transactions yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx: any) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-3 border-b border-[#F5F8FA] last:border-0"
                data-testid={`tx-row-${tx.id}`}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: "#33475B" }}>{tx.description ?? tx.type}</p>
                  {tx.relatedProject && (
                    <p className="text-xs" style={{ color: "#99ACC2" }}>{tx.relatedProject.name}</p>
                  )}
                  <p className="text-xs" style={{ color: "#99ACC2" }}>{formatDate(tx.createdAt)}</p>
                </div>
                <span className={`text-sm font-bold ${txTypeColors[tx.type] ?? "text-gray-600"}`}>
                  {tx.type === "USAGE" ? "-" : "+"}{Math.abs(tx.amount)} credits
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
