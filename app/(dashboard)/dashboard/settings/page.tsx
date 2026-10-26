"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Settings, User, Bell, Lock, Key, Plus, Trash2, Eye, EyeOff, Loader2, Check, AlertCircle, Crown, Copy, Shield, Calendar, Clock, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ApiConfig {
  id: string;
  provider: string;
  model: string | null;
  lastUsed: string | null;
  createdAt: string;
}

interface PlatformApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface OrgInfo {
  id: string;
  name: string;
  plan: string | null;
  creditBalance: number;
}

const PROVIDER_LABELS: Record<string, string> = {
  OPENAI: "OpenAI",
  AZURE: "Azure OpenAI",
  DEEPL: "DeepL",
  MODERNMT: "ModernMT",
  GOOGLE: "Google Translate",
};

const PROVIDER_COLORS: Record<string, string> = {
  OPENAI: "bg-green-100 text-green-700",
  AZURE: "bg-blue-100 text-blue-700",
  DEEPL: "bg-purple-100 text-purple-700",
  MODERNMT: "bg-amber-100 text-amber-700",
  GOOGLE: "bg-red-100 text-red-700",
};

const PLAN_COLORS: Record<string, string> = {
  STARTER: "bg-gray-100 text-gray-700",
  PROFESSIONAL: "bg-teal/10 text-teal",
  ENTERPRISE: "bg-navy/10 text-navy",
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const user = session?.user;

  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([]);
  const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null);
  const [loadingConfigs, setLoadingConfigs] = useState(true);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState({ provider: "openai", apiKey: "", model: "gpt-4o", showKey: false });
  const [savingKey, setSavingKey] = useState(false);
  const [savedKey, setSavedKey] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [keyError, setKeyError] = useState("");

  // Platform API keys
  const [platformKeys, setPlatformKeys] = useState<PlatformApiKey[]>([]);
  const [loadingPlatformKeys, setLoadingPlatformKeys] = useState(true);
  const [showCreateKeyForm, setShowCreateKeyForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyExpiry, setNewKeyExpiry] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [createKeyError, setCreateKeyError] = useState("");
  const [justCreatedKey, setJustCreatedKey] = useState<{ key: string; name: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [editingExpiryId, setEditingExpiryId] = useState<string | null>(null);
  const [editingExpiryValue, setEditingExpiryValue] = useState<string>("");
  const [savingExpiry, setSavingExpiry] = useState(false);
  const [expiryError, setExpiryError] = useState<string | null>(null);

  async function loadPlatformKeys() {
    setLoadingPlatformKeys(true);
    const res = await fetch("/api/developer/keys").catch(() => null);
    const data = res?.ok ? await res.json() : [];
    setPlatformKeys(Array.isArray(data) ? data : []);
    setLoadingPlatformKeys(false);
  }

  async function handleCreateKey() {
    if (!newKeyName.trim()) { setCreateKeyError("Key name is required."); return; }
    setCreateKeyError("");
    setCreatingKey(true);
    const body: Record<string, unknown> = { name: newKeyName.trim(), permissions: [] };
    if (newKeyExpiry) body.expiresAt = new Date(newKeyExpiry).toISOString();
    const res = await fetch("/api/developer/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      setJustCreatedKey({ key: data.key, name: data.name });
      setNewKeyName("");
      setNewKeyExpiry("");
      setShowCreateKeyForm(false);
      loadPlatformKeys();
    } else {
      setCreateKeyError("Failed to generate key. Please try again.");
    }
    setCreatingKey(false);
  }

  async function handleRevokeKey(id: string) {
    setRevokingId(id);
    const res = await fetch(`/api/developer/keys/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    if (res.ok) {
      const updated = await res.json();
      setPlatformKeys((prev) => prev.map((k) => (k.id === id ? { ...k, isActive: updated.isActive } : k)));
    }
    setRevokingId(null);
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key).then(() => {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    });
  }

  function startEditExpiry(key: PlatformApiKey) {
    setEditingExpiryId(key.id);
    setEditingExpiryValue(key.expiresAt ? key.expiresAt.split("T")[0] : "");
    setExpiryError(null);
  }

  function cancelEditExpiry() {
    setEditingExpiryId(null);
    setEditingExpiryValue("");
    setExpiryError(null);
  }

  async function saveExpiry(id: string) {
    setSavingExpiry(true);
    setExpiryError(null);
    const res = await fetch(`/api/developer/keys/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expiresAt: editingExpiryValue || null }),
    });
    if (res.ok) {
      const updated = await res.json();
      setPlatformKeys((prev) => prev.map((k) => (k.id === id ? { ...k, expiresAt: updated.expiresAt } : k)));
      setEditingExpiryId(null);
      setEditingExpiryValue("");
    } else {
      setExpiryError("Failed to update expiry. Please try again.");
    }
    setSavingExpiry(false);
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/api-config").then((r) => r.json()).catch(() => []),
      fetch("/api/organization").then((r) => r.json()).catch(() => null),
    ]).then(([configs, org]) => {
      setApiConfigs(Array.isArray(configs) ? configs : []);
      setOrgInfo(org);
      setLoadingConfigs(false);
    });
    loadPlatformKeys();
  }, []);

  async function handleSaveKey() {
    if (!newKey.apiKey.trim()) { setKeyError("API key is required."); return; }
    setKeyError("");
    setSavingKey(true);
    const res = await fetch("/api/api-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: newKey.provider,
        apiKey: newKey.apiKey,
        model: newKey.model || undefined,
      }),
    });
    if (res.ok) {
      const refreshed = await fetch("/api/api-config").then((r) => r.json());
      setApiConfigs(Array.isArray(refreshed) ? refreshed : []);
      setNewKey({ provider: "openai", apiKey: "", model: "gpt-4o", showKey: false });
      setShowAddForm(false);
      setSavedKey(true);
      setTimeout(() => setSavedKey(false), 3000);
    } else {
      setKeyError("Failed to save API key. Please try again.");
    }
    setSavingKey(false);
  }

  async function handleDeleteKey(id: string) {
    setDeletingId(id);
    await fetch(`/api/api-config/${id}`, { method: "DELETE" });
    setApiConfigs((prev) => prev.filter((c) => c.id !== id));
    setDeletingId(null);
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account and preferences</p>
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-navy flex items-center gap-2 mb-5">
            <User className="w-4 h-4" /> Profile Information
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Full Name</label>
              <input
                defaultValue={user?.name ?? ""}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                data-testid="input-name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
              <input
                defaultValue={user?.email ?? ""}
                type="email"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 bg-gray-50"
                data-testid="input-email"
                disabled
              />
            </div>
          </div>
          <div className="mt-4">
            <Button size="sm" data-testid="btn-save-profile">Save Changes</Button>
          </div>
        </div>

        {/* Password */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-navy flex items-center gap-2 mb-5">
            <Lock className="w-4 h-4" /> Change Password
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Current Password</label>
              <input type="password" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">New Password</label>
              <input type="password" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" />
            </div>
          </div>
          <div className="mt-4">
            <Button size="sm" variant="outline">Update Password</Button>
          </div>
        </div>

        {/* Plan & Credits */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-navy flex items-center gap-2 mb-5">
            <Crown className="w-4 h-4" /> Plan & Credits
          </h2>
          {orgInfo ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-navy/5 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-navy" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-navy">{orgInfo.name}</p>
                    {orgInfo.plan ? (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PLAN_COLORS[orgInfo.plan] ?? "bg-gray-100 text-gray-600"}`}>
                        {orgInfo.plan}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">No Plan</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    <span className="font-semibold text-teal">{orgInfo.creditBalance}</span> credits remaining
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" data-testid="btn-manage-plan">
                {orgInfo.plan ? "Manage Plan" : "Subscribe"}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading plan info…
            </div>
          )}
        </div>

        {/* Contentech API Keys */}
        <div id="api-keys" className="bg-white rounded-2xl border border-gray-200 p-6" data-testid="section-platform-api-keys">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-navy flex items-center gap-2">
              <Shield className="w-4 h-4" /> API Keys
            </h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setShowCreateKeyForm((v) => !v); setJustCreatedKey(null); setCreateKeyError(""); setNewKeyExpiry(""); }}
              data-testid="btn-new-api-key"
            >
              <Plus className="w-3.5 h-3.5 me-1" /> New Key
            </Button>
          </div>

          <p className="text-xs text-gray-500 mb-4">
            Generate API keys to authenticate the Contentech WordPress companion plugin or any external integration.
            Keys are prefixed <code className="font-mono text-navy bg-gray-100 px-1 rounded">ctk_live_</code> and are shown only once at creation.
          </p>

          {/* Just-created key banner */}
          {justCreatedKey && (
            <div className="mb-4 p-4 rounded-xl border-2 border-teal/30 bg-teal/5 space-y-2">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-teal" />
                <p className="text-sm font-semibold text-navy">Key created — copy it now</p>
              </div>
              <p className="text-xs text-gray-500">
                This is the only time <strong>{justCreatedKey.name}</strong> will be shown. Store it securely.
              </p>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 font-mono text-xs break-all bg-white border border-gray-200 rounded-lg px-3 py-2 select-all text-navy" data-testid="text-new-api-key">
                  {justCreatedKey.key}
                </code>
                <button
                  onClick={() => copyKey(justCreatedKey.key)}
                  className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  data-testid="btn-copy-api-key"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-teal" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey ? "Copied!" : "Copy"}
                </button>
              </div>
              <button
                onClick={() => setJustCreatedKey(null)}
                className="text-xs text-gray-400 hover:text-gray-600 mt-1"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Create key form */}
          {showCreateKeyForm && (
            <div className="mb-4 p-4 rounded-xl border-2 border-dashed border-navy/20 bg-navy/[0.02] space-y-3">
              <p className="text-xs font-semibold text-navy">New API Key</p>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Key Name</label>
                <input
                  type="text"
                  placeholder="e.g. WordPress Production"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateKey()}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20"
                  data-testid="input-api-key-name"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Expiry Date <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="date"
                  value={newKeyExpiry}
                  min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                  onChange={(e) => setNewKeyExpiry(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20"
                  data-testid="input-api-key-expiry"
                />
                <p className="text-[11px] text-gray-400 mt-1">Leave blank for a non-expiring key.</p>
              </div>
              {createKeyError && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {createKeyError}
                </p>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreateKey} disabled={creatingKey} data-testid="btn-generate-api-key">
                  {creatingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin me-1" /> : <Key className="w-3.5 h-3.5 me-1" />}
                  Generate Key
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowCreateKeyForm(false); setCreateKeyError(""); setNewKeyExpiry(""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Existing keys list */}
          {loadingPlatformKeys ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading API keys…
            </div>
          ) : platformKeys.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
              <Shield className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-500 mb-1">No API keys yet</p>
              <p className="text-xs text-gray-400">Generate a key to connect the WordPress plugin or other integrations.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {platformKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
                  data-testid={`api-key-row-${key.id}`}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-navy/5 flex-shrink-0">
                    <Key className="w-4 h-4 text-navy" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy">{key.name}</p>
                    <p className="text-xs text-gray-400 font-mono">
                      {key.keyPrefix}…
                      {" · "}
                      {key.lastUsedAt
                        ? `Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`
                        : `Created ${new Date(key.createdAt).toLocaleDateString()}`}
                    </p>
                    {editingExpiryId === key.id ? (
                      <div className="mt-1.5 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="date"
                            value={editingExpiryValue}
                            onChange={(e) => setEditingExpiryValue(e.target.value)}
                            min={new Date().toISOString().split("T")[0]}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-navy/20"
                            data-testid={`input-expiry-${key.id}`}
                          />
                          <button
                            onClick={() => saveExpiry(key.id)}
                            disabled={savingExpiry}
                            className="text-teal hover:text-teal/80 disabled:opacity-50"
                            title="Save expiry"
                            data-testid={`btn-save-expiry-${key.id}`}
                          >
                            {savingExpiry ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={cancelEditExpiry}
                            className="text-gray-400 hover:text-gray-600"
                            title="Cancel"
                            data-testid={`btn-cancel-expiry-${key.id}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {expiryError && (
                          <p className="text-[11px] text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {expiryError}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="mt-0.5 flex items-center gap-1.5 group">
                        {key.expiresAt ? (
                          new Date(key.expiresAt) < new Date() ? (
                            <p className="text-[11px] flex items-center gap-1" data-testid={`text-expiry-${key.id}`}>
                              <Clock className="w-3 h-3 text-red-400" />
                              <span className="text-red-500 font-medium">Expired {new Date(key.expiresAt).toLocaleDateString()}</span>
                            </p>
                          ) : (
                            <p className="text-[11px] flex items-center gap-1" data-testid={`text-expiry-${key.id}`}>
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span className="text-amber-600">Expires {new Date(key.expiresAt).toLocaleDateString()}</span>
                            </p>
                          )
                        ) : (
                          <p className="text-[11px] text-gray-400" data-testid={`text-expiry-${key.id}`}>No expiry</p>
                        )}
                        <button
                          onClick={() => startEditExpiry(key)}
                          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                          title="Edit expiry"
                          data-testid={`btn-edit-expiry-${key.id}`}
                        >
                          <Pencil className="w-3 h-3 text-gray-500" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {key.isActive ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal/10 text-teal">Active</span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Revoked</span>
                    )}
                    {key.isActive ? (
                      <button
                        onClick={() => handleRevokeKey(key.id)}
                        disabled={revokingId === key.id}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        data-testid={`btn-revoke-key-${key.id}`}
                        title="Revoke key"
                      >
                        {revokingId === key.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          setRevokingId(key.id);
                          await fetch(`/api/developer/keys/${key.id}`, { method: "DELETE" });
                          setPlatformKeys((prev) => prev.filter((k) => k.id !== key.id));
                          setRevokingId(null);
                        }}
                        disabled={revokingId === key.id}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
                        data-testid={`btn-delete-key-${key.id}`}
                        title="Delete revoked key"
                      >
                        {revokingId === key.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI & API Keys */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6" data-testid="section-ai-keys">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-navy flex items-center gap-2">
              <Key className="w-4 h-4" /> AI & API Keys
            </h2>
            <div className="flex items-center gap-2">
              {savedKey && (
                <span className="flex items-center gap-1 text-xs text-teal font-medium">
                  <Check className="w-3.5 h-3.5" /> Saved
                </span>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddForm((v) => !v)}
                data-testid="btn-add-api-key"
              >
                <Plus className="w-3.5 h-3.5 me-1" /> Add Key
              </Button>
            </div>
          </div>

          {/* Add key form */}
          {showAddForm && (
            <div className="mb-5 p-4 rounded-xl border-2 border-dashed border-navy/20 bg-navy/[0.02] space-y-3">
              <p className="text-xs font-semibold text-navy">Add New API Key</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Provider</label>
                  <select
                    value={newKey.provider}
                    onChange={(e) => setNewKey((p) => ({ ...p, provider: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20"
                    data-testid="select-provider"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="azure">Azure OpenAI</option>
                    <option value="deepl">DeepL</option>
                    <option value="modernmt">ModernMT</option>
                    <option value="google">Google Translate</option>
                  </select>
                </div>
                {newKey.provider === "openai" && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Model</label>
                    <select
                      value={newKey.model}
                      onChange={(e) => setNewKey((p) => ({ ...p, model: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20"
                    >
                      <option value="gpt-4o">GPT-4o</option>
                      <option value="gpt-4">GPT-4</option>
                      <option value="gpt-4o-mini">GPT-4o mini</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">API Key</label>
                <div className="relative">
                  <input
                    type={newKey.showKey ? "text" : "password"}
                    placeholder={newKey.provider === "openai" ? "sk-…" : "Enter API key"}
                    value={newKey.apiKey}
                    onChange={(e) => setNewKey((p) => ({ ...p, apiKey: e.target.value }))}
                    className="w-full px-3 py-2 pe-10 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20"
                    data-testid="input-new-api-key"
                  />
                  <button
                    type="button"
                    onClick={() => setNewKey((p) => ({ ...p, showKey: !p.showKey }))}
                    className="absolute inset-y-0 end-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {newKey.showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {keyError && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {keyError}
                </p>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveKey} disabled={savingKey} data-testid="btn-save-api-key">
                  {savingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin me-1" /> : <Check className="w-3.5 h-3.5 me-1" />}
                  Save Key
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowAddForm(false); setKeyError(""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Existing keys list */}
          {loadingConfigs ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading API keys…
            </div>
          ) : apiConfigs.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
              <Key className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-500 mb-1">No API keys configured</p>
              <p className="text-xs text-gray-400">Add your own AI provider key to use BYOK translation</p>
            </div>
          ) : (
            <div className="space-y-2">
              {apiConfigs.map((cfg) => (
                <div
                  key={cfg.id}
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
                  data-testid={`api-config-${cfg.id}`}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gray-100 flex-shrink-0">
                    <Key className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-navy">{PROVIDER_LABELS[cfg.provider] ?? cfg.provider}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${PROVIDER_COLORS[cfg.provider] ?? "bg-gray-100 text-gray-600"}`}>
                        {cfg.provider}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {cfg.model ?? "Default model"}
                      {" · "}
                      {cfg.lastUsed
                        ? `Last used ${new Date(cfg.lastUsed).toLocaleDateString()}`
                        : `Added ${new Date(cfg.createdAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-300 font-mono tracking-widest">••••••••</span>
                    <button
                      onClick={() => handleDeleteKey(cfg.id)}
                      disabled={deletingId === cfg.id}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      data-testid={`btn-delete-config-${cfg.id}`}
                    >
                      {deletingId === cfg.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-400 mt-4">
            API keys are encrypted and stored securely. They are used only when you select BYOK during order creation.
          </p>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-navy flex items-center gap-2 mb-5">
            <Bell className="w-4 h-4" /> Notification Preferences
          </h2>
          <div className="space-y-3">
            {[
              { label: "Project status updates", desc: "Get notified when your project status changes" },
              { label: "New linguist messages", desc: "Get notified when a linguist sends a message" },
              { label: "Weekly digest", desc: "A weekly summary of your translation activity" },
            ].map(({ label, desc }) => (
              <div key={label} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-navy">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
                <div className="relative">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-10 h-5 bg-gray-200 rounded-full peer-checked:bg-teal cursor-pointer transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
