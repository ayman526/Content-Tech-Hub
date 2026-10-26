import { prisma } from "@/lib/prisma";
import { Users, Shield, UserCheck, User } from "lucide-react";
import LoginAsButton from "@/components/admin/login-as-button";

export const dynamic = "force-dynamic";

const roleColors: Record<string, string> = {
  CLIENT: "bg-navy/10 text-navy",
  LINGUIST: "bg-teal/10 text-teal",
  ADMIN: "bg-gold/10 text-gold",
};

const roleIcons: Record<string, typeof User> = {
  CLIENT: User,
  LINGUIST: UserCheck,
  ADMIN: Shield,
};

export default async function AdminUsersPage() {
  const [users, totalCount, byRole] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        organization: true,
        linguistProfile: { select: { isVerified: true, completedJobs: true, rating: true } },
        _count: { select: { clientProjects: true } },
      },
    }),
    prisma.user.count(),
    prisma.user.groupBy({ by: ["role"], _count: true }),
  ]);

  const roleCountMap = Object.fromEntries(byRole.map((r: any) => [r.role, r._count]));

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">User Management</h1>
        <p className="text-sm text-gray-500 mt-0.5">All registered platform users</p>
      </div>

      {/* Role summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { role: "CLIENT", label: "Clients", icon: User, color: "text-navy bg-navy/10 border-navy/20" },
          { role: "LINGUIST", label: "Linguists", icon: UserCheck, color: "text-teal bg-teal/10 border-teal/20" },
          { role: "ADMIN", label: "Admins", icon: Shield, color: "text-gold bg-gold/10 border-gold/20" },
        ].map(({ role, label, icon: Icon, color }) => (
          <div key={role} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-navy">{roleCountMap[role] ?? 0}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-navy flex items-center gap-2">
            <Users className="w-4 h-4" />
            All Users ({totalCount})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left py-3 px-5 text-xs font-medium text-gray-500">User</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-gray-500">Role</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-gray-500">Organization</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-gray-500">Projects / Jobs</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-gray-500">Joined</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user: any) => {
                const RoleIcon = roleIcons[user.role] ?? User;
                return (
                  <tr
                    key={user.id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    data-testid={`user-row-${user.id}`}
                  >
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-navy to-teal flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-navy text-xs leading-tight">{user.name ?? "—"}</p>
                          <p className="text-gray-400 text-[10px]">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-5">
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium ${roleColors[user.role]}`}>
                        <RoleIcon className="w-3 h-3" />
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-xs text-gray-600">{user.organization?.name ?? "—"}</td>
                    <td className="py-3 px-5 text-xs text-gray-600">
                      {user.role === "CLIENT" ? (
                        <span>{user._count.clientProjects} project{user._count.clientProjects !== 1 ? "s" : ""}</span>
                      ) : user.role === "LINGUIST" && user.linguistProfile ? (
                        <span>{user.linguistProfile.completedJobs} job{user.linguistProfile.completedJobs !== 1 ? "s" : ""}</span>
                      ) : "—"}
                    </td>
                    <td className="py-3 px-5">
                      {user.role === "LINGUIST" && user.linguistProfile ? (
                        user.linguistProfile.isVerified ? (
                          <span className="text-xs text-teal font-medium">Verified</span>
                        ) : (
                          <span className="text-xs text-gold font-medium">Pending</span>
                        )
                      ) : (
                        <span className="text-xs text-gray-400">Active</span>
                      )}
                    </td>
                    <td className="py-3 px-5 text-xs text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="py-3 px-5">
                      <LoginAsButton
                        userId={user.id}
                        userName={user.name ?? user.email}
                        userRole={user.role}
                      />
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-gray-400">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
