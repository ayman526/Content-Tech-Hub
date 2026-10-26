import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  Plus,
  FolderOpen,
  Clock,
  CheckCircle,
  TrendingUp,
  ArrowRight,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getDashboardData(userId: string, orgId: string) {
  const [projects, recentProjects] = await Promise.all([
    prisma.project.groupBy({
      by: ["status"],
      where: { organizationId: orgId },
      _count: true,
    }),
    prisma.project.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { documents: true },
    }),
  ]);

  return { projects, recentProjects };
}

export default async function DashboardPage() {
  const session = await auth();
  const user = session!.user;
  const orgId = (user as any).organizationId;

  const { projects, recentProjects } = orgId
    ? await getDashboardData(user.id!, orgId)
    : { projects: [], recentProjects: [] };

  const statusCount = (status: string) =>
    projects.find((p: any) => p.status === status)?._count ?? 0;

  const stats = [
    { label: "Active Projects", value: statusCount("IN_PROGRESS"), icon: FolderOpen, color: "text-navy bg-navy/10" },
    { label: "In Review", value: statusCount("REVIEW"), icon: Clock, color: "text-gold bg-gold/10" },
    { label: "Completed", value: statusCount("COMPLETED"), icon: CheckCircle, color: "text-teal bg-teal/10" },
    { label: "Total Projects", value: projects.reduce((s: number, p: any) => s + p._count, 0), icon: TrendingUp, color: "text-purple-600 bg-purple-100" },
  ];

  const statusColors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-600",
    PENDING: "bg-yellow-100 text-yellow-700",
    IN_PROGRESS: "bg-blue-100 text-blue-700",
    REVIEW: "bg-gold/10 text-gold-600",
    COMPLETED: "bg-teal/10 text-teal-700",
    CANCELLED: "bg-red-100 text-red-600",
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-navy">
            Good morning, {user.name?.split(" ")[0] ?? "there"} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Here's what's happening with your translation projects today.
          </p>
        </div>
        <Link href="/dashboard/wizard">
          <Button size="lg" className="gap-2" data-testid="btn-new-order">
            <Plus className="w-4 h-4" />
            New Order
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-4.5 h-4.5" />
            </div>
            <div className="text-3xl font-bold text-navy mb-0.5">{value}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Quick start + recent */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quick actions */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-navy mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { label: "Start a translation", href: "/dashboard/wizard", icon: Zap, desc: "Chat-driven order wizard" },
              { label: "Browse all projects", href: "/dashboard/projects", icon: FolderOpen, desc: "View & manage orders" },
              { label: "Manage your team", href: "/dashboard/team", icon: Plus, desc: "Favorite linguists" },
            ].map(({ label, href, icon: Icon, desc }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <div className="w-9 h-9 bg-navy/5 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-navy/10 transition-colors">
                  <Icon className="w-4 h-4 text-navy" />
                </div>
                <div>
                  <p className="text-sm font-medium text-navy">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-300 ml-auto group-hover:text-navy transition-colors" />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent projects */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-navy">Recent Projects</h2>
            <Link href="/dashboard/projects" className="text-xs text-teal font-medium hover:underline">
              View all →
            </Link>
          </div>

          {recentProjects.length === 0 ? (
            <div className="text-center py-10">
              <FolderOpen className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-4">No projects yet.</p>
              <Link href="/dashboard/wizard">
                <Button size="sm" variant="teal">Start Your First Order</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentProjects.map((project: any) => (
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                  data-testid={`project-${project.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy truncate">{project.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {project.sourceLanguage} → {project.targetLanguages.join(", ")} ·{" "}
                      {formatDate(project.createdAt)}
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ml-3 ${statusColors[project.status] ?? "bg-gray-100"}`}>
                    {project.status.replace("_", " ")}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
