import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyAsync } from "@/lib/notifications";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const user = session.user as { id: string; role?: string; email?: string; name?: string };
  if (user.role !== "LINGUIST" && user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const userId = user.id;

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          client: { select: { id: true, email: true, name: true } },
        },
      },
    },
  });

  if (!job) return NextResponse.json({ message: "Job not found" }, { status: 404 });
  if (job.status !== "AVAILABLE" && job.status !== "EXCLUSIVE") {
    return NextResponse.json({ message: "Job is no longer available" }, { status: 409 });
  }

  const linguist = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });

  const updated = await prisma.job.update({
    where: { id },
    data: {
      linguistId: userId,
      status: "ACCEPTED",
      acceptedAt: new Date(),
    },
  });

  await prisma.notification.create({
    data: {
      userId,
      type: "NEW_JOB",
      title: "Job Accepted",
      message: `You've accepted the job. Please start work as soon as possible.`,
    },
  });

  notifyAsync({
    eventKey: "task.assigned",
    recipients: [{ userId, email: linguist?.email ?? "" }],
    vars: {
      linguist_name: linguist?.name ?? linguist?.email ?? "Linguist",
      project_name: job.project.name,
      task_name: `${job.targetLanguage} translation`,
      source_language: job.project.sourceLanguage ?? "EN",
      target_language: job.targetLanguage,
      word_count: String(job.wordCount ?? 0),
      deadline: job.project.dueDate ? new Date(job.project.dueDate).toLocaleDateString() : "TBD",
      task_url: `/portal/jobs/${id}`,
    },
  });

  if (job.project.client?.email) {
    notifyAsync({
      eventKey: "project.linguist_assigned",
      recipients: [{ userId: job.project.client.id, email: job.project.client.email }],
      vars: {
        user_name: job.project.client.name ?? job.project.client.email ?? "Client",
        linguist_name: linguist?.name ?? linguist?.email ?? "A linguist",
        project_name: job.project.name,
        project_link: `/dashboard/projects/${job.projectId}`,
      },
    });
  }

  return NextResponse.json(updated);
}
