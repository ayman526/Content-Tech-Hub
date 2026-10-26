import { prisma } from "@/lib/prisma";
import { UserCheck, Star, CheckCircle, Clock, Briefcase, Globe } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminLinguistsPage() {
  const [linguists, totalCount, verifiedCount, pendingCount] = await Promise.all([
    prisma.user.findMany({
      where: { role: "LINGUIST" },
      orderBy: { createdAt: "desc" },
      include: {
        linguistProfile: true,
        assignments: {
          select: { status: true },
        },
      },
    }),
    prisma.user.count({ where: { role: "LINGUIST" } }),
    prisma.linguistProfile.count({ where: { isVerified: true } }),
    prisma.linguistProfile.count({ where: { isVerified: false } }),
  ]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">Linguist Management</h1>
        <p className="text-sm text-gray-500 mt-0.5">Review and verify linguist profiles</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Linguists", value: totalCount, icon: UserCheck, color: "text-navy bg-navy/10" },
          { label: "Verified", value: verifiedCount, icon: CheckCircle, color: "text-teal bg-teal/10" },
          { label: "Pending Verification", value: pendingCount, icon: Clock, color: "text-gold bg-gold/10" },
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

      {/* Pending verification section */}
      {pendingCount > 0 && (
        <div className="bg-gold/5 border border-gold/20 rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-navy flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-gold" />
            Awaiting Verification ({pendingCount})
          </h2>
          <div className="space-y-3">
            {linguists
              .filter((u: any) => u.linguistProfile && !u.linguistProfile.isVerified)
              .map((user: any) => {
                const profile = user.linguistProfile;
                const pairs: any[] = Array.isArray(profile.languagePairs) ? profile.languagePairs : [];
                return (
                  <div
                    key={user.id}
                    className="bg-white rounded-xl border border-gold/20 p-4 flex items-center justify-between"
                    data-testid={`linguist-pending-${user.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-navy to-teal flex items-center justify-center text-white text-xs font-bold">
                        {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-navy text-sm">{user.name ?? "—"}</p>
                        <p className="text-gray-400 text-xs">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5" />
                        {pairs.length > 0
                          ? pairs.map((p: any) => `${p.source?.toUpperCase()}→${p.target?.toUpperCase()}`).join(", ")
                          : "—"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5" />
                        {profile.specializations?.join(", ") || "—"}
                      </span>
                      <span className="text-gold font-semibold">Pending</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* All linguists table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-navy flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            All Linguists ({totalCount})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left py-3 px-5 text-xs font-medium text-gray-500">Linguist</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-gray-500">Language Pairs</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-gray-500">Specializations</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-gray-500">Rating</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-gray-500">Jobs</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {linguists.map((user: any) => {
                const profile = user.linguistProfile;
                const pairs: any[] = profile
                  ? Array.isArray(profile.languagePairs) ? profile.languagePairs : []
                  : [];
                return (
                  <tr
                    key={user.id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    data-testid={`linguist-row-${user.id}`}
                  >
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-navy to-teal flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-navy text-xs">{user.name ?? "—"}</p>
                          <p className="text-gray-400 text-[10px]">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-5 text-xs text-gray-600">
                      {pairs.length > 0
                        ? pairs.map((p: any) => `${p.source?.toUpperCase()}→${p.target?.toUpperCase()}`).join(", ")
                        : "—"}
                    </td>
                    <td className="py-3 px-5 text-xs text-gray-600 max-w-[160px] truncate">
                      {profile?.specializations?.join(", ") || "—"}
                    </td>
                    <td className="py-3 px-5">
                      {profile ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-navy">
                          <Star className="w-3 h-3 text-gold fill-gold" />
                          {Number(profile.rating).toFixed(1)}
                          <span className="text-gray-400 font-normal">({profile.reviewCount})</span>
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-3 px-5 text-xs text-gray-600">
                      {profile?.completedJobs ?? "—"}
                    </td>
                    <td className="py-3 px-5">
                      {profile?.isVerified ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium bg-teal/10 text-teal">
                          <CheckCircle className="w-3 h-3" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium bg-gold/10 text-gold">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {linguists.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                    No linguists registered yet.
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
