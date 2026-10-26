"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Link2, Unlink, Settings2, Globe, Loader2, Check, X, RefreshCw,
  ChevronDown, ChevronRight, Send, ExternalLink, Plus, Trash2,
  Search, CheckSquare, Square, Zap, Clock, CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────────────

type Connection = {
  id: string; spaceId: string; environmentId: string;
  sourceLocale: string; targetLocales: string[]; deliveryMode: string; connectedAt: string;
};

type CTField = { id: string; name: string; type: string; required: boolean };
type ContentType = { id: string; name: string; fields: CTField[] };
type SpaceLocale = { code: string; name: string; default: boolean };

type Mapping = {
  id: string; contentTypeId: string; contentTypeName: string;
  translatableFields: string[]; workflowType: string; excludeSlugs: boolean;
};

type Entry = {
  id: string; title: string; contentType: string;
  updatedAt: string; publishedAt: string | null; locales: string[];
};

type CJob = {
  id: string; entryId: string; entryTitle: string | null;
  contentTypeId: string; wordCount: number; status: string;
  workflowType: string; createdAt: string;
  locales: { id: string; targetLocale: string; status: string }[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  QUEUED: "text-[#516F90] bg-[#F5F8FA]",
  AI_DRAFT: "text-[#0091AE] bg-[#E8F5F8]",
  TRANSLATING: "text-[#0091AE] bg-[#E8F5F8]",
  READY: "text-[#00BDA5] bg-[#E6FAF8]",
  DELIVERED: "text-[#00BDA5] bg-[#E6FAF8]",
  FAILED: "text-red-500 bg-red-50",
  REVIEW: "text-[#FF7A59] bg-[#FFF3F0]",
  OUT_OF_DATE: "text-amber-600 bg-amber-50",
};

function Badge({ status }: { status: string }) {
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[status] ?? "text-[#516F90] bg-[#F5F8FA]"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

const TABS = [
  { id: "connect",  label: "Connection",     icon: Link2 },
  { id: "settings", label: "Settings",       icon: Settings2 },
  { id: "browser",  label: "Browse Content", icon: Globe },
  { id: "jobs",     label: "Jobs",           icon: Clock },
];

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ContentfulPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") ?? "connect");

  const [connected, setConnected] = useState(false);
  const [conn, setConn] = useState<Connection | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    const res = await fetch("/api/integrations/contentful");
    if (res.ok) {
      const d = await res.json();
      setConnected(d.connected);
      setConn(d.connection);
    }
    setLoadingStatus(false);
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  function switchTab(id: string) {
    setActiveTab(id);
    router.replace(`/dashboard/integrations/contentful?tab=${id}`, { scroll: false });
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0" style={{ background: "#2478CC" }}>C</div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#33475B" }}>Contentful Integration</h1>
          <p className="text-sm" style={{ color: "#516F90" }}>Translate where the content lives — push translations back to Contentful automatically.</p>
        </div>
        {!loadingStatus && (
          <div className={`ml-auto flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${connected ? "bg-teal-50 text-teal-600" : "bg-[#F5F8FA] text-[#99ACC2]"}`}>
            {connected ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
            {connected ? "Connected" : "Not Connected"}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#CBD6E2] mb-6">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.id
                  ? "border-[#0091AE] text-[#0091AE]"
                  : "border-transparent text-[#516F90] hover:text-[#33475B]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "connect" && (
        <ConnectTab connected={connected} conn={conn} loading={loadingStatus} onRefresh={loadStatus} onConnected={() => { loadStatus(); switchTab("settings"); }} onDisconnected={loadStatus} />
      )}
      {activeTab === "settings" && connected && conn && (
        <SettingsTab conn={conn} onSaved={loadStatus} />
      )}
      {activeTab === "browser" && connected && conn && (
        <BrowserTab conn={conn} />
      )}
      {activeTab === "jobs" && connected && (
        <JobsTab />
      )}
      {!connected && activeTab !== "connect" && (
        <div className="text-center py-16">
          <Link2 className="w-12 h-12 mx-auto mb-3" style={{ color: "#CBD6E2" }} />
          <h3 className="font-semibold mb-2" style={{ color: "#33475B" }}>Not connected</h3>
          <p className="text-sm mb-4" style={{ color: "#516F90" }}>Connect your Contentful space first.</p>
          <Button onClick={() => switchTab("connect")} style={{ background: "#0091AE" }}>Go to Connection</Button>
        </div>
      )}
    </div>
  );
}

// ─── Connect Tab ─────────────────────────────────────────────────────────────

function ConnectTab({ connected, conn, loading, onRefresh, onConnected, onDisconnected }: {
  connected: boolean; conn: Connection | null; loading: boolean;
  onRefresh: () => void; onConnected: () => void; onDisconnected: () => void;
}) {
  const [pat, setPat] = useState("");
  const [spaceId, setSpaceId] = useState("");
  const [environmentId, setEnvironmentId] = useState("master");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleConnect() {
    if (!pat.trim() || !spaceId.trim()) return;
    setConnecting(true);
    setError(null);
    const res = await fetch("/api/integrations/contentful/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: pat, spaceId, environmentId }),
    });
    const data = await res.json();
    if (res.ok) {
      setPat(""); setSpaceId(""); setEnvironmentId("master");
      onConnected();
    } else {
      setError(data.error ?? "Connection failed");
    }
    setConnecting(false);
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    await fetch("/api/integrations/contentful", { method: "DELETE" });
    onDisconnected();
    setDisconnecting(false);
  }

  if (loading) return <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: "#0091AE" }} /></div>;

  if (connected && conn) {
    return (
      <div className="max-w-lg">
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-teal-500" />
            <span className="font-semibold text-teal-700">Connected to Contentful</span>
          </div>
          <div className="space-y-1 text-sm text-teal-700">
            <p>Space ID: <code className="font-mono">{conn.spaceId}</code></p>
            <p>Environment: <code className="font-mono">{conn.environmentId}</code></p>
            <p>Connected: {new Date(conn.connectedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="gap-2 text-red-500 border-red-200 hover:bg-red-50"
          onClick={handleDisconnect}
          disabled={disconnecting}
          data-testid="btn-disconnect-contentful"
        >
          <Unlink className="w-4 h-4" />
          {disconnecting ? "Disconnecting…" : "Disconnect"}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-5">
      <div className="bg-[#F5F8FA] border border-[#CBD6E2] rounded-xl p-4 text-sm" style={{ color: "#516F90" }}>
        <p className="font-semibold mb-1" style={{ color: "#33475B" }}>How to get a Personal Access Token</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Go to <strong>Contentful → Settings → API keys → Personal access tokens</strong></li>
          <li>Click <strong>Generate personal token</strong></li>
          <li>Copy the token and paste it below</li>
          <li>The token needs Content Management API read + write access</li>
        </ol>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold" style={{ color: "#33475B" }}>Personal Access Token <span className="text-red-400">*</span></Label>
        <Input
          data-testid="input-contentful-pat"
          type="password"
          placeholder="CFPAT-…"
          value={pat}
          onChange={(e) => setPat(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold" style={{ color: "#33475B" }}>Space ID <span className="text-red-400">*</span></Label>
          <Input
            data-testid="input-contentful-space-id"
            placeholder="e.g. abc123def456"
            value={spaceId}
            onChange={(e) => setSpaceId(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold" style={{ color: "#33475B" }}>Environment</Label>
          <Input
            data-testid="input-contentful-env"
            placeholder="master"
            value={environmentId}
            onChange={(e) => setEnvironmentId(e.target.value)}
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button
        data-testid="btn-connect-contentful"
        onClick={handleConnect}
        disabled={connecting || !pat.trim() || !spaceId.trim()}
        style={{ background: "#0091AE" }}
        className="gap-2"
      >
        {connecting ? <><Loader2 className="w-4 h-4 animate-spin" /> Connecting…</> : <><Link2 className="w-4 h-4" /> Connect Contentful</>}
      </Button>
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({ conn, onSaved }: { conn: Connection; onSaved: () => void }) {
  const [sourceLocale, setSourceLocale] = useState(conn.sourceLocale);
  const [targetLocales, setTargetLocales] = useState<string[]>(conn.targetLocales ?? []);
  const [deliveryMode, setDeliveryMode] = useState(conn.deliveryMode);
  const [locales, setLocales] = useState<SpaceLocale[]>([]);
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedCT, setExpandedCT] = useState<string | null>(null);
  const [savingMapping, setSavingMapping] = useState<string | null>(null);
  const [pendingMappings, setPendingMappings] = useState<Record<string, { fields: string[]; workflow: string }>>({});

  useEffect(() => {
    Promise.all([
      fetch("/api/integrations/contentful/spaces").then((r) => r.json()),
      fetch("/api/integrations/contentful/content-types").then((r) => r.json()),
      fetch("/api/integrations/contentful/mappings").then((r) => r.json()),
    ]).then(([space, cts, maps]) => {
      setLocales(space.locales ?? []);
      setContentTypes(Array.isArray(cts) ? cts : []);
      setMappings(Array.isArray(maps) ? maps : []);
    });
  }, []);

  function getMappingFor(ctId: string) {
    return mappings.find((m) => m.contentTypeId === ctId);
  }
  function getPending(ctId: string, ct: ContentType) {
    const existing = getMappingFor(ctId);
    return pendingMappings[ctId] ?? {
      fields: (existing?.translatableFields as string[]) ?? [],
      workflow: existing?.workflowType ?? "AI_HUMAN",
    };
  }
  function toggleField(ctId: string, fieldId: string, ct: ContentType) {
    const cur = getPending(ctId, ct);
    const fields = cur.fields.includes(fieldId)
      ? cur.fields.filter((f) => f !== fieldId)
      : [...cur.fields, fieldId];
    setPendingMappings((p) => ({ ...p, [ctId]: { ...cur, fields } }));
  }
  function setWorkflow(ctId: string, wf: string, ct: ContentType) {
    const cur = getPending(ctId, ct);
    setPendingMappings((p) => ({ ...p, [ctId]: { ...cur, workflow: wf } }));
  }

  async function saveMapping(ct: ContentType) {
    const cur = getPending(ct.id, ct);
    setSavingMapping(ct.id);
    const res = await fetch("/api/integrations/contentful/mappings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentTypeId: ct.id, contentTypeName: ct.name, translatableFields: cur.fields, workflowType: cur.workflow }),
    });
    if (res.ok) {
      const updated = await res.json();
      setMappings((ms) => {
        const idx = ms.findIndex((m) => m.contentTypeId === ct.id);
        return idx >= 0 ? ms.map((m, i) => (i === idx ? updated : m)) : [...ms, updated];
      });
    }
    setSavingMapping(null);
  }

  async function saveSettings() {
    setSaving(true);
    await fetch("/api/integrations/contentful/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceLocale, targetLocales, deliveryMode }),
    });
    onSaved();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  }

  function toggleTargetLocale(code: string) {
    setTargetLocales((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Locales */}
      <div className="bg-white rounded-2xl border border-[#CBD6E2] p-6">
        <h2 className="text-sm font-semibold mb-4" style={{ color: "#33475B" }}>Locales</h2>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold" style={{ color: "#33475B" }}>Source Locale</Label>
            <div className="relative">
              <select
                className="w-full px-3 py-2 text-sm border border-[#CBD6E2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0091AE]/30 bg-white appearance-none"
                value={sourceLocale}
                onChange={(e) => setSourceLocale(e.target.value)}
                data-testid="select-source-locale"
              >
                {locales.map((l) => <option key={l.code} value={l.code}>{l.name} ({l.code})</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "#99ACC2" }} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold" style={{ color: "#33475B" }}>Target Locales</Label>
            <div className="flex flex-wrap gap-2">
              {locales.filter((l) => l.code !== sourceLocale).map((l) => {
                const selected = targetLocales.includes(l.code);
                return (
                  <button
                    key={l.code}
                    onClick={() => toggleTargetLocale(l.code)}
                    className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${selected ? "border-[#0091AE] bg-[#E8F5F8] text-[#0091AE]" : "border-[#CBD6E2] text-[#516F90] hover:border-[#0091AE]"}`}
                    data-testid={`locale-toggle-${l.code}`}
                  >
                    {selected ? <Check className="w-3 h-3 inline mr-1" /> : null}
                    {l.name} ({l.code})
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold" style={{ color: "#33475B" }}>Delivery Mode</Label>
            <div className="flex gap-3">
              {[["DRAFT", "Save as Draft"], ["PUBLISH", "Publish immediately"]].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setDeliveryMode(val)}
                  className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${deliveryMode === val ? "border-[#0091AE] bg-[#E8F5F8] text-[#0091AE]" : "border-[#CBD6E2] text-[#516F90]"}`}
                  data-testid={`delivery-mode-${val.toLowerCase()}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={saveSettings} disabled={saving} style={{ background: "#FF7A59" }} className="gap-2">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : saved ? <><Check className="w-4 h-4" /> Saved</> : "Save Settings"}
          </Button>
        </div>
      </div>

      {/* Content Type Mappings */}
      <div className="bg-white rounded-2xl border border-[#CBD6E2] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#F5F8FA]" style={{ background: "#F5F8FA" }}>
          <h2 className="text-sm font-semibold" style={{ color: "#33475B" }}>Content Type Field Mappings</h2>
          <p className="text-xs mt-0.5" style={{ color: "#516F90" }}>Choose which fields in each content type should be translated.</p>
        </div>
        <div className="divide-y divide-[#F5F8FA]">
          {contentTypes.map((ct) => {
            const mapping = getMappingFor(ct.id);
            const pending = getPending(ct.id, ct);
            const isExpanded = expandedCT === ct.id;
            return (
              <div key={ct.id}>
                <button
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#F5F8FA] transition-colors"
                  onClick={() => setExpandedCT(isExpanded ? null : ct.id)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-4 h-4" style={{ color: "#99ACC2" }} /> : <ChevronRight className="w-4 h-4" style={{ color: "#99ACC2" }} />}
                    <div className="text-left">
                      <p className="text-sm font-medium" style={{ color: "#33475B" }}>{ct.name}</p>
                      <p className="text-xs" style={{ color: "#99ACC2" }}>
                        {mapping ? `${(mapping.translatableFields as string[]).length} fields mapped` : "Not configured"}
                      </p>
                    </div>
                  </div>
                  {mapping && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-600">Configured</span>}
                </button>
                {isExpanded && (
                  <div className="px-6 pb-4 border-t border-[#F5F8FA] bg-[#FAFCFD]">
                    <div className="pt-4 space-y-4">
                      <div>
                        <p className="text-xs font-semibold mb-2" style={{ color: "#33475B" }}>Translatable Fields</p>
                        <div className="space-y-1.5">
                          {ct.fields.map((f) => {
                            const checked = pending.fields.includes(f.id);
                            return (
                              <label key={f.id} className="flex items-center gap-2.5 cursor-pointer">
                                <div
                                  className={`w-4 h-4 rounded border flex items-center justify-center ${checked ? "border-[#0091AE] bg-[#0091AE]" : "border-[#CBD6E2]"}`}
                                  onClick={() => toggleField(ct.id, f.id, ct)}
                                >
                                  {checked && <Check className="w-2.5 h-2.5 text-white" />}
                                </div>
                                <span className="text-sm" style={{ color: "#33475B" }}>{f.name}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F5F8FA] font-mono" style={{ color: "#99ACC2" }}>{f.type}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold mb-2" style={{ color: "#33475B" }}>Workflow</p>
                        <div className="flex gap-2">
                          {[["AI_HUMAN", "AI + Human"], ["AI_ONLY", "AI Only"], ["HUMAN_ONLY", "Human Only"]].map(([val, label]) => (
                            <button
                              key={val}
                              onClick={() => setWorkflow(ct.id, val, ct)}
                              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${pending.workflow === val ? "border-[#0091AE] bg-[#E8F5F8] text-[#0091AE]" : "border-[#CBD6E2] text-[#516F90]"}`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => saveMapping(ct)}
                        disabled={savingMapping === ct.id || pending.fields.length === 0}
                        style={{ background: "#FF7A59" }}
                        className="gap-1.5"
                      >
                        {savingMapping === ct.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Save Mapping
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {contentTypes.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: "#99ACC2" }}>No content types found in this space.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Browser Tab ──────────────────────────────────────────────────────────────

function BrowserTab({ conn }: { conn: Connection }) {
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [selectedCT, setSelectedCT] = useState("");
  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/integrations/contentful/content-types")
      .then((r) => r.json())
      .then((d) => setContentTypes(Array.isArray(d) ? d : []));
  }, []);

  const loadEntries = useCallback(async (ctId = selectedCT, q = search, s = skip) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "25", skip: String(s) });
    if (ctId) params.set("contentType", ctId);
    if (q) params.set("search", q);
    const res = await fetch(`/api/integrations/contentful/entries?${params}`);
    if (res.ok) {
      const d = await res.json();
      setEntries(d.items ?? []);
      setTotal(d.total ?? 0);
    }
    setLoading(false);
  }, [selectedCT, search, skip]);

  useEffect(() => { loadEntries(); }, []);

  function toggleEntry(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function sendToTranslation() {
    if (selected.size === 0) return;
    setSending(true);
    setSent(null);
    const targetLocales = conn.targetLocales ?? [];
    const res = await fetch("/api/integrations/contentful/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryIds: Array.from(selected), targetLocales }),
    });
    if (res.ok) {
      const d = await res.json();
      setSent(d.created);
      setSelected(new Set());
    }
    setSending(false);
  }

  const LIMIT = 25;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#99ACC2" }} />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm border border-[#CBD6E2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0091AE]/30"
            placeholder="Search entries…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadEntries(selectedCT, search, 0)}
            data-testid="input-entry-search"
          />
        </div>
        <div className="relative">
          <select
            className="pl-3 pr-8 py-2 text-sm border border-[#CBD6E2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0091AE]/30 bg-white appearance-none"
            value={selectedCT}
            onChange={(e) => { setSelectedCT(e.target.value); loadEntries(e.target.value, search, 0); }}
            data-testid="select-content-type-filter"
          >
            <option value="">All content types</option>
            {contentTypes.map((ct) => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "#99ACC2" }} />
        </div>
        <Button variant="outline" size="sm" onClick={() => loadEntries(selectedCT, search, 0)} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
        {selected.size > 0 && (
          <Button
            data-testid="btn-send-to-translation"
            onClick={sendToTranslation}
            disabled={sending}
            style={{ background: "#FF7A59" }}
            className="gap-2 ml-auto"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? "Creating jobs…" : `Send ${selected.size} to Translation`}
          </Button>
        )}
      </div>

      {sent !== null && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 text-sm text-teal-700 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {sent} translation {sent === 1 ? "job" : "jobs"} created successfully.
        </div>
      )}

      {/* Entries table */}
      <div className="bg-white rounded-2xl border border-[#CBD6E2] overflow-hidden">
        {loading ? (
          <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: "#0091AE" }} /></div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-sm" style={{ color: "#99ACC2" }}>No entries found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#F5F8FA" }} className="border-b border-[#F5F8FA]">
                <th className="w-10 px-4 py-3" />
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "#516F90" }}>Entry</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "#516F90" }}>Content Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "#516F90" }}>Updated</th>
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className={`border-t border-[#F5F8FA] hover:bg-[#F5F8FA] cursor-pointer transition-colors ${selected.has(entry.id) ? "bg-[#E8F5F8]" : ""}`}
                  onClick={() => toggleEntry(entry.id)}
                  data-testid={`entry-row-${entry.id}`}
                >
                  <td className="px-4 py-3">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${selected.has(entry.id) ? "bg-[#0091AE] border-[#0091AE]" : "border-[#CBD6E2]"}`}>
                      {selected.has(entry.id) && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium" style={{ color: "#33475B" }}>
                    <p>{entry.title}</p>
                    <p className="text-[10px] font-mono" style={{ color: "#99ACC2" }}>{entry.id}</p>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#516F90" }}>{entry.contentType}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#99ACC2" }}>
                    {new Date(entry.updatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <a
                      href={`https://app.contentful.com/spaces/${conn.spaceId}/environments/${conn.environmentId}/entries/${entry.id}`}
                      target="_blank" rel="noopener noreferrer"
                      className="opacity-40 hover:opacity-100 transition-opacity"
                    >
                      <ExternalLink className="w-3.5 h-3.5" style={{ color: "#0091AE" }} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {total > LIMIT && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#F5F8FA] text-xs" style={{ color: "#516F90" }}>
            <span>Showing {skip + 1}–{Math.min(skip + LIMIT, total)} of {total}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={skip === 0} onClick={() => { const s = Math.max(0, skip - LIMIT); setSkip(s); loadEntries(selectedCT, search, s); }}>Previous</Button>
              <Button size="sm" variant="outline" disabled={skip + LIMIT >= total} onClick={() => { const s = skip + LIMIT; setSkip(s); loadEntries(selectedCT, search, s); }}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Jobs Tab ─────────────────────────────────────────────────────────────────

function JobsTab() {
  const [jobs, setJobs] = useState<CJob[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/integrations/contentful/jobs");
    if (res.ok) setJobs(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: "#0091AE" }} /></div>;

  if (jobs.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-[#CBD6E2]">
        <Clock className="w-12 h-12 mx-auto mb-3" style={{ color: "#CBD6E2" }} />
        <h3 className="font-semibold mb-1" style={{ color: "#33475B" }}>No jobs yet</h3>
        <p className="text-sm" style={{ color: "#516F90" }}>Browse your Contentful content and send entries to translation.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#CBD6E2] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#F5F8FA]" style={{ background: "#F5F8FA" }}>
        <h2 className="text-sm font-semibold" style={{ color: "#33475B" }}>Translation Jobs</h2>
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#F5F8FA]">
            <th className="text-left px-5 py-3 text-xs font-semibold" style={{ color: "#516F90" }}>Entry</th>
            <th className="text-left px-5 py-3 text-xs font-semibold" style={{ color: "#516F90" }}>Status</th>
            <th className="text-left px-5 py-3 text-xs font-semibold" style={{ color: "#516F90" }}>Locales</th>
            <th className="text-left px-5 py-3 text-xs font-semibold" style={{ color: "#516F90" }}>Words</th>
            <th className="text-left px-5 py-3 text-xs font-semibold" style={{ color: "#516F90" }}>Created</th>
            <th className="px-5 py-3 w-24" />
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id} className="border-t border-[#F5F8FA] hover:bg-[#F5F8FA]" data-testid={`job-row-${job.id}`}>
              <td className="px-5 py-3">
                <p className="font-medium" style={{ color: "#33475B" }}>{job.entryTitle ?? job.entryId}</p>
                <p className="text-[10px] font-mono" style={{ color: "#99ACC2" }}>{job.contentTypeId}</p>
              </td>
              <td className="px-5 py-3"><Badge status={job.status} /></td>
              <td className="px-5 py-3">
                <div className="flex flex-wrap gap-1">
                  {job.locales.map((l) => (
                    <span key={l.id} className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${STATUS_COLOR[l.status] ?? "bg-[#F5F8FA] text-[#516F90]"}`}>
                      {l.targetLocale}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-5 py-3 text-xs" style={{ color: "#516F90" }}>{job.wordCount}</td>
              <td className="px-5 py-3 text-xs" style={{ color: "#99ACC2" }}>
                {new Date(job.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              </td>
              <td className="px-5 py-3 text-right">
                <Link href={`/dashboard/integrations/contentful/jobs/${job.id}`}>
                  <Button size="sm" variant="outline" className="text-xs h-7">View</Button>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
