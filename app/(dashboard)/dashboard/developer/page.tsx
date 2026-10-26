"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Key, Webhook, BookOpen, Plus, Trash2, Copy, Check, Eye, EyeOff,
  RefreshCw, AlertCircle, ToggleLeft, ToggleRight, ExternalLink, Loader2,
  Terminal, Shield, Zap, Globe, Pencil, X,
} from "lucide-react";
import { InfoNote } from "@/components/ui/info-tip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Types ───────────────────────────────────────────────────────────────────

type ApiKey = {
  id: string; name: string; keyPrefix: string; permissions: string[];
  isActive: boolean; lastUsedAt: string | null; expiresAt: string | null; createdAt: string;
};
type NewApiKey = ApiKey & { key: string };

type WebhookSub = {
  id: string; url: string; events: string[]; isActive: boolean;
  lastFiredAt: string | null; failureCount: number; createdAt: string;
  deliveries: { success: boolean; createdAt: string }[];
};
type NewWebhookSub = WebhookSub & { secret: string };

// ─── Constants ───────────────────────────────────────────────────────────────

const ALL_PERMISSIONS = [
  { id: "projects:read",  label: "Projects — Read",  desc: "List and retrieve project details" },
  { id: "projects:write", label: "Projects — Write", desc: "Create projects" },
  { id: "jobs:read",      label: "Jobs — Read",      desc: "List jobs and download deliverables" },
  { id: "jobs:write",     label: "Jobs — Write",     desc: "Submit jobs" },
];

const ALL_EVENTS = [
  { id: "job.created",       label: "job.created",       desc: "Fired when a new job is submitted" },
  { id: "job.completed",     label: "job.completed",     desc: "Fired when a job finishes successfully" },
  { id: "job.failed",        label: "job.failed",        desc: "Fired when a job encounters an error" },
  { id: "project.completed", label: "project.completed", desc: "Fired when all jobs in a project are done" },
  { id: "project.cancelled", label: "project.cancelled", desc: "Fired when a project is cancelled" },
];

const TABS = [
  { id: "keys",     label: "API Keys",       icon: Key },
  { id: "webhooks", label: "Webhooks",       icon: Webhook },
  { id: "docs",     label: "API Reference",  icon: BookOpen },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DeveloperPage() {
  const [tab, setTab] = useState("keys");
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#2D3E50" }}>
            <Terminal className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "#33475B" }}>Developer SDK</h1>
        </div>
        <p className="text-sm" style={{ color: "#516F90" }}>
          Manage API keys and webhook endpoints to integrate Contentech into your own systems.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#CBD6E2] mb-6">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id ? "border-[#0091AE] text-[#0091AE]" : "border-transparent text-[#516F90] hover:text-[#33475B]"
            }`}
            data-testid={`tab-${id}`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "keys"     && <ApiKeysTab />}
      {tab === "webhooks" && <WebhooksTab />}
      {tab === "docs"     && <DocsTab />}
    </div>
  );
}

// ─── API Keys Tab ─────────────────────────────────────────────────────────────

function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<NewApiKey | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingExpiryId, setEditingExpiryId] = useState<string | null>(null);
  const [editingExpiryValue, setEditingExpiryValue] = useState<string>("");
  const [savingExpiry, setSavingExpiry] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/developer/keys");
    if (res.ok) setKeys(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleKey(id: string, isActive: boolean) {
    await fetch(`/api/developer/keys/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    load();
  }

  async function deleteKey(id: string) {
    if (!confirm("Revoke this API key? Any integration using it will stop working immediately.")) return;
    await fetch(`/api/developer/keys/${id}`, { method: "DELETE" });
    load();
  }

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function startEditExpiry(k: ApiKey) {
    setEditingExpiryId(k.id);
    setEditingExpiryValue(k.expiresAt ? k.expiresAt.split("T")[0] : "");
  }

  function cancelEditExpiry() {
    setEditingExpiryId(null);
    setEditingExpiryValue("");
  }

  async function saveExpiry(id: string) {
    setSavingExpiry(true);
    await fetch(`/api/developer/keys/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expiresAt: editingExpiryValue || null }),
    });
    setSavingExpiry(false);
    setEditingExpiryId(null);
    setEditingExpiryValue("");
    load();
  }

  return (
    <div className="space-y-4">
      <InfoNote>
        API keys authenticate your server-side requests to the Contentech REST API. Each key carries its own <strong>permission scopes</strong> — grant only what your integration actually needs. Keys are shown in full only once at creation; store them in environment variables, never in source code. You can revoke a key at any time by toggling it off or deleting it.
      </InfoNote>
      <div className="flex items-center justify-end">
        <Button onClick={() => { setNewKey(null); setShowCreate(true); }} style={{ background: "#FF7A59" }} className="gap-2" data-testid="btn-create-api-key">
          <Plus className="w-4 h-4" /> New API Key
        </Button>
      </div>

      {newKey && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-start gap-3 mb-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">Copy your key now — it will never be shown again</p>
              <p className="text-xs text-amber-700 mt-0.5">Store it securely in your environment variables.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-white border border-amber-200 rounded-lg px-3 py-2.5 break-all" style={{ color: "#33475B" }}>
              {newKey.key}
            </code>
            <Button size="sm" variant="outline" className="flex-shrink-0 gap-1.5" onClick={() => copy(newKey.key, "new")}>
              {copiedId === "new" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedId === "new" ? "Copied" : "Copy"}
            </Button>
          </div>
          <Button size="sm" variant="ghost" className="mt-3 text-xs" onClick={() => setNewKey(null)}>Dismiss</Button>
        </div>
      )}

      {showCreate && !newKey && (
        <CreateKeyModal
          onCreated={(k) => { setNewKey(k); setShowCreate(false); load(); }}
          onClose={() => setShowCreate(false)}
        />
      )}

      <div className="bg-white rounded-2xl border border-[#CBD6E2] overflow-hidden">
        {loading ? (
          <div className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: "#0091AE" }} /></div>
        ) : keys.length === 0 ? (
          <div className="py-14 text-center">
            <Key className="w-10 h-10 mx-auto mb-3" style={{ color: "#CBD6E2" }} />
            <p className="font-medium" style={{ color: "#33475B" }}>No API keys yet</p>
            <p className="text-sm mt-1" style={{ color: "#99ACC2" }}>Create a key to start integrating.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead style={{ background: "#F5F8FA" }}>
              <tr className="border-b border-[#F5F8FA]">
                {["Name", "Key prefix", "Permissions", "Expiry", "Last used", "Status", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold" style={{ color: "#516F90" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-t border-[#F5F8FA] hover:bg-[#F5F8FA]" data-testid={`key-row-${k.id}`}>
                  <td className="px-5 py-3 font-medium" style={{ color: "#33475B" }}>{k.name}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      <code className="text-xs font-mono bg-[#F5F8FA] px-2 py-1 rounded" style={{ color: "#33475B" }}>{k.keyPrefix}…</code>
                      <button onClick={() => copy(k.keyPrefix, k.id)} className="opacity-40 hover:opacity-100">
                        {copiedId === k.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" style={{ color: "#516F90" }} />}
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(k.permissions as string[]).map((p) => (
                        <span key={p} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#E8F5F8] text-[#0091AE]">{p}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {editingExpiryId === k.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="date"
                          value={editingExpiryValue}
                          onChange={(e) => setEditingExpiryValue(e.target.value)}
                          min={new Date().toISOString().split("T")[0]}
                          className="text-xs border border-[#CBD6E2] rounded px-2 py-1 outline-none focus:border-[#0091AE]"
                          style={{ color: "#33475B" }}
                          data-testid={`input-expiry-${k.id}`}
                        />
                        <button
                          onClick={() => saveExpiry(k.id)}
                          disabled={savingExpiry}
                          className="text-[#0091AE] hover:text-[#007a94] disabled:opacity-50"
                          title="Save"
                          data-testid={`btn-save-expiry-${k.id}`}
                        >
                          {savingExpiry ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={cancelEditExpiry}
                          className="opacity-50 hover:opacity-100"
                          title="Cancel"
                          data-testid={`btn-cancel-expiry-${k.id}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 group">
                        <span className="text-xs" style={{ color: k.expiresAt && new Date(k.expiresAt) < new Date() ? "#ef4444" : "#99ACC2" }} data-testid={`text-expiry-${k.id}`}>
                          {k.expiresAt ? new Date(k.expiresAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "No expiry"}
                        </span>
                        <button
                          onClick={() => startEditExpiry(k)}
                          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                          title="Edit expiry"
                          data-testid={`btn-edit-expiry-${k.id}`}
                        >
                          <Pencil className="w-3 h-3" style={{ color: "#516F90" }} />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-xs" style={{ color: "#99ACC2" }}>
                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Never"}
                  </td>
                  <td className="px-5 py-3">
                    <button onClick={() => toggleKey(k.id, k.isActive)} className="flex items-center gap-1">
                      {k.isActive
                        ? <ToggleRight className="w-5 h-5 text-teal-500" />
                        : <ToggleLeft className="w-5 h-5" style={{ color: "#CBD6E2" }} />}
                      <span className={`text-xs font-medium ${k.isActive ? "text-teal-600" : "text-[#99ACC2]"}`}>
                        {k.isActive ? "Active" : "Revoked"}
                      </span>
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => deleteKey(k.id)} className="opacity-40 hover:opacity-100 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function CreateKeyModal({ onCreated, onClose }: { onCreated: (k: NewApiKey) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<string[]>(ALL_PERMISSIONS.map((p) => p.id));
  const [expiry, setExpiry] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!name.trim()) { setError("Name is required"); return; }
    setCreating(true); setError(null);
    const res = await fetch("/api/developer/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), permissions: selectedPerms, expiresAt: expiry || null }),
    });
    const data = await res.json();
    if (res.ok) { onCreated(data); }
    else { setError(data.error ?? "Failed to create key"); }
    setCreating(false);
  }

  function togglePerm(id: string) {
    setSelectedPerms((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  }

  return (
    <div className="bg-white rounded-2xl border border-[#CBD6E2] p-6 space-y-4">
      <h2 className="font-semibold" style={{ color: "#33475B" }}>Create API Key</h2>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold" style={{ color: "#33475B" }}>Name <span className="text-red-400">*</span></Label>
        <Input data-testid="input-key-name" placeholder="e.g. Production, CI/CD pipeline" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold" style={{ color: "#33475B" }}>Permissions</Label>
        <div className="space-y-2">
          {ALL_PERMISSIONS.map((p) => (
            <label key={p.id} className="flex items-start gap-3 cursor-pointer">
              <div
                className={`w-4 h-4 rounded border mt-0.5 flex-shrink-0 flex items-center justify-center ${selectedPerms.includes(p.id) ? "bg-[#0091AE] border-[#0091AE]" : "border-[#CBD6E2]"}`}
                onClick={() => togglePerm(p.id)}
              >
                {selectedPerms.includes(p.id) && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <div>
                <p className="text-sm font-medium font-mono" style={{ color: "#33475B" }}>{p.id}</p>
                <p className="text-xs" style={{ color: "#99ACC2" }}>{p.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold" style={{ color: "#33475B" }}>Expiry date <span className="text-[#99ACC2] font-normal">(optional)</span></Label>
        <Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} min={new Date().toISOString().split("T")[0]} />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2 pt-1">
        <Button onClick={create} disabled={creating || selectedPerms.length === 0} style={{ background: "#FF7A59" }} className="gap-2">
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
          {creating ? "Creating…" : "Create Key"}
        </Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

// ─── Webhooks Tab ─────────────────────────────────────────────────────────────

function WebhooksTab() {
  const [subs, setSubs] = useState<WebhookSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newSub, setNewSub] = useState<NewWebhookSub | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/developer/webhooks");
    if (res.ok) setSubs(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleSub(id: string, isActive: boolean) {
    await fetch(`/api/developer/webhooks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    load();
  }

  async function deleteSub(id: string) {
    if (!confirm("Delete this webhook endpoint?")) return;
    await fetch(`/api/developer/webhooks/${id}`, { method: "DELETE" });
    load();
  }

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-4">
      <InfoNote>
        Webhooks push real-time event notifications to your server as they happen — no polling required. Each delivery includes an <code className="bg-[#0091AE]/10 px-1 rounded text-xs font-mono">X-Contentech-Signature</code> header signed with <strong>HMAC-SHA256</strong> using your endpoint's secret key. Verify this signature on every incoming request to confirm the payload was sent by Contentech. The signing secret is shown only once — save it securely alongside your API keys.
      </InfoNote>
      <div className="flex items-center justify-end">
        <Button onClick={() => { setNewSub(null); setShowCreate(true); }} style={{ background: "#FF7A59" }} className="gap-2" data-testid="btn-add-webhook">
          <Plus className="w-4 h-4" /> Add Endpoint
        </Button>
      </div>

      {newSub && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-start gap-3 mb-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">Copy your signing secret now — it cannot be recovered</p>
              <p className="text-xs text-amber-700 mt-0.5">Use it to verify the <code>X-Contentech-Signature</code> header on incoming webhooks.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-white border border-amber-200 rounded-lg px-3 py-2.5 break-all" style={{ color: "#33475B" }}>
              {newSub.secret}
            </code>
            <Button size="sm" variant="outline" className="flex-shrink-0 gap-1.5" onClick={() => copy(newSub.secret, "secret")}>
              {copiedId === "secret" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedId === "secret" ? "Copied" : "Copy"}
            </Button>
          </div>
          <Button size="sm" variant="ghost" className="mt-3 text-xs" onClick={() => setNewSub(null)}>Dismiss</Button>
        </div>
      )}

      {showCreate && !newSub && (
        <CreateWebhookModal
          onCreated={(s) => { setNewSub(s); setShowCreate(false); load(); }}
          onClose={() => setShowCreate(false)}
        />
      )}

      <div className="bg-white rounded-2xl border border-[#CBD6E2] overflow-hidden">
        {loading ? (
          <div className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: "#0091AE" }} /></div>
        ) : subs.length === 0 ? (
          <div className="py-14 text-center">
            <Webhook className="w-10 h-10 mx-auto mb-3" style={{ color: "#CBD6E2" }} />
            <p className="font-medium" style={{ color: "#33475B" }}>No webhook endpoints yet</p>
            <p className="text-sm mt-1" style={{ color: "#99ACC2" }}>Add an endpoint to receive event notifications.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F5F8FA]">
            {subs.map((sub) => {
              const successRate = sub.deliveries.length > 0
                ? Math.round((sub.deliveries.filter((d) => d.success).length / sub.deliveries.length) * 100)
                : null;
              return (
                <div key={sub.id} className="px-5 py-4 hover:bg-[#F5F8FA]" data-testid={`webhook-row-${sub.id}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm font-mono font-medium truncate" style={{ color: "#33475B" }}>{sub.url}</code>
                        {!sub.isActive && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-500 flex-shrink-0">Disabled</span>
                        )}
                        {sub.failureCount > 0 && sub.isActive && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 flex-shrink-0">{sub.failureCount} failures</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {sub.events.map((e) => (
                          <span key={e} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F5F8FA]" style={{ color: "#516F90" }}>{e}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 text-[11px]" style={{ color: "#99ACC2" }}>
                        {sub.lastFiredAt && <span>Last fired {new Date(sub.lastFiredAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>}
                        {successRate !== null && (
                          <span className={successRate === 100 ? "text-teal-500" : successRate < 80 ? "text-red-400" : "text-amber-500"}>
                            {successRate}% success (last {sub.deliveries.length})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => toggleSub(sub.id, sub.isActive)} title={sub.isActive ? "Disable" : "Enable"}>
                        {sub.isActive
                          ? <ToggleRight className="w-5 h-5 text-teal-500" />
                          : <ToggleLeft className="w-5 h-5" style={{ color: "#CBD6E2" }} />}
                      </button>
                      <button onClick={() => deleteSub(sub.id)} className="opacity-40 hover:opacity-100 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateWebhookModal({ onCreated, onClose }: { onCreated: (s: NewWebhookSub) => void; onClose: () => void }) {
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(ALL_EVENTS.map((e) => e.id));
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!url.trim()) { setError("URL is required"); return; }
    setCreating(true); setError(null);
    const res = await fetch("/api/developer/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim(), events: selectedEvents }),
    });
    const data = await res.json();
    if (res.ok) { onCreated(data); }
    else { setError(data.error ?? "Failed to register webhook"); }
    setCreating(false);
  }

  function toggleEvent(id: string) {
    setSelectedEvents((e) => e.includes(id) ? e.filter((x) => x !== id) : [...e, id]);
  }

  return (
    <div className="bg-white rounded-2xl border border-[#CBD6E2] p-6 space-y-4">
      <h2 className="font-semibold" style={{ color: "#33475B" }}>Add Webhook Endpoint</h2>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold" style={{ color: "#33475B" }}>Endpoint URL <span className="text-red-400">*</span></Label>
        <Input data-testid="input-webhook-url" placeholder="https://your-server.com/webhooks/contentech" value={url} onChange={(e) => setUrl(e.target.value)} />
        <p className="text-[11px]" style={{ color: "#99ACC2" }}>Must be a publicly reachable HTTPS URL.</p>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold" style={{ color: "#33475B" }}>Events to subscribe</Label>
        <div className="space-y-2">
          {ALL_EVENTS.map((e) => (
            <label key={e.id} className="flex items-start gap-3 cursor-pointer">
              <div
                className={`w-4 h-4 rounded border mt-0.5 flex-shrink-0 flex items-center justify-center ${selectedEvents.includes(e.id) ? "bg-[#0091AE] border-[#0091AE]" : "border-[#CBD6E2]"}`}
                onClick={() => toggleEvent(e.id)}
              >
                {selectedEvents.includes(e.id) && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <div>
                <p className="text-sm font-medium font-mono" style={{ color: "#33475B" }}>{e.id}</p>
                <p className="text-xs" style={{ color: "#99ACC2" }}>{e.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2 pt-1">
        <Button onClick={create} disabled={creating || selectedEvents.length === 0} style={{ background: "#FF7A59" }} className="gap-2">
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Webhook className="w-4 h-4" />}
          {creating ? "Registering…" : "Register Endpoint"}
        </Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

// ─── Docs Tab ─────────────────────────────────────────────────────────────────

function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="relative rounded-xl overflow-hidden my-3">
      <div className="flex items-center justify-between px-4 py-2" style={{ background: "#1A2E3A" }}>
        <span className="text-[11px] font-mono text-[#99ACC2]">{lang}</span>
        <button onClick={copy} className="text-[11px] flex items-center gap-1 text-[#99ACC2] hover:text-white transition-colors">
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="px-4 py-4 text-xs overflow-x-auto" style={{ background: "#2D3E50", color: "#CBD6E2" }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function DocsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h3 className="text-base font-semibold mb-3 pb-2 border-b border-[#CBD6E2]" style={{ color: "#33475B" }}>{title}</h3>
      {children}
    </div>
  );
}

function EndpointRow({ method, path, desc, permission }: { method: string; path: string; desc: string; permission: string }) {
  const colors: Record<string, string> = { GET: "#0091AE", POST: "#00BDA5", DELETE: "#FF7A59", PATCH: "#FF7A59" };
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#F5F8FA] last:border-0">
      <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded flex-shrink-0 mt-0.5" style={{ color: colors[method] ?? "#516F90", background: colors[method] ? `${colors[method]}18` : "#F5F8FA" }}>{method}</span>
      <div className="flex-1 min-w-0">
        <code className="text-xs font-mono" style={{ color: "#33475B" }}>{path}</code>
        <p className="text-xs mt-0.5" style={{ color: "#516F90" }}>{desc}</p>
      </div>
      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#E8F5F8] text-[#0091AE] flex-shrink-0">{permission}</span>
    </div>
  );
}

function DocsTab() {
  return (
    <div className="max-w-3xl space-y-2">
      {/* Overview cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { icon: Shield, title: "Bearer Auth", desc: "Pass your API key in the Authorization header of every request" },
          { icon: Globe, title: "Base URL", desc: "https://your-domain.com/api/v1" },
          { icon: Zap, title: "Webhook events", desc: "Receive real-time push notifications signed with HMAC-SHA256" },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-white rounded-2xl border border-[#CBD6E2] p-4">
            <Icon className="w-5 h-5 mb-2" style={{ color: "#0091AE" }} />
            <p className="text-sm font-semibold mb-1" style={{ color: "#33475B" }}>{title}</p>
            <p className="text-xs" style={{ color: "#99ACC2" }}>{desc}</p>
          </div>
        ))}
      </div>

      <DocsSection title="Authentication">
        <p className="text-sm mb-2" style={{ color: "#516F90" }}>
          All API requests must include an API key in the <code className="text-xs font-mono bg-[#F5F8FA] px-1 rounded">Authorization</code> header:
        </p>
        <CodeBlock lang="http" code={`Authorization: Bearer ctk_live_your_api_key_here`} />
        <p className="text-sm" style={{ color: "#516F90" }}>
          API keys are scoped to permissions. Requests using a key without the required permission return <code className="text-xs font-mono">403 Forbidden</code>.
        </p>
      </DocsSection>

      <DocsSection title="Endpoints">
        <div className="bg-white rounded-2xl border border-[#CBD6E2] p-4">
          <EndpointRow method="GET"    path="/api/v1/projects"          desc="List all projects for your organization" permission="projects:read" />
          <EndpointRow method="POST"   path="/api/v1/projects"          desc="Create a new project" permission="projects:write" />
          <EndpointRow method="GET"    path="/api/v1/projects/:id"       desc="Get project details including documents and jobs" permission="projects:read" />
          <EndpointRow method="GET"    path="/api/v1/jobs"              desc="List translation jobs, optionally filtered by projectId or status" permission="jobs:read" />
          <EndpointRow method="POST"   path="/api/v1/jobs"              desc="Submit a new translation job" permission="jobs:write" />
          <EndpointRow method="GET"    path="/api/v1/jobs/:id"          desc="Get job status and assignment details" permission="jobs:read" />
          <EndpointRow method="GET"    path="/api/v1/jobs/:id/download" desc="Get the download URL for a completed job deliverable" permission="jobs:read" />
        </div>
      </DocsSection>

      <DocsSection title="Quick start — create a project and submit a job">
        <CodeBlock lang="bash" code={`# 1. Create a project
curl -X POST https://your-domain.com/api/v1/projects \\
  -H "Authorization: Bearer ctk_live_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Q4 Marketing Campaign",
    "sourceLanguage": "en",
    "targetLanguages": ["ar", "fr", "de"],
    "workflowType": "AI_HUMAN",
    "dueDate": "2026-03-31"
  }'`} />
        <CodeBlock lang="json" code={`// Response
{
  "data": {
    "id": "clx1abc2def3",
    "name": "Q4 Marketing Campaign",
    "status": "PENDING",
    "sourceLanguage": "en",
    "targetLanguages": ["ar", "fr", "de"],
    "createdAt": "2026-03-12T10:00:00.000Z"
  }
}`} />
        <CodeBlock lang="bash" code={`# 2. Submit a job for one language pair
curl -X POST https://your-domain.com/api/v1/jobs \\
  -H "Authorization: Bearer ctk_live_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "projectId": "clx1abc2def3",
    "sourceLanguage": "en",
    "targetLanguage": "ar",
    "wordCount": 1500,
    "linguistSource": "SYSTEM_POOL"
  }'`} />
        <CodeBlock lang="bash" code={`# 3. Poll job status
curl https://your-domain.com/api/v1/jobs/clx4job5id \\
  -H "Authorization: Bearer ctk_live_your_key"`} />
        <CodeBlock lang="bash" code={`# 4. Get the download URL when status is COMPLETED
curl https://your-domain.com/api/v1/jobs/clx4job5id/download \\
  -H "Authorization: Bearer ctk_live_your_key"`} />
      </DocsSection>

      <DocsSection title="Webhook signature verification">
        <p className="text-sm mb-2" style={{ color: "#516F90" }}>
          Every webhook delivery includes an <code className="text-xs font-mono bg-[#F5F8FA] px-1 rounded">X-Contentech-Signature</code> header. Verify it to confirm the request came from Contentech:
        </p>
        <CodeBlock lang="typescript" code={`import { createHmac } from "crypto";

function verifyWebhook(
  rawBody: string,
  signatureHeader: string,
  secret: string
): boolean {
  // Header format: "t=<timestamp>,v1=<hmac>"
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => p.split("=", 2))
  );
  const timestamp = parts["t"];
  const signature = parts["v1"];

  const expected = createHmac("sha256", secret)
    .update(\`\${timestamp}.\${rawBody}\`)
    .digest("hex");

  return expected === signature;
}

// Express.js handler example
app.post("/webhooks/contentech", express.raw({ type: "application/json" }), (req, res) => {
  const sig = req.headers["x-contentech-signature"] as string;
  if (!verifyWebhook(req.body.toString(), sig, process.env.WEBHOOK_SECRET!)) {
    return res.status(401).send("Invalid signature");
  }

  const { event, data } = JSON.parse(req.body);
  console.log(\`Received \${event}:\`, data);

  res.status(200).send("OK");
});`} />
      </DocsSection>

      <DocsSection title="Webhook event payloads">
        <CodeBlock lang="json" code={`// job.completed
{
  "event": "job.completed",
  "timestamp": 1741771200,
  "data": {
    "jobId": "clx4job5id",
    "projectId": "clx1abc2def3",
    "sourceLanguage": "en",
    "targetLanguage": "ar",
    "wordCount": 1500,
    "status": "COMPLETED"
  }
}

// job.failed
{
  "event": "job.failed",
  "timestamp": 1741771200,
  "data": {
    "jobId": "clx4job5id",
    "projectId": "clx1abc2def3",
    "status": "FAILED"
  }
}`} />
      </DocsSection>

      <DocsSection title="JavaScript SDK usage">
        <p className="text-sm mb-2" style={{ color: "#516F90" }}>
          You can wrap the REST API in a thin client for convenience:
        </p>
        <CodeBlock lang="typescript" code={`class ContentechClient {
  constructor(
    private apiKey: string,
    private baseUrl = "https://your-domain.com"
  ) {}

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(\`\${this.baseUrl}\${path}\`, {
      ...options,
      headers: {
        "Authorization": \`Bearer \${this.apiKey}\`,
        "Content-Type": "application/json",
        ...(options?.headers ?? {}),
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? \`HTTP \${res.status}\`);
    return data.data;
  }

  async listProjects(params?: { status?: string; limit?: number }) {
    const q = new URLSearchParams(params as any).toString();
    return this.request(\`/api/v1/projects?\${q}\`);
  }

  async createProject(body: {
    name: string;
    sourceLanguage: string;
    targetLanguages: string[];
    workflowType?: string;
    dueDate?: string;
  }) {
    return this.request("/api/v1/projects", { method: "POST", body: JSON.stringify(body) });
  }

  async getProject(id: string) {
    return this.request(\`/api/v1/projects/\${id}\`);
  }

  async submitJob(body: {
    projectId: string;
    sourceLanguage: string;
    targetLanguage: string;
    wordCount: number;
    linguistSource?: "SYSTEM_POOL" | "PREFERRED" | "INTERNAL";
  }) {
    return this.request("/api/v1/jobs", { method: "POST", body: JSON.stringify(body) });
  }

  async getJob(id: string) {
    return this.request(\`/api/v1/jobs/\${id}\`);
  }

  async getDownloadUrl(jobId: string) {
    return this.request(\`/api/v1/jobs/\${jobId}/download\`);
  }
}

// Usage
const client = new ContentechClient(process.env.CONTENTECH_API_KEY!);

const project = await client.createProject({
  name: "My integration project",
  sourceLanguage: "en",
  targetLanguages: ["ar", "fr"],
});

const job = await client.submitJob({
  projectId: project.id,
  sourceLanguage: "en",
  targetLanguage: "ar",
  wordCount: 2000,
});

console.log("Job submitted:", job.id);`} />
      </DocsSection>

      <DocsSection title="Error reference">
        <div className="bg-white rounded-2xl border border-[#CBD6E2] overflow-hidden">
          {[
            ["401 Unauthorized",   "Missing or invalid API key"],
            ["403 Forbidden",      "API key lacks the required permission"],
            ["404 Not Found",      "Resource does not exist or belongs to another org"],
            ["400 Bad Request",    "Required field missing or invalid value"],
            ["409 Conflict",       "Action not available in the current resource state"],
            ["429 Too Many Requests", "Rate limit exceeded — back off and retry"],
            ["500 Internal Server Error", "Platform error — check status page or contact support"],
          ].map(([code, desc]) => (
            <div key={code} className="flex gap-4 px-5 py-3 border-b border-[#F5F8FA] last:border-0">
              <code className="text-xs font-mono font-semibold flex-shrink-0 w-52" style={{ color: code.startsWith("4") ? "#FF7A59" : code.startsWith("5") ? "#EF4444" : "#0091AE" }}>{code}</code>
              <p className="text-xs" style={{ color: "#516F90" }}>{desc}</p>
            </div>
          ))}
        </div>
      </DocsSection>
    </div>
  );
}
