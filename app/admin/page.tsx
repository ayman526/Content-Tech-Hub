import { prisma } from "@/lib/prisma";
import { BarChart3, Users, Briefcase, Globe, TrendingUp, CheckCircle, Clock, DollarSign } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [
    totalUsers,
    totalOrgs,
    totalProjects,
    totalJobs,
    completedJobs,
    pendingVerification,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.organization.count(),
    prisma.project.count(),
    prisma.job.count(),
    prisma.job.count({ where: { status: "COMPLETED" } }),
    prisma.linguistProfile.count({ where: { isVerified: false } }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { organization: true } }),
  ]);

  const projectsByStatus = await prisma.project.groupBy({
    by: ["status"],
    _count: true,
  });

  const statusMap = Object.fromEntries(projectsByStatus.map((p: any) => [p.status, p._count]));

  const roleColors: Record<string, string> = {
    CLIENT: "bg-navy/10 text-navy",
    LINGUIST: "bg-teal/10 text-teal",
    ADMIN: "bg-gold/10 text-gold",
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Platform overview and management</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Users", value: totalUsers, icon: Users, color: "text-navy bg-navy/10" },
          { label: "Organizations", value: totalOrgs, icon: Globe, color: "text-teal bg-teal/10" },
          { label: "Total Projects", value: totalProjects, icon: Briefcase, color: "text-gold bg-gold/10" },
          { label: "Completed Jobs", value: completedJobs, icon: CheckCircle, color: "text-green-600 bg-green-100" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-4.5 h-4.5" />
            </div>
            <div className="text-3xl font-bold text-navy mb-0.5">{value}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Project status breakdown */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-navy flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4" />
            Projects by Status
          </h2>
          <div className="space-y-3">
            {[
              { status: "IN_PROGRESS", label: "In Progress", color: "bg-blue-500" },
              { status: "PENDING", label: "Pending", color: "bg-yellow-400" },
              { status: "REVIEW", label: "In Review", color: "bg-gold" },
              { status: "COMPLETED", label: "Completed", color: "bg-teal" },
              { status: "DRAFT", label: "Draft", color: "bg-gray-300" },
            ].map(({ status, label, color }) => {
              const count = statusMap[status] ?? 0;
              const pct = totalProjects > 0 ? Math.round((count / totalProjects) * 100) : 0;
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600">{label}</span>
                    <span className="font-medium text-navy">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full">
                    <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-navy flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4" />
            Needs Attention
          </h2>
          <div className="space-y-3">
            {pendingVerification > 0 && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-gold/5 border border-gold/20">
                <div>
                  <p className="text-sm font-medium text-navy">Linguist Verifications</p>
                  <p className="text-xs text-gray-500">{pendingVerification} pending review</p>
                </div>
                <a href="/admin/linguists" className="text-xs font-semibold text-gold hover:underline">
                  Review →
                </a>
              </div>
            )}
            {totalJobs > completedJobs && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100">
                <div>
                  <p className="text-sm font-medium text-navy">Active Jobs</p>
                  <p className="text-xs text-gray-500">{totalJobs - completedJobs} in progress</p>
                </div>
                <a href="/admin/routing" className="text-xs font-semibold text-blue-600 hover:underline">
                  Monitor →
                </a>
              </div>
            )}
            {pendingVerification === 0 && totalJobs === completedJobs && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-teal/5">
                <CheckCircle className="w-5 h-5 text-teal flex-shrink-0" />
                <p className="text-sm text-gray-600">All caught up! No urgent items.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent users */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-navy flex items-center gap-2">
            <Users className="w-4 h-4" />
            Recent Users
          </h2>
          <a href="/admin/users" className="text-xs text-teal font-medium hover:underline">
            Manage all →
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">User</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Organization</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Role</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Joined</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((user: any) => (
                <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors" data-testid={`user-row-${user.id}`}>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-navy to-teal flex items-center justify-center text-white text-xs font-bold">
                        {user.name ? user.name[0] : user.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-navy text-xs">{user.name ?? "—"}</p>
                        <p className="text-gray-400 text-[10px]">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-xs text-gray-600">{user.organization?.name ?? "—"}</td>
                  <td className="py-2.5 px-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[user.role]}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-xs text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
