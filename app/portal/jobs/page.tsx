import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Briefcase, Star, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { getServerTranslation } from "@/lib/i18n/server";
import { InfoNote } from "@/components/ui/info-tip";

export const dynamic = "force-dynamic";

export default async function JobFeedPage() {
  const session = await auth();
  const userId = session!.user.id!;
  const { t } = await getServerTranslation();

  const [favoriteClientIds, jobs] = await Promise.all([
    prisma.favoriteLinguist.findMany({
      where: { linguistId: userId },
      select: { customerId: true },
    }).then((favs) => new Set(favs.map((f: any) => f.customerId))),
    prisma.job.findMany({
      where: { status: { in: ["AVAILABLE", "EXCLUSIVE"] } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        project: {
          include: { client: { select: { id: true, name: true } }, organization: true },
        },
      },
    }),
  ]);

  const preferredJobs = jobs.filter(
    (j: any) => j.status === "EXCLUSIVE" || favoriteClientIds.has(j.project.clientId)
  );
  const standardJobs = jobs.filter(
    (j: any) => j.status !== "EXCLUSIVE" && !favoriteClientIds.has(j.project.clientId)
  );

  function JobCard({ job, preferred }: { job: any; preferred: boolean }) {
    const timeLeft = job.exclusiveUntil
      ? Math.max(0, Math.round((new Date(job.exclusiveUntil).getTime() - Date.now()) / 60000))
      : null;

    return (
      <div
        className={`bg-white rounded-2xl border p-5 transition-all hover:shadow-md ${preferred ? "border-gold/40 bg-gold/5" : "border-gray-200"}`}
        data-testid={`job-card-${job.id}`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            {preferred && (
              <div className="flex items-center gap-1.5 text-xs text-gold font-semibold mb-1">
                <Star className="w-3.5 h-3.5 fill-gold" />
                {t("job.preferred")}
                {timeLeft !== null && (
                  <span className="text-gray-400 font-normal ms-1">· {timeLeft}:00 {t("jobs.exclusiveWindow")}</span>
                )}
              </div>
            )}
            <h3 className="text-sm font-bold text-navy">{job.project.name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {job.sourceLanguage} → {job.targetLanguage} ·{" "}
              {job.wordCount.toLocaleString()} {t("jobs.words")}
            </p>
          </div>
          <div className="text-end ms-4">
            <p className="text-lg font-bold text-teal">{formatCurrency(Number(job.payoutAmount ?? 0))}</p>
            <p className="text-xs text-gray-400">
              {job.project.workflowType === "HUMAN_ONLY" ? "Human Only" : "MTPE"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
          <span className="px-2 py-0.5 bg-gray-100 rounded-full">
            {job.project.organization.name}
          </span>
          {job.project.dueDate && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {t("jobs.due")}: {new Date(job.project.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <Link href={`/portal/jobs/${job.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">{t("jobs.viewDetailsBtn")}</Button>
          </Link>
          <Link href={`/portal/jobs/${job.id}`}>
            <Button size="sm" variant={preferred ? "teal" : "default"}>
              {job.project.workflowType === "AI_HUMAN" ? "Review" : t("job.accept")}
              <ChevronRight className="ms-1 w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy mb-1">{t("jobs.availableJobs")}</h1>
        <p className="text-sm text-gray-500">
          {jobs.length} {t("jobs.availableJobs").toLowerCase()} · {preferredJobs.length} {t("jobs.preferred").toLowerCase()}
        </p>
      </div>

      <InfoNote className="mb-6">
        <strong>Preferred jobs</strong> (highlighted in gold) are exclusively offered to you first — either because a client has added you to their preferred linguist list, or because the job was flagged EXCLUSIVE for your language pair. There is a short acceptance window; after it expires, the job opens to all linguists. <strong>Standard jobs</strong> are available to any qualified linguist on a first-come, first-served basis. Click a job to review the full brief and payout before accepting.
      </InfoNote>

      {preferredJobs.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gold uppercase tracking-wider mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 fill-gold" />
            {t("job.preferred")} ({preferredJobs.length})
          </h2>
          <div className="space-y-3">
            {preferredJobs.map((job: any) => (
              <JobCard key={job.id} job={job} preferred />
            ))}
          </div>
        </div>
      )}

      {standardJobs.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            {t("jobs.standard")} ({standardJobs.length})
          </h2>
          <div className="space-y-3">
            {standardJobs.map((job: any) => (
              <JobCard key={job.id} job={job} preferred={false} />
            ))}
          </div>
        </div>
      )}

      {jobs.length === 0 && (
        <div className="text-center py-20">
          <Briefcase className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">{t("jobs.noJobs")}</p>
          <p className="text-sm text-gray-400">{t("jobs.checkBack")}</p>
        </div>
      )}
    </div>
  );
}
