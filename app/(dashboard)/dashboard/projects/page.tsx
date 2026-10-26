import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { FolderOpen, Plus, Search, Filter, FileText, ArrowRight, ScanText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  PENDING: "bg-yellow-100 text-yellow-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  REVIEW: "bg-purple-100 text-purple-700",
  COMPLETED: "bg-teal/10 text-teal",
  CANCELLED: "bg-red-100 text-red-600",
};

const workflowLabels: Record<string, string> = {
  BYOK: "AI",
  CREDITS: "AI",
  HUMAN_ONLY: "Human",
  AI_HUMAN: "AI + Human",
};

export default async function ProjectsPage() {
  const session = await auth();
  const orgId = (session!.user as any).organizationId;

  const projects = orgId
    ? await prisma.project.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
        include: {
          documents: true,
          jobs: true,
          attachedOcrRequest: { select: { id: true, sourceFilename: true } },
        },
      })
    : [];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-navy">Projects</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {projects.length} total project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/dashboard/wizard">
          <Button className="gap-2" data-testid="btn-new-project">
            <Plus className="w-4 h-4" />
            New Order
          </Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <FolderOpen className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-navy mb-2">No projects yet</h3>
          <p className="text-sm text-gray-500 mb-6">
            Start your first translation order using our conversational wizard.
          </p>
          <Link href="/dashboard/wizard">
            <Button size="lg" variant="teal">
              Start First Order
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20"
                data-testid="input-search-projects"
              />
            </div>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Filter className="w-3.5 h-3.5" />
              Filter
            </Button>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Project</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Languages</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Workflow</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Cost</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Created</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {projects.map((project: any) => (
                <tr
                  key={project.id}
                  className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors"
                  data-testid={`project-row-${project.id}`}
                >
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-navy/5 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-navy/50" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-navy">{project.name}</p>
                          {project.attachedOcrRequest && (
                            <Link
                              href={`/dashboard/ocr-requests/${project.attachedOcrRequest.id}`}
                              className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#FF7A59]/10 text-[#FF7A59] hover:bg-[#FF7A59]/20 transition-colors"
                              title={`From OCR request: ${project.attachedOcrRequest.sourceFilename}`}
                              data-testid={`badge-from-ocr-${project.id}`}
                            >
                              <ScanText className="w-2.5 h-2.5" />
                              From OCR request
                            </Link>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">
                          {project.documents.length} doc{project.documents.length !== 1 ? "s" : ""} ·{" "}
                          {project.jobs.length} job{project.jobs.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="text-xs text-gray-700">
                      {project.sourceLanguage}
                    </p>
                    <p className="text-xs text-gray-400">
                      → {project.targetLanguages.slice(0, 2).join(", ")}
                      {project.targetLanguages.length > 2 && ` +${project.targetLanguages.length - 2}`}
                    </p>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-xs text-gray-600">
                      {workflowLabels[project.workflowType] ?? project.workflowType}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {project.workflowType === "BYOK" ? (
                      <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">BYOK</span>
                    ) : project.workflowType === "CREDITS" ? (
                      <span className="text-xs text-gray-700">
                        {(project.totalWordCount ?? 0).toLocaleString()} credits
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[project.status] ?? "bg-gray-100"}`}>
                      {project.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-gray-400">
                    {formatDate(project.createdAt)}
                  </td>
                  <td className="py-3.5 px-4">
                    <Link href={`/dashboard/projects/${project.id}`}>
                      <Button variant="ghost" size="sm" className="text-xs">
                        Open <ArrowRight className="ml-1 w-3 h-3" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
