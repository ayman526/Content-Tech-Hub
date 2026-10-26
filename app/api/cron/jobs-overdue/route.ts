import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAsync } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const overdueJobs = await prisma.job.findMany({
    where: {
      status: { in: ["ACCEPTED", "IN_PROGRESS"] },
      project: {
        dueDate: { lt: now },
      },
    },
    include: {
      project: { select: { id: true, name: true, dueDate: true } },
      linguist: { select: { id: true, email: true, name: true } },
    },
  });

  const deadlineReminderJobs = await prisma.job.findMany({
    where: {
      status: { in: ["ACCEPTED", "IN_PROGRESS"] },
      project: {
        dueDate: { gte: now, lte: oneDayFromNow },
      },
    },
    include: {
      project: { select: { id: true, name: true, dueDate: true } },
      linguist: { select: { id: true, email: true, name: true } },
    },
  });

  let notified = 0;

  for (const job of overdueJobs) {
    if (!job.linguist?.email) continue;
    const dueDate = job.project.dueDate ?? now;
    const hoursOverdue = Math.round((now.getTime() - dueDate.getTime()) / 3600000);

    notifyAsync({
      eventKey: "job.overdue",
      recipients: [{ userId: job.linguist.id, email: job.linguist.email }],
      vars: {
        linguist_name: job.linguist.name ?? job.linguist.email,
        project_name: job.project.name,
        target_language: job.targetLanguage,
        deadline: dueDate.toLocaleDateString(),
        hours_overdue: String(hoursOverdue),
        task_url: `/portal/jobs/${job.id}`,
        support_email: "support@contentech.io",
      },
    });
    notified++;
  }

  for (const job of deadlineReminderJobs) {
    if (!job.linguist?.email) continue;
    const dueDate = job.project.dueDate ?? now;
    const hoursRemaining = Math.round((dueDate.getTime() - now.getTime()) / 3600000);

    const pendingSegments = await prisma.translationSegment.count({
      where: {
        document: { projectId: job.projectId },
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
    });

    notifyAsync({
      eventKey: "job.deadline_reminder",
      recipients: [{ userId: job.linguist.id, email: job.linguist.email }],
      vars: {
        linguist_name: job.linguist.name ?? job.linguist.email,
        project_name: job.project.name,
        target_language: job.targetLanguage,
        deadline: dueDate.toLocaleDateString(),
        hours_remaining: String(hoursRemaining),
        segments_remaining: String(pendingSegments),
        task_url: `/portal/jobs/${job.id}`,
      },
    });
    notified++;
  }

  return NextResponse.json({
    ok: true,
    overdueCount: overdueJobs.length,
    reminderCount: deadlineReminderJobs.length,
    notified,
  });
}
