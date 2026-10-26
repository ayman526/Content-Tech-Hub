import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Share2,
  Clock,
  CheckCircle2,
  CircleDot,
  Zap,
  Users,
  CalendarDays,
  CreditCard,
  BookOpen,
  Globe,
  ScanText,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import WorkItemsTable from "@/components/dashboard/work-items-table";

export const dynamic = "force-dynamic";

/* ─── colour maps ─────────────────────────────────────────────── */
const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600 border-gray-200",
  PENDING: "bg-yellow-50 text-yellow-700 border-yellow-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  REVIEW: "bg-purple-50 text-purple-700 border-purple-200",
  COMPLETED: "bg-teal-50 text-teal-700 border-teal-200",
  CANCELLED: "bg-red-50 text-red-600 border-red-200",
};

const jobStatusColors: Record<string, string> = {
  AVAILABLE: "bg-teal-50 text-teal-700",
  EXCLUSIVE: "bg-amber-50 text-amber-700",
  ACCEPTED: "bg-blue-50 text-blue-700",
  IN_PROGRESS: "bg-purple-50 text-purple-700",
  COMPLETED: "bg-green-50 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

const workflowLabel: Record<string, string> = {
  AI_HUMAN: "AI + Human Review",
  HUMAN_ONLY: "Human Only",
  BYOK: "AI (BYOK)",
  CREDITS: "AI (Credits)",
};

const DONE_STATUSES = ["TRANSLATED", "REVIEWED", "APPROVED"];

/* ─── SVG progress ring ───────────────────────────────────────── */
function ProgressRing({ pct, size = 96 }: { pct: number; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  const color = pct === 100 ? "#00BDA5" : "#0091AE";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E8EEF4" strokeWidth={10} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize={size * 0.22} fontWeight={700} fill={color}>
        {pct}%
      </text>
    </svg>
  );
}

/* ─── timeline helpers ────────────────────────────────────────── */
type Milestone = { label: string; ts: Date | null; done: boolean; current?: boolean };

function buildTimeline(project: any, jobs: any[]): Milestone[] {
  const wf: string = project.workflowType;
  const isAiOnly = wf === "BYOK" || wf === "CREDITS";
  const hasAiStep = wf === "AI_HUMAN" || isAiOnly;
  const hasHumanStep = wf === "AI_HUMAN" || wf === "HUMAN_ONLY";

  const anyAccepted = jobs.some((j) => ["ACCEPTED", "IN_PROGRESS", "COMPLETED"].includes(j.status));
  const anyCompleted = jobs.some((j) => j.status === "COMPLETED");
  const projectDone = project.status === "COMPLETED";

  const firstAcceptedAt = jobs
    .filter((j) => j.acceptedAt)
    .map((j) => new Date(j.acceptedAt))
    .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

  const firstCompletedAt = jobs
    .filter((j) => j.completedAt)
    .map((j) => new Date(j.completedAt))
    .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

  const pastPending = project.status !== "DRAFT" && project.status !== "PENDING";

  const milestones: Milestone[] = [
    { label: "Project created", ts: new Date(project.createdAt), done: true },
  ];

  /* AI draft step — only for AI-inclusive workflows */
  if (hasAiStep) {
    milestones.push({
      label: "AI draft generated",
      ts: pastPending ? new Date(project.updatedAt ?? project.createdAt) : null,
      done: pastPending,
      current: pastPending && !anyAccepted && !projectDone,
    });
  }

  /* Human review step — only for AI_HUMAN and HUMAN_ONLY */
  if (hasHumanStep) {
    milestones.push({
      label: "Human review started",
      ts: firstAcceptedAt,
      done: anyAccepted,
      current: anyAccepted && !anyCompleted,
    });
  }

  milestones.push({
    label: "Translation completed",
    ts: firstCompletedAt,
    done: anyCompleted,
    current: anyCompleted && !projectDone,
  });

  milestones.push({
    label: "Delivered",
    ts: projectDone ? firstCompletedAt : null,
    done: projectDone,
    current: false,
  });

  return milestones;
}

/* ─── page ────────────────────────────────────────────────────── */
export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user.id!;
  const orgId = (session!.user as any).organizationId;

  const [project, creditTxs] = await Promise.all([
    prisma.project.findFirst({
      where: { id, organizationId: orgId ?? "" },
      include: {
        documents: { include: { segments: { select: { status: true } } } },
        jobs: {
          include: {
            linguist: { select: { id: true, name: true, email: true } },
            review: true,
          },
        },
        attachedOcrRequest: {
          select: { id: true, sourceFilename: true, pageCount: true },
        },
      },
    }),
    prisma.creditTransaction.findMany({
      where: { relatedProjectId: id, organizationId: orgId ?? "" },
    }),
  ]);

  if (!project) notFound();

  /* ── computed values ── */
  const totalSegments = project.documents.reduce((sum, doc) => sum + doc.segments.length, 0);
  const doneSegments = project.documents.reduce(
    (sum, doc) => sum + doc.segments.filter((s) => DONE_STATUSES.includes(s.status)).length,
    0
  );
  const projectPct = totalSegments > 0 ? Math.round((doneSegments / totalSegments) * 100) : 0;

  const creditsUsed = creditTxs
    .filter((t) => t.type === "USAGE")
    .reduce((sum, t) => sum + Math.abs(t.amount as number), 0);

  const linguistIds = project.jobs.map((j) => j.linguistId).filter(Boolean) as string[];
  const [favorites, blacklists] = await Promise.all([
    linguistIds.length > 0
      ? prisma.favoriteLinguist.findMany({
          where: { customerId: userId, linguistId: { in: linguistIds } },
          select: { linguistId: true },
        })
      : Promise.resolve([]),
    linguistIds.length > 0
      ? prisma.linguistBlacklist.findMany({
          where: { customerId: userId, linguistId: { in: linguistIds } },
          select: { linguistId: true },
        })
      : Promise.resolve([]),
  ]);
  const favoritedSet = new Set(favorites.map((f) => f.linguistId));
  const blacklistedSet = new Set(blacklists.map((b) => b.linguistId));

  const hasLayout = project.documents.some((d: any) => d.layoutHtml && d.layoutHtml.length > 100);

  const workItemJobs = project.jobs.map((job) => ({
    id: job.id,
    sourceLanguage: job.sourceLanguage,
    targetLanguage: job.targetLanguage,
    wordCount: job.wordCount,
    status: job.status,
    linguistId: job.linguistId ?? null,
    linguistName: job.linguist?.name ?? null,
    linguistEmail: job.linguist?.email ?? null,
    existingReview: job.review ? { rating: job.review.rating, comment: job.review.comment ?? null } : null,
    isBlacklisted: job.linguistId ? blacklistedSet.has(job.linguistId) : false,
    isFavorited: job.linguistId ? favoritedSet.has(job.linguistId) : false,
    auditReportUrl: job.auditReportUrl ?? null,
    hasLayout,
  }));
  const workItemDocs = project.documents.map((doc) => ({
    id: doc.id,
    originalFilename: doc.originalFilename,
    translatedFileUrl: (doc as any).translatedFileUrl ?? null,
    fileType: doc.fileType,
  }));

  const timeline = buildTimeline(project, project.jobs);

  const linguistSourceLabel =
    project.jobs[0]
      ? project.jobs[0].linguistSource === "INTERNAL"
        ? "Internal Linguists"
        : project.jobs[0].linguistSource === "PREFERRED"
        ? "Preferred Linguists"
        : "System Pool"
      : "System Pool";

  return (
    <div className="min-h-screen" style={{ background: "#F5F8FA" }}>

      {/* ── Sticky header ─────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-20 border-b px-6 py-3 flex items-center gap-4"
        style={{ background: "#fff", borderColor: "#CBD6E2" }}
      >
        <Link
          href="/dashboard/projects"
          className="flex items-center gap-1.5 text-xs font-medium shrink-0 transition-colors"
          style={{ color: "#99ACC2" }}
          data-testid="link-back-projects"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Projects
        </Link>

        <div className="w-px h-5 bg-gray-200 shrink-0" />

        <div className="flex items-center gap-3 min-w-0 flex-1">
          <h1
            className="text-base font-bold truncate"
            style={{ color: "#33475B" }}
            data-testid="text-project-name"
          >
            {project.name}
          </h1>
          <span
            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shrink-0 ${statusColors[project.status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}
            data-testid="status-project"
          >
            {project.status.replace(/_/g, " ")}
          </span>
          {project.attachedOcrRequest && (
            <Link
              href={`/dashboard/ocr-requests/${project.attachedOcrRequest.id}`}
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#FF7A59]/10 text-[#FF7A59] hover:bg-[#FF7A59]/20 transition-colors shrink-0"
              title={`From OCR request: ${project.attachedOcrRequest.sourceFilename}`}
              data-testid="badge-from-ocr-request"
            >
              <ScanText className="w-3 h-3" />
              From OCR request
            </Link>
          )}
          <span className="hidden sm:flex items-center gap-1.5 text-xs shrink-0" style={{ color: "#516F90" }}>
            <Globe className="w-3.5 h-3.5" />
            {project.sourceLanguage} → {project.targetLanguages.join(", ")}
          </span>
          <span className="hidden md:flex items-center gap-1.5 text-xs shrink-0" style={{ color: "#99ACC2" }}>
            <CalendarDays className="w-3.5 h-3.5" />
            {formatDate(project.createdAt)}
          </span>
        </div>

        {/* Header CTAs */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            className="p-1.5 rounded-lg border transition-colors hover:bg-gray-50"
            style={{ borderColor: "#CBD6E2", color: "#516F90" }}
            title="Share project"
            data-testid="button-share-project"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">

        {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
        <div className="space-y-5 min-w-0">

          {/* Work items table with inline delivery + rating */}
          <WorkItemsTable
            jobs={workItemJobs}
            docs={workItemDocs}
            workflowType={project.workflowType}
            docCount={project.documents.length}
          />

          {/* Activity Timeline — second */}
          <section className="bg-white rounded-2xl border p-5" style={{ borderColor: "#CBD6E2" }}>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: "#99ACC2" }}>
              Activity Timeline
            </h2>
            <ol className="relative border-l-2 ml-3" style={{ borderColor: "#E8EEF4" }}>
              {timeline.map((m, i) => (
                <li key={i} className="ml-5 pb-5 last:pb-0">
                  <span
                    className={`absolute -left-[9px] flex items-center justify-center w-4 h-4 rounded-full border-2 ${
                      m.done
                        ? "border-teal-500 bg-teal-50"
                        : m.current
                        ? "border-blue-400 bg-blue-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    {m.done ? (
                      <CheckCircle2 className="w-2.5 h-2.5 text-teal-600" />
                    ) : m.current ? (
                      <CircleDot className="w-2.5 h-2.5 text-blue-500" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 block" />
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm font-medium ${m.done ? "" : "text-gray-400"}`}
                      style={m.done ? { color: "#33475B" } : {}}
                    >
                      {m.label}
                    </p>
                    {m.current && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                        In progress
                      </span>
                    )}
                  </div>
                  {m.ts && (
                    <time className="text-[11px]" style={{ color: "#99ACC2" }}>
                      {formatDate(m.ts)}
                    </time>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* ── RIGHT COLUMN ────────────────────────────────────────── */}
        <aside className="space-y-4 lg:sticky lg:top-16">

          {/* Project Overview card */}
          <div className="bg-white rounded-2xl border p-5" style={{ borderColor: "#CBD6E2" }}>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "#99ACC2" }}>
              Project Overview
            </h3>

            <div className="flex flex-col items-center mb-5">
              <ProgressRing pct={projectPct} size={100} />
              <p className="text-xs mt-2 font-medium" style={{ color: "#516F90" }}>
                {doneSegments.toLocaleString()} / {totalSegments.toLocaleString()} segments
              </p>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5" style={{ color: "#516F90" }}>
                  <Zap className="w-3.5 h-3.5" style={{ color: "#FF7A59" }} />
                  Workflow
                </span>
                <span className="font-semibold text-right" style={{ color: "#33475B" }}>
                  {workflowLabel[project.workflowType] ?? project.workflowType}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5" style={{ color: "#516F90" }}>
                  <BookOpen className="w-3.5 h-3.5" style={{ color: "#0091AE" }} />
                  Word count
                </span>
                <span className="font-semibold" style={{ color: "#33475B" }}>
                  {project.totalWordCount.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5" style={{ color: "#516F90" }}>
                  <CreditCard className="w-3.5 h-3.5" style={{ color: "#00BDA5" }} />
                  Credits consumed
                </span>
                <span className="font-semibold" style={{ color: creditsUsed > 0 ? "#33475B" : "#99ACC2" }}>
                  {creditsUsed > 0 ? creditsUsed.toLocaleString() : "—"}
                </span>
              </div>
              {project.dueDate && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5" style={{ color: "#516F90" }}>
                    <Clock className="w-3.5 h-3.5" style={{ color: "#516F90" }} />
                    Due date
                  </span>
                  <span className="font-semibold" style={{ color: "#33475B" }}>
                    {formatDate(project.dueDate)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Settings card */}
          <div className="bg-white rounded-2xl border p-5" style={{ borderColor: "#CBD6E2" }}>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "#99ACC2" }}>
              Quick Settings
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5" style={{ color: "#516F90" }}>
                  <Users className="w-3.5 h-3.5" style={{ color: "#33475B" }} />
                  Linguist pool
                </span>
                <span className="font-medium" style={{ color: "#33475B" }}>
                  {linguistSourceLabel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5" style={{ color: "#516F90" }}>
                  <FileText className="w-3.5 h-3.5" style={{ color: "#33475B" }} />
                  Translation Memory
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 font-medium" style={{ color: "#99ACC2" }}>
                  Default
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5" style={{ color: "#516F90" }}>
                  <BookOpen className="w-3.5 h-3.5" style={{ color: "#33475B" }} />
                  Glossary
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 font-medium" style={{ color: "#99ACC2" }}>
                  None applied
                </span>
              </div>
            </div>
          </div>

          {/* Notes (if any) */}
          {project.notes && (
            <div className="bg-white rounded-2xl border p-5" style={{ borderColor: "#CBD6E2" }}>
              <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#99ACC2" }}>
                Notes
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "#516F90" }}>{project.notes}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
