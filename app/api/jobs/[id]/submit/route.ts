import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyAsync } from "@/lib/notifications";
import { deliverTranslationBackByJobId } from "@/lib/wordpress-delivery";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id: jobId } = await params;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      project: {
        include: {
          documents: { include: { segments: true } },
          client: { select: { id: true, email: true, name: true } },
        },
      },
    },
  });

  if (!job) return NextResponse.json({ message: "Job not found" }, { status: 404 });
  if (job.linguistId !== session.user.id) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const user = session.user as { id: string; email?: string; name?: string };
  const linguist = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true, name: true },
  });

  const segments = job.project.documents.flatMap((d: { segments: { id: string; status: string }[] }) => d.segments);
  const segmentIds = segments.map((s) => s.id);

  await prisma.translationSegment.updateMany({
    where: { id: { in: segmentIds }, status: { in: ["PENDING", "IN_PROGRESS"] } },
    data: { status: "TRANSLATED" },
  });

  await prisma.job.update({
    where: { id: jobId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  // If this job originated from a WordPress integration, push translation back to WordPress
  deliverTranslationBackByJobId(jobId).catch((err) => {
    console.error(`[WP Delivery] post-submit delivery failed for job ${jobId}:`, err);
  });

  await prisma.notification.create({
    data: {
      userId: user.id,
      type: "SYSTEM",
      title: "Job Marked as Completed",
      message: `Your translation of "${job.project.name}" has been marked as completed.`,
    },
  });

  if (job.project.client?.email) {
    const wordCount = String(job.wordCount ?? segments.length);
    const projectUrl = `/dashboard/projects/${job.projectId}`;

    notifyAsync({
      eventKey: "task.delivered",
      recipients: [{ userId: job.project.client.id, email: job.project.client.email }],
      vars: {
        client_name: job.project.client.name ?? job.project.client.email ?? "Client",
        linguist_name: linguist?.name ?? linguist?.email ?? "Your linguist",
        project_name: job.project.name,
        target_language: job.targetLanguage,
        word_count: wordCount,
        issue_count: "0",
        project_url: projectUrl,
      },
      triggeredBy: user.id,
    });

    notifyAsync({
      eventKey: "project.delivered",
      recipients: [{ userId: job.project.client.id, email: job.project.client.email }],
      vars: {
        user_name: job.project.client.name ?? job.project.client.email ?? "Client",
        project_name: job.project.name,
        project_link: projectUrl,
      },
      triggeredBy: user.id,
    });
  }

  return NextResponse.json({ message: "Job marked as completed" });
}
