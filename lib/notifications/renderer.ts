const DEFAULTS: Record<string, string> = {
  user_name: "there",
  support_email: "support@contentech.io",
  inviter_name: "A team member",
  client_name: "Your client",
  linguist_name: "Your linguist",
  org_name: "your organization",
  dept_name: "your department",
  provider_name: "Unknown provider",
  issue_count: "0",
  revision_note: "(no note provided)",
};

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeUrl(url: string): string | undefined {
  if (url.startsWith("/") || url.startsWith("https://") || url.startsWith("http://")) {
    return url;
  }
  return undefined;
}

function renderVarsRaw(template: string, vars: Record<string, string | number | undefined>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const val = vars[key];
    if (val !== undefined && val !== null && val !== "") {
      return String(val);
    }
    const def = DEFAULTS[key];
    if (def !== undefined) {
      return def;
    }
    console.warn(`[Notifications] Missing variable: {{${key}}}`);
    return "";
  });
}

function renderVarsHtml(template: string, vars: Record<string, string | number | undefined>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const val = vars[key];
    if (val !== undefined && val !== null && val !== "") {
      return escapeHtml(String(val));
    }
    const def = DEFAULTS[key];
    if (def !== undefined) {
      return escapeHtml(def);
    }
    console.warn(`[Notifications] Missing variable: {{${key}}}`);
    return "";
  });
}

export function renderTemplate(
  template: {
    subject?: string | null;
    htmlBody?: string | null;
    textBody?: string | null;
    ctaLabel?: string | null;
    ctaUrl?: string | null;
    inAppTitle?: string | null;
    inAppBody?: string | null;
    inAppLink?: string | null;
  },
  vars: Record<string, string | number | undefined>
) {
  const rawInAppTitle = template.inAppTitle ? renderVarsRaw(template.inAppTitle, vars) : undefined;
  const rawInAppBody = template.inAppBody ? renderVarsRaw(template.inAppBody, vars) : undefined;
  const rawInAppLink = template.inAppLink ? renderVarsRaw(template.inAppLink, vars) : undefined;
  const rawCtaUrl = template.ctaUrl ? renderVarsRaw(template.ctaUrl, vars) : undefined;
  const rawCtaLabel = template.ctaLabel ? renderVarsRaw(template.ctaLabel, vars) : undefined;

  return {
    subject: template.subject ? renderVarsRaw(template.subject, vars) : undefined,
    htmlBody: template.htmlBody ? renderVarsHtml(template.htmlBody, vars) : undefined,
    textBody: template.textBody ? renderVarsRaw(template.textBody, vars) : undefined,
    ctaLabel: rawCtaLabel ?? undefined,
    ctaUrl: rawCtaUrl ? safeUrl(rawCtaUrl) : undefined,
    inAppTitle: rawInAppTitle ? escapeHtml(rawInAppTitle) : undefined,
    inAppBody: rawInAppBody ? escapeHtml(rawInAppBody) : undefined,
    inAppLink: rawInAppLink ? safeUrl(rawInAppLink) : undefined,
  };
}
