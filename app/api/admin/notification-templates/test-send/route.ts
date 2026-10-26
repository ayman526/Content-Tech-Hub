import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderTemplate } from "@/lib/notifications/renderer";
import { buildEmailFromTemplate, sendEmail } from "@/lib/notifications/email-renderer";
import { deliverInApp } from "@/lib/notifications/inapp-delivery";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { templateId, recipientEmail } = await req.json();
  if (!templateId || !recipientEmail) {
    return NextResponse.json({ error: "templateId and recipientEmail required" }, { status: 400 });
  }

  const tpl = await prisma.notificationTemplate.findUnique({ where: { id: templateId } });
  if (!tpl) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const testVars: Record<string, string> = {
    user_name: "Test User",
    org_name: "Test Organization",
    project_name: "Sample Project",
    job_id: "test-job-001",
    invite_link: "https://contentech.io/invite?token=test",
    dashboard_url: "https://contentech.io/dashboard",
    deadline: "2026-12-31",
    target_language: "Arabic",
    linguist_name: "John Doe",
    inviter_name: "Admin User",
    support_email: "support@contentech.io",
    project_link: "https://contentech.io/dashboard/projects/test",
    job_link: "https://contentech.io/portal/jobs/test-job-001",
    amount: "50.00",
    plan_name: "Professional",
    verification_url: "https://contentech.io/verify?token=test",
    expiry_hours: "48",
    reset_url: "https://contentech.io/reset-password?token=test",
    reason: "Suspicious login attempt detected",
    issue_count: "3",
    revision_note: "Please review the terminology in section 2",
  };

  const rendered = renderTemplate(tpl, testVars);
  const adminUser = session.user as { id: string; email?: string };

  if (tpl.channel === "email") {
    const html = buildEmailFromTemplate(
      rendered.htmlBody ?? rendered.textBody ?? "(no content)",
      tpl.ctaLabel,
      rendered.inAppLink ?? tpl.ctaUrl,
      rendered.subject
    );
    const result = await sendEmail({
      to: recipientEmail,
      subject: `[TEST] ${rendered.subject ?? tpl.eventKey}`,
      html,
      text: rendered.textBody ?? undefined,
    });
    return NextResponse.json({
      sent: result.sent,
      reason: result.reason,
      channel: "email",
      subject: rendered.subject,
    });
  }

  if (tpl.channel === "inapp" && adminUser.id) {
    if (rendered.inAppTitle && rendered.inAppBody) {
      await deliverInApp(
        adminUser.id,
        `${tpl.eventKey}.test`,
        `[TEST] ${rendered.inAppTitle}`,
        rendered.inAppBody,
        rendered.inAppLink ?? undefined
      );
      return NextResponse.json({ sent: true, channel: "inapp", title: rendered.inAppTitle });
    }
    return NextResponse.json({ error: "Template has no in-app content" }, { status: 400 });
  }

  return NextResponse.json({ error: "Unsupported channel" }, { status: 400 });
}
