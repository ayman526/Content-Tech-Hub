import { Settings, Globe, Zap, Bell, Shield, Database } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">Platform Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configure global platform behaviour and integrations</p>
      </div>

      <div className="space-y-6">
        {/* General */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-navy flex items-center gap-2 mb-5">
            <Globe className="w-4 h-4" />
            General
          </h2>
          <div className="space-y-4">
            {[
              { label: "Platform Name", value: "Contentech", hint: "Displayed in emails and the UI" },
              { label: "Support Email", value: "support@contentech.ai", hint: "Replies go to this address" },
              { label: "Default Language", value: "English (en)", hint: "Fallback UI language" },
            ].map(({ label, value, hint }) => (
              <div key={label} className="flex items-start justify-between py-3 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-navy">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
                </div>
                <div className="text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Routing */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-navy flex items-center gap-2 mb-5">
            <Zap className="w-4 h-4" />
            Smart Routing
          </h2>
          <div className="space-y-3">
            {[
              { label: "Exclusive Window", value: "24 hours", hint: "Time a job is exclusively offered to a preferred linguist" },
              { label: "Auto-assign Fallback", value: "Enabled", hint: "Automatically route to next best linguist after exclusive window" },
              { label: "Min. Rating Threshold", value: "3.5 ★", hint: "Minimum linguist rating to receive auto-assigned jobs" },
            ].map(({ label, value, hint }) => (
              <div key={label} className="flex items-start justify-between py-3 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-navy">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
                </div>
                <div className="text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-navy flex items-center gap-2 mb-5">
            <Bell className="w-4 h-4" />
            Notifications
          </h2>
          <div className="space-y-3">
            {[
              { label: "New Order Email", enabled: true },
              { label: "Job Assignment Email to Linguist", enabled: true },
              { label: "Delivery Confirmation Email", enabled: true },
              { label: "Payment Receipt Email", enabled: false },
            ].map(({ label, enabled }) => (
              <div key={label} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <p className="text-sm text-navy">{label}</p>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${enabled ? "bg-teal/10 text-teal" : "bg-gray-100 text-gray-400"}`}>
                  {enabled ? "On" : "Off"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-navy flex items-center gap-2 mb-5">
            <Shield className="w-4 h-4" />
            Security
          </h2>
          <div className="space-y-3">
            {[
              { label: "Session Duration", value: "30 days" },
              { label: "BYOK Key Encryption", value: "AES-256-GCM" },
              { label: "API Rate Limit", value: "100 req / min" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <p className="text-sm text-navy">{label}</p>
                <span className="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Coming soon banner */}
        <div className="flex items-start gap-3 p-4 bg-navy/5 border border-navy/10 rounded-2xl">
          <Database className="w-5 h-5 text-navy mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-navy">Live Settings Editor Coming Soon</p>
            <p className="text-xs text-gray-500 mt-0.5">
              All settings above will be editable in-place and persisted to the database. For now, contact your administrator to change platform configuration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
