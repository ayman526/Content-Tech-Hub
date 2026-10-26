"use client";

import { useState, useEffect } from "react";
import { Bell, Mail, MonitorSmartphone, Shield } from "lucide-react";

interface EventPref {
  eventKey: string;
  priority: string;
  isCritical: boolean;
  emailEnabled: boolean;
  inAppEnabled: boolean;
}

const EVENT_GROUPS: Record<string, string[]> = {
  Account: ["user.welcome", "user.invitation", "invitation.accepted", "account.suspended", "account.reactivated"],
  "Project & Tasks": ["project.created", "project.assigned", "task.assigned", "task.delivered", "task.revision_requested", "task.approved"],
  "Jobs": ["job.deadline_reminder", "job.overdue", "job.offer_received"],
  Billing: ["billing.trial_ending", "billing.payment_failed", "credit.low_balance", "credit.depleted"],
  Security: ["security.password_changed", "security.suspicious_login"],
  System: ["system.provider_failure", "system.maintenance_scheduled", "monthly.usage_summary"],
};

function formatEventKey(key: string): string {
  return key.split(".").pop()!.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<Record<string, EventPref>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/notifications/preferences")
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, EventPref> = {};
        for (const e of data.events ?? []) {
          map[e.eventKey] = e;
        }
        setPrefs(map);
      })
      .finally(() => setLoading(false));
  }, []);

  async function toggle(eventKey: string, field: "emailEnabled" | "inAppEnabled") {
    const current = prefs[eventKey];
    if (!current || current.isCritical) return;

    const updated = { ...current, [field]: !current[field] };
    setPrefs((p) => ({ ...p, [eventKey]: updated }));
    setSaving(eventKey + field);

    try {
      await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventKey, emailEnabled: updated.emailEnabled, inAppEnabled: updated.inAppEnabled }),
      });
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy" data-testid="text-page-title">Notification Preferences</h1>
        <p className="text-sm text-gray-500 mt-1">
          Control which events notify you via email and in-app. Critical security and billing alerts cannot be disabled.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-teal border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(EVENT_GROUPS).map(([group, keys]) => {
            const groupPrefs = keys.map((k) => prefs[k]).filter(Boolean);
            if (groupPrefs.length === 0) return null;

            return (
              <div key={group} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                  <h2 className="text-sm font-semibold text-navy">{group}</h2>
                </div>
                <table className="w-full text-sm" data-testid={`table-group-${group.toLowerCase().replace(/\s+/g, "-")}`}>
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 w-full">Event</th>
                      <th className="px-4 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Email</span>
                        </div>
                      </th>
                      <th className="px-4 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <MonitorSmartphone className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">In-app</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {groupPrefs.map((pref) => (
                      <tr key={pref.eventKey} className="hover:bg-gray-50/50 transition-colors" data-testid={`row-pref-${pref.eventKey}`}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-navy font-medium">{formatEventKey(pref.eventKey)}</span>
                            {pref.isCritical && (
                              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">
                                <Shield className="w-2.5 h-2.5" />
                                Required
                              </span>
                            )}
                            {pref.priority === "high" && !pref.isCritical && (
                              <span className="text-[10px] font-semibold text-teal bg-teal/10 px-1.5 py-0.5 rounded-full">
                                High
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400 mt-0.5">{pref.eventKey}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggle(pref.eventKey, "emailEnabled")}
                            disabled={pref.isCritical || saving === pref.eventKey + "emailEnabled"}
                            className={`w-10 h-5 rounded-full transition-all relative flex-shrink-0 ${
                              pref.emailEnabled
                                ? "bg-teal"
                                : "bg-gray-200"
                            } ${pref.isCritical ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                            data-testid={`toggle-email-${pref.eventKey}`}
                          >
                            <span
                              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                                pref.emailEnabled ? "left-[22px]" : "left-0.5"
                              }`}
                            />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggle(pref.eventKey, "inAppEnabled")}
                            disabled={pref.isCritical || saving === pref.eventKey + "inAppEnabled"}
                            className={`w-10 h-5 rounded-full transition-all relative flex-shrink-0 ${
                              pref.inAppEnabled
                                ? "bg-teal"
                                : "bg-gray-200"
                            } ${pref.isCritical ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                            data-testid={`toggle-inapp-${pref.eventKey}`}
                          >
                            <span
                              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                                pref.inAppEnabled ? "left-[22px]" : "left-0.5"
                              }`}
                            />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex items-center gap-2 text-xs text-gray-400">
        <Bell className="w-3.5 h-3.5" />
        <span>Changes are saved automatically when you toggle a preference.</span>
      </div>
    </div>
  );
}
