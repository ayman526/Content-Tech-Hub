import nodemailer from "nodemailer";
import { escapeHtml } from "./renderer";

function safeCtaUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("https://") || url.startsWith("http://") || url.startsWith("/")) {
    return url;
  }
  return undefined;
}

export function renderEmailBase(
  title: string,
  bodyHtml: string,
  ctaLabel?: string,
  ctaUrl?: string,
  footerNote?: string
): string {
  const validUrl = safeCtaUrl(ctaUrl);
  const safeLabel = ctaLabel ? escapeHtml(ctaLabel) : undefined;
  const ctaSection =
    safeLabel && validUrl
      ? `
    <div style="text-align:center;margin:28px 0 8px">
      <a href="${escapeHtml(validUrl)}" style="display:inline-block;background:#FF7A59;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:13px 32px;border-radius:12px;letter-spacing:0.2px">${safeLabel}</a>
    </div>
    <p style="text-align:center;margin:10px 0 0">
      <a href="${escapeHtml(validUrl)}" style="color:#0091AE;font-size:12px;text-decoration:none">${escapeHtml(validUrl)}</a>
    </p>`
      : "";

  const footerText = footerNote
    ? `<p style="color:#99ACC2;font-size:11px;margin:8px 0 0;text-align:center">${footerNote}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
</head>
<body style="margin:0;padding:40px 0;background:#F5F8FA;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto">
    <div style="background:#33475B;padding:24px 32px;border-radius:16px 16px 0 0">
      <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px">Contentech</p>
    </div>
    <div style="background:#ffffff;border:1px solid #CBD6E2;border-top:none;border-radius:0 0 16px 16px;padding:32px">
      ${bodyHtml}
      ${ctaSection}
    </div>
    <div style="padding:20px 0;text-align:center">
      <p style="color:#99ACC2;font-size:12px;margin:0">Questions? <a href="mailto:support@contentech.io" style="color:#0091AE;text-decoration:none">support@contentech.io</a></p>
      ${footerText}
    </div>
  </div>
</body>
</html>`;
}

export function renderEmailRtlBase(
  title: string,
  bodyHtml: string,
  ctaLabel?: string,
  ctaUrl?: string
): string {
  const validUrl = safeCtaUrl(ctaUrl);
  const safeLabel = ctaLabel ? escapeHtml(ctaLabel) : undefined;
  const ctaSection =
    safeLabel && validUrl
      ? `
    <div style="text-align:center;margin:28px 0 8px">
      <a href="${escapeHtml(validUrl)}" style="display:inline-block;background:#FF7A59;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:13px 32px;border-radius:12px">${safeLabel}</a>
    </div>
    <p style="text-align:center;margin:10px 0 0">
      <a href="${escapeHtml(validUrl)}" style="color:#0091AE;font-size:12px;text-decoration:none">${escapeHtml(validUrl)}</a>
    </p>`
      : "";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
</head>
<body style="margin:0;padding:40px 0;background:#F5F8FA;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;direction:rtl">
  <div style="max-width:560px;margin:0 auto">
    <div style="background:#33475B;padding:24px 32px;border-radius:16px 16px 0 0">
      <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700">Contentech</p>
    </div>
    <div style="background:#ffffff;border:1px solid #CBD6E2;border-top:none;border-radius:0 0 16px 16px;padding:32px">
      ${bodyHtml}
      ${ctaSection}
    </div>
    <div style="padding:20px 0;text-align:center">
      <p style="color:#99ACC2;font-size:12px;margin:0">للتواصل: <a href="mailto:support@contentech.io" style="color:#0091AE;text-decoration:none">support@contentech.io</a></p>
    </div>
  </div>
</body>
</html>`;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SingleAttemptResult {
  sent: boolean;
  error?: string;
  noSmtp?: boolean;
}

export interface EmailResult {
  sent: boolean;
  reason?: string;
  attempts: number;
  failedAt?: Date;
}

export async function sendEmailOnce(opts: SendEmailOptions): Promise<SingleAttemptResult> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT ?? "587");
  const smtpUser = process.env.SMTP_USER ?? "";
  const smtpPass = process.env.SMTP_PASS ?? "";
  const smtpFrom = process.env.SMTP_FROM ?? "noreply@contentech.io";

  if (!smtpHost) {
    console.log(`[Email] SMTP not configured — would send "${opts.subject}" to ${opts.to}`);
    return { sent: false, noSmtp: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: smtpUser ? { user: smtpUser, pass: smtpPass } : undefined,
    });

    await transporter.sendMail({
      from: `"Contentech" <${smtpFrom}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });

    return { sent: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[Email] Send failed:`, err);
    return { sent: false, error };
  }
}

export async function sendEmail(opts: SendEmailOptions): Promise<EmailResult> {
  const maxAttempts = 3;
  const backoffMs = [5000, 30000, 120000];
  let lastError: string | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await sendEmailOnce(opts);

    if (result.noSmtp) {
      return { sent: false, reason: "SMTP_NOT_CONFIGURED", attempts: 0 };
    }

    if (result.sent) {
      return { sent: true, attempts: attempt + 1 };
    }

    lastError = result.error;
    if (attempt < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, backoffMs[attempt]));
    }
  }

  return { sent: false, reason: lastError ?? "MAX_RETRIES_EXCEEDED", attempts: maxAttempts, failedAt: new Date() };
}

export function buildEmailFromTemplate(
  htmlBody: string,
  ctaLabel?: string | null,
  ctaUrl?: string | null,
  subject?: string | null
): string {
  return renderEmailBase(
    subject ?? "Contentech Notification",
    `<div style="color:#33475B;font-size:14px;line-height:1.65">${htmlBody}</div>`,
    ctaLabel ?? undefined,
    ctaUrl || undefined
  );
}
