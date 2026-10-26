import { prisma } from "@/lib/prisma";
import { renderTemplate } from "./renderer";
import { buildEmailFromTemplate, sendEmailOnce } from "./email-renderer";
import { deliverInApp } from "./inapp-delivery";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Recipient {
  userId?: string;
  email: string;
  name?: string;
}

export interface NotifyPayload {
  /** Resolved recipients — the caller is responsible for resolving who should receive this. */
  recipients: Recipient[];
  /** Template variable values — coerced to strings. */
  vars?: Record<string, string | number | undefined>;
  /** ID of the entity that caused this event (job id, project id, …). */
  entityId?: string;
  /** Type label for the entity (job | project | user | …). */
  entityType?: string;
}

export interface NotifyOptions {
  /** User id or system label of who triggered the event. */
  triggeredBy?: string;
}

/**
 * Convenience "all-in-one" options bag — used by existing call-sites.
 * The recipients are embedded here (no separate payload arg).
 */
export interface NotifyInlineOpts {
  eventKey: string;
  recipients: Recipient[];
  vars?: Record<string, string | number | undefined>;
  triggeredBy?: string;
  entityId?: string;
  entityType?: string;
}

// ─── Critical events — bypass user preferences ────────────────────────────

const CRITICAL_EVENTS = new Set([
  "user.email_verification",
  "user.password_reset",
  "billing.payment_failed",
  "job.overdue",
  "system.provider_failure",
  "security.password_changed",
  "security.suspicious_login",
  "apikey.expiring_soon",
]);

// ─── Preference helper ────────────────────────────────────────────────────

async function getUserPreference(userId: string, eventKey: string) {
  const pref = await prisma.userNotificationPreference.findUnique({
    where: { userId_eventKey: { userId, eventKey } },
  });
  return {
    emailEnabled: pref?.emailEnabled ?? true,
    inAppEnabled: pref?.inAppEnabled ?? true,
    digestMode: pref?.digestMode ?? "instant",
  };
}

function toSafeVars(vars: Record<string, string | number | undefined>): Record<string, string> {
  const safe: Record<string, string> = {};
  for (const [k, v] of Object.entries(vars)) {
    if (v !== undefined) safe[k] = String(v);
  }
  return safe;
}

// ─── Core dispatch engine ────────────────────────────────────────────────

async function _dispatch(
  eventKey: string,
  payload: NotifyPayload,
  options?: NotifyOptions
): Promise<void> {
  const { recipients, vars = {}, entityId, entityType } = payload;
  const isCritical = CRITICAL_EVENTS.has(eventKey);
  const triggeredBy = options?.triggeredBy ?? null;

  try {
    const templates = await prisma.notificationTemplate.findMany({
      where: { eventKey, isActive: true },
    });

    if (templates.length === 0) {
      console.log(`[Notify] No active templates for event: ${eventKey}`);
      return;
    }

    const safeVars = toSafeVars({
      support_email: "support@contentech.io",
      ...vars,
    });

    const recipientIds = recipients.filter((r) => r.userId).map((r) => r.userId as string);

    const notifEvent = await prisma.notificationEvent.create({
      data: {
        eventKey,
        entityType: entityType ?? null,
        entityId: entityId ?? null,
        payloadJson: safeVars,
        triggeredBy,
        recipientIds,
        variables: safeVars,
        status: "processing",
      },
    });

    let anyFailed = false;

    for (const recipient of recipients) {
      const recipientVars = { ...safeVars };

      const prefs =
        recipient.userId && !isCritical
          ? await getUserPreference(recipient.userId, eventKey)
          : { emailEnabled: true, inAppEnabled: true, digestMode: "instant" };

      for (const tpl of templates) {
        const rendered = renderTemplate(tpl, recipientVars);

        // ── Email delivery ──────────────────────────────────────────────
        if (tpl.channel === "email") {
          if (!isCritical && !prefs.emailEnabled) continue;

          const html = buildEmailFromTemplate(
            rendered.htmlBody ?? rendered.textBody ?? "",
            rendered.ctaLabel ?? tpl.ctaLabel,
            rendered.ctaUrl ?? rendered.inAppLink,
            rendered.subject
          );

          const smtpOpts = {
            to: recipient.email,
            subject: rendered.subject ?? "Contentech notification",
            html,
            text: rendered.textBody ?? undefined,
          };

          const maxAttempts = 3;
          const backoffMs = [5000, 30000, 120000];

          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const result = await sendEmailOnce(smtpOpts);

            const isLast = attempt === maxAttempts;
            const status = result.sent
              ? "sent"
              : result.noSmtp
              ? "skipped"
              : isLast
              ? "failed"
              : "retrying";

            await prisma.notificationDelivery.create({
              data: {
                templateId: tpl.id,
                eventId: notifEvent.id,
                channel: "email",
                recipient: recipient.email,
                recipientUserId: recipient.userId ?? null,
                recipientEmail: recipient.email,
                renderedSubject: rendered.subject ?? null,
                renderedBody: rendered.textBody ? rendered.textBody.substring(0, 4000) : null,
                subject: rendered.subject ?? null,
                body: rendered.textBody ? rendered.textBody.substring(0, 4000) : null,
                variables: recipientVars,
                status,
                retryCount: attempt - 1,
                attempts: attempt,
                errorMessage: result.error ?? (result.noSmtp ? "SMTP_NOT_CONFIGURED" : null),
                lastError: result.error ?? (result.noSmtp ? "SMTP_NOT_CONFIGURED" : null),
                sentAt: result.sent ? new Date() : null,
                failedAt: !result.sent && (isLast || result.noSmtp) ? new Date() : null,
              },
            });

            if (result.sent || result.noSmtp) break;
            if (isLast) anyFailed = true;
            else await new Promise((r) => setTimeout(r, backoffMs[attempt - 1]));
          }
        }

        // ── In-app delivery ─────────────────────────────────────────────
        if (tpl.channel === "inapp" && recipient.userId) {
          if (!isCritical && !prefs.inAppEnabled) continue;

          if (rendered.inAppTitle && rendered.inAppBody) {
            await deliverInApp(
              recipient.userId,
              eventKey,
              rendered.inAppTitle,
              rendered.inAppBody,
              rendered.inAppLink ?? undefined,
              tpl.priority ?? "normal"
            );

            await prisma.notificationDelivery.create({
              data: {
                templateId: tpl.id,
                eventId: notifEvent.id,
                channel: "inapp",
                recipient: recipient.userId,
                recipientUserId: recipient.userId,
                recipientEmail: recipient.email,
                renderedSubject: rendered.inAppTitle ?? null,
                renderedBody: rendered.inAppBody.substring(0, 4000),
                subject: rendered.inAppTitle ?? null,
                body: rendered.inAppBody.substring(0, 4000),
                variables: recipientVars,
                status: "sent",
                retryCount: 0,
                attempts: 1,
                sentAt: new Date(),
              },
            });
          }
        }
      }
    }

    await prisma.notificationEvent.update({
      where: { id: notifEvent.id },
      data: { status: anyFailed ? "partial" : "delivered" },
    });
  } catch (err) {
    console.error(`[Notify] Error processing event ${eventKey}:`, err);
  }
}

// ─── Public API ─────────────────────────────────────────────────────────

/**
 * Primary API: notify(eventKey, payload, options?)
 *
 * Resolves and dispatches notifications for the given event.
 * The caller is responsible for resolving who should receive the notification.
 *
 * @example
 *   await notify("task.assigned", {
 *     recipients: [{ userId: linguist.id, email: linguist.email }],
 *     vars: { linguist_name: linguist.name, project_name: project.name, ... },
 *     entityType: "job",
 *     entityId: job.id,
 *   }, { triggeredBy: adminId });
 */
export async function notify(
  eventKey: string,
  payload: NotifyPayload,
  options?: NotifyOptions
): Promise<void> {
  return _dispatch(eventKey, payload, options);
}

/**
 * Fire-and-forget variant of notify().
 * Supports two call signatures:
 *
 * New: notifyAsync(eventKey, payload, options?)
 * Legacy: notifyAsync({ eventKey, recipients, vars, triggeredBy, ... })
 */
export function notifyAsync(
  eventKeyOrOpts: string | NotifyInlineOpts,
  payload?: NotifyPayload,
  options?: NotifyOptions
): void {
  let eventKey: string;
  let resolvedPayload: NotifyPayload;
  let resolvedOptions: NotifyOptions | undefined;

  if (typeof eventKeyOrOpts === "string") {
    // New positional signature: notifyAsync(eventKey, payload, options?)
    eventKey = eventKeyOrOpts;
    resolvedPayload = payload!;
    resolvedOptions = options;
  } else {
    // Legacy inline object: notifyAsync({ eventKey, recipients, vars, triggeredBy })
    const { eventKey: ek, recipients, vars, triggeredBy, entityId, entityType } = eventKeyOrOpts;
    eventKey = ek;
    resolvedPayload = { recipients, vars, entityId, entityType };
    resolvedOptions = triggeredBy ? { triggeredBy } : undefined;
  }

  _dispatch(eventKey, resolvedPayload, resolvedOptions).catch((err) =>
    console.error(`[Notify] Unhandled error for ${eventKey}:`, err)
  );
}
