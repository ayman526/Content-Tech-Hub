import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

type TemplateInput = {
  eventKey: string;
  channel: string;
  audienceType?: string;
  language?: string;
  subject?: string;
  htmlBody?: string;
  textBody?: string;
  inAppTitle?: string;
  inAppBody?: string;
  inAppLink?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  variables?: string[];
  priority?: string;
  isActive?: boolean;
  isCritical?: boolean;
};

const templates: TemplateInput[] = [
  // ── 1. user.welcome ─────────────────────────────────────────────────────
  {
    eventKey: "user.welcome",
    channel: "email",
    subject: "Welcome to Contentech, {{user_name}}",
    htmlBody: `<h2 style="color:#33475B;font-size:20px;font-weight:700;margin:0 0 16px">Welcome to Contentech</h2>
<p style="color:#33475B;margin:0 0 12px">Hi {{user_name}},</p>
<p style="color:#516F90;margin:0 0 12px">Your account is ready. Contentech combines AI-powered translation with certified linguists — giving you speed without sacrificing accuracy.</p>
<p style="color:#516F90;margin:0 0 8px">Here is what you can do right now:</p>
<ul style="color:#516F90;padding-left:20px;margin:0 0 12px">
  <li style="margin-bottom:6px">Upload a document and get an instant AI draft</li>
  <li style="margin-bottom:6px">Invite your in-house linguists</li>
  <li style="margin-bottom:6px">Connect your own API key (BYOK) for full data control</li>
</ul>
<p style="color:#516F90;margin:0">If you have any questions, reply to this email or reach us at <a href="mailto:{{support_email}}" style="color:#0091AE">{{support_email}}</a>.</p>`,
    textBody: `Welcome to Contentech, {{user_name}}.

Your account is ready. You can now upload documents, manage translation workflows, and invite your team.

Get started: {{dashboard_url}}

Questions? Contact us at {{support_email}}.`,
    ctaLabel: "Go to Dashboard",
    ctaUrl: "{{dashboard_url}}",
    variables: ["user_name", "dashboard_url", "support_email"],
    priority: "high",
    isActive: true,
    isCritical: false,
  },
  {
    eventKey: "user.welcome",
    channel: "inapp",
    inAppTitle: "Welcome to Contentech",
    inAppBody: "Your account is ready. Start by uploading a document or exploring the dashboard.",
    inAppLink: "{{dashboard_url}}",
    variables: ["dashboard_url"],
    priority: "high",
    isActive: true,
    isCritical: false,
  },

  // ── 2. user.email_verification ───────────────────────────────────────────
  {
    eventKey: "user.email_verification",
    channel: "email",
    subject: "Verify your email address — Contentech",
    htmlBody: `<h2 style="color:#33475B;font-size:20px;font-weight:700;margin:0 0 16px">Verify your email address</h2>
<p style="color:#33475B;margin:0 0 12px">Hi {{user_name}},</p>
<p style="color:#516F90;margin:0 0 12px">Click the button below to verify your email address and activate your Contentech account. This link expires in {{expiry_hours}} hours.</p>
<p style="color:#516F90;margin:0">If you did not create an account, you can safely ignore this email.</p>`,
    textBody: `Hi {{user_name}},

Please verify your email to activate your Contentech account.

Verify here: {{verification_url}}

This link expires in {{expiry_hours}} hours. If you did not sign up, ignore this email.

{{support_email}}`,
    ctaLabel: "Verify Email Address",
    ctaUrl: "{{verification_url}}",
    variables: ["user_name", "verification_url", "expiry_hours", "support_email"],
    priority: "critical",
    isActive: true,
    isCritical: true,
  },

  // ── 3. user.password_reset ───────────────────────────────────────────────
  {
    eventKey: "user.password_reset",
    channel: "email",
    subject: "Reset your Contentech password",
    htmlBody: `<h2 style="color:#33475B;font-size:20px;font-weight:700;margin:0 0 16px">Password reset request</h2>
<p style="color:#33475B;margin:0 0 12px">Hi {{user_name}},</p>
<p style="color:#516F90;margin:0 0 12px">We received a request to reset the password for your Contentech account. Click the button below to set a new password. This link expires in {{expiry_minutes}} minutes.</p>
<p style="color:#516F90;margin:0">If you did not request a password reset, no action is required. Your account remains secure.</p>`,
    textBody: `Hi {{user_name}},

A password reset was requested for your account.

Reset your password: {{reset_url}}

This link expires in {{expiry_minutes}} minutes. If you did not request this, ignore this email.

{{support_email}}`,
    ctaLabel: "Reset Password",
    ctaUrl: "{{reset_url}}",
    variables: ["user_name", "reset_url", "expiry_minutes", "support_email"],
    priority: "critical",
    isActive: true,
    isCritical: true,
  },

  // ── 4. user.invitation ───────────────────────────────────────────────────
  {
    eventKey: "user.invitation",
    channel: "email",
    subject: "{{inviter_name}} invited you to join {{org_name}} on Contentech",
    htmlBody: `<h2 style="color:#33475B;font-size:20px;font-weight:700;margin:0 0 16px">You have been invited</h2>
<p style="color:#33475B;margin:0 0 12px">Hi,</p>
<p style="color:#516F90;margin:0 0 12px"><strong>{{inviter_name}}</strong> has invited you to join <strong>{{org_name}}</strong> as an Internal Linguist on Contentech.</p>
<p style="color:#516F90;margin:0 0 12px">Accept the invitation to access your workspace and collaborate with your team. This link expires in 7 days.</p>
<p style="color:#516F90;font-size:12px;margin:0">If you did not expect this invitation, you can safely ignore this email.</p>`,
    textBody: `You have been invited to join {{org_name}} on Contentech.

{{inviter_name}} wants you to join as an Internal Linguist.

Accept your invitation: {{invite_link}}

This link expires in 7 days.

{{support_email}}`,
    ctaLabel: "Accept Invitation",
    ctaUrl: "{{invite_link}}",
    variables: ["inviter_name", "org_name", "invite_link", "support_email"],
    priority: "high",
    isActive: true,
    isCritical: false,
  },

  // ── 5. project.created ───────────────────────────────────────────────────
  {
    eventKey: "project.created",
    channel: "email",
    subject: `Project "{{project_name}}" created successfully`,
    htmlBody: `<h2 style="color:#33475B;font-size:20px;font-weight:700;margin:0 0 16px">Project created</h2>
<p style="color:#33475B;margin:0 0 12px">Hi {{user_name}},</p>
<p style="color:#516F90;margin:0 0 16px">Your project <strong style="color:#33475B">{{project_name}}</strong> has been created and is now queued for processing.</p>
<table style="border-collapse:collapse;width:100%;font-size:13px;color:#516F90">
  <tr><td style="padding:6px 0;border-bottom:1px solid #eee">Source language</td><td style="padding:6px 0;border-bottom:1px solid #eee;font-weight:600;color:#33475B">{{source_language}}</td></tr>
  <tr><td style="padding:6px 0;border-bottom:1px solid #eee">Target languages</td><td style="padding:6px 0;border-bottom:1px solid #eee;font-weight:600;color:#33475B">{{target_languages}}</td></tr>
  <tr><td style="padding:6px 0;border-bottom:1px solid #eee">Workflow</td><td style="padding:6px 0;border-bottom:1px solid #eee;font-weight:600;color:#33475B">{{workflow_type}}</td></tr>
  <tr><td style="padding:6px 0">Word count</td><td style="padding:6px 0;font-weight:600;color:#33475B">{{word_count}} words · {{credit_estimate}} credits</td></tr>
</table>`,
    textBody: `Hi {{user_name}},

Your project "{{project_name}}" has been created.

Source: {{source_language}}
Targets: {{target_languages}}
Workflow: {{workflow_type}}
Words: {{word_count}} ({{credit_estimate}} credits)

View project: {{project_url}}`,
    ctaLabel: "View Project",
    ctaUrl: "{{project_url}}",
    variables: ["user_name", "project_name", "project_id", "source_language", "target_languages", "workflow_type", "word_count", "credit_estimate", "project_url"],
    priority: "normal",
    isActive: true,
    isCritical: false,
  },
  {
    eventKey: "project.created",
    channel: "inapp",
    inAppTitle: `Project "{{project_name}}" created`,
    inAppBody: "{{word_count}} words · {{target_languages}} · {{workflow_type}}",
    inAppLink: "{{project_url}}",
    variables: ["project_name", "word_count", "target_languages", "workflow_type", "project_url"],
    priority: "normal",
    isActive: true,
    isCritical: false,
  },

  // ── 6. project.assigned ──────────────────────────────────────────────────
  {
    eventKey: "project.assigned",
    channel: "email",
    subject: `New assignment: "{{project_name}}" ({{source_language}} → {{target_language}})`,
    htmlBody: `<h2 style="color:#33475B;font-size:20px;font-weight:700;margin:0 0 16px">New assignment</h2>
<p style="color:#33475B;margin:0 0 12px">Hi {{linguist_name}},</p>
<p style="color:#516F90;margin:0 0 16px">You have been assigned to a new translation job.</p>
<table style="border-collapse:collapse;width:100%;font-size:13px;color:#516F90">
  <tr><td style="padding:6px 0;border-bottom:1px solid #eee">Project</td><td style="padding:6px 0;border-bottom:1px solid #eee;font-weight:600;color:#33475B">{{project_name}}</td></tr>
  <tr><td style="padding:6px 0;border-bottom:1px solid #eee">Language pair</td><td style="padding:6px 0;border-bottom:1px solid #eee;font-weight:600;color:#33475B">{{source_language}} → {{target_language}}</td></tr>
  <tr><td style="padding:6px 0;border-bottom:1px solid #eee">Workflow</td><td style="padding:6px 0;border-bottom:1px solid #eee;font-weight:600;color:#33475B">{{workflow_type}}</td></tr>
  <tr><td style="padding:6px 0;border-bottom:1px solid #eee">Word count</td><td style="padding:6px 0;border-bottom:1px solid #eee;font-weight:600;color:#33475B">{{word_count}} words</td></tr>
  <tr><td style="padding:6px 0">Deadline</td><td style="padding:6px 0;font-weight:600;color:#FF7A59">{{deadline}}</td></tr>
</table>`,
    textBody: `Hi {{linguist_name}},

You have a new assignment on Contentech.

Project: {{project_name}}
Language pair: {{source_language}} → {{target_language}}
Workflow: {{workflow_type}}
Words: {{word_count}}
Deadline: {{deadline}}

Open your assignment: {{assignment_url}}`,
    ctaLabel: "Open Assignment",
    ctaUrl: "{{assignment_url}}",
    variables: ["linguist_name", "project_name", "project_id", "source_language", "target_language", "word_count", "workflow_type", "deadline", "assignment_url"],
    priority: "high",
    isActive: true,
    isCritical: false,
  },
  {
    eventKey: "project.assigned",
    channel: "inapp",
    inAppTitle: "New assignment: {{project_name}}",
    inAppBody: "{{source_language}} → {{target_language}} · {{word_count}} words · Due {{deadline}}",
    inAppLink: "{{assignment_url}}",
    variables: ["project_name", "source_language", "target_language", "word_count", "deadline", "assignment_url"],
    priority: "high",
    isActive: true,
    isCritical: false,
  },

  // ── 7. task.assigned ─────────────────────────────────────────────────────
  {
    eventKey: "task.assigned",
    channel: "email",
    subject: "Task assigned: {{task_name}} in \"{{project_name}}\"",
    htmlBody: `<h2 style="color:#33475B;font-size:20px;font-weight:700;margin:0 0 16px">Task assigned to you</h2>
<p style="color:#33475B;margin:0 0 12px">Hi {{linguist_name}},</p>
<p style="color:#516F90;margin:0 0 16px">A task has been assigned to you in <strong style="color:#33475B">{{project_name}}</strong>. Please review the source content and begin work at your earliest convenience.</p>
<table style="border-collapse:collapse;width:100%;font-size:13px;color:#516F90">
  <tr><td style="padding:6px 0;border-bottom:1px solid #eee">Task</td><td style="padding:6px 0;border-bottom:1px solid #eee;font-weight:600;color:#33475B">{{task_name}}</td></tr>
  <tr><td style="padding:6px 0;border-bottom:1px solid #eee">Language pair</td><td style="padding:6px 0;border-bottom:1px solid #eee;font-weight:600;color:#33475B">{{source_language}} → {{target_language}}</td></tr>
  <tr><td style="padding:6px 0;border-bottom:1px solid #eee">Segments</td><td style="padding:6px 0;border-bottom:1px solid #eee;font-weight:600;color:#33475B">{{word_count}} words</td></tr>
  <tr><td style="padding:6px 0">Due</td><td style="padding:6px 0;font-weight:600;color:#FF7A59">{{deadline}}</td></tr>
</table>`,
    textBody: `Hi {{linguist_name}},

You have been assigned a task in "{{project_name}}".

Task: {{task_name}}
Language: {{source_language}} → {{target_language}}
Words: {{word_count}}
Deadline: {{deadline}}

Open task: {{task_url}}`,
    ctaLabel: "Start Task",
    ctaUrl: "{{task_url}}",
    variables: ["linguist_name", "task_name", "task_id", "project_name", "source_language", "target_language", "word_count", "deadline", "task_url"],
    priority: "high",
    isActive: true,
    isCritical: false,
  },
  {
    eventKey: "task.assigned",
    channel: "inapp",
    inAppTitle: "Task assigned: {{task_name}}",
    inAppBody: "In \"{{project_name}}\" · {{source_language}} → {{target_language}} · Due {{deadline}}",
    inAppLink: "{{task_url}}",
    variables: ["task_name", "project_name", "source_language", "target_language", "deadline", "task_url"],
    priority: "high",
    isActive: true,
    isCritical: false,
  },

  // ── 8. task.delivered ────────────────────────────────────────────────────
  {
    eventKey: "task.delivered",
    channel: "email",
    subject: "{{linguist_name}} delivered \"{{project_name}}\" ({{target_language}})",
    htmlBody: `<h2 style="color:#33475B;font-size:20px;font-weight:700;margin:0 0 16px">Delivery received</h2>
<p style="color:#33475B;margin:0 0 12px">Hi {{client_name}},</p>
<p style="color:#516F90;margin:0 0 16px">Your linguist <strong style="color:#33475B">{{linguist_name}}</strong> has completed and delivered the {{target_language}} translation of <strong style="color:#33475B">{{project_name}}</strong>.</p>
<table style="border-collapse:collapse;width:100%;font-size:13px;color:#516F90">
  <tr><td style="padding:6px 0;border-bottom:1px solid #eee">Words delivered</td><td style="padding:6px 0;border-bottom:1px solid #eee;font-weight:600;color:#33475B">{{word_count}}</td></tr>
  <tr><td style="padding:6px 0">Issues flagged</td><td style="padding:6px 0;font-weight:600;color:#33475B">{{issue_count}}</td></tr>
</table>
<p style="color:#516F90;margin-top:16px">Review the translation and approve it to download the final document and write approved segments back to your Translation Memory.</p>`,
    textBody: `Hi {{client_name}},

{{linguist_name}} has delivered the {{target_language}} translation of "{{project_name}}".

Words: {{word_count}}
Issues flagged: {{issue_count}}

Review and approve: {{project_url}}`,
    ctaLabel: "Review Delivery",
    ctaUrl: "{{project_url}}",
    variables: ["client_name", "linguist_name", "project_name", "target_language", "word_count", "issue_count", "project_url"],
    priority: "high",
    isActive: true,
    isCritical: false,
  },
  {
    eventKey: "task.delivered",
    channel: "inapp",
    inAppTitle: "Delivery: \"{{project_name}}\" ({{target_language}})",
    inAppBody: "{{linguist_name}} submitted {{word_count}} words. {{issue_count}} issues flagged.",
    inAppLink: "{{project_url}}",
    variables: ["project_name", "target_language", "linguist_name", "word_count", "issue_count", "project_url"],
    priority: "high",
    isActive: true,
    isCritical: false,
  },

  // ── 9. task.revision_requested ───────────────────────────────────────────
  {
    eventKey: "task.revision_requested",
    channel: "email",
    subject: "Revision requested on \"{{project_name}}\" — {{target_language}}",
    htmlBody: `<h2 style="color:#33475B;font-size:20px;font-weight:700;margin:0 0 16px">Revision requested</h2>
<p style="color:#33475B;margin:0 0 12px">Hi {{linguist_name}},</p>
<p style="color:#516F90;margin:0 0 12px"><strong style="color:#33475B">{{client_name}}</strong> has requested a revision on the {{target_language}} translation of <strong style="color:#33475B">{{project_name}}</strong>.</p>
<blockquote style="border-left:3px solid #0091AE;margin:16px 0;padding:8px 16px;color:#516F90;font-style:italic">{{revision_note}}</blockquote>
<p style="color:#516F90;margin:0">Please review the flagged segments, make the requested changes, and resubmit.</p>`,
    textBody: `Hi {{linguist_name}},

{{client_name}} has requested a revision on "{{project_name}}" ({{target_language}}).

Note: {{revision_note}}

Open your task to review and resubmit: {{task_url}}`,
    ctaLabel: "View Revision Request",
    ctaUrl: "{{task_url}}",
    variables: ["linguist_name", "client_name", "project_name", "target_language", "revision_note", "task_url"],
    priority: "high",
    isActive: true,
    isCritical: false,
  },
  {
    eventKey: "task.revision_requested",
    channel: "inapp",
    inAppTitle: "Revision requested: {{project_name}}",
    inAppBody: "{{client_name}} requested changes to the {{target_language}} translation.",
    inAppLink: "{{task_url}}",
    variables: ["project_name", "client_name", "target_language", "task_url"],
    priority: "high",
    isActive: true,
    isCritical: false,
  },

  // ── 10. task.approved ────────────────────────────────────────────────────
  {
    eventKey: "task.approved",
    channel: "email",
    subject: "Your work on \"{{project_name}}\" has been approved",
    htmlBody: `<h2 style="color:#33475B;font-size:20px;font-weight:700;margin:0 0 16px">Work approved</h2>
<p style="color:#33475B;margin:0 0 12px">Hi {{linguist_name}},</p>
<p style="color:#516F90;margin:0 0 12px">Great news — <strong style="color:#33475B">{{client_name}}</strong> has approved your {{target_language}} translation of <strong style="color:#33475B">{{project_name}}</strong>.</p>
<p style="color:#516F90;margin:0">Your approved segments have been written back to the client's Translation Memory. Thank you for your work.</p>`,
    textBody: `Hi {{linguist_name}},

Your {{target_language}} translation of "{{project_name}}" has been approved by {{client_name}}.

Your approved segments have been saved to the Translation Memory.

View project: {{project_url}}`,
    ctaLabel: "View Project",
    ctaUrl: "{{project_url}}",
    variables: ["linguist_name", "project_name", "target_language", "client_name", "project_url"],
    priority: "normal",
    isActive: true,
    isCritical: false,
  },
  {
    eventKey: "task.approved",
    channel: "inapp",
    inAppTitle: "Approved: {{project_name}} ({{target_language}})",
    inAppBody: "{{client_name}} approved your translation. Segments written to TM.",
    inAppLink: "{{project_url}}",
    variables: ["project_name", "target_language", "client_name", "project_url"],
    priority: "normal",
    isActive: true,
    isCritical: false,
  },

  // ── 11. job.deadline_reminder ────────────────────────────────────────────
  {
    eventKey: "job.deadline_reminder",
    channel: "email",
    subject: "Deadline reminder: \"{{project_name}}\" is due in {{hours_remaining}} hours",
    htmlBody: `<h2 style="color:#33475B;font-size:20px;font-weight:700;margin:0 0 16px">Deadline approaching</h2>
<p style="color:#33475B;margin:0 0 12px">Hi {{linguist_name}},</p>
<p style="color:#516F90;margin:0 0 12px">Your assignment for <strong style="color:#33475B">{{project_name}}</strong> ({{target_language}}) is due in <strong style="color:#FF7A59">{{hours_remaining}} hours</strong> on {{deadline}}.</p>
<p style="color:#516F90;margin:0">You have <strong>{{segments_remaining}} segments</strong> remaining. Open the editor to continue.</p>`,
    textBody: `Hi {{linguist_name}},

Reminder: Your assignment for "{{project_name}}" ({{target_language}}) is due in {{hours_remaining}} hours ({{deadline}}).

{{segments_remaining}} segments remaining.

Open assignment: {{task_url}}`,
    ctaLabel: "Open Assignment",
    ctaUrl: "{{task_url}}",
    variables: ["linguist_name", "project_name", "target_language", "deadline", "hours_remaining", "segments_remaining", "task_url"],
    priority: "high",
    isActive: true,
    isCritical: false,
  },
  {
    eventKey: "job.deadline_reminder",
    channel: "inapp",
    inAppTitle: "Due in {{hours_remaining}}h: {{project_name}}",
    inAppBody: "{{target_language}} · {{segments_remaining}} segments remaining · Due {{deadline}}",
    inAppLink: "{{task_url}}",
    variables: ["hours_remaining", "project_name", "target_language", "segments_remaining", "deadline", "task_url"],
    priority: "high",
    isActive: true,
    isCritical: false,
  },

  // ── 12. job.overdue ──────────────────────────────────────────────────────
  {
    eventKey: "job.overdue",
    channel: "email",
    subject: "Overdue: \"{{project_name}}\" ({{target_language}}) — action required",
    htmlBody: `<h2 style="color:#FF7A59;font-size:20px;font-weight:700;margin:0 0 16px">Assignment overdue</h2>
<p style="color:#33475B;margin:0 0 12px">Hi {{linguist_name}},</p>
<p style="color:#516F90;margin:0 0 12px">Your assignment for <strong style="color:#33475B">{{project_name}}</strong> ({{target_language}}) was due on {{deadline}} and is now <strong style="color:#FF7A59">{{hours_overdue}} hours overdue</strong>.</p>
<p style="color:#516F90;margin:0">Please complete and submit your work immediately. If you are unable to complete this assignment, contact your project manager or reach us at <a href="mailto:{{support_email}}" style="color:#0091AE">{{support_email}}</a> so we can reassign the job.</p>`,
    textBody: `Hi {{linguist_name}},

OVERDUE: Your assignment for "{{project_name}}" ({{target_language}}) was due {{deadline}} and is {{hours_overdue}} hours late.

Please submit your work immediately or contact us at {{support_email}} to arrange reassignment.

Open assignment: {{task_url}}`,
    ctaLabel: "Open Assignment Now",
    ctaUrl: "{{task_url}}",
    variables: ["linguist_name", "project_name", "target_language", "deadline", "hours_overdue", "task_url", "support_email"],
    priority: "critical",
    isActive: true,
    isCritical: true,
  },
  {
    eventKey: "job.overdue",
    channel: "inapp",
    inAppTitle: "Overdue: {{project_name}} ({{target_language}})",
    inAppBody: "{{hours_overdue}} hours past deadline. Submit immediately or contact support.",
    inAppLink: "{{task_url}}",
    variables: ["project_name", "target_language", "hours_overdue", "task_url"],
    priority: "critical",
    isActive: true,
    isCritical: true,
  },

  // ── 13. system.provider_failure ──────────────────────────────────────────
  {
    eventKey: "system.provider_failure",
    channel: "email",
    subject: "[ALERT] AI provider failure: {{provider_name}}",
    htmlBody: `<h2 style="color:#FF7A59;font-size:20px;font-weight:700;margin:0 0 16px">Provider failure detected</h2>
<p style="color:#516F90;margin:0 0 16px">An AI provider health check has failed. Affected translation jobs may be queuing or failing.</p>
<table style="border-collapse:collapse;width:100%;font-size:13px;color:#516F90">
  <tr><td style="padding:6px 0;border-bottom:1px solid #eee">Provider</td><td style="padding:6px 0;border-bottom:1px solid #eee;font-weight:600;color:#33475B">{{provider_name}} ({{provider_type}})</td></tr>
  <tr><td style="padding:6px 0;border-bottom:1px solid #eee">Detected at</td><td style="padding:6px 0;border-bottom:1px solid #eee;font-weight:600;color:#33475B">{{failed_at}}</td></tr>
  <tr><td style="padding:6px 0;border-bottom:1px solid #eee">Affected models</td><td style="padding:6px 0;border-bottom:1px solid #eee;font-weight:600;color:#33475B">{{affected_models}}</td></tr>
  <tr><td style="padding:6px 0">Error</td><td style="padding:6px 0;font-weight:600;color:#FF7A59">{{error_message}}</td></tr>
</table>
<p style="color:#516F90;margin-top:16px">Review the provider status and consider activating a fallback rule to redirect traffic to an available provider.</p>`,
    textBody: `[ALERT] AI provider failure detected on Contentech.

Provider: {{provider_name}} ({{provider_type}})
Detected: {{failed_at}}
Affected models: {{affected_models}}
Error: {{error_message}}

Review AI config: {{admin_ai_config_url}}`,
    ctaLabel: "View AI Config",
    ctaUrl: "{{admin_ai_config_url}}",
    variables: ["provider_name", "provider_type", "error_message", "failed_at", "affected_models", "admin_ai_config_url"],
    priority: "critical",
    isActive: true,
    isCritical: true,
  },
  {
    eventKey: "system.provider_failure",
    channel: "inapp",
    inAppTitle: "[Alert] Provider failure: {{provider_name}}",
    inAppBody: "{{error_message}} — Detected {{failed_at}}. Review routing rules.",
    inAppLink: "{{admin_ai_config_url}}",
    variables: ["provider_name", "error_message", "failed_at", "admin_ai_config_url"],
    priority: "critical",
    isActive: true,
    isCritical: true,
  },

  // ── 14. billing.trial_ending ─────────────────────────────────────────────
  {
    eventKey: "billing.trial_ending",
    channel: "email",
    subject: "Your Contentech trial ends in {{days_remaining}} days",
    htmlBody: `<h2 style="color:#33475B;font-size:20px;font-weight:700;margin:0 0 16px">Your trial is ending soon</h2>
<p style="color:#33475B;margin:0 0 12px">Hi {{user_name}},</p>
<p style="color:#516F90;margin:0 0 12px">Your <strong style="color:#33475B">{{plan_name}}</strong> trial ends in <strong>{{days_remaining}} days</strong> on {{trial_end_date}}.</p>
<p style="color:#516F90;margin:0 0 12px">To keep access to all features — including platform credits, preferred linguist routing, and unlimited documents — upgrade before your trial expires.</p>
<p style="color:#516F90;margin:0">After the trial period, your account will revert to the free Starter tier.</p>`,
    textBody: `Hi {{user_name}},

Your {{plan_name}} trial ends in {{days_remaining}} days ({{trial_end_date}}).

Upgrade to keep full access: {{upgrade_url}}

Questions? {{support_email}}`,
    ctaLabel: "Upgrade Now",
    ctaUrl: "{{upgrade_url}}",
    variables: ["user_name", "plan_name", "days_remaining", "trial_end_date", "upgrade_url", "support_email"],
    priority: "high",
    isActive: true,
    isCritical: false,
  },
  {
    eventKey: "billing.trial_ending",
    channel: "inapp",
    inAppTitle: "Trial ends in {{days_remaining}} days",
    inAppBody: "Upgrade to {{plan_name}} to keep access to all features.",
    inAppLink: "{{upgrade_url}}",
    variables: ["days_remaining", "plan_name", "upgrade_url"],
    priority: "high",
    isActive: true,
    isCritical: false,
  },

  // ── 15. billing.payment_failed ───────────────────────────────────────────
  {
    eventKey: "billing.payment_failed",
    channel: "email",
    subject: "Payment failed — action required to keep your Contentech subscription",
    htmlBody: `<h2 style="color:#33475B;font-size:20px;font-weight:700;margin:0 0 16px">Payment unsuccessful</h2>
<p style="color:#33475B;margin:0 0 12px">Hi {{user_name}},</p>
<p style="color:#516F90;margin:0 0 12px">We were unable to process the payment of <strong>{{amount}} {{currency}}</strong> for your <strong style="color:#33475B">{{plan_name}}</strong> subscription on {{failed_at}}.</p>
<p style="color:#516F90;margin:0">Please update your payment method before {{retry_date}} to avoid service interruption. If payment continues to fail, your account will be downgraded to the free Starter tier.</p>`,
    textBody: `Hi {{user_name}},

We could not process your payment of {{amount}} {{currency}} for your {{plan_name}} plan ({{failed_at}}).

Please update your payment method before {{retry_date}} to avoid interruption.

Update payment: {{billing_url}}

Need help? {{support_email}}`,
    ctaLabel: "Update Payment Method",
    ctaUrl: "{{billing_url}}",
    variables: ["user_name", "plan_name", "amount", "currency", "failed_at", "retry_date", "billing_url", "support_email"],
    priority: "critical",
    isActive: true,
    isCritical: true,
  },
  {
    eventKey: "billing.payment_failed",
    channel: "inapp",
    inAppTitle: "Payment failed — action required",
    inAppBody: "{{amount}} {{currency}} could not be charged. Update your payment method by {{retry_date}}.",
    inAppLink: "{{billing_url}}",
    variables: ["amount", "currency", "retry_date", "billing_url"],
    priority: "critical",
    isActive: true,
    isCritical: true,
  },

  // ── 16. credit.low_balance ───────────────────────────────────────────────
  {
    eventKey: "credit.low_balance",
    channel: "email",
    subject: "Your Contentech credits are running low ({{credits_remaining}} remaining)",
    htmlBody: `<h2 style="color:#33475B;font-size:20px;font-weight:700;margin:0 0 16px">Credits running low</h2>
<p style="color:#33475B;margin:0 0 12px">Hi {{user_name}},</p>
<p style="color:#516F90;margin:0 0 12px">Your organization <strong style="color:#33475B">{{org_name}}</strong> has <strong style="color:#FF7A59">{{credits_remaining}} credits</strong> remaining ({{percent_remaining}}% of your allocation).</p>
<p style="color:#516F90;margin:0">Top up now to avoid interruption to your translation workflows.</p>`,
    textBody: `Hi {{user_name}},

Your organization {{org_name}} has {{credits_remaining}} credits remaining ({{percent_remaining}}%).

Top up credits: {{billing_url}}`,
    ctaLabel: "Top Up Credits",
    ctaUrl: "{{billing_url}}",
    variables: ["user_name", "org_name", "credits_remaining", "credits_total", "percent_remaining", "billing_url"],
    priority: "normal",
    isActive: true,
    isCritical: false,
  },
  {
    eventKey: "credit.low_balance",
    channel: "inapp",
    inAppTitle: "Low credit balance: {{credits_remaining}} credits left",
    inAppBody: "{{percent_remaining}}% of your credits remain. Top up to avoid job interruptions.",
    inAppLink: "{{billing_url}}",
    variables: ["credits_remaining", "percent_remaining", "billing_url"],
    priority: "normal",
    isActive: true,
    isCritical: false,
  },

  // ── 17. credit.depleted ──────────────────────────────────────────────────
  {
    eventKey: "credit.depleted",
    channel: "email",
    subject: "Your Contentech credits are exhausted — jobs paused",
    htmlBody: `<h2 style="color:#FF7A59;font-size:20px;font-weight:700;margin:0 0 16px">Credits depleted</h2>
<p style="color:#33475B;margin:0 0 12px">Hi {{user_name}},</p>
<p style="color:#516F90;margin:0 0 12px">Your organization <strong style="color:#33475B">{{org_name}}</strong> has run out of credits. New translation jobs cannot start until your balance is replenished.</p>
<p style="color:#516F90;margin:0">Next credit cycle reset: <strong>{{reset_date}}</strong>. Add credits now to resume work immediately.</p>`,
    textBody: `Hi {{user_name}},

Your organization {{org_name}} has run out of credits. Jobs are paused until credits are added.

Next reset: {{reset_date}}

Add credits: {{billing_url}}`,
    ctaLabel: "Add Credits Now",
    ctaUrl: "{{billing_url}}",
    variables: ["user_name", "org_name", "reset_date", "billing_url"],
    priority: "critical",
    isActive: true,
    isCritical: false,
  },
  {
    eventKey: "credit.depleted",
    channel: "inapp",
    inAppTitle: "Credits depleted — jobs paused",
    inAppBody: "New translation jobs cannot start until credits are added. Next reset: {{reset_date}}.",
    inAppLink: "{{billing_url}}",
    variables: ["reset_date", "billing_url"],
    priority: "critical",
    isActive: true,
    isCritical: false,
  },

  // ── 18. job.offer_received ───────────────────────────────────────────────
  {
    eventKey: "job.offer_received",
    channel: "email",
    subject: "New job offer: {{source_language}} → {{target_language}} ({{word_count}} words)",
    htmlBody: `<h2 style="color:#33475B;font-size:20px;font-weight:700;margin:0 0 16px">New job offer</h2>
<p style="color:#33475B;margin:0 0 12px">Hi {{linguist_name}},</p>
<p style="color:#516F90;margin:0 0 16px">A new translation job matching your language pair is available on the platform.</p>
<table style="border-collapse:collapse;width:100%;font-size:13px;color:#516F90">
  <tr><td style="padding:6px 0;border-bottom:1px solid #eee">Language pair</td><td style="padding:6px 0;border-bottom:1px solid #eee;font-weight:600;color:#33475B">{{source_language}} → {{target_language}}</td></tr>
  <tr><td style="padding:6px 0;border-bottom:1px solid #eee">Word count</td><td style="padding:6px 0;border-bottom:1px solid #eee;font-weight:600;color:#33475B">{{word_count}} words</td></tr>
  <tr><td style="padding:6px 0;border-bottom:1px solid #eee">Workflow</td><td style="padding:6px 0;border-bottom:1px solid #eee;font-weight:600;color:#33475B">{{workflow_type}}</td></tr>
  <tr><td style="padding:6px 0">Deadline</td><td style="padding:6px 0;font-weight:600;color:#FF7A59">{{deadline}}</td></tr>
</table>`,
    textBody: `Hi {{linguist_name}},

A new job offer matching your language pair is available.

Language: {{source_language}} → {{target_language}}
Words: {{word_count}}
Workflow: {{workflow_type}}
Deadline: {{deadline}}

View offer: {{offer_url}}`,
    ctaLabel: "View Job Offer",
    ctaUrl: "{{offer_url}}",
    variables: ["linguist_name", "source_language", "target_language", "word_count", "workflow_type", "deadline", "offer_url"],
    priority: "high",
    isActive: false,
    isCritical: false,
  },
  {
    eventKey: "job.offer_received",
    channel: "inapp",
    inAppTitle: "New job offer: {{source_language}} → {{target_language}}",
    inAppBody: "{{word_count}} words · {{workflow_type}} · Due {{deadline}}",
    inAppLink: "{{offer_url}}",
    variables: ["source_language", "target_language", "word_count", "workflow_type", "deadline", "offer_url"],
    priority: "high",
    isActive: false,
    isCritical: false,
  },

  // ── 19. invitation.accepted ──────────────────────────────────────────────
  {
    eventKey: "invitation.accepted",
    channel: "inapp",
    inAppTitle: "{{invitee_name}} accepted your invitation",
    inAppBody: "{{invitee_email}} has joined {{org_name}} as a linguist.",
    inAppLink: "{{linguists_url}}",
    variables: ["inviter_name", "invitee_name", "invitee_email", "org_name", "linguists_url"],
    priority: "normal",
    isActive: false,
    isCritical: false,
  },

  // ── 20. account.suspended ────────────────────────────────────────────────
  {
    eventKey: "account.suspended",
    channel: "email",
    subject: "Your Contentech account has been suspended",
    htmlBody: `<h2 style="color:#FF7A59;font-size:20px;font-weight:700;margin:0 0 16px">Account suspended</h2>
<p style="color:#33475B;margin:0 0 12px">Hi {{user_name}},</p>
<p style="color:#516F90;margin:0 0 12px">Your organization's Contentech account has been suspended. Access to the platform is currently restricted.</p>
<p style="color:#516F90;margin:0">If you believe this is an error or need to resolve the issue, please contact us at <a href="mailto:{{support_email}}" style="color:#0091AE">{{support_email}}</a>.</p>`,
    textBody: `Hi {{user_name}},

Your Contentech account has been suspended.

Reason: {{reason}}

To resolve this, contact us at {{support_email}}.`,
    ctaLabel: "Contact Support",
    ctaUrl: "mailto:{{support_email}}",
    variables: ["user_name", "reason", "support_email"],
    priority: "critical",
    isActive: false,
    isCritical: false,
  },
  {
    eventKey: "account.suspended",
    channel: "inapp",
    inAppTitle: "Account suspended",
    inAppBody: "Your organization's account has been suspended. Contact support to resolve.",
    inAppLink: "mailto:support@contentech.io",
    variables: ["user_name", "reason"],
    priority: "critical",
    isActive: false,
    isCritical: false,
  },

  // ── 21. account.reactivated ──────────────────────────────────────────────
  {
    eventKey: "account.reactivated",
    channel: "email",
    subject: "Your Contentech account has been reactivated",
    htmlBody: `<h2 style="color:#33475B;font-size:20px;font-weight:700;margin:0 0 16px">Account reactivated</h2>
<p style="color:#33475B;margin:0 0 12px">Hi {{user_name}},</p>
<p style="color:#516F90;margin:0">Great news — your Contentech account has been reactivated. You now have full access to the platform again.</p>`,
    textBody: `Hi {{user_name}},

Your Contentech account has been reactivated. Full access restored.

Go to dashboard: {{dashboard_url}}`,
    ctaLabel: "Go to Dashboard",
    ctaUrl: "{{dashboard_url}}",
    variables: ["user_name", "dashboard_url"],
    priority: "high",
    isActive: false,
    isCritical: false,
  },
  {
    eventKey: "account.reactivated",
    channel: "inapp",
    inAppTitle: "Account reactivated",
    inAppBody: "Your organization's account has been reactivated. Full access restored.",
    inAppLink: "{{dashboard_url}}",
    variables: ["dashboard_url"],
    priority: "high",
    isActive: false,
    isCritical: false,
  },

  // ── 22. security.password_changed ────────────────────────────────────────
  {
    eventKey: "security.password_changed",
    channel: "email",
    subject: "Your Contentech password was changed",
    htmlBody: `<h2 style="color:#33475B;font-size:20px;font-weight:700;margin:0 0 16px">Password changed</h2>
<p style="color:#33475B;margin:0 0 12px">Hi {{user_name}},</p>
<p style="color:#516F90;margin:0 0 12px">Your Contentech account password was successfully changed on {{changed_at}}.</p>
<p style="color:#516F90;margin:0">If you did not make this change, contact us immediately at <a href="mailto:{{support_email}}" style="color:#0091AE">{{support_email}}</a>.</p>`,
    textBody: `Hi {{user_name}},

Your Contentech password was changed on {{changed_at}}.

If you did not make this change, contact us immediately at {{support_email}}.`,
    ctaLabel: "Secure My Account",
    ctaUrl: "{{support_url}}",
    variables: ["user_name", "changed_at", "support_email", "support_url"],
    priority: "critical",
    isActive: true,
    isCritical: true,
  },

  // ── 23. security.suspicious_login ────────────────────────────────────────
  {
    eventKey: "security.suspicious_login",
    channel: "email",
    subject: "[Security Alert] Unrecognized login to your Contentech account",
    htmlBody: `<h2 style="color:#FF7A59;font-size:20px;font-weight:700;margin:0 0 16px">Unrecognized login detected</h2>
<p style="color:#33475B;margin:0 0 12px">Hi {{user_name}},</p>
<p style="color:#516F90;margin:0 0 12px">A login to your Contentech account was detected from an unrecognized location or device on {{login_at}}.</p>
<table style="border-collapse:collapse;width:100%;font-size:13px;color:#516F90;margin-bottom:12px">
  <tr><td style="padding:6px 0;border-bottom:1px solid #eee">Location</td><td style="padding:6px 0;border-bottom:1px solid #eee;font-weight:600;color:#33475B">{{location}}</td></tr>
  <tr><td style="padding:6px 0">Device</td><td style="padding:6px 0;font-weight:600;color:#33475B">{{device}}</td></tr>
</table>
<p style="color:#516F90;margin:0">If this was not you, reset your password immediately and contact support.</p>`,
    textBody: `Hi {{user_name}},

[Security Alert] A login was detected from an unrecognized location ({{location}}, {{device}}) on {{login_at}}.

If this was not you, reset your password immediately: {{reset_url}}

Contact us: {{support_email}}`,
    ctaLabel: "Secure My Account",
    ctaUrl: "{{reset_url}}",
    variables: ["user_name", "login_at", "location", "device", "reset_url", "support_email"],
    priority: "critical",
    isActive: true,
    isCritical: true,
  },
  {
    eventKey: "security.suspicious_login",
    channel: "inapp",
    inAppTitle: "Unrecognized login detected",
    inAppBody: "A login from {{location}} ({{device}}) was detected on {{login_at}}. If this was not you, secure your account immediately.",
    inAppLink: "{{reset_url}}",
    variables: ["location", "device", "login_at", "reset_url"],
    priority: "critical",
    isActive: true,
    isCritical: true,
  },

  // ── 24. system.maintenance_scheduled ─────────────────────────────────────
  {
    eventKey: "system.maintenance_scheduled",
    channel: "email",
    subject: "Scheduled maintenance: Contentech will be offline on {{maintenance_date}}",
    htmlBody: `<h2 style="color:#33475B;font-size:20px;font-weight:700;margin:0 0 16px">Scheduled maintenance</h2>
<p style="color:#516F90;margin:0 0 12px">Contentech will undergo scheduled maintenance on <strong style="color:#33475B">{{maintenance_date}}</strong> from <strong>{{start_time}}</strong> to <strong>{{end_time}}</strong> ({{timezone}}).</p>
<p style="color:#516F90;margin:0 0 12px">During this window, the platform will be unavailable. Please plan your work accordingly.</p>
<p style="color:#516F90;margin:0">If you have any urgent needs, contact us before the maintenance window at <a href="mailto:{{support_email}}" style="color:#0091AE">{{support_email}}</a>.</p>`,
    textBody: `Contentech Scheduled Maintenance

Date: {{maintenance_date}}
Time: {{start_time}} – {{end_time}} ({{timezone}})
Reason: {{reason}}

The platform will be unavailable during this window. Plan your work accordingly.

Questions? {{support_email}}`,
    variables: ["maintenance_date", "start_time", "end_time", "timezone", "reason", "support_email"],
    priority: "normal",
    isActive: false,
    isCritical: false,
  },
  {
    eventKey: "system.maintenance_scheduled",
    channel: "inapp",
    inAppTitle: "Scheduled maintenance on {{maintenance_date}}",
    inAppBody: "The platform will be offline from {{start_time}} to {{end_time}} ({{timezone}}).",
    variables: ["maintenance_date", "start_time", "end_time", "timezone"],
    priority: "normal",
    isActive: false,
    isCritical: false,
  },

  // ── 25. monthly.usage_summary ────────────────────────────────────────────
  {
    eventKey: "monthly.usage_summary",
    channel: "email",
    subject: "Your Contentech usage summary for {{month_name}}",
    htmlBody: `<h2 style="color:#33475B;font-size:20px;font-weight:700;margin:0 0 16px">Monthly usage summary</h2>
<p style="color:#33475B;margin:0 0 12px">Hi {{user_name}},</p>
<p style="color:#516F90;margin:0 0 16px">Here is a summary of your organization's Contentech activity for <strong style="color:#33475B">{{month_name}}</strong>.</p>
<table style="border-collapse:collapse;width:100%;font-size:13px;color:#516F90">
  <tr><td style="padding:6px 0;border-bottom:1px solid #eee">Credits consumed</td><td style="padding:6px 0;border-bottom:1px solid #eee;font-weight:600;color:#33475B">{{credits_consumed}}</td></tr>
  <tr><td style="padding:6px 0;border-bottom:1px solid #eee">Jobs completed</td><td style="padding:6px 0;border-bottom:1px solid #eee;font-weight:600;color:#33475B">{{jobs_completed}}</td></tr>
  <tr><td style="padding:6px 0;border-bottom:1px solid #eee">Words translated</td><td style="padding:6px 0;border-bottom:1px solid #eee;font-weight:600;color:#33475B">{{words_translated}}</td></tr>
  <tr><td style="padding:6px 0;border-bottom:1px solid #eee">Top language pairs</td><td style="padding:6px 0;border-bottom:1px solid #eee;font-weight:600;color:#33475B">{{top_language_pairs}}</td></tr>
  <tr><td style="padding:6px 0">Average quality score</td><td style="padding:6px 0;font-weight:600;color:#0091AE">{{avg_quality_score}}</td></tr>
</table>`,
    textBody: `Contentech monthly summary for {{month_name}}

Credits consumed: {{credits_consumed}}
Jobs completed: {{jobs_completed}}
Words translated: {{words_translated}}
Top language pairs: {{top_language_pairs}}
Avg quality score: {{avg_quality_score}}

View dashboard: {{dashboard_url}}`,
    ctaLabel: "View Dashboard",
    ctaUrl: "{{dashboard_url}}",
    variables: ["user_name", "month_name", "credits_consumed", "jobs_completed", "words_translated", "top_language_pairs", "avg_quality_score", "dashboard_url"],
    priority: "normal",
    isActive: false,
    isCritical: false,
  },

  // ── project.delivered ────────────────────────────────────────────────────
  {
    eventKey: "project.delivered",
    channel: "email",
    subject: "Your project is ready: {{project_name}}",
    htmlBody: `<h2 style="color:#33475B;font-size:20px;font-weight:700;margin:0 0 16px">Translation Delivered</h2>
<p style="color:#33475B;margin:0 0 12px">Hi {{user_name}},</p>
<p style="color:#516F90;margin:0 0 12px">Your translation project <strong>{{project_name}}</strong> has been completed and is ready for download.</p>`,
    textBody: `Hi {{user_name}},

Your translation project {{project_name}} has been completed.

View your project: {{project_link}}`,
    ctaLabel: "View Project",
    ctaUrl: "{{project_link}}",
    variables: ["user_name", "project_name", "project_link"],
    priority: "high",
    isActive: true,
    isCritical: false,
  },
  {
    eventKey: "project.delivered",
    channel: "inapp",
    inAppTitle: "Project delivered",
    inAppBody: "{{project_name}} has been translated and is ready for download.",
    inAppLink: "{{project_link}}",
    variables: ["project_name", "project_link"],
    priority: "high",
    isActive: true,
    isCritical: false,
  },

  // ── project.linguist_assigned ────────────────────────────────────────────
  {
    eventKey: "project.linguist_assigned",
    channel: "inapp",
    inAppTitle: "Linguist assigned to your project",
    inAppBody: "{{linguist_name}} has been assigned to translate {{project_name}}.",
    inAppLink: "{{project_link}}",
    variables: ["user_name", "linguist_name", "project_name", "project_link"],
    priority: "normal",
    isActive: true,
    isCritical: false,
  },

  // ── apikey.expiring_soon ─────────────────────────────────────────────────
  {
    eventKey: "apikey.expiring_soon",
    channel: "email",
    subject: "Action required: API key \"{{key_name}}\" expires in {{days_remaining}} day(s)",
    htmlBody: `<h2 style="color:#33475B;font-size:20px;font-weight:700;margin:0 0 16px">API key expiring soon</h2>
<p style="color:#33475B;margin:0 0 12px">Hi,</p>
<p style="color:#516F90;margin:0 0 12px">Your API key <strong>{{key_name}}</strong> is set to expire on <strong>{{expiry_date}}</strong> — that is in <strong>{{days_remaining}} day(s)</strong>.</p>
<p style="color:#516F90;margin:0 0 12px">Any integrations using this key (such as the Contentech WordPress plugin) will stop working once it expires. To keep your integrations running, please generate a new key and update your configuration before the expiry date.</p>
<p style="color:#516F90;margin:0">If you no longer need this key, no action is required.</p>`,
    textBody: `Your API key "{{key_name}}" expires on {{expiry_date}} (in {{days_remaining}} day(s)).

Any integrations using this key will stop working after expiry. Renew or replace it at:
{{settings_url}}

Questions? Contact us at {{support_email}}.`,
    ctaLabel: "Manage API Keys",
    ctaUrl: "{{settings_url}}",
    variables: ["key_name", "days_remaining", "expiry_date", "settings_url", "support_email"],
    priority: "high",
    isActive: true,
    isCritical: true,
  },
  {
    eventKey: "apikey.expiring_soon",
    channel: "inapp",
    inAppTitle: "API key expiring in {{days_remaining}} day(s)",
    inAppBody: "\"{{key_name}}\" expires on {{expiry_date}}. Update your integrations before it stops working.",
    inAppLink: "{{settings_url}}",
    variables: ["key_name", "days_remaining", "expiry_date", "settings_url"],
    priority: "high",
    isActive: true,
    isCritical: true,
  },
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 8000 });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("  Seeding NotificationTemplates...");
  let upserted = 0;

  for (const tpl of templates) {
    const data = {
      audienceType: tpl.audienceType ?? "user",
      language: tpl.language ?? "en",
      subject: tpl.subject ?? null,
      htmlBody: tpl.htmlBody ?? null,
      textBody: tpl.textBody ?? null,
      inAppTitle: tpl.inAppTitle ?? null,
      inAppBody: tpl.inAppBody ?? null,
      inAppLink: tpl.inAppLink ?? null,
      ctaLabel: tpl.ctaLabel ?? null,
      ctaUrl: tpl.ctaUrl ?? null,
      variables: tpl.variables ?? [],
      priority: tpl.priority ?? "normal",
      isActive: tpl.isActive ?? true,
      isCritical: tpl.isCritical ?? false,
    };

    await prisma.notificationTemplate.upsert({
      where: { eventKey_channel: { eventKey: tpl.eventKey, channel: tpl.channel } },
      create: { eventKey: tpl.eventKey, channel: tpl.channel, ...data },
      // On update: only refresh structural metadata — never overwrite content or
      // operational flags (isActive, isCritical, subject, body) that admins edit
      // via the notification templates admin UI.
      update: {
        audienceType: data.audienceType,
        language: data.language,
        variables: data.variables,
        priority: data.priority,
      },
    });
    upserted++;
  }

  console.log(`  ✓ NotificationTemplates seeded: ${upserted} upserted`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error("Seed-notifications error:", e.message);
  process.exit(1);
});
