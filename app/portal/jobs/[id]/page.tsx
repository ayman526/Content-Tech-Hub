"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Globe,
  FileText,
  Zap,
  CheckCircle,
  Star,
  Loader2,
  AlertCircle,
  PencilLine,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/client";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  const { t } = useTranslation();

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/jobs/${jobId}`)
      .then((r) => r.json())
      .then((d) => { setJob(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [jobId]);

  async function handleAccept() {
    setAccepting(true);
    setError("");
    try {
      const res = await fetch(`/api/jobs/${jobId}/accept`, { method: "POST" });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push(`/portal/jobs/${jobId}/edit`), 1500);
      } else {
        const d = await res.json();
        setError(d.message ?? "Failed to accept job.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 text-teal animate-spin" />
      </div>
    );
  }

  if (!job || job.error) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Link href="/portal/jobs" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-navy mb-6">
          <ArrowLeft className="w-4 h-4" /> {t("job.backToFeed")}
        </Link>
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">{t("general.notFound")}</p>
        </div>
      </div>
    );
  }

  const isPreferred = job.status === "EXCLUSIVE";
  const isAccepted = job.status === "ACCEPTED" || job.status === "IN_PROGRESS";
  const timeLeft = job.exclusiveUntil
    ? Math.max(0, Math.round((new Date(job.exclusiveUntil).getTime() - Date.now()) / 60000))
    : null;

  if (success) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="text-center py-20 bg-white rounded-2xl border border-teal/20">
          <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-teal" />
          </div>
          <h2 className="text-xl font-bold text-navy mb-2">{t("job.acceptSuccess")}</h2>
          <p className="text-gray-500 text-sm">{t("job.opening")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href="/portal/jobs" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-navy mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> {t("job.backToFeed")}
      </Link>

      {isPreferred && !isAccepted && (
        <div className="flex items-center gap-2 text-sm font-semibold text-gold bg-gold/10 border border-gold/20 rounded-xl px-4 py-2.5 mb-5 w-fit">
          <Star className="w-4 h-4 fill-gold" />
          {t("job.preferred")}
          {timeLeft !== null && (
            <span className="text-gray-500 font-normal ms-1">· {timeLeft} {t("jobs.exclusiveWindow")}</span>
          )}
        </div>
      )}

      {isAccepted && (
        <div className="flex items-center gap-2 text-sm font-semibold text-teal bg-teal/10 border border-teal/20 rounded-xl px-4 py-2.5 mb-5 w-fit">
          <CheckCircle className="w-4 h-4" />
          {t("job.accepted")}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-7 mb-5">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-navy mb-1">{job.project?.name ?? "Translation Project"}</h1>
            <p className="text-sm text-gray-500">
              {job.project?.organization?.name ?? "Client"}
              {job.project?.dueDate && (
                <span> · {t("jobs.due")} {new Date(job.project.dueDate).toLocaleDateString()}</span>
              )}
            </p>
          </div>
          <div className="text-end">
            <p className="text-3xl font-bold text-teal">${Number(job.payoutAmount ?? 0).toFixed(2)}</p>
            <p className="text-xs text-gray-400">{t("job.estimatedPayout")}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { icon: Globe, label: t("jobs.sourceLanguage"), value: job.sourceLanguage },
            { icon: Globe, label: t("jobs.targetLanguage"), value: job.targetLanguage },
            { icon: FileText, label: t("jobs.wordCount"), value: job.wordCount?.toLocaleString() },
            { icon: Zap, label: t("jobs.workflow"), value: job.project?.workflowType?.replace("_", " ") ?? "Human Only" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-[#FAFBFC] rounded-xl p-3 border border-gray-100">
              <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
                <Icon className="w-3.5 h-3.5" />
                {label}
              </div>
              <p className="text-sm font-semibold text-navy">{value}</p>
            </div>
          ))}
        </div>

        {job.project?.notes && (
          <div className="bg-navy/5 rounded-xl p-4 mb-5">
            <p className="text-xs font-semibold text-navy mb-1">{t("job.clientNotes")}</p>
            <p className="text-sm text-gray-600">{job.project.notes}</p>
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-gray-500 mb-6 flex-wrap">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{t("job.postedOn")} {new Date(job.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {isAccepted ? (
          <div className="flex gap-3">
            <Link href={`/portal/jobs/${jobId}/edit`} className="flex-1">
              <Button className="w-full" size="lg" variant="teal" data-testid="btn-open-editor">
                <PencilLine className="w-4 h-4 me-2" />
                {t("job.openEditor")}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button
              className="flex-1"
              size="lg"
              onClick={handleAccept}
              disabled={accepting}
              variant={isPreferred ? "teal" : "default"}
              data-testid="btn-accept-job"
            >
              {accepting ? (
                <Loader2 className="w-4 h-4 animate-spin me-2" />
              ) : (
                <CheckCircle className="w-4 h-4 me-2" />
              )}
              {accepting
                ? t("job.accepting")
                : job?.project?.workflowType === "AI_HUMAN"
                  ? "Accept & Start Reviewing"
                  : t("job.accept")}
            </Button>
            <Link href="/portal/jobs">
              <Button variant="outline" size="lg" data-testid="btn-decline-job">
                <XCircle className="w-4 h-4 me-1.5" /> {t("job.decline")}
              </Button>
            </Link>
          </div>
        )}
      </div>

      {!isAccepted && (
        <div className="bg-navy/5 border border-navy/10 rounded-2xl p-5 text-sm text-gray-600">
          <p className="font-semibold text-navy mb-1">{t("job.exclusiveWindowInfo")}</p>
          <p className="text-sm leading-relaxed">{t("job.exclusiveWindowDesc")}</p>
        </div>
      )}
    </div>
  );
}
