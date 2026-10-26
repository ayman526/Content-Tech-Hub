import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";

export type WebhookEvent =
  | "job.created"
  | "job.completed"
  | "job.failed"
  | "project.completed"
  | "project.cancelled";

/**
 * Deliver a webhook event to all active subscribers for an organization.
 * Each delivery attempt is logged. Failures increment the failureCount.
 * Subscriptions with 5+ consecutive failures are auto-disabled.
 */
export async function fireWebhooks(
  organizationId: string,
  event: WebhookEvent,
  payload: Record<string, any>
): Promise<void> {
  const subs = await prisma.webhookSubscription.findMany({
    where: { organizationId, isActive: true, events: { has: event } },
  });

  if (subs.length === 0) return;

  const timestamp = Math.floor(Date.now() / 1000);
  const body = JSON.stringify({ event, timestamp, data: payload });

  await Promise.all(
    subs.map(async (sub) => {
      const signature = createHmac("sha256", sub.secret)
        .update(`${timestamp}.${body}`)
        .digest("hex");

      let responseStatus: number | null = null;
      let responseBody: string | null = null;
      let success = false;

      try {
        const res = await fetch(sub.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Contentech-Signature": `t=${timestamp},v1=${signature}`,
            "X-Contentech-Event": event,
          },
          body,
          signal: AbortSignal.timeout(10_000),
        });
        responseStatus = res.status;
        responseBody = await res.text().catch(() => "");
        success = res.status >= 200 && res.status < 300;
      } catch (err: any) {
        responseBody = err?.message ?? "Network error";
      }

      await prisma.webhookDelivery.create({
        data: {
          webhookSubscriptionId: sub.id,
          event,
          payload,
          responseStatus,
          responseBody,
          success,
        },
      });

      if (success) {
        await prisma.webhookSubscription.update({
          where: { id: sub.id },
          data: { lastFiredAt: new Date(), failureCount: 0 },
        });
      } else {
        const updated = await prisma.webhookSubscription.update({
          where: { id: sub.id },
          data: { failureCount: { increment: 1 } },
          select: { failureCount: true },
        });
        if (updated.failureCount >= 5) {
          await prisma.webhookSubscription.update({
            where: { id: sub.id },
            data: { isActive: false },
          });
        }
      }
    })
  );
}
