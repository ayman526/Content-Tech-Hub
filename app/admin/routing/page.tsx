import { prisma } from "@/lib/prisma";
import { ShieldCheck, Zap, Clock, CheckCircle, XCircle, Activity, User } from "lucide-react";

export const dynamic = "force-dynamic";

const statusConfig: Record<string, { label: string; color: string }> = {
  AVAILABLE: { label: "Available", color: "bg-gray-100 text-gray-600" },
  EXCLUSIVE: { label: "Exclusive", color: "bg-blue-50 text-blue-600" },
  ACCEPTED: { label: "Accepted", color: "bg-navy/10 text-navy" },
  IN_PROGRESS: { label: "In Progress", color: "bg-teal/10 text-teal" },
  COMPLETED: { label: "Completed", color: "bg-green-100 text-green-600" },
  APPROVED: { label: "Approved", color: "bg-emerald-100 text-emerald-700" },
  CANCELLED: { label: "Cancelled", color: "bg-red-50 text-red-500" },
};

export default async function AdminRoutingPage() {
  const [jobs, routingLogs, jobsByStatus] = await Promise.all([
    prisma.job.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        project: { select: { name: true } },
        linguist: { select: { name: true, email: true } },
        routingLogs: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.routingLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        job: { select: { id: true, sourceLanguage: true, targetLanguage: true, project: { select: { name: true } } } },
      },
    }),
    prisma.job.groupBy({ by: ["status"], _count: true }),
  ]);

  const statusCountMap = Object.fromEntries(jobsByStatus.map((j: any) => [j.status, j._count]));
  const totalJobs = jobs.length;
  const activeJobs = (statusCountMap["ACCEPTED"] ?? 0) + (statusCountMap["IN_PROGRESS"] ?? 0) + (statusCountMap["EXCLUSIVE"] ?? 0);
  const completedJobs = statusCountMap["COMPLETED"] ?? 0;
  const availableJobs = statusCountMap["AVAILABLE"] ?? 0;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">Routing Monitor</h1>
        <p className="text-sm text-gray-500 mt-0.5">Live view of job assignment and routing activity</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Active Jobs", value: activeJobs, icon: Activity, color: "text-teal bg-teal/10" },
          { label: "Available", value: availableJobs, icon: Zap, color: "text-navy bg-navy/10" },
          { label: "Completed", value: completedJobs, icon: CheckCircle, color: "text-green-600 bg-green-100" },
          { label: "Total", value: totalJobs, icon: ShieldCheck, color: "text-gold bg-gold/10" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-navy">{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Job pipeline table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-navy flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Job Pipeline (last 50)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left py-3 px-5 text-xs font-medium text-gray-500">Job</th>
                  <th className="text-left py-3 px-5 text-xs font-medium text-gray-500">Languages</th>
                  <th className="text-left py-3 px-5 text-xs font-medium text-gray-500">Linguist</th>
                  <th className="text-left py-3 px-5 text-xs font-medium text-gray-500">Words</th>
                  <th className="text-left py-3 px-5 text-xs font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job: any) => {
                  const sc = statusConfig[job.status] ?? { label: job.status, color: "bg-gray-100 text-gray-600" };
                  return (
                    <tr
                      key={job.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                      data-testid={`job-row-${job.id}`}
                    >
                      <td className="py-2.5 px-5">
                        <p className="font-medium text-navy text-xs">{job.project?.name ?? "—"}</p>
                        <p className="text-gray-400 text-[10px] font-mono">{job.id.slice(0, 12)}…</p>
                      </td>
                      <td className="py-2.5 px-5 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        {job.sourceLanguage} → {job.targetLanguage}
                      </td>
                      <td className="py-2.5 px-5 text-xs text-gray-600">
                        {job.linguist ? (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-teal" />
                            {job.linguist.name ?? job.linguist.email}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-2.5 px-5 text-xs text-gray-600">
                        {job.wordCount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-5">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${sc.color}`}>
                          {sc.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-sm text-gray-400">
                      No jobs yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Routing activity log */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-navy flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Routing Log
            </h2>
          </div>
          <div className="p-4 space-y-3 max-h-[520px] overflow-y-auto">
            {routingLogs.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No routing activity yet.</p>
            ) : (
              routingLogs.map((log: any) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
                  data-testid={`routing-log-${log.id}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-navy">{log.action}</span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    {log.job?.project?.name} · {log.job?.sourceLanguage?.toUpperCase()}→{log.job?.targetLanguage?.toUpperCase()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Status breakdown */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-navy mb-4">Status Breakdown</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {Object.entries(statusConfig).map(([status, { label, color }]) => (
            <div key={status} className="text-center">
              <div className={`inline-block text-xs px-3 py-1 rounded-full font-medium mb-1 ${color}`}>
                {label}
              </div>
              <div className="text-xl font-bold text-navy">{statusCountMap[status] ?? 0}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
