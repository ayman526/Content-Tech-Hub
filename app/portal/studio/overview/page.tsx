"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Building2, Briefcase, CheckCircle, Activity, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

function StatCard({
  label, value, icon: Icon, color, loading,
}: {
  label: string; value: number | string; icon: any; color: string; loading: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + "18" }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        {loading ? (
          <Skeleton className="h-7 w-12 mt-1" />
        ) : (
          <p className="text-2xl font-bold text-[#33475B]">{value}</p>
        )}
      </div>
    </div>
  );
}

const METHOD_LABELS: Record<string, string> = {
  AI_DRAFT_HUMAN_REVISION: "AI + Human",
  HUMAN_ONLY: "Human Only",
  FULLY_HUMAN: "Fully Human",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-500",
  IN_PROGRESS: "bg-blue-50 text-blue-600",
  REVIEW: "bg-yellow-50 text-yellow-600",
  DELIVERED: "bg-green-50 text-green-600",
  CANCELLED: "bg-red-50 text-red-600",
};

export default function StudioOverviewPage() {
  const router = useRouter();

  const { data: jobs = [], isLoading: jobsLoading } = useQuery<any[]>({
    queryKey: ["/api/studio/jobs"],
  });

  const { data: clients = [], isLoading: clientsLoading } = useQuery<any[]>({
    queryKey: ["/api/studio/clients"],
  });

  const activeJobs = jobs.filter((j: any) => j.status !== "DELIVERED" && j.status !== "CANCELLED" && j.status !== "ARCHIVED").length;
  const completedJobs = jobs.filter((j: any) => j.status === "DELIVERED").length;
  const recentJobs = [...jobs]
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#33475B]">Studio Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your translation business at a glance</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => router.push("/portal/studio/clients")} data-testid="btn-add-client">
            <Plus className="w-4 h-4" />
            New Client
          </Button>
          <Button size="sm" className="gap-1.5 text-white" style={{ background: "#FF7A59" }} onClick={() => router.push("/portal/studio/jobs")} data-testid="btn-add-job">
            <Plus className="w-4 h-4" />
            New Job
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Clients" value={clients.length} icon={Building2} color="#0091AE" loading={clientsLoading} />
        <StatCard label="Active Jobs" value={activeJobs} icon={Briefcase} color="#FF7A59" loading={jobsLoading} />
        <StatCard label="Delivered" value={completedJobs} icon={CheckCircle} color="#00BFA5" loading={jobsLoading} />
        <StatCard label="Total Jobs" value={jobs.length} icon={Activity} color="#33475B" loading={jobsLoading} />
      </div>

      {/* Recent Jobs */}
      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-[#33475B]">Recent Jobs</h2>
          <Link href="/portal/studio/jobs" className="text-xs font-medium flex items-center gap-1 hover:underline" style={{ color: "#0091AE" }}>
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {jobsLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
          </div>
        ) : recentJobs.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            No jobs yet.{" "}
            <Link href="/portal/studio/jobs" className="font-medium underline" style={{ color: "#FF7A59" }}>
              Create your first job
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {recentJobs.map((job: any) => (
              <li key={job.id}>
                <Link
                  href={`/portal/studio/jobs/${job.id}`}
                  className="flex items-center justify-between px-6 py-3 hover:bg-[#F5F8FA] transition-colors"
                  data-testid={`studio-job-row-${job.id}`}
                >
                  <div>
                    <p className="text-sm font-medium text-[#33475B]">{job.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {job.sourceLanguage} → {job.targetLanguage}
                      {job.client ? ` · ${job.client.name}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{METHOD_LABELS[job.translationMethod] ?? job.translationMethod}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[job.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {job.status}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: "/portal/studio/tm", label: "Translation Memory", desc: "Reuse past translations" },
          { href: "/portal/studio/glossaries", label: "Glossaries", desc: "Manage terminology" },
          { href: "/portal/studio/style-guides", label: "Style Guides", desc: "Writing rules and tone" },
        ].map((item) => (
          <Link key={item.href} href={item.href}
            className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-shadow group">
            <p className="font-semibold text-[#33475B] group-hover:text-[#0091AE] transition-colors">{item.label}</p>
            <p className="text-xs text-gray-400 mt-1">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
