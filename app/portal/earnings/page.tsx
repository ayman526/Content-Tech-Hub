import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DollarSign, TrendingUp, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { getServerTranslation } from "@/lib/i18n/server";
import { InfoNote } from "@/components/ui/info-tip";

export const dynamic = "force-dynamic";

export default async function EarningsPage() {
  const session = await auth();
  const userId = session!.user.id!;
  const { t } = await getServerTranslation();

  const [completedJobs, pendingJobs] = await Promise.all([
    prisma.job.findMany({
      where: { linguistId: userId, status: "COMPLETED" },
      include: { project: { include: { organization: { select: { name: true } } } } },
      orderBy: { completedAt: "desc" },
    }),
    prisma.job.findMany({
      where: { linguistId: userId, status: { in: ["ACCEPTED", "IN_PROGRESS"] } },
      include: { project: true },
      orderBy: { acceptedAt: "desc" },
    }),
  ]);

  const totalEarned = completedJobs.reduce((sum: number, j: any) => sum + Number(j.payoutAmount ?? 0), 0);
  const pendingAmount = pendingJobs.reduce((sum: number, j: any) => sum + Number(j.payoutAmount ?? 0), 0);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">{t("earnings.title")}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track your payouts and transaction history</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: t("earnings.lifetimeEarned"), value: formatCurrency(totalEarned), icon: DollarSign, color: "text-teal bg-teal/10" },
          { label: "In Progress", value: formatCurrency(pendingAmount), icon: Clock, color: "text-gold bg-gold/10" },
          { label: t("earnings.jobsCompleted"), value: completedJobs.length, icon: CheckCircle, color: "text-navy bg-navy/10" },
          {
            label: t("earnings.avgPerJob"),
            value: completedJobs.length > 0 ? formatCurrency(totalEarned / completedJobs.length) : "$0.00",
            icon: TrendingUp,
            color: "text-purple-600 bg-purple-100",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-navy mb-0.5">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      <InfoNote className="mb-6">
        <strong>{t("earnings.paymentSchedule")}:</strong> Payments are processed bi-weekly. Your <strong>Lifetime Earned</strong> total reflects all completed and paid jobs. The <strong>In Progress</strong> figure is your potential earnings from jobs you have currently accepted or are actively working — these become payable once each job is marked completed. Make sure your payment details are up to date in your profile before the next pay cycle runs.
      </InfoNote>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-navy">{t("earnings.transactionHistory")}</h2>
        </div>
        {completedJobs.length === 0 ? (
          <div className="text-center py-16">
            <DollarSign className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">{t("earnings.noTransactions")}</p>
            <p className="text-xs text-gray-400 mt-1">{t("earnings.startEarning")}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {completedJobs.map((job: any) => (
              <div key={job.id} className="flex items-center justify-between px-5 py-4 gap-4" data-testid={`earning-${job.id}`}>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-teal/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-teal" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-navy">{job.project.name}</p>
                    <p className="text-xs text-gray-400">
                      {job.sourceLanguage} → {job.targetLanguage} · {job.wordCount.toLocaleString()} {t("general.words")}
                      {job.completedAt && ` · ${formatDate(job.completedAt)}`}
                    </p>
                  </div>
                </div>
                <div className="text-end flex-shrink-0">
                  <p className="text-sm font-bold text-teal">+{formatCurrency(Number(job.payoutAmount ?? 0))}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Paid</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
