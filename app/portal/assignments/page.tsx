import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Clock, ArrowRight, CheckCircle, Loader2, FileText, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, formatCurrency } from "@/lib/utils";
import { getServerTranslation } from "@/lib/i18n/server";
import { InfoNote } from "@/components/ui/info-tip";

export const dynamic = "force-dynamic";

export default async function AssignmentsPage() {
  const session = await auth();
  const userId = session!.user.id!;
  const { t } = await getServerTranslation();

  const STATUS_STYLES: Record<string, { label: string; classes: string }> = {
    ACCEPTED:    { label: t("assignments.accepted"),    classes: "bg-blue-100 text-blue-700" },
    IN_PROGRESS: { label: t("editor.status.inProgress"), classes: "bg-purple-100 text-purple-700" },
    COMPLETED:   { label: t("assignments.completed"),   classes: "bg-teal/10 text-teal" },
    CANCELLED:   { label: "Cancelled",                  classes: "bg-gray-100 text-gray-500" },
  };

  const [active, completed] = await Promise.all([
    prisma.job.findMany({
      where: { linguistId: userId, status: { in: ["ACCEPTED", "IN_PROGRESS"] } },
      include: { project: { include: { organization: { select: { name: true } } } } },
      orderBy: { acceptedAt: "desc" },
    }),
    prisma.job.findMany({
      where: { linguistId: userId, status: "COMPLETED" },
      include: { project: { include: { organization: { select: { name: true } } } } },
      orderBy: { completedAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">{t("assignments.title")}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {active.length} {t("assignments.active")} · {completed.length} {t("assignments.completed")}
          </p>
        </div>
        <Link href="/portal/jobs">
          <Button variant="outline">{t("dashboard.browseJobs")}</Button>
        </Link>
      </div>

      <InfoNote className="mb-8">
        <strong>Assignment lifecycle:</strong> After you accept a job it moves to <strong>Accepted</strong> — the job is reserved for you. Once you open the editor and begin working, it transitions to <strong>In Progress</strong>. When you submit your translation the job is marked <strong>Completed</strong> and payment is queued for the next pay cycle. If a deadline is missed or the job is cancelled by the client, it may be reassigned. Always check the deadline shown on each card.
      </InfoNote>

      {/* Active */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-navy uppercase tracking-widest mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-gold" />
          {t("assignments.active")} ({active.length})
        </h2>
        {active.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <Loader2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">{t("assignments.noActive")}</p>
            <p className="text-xs text-gray-400 mt-1">{t("assignments.acceptJob")}</p>
            <Link href="/portal/jobs" className="mt-4 inline-block">
              <Button size="sm" className="mt-4">{t("dashboard.browseJobs")}</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((job: any) => {
              const style = STATUS_STYLES[job.status] ?? STATUS_STYLES.ACCEPTED;
              return (
                <div key={job.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center justify-between gap-4" data-testid={`assignment-${job.id}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.classes}`}>{style.label}</span>
                    </div>
                    <p className="font-semibold text-navy truncate">{job.project.name}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                      <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" />{job.sourceLanguage} → {job.targetLanguage}</span>
                      <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{job.wordCount.toLocaleString()} {t("assignments.wordCount")}</span>
                      <span>{job.project.organization.name}</span>
                    </div>
                    {job.acceptedAt && (
                      <p className="text-xs text-gray-400 mt-1">{t("assignments.accepted")} {formatDate(job.acceptedAt)}</p>
                    )}
                  </div>
                  <div className="text-end flex-shrink-0 flex flex-col items-end gap-2">
                    <p className="text-lg font-bold text-teal">{formatCurrency(Number(job.payoutAmount ?? 0))}</p>
                    <Link href={`/portal/jobs/${job.id}/edit`}>
                      <Button size="sm" variant="teal" data-testid={`btn-open-editor-${job.id}`}>
                        {t("assignments.openEditor")} <ArrowRight className="ms-1 w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Completed */}
      {completed.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-teal" />
            {t("assignments.completed")} ({completed.length})
          </h2>
          <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-50">
            {completed.map((job: any) => (
              <div key={job.id} className="flex items-center justify-between px-5 py-4 gap-4" data-testid={`completed-${job.id}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy truncate">{job.project.name}</p>
                  <p className="text-xs text-gray-400">
                    {job.sourceLanguage} → {job.targetLanguage} · {job.wordCount.toLocaleString()} {t("assignments.wordCount")}
                    {job.completedAt && ` · ${formatDate(job.completedAt)}`}
                  </p>
                </div>
                <p className="text-sm font-bold text-teal flex-shrink-0">{formatCurrency(Number(job.payoutAmount ?? 0))}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
