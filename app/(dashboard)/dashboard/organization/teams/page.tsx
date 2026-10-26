import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import TeamsClient from "./teams-client";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const session = await auth();
  const orgId = (session!.user as any).organizationId;
  if (!orgId) redirect("/dashboard");

  const [departments, orgUsers, projectCounts, jobCounts] = await Promise.all([
    prisma.department.findMany({
      where: { organizationId: orgId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.project.groupBy({
      by: ["clientId"],
      where: { organizationId: orgId },
      _count: { id: true },
    }),
    prisma.job.groupBy({
      by: ["linguistId"],
      where: { linguistId: { not: null } },
      _count: { id: true },
    }),
  ]);

  const projectCountMap: Record<string, number> = {};
  for (const p of projectCounts) {
    projectCountMap[p.clientId] = p._count.id;
  }

  const jobCountMap: Record<string, number> = {};
  for (const j of jobCounts) {
    if (j.linguistId) jobCountMap[j.linguistId] = j._count.id;
  }

  const serialized = departments.map((d) => ({
    ...d,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    members: d.members.map((m) => ({
      ...m,
      joinedAt: m.joinedAt.toISOString(),
      jobCount:
        m.user.role === "LINGUIST"
          ? (jobCountMap[m.userId] ?? 0)
          : (projectCountMap[m.userId] ?? 0),
    })),
  }));

  const serializedUsers = orgUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as string,
  }));

  return <TeamsClient initialDepartments={serialized} orgUsers={serializedUsers} />;
}
