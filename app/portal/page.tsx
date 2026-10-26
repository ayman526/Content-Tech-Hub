import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  Briefcase,
  Clock,
  CheckCircle,
  DollarSign,
  ArrowRight,
  Star,
  Globe,
  Award,
  TrendingUp,
  Bell,
  AlertCircle,
  BadgeCheck,
  PencilLine,
} from "lucide-react";
import { InfoNote } from "@/components/ui/info-tip";
import { Button } from "@/components/ui/button";
import { formatDate, formatCurrency } from "@/lib/utils";
import { getServerTranslation } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function LinguistDashboard() {
  const session = await auth();
  const userId = session!.user.id!;
  const { t } = await getServerTranslation();

  const [availableJobs, myJobs, profile, notifications] = await Promise.all([
    prisma.job.findMany({
      where: { status: { in: ["AVAILABLE", "EXCLUSIVE"] }, linguistId: null },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 10,
      include: { project: { include: { client: true, organization: true } } },
    }),
    prisma.job.findMany({
      where: { linguistId: userId, status: { in: ["ACCEPTED", "IN_PROGRESS"] } },
      take: 5,
      include: { project: true },
    }),
    prisma.linguistProfile.findUnique({ where: { userId } }),
    prisma.notification.findMany({
      where: { userId, read: false },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  const earnings = await prisma.job.aggregate({
    where: { linguistId: userId, status: "COMPLETED" },
    _sum: { payoutAmount: true },
    _count: true,
  });

  const monthEarnings = await prisma.job.aggregate({
    where: {
      linguistId: userId,
      status: "COMPLETED",
      completedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
    },
    _sum: { payoutAmount: true },
  });

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      EXCLUSIVE: "bg-gold/10 text-gold border border-gold/30",
      AVAILABLE: "bg-teal/10 text-teal border border-teal/20",
      ACCEPTED: "bg-blue-100 text-blue-700",
      IN_PROGRESS: "bg-purple-100 text-purple-700",
    };
    return map[status] ?? "bg-gray-100 text-gray-600";
  };

  const notifColor: Record<string, string> = {
    PAYMENT: "bg-green-100 text-green-700",
    NEW_JOB: "bg-teal/10 text-teal",
    PREFERRED_JOB: "bg-gold/10 text-gold",
    DEADLINE_REMINDER: "bg-red-100 text-red-600",
    SYSTEM: "bg-gray-100 text-gray-600",
  };

  const languagePairs = Array.isArray(profile?.languagePairs)
    ? (profile.languagePairs as any[]).map((lp: any) =>
        typeof lp === "string" ? lp : `${lp.source} → ${lp.target}`
      )
    : [];

  const profileItems = [
    { label: "Bio", done: !!profile?.bio?.trim() },
    { label: "Languages", done: languagePairs.length > 0 },
    { label: "Specializations", done: (profile?.specializations?.length ?? 0) > 0 },
    { label: "Rate", done: !!profile?.hourlyRate },
    { label: "CV", done: !!profile?.cvUrl },
    { label: "Certifications", done: (profile?.certifications?.length ?? 0) > 0 },
  ];
  const profilePct = Math.round((profileItems.filter((i) => i.done).length / profileItems.length) * 100);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-navy">
            {t("dashboard.welcomeBack")}, {session!.user.name?.split(" ")[0] ?? "Linguist"}
          </h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <p className="text-sm text-gray-500">{t("dashboard.overview")}</p>
            {profile?.isVerified && (
              <span className="flex items-center gap-1 text-xs font-medium text-teal bg-teal/10 border border-teal/20 px-2 py-0.5 rounded-full">
                <BadgeCheck className="w-3 h-3" /> {t("dashboard.verifiedLinguist")}
              </span>
            )}
            {profile?.rating && Number(profile.rating) > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-gold fill-gold" />
                <span className="text-xs font-semibold text-navy">{Number(profile.rating).toFixed(2)}</span>
                <span className="text-xs text-gray-400">({profile.reviewCount} {t("dashboard.reviews")})</span>
              </div>
            )}
          </div>
        </div>
        <Link href="/portal/jobs">
          <Button data-testid="btn-browse-jobs">
            <Briefcase className="w-4 h-4 me-2" />
            {t("dashboard.browseJobs")}
          </Button>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: t("dashboard.availableJobs"), value: availableJobs.length, icon: Briefcase, color: "text-navy bg-navy/10" },
          { label: t("dashboard.activeAssignments"), value: myJobs.length, icon: Clock, color: "text-gold bg-gold/10" },
          { label: t("dashboard.jobsCompleted"), value: earnings._count, icon: CheckCircle, color: "text-teal bg-teal/10" },
          {
            label: t("dashboard.totalEarned"),
            value: formatCurrency(Number(earnings._sum.payoutAmount ?? 0)),
            icon: DollarSign,
            color: "text-green-600 bg-green-100",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-navy mb-0.5">{value}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Profile completion alert */}
      {profilePct < 80 && (
        <div className="bg-gradient-to-r from-navy/5 to-teal/5 border border-navy/10 rounded-2xl p-5 mb-6 flex items-center gap-4">
          <div className="w-10 h-10 bg-navy/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-navy" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-navy mb-0.5">{t("dashboard.completeProfile")}</p>
            <p className="text-xs text-gray-500">
              {t("dashboard.profileComplete")} {profilePct}{t("dashboard.profileCompletePct")}{" "}
              {profileItems.filter((i) => !i.done).map((i) => i.label).join(", ")}.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 w-40 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-teal rounded-full" style={{ width: `${profilePct}%` }} />
              </div>
              <span className="text-xs text-teal font-semibold">{profilePct}%</span>
            </div>
          </div>
          <Link href="/portal/profile">
            <Button size="sm" variant="outline">
              {t("dashboard.completeProfileBtn")} <ArrowRight className="w-3.5 h-3.5 ms-1" />
            </Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Available jobs */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-navy flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              {t("dashboard.availableJobs")}
            </h2>
            <Link href="/portal/jobs" className="text-xs text-teal font-medium hover:underline">
              {t("dashboard.viewAll")}
            </Link>
          </div>

          <InfoNote className="mb-4">
            Jobs marked <strong>Preferred</strong> (in gold) have been offered to you exclusively — accept them before the window closes or they open to all. <strong>Standard</strong> jobs are available to any matching linguist on a first-come basis.
          </InfoNote>
          {availableJobs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">{t("dashboard.noAvailableJobs")}</p>
              <p className="text-xs text-gray-400 mt-1">{t("dashboard.checkBackSoon")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableJobs.slice(0, 5).map((job: any) => (
                <div
                  key={job.id}
                  className="p-3.5 rounded-xl border border-gray-100 hover:border-navy/20 hover:shadow-sm transition-all"
                  data-testid={`job-${job.id}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(job.status)}`}>
                      {job.status === "EXCLUSIVE" ? t("jobs.preferred") : t("jobs.standard")}
                    </span>
                    {job.project?.dueDate && (
                      <span className="text-xs text-gray-400">
                        {t("jobs.due")} {formatDate(job.project.dueDate)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-navy">{job.project.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {job.sourceLanguage} → {job.targetLanguage} · {job.wordCount.toLocaleString()} {t("general.words")}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-bold text-teal">{formatCurrency(Number(job.payoutAmount ?? 0))}</span>
                    <Link href={`/portal/jobs/${job.id}`}>
                      <Button size="sm" variant="outline" className="h-7 text-xs">{t("jobs.viewDetails")}</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Active assignments */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-navy flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4" />
              {t("dashboard.activeAssignmentsList")}
              {myJobs.length > 0 && (
                <span className="ms-auto bg-navy text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{myJobs.length}</span>
              )}
            </h2>
            {myJobs.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">{t("dashboard.noActiveAssignments")}</p>
            ) : (
              <div className="space-y-2">
                {myJobs.map((job: any) => (
                  <Link
                    key={job.id}
                    href={`/portal/jobs/${job.id}/edit`}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100 group"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-navy truncate">{job.project.name}</p>
                      <p className="text-[10px] text-gray-400">{job.sourceLanguage} → {job.targetLanguage}</p>
                    </div>
                    <PencilLine className="w-3.5 h-3.5 text-gray-300 group-hover:text-teal flex-shrink-0 transition-colors" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Earnings this month */}
          <div className="bg-gradient-to-br from-navy to-navy/80 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-teal" />
              <span className="text-xs font-semibold text-white/70">{t("dashboard.thisMonth")}</span>
            </div>
            <div className="text-3xl font-bold mb-0.5">
              {formatCurrency(Number(monthEarnings._sum.payoutAmount ?? 0))}
            </div>
            <p className="text-xs text-white/60">
              {formatCurrency(Number(earnings._sum.payoutAmount ?? 0))} {t("dashboard.lifetimeTotal")}
            </p>
            <Link href="/portal/earnings" className="mt-4 inline-flex items-center gap-1 text-xs text-teal font-medium hover:underline">
              {t("dashboard.viewEarnings")}
            </Link>
          </div>

          {/* Notifications */}
          {notifications.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-navy flex items-center gap-2 mb-3">
                <Bell className="w-4 h-4" />
                {t("dashboard.notifications")}
                <span className="ms-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{notifications.length}</span>
              </h2>
              <div className="space-y-2">
                {notifications.map((n: any) => (
                  <div key={n.id} className="flex gap-2.5 p-2.5 rounded-xl bg-gray-50">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full h-fit flex-shrink-0 ${notifColor[n.type] ?? "bg-gray-100 text-gray-600"}`}>
                      {n.type.replace("_", " ")}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-navy">{n.title}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/portal/notifications" className="text-xs text-teal font-medium hover:underline mt-2 block text-end">
                {t("dashboard.viewAll")}
              </Link>
            </div>
          )}

          {/* Profile / expertise card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-navy flex items-center gap-2 mb-3">
              <Award className="w-4 h-4" />
              {t("dashboard.myExpertise")}
            </h2>
            {languagePairs.length > 0 ? (
              <div className="space-y-2.5">
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{t("dashboard.languages")}</p>
                  <div className="flex flex-wrap gap-1">
                    {languagePairs.slice(0, 4).map((lp: string) => (
                      <span key={lp} className="text-[11px] bg-navy/5 text-navy font-medium px-2 py-0.5 rounded-full border border-navy/10">
                        {lp}
                      </span>
                    ))}
                  </div>
                </div>
                {(profile?.specializations?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{t("dashboard.specializations")}</p>
                    <div className="flex flex-wrap gap-1">
                      {(profile?.specializations ?? []).slice(0, 3).map((s: string) => (
                        <span key={s} className="text-[11px] bg-teal/10 text-teal font-medium px-2 py-0.5 rounded-full">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {profile?.hourlyRate && (
                  <p className="text-xs text-gray-500">
                    {t("dashboard.rate")}: <span className="font-semibold text-navy">${Number(profile.hourlyRate).toFixed(0)}{t("dashboard.hr")}</span>
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-3">
                <Globe className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-xs text-gray-400 mb-2">{t("dashboard.noLanguagePairs")}</p>
                <Link href="/portal/profile">
                  <Button size="sm" variant="outline" className="text-xs">{t("dashboard.setUpProfile")}</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
