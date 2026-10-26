"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  Mail,
  MonitorSmartphone,
  Search,
  ToggleLeft,
  ToggleRight,
  Eye,
  Filter,
  Pencil,
  X,
  Save,
  Copy,
  Send,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationTemplate {
  id: string;
  eventKey: string;
  channel: string;
  subject?: string | null;
  inAppTitle?: string | null;
  inAppBody?: string | null;
  inAppLink?: string | null;
  htmlBody?: string | null;
  textBody?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  priority: string;
  isActive: boolean;
  isCritical: boolean;
  _count?: { deliveries: number };
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  normal: "bg-gray-100 text-gray-600",
};

function ChannelIcon({ channel }: { channel: string }) {
  if (channel === "email") return <Mail className="w-3.5 h-3.5" />;
  if (channel === "inapp") return <MonitorSmartphone className="w-3.5 h-3.5" />;
  return <Bell className="w-3.5 h-3.5" />;
}

function EditModal({
  template,
  onClose,
  onSaved,
}: {
  template: NotificationTemplate;
  onClose: () => void;
  onSaved: (updated: NotificationTemplate) => void;
}) {
  const [form, setForm] = useState({
    subject: template.subject ?? "",
    htmlBody: template.htmlBody ?? "",
    textBody: template.textBody ?? "",
    inAppTitle: template.inAppTitle ?? "",
    inAppBody: template.inAppBody ?? "",
    inAppLink: template.inAppLink ?? "",
    ctaLabel: template.ctaLabel ?? "",
    ctaUrl: template.ctaUrl ?? "",
    priority: template.priority,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/admin/notification-templates/${template.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: form.subject || null,
        htmlBody: form.htmlBody || null,
        textBody: form.textBody || null,
        inAppTitle: form.inAppTitle || null,
        inAppBody: form.inAppBody || null,
        inAppLink: form.inAppLink || null,
        ctaLabel: form.ctaLabel || null,
        ctaUrl: form.ctaUrl || null,
        priority: form.priority,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      onSaved(updated);
      onClose();
    } else {
      setError("Failed to save template.");
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" data-testid="modal-edit-template">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-sm font-bold text-navy">Edit Template</h2>
            <code className="text-xs text-gray-500 font-mono">{template.eventKey} · {template.channel}</code>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" data-testid="button-close-edit-modal">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
            <select
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 w-full focus:outline-none focus:border-teal/50"
              data-testid="select-edit-priority"
            >
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {template.channel === "email" && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-teal/50"
                  placeholder="Email subject line"
                  data-testid="input-edit-subject"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">HTML Body</label>
                <textarea
                  value={form.htmlBody}
                  onChange={(e) => setForm((f) => ({ ...f, htmlBody: e.target.value }))}
                  rows={8}
                  className="w-full text-xs font-mono border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-teal/50 resize-y"
                  placeholder="HTML body content..."
                  data-testid="textarea-edit-htmlbody"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Plain Text Body</label>
                <textarea
                  value={form.textBody}
                  onChange={(e) => setForm((f) => ({ ...f, textBody: e.target.value }))}
                  rows={4}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-teal/50 resize-y"
                  placeholder="Plain text fallback..."
                  data-testid="textarea-edit-textbody"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">CTA Label</label>
                  <input
                    type="text"
                    value={form.ctaLabel}
                    onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-teal/50"
                    placeholder="Button label"
                    data-testid="input-edit-cta-label"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">CTA URL</label>
                  <input
                    type="text"
                    value={form.ctaUrl}
                    onChange={(e) => setForm((f) => ({ ...f, ctaUrl: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-teal/50"
                    placeholder="{{dashboard_url}}"
                    data-testid="input-edit-cta-url"
                  />
                </div>
              </div>
            </>
          )}

          {template.channel === "inapp" && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">In-app Title</label>
                <input
                  type="text"
                  value={form.inAppTitle}
                  onChange={(e) => setForm((f) => ({ ...f, inAppTitle: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-teal/50"
                  placeholder="Notification title"
                  data-testid="input-edit-inapp-title"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">In-app Body</label>
                <textarea
                  value={form.inAppBody}
                  onChange={(e) => setForm((f) => ({ ...f, inAppBody: e.target.value }))}
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-teal/50 resize-y"
                  placeholder="Notification body text"
                  data-testid="textarea-edit-inapp-body"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">In-app Link</label>
                <input
                  type="text"
                  value={form.inAppLink}
                  onChange={(e) => setForm((f) => ({ ...f, inAppLink: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-teal/50"
                  placeholder="/dashboard/..."
                  data-testid="input-edit-inapp-link"
                />
              </div>
            </>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-50"
            data-testid="button-cancel-edit"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-xl bg-teal hover:bg-teal/90 disabled:opacity-50"
            data-testid="button-save-template"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminNotificationsPage() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [testSendEmail, setTestSendEmail] = useState("");
  const [testSendState, setTestSendState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [testSendMessage, setTestSendMessage] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (channelFilter !== "all") params.set("channel", channelFilter);
    if (statusFilter !== "all") params.set("isActive", statusFilter === "active" ? "true" : "false");

    const res = await fetch(`/api/admin/notification-templates?${params}`);
    if (res.ok) {
      const data = await res.json();
      setTemplates(data);
    }
    setLoading(false);
  }, [channelFilter, statusFilter]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  async function toggleActive(tpl: NotificationTemplate) {
    setToggling(tpl.id);
    await fetch(`/api/admin/notification-templates/${tpl.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !tpl.isActive }),
    });
    setTemplates((prev) =>
      prev.map((t) => (t.id === tpl.id ? { ...t, isActive: !t.isActive } : t))
    );
    setToggling(null);
  }

  async function sendTestNotification(tpl: NotificationTemplate) {
    const email = testSendEmail.trim() || tpl.channel === "inapp" ? undefined : tpl.channel === "email" ? testSendEmail.trim() : "";
    setTestSendState("sending");
    setTestSendMessage("");
    const res = await fetch("/api/admin/notification-templates/test-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: tpl.id, recipientEmail: testSendEmail.trim() || "admin@contentech.io" }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.sent || data.channel === "inapp") {
        setTestSendState("sent");
        setTestSendMessage(tpl.channel === "inapp" ? "In-app notification delivered to your account." : `Test email sent to ${testSendEmail || "admin@contentech.io"}.`);
      } else {
        setTestSendState("error");
        setTestSendMessage(data.reason ?? "Send failed");
      }
    } else {
      const err = await res.json().catch(() => ({}));
      setTestSendState("error");
      setTestSendMessage(err.error ?? "Failed to send test");
    }
  }

  async function duplicateTemplate(tpl: NotificationTemplate) {
    const res = await fetch("/api/admin/notification-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventKey: `${tpl.eventKey}.copy`,
        channel: tpl.channel,
        subject: tpl.subject,
        htmlBody: tpl.htmlBody,
        textBody: tpl.textBody,
        inAppTitle: tpl.inAppTitle,
        inAppBody: tpl.inAppBody,
        inAppLink: tpl.inAppLink,
        ctaLabel: tpl.ctaLabel,
        ctaUrl: tpl.ctaUrl,
        priority: tpl.priority,
        isActive: false,
        isCritical: false,
      }),
    });
    if (res.ok) {
      fetchTemplates();
    }
  }

  const filtered = templates.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.eventKey.toLowerCase().includes(q) ||
      t.subject?.toLowerCase().includes(q) ||
      t.inAppTitle?.toLowerCase().includes(q)
    );
  });

  const preview = previewId ? templates.find((t) => t.id === previewId) : null;
  const editTemplate = editId ? templates.find((t) => t.id === editId) : null;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {editTemplate && (
        <EditModal
          template={editTemplate}
          onClose={() => setEditId(null)}
          onSaved={(updated) => {
            setTemplates((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
          }}
        />
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-navy" data-testid="text-page-title">Notification Templates</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage all event notification templates. Toggle active/inactive, edit, preview, and view delivery logs.
          </p>
        </div>
        <Link
          href="/admin/notifications/logs"
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-teal/50 hover:text-teal transition-colors"
          data-testid="link-delivery-logs"
        >
          Delivery Logs
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by event key or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-teal/50"
            data-testid="input-search-templates"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-teal/50"
            data-testid="select-channel-filter"
          >
            <option value="all">All channels</option>
            <option value="email">Email</option>
            <option value="inapp">In-app</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-teal/50"
            data-testid="select-status-filter"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={cn("lg:col-span-2 space-y-2", loading && "opacity-50")}>
          {filtered.length === 0 && !loading ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
              <Bell className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No templates found</p>
            </div>
          ) : (
            filtered.map((tpl) => (
              <div
                key={tpl.id}
                className={cn(
                  "bg-white rounded-xl border transition-all",
                  previewId === tpl.id ? "border-teal/50 shadow-sm" : "border-gray-200 hover:border-gray-300"
                )}
                data-testid={`template-card-${tpl.id}`}
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "#F5F8FA", color: "#0091AE" }}
                  >
                    <ChannelIcon channel={tpl.channel} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-xs font-mono text-navy">{tpl.eventKey}</code>
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize", PRIORITY_COLORS[tpl.priority])}>
                        {tpl.priority}
                      </span>
                      {tpl.isCritical && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600">
                          Critical
                        </span>
                      )}
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 capitalize">
                        {tpl.channel}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {tpl.subject ?? tpl.inAppTitle ?? "(no title)"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {tpl._count && (
                      <span className="text-xs text-gray-400 mr-1">{tpl._count.deliveries} sent</span>
                    )}
                    <button
                      onClick={() => setPreviewId(previewId === tpl.id ? null : tpl.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-teal hover:bg-teal/10 transition-colors"
                      title="Preview"
                      data-testid={`button-preview-${tpl.id}`}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditId(tpl.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-navy hover:bg-navy/10 transition-colors"
                      title="Edit template"
                      data-testid={`button-edit-${tpl.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => duplicateTemplate(tpl)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-orange hover:bg-orange/10 transition-colors"
                      title="Duplicate template"
                      data-testid={`button-duplicate-${tpl.id}`}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleActive(tpl)}
                      disabled={toggling === tpl.id}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-teal hover:bg-teal/10 transition-colors"
                      title={tpl.isActive ? "Deactivate" : "Activate"}
                      data-testid={`button-toggle-${tpl.id}`}
                    >
                      {tpl.isActive ? (
                        <ToggleRight className="w-5 h-5 text-teal" />
                      ) : (
                        <ToggleLeft className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {preview && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 h-fit sticky top-8" data-testid="template-preview-panel">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-navy">Template Preview</h3>
              <button
                onClick={() => setEditId(preview.id)}
                className="flex items-center gap-1 text-xs text-teal hover:underline"
                data-testid="button-preview-edit"
              >
                <Pencil className="w-3 h-3" /> Edit
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <p className="text-gray-400 font-medium uppercase tracking-wider text-[10px] mb-1">Event Key</p>
                <code className="text-navy font-mono">{preview.eventKey}</code>
              </div>
              <div>
                <p className="text-gray-400 font-medium uppercase tracking-wider text-[10px] mb-1">Channel</p>
                <p className="text-navy capitalize">{preview.channel}</p>
              </div>
              {preview.subject && (
                <div>
                  <p className="text-gray-400 font-medium uppercase tracking-wider text-[10px] mb-1">Subject</p>
                  <p className="text-navy">{preview.subject}</p>
                </div>
              )}
              {preview.inAppTitle && (
                <div>
                  <p className="text-gray-400 font-medium uppercase tracking-wider text-[10px] mb-1">In-app Title</p>
                  <p className="text-navy">{preview.inAppTitle}</p>
                </div>
              )}
              {preview.inAppBody && (
                <div>
                  <p className="text-gray-400 font-medium uppercase tracking-wider text-[10px] mb-1">In-app Body</p>
                  <p className="text-gray-600">{preview.inAppBody}</p>
                </div>
              )}
              {preview.ctaLabel && (
                <div>
                  <p className="text-gray-400 font-medium uppercase tracking-wider text-[10px] mb-1">CTA</p>
                  <p className="text-navy">{preview.ctaLabel}</p>
                </div>
              )}
              <div>
                <p className="text-gray-400 font-medium uppercase tracking-wider text-[10px] mb-1">Status</p>
                <span className={cn("font-semibold", preview.isActive ? "text-teal" : "text-gray-400")}>
                  {preview.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              {preview.textBody && (
                <div>
                  <p className="text-gray-400 font-medium uppercase tracking-wider text-[10px] mb-1">Plain text preview</p>
                  <pre className="text-gray-600 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-lg p-3 text-[11px] max-h-48 overflow-y-auto">
                    {preview.textBody}
                  </pre>
                </div>
              )}
              <div className="pt-3 border-t border-gray-100">
                <p className="text-gray-400 font-medium uppercase tracking-wider text-[10px] mb-2">Test Send</p>
                {preview.channel === "email" && (
                  <input
                    type="email"
                    value={testSendEmail}
                    onChange={(e) => { setTestSendEmail(e.target.value); setTestSendState("idle"); }}
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 mb-2 focus:outline-none focus:border-teal/50"
                    placeholder="Recipient email..."
                    data-testid="input-test-send-email"
                  />
                )}
                <button
                  onClick={() => sendTestNotification(preview)}
                  disabled={testSendState === "sending"}
                  className="flex items-center gap-1.5 w-full justify-center px-3 py-1.5 text-xs font-medium text-white rounded-lg bg-navy hover:bg-navy/90 disabled:opacity-50 transition-colors"
                  data-testid="button-test-send"
                >
                  {testSendState === "sending" ? (
                    <span>Sending...</span>
                  ) : testSendState === "sent" ? (
                    <><CheckCircle2 className="w-3.5 h-3.5" /> Sent</>
                  ) : (
                    <><Send className="w-3.5 h-3.5" /> Send Test</>
                  )}
                </button>
                {testSendMessage && (
                  <p className={`text-[10px] mt-1.5 text-center ${testSendState === "error" ? "text-red-500" : "text-teal"}`} data-testid="text-test-send-result">
                    {testSendMessage}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
