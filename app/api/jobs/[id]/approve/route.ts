import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyAsync } from "@/lib/notifications";

/**
 * POST /api/jobs/[id]/approve
 * Called by the CLIENT to approve the linguist's delivered work.
 * Fires task.approved → linguist.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: jobId } = await params;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      project: {
        include: {
          client: { select: { id: true, name: true, email: true } },
        },
      },
      linguist: { select: { id: true, name: true, email: true } },
    },
  });

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  if (job.project.clientId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!job.linguistId || !job.linguist) {
    return NextResponse.json({ error: "No linguist assigned" }, { status: 400 });
  }

  if (job.status !== "COMPLETED") {
    return NextResponse.json(
      { error: "Job must be completed before it can be approved" },
      { status: 409 }
    );
  }

  await prisma.job.update({
    where: { id: jobId },
    data: { status: "APPROVED" },
  });

  notifyAsync(
    "task.approved",
    {
      recipients: [{ userId: job.linguist.id, email: job.linguist.email ?? "" }],
      vars: {
        linguist_name: job.linguist.name ?? job.linguist.email ?? "Linguist",
        project_name: job.project.name,
        target_language: job.targetLanguage,
        client_name:
          job.project.client?.name ?? job.project.client?.email ?? "Your client",
        project_url: `/portal/jobs/${jobId}`,
      },
      entityType: "job",
      entityId: jobId,
    },
    { triggeredBy: session.user.id }
  );

  return NextResponse.json({ ok: true });
}
