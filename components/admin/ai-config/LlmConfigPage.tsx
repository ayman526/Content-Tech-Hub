"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Server, Cpu, GitBranch, FlaskConical, Activity,
  ClipboardList, Plus, RefreshCw, CheckCircle2, XCircle,
  AlertTriangle, ChevronDown, ChevronUp, Eye, EyeOff,
  Trash2, Edit3, Play, RotateCcw, Shield, Zap, Star,
  Copy, Clock, Globe, Lock, Info, ToggleLeft, ToggleRight,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProviderSecret {
  id: string; keyMasked: string; orgProjectId?: string | null;
  rotatedAt: string; updatedBy?: string | null;
}
interface Provider {
  id: string; name: string; type: string; baseUrl?: string | null;
  region?: string | null; environment: string; status: string;
  rateLimitRpm?: number | null; costProfile?: string | null;
  notes?: string | null; createdAt: string; updatedAt: string;
  secret?: ProviderSecret | null;
  _count: { models: number };
}
interface AiModel {
  id: string; providerId: string; displayName: string;
  apiModelId: string; internalKey: string; version?: string | null;
  contextWindow?: number | null; outputLimit?: number | null;
  status: string; latencyTier: string; costTier: string; qualityTier: string;
  capabilities: Record<string, boolean>;
  domains: string[]; languageGroups: string[]; warnings: string[];
  benchmarkNotes?: string | null; notes?: string | null;
  isDefault: boolean; createdAt: string; updatedAt: string;
  costPerInputTokenUsd?: string | null;
  costPerOutputTokenUsd?: string | null;
  provider: { name: string; type: string; status: string };
}
interface ModelRef { id: string; displayName: string; internalKey: string; status: string; qualityTier?: string; }
interface RoutingRule {
  id: string; name: string; description?: string | null;
  priority: number; enabled: boolean;
  conditions: Record<string, unknown>;
  primaryModel?: ModelRef | null; secondaryModel?: ModelRef | null; tertiaryModel?: ModelRef | null;
  primaryModelId?: string | null; secondaryModelId?: string | null; tertiaryModelId?: string | null;
  policy: Record<string, unknown>;
  isTemplate: boolean; createdBy?: string | null; updatedBy?: string | null;
  createdAt: string; updatedAt: string;
}
interface HealthSummary {
  summary: { activeProviders: number; inactiveProviders: number; totalModels: number;
    productionModels: number; deprecatedModels: number; retiredModels: number;
    disabledModels: number; draftModels: number; betaModels: number;
    totalRules: number; brokenRules: number };
  warnings: string[];
  providerHealth: Array<{ providerId: string; providerName: string; providerType: string;
    latestStatus: string; latestLatencyMs?: number | null; checkedAt: string; recentFailures: number }>;
  recentChecks: Array<{ id: string; status: string; latencyMs?: number | null;
    checkedAt: string; diagnostics: Record<string, unknown>;
    provider: { name: string; type: string }; model?: { displayName: string } | null }>;
}
interface AuditEntry {
  id: string; actorEmail?: string | null; action: string;
  entityType: string; entityId?: string | null; entityName?: string | null;
  before?: Record<string, unknown> | null; after?: Record<string, unknown> | null;
  environment: string; createdAt: string;
}
interface SimResult {
  matchedRule: string | null; matchedRuleId: string | null; matchReason: string;
  primaryModel: { displayName: string; providerName: string; qualityTier: string; costTier: string; latencyTier: string; contextWindow: number | null } | null;
  fallbackChain: Array<{ displayName: string; providerName: string; qualityTier: string }>;
  blockedModels: Array<{ model: string; reason: string }>;
  confidence: number; policyNotes: string[];
  estimatedCostTier: string | null; estimatedLatencyTier: string | null;
  riskFlags: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PROVIDER_TYPES = ["openai","anthropic","google","azure","vertex","bedrock","cohere","moonshot","custom"];
const MODEL_STATUSES = ["draft","beta","approved","production","deprecated","retired","disabled"];
const ALL_DOMAINS = ["legal","medical","technical","software","marketing","literary","ecommerce",
  "customer-support","finance","life-sciences","patents","government","education","media",
  "long-document","low-resource","CJK","RTL","arabic","EU-legal","code"];
const ALL_LANG_GROUPS = ["european","arabic","cjk","indic","african","low-resource","multilingual"];
const ALL_CAPABILITIES: [string, string][] = [
  ["jsonMode","JSON mode"], ["toolCalling","Function/Tool calling"],
  ["glossaryInjection","Glossary injection"], ["styleGuidance","Style guidance"],
  ["terminologyLocking","Terminology locking"], ["longDocument","Long document"],
  ["multilingualReasoning","Multilingual reasoning"], ["lowResourceLanguages","Low-resource languages"],
];

const STATUS_COLORS: Record<string, string> = {
  production: "bg-green-100 text-green-700", approved: "bg-emerald-100 text-emerald-700",
  beta: "bg-blue-100 text-blue-700", draft: "bg-gray-100 text-gray-500",
  deprecated: "bg-yellow-100 text-yellow-700", retired: "bg-red-100 text-red-600",
  disabled: "bg-slate-100 text-slate-500", ok: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-600", degraded: "bg-yellow-100 text-yellow-700",
  timeout: "bg-orange-100 text-orange-600", active: "bg-green-100 text-green-700",
  inactive: "bg-slate-100 text-slate-500",
};
const QUALITY_COLORS: Record<string, string> = {
  flagship: "bg-[#FF7A59]/10 text-[#FF7A59]",
  advanced: "bg-[#0091AE]/10 text-[#0091AE]",
  standard: "bg-gray-100 text-gray-600",
};
const COST_ICONS: Record<string, string> = { low: "$", medium: "$$", premium: "$$$" };
const LATENCY_ICONS: Record<string, string> = { fast: "⚡", balanced: "⚖", "high-quality": "✦" };

// ─── Small reusable components ────────────────────────────────────────────────

function Tooltip({ text }: { text: string }) {
  return (
    <span className="relative group inline-flex items-center ml-1 align-middle">
      <Info className="w-3 h-3 text-gray-400 cursor-help group-hover:text-[#0091AE] transition-colors" />
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 bg-[#33475B] text-white text-[10px] leading-relaxed rounded-lg px-2.5 py-2 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#33475B]" />
      </span>
    </span>
  );
}

function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 mb-5 p-3.5 bg-[#0091AE]/5 border border-[#0091AE]/20 rounded-xl text-xs text-[#33475B] leading-relaxed">
      <Info className="w-3.5 h-3.5 text-[#0091AE] flex-shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

function HowItWorks() {
  const [open, setOpen] = useState(false);
  const steps = [
    {
      icon: Server, label: "1. Add a Provider",
      desc: "A Provider is a vendor account — your company's OpenAI key, an Azure OpenAI endpoint, or any OpenAI-compatible API. Each provider can hold multiple models. Credentials are stored AES-256-GCM encrypted and are never returned in plaintext.",
    },
    {
      icon: Cpu, label: "2. Register Models",
      desc: "Under each provider, register the specific model IDs you want to use (e.g. gpt-4o, claude-3-5-sonnet). Tag each model with quality, latency, and cost tiers, plus the domains and language groups it handles best — this metadata drives the routing engine.",
    },
    {
      icon: GitBranch, label: "3. Create Routing Rules",
      desc: "Rules match incoming translation jobs to the right model. Conditions can filter by language pair, domain, document type, client tier, or document size. Rules run in priority order — lowest number first. If no rule matches, the system falls back to gpt-5-nano via the platform integration key.",
    },
    {
      icon: FlaskConical, label: "4. Test in the Simulator",
      desc: "Use the Test Console to dry-run any scenario and confirm which model would be selected before it affects live jobs. No translation is performed — it only exercises the routing logic.",
    },
  ];
  return (
    <div className="mb-6 border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
        data-testid="how-it-works-toggle"
      >
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-[#0091AE]" />
          <span className="text-xs font-semibold text-[#33475B]">How the AI Config system works</span>
          <span className="text-[10px] text-gray-400 ml-1">— click to {open ? "collapse" : "expand"}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="px-5 py-4 bg-white grid grid-cols-2 gap-4">
          {steps.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#0091AE]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-3.5 h-3.5 text-[#0091AE]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#33475B] mb-0.5">{label}</p>
                <p className="text-[11px] text-gray-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
          <div className="col-span-2 border-t border-gray-100 pt-3 mt-1">
            <p className="text-[11px] text-gray-400 leading-relaxed">
              <span className="font-semibold text-gray-500">Fallback behavior:</span> If a primary model fails (API error or rate limit exceeded), the engine automatically retries with the secondary and then the tertiary model defined in the matching rule.
              If all fail, the job is marked as errored. Changes take effect immediately — no code deploy required.
              All configuration changes are recorded in the Audit Log.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${color}`}>{label}</span>;
}
function StatusBadge({ status }: { status: string }) {
  return <Badge label={status} color={STATUS_COLORS[status] ?? "bg-gray-100 text-gray-500"} />;
}
function QualityBadge({ tier }: { tier: string }) {
  return <Badge label={tier} color={QUALITY_COLORS[tier] ?? "bg-gray-100 text-gray-500"} />;
}
function Chip({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#0091AE]/10 text-[#0091AE] rounded-full text-[11px] font-medium">
      {label}
      {onRemove && <button onClick={onRemove} className="ml-0.5 hover:text-red-500 leading-none">&times;</button>}
    </span>
  );
}
function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h2 className="text-base font-semibold text-[#33475B]">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
function EmptyState({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
    </div>
  );
}
function Spinner() {
  return <div className="w-4 h-4 border-2 border-gray-300 border-t-[#0091AE] rounded-full animate-spin" />;
}
function WarningBanner({ messages }: { messages: string[] }) {
  if (!messages.length) return null;
  return (
    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
      {messages.map((m, i) => (
        <div key={i} className="flex items-start gap-2 text-xs text-yellow-800 mb-1 last:mb-0">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-yellow-500" />
          {m}
        </div>
      ))}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? "max-w-3xl" : "max-w-lg"} my-4`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-[#33475B]">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>
        <div className="px-6 py-5 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// ─── Form helpers ─────────────────────────────────────────────────────────────

function Field({ label, required, children, hint, tooltip }: { label: string; required?: boolean; children: React.ReactNode; hint?: string; tooltip?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        {tooltip && <Tooltip text={tooltip} />}
      </label>
      {children}
      {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}
const inputCls = "w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0091AE]/30 focus:border-[#0091AE]";
const selectCls = inputCls + " bg-white";

function ChipInput({ label, values, onChange, suggestions, tooltip }: {
  label: string; values: string[]; onChange: (v: string[]) => void; suggestions?: string[]; tooltip?: string;
}) {
  const [input, setInput] = useState("");
  const add = (val: string) => {
    const v = val.trim().toLowerCase();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput("");
  };
  return (
    <Field label={label} tooltip={tooltip}>
      <div className="flex flex-wrap gap-1 mb-1">
        {values.map(v => <Chip key={v} label={v} onRemove={() => onChange(values.filter(x => x !== v))} />)}
      </div>
      {suggestions ? (
        <select className={selectCls} value="" onChange={e => { if (e.target.value) add(e.target.value); }}>
          <option value="">+ Add…</option>
          {suggestions.filter(s => !values.includes(s)).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      ) : (
        <input
          className={inputCls} placeholder="Type and press Enter"
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(input); } }}
        />
      )}
    </Field>
  );
}

// ─── Provider Registry Tab ────────────────────────────────────────────────────

function ProviderRegistry() {
  const qc = useQueryClient();
  const { data: providers = [], isLoading } = useQuery<Provider[]>({ queryKey: ["/api/admin/ai-providers"] });
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [showCred, setShowCred] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { status: string; latencyMs: number; diagnostics: Record<string, unknown> }>>({});

  const deleteMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/admin/ai-providers/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/ai-providers"] }),
  });
  const toggleMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch(`/api/admin/ai-providers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/ai-providers"] }),
  });
  const testMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/admin/ai-providers/${id}/test`, { method: "POST" }).then(r => r.json()),
    onSuccess: (data: { status: string; latencyMs: number; diagnostics: Record<string, unknown> }, id: string) => {
      setTestResult(prev => ({ ...prev, [id]: data }));
      qc.invalidateQueries({ queryKey: ["/api/admin/llm-health"] });
    },
  });

  return (
    <div>
      <SectionHeader
        title="Provider Registry"
        subtitle="Add and manage LLM API providers. Credentials are encrypted at rest."
        action={<button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 bg-[#0091AE] text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-[#007a95]"><Plus className="w-3.5 h-3.5" /> Add Provider</button>}
      />
      <InfoNote>
        A <strong>Provider</strong> represents a single API account or endpoint — for example, your company&apos;s OpenAI production key, a separate staging key, or an Azure OpenAI deployment.
        You can register multiple providers from the same vendor (e.g. one for production, one for testing).
        API keys are encrypted with AES-256-GCM and are never returned in the UI after saving — only the last 4 characters are shown.
        After adding a provider, go to <strong>Model Catalog</strong> to register which models are available under it.
      </InfoNote>
      {isLoading ? <div className="flex justify-center py-10"><Spinner /></div> : (
        providers.length === 0 ? <EmptyState icon={Server} title="No providers yet" subtitle="Add your first LLM provider to get started" /> :
        <div className="space-y-3">
          {providers.map(p => {
            const tr = testResult[p.id];
            return (
              <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4" data-testid={`provider-row-${p.id}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#33475B]/10 rounded-xl flex items-center justify-center text-sm font-bold text-[#33475B] uppercase">
                      {p.type.slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#33475B]">{p.name}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">{p.type} · {p.environment}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={p.status} />
                    <span className="text-[10px] text-gray-400">{p._count.models} model{p._count.models !== 1 ? "s" : ""}</span>
                    <button
                      onClick={() => toggleMut.mutate({ id: p.id, status: p.status === "active" ? "inactive" : "active" })}
                      className={`p-1 rounded ${p.status === "active" ? "text-green-500" : "text-gray-400"} hover:opacity-70`}
                      title="Toggle status" data-testid={`toggle-provider-${p.id}`}
                    >
                      {p.status === "active" ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setEditing(p)} className="p-1 text-gray-400 hover:text-[#0091AE] rounded" data-testid={`edit-provider-${p.id}`}><Edit3 className="w-3.5 h-3.5" /></button>
                    <button
                      onClick={() => { if (confirm(`Delete provider "${p.name}"?`)) deleteMut.mutate(p.id); }}
                      className="p-1 text-gray-400 hover:text-red-500 rounded" data-testid={`delete-provider-${p.id}`}
                    ><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                {p.baseUrl && <p className="mt-2 text-[11px] text-gray-400 font-mono truncate">{p.baseUrl}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {p.secret ? (
                    <div className="flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-green-500" />
                      <span className="text-[11px] text-gray-500">Key: <code className="font-mono text-gray-700">{p.secret.keyMasked}</code></span>
                      <span className="text-[10px] text-gray-400">rotated {new Date(p.secret.rotatedAt).toLocaleDateString()}</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-orange-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> No credentials</span>
                  )}
                  <button
                    onClick={() => setShowCred(p.id)}
                    className="text-[11px] text-[#0091AE] hover:underline flex items-center gap-0.5"
                    data-testid={`rotate-cred-${p.id}`}
                  >
                    <RotateCcw className="w-3 h-3" />{p.secret ? "Rotate key" : "Add key"}
                  </button>
                  <button
                    onClick={() => testMut.mutate(p.id)}
                    disabled={testMut.isPending}
                    className="text-[11px] text-[#33475B] hover:text-[#0091AE] flex items-center gap-0.5 disabled:opacity-50"
                    data-testid={`test-provider-${p.id}`}
                  >
                    {testMut.isPending && testMut.variables === p.id ? <Spinner /> : <Play className="w-3 h-3" />}
                    Test connection
                  </button>
                  {tr && (
                    <span className={`text-[11px] font-medium flex items-center gap-0.5 ${tr.status === "ok" ? "text-green-600" : tr.status === "degraded" ? "text-yellow-600" : "text-red-500"}`}>
                      {tr.status === "ok" ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {tr.status} {tr.latencyMs ? `(${tr.latencyMs}ms)` : ""}
                      {tr.diagnostics?.error ? ` — ${tr.diagnostics.error}` : ""}
                      {typeof tr.diagnostics?.modelsAvailable === "number" ? ` · ${tr.diagnostics.modelsAvailable} models visible` : ""}
                    </span>
                  )}
                </div>
                {p.notes && <p className="mt-2 text-[11px] text-gray-400 italic">{p.notes}</p>}
              </div>
            );
          })}
        </div>
      )}
      {(showAdd || editing) && <ProviderForm provider={editing} onClose={() => { setShowAdd(false); setEditing(null); }} />}
      {showCred && <CredentialForm providerId={showCred} providerName={providers.find(p => p.id === showCred)?.name ?? ""} onClose={() => setShowCred(null)} />}
    </div>
  );
}

function ProviderForm({ provider, onClose }: { provider?: Provider | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: provider?.name ?? "", type: provider?.type ?? "openai",
    baseUrl: provider?.baseUrl ?? "", region: provider?.region ?? "",
    environment: provider?.environment ?? "production",
    status: provider?.status ?? "active",
    rateLimitRpm: provider?.rateLimitRpm?.toString() ?? "",
    costProfile: provider?.costProfile ?? "", notes: provider?.notes ?? "",
    apiKey: "", orgProjectId: "",
  });
  const [error, setError] = useState("");
  const mut = useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      const url = provider ? `/api/admin/ai-providers/${provider.id}` : "/api/admin/ai-providers";
      const method = provider ? "PATCH" : "POST";
      return fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(async r => {
        if (!r.ok) { const e = await r.json(); throw new Error(e.error ?? "Error"); }
        return r.json();
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/ai-providers"] }); onClose(); },
    onError: (e: Error) => setError(e.message),
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const submit = () => {
    const data: Record<string, unknown> = {
      name: form.name, type: form.type,
      baseUrl: form.baseUrl || null, region: form.region || null,
      environment: form.environment, status: form.status,
      rateLimitRpm: form.rateLimitRpm ? parseInt(form.rateLimitRpm) : null,
      costProfile: form.costProfile || null, notes: form.notes || null,
    };
    if (!provider && form.apiKey) { data.apiKey = form.apiKey; data.orgProjectId = form.orgProjectId || undefined; }
    mut.mutate(data);
  };
  return (
    <Modal title={provider ? `Edit ${provider.name}` : "Add Provider"} onClose={onClose}>
      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field label="Display Name" required tooltip="A human-readable label for this provider — shown in dropdowns and logs. E.g. 'OpenAI Production' or 'Azure EU Endpoint'.">
            <input className={inputCls} value={form.name} onChange={e => set("name", e.target.value)} placeholder="OpenAI Production" />
          </Field>
        </div>
        <Field label="Provider Type" required tooltip="The API protocol this provider uses. Select 'openai' for any OpenAI-compatible endpoint (including Azure OpenAI and many third-party proxies). Use 'custom' only if the endpoint has a non-standard protocol.">
          <select className={selectCls} value={form.type} onChange={e => set("type", e.target.value)}>{PROVIDER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
        </Field>
        <Field label="Environment" tooltip="Controls where this provider is used. 'Production' providers serve live translation jobs. 'Staging' and 'Dev' providers are only used during routing simulations and testing — they are never selected for real jobs.">
          <select className={selectCls} value={form.environment} onChange={e => set("environment", e.target.value)}>
            <option value="production">Production</option><option value="staging">Staging</option><option value="dev">Dev</option>
          </select>
        </Field>
        <div className="col-span-2">
          <Field label="Base URL / Endpoint" hint="Leave blank to use the default endpoint for the selected provider type." tooltip="Override the API endpoint URL. Use this for Azure OpenAI (e.g. https://your-resource.openai.azure.com), a corporate proxy, or any OpenAI-compatible third-party host. Leave blank to use the vendor's standard endpoint.">
            <input className={inputCls} value={form.baseUrl} onChange={e => set("baseUrl", e.target.value)} placeholder="https://api.openai.com" />
          </Field>
        </div>
        <Field label="Region" tooltip="Optional. Used for data-residency tracking and can be referenced in routing rules to enforce geographic restrictions (e.g. 'EU' to keep EU data within EU providers).">
          <input className={inputCls} value={form.region} onChange={e => set("region", e.target.value)} placeholder="us-east-1" />
        </Field>
        <Field label="Rate Limit (RPM)" tooltip="Requests per minute this provider allows. The routing engine uses this to avoid overloading the provider under heavy load. If you are unsure, leave blank — no throttling will be applied.">
          <input className={inputCls} type="number" value={form.rateLimitRpm} onChange={e => set("rateLimitRpm", e.target.value)} placeholder="60" />
        </Field>
        <Field label="Cost Profile" tooltip="Free-text label for internal budgeting (e.g. 'enterprise-annual-2024'). Not used in routing logic — purely informational for your records.">
          <input className={inputCls} value={form.costProfile} onChange={e => set("costProfile", e.target.value)} placeholder="standard" />
        </Field>
        <Field label="Status" tooltip="Inactive providers are skipped entirely by the routing engine. Use 'Inactive' to temporarily disable a provider without deleting it (e.g. during key rotation or an outage).">
          <select className={selectCls} value={form.status} onChange={e => set("status", e.target.value)}>
            <option value="active">Active</option><option value="inactive">Inactive</option>
          </select>
        </Field>
        {!provider && <>
          <div className="col-span-2 border-t border-gray-100 pt-3 mt-1">
            <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1"><Lock className="w-3 h-3" /> Credentials (encrypted at rest)</p>
          </div>
          <div className="col-span-2">
            <Field label="API Key" hint="Stored encrypted. Never exposed in UI after save." tooltip="Your API secret key from the provider dashboard. It is encrypted with AES-256-GCM before being stored in the database and is never returned in plaintext. Only the last 4 characters will be shown after saving.">
              <input className={inputCls} type="password" value={form.apiKey} onChange={e => set("apiKey", e.target.value)} placeholder="sk-…" />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Organization / Project ID (optional)" tooltip="Required by some providers (e.g. OpenAI) to scope usage to a specific organization or project. Check your provider dashboard — leave blank if not applicable.">
              <input className={inputCls} value={form.orgProjectId} onChange={e => set("orgProjectId", e.target.value)} placeholder="org-…" />
            </Field>
          </div>
        </>}
        <div className="col-span-2"><Field label="Notes"><textarea className={inputCls + " resize-none"} rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} /></Field></div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
        <button onClick={submit} disabled={mut.isPending} className="px-4 py-1.5 text-sm bg-[#0091AE] text-white rounded-lg hover:bg-[#007a95] disabled:opacity-60 flex items-center gap-1.5">
          {mut.isPending && <Spinner />}{provider ? "Save Changes" : "Add Provider"}
        </button>
      </div>
    </Modal>
  );
}

function CredentialForm({ providerId, providerName, onClose }: { providerId: string; providerName: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [apiKey, setApiKey] = useState("");
  const [orgProjectId, setOrgProjectId] = useState("");
  const [error, setError] = useState("");
  const mut = useMutation({
    mutationFn: () => fetch(`/api/admin/ai-providers/${providerId}/secret`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, orgProjectId: orgProjectId || undefined }),
    }).then(async r => { if (!r.ok) { const e = await r.json(); throw new Error(e.error); } return r.json(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/ai-providers"] }); onClose(); },
    onError: (e: Error) => setError(e.message),
  });
  return (
    <Modal title={`Rotate Credentials — ${providerName}`} onClose={onClose}>
      <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700">
        <Lock className="w-3 h-3 inline mr-1" /> This will replace the existing key. The raw value is never stored — only the encrypted form and last 4 characters.
      </div>
      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
      <div className="space-y-3">
        <Field label="New API Key" required hint="Stored AES-256-GCM encrypted. Not recoverable after save.">
          <input className={inputCls} type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-…" autoFocus />
        </Field>
        <Field label="Organization / Project ID (optional)">
          <input className={inputCls} value={orgProjectId} onChange={e => setOrgProjectId(e.target.value)} placeholder="org-…" />
        </Field>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
        <button onClick={() => mut.mutate()} disabled={mut.isPending || !apiKey} className="px-4 py-1.5 text-sm bg-[#FF7A59] text-white rounded-lg hover:bg-[#e66a49] disabled:opacity-60 flex items-center gap-1.5">
          {mut.isPending && <Spinner />}<RotateCcw className="w-3.5 h-3.5" /> Rotate Key
        </button>
      </div>
    </Modal>
  );
}

// ─── Model Catalog Tab ────────────────────────────────────────────────────────

function ModelCatalog() {
  const qc = useQueryClient();
  const { data: models = [], isLoading } = useQuery<AiModel[]>({ queryKey: ["/api/admin/ai-models"] });
  const { data: providers = [] } = useQuery<Provider[]>({ queryKey: ["/api/admin/ai-providers"] });
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<AiModel | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterProvider, setFilterProvider] = useState("all");
  const [search, setSearch] = useState("");

  const deleteMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/admin/ai-models/${id}`, { method: "DELETE" }).then(async r => {
      if (!r.ok) { const e = await r.json(); throw new Error(e.error); } return r.json();
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/ai-models"] }),
    onError: (e: Error) => alert(e.message),
  });
  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch(`/api/admin/ai-models/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/ai-models"] }),
  });

  const filtered = models.filter(m =>
    (filterStatus === "all" || m.status === filterStatus) &&
    (filterProvider === "all" || m.providerId === filterProvider) &&
    (search === "" || m.displayName.toLowerCase().includes(search.toLowerCase()) || m.apiModelId.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <SectionHeader
        title="Model Catalog"
        subtitle="Register and manage individual models under each provider."
        action={<button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 bg-[#0091AE] text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-[#007a95]"><Plus className="w-3.5 h-3.5" /> Register Model</button>}
      />
      <InfoNote>
        A <strong>Model</strong> is a specific AI model registered under one of your providers — for example <em>GPT-4o</em> under <em>OpenAI Production</em>.
        The <strong>API Model ID</strong> must match the exact string your provider expects in the API request (e.g. <code className="font-mono bg-[#0091AE]/10 px-1 rounded">gpt-4o</code>).
        Use the <strong>Quality, Cost, and Latency tiers</strong> and <strong>Domains</strong> to describe the model&apos;s strengths — this metadata is what the routing engine uses to match jobs to the right model.
        Only models with status <em>Approved</em>, <em>Beta</em>, or <em>Production</em> can be assigned to routing rules.
      </InfoNote>
      <div className="flex flex-wrap gap-2 mb-4">
        <input className={inputCls + " max-w-[200px]"} placeholder="Search models…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className={selectCls + " max-w-[160px]"} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {MODEL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={selectCls + " max-w-[160px]"} value={filterProvider} onChange={e => setFilterProvider(e.target.value)}>
          <option value="all">All providers</option>
          {(providers as Provider[]).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <span className="text-xs text-gray-400 self-center">{filtered.length} model{filtered.length !== 1 ? "s" : ""}</span>
      </div>
      {isLoading ? <div className="flex justify-center py-10"><Spinner /></div> :
        filtered.length === 0 ? <EmptyState icon={Cpu} title="No models found" subtitle="Register your first model to enable routing" /> :
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["Model", "Provider", "API ID", "Context", "Tiers", "Domains", "Status", ""].map(h => (
                  <th key={h} className="text-left py-2.5 px-4 text-[11px] font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50" data-testid={`model-row-${m.id}`}>
                  <td className="py-2.5 px-4">
                    <p className="font-medium text-[#33475B] text-xs">{m.displayName}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{m.internalKey}</p>
                  </td>
                  <td className="py-2.5 px-4 text-xs text-gray-600">{m.provider.name}</td>
                  <td className="py-2.5 px-4 text-[10px] font-mono text-gray-500 max-w-[140px] truncate">{m.apiModelId}</td>
                  <td className="py-2.5 px-4 text-[11px] text-gray-500">{m.contextWindow ? `${(m.contextWindow / 1000).toFixed(0)}K` : "—"}</td>
                  <td className="py-2.5 px-4">
                    <div className="flex flex-col gap-0.5">
                      <QualityBadge tier={m.qualityTier} />
                      <span className="text-[10px] text-gray-400">{LATENCY_ICONS[m.latencyTier]} {m.latencyTier} · {COST_ICONS[m.costTier]}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="flex flex-wrap gap-0.5 max-w-[140px]">
                      {m.domains.slice(0, 3).map(d => <Chip key={d} label={d} />)}
                      {m.domains.length > 3 && <span className="text-[10px] text-gray-400">+{m.domains.length - 3}</span>}
                    </div>
                  </td>
                  <td className="py-2.5 px-4">
                    <select
                      className="text-[11px] bg-transparent border-0 cursor-pointer text-gray-600 focus:outline-none"
                      value={m.status}
                      onChange={e => statusMut.mutate({ id: m.id, status: e.target.value })}
                      data-testid={`model-status-${m.id}`}
                    >
                      {MODEL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditing(m)} className="p-1 text-gray-400 hover:text-[#0091AE] rounded" data-testid={`edit-model-${m.id}`}><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { if (confirm(`Delete "${m.displayName}"?`)) deleteMut.mutate(m.id); }} className="p-1 text-gray-400 hover:text-red-500 rounded" data-testid={`delete-model-${m.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
      {(showAdd || editing) && <ModelForm model={editing} providers={providers as Provider[]} onClose={() => { setShowAdd(false); setEditing(null); }} />}
    </div>
  );
}

function ModelForm({ model, providers, onClose }: { model?: AiModel | null; providers: Provider[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    providerId: model?.providerId ?? providers[0]?.id ?? "",
    displayName: model?.displayName ?? "",
    apiModelId: model?.apiModelId ?? "",
    internalKey: model?.internalKey ?? "",
    version: model?.version ?? "",
    contextWindow: model?.contextWindow?.toString() ?? "",
    outputLimit: model?.outputLimit?.toString() ?? "",
    status: model?.status ?? "draft",
    latencyTier: model?.latencyTier ?? "balanced",
    costTier: model?.costTier ?? "medium",
    qualityTier: model?.qualityTier ?? "standard",
    benchmarkNotes: model?.benchmarkNotes ?? "",
    notes: model?.notes ?? "",
    // UI shows $/1M tokens; DB stores $/token → multiply by 1M for display
    costPerInputTokenUsd: model?.costPerInputTokenUsd != null ? String(parseFloat(String(model.costPerInputTokenUsd)) * 1_000_000) : "",
    costPerOutputTokenUsd: model?.costPerOutputTokenUsd != null ? String(parseFloat(String(model.costPerOutputTokenUsd)) * 1_000_000) : "",
  });
  const [capabilities, setCapabilities] = useState<Record<string, boolean>>(
    model?.capabilities ?? {}
  );
  const [domains, setDomains] = useState<string[]>(model?.domains ?? []);
  const [languageGroups, setLanguageGroups] = useState<string[]>(model?.languageGroups ?? []);
  const [warnings, setWarnings] = useState<string[]>(model?.warnings ?? []);
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      const url = model ? `/api/admin/ai-models/${model.id}` : "/api/admin/ai-models";
      const method = model ? "PATCH" : "POST";
      return fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(async r => {
        if (!r.ok) { const e = await r.json(); throw new Error(typeof e.error === "string" ? e.error : JSON.stringify(e.error)); }
        return r.json();
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/ai-models"] }); onClose(); },
    onError: (e: Error) => setError(e.message),
  });

  const submit = () => {
    mut.mutate({
      providerId: form.providerId,
      displayName: form.displayName,
      apiModelId: form.apiModelId,
      internalKey: form.internalKey,
      version: form.version || null,
      contextWindow: form.contextWindow ? parseInt(form.contextWindow) : null,
      outputLimit: form.outputLimit ? parseInt(form.outputLimit) : null,
      status: form.status, latencyTier: form.latencyTier,
      costTier: form.costTier, qualityTier: form.qualityTier,
      capabilities, domains, languageGroups, warnings,
      benchmarkNotes: form.benchmarkNotes || null,
      notes: form.notes || null,
      // UI is in $/1M tokens; DB stores $/token → divide by 1M before saving
      costPerInputTokenUsd: form.costPerInputTokenUsd ? parseFloat(form.costPerInputTokenUsd) / 1_000_000 : null,
      costPerOutputTokenUsd: form.costPerOutputTokenUsd ? parseFloat(form.costPerOutputTokenUsd) / 1_000_000 : null,
    });
  };

  return (
    <Modal title={model ? `Edit ${model.displayName}` : "Register Model"} onClose={onClose} wide>
      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Provider" required tooltip="The provider account this model belongs to. The routing engine will use this provider's API key and base URL when calling this model.">
          <select className={selectCls} value={form.providerId} onChange={e => set("providerId", e.target.value)}>
            {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Status" tooltip="Lifecycle status. Draft and Disabled models cannot be used in routing rules. Beta = being tested in limited scenarios. Approved/Production = safe for all live jobs. Deprecated/Retired = being phased out — existing rules referencing these will trigger a warning.">
          <select className={selectCls} value={form.status} onChange={e => set("status", e.target.value)}>
            {MODEL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <div className="col-span-2">
          <Field label="Display Name" required tooltip="A friendly name shown in the UI, logs, and routing rule dropdowns. E.g. 'GPT-4o (Nov 2024)'.">
            <input className={inputCls} value={form.displayName} onChange={e => set("displayName", e.target.value)} placeholder="GPT-4o" />
          </Field>
        </div>
        <Field label="API Model ID" required hint="Exact ID sent in API requests." tooltip="The exact model identifier passed in the API request body — must match what the provider expects. Check the provider's documentation. E.g. 'gpt-4o', 'claude-3-5-sonnet-20241022'. A typo here will cause all jobs routed to this model to fail.">
          <input className={inputCls} value={form.apiModelId} onChange={e => set("apiModelId", e.target.value)} placeholder="gpt-4o" />
        </Field>
        <Field label="Internal Key" required hint="Unique routing key used in logs and references." tooltip="A short, unique slug used internally for logs, audit trail, and routing references. Must be unique across all models. Lowercase with hyphens, no spaces. E.g. 'openai-gpt4o-nov24'.">
          <input className={inputCls} value={form.internalKey} onChange={e => set("internalKey", e.target.value)} placeholder="openai-gpt4o" />
        </Field>
        <Field label="Version / Snapshot" tooltip="Optional. Pin a specific dated snapshot of the model if the provider offers versioned endpoints (e.g. '2024-11-20' for OpenAI snapshot versions). Helps ensure consistent output over time.">
          <input className={inputCls} value={form.version} onChange={e => set("version", e.target.value)} placeholder="2024-11-20" />
        </Field>
        <Field label="Context Window (tokens)" tooltip="The maximum number of tokens (input + output combined) this model can handle in a single request. The routing engine uses this to reject documents that are too long for this model and fall back to one with a larger context.">
          <input className={inputCls} type="number" value={form.contextWindow} onChange={e => set("contextWindow", e.target.value)} placeholder="128000" />
        </Field>
        <Field label="Latency Tier" tooltip="Fast: optimized for low response time, suitable for real-time or batch speed-priority jobs. Balanced: default for most jobs. High Quality: model takes longer but produces better output — best for legal, medical, or high-stakes content.">
          <select className={selectCls} value={form.latencyTier} onChange={e => set("latencyTier", e.target.value)}>
            <option value="fast">Fast</option><option value="balanced">Balanced</option><option value="high-quality">High Quality</option>
          </select>
        </Field>
        <Field label="Cost Tier" tooltip="Approximate cost relative to other models. Low ($): budget-friendly, good for high-volume routine content. Medium ($$): general purpose. Premium ($$$): flagship models — use for high-value or complex content where quality justifies the cost.">
          <select className={selectCls} value={form.costTier} onChange={e => set("costTier", e.target.value)}>
            <option value="low">Low ($)</option><option value="medium">Medium ($$)</option><option value="premium">Premium ($$$)</option>
          </select>
        </Field>
        <Field label="Quality Tier" tooltip="Standard: suitable for everyday content. Advanced: strong accuracy and nuance, good for professional content. Flagship: the best available — use for legal, medical, literary, or enterprise-critical translations.">
          <select className={selectCls} value={form.qualityTier} onChange={e => set("qualityTier", e.target.value)}>
            <option value="standard">Standard</option><option value="advanced">Advanced</option><option value="flagship">Flagship</option>
          </select>
        </Field>
        <div className="col-span-2 border-t border-gray-100 pt-3">
          <p className="text-xs font-medium text-gray-500 mb-1 flex items-center">
            Capabilities
            <Tooltip text="Check the features this model genuinely supports. The routing engine uses these to match jobs that require specific features — e.g. a job using a glossary will prefer a model with 'Glossary injection' checked." />
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {ALL_CAPABILITIES.map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" checked={!!capabilities[key]} onChange={e => setCapabilities(c => ({ ...c, [key]: e.target.checked }))} className="rounded" />
                {label}
              </label>
            ))}
          </div>
        </div>
        <div className="col-span-2">
          <ChipInput
            label="Domains / Use Cases"
            tooltip="Which content domains this model performs best in. The routing engine uses this to match domain-specific jobs to the right model. Add 'legal', 'medical', 'technical', etc. as appropriate based on your benchmarks."
            values={domains} onChange={setDomains} suggestions={ALL_DOMAINS}
          />
        </div>
        <div className="col-span-2">
          <ChipInput
            label="Language Groups"
            tooltip="Which language families this model handles well. Used in routing rules — e.g. route CJK content to a model with CJK expertise. Options: european, arabic, cjk, indic, african, low-resource, multilingual."
            values={languageGroups} onChange={setLanguageGroups} suggestions={ALL_LANG_GROUPS}
          />
        </div>
        <div className="col-span-2">
          <ChipInput
            label="Warnings / Caveats"
            tooltip="Known limitations or issues with this model. Shown as warnings in the health dashboard and audit log. E.g. 'Struggles with RTL punctuation' or 'Context window degrades above 80K tokens'."
            values={warnings} onChange={setWarnings}
          />
        </div>
        <div className="col-span-2 border-t border-gray-100 pt-3">
          <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
            Pricing (USD per 1M tokens)
            <Tooltip text="Used to compute estimated cost in the LLM Usage dashboard. Enter the cost in dollars per 1 million tokens. Example: GPT-4o input = $2.50/1M tokens, output = $10.00/1M tokens. Leave blank for BYOK or flat-rate plans." />
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cost per 1M input tokens (USD)" hint="e.g. 2.50 = $2.50 per 1M input tokens (GPT-4o input rate)">
              <input
                className={inputCls} type="number" step="any" min="0"
                value={form.costPerInputTokenUsd}
                onChange={e => set("costPerInputTokenUsd", e.target.value)}
                placeholder="2.50"
                data-testid="input-cost-per-input-token"
              />
            </Field>
            <Field label="Cost per 1M output tokens (USD)" hint="e.g. 10.00 = $10 per 1M output tokens (GPT-4o output rate)">
              <input
                className={inputCls} type="number" step="any" min="0"
                value={form.costPerOutputTokenUsd}
                onChange={e => set("costPerOutputTokenUsd", e.target.value)}
                placeholder="10.00"
                data-testid="input-cost-per-output-token"
              />
            </Field>
          </div>
        </div>
        <div className="col-span-2">
          <Field label="Benchmark Notes" tooltip="Free-text notes on your own evaluations or vendor benchmark results. Not used in routing logic — for internal reference only.">
            <textarea className={inputCls + " resize-none"} rows={2} value={form.benchmarkNotes} onChange={e => set("benchmarkNotes", e.target.value)} />
          </Field>
        </div>
        <div className="col-span-2"><Field label="Notes"><textarea className={inputCls + " resize-none"} rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} /></Field></div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
        <button onClick={submit} disabled={mut.isPending} className="px-4 py-1.5 text-sm bg-[#0091AE] text-white rounded-lg hover:bg-[#007a95] disabled:opacity-60 flex items-center gap-1.5">
          {mut.isPending && <Spinner />}{model ? "Save Changes" : "Register Model"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Routing Rules Tab ────────────────────────────────────────────────────────

const CONDITION_FIELDS = [
  { key: "domains", label: "Domains", type: "chips", suggestions: ALL_DOMAINS },
  { key: "langPairs", label: "Language Pairs (e.g. en-fr)", type: "chips", suggestions: [] },
  { key: "sourceLanguages", label: "Source Languages", type: "chips", suggestions: [] },
  { key: "targetLanguages", label: "Target Languages", type: "chips", suggestions: [] },
  { key: "languageGroups", label: "Language Groups", type: "chips", suggestions: ALL_LANG_GROUPS },
  { key: "priorityModes", label: "Priority Modes", type: "chips", suggestions: ["quality", "speed", "cost"] },
  { key: "clientTiers", label: "Client Tiers", type: "chips", suggestions: ["standard", "professional", "enterprise"] },
  { key: "documentTypes", label: "Document Types", type: "chips", suggestions: ["book", "report", "contract", "website", "ui-strings", "code", "subtitle"] },
  { key: "tokenMin", label: "Min Tokens (inclusive)", type: "number" },
];

function RoutingRules() {
  const qc = useQueryClient();
  const { data: rules = [], isLoading } = useQuery<RoutingRule[]>({ queryKey: ["/api/admin/llm-rules"] });
  const { data: models = [] } = useQuery<AiModel[]>({ queryKey: ["/api/admin/ai-models"] });
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<RoutingRule | null>(null);

  const deleteMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/admin/llm-rules/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/llm-rules"] }),
  });
  const toggleMut = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      fetch(`/api/admin/llm-rules/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/llm-rules"] }),
  });

  return (
    <div>
      <SectionHeader
        title="Routing Rules Engine"
        subtitle="Rules are evaluated in priority order (lowest number = highest priority). First match wins."
        action={<button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 bg-[#0091AE] text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-[#007a95]"><Plus className="w-3.5 h-3.5" /> Add Rule</button>}
      />
      <InfoNote>
        Rules are evaluated <strong>in order from lowest to highest priority number</strong> — the first rule whose conditions all match wins.
        If <strong>no rule matches</strong>, the system falls back to the platform default model (<em>gpt-5-nano</em> via the Replit integration key).
        Each rule can specify up to <strong>three models</strong>: a primary and two automatic fallbacks — if the primary fails due to an error or rate limit, the engine tries the next one in sequence.
        Use the <strong>Test Console</strong> to simulate any job and verify which rule and model would be selected before it affects live traffic.
      </InfoNote>
      {isLoading ? <div className="flex justify-center py-10"><Spinner /></div> :
        rules.length === 0 ? <EmptyState icon={GitBranch} title="No routing rules" subtitle="Create rules to control which model is selected for each translation context" /> :
        <div className="space-y-2">
          {rules.map((rule, idx) => {
            const conditions = rule.conditions ?? {};
            const conditionSummary = Object.entries(conditions)
              .filter(([, v]) => v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true))
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? (v as string[]).join(", ") : v}`)
              .join(" · ");
            return (
              <div key={rule.id} className={`bg-white border rounded-xl p-4 ${rule.enabled ? "border-gray-200" : "border-gray-100 opacity-60"}`} data-testid={`rule-row-${rule.id}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-[#33475B]/10 rounded-lg flex items-center justify-center text-xs font-bold text-[#33475B]">{rule.priority}</div>
                    <div>
                      <p className="text-sm font-semibold text-[#33475B]">{rule.name}</p>
                      {rule.description && <p className="text-[10px] text-gray-400">{rule.description}</p>}
                    </div>
                    {rule.isTemplate && <Badge label="Template" color="bg-purple-100 text-purple-600" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleMut.mutate({ id: rule.id, enabled: !rule.enabled })} className={`text-xs px-2 py-0.5 rounded-full border font-medium ${rule.enabled ? "border-green-300 text-green-600 bg-green-50" : "border-gray-200 text-gray-400"}`} data-testid={`toggle-rule-${rule.id}`}>
                      {rule.enabled ? "Enabled" : "Disabled"}
                    </button>
                    <button onClick={() => setEditing(rule)} className="p-1 text-gray-400 hover:text-[#0091AE]" data-testid={`edit-rule-${rule.id}`}><Edit3 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { if (confirm(`Delete rule "${rule.name}"?`)) deleteMut.mutate(rule.id); }} className="p-1 text-gray-400 hover:text-red-500" data-testid={`delete-rule-${rule.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                {conditionSummary && <p className="mt-2 text-[11px] text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5 font-mono">{conditionSummary}</p>}
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {[
                    { label: "Primary", model: rule.primaryModel },
                    { label: "Fallback 1", model: rule.secondaryModel },
                    { label: "Fallback 2", model: rule.tertiaryModel },
                  ].map(({ label, model }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-400 w-14 flex-shrink-0">{label}</span>
                      {model ? (
                        <span className="text-[11px] font-medium text-[#33475B] flex items-center gap-1">
                          <StatusBadge status={model.status} />
                          {model.displayName}
                        </span>
                      ) : <span className="text-[10px] text-gray-300 italic">none</span>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      }
      {(showAdd || editing) && <RuleForm rule={editing} models={models as AiModel[]} onClose={() => { setShowAdd(false); setEditing(null); }} />}
    </div>
  );
}

function RuleForm({ rule, models, onClose }: { rule?: RoutingRule | null; models: AiModel[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: rule?.name ?? "", description: rule?.description ?? "",
    priority: rule?.priority?.toString() ?? "100",
    enabled: rule?.enabled ?? true,
    primaryModelId: rule?.primaryModelId ?? "",
    secondaryModelId: rule?.secondaryModelId ?? "",
    tertiaryModelId: rule?.tertiaryModelId ?? "",
    terminologyMode: (rule?.policy as Record<string, string>)?.terminologyMode ?? "",
    isTemplate: rule?.isTemplate ?? false,
  });
  const [conditions, setConditions] = useState<Record<string, unknown>>(rule?.conditions ?? {});
  const [error, setError] = useState("");
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  const setCondition = (k: string, v: unknown) => setConditions(c => ({ ...c, [k]: v }));

  const mut = useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      const url = rule ? `/api/admin/llm-rules/${rule.id}` : "/api/admin/llm-rules";
      const method = rule ? "PATCH" : "POST";
      return fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(async r => {
        if (!r.ok) { const e = await r.json(); throw new Error(e.error); } return r.json();
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/llm-rules"] }); onClose(); },
    onError: (e: Error) => setError(e.message),
  });

  const submit = () => {
    const cleanConditions = Object.fromEntries(
      Object.entries(conditions).filter(([, v]) => v !== undefined && v !== "" && (Array.isArray(v) ? v.length > 0 : true))
    );
    mut.mutate({
      name: form.name, description: form.description || null,
      priority: parseInt(form.priority) || 100,
      enabled: form.enabled, conditions: cleanConditions,
      primaryModelId: form.primaryModelId || null,
      secondaryModelId: form.secondaryModelId || null,
      tertiaryModelId: form.tertiaryModelId || null,
      policy: { terminologyMode: form.terminologyMode || null },
      isTemplate: form.isTemplate,
    });
  };

  const activeModels = models.filter(m => ["approved", "production", "beta"].includes(m.status));

  return (
    <Modal title={rule ? `Edit Rule: ${rule.name}` : "Create Routing Rule"} onClose={onClose} wide>
      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field label="Rule Name" required tooltip="A descriptive name shown in the rules list and audit log. Be specific — e.g. 'Legal EN→AR Flagship' rather than 'Rule 1'.">
            <input className={inputCls} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Technical & Legal Documents" />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Description" tooltip="Optional longer explanation of what this rule does and why. Helps other admins understand intent without having to decode the conditions.">
            <input className={inputCls} value={form.description} onChange={e => set("description", e.target.value)} />
          </Field>
        </div>
        <Field label="Priority" hint="Lower number = higher priority. Rules are evaluated from 1 upwards." tooltip="Controls the order in which rules are evaluated. Lower numbers run first. If two rules could both match the same job, the one with the lower priority number wins. Tip: leave gaps between numbers (e.g. 10, 20, 30) so you can insert new rules later without renumbering.">
          <input className={inputCls} type="number" min={1} max={9999} value={form.priority} onChange={e => set("priority", e.target.value)} />
        </Field>
        <Field label="Enabled" tooltip="Disabled rules are completely skipped during routing — they are never evaluated, even if their conditions would match. Use this to pause a rule temporarily without deleting it.">
          <select className={selectCls} value={form.enabled ? "true" : "false"} onChange={e => set("enabled", e.target.value === "true")}>
            <option value="true">Enabled</option><option value="false">Disabled</option>
          </select>
        </Field>
        <div className="col-span-2 border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center">
            Match Conditions
            <Tooltip text="All conditions you fill in must match simultaneously for this rule to apply to a job. Leave a condition empty to ignore it. Example: set Domains = 'legal' and Target Languages = 'ar' to match only Arabic legal jobs." />
          </p>
          <p className="text-[11px] text-gray-400 mb-3">All specified conditions must match. Leave blank to match any value.</p>
          <div className="space-y-3">
            {CONDITION_FIELDS.map(cf => {
              if (cf.type === "chips") {
                return (
                  <ChipInput
                    key={cf.key}
                    label={cf.label}
                    values={(conditions[cf.key] as string[]) ?? []}
                    onChange={v => setCondition(cf.key, v)}
                    suggestions={cf.suggestions.length > 0 ? cf.suggestions : undefined}
                  />
                );
              }
              return (
                <Field key={cf.key} label={cf.label}>
                  <input
                    className={inputCls} type="number"
                    value={(conditions[cf.key] as string) ?? ""}
                    onChange={e => setCondition(cf.key, e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="e.g. 50000"
                  />
                </Field>
              );
            })}
          </div>
        </div>
        <div className="col-span-2 border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center">
            Model Selection
            <Tooltip text="Assign a primary model and up to two automatic fallbacks. If the primary model fails (API error, rate limit, or context overflow), the engine retries with the secondary, then the tertiary. Only models with status Approved, Beta, or Production appear here." />
          </p>
          <div className="space-y-2 mt-2">
          {[
            { label: "Primary Model", key: "primaryModelId" as const, tip: "The first model the engine will call for jobs matching this rule. Choose the model that best fits the conditions above." },
            { label: "Secondary Fallback", key: "secondaryModelId" as const, tip: "Called automatically if the primary model fails. Use a reliable, lower-tier model as a safety net." },
            { label: "Tertiary Fallback", key: "tertiaryModelId" as const, tip: "Last resort if both primary and secondary fail. Consider a highly available standard model here." },
          ].map(({ label, key, tip }) => (
            <Field key={key} label={label} tooltip={tip}>
              <select className={selectCls} value={(form as Record<string, unknown>)[key] as string ?? ""} onChange={e => set(key, e.target.value)}>
                <option value="">— None —</option>
                {activeModels.map(m => <option key={m.id} value={m.id}>{m.displayName} ({m.provider.name}) · {m.qualityTier}</option>)}
              </select>
            </Field>
          ))}
          </div>
        </div>
        <div className="col-span-2 border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold text-gray-600 mb-2">Policy</p>
          <Field label="Terminology Mode" tooltip="Strict: glossary terms are injected as hard constraints — the model must use them exactly as defined. Flexible: terms are injected as guidance only. None: glossary is ignored for jobs matching this rule. Default follows the job-level setting.">
            <select className={selectCls} value={form.terminologyMode} onChange={e => set("terminologyMode", e.target.value)}>
              <option value="">Default</option><option value="strict">Strict</option><option value="flexible">Flexible</option><option value="none">None</option>
            </select>
          </Field>
        </div>
        <div className="col-span-2">
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
            <input type="checkbox" checked={form.isTemplate} onChange={e => set("isTemplate", e.target.checked)} className="rounded" />
            <span>Mark as Template rule (reference only — never evaluated)</span>
            <Tooltip text="Template rules are saved for documentation or as a starting point to clone, but are never evaluated by the routing engine. Use this to preserve a rule configuration you want to reference or reuse later without activating it." />
          </label>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
        <button onClick={submit} disabled={mut.isPending} className="px-4 py-1.5 text-sm bg-[#0091AE] text-white rounded-lg hover:bg-[#007a95] disabled:opacity-60 flex items-center gap-1.5">
          {mut.isPending && <Spinner />}{rule ? "Save Rule" : "Create Rule"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Test Console Tab ─────────────────────────────────────────────────────────

function TestConsole() {
  const [form, setForm] = useState({
    sourceLang: "en", targetLang: "fr", domain: "", region: "",
    documentType: "", estimatedTokens: "", priorityMode: "quality",
    clientTier: "", humanReview: "false", terminologyStrictness: "flexible",
  });
  const [result, setResult] = useState<SimResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const run = useCallback(async () => {
    setRunning(true); setError(""); setResult(null);
    try {
      const res = await fetch("/api/admin/llm-simulate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceLang: form.sourceLang, targetLang: form.targetLang,
          domain: form.domain || undefined, region: form.region || undefined,
          documentType: form.documentType || undefined,
          estimatedTokens: form.estimatedTokens ? parseInt(form.estimatedTokens) : undefined,
          priorityMode: form.priorityMode || undefined,
          clientTier: form.clientTier || undefined,
          humanReview: form.humanReview === "true",
          terminologyStrictness: form.terminologyStrictness || undefined,
        }),
      });
      if (!res.ok) throw new Error("Simulation failed");
      setResult(await res.json());
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setRunning(false); }
  }, [form]);

  return (
    <div className="grid grid-cols-5 gap-6">
      <div className="col-span-2">
        <SectionHeader title="Routing Simulator" subtitle="Simulate a translation request and see which model would be selected." />
        <InfoNote>
          This is a <strong>dry-run simulation</strong> — no actual translation is performed and no credits are consumed.
          Fill in the parameters of a hypothetical job and click <strong>Run Simulation</strong> to see exactly which routing rule would match and which model would be selected.
          Use this to verify your routing rules are working as intended before they affect live traffic.
        </InfoNote>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Source Language" required><input className={inputCls} value={form.sourceLang} onChange={e => set("sourceLang", e.target.value)} placeholder="en" /></Field>
            <Field label="Target Language" required><input className={inputCls} value={form.targetLang} onChange={e => set("targetLang", e.target.value)} placeholder="fr" /></Field>
          </div>
          <Field label="Domain">
            <select className={selectCls} value={form.domain} onChange={e => set("domain", e.target.value)}>
              <option value="">Any</option>{ALL_DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Document Type">
            <select className={selectCls} value={form.documentType} onChange={e => set("documentType", e.target.value)}>
              <option value="">Any</option>
              {["book", "report", "contract", "website", "ui-strings", "code", "subtitle", "policy-manual"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Estimated Tokens"><input className={inputCls} type="number" value={form.estimatedTokens} onChange={e => set("estimatedTokens", e.target.value)} placeholder="5000" /></Field>
            <Field label="Region"><input className={inputCls} value={form.region} onChange={e => set("region", e.target.value)} placeholder="EU" /></Field>
          </div>
          <Field label="Priority Mode">
            <select className={selectCls} value={form.priorityMode} onChange={e => set("priorityMode", e.target.value)}>
              <option value="quality">Quality</option><option value="speed">Speed</option><option value="cost">Cost</option>
            </select>
          </Field>
          <Field label="Client Tier">
            <select className={selectCls} value={form.clientTier} onChange={e => set("clientTier", e.target.value)}>
              <option value="">Any</option>
              {["standard", "professional", "enterprise"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Terminology Strictness">
            <select className={selectCls} value={form.terminologyStrictness} onChange={e => set("terminologyStrictness", e.target.value)}>
              <option value="strict">Strict</option><option value="flexible">Flexible</option><option value="none">None</option>
            </select>
          </Field>
          <Field label="Human Review">
            <select className={selectCls} value={form.humanReview} onChange={e => set("humanReview", e.target.value)}>
              <option value="false">No</option><option value="true">Yes</option>
            </select>
          </Field>
          <button
            onClick={run} disabled={running}
            className="w-full flex items-center justify-center gap-2 bg-[#33475B] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#2c3e50] disabled:opacity-60"
            data-testid="run-simulation"
          >
            {running ? <Spinner /> : <FlaskConical className="w-4 h-4" />}
            {running ? "Simulating…" : "Run Simulation"}
          </button>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      </div>

      <div className="col-span-3">
        {!result ? (
          <div className="h-full flex items-center justify-center">
            <EmptyState icon={FlaskConical} title="No simulation run yet" subtitle="Fill in the parameters and click Run Simulation" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#33475B]">Routing Decision</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-400">Confidence</span>
                  <div className="relative w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-[#0091AE] rounded-full" style={{ width: `${result.confidence}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-[#0091AE]">{result.confidence}%</span>
                </div>
              </div>
              <div className="p-3 bg-[#0091AE]/5 border border-[#0091AE]/20 rounded-lg mb-3">
                <p className="text-xs font-semibold text-[#0091AE] mb-0.5">{result.matchedRule ? `Matched: ${result.matchedRule}` : "Global Default Policy"}</p>
                <p className="text-[11px] text-gray-600">{result.matchReason}</p>
              </div>
              {result.primaryModel ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-3">
                  <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wide mb-1">Selected Model</p>
                  <p className="text-sm font-bold text-[#33475B]">{result.primaryModel.displayName}</p>
                  <p className="text-[11px] text-gray-500">{result.primaryModel.providerName}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <QualityBadge tier={result.primaryModel.qualityTier} />
                    <Badge label={`${COST_ICONS[result.primaryModel.costTier]} ${result.primaryModel.costTier}`} color="bg-gray-100 text-gray-600" />
                    <Badge label={`${LATENCY_ICONS[result.primaryModel.latencyTier]} ${result.primaryModel.latencyTier}`} color="bg-gray-100 text-gray-600" />
                    {result.primaryModel.contextWindow && <Badge label={`${(result.primaryModel.contextWindow / 1000).toFixed(0)}K ctx`} color="bg-blue-50 text-blue-600" />}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
                  <p className="text-xs text-red-600 font-semibold">No model available</p>
                  <p className="text-[11px] text-red-500">No active models match the request parameters. Add and activate models in the Model Catalog.</p>
                </div>
              )}
              {result.fallbackChain.length > 0 && (
                <div className="mb-3">
                  <p className="text-[11px] font-semibold text-gray-500 mb-2">Fallback Chain</p>
                  <div className="space-y-1">
                    {result.fallbackChain.map((m, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] text-gray-600 p-2 bg-gray-50 rounded-lg">
                        <span className="text-gray-400">↳ {i + 1}.</span>
                        <span className="font-medium">{m.displayName}</span>
                        <span className="text-gray-400">{m.providerName}</span>
                        <QualityBadge tier={m.qualityTier} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {result.blockedModels.length > 0 && (
                <div className="mb-3">
                  <p className="text-[11px] font-semibold text-gray-500 mb-2">Blocked Models</p>
                  {result.blockedModels.map((b, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-red-600 mb-1">
                      <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span><span className="font-medium">{b.model}</span>: {b.reason}</span>
                    </div>
                  ))}
                </div>
              )}
              {result.riskFlags.length > 0 && (
                <div className="mb-3">
                  {result.riskFlags.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-yellow-700 p-2 bg-yellow-50 rounded-lg mb-1">
                      <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />{f}
                    </div>
                  ))}
                </div>
              )}
              {result.policyNotes.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 mb-1">Policy Notes</p>
                  {result.policyNotes.map((n, i) => (
                    <p key={i} className="text-[11px] text-gray-500 flex items-start gap-1"><Info className="w-3 h-3 mt-0.5 flex-shrink-0 text-[#0091AE]" />{n}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Health & Status Tab ──────────────────────────────────────────────────────

function HealthStatus() {
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery<HealthSummary>({ queryKey: ["/api/admin/llm-health"] });

  const s = data?.summary;
  const statCards = s ? [
    { label: "Active Providers", value: s.activeProviders, icon: Server, color: "text-green-600 bg-green-100" },
    { label: "Production Models", value: s.productionModels, icon: Star, color: "text-[#0091AE] bg-[#0091AE]/10" },
    { label: "Deprecated", value: s.deprecatedModels, icon: Clock, color: "text-yellow-600 bg-yellow-100" },
    { label: "Broken Rules", value: s.brokenRules, icon: AlertTriangle, color: s.brokenRules > 0 ? "text-red-600 bg-red-100" : "text-gray-400 bg-gray-100" },
    { label: "Routing Rules", value: s.totalRules, icon: GitBranch, color: "text-[#33475B] bg-[#33475B]/10" },
    { label: "Total Models", value: s.totalModels, icon: Cpu, color: "text-gray-600 bg-gray-100" },
  ] : [];

  return (
    <div>
      <SectionHeader
        title="Health & Status"
        subtitle="Live overview of provider connectivity and model availability."
        action={
          <button onClick={() => refetch()} className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        }
      />
      <InfoNote>
        Health checks are triggered automatically when you click <strong>Test connection</strong> on a provider, or when you run a simulation.
        A provider showing <strong>failed</strong> or <strong>degraded</strong> status means the routing engine may be skipping it in favor of fallbacks.
        <strong>Recent Failures</strong> counts API errors in the last 24 hours — investigate and rotate credentials if the count is high.
        Warnings shown at the top of this view indicate configuration issues that could affect routing reliability (e.g. a routing rule pointing to a deprecated model).
      </InfoNote>
      {isLoading ? <div className="flex justify-center py-10"><Spinner /></div> : (
        <>
          {data?.warnings && <WarningBanner messages={data.warnings} />}
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {statCards.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-xl font-bold text-[#33475B]">{value}</p>
                <p className="text-[10px] text-gray-500">{label}</p>
              </div>
            ))}
          </div>
          {data?.providerHealth && data.providerHealth.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#33475B]">Provider Health</h3>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b border-gray-100">
                  {["Provider", "Type", "Last Status", "Latency", "Failures", "Checked"].map(h => (
                    <th key={h} className="text-left py-2 px-4 text-[11px] font-medium text-gray-500">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {data.providerHealth.map(ph => (
                    <tr key={ph.providerId} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-2.5 px-4 text-xs font-medium text-[#33475B]">{ph.providerName}</td>
                      <td className="py-2.5 px-4 text-[11px] text-gray-500 uppercase">{ph.providerType}</td>
                      <td className="py-2.5 px-4"><StatusBadge status={ph.latestStatus} /></td>
                      <td className="py-2.5 px-4 text-[11px] text-gray-500">{ph.latestLatencyMs ? `${ph.latestLatencyMs}ms` : "—"}</td>
                      <td className="py-2.5 px-4">
                        {ph.recentFailures > 0 ? <span className="text-[11px] text-red-500 font-medium">{ph.recentFailures}</span> : <span className="text-[11px] text-gray-400">0</span>}
                      </td>
                      <td className="py-2.5 px-4 text-[11px] text-gray-400">{new Date(ph.checkedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data?.recentChecks && data.recentChecks.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h3 className="text-xs font-semibold text-[#33475B]">Recent Health Checks</h3>
              </div>
              <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                {data.recentChecks.map(chk => (
                  <div key={chk.id} className="px-5 py-2.5 flex items-center gap-3 hover:bg-gray-50/50">
                    <StatusBadge status={chk.status} />
                    <span className="text-xs font-medium text-[#33475B]">{chk.provider.name}</span>
                    {chk.model && <span className="text-[11px] text-gray-400">· {chk.model.displayName}</span>}
                    {chk.latencyMs && <span className="text-[11px] text-gray-400 ml-auto">{chk.latencyMs}ms</span>}
                    {(chk.diagnostics as Record<string, unknown>)?.modelsAvailable && (
                      <span className="text-[11px] text-green-600">{(chk.diagnostics as Record<string, unknown>).modelsAvailable as number} models visible</span>
                    )}
                    <span className="text-[10px] text-gray-400 ml-2">{new Date(chk.checkedAt).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(!data?.providerHealth || data.providerHealth.length === 0) && (
            <EmptyState icon={Activity} title="No health data yet" subtitle="Run a connection test from the Provider Registry to see results here" />
          )}
        </>
      )}
    </div>
  );
}

// ─── Audit Log Tab ────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  provider_added: { label: "Provider Added", color: "bg-green-100 text-green-700" },
  provider_updated: { label: "Provider Updated", color: "bg-blue-100 text-blue-600" },
  provider_deleted: { label: "Provider Deleted", color: "bg-red-100 text-red-600" },
  credential_rotated: { label: "Credentials Rotated", color: "bg-orange-100 text-orange-600" },
  connection_test: { label: "Connection Test", color: "bg-gray-100 text-gray-600" },
  model_added: { label: "Model Added", color: "bg-green-100 text-green-700" },
  model_updated: { label: "Model Updated", color: "bg-blue-100 text-blue-600" },
  model_activated: { label: "Model Activated", color: "bg-emerald-100 text-emerald-700" },
  model_deprecated: { label: "Model Deprecated", color: "bg-yellow-100 text-yellow-700" },
  model_disabled: { label: "Model Disabled", color: "bg-slate-100 text-slate-600" },
  model_retired: { label: "Model Retired", color: "bg-red-100 text-red-600" },
  model_deleted: { label: "Model Deleted", color: "bg-red-100 text-red-600" },
  rule_created: { label: "Rule Created", color: "bg-green-100 text-green-700" },
  rule_updated: { label: "Rule Updated", color: "bg-blue-100 text-blue-600" },
  rule_deleted: { label: "Rule Deleted", color: "bg-red-100 text-red-600" },
  simulation_run: { label: "Simulation Run", color: "bg-purple-100 text-purple-600" },
};

function AuditLogTab() {
  const [filterType, setFilterType] = useState("all");
  const { data: logs = [], isLoading, refetch } = useQuery<AuditEntry[]>({
    queryKey: ["/api/admin/llm-audit", filterType],
    queryFn: () => fetch(`/api/admin/llm-audit${filterType !== "all" ? `?entityType=${filterType}` : ""}`).then(r => r.json()),
  });
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div>
      <SectionHeader
        title="Audit Log"
        subtitle="Immutable record of every configuration change — who changed what, and when."
        action={
          <div className="flex items-center gap-2">
            <select className={selectCls + " max-w-[140px]"} value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">All events</option>
              <option value="provider">Providers</option>
              <option value="model">Models</option>
              <option value="rule">Rules</option>
              <option value="simulation">Simulations</option>
            </select>
            <button onClick={() => refetch()} className="p-1.5 text-gray-400 hover:text-[#0091AE] border border-gray-200 rounded-lg"><RefreshCw className="w-3.5 h-3.5" /></button>
          </div>
        }
      />
      <InfoNote>
        Every create, update, delete, and simulation action is recorded here automatically — including which admin performed it and a before/after diff of the data.
        Click any row to expand the diff. This log is append-only and cannot be modified or deleted from the UI.
        Use it to investigate unexpected routing changes, roll back mentally to a previous configuration, or demonstrate compliance.
      </InfoNote>
      {isLoading ? <div className="flex justify-center py-10"><Spinner /></div> :
        logs.length === 0 ? <EmptyState icon={ClipboardList} title="No audit events" subtitle="Changes to providers, models and rules will appear here" /> :
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="divide-y divide-gray-50">
            {logs.map(log => {
              const cfg = ACTION_LABELS[log.action] ?? { label: log.action, color: "bg-gray-100 text-gray-500" };
              const isOpen = expanded === log.id;
              return (
                <div key={log.id} className="hover:bg-gray-50/50" data-testid={`audit-row-${log.id}`}>
                  <button className="w-full flex items-center gap-3 px-5 py-2.5 text-left" onClick={() => setExpanded(isOpen ? null : log.id)}>
                    <Badge label={cfg.label} color={cfg.color} />
                    <span className="text-xs font-medium text-[#33475B] flex-1">{log.entityName ?? log.entityId ?? "—"}</span>
                    <span className="text-[10px] text-gray-400">{log.actorEmail ?? "System"}</span>
                    <span className="text-[10px] text-gray-400">{new Date(log.createdAt).toLocaleString()}</span>
                    {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                  </button>
                  {isOpen && (log.before || log.after) && (
                    <div className="px-5 pb-3 grid grid-cols-2 gap-3">
                      {log.before && (
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 mb-1">Before</p>
                          <pre className="text-[10px] bg-gray-50 border border-gray-100 rounded-lg p-2 overflow-x-auto text-gray-600">{JSON.stringify(log.before, null, 2)}</pre>
                        </div>
                      )}
                      {log.after && (
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 mb-1">After</p>
                          <pre className="text-[10px] bg-gray-50 border border-gray-100 rounded-lg p-2 overflow-x-auto text-gray-600">{JSON.stringify(log.after, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      }
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: "providers", label: "Provider Registry", icon: Server },
  { id: "models", label: "Model Catalog", icon: Cpu },
  { id: "rules", label: "Routing Rules", icon: GitBranch },
  { id: "console", label: "Test Console", icon: FlaskConical },
  { id: "health", label: "Health & Status", icon: Activity },
  { id: "audit", label: "Audit Log", icon: ClipboardList },
];

export default function LlmConfigPage() {
  const [tab, setTab] = useState("providers");

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-[#FF7A59]/10 rounded-xl flex items-center justify-center">
            <Shield className="w-4 h-4 text-[#FF7A59]" />
          </div>
          <h1 className="text-xl font-bold text-[#33475B]">LLM Routing & AI Configuration</h1>
        </div>
        <p className="text-xs text-gray-400 ml-10">Enterprise routing control center — configure providers, models, and selection rules without code changes.</p>
      </div>

      <HowItWorks />

      <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.id ? "border-[#0091AE] text-[#0091AE]" : "border-transparent text-gray-500 hover:text-[#33475B]"}`}
            data-testid={`tab-${t.id}`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === "providers" && <ProviderRegistry />}
        {tab === "models" && <ModelCatalog />}
        {tab === "rules" && <RoutingRules />}
        {tab === "console" && <TestConsole />}
        {tab === "health" && <HealthStatus />}
        {tab === "audit" && <AuditLogTab />}
      </div>
    </div>
  );
}
