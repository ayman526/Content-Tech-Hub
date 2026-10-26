import { prisma } from "@/lib/prisma";

export async function deliverInApp(
  userId: string,
  eventKey: string,
  title: string,
  body: string,
  link?: string,
  priority?: string
): Promise<void> {
  await prisma.inAppNotification.create({
    data: {
      userId,
      eventKey,
      title,
      body,
      link: link ?? null,
      priority: priority ?? "normal",
      isRead: false,
      read: false,
    },
  });
}
