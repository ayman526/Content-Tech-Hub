"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Link2, Unlink, Settings2, Globe, Loader2, Check, X, RefreshCw,
  ChevronDown, ChevronRight, Send, ExternalLink, Clock, CheckCircle,
  AlertTriangle, Lock, ArrowRight, Search, Square, CheckSquare,
  FileText, Tag, Database, Download,
} from "lucide-react";
import { SiWordpress } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { PLUGIN_VERSION, PLUGIN_BANNER_DISMISSED_KEY } from "@/lib/wordpress-plugin-version";

// ─── Types ───────────────────────────────────────────────────────────────────

type Connection = {
  id: string; siteUrl: string; username: string;
  multilingualPlugin: string; sourceLanguage: string;
  targetLanguages: string[]; deliveryMode: string; connectedAt: string;
  siteProfile: any; pluginVersion: string | null;
};

function isVersionOutdated(installed: string | null, latest: string): boolean {
  if (!installed) return false;
  const parse = (v: string) => v.split(".").map((n) => parseInt(n, 10) || 0);
  const a = parse(installed);
  const b = parse(latest);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    if (ai < bi) return true;
    if (ai > bi) return false;
  }
  return false;
}

function PluginUpdateBanner({ installedVersion, onDismiss }: { installedVersion: string; onDismiss: () => void }) {
  return (
    <div
      className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm"
      data-testid="banner-plugin-update"
    >
      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-amber-800">Plugin update available</p>
        <p className="text-amber-700 text-xs mt-0.5">
          Your WordPress site is running plugin v{installedVersion}. The latest version is v{PLUGIN_VERSION}.
          Update the companion plugin to get the latest features and fixes.
        </p>
        <a
          href="/api/integrations/wordpress/download"
          download
          data-testid="link-plugin-download-banner"
          className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold text-amber-800 underline"
        >
          <Download className="w-3 h-3" /> Download v{PLUGIN_VERSION}
        </a>
      </div>
      <button
        onClick={onDismiss}
        className="text-amber-400 hover:text-amber-600 flex-shrink-0"
        aria-label="Dismiss update banner"
        data-testid="btn-dismiss-plugin-update"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

type Language = { code: string; name: string; nativeName?: string; isDefault: boolean };
type PostType = { slug: string; name: string; count?: number };
type TranslationStatus = Record<string, string>;

type WPPost = {
  id: number; title: string; type: string; slug: string; status: string;
  link?: string; modifiedAt: string;
  jobId: string | null; jobStatus: string | null;
  translationStatus: TranslationStatus;
  lastTranslatedAt: string | null;
  language?: string;
};

type WPJob = {
  id: string; sourcePostId: number; sourcePostType: string; sourcePostTitle: string | null;
  sourceLanguage: string; wordCount: number; workflowType: string; status: string;
  siteUrl: string; createdAt: string; updatedAt: string;
  locales: {
    id: string; targetLanguage: string; status: string;
    targetPostId: number | null; error: string | null; deliveredAt: string | null;
    translatedData: Record<string, any> | null;
  }[];
};

type Mapping = {
  id: string; postType: string; postTypeName: string | null;
  includeTitle: boolean; includeContent: boolean; includeExcerpt: boolean;
  includeAcf: boolean; includeYoast: boolean; includeSlug: boolean;
  includeMenus: boolean; targetStatus: string; workflowType: string;
};

// ─── Status helpers ───────────────────────────────────────────────────────────

// Normalized display labels for per-locale translation status
const STATUS_LABELS: Record<string, string> = {
  MISSING: "Missing",
  QUEUED: "In progress",
  IN_PROGRESS: "In progress",
  DELIVERED: "Up to date",
  FAILED: "Failed",
  OUT_OF_DATE: "Stale",
  CANCELLED: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  MISSING: "text-[#99ACC2] bg-[#F5F8FA]",
  QUEUED: "text-[#516F90] bg-[#EEF2FF]",
  IN_PROGRESS: "text-[#0091AE] bg-[#E8F5F8]",
  DELIVERED: "text-[#00BDA5] bg-[#E6FAF8]",
  FAILED: "text-red-500 bg-red-50",
  OUT_OF_DATE: "text-amber-600 bg-amber-50",
  CANCELLED: "text-[#99ACC2] bg-[#F5F8FA]",
};

// Display labels for parent job status (operational / internal detail)
const JOB_STATUS_LABELS: Record<string, string> = {
  QUEUED: "Queued",
  IN_PROGRESS: "In progress",
  DELIVERED: "Delivered",
  FAILED: "Failed",
  OUT_OF_DATE: "Stale",
  CANCELLED: "Cancelled",
};

const JOB_STATUS_COLORS: Record<string, string> = {
  QUEUED: "text-[#516F90] bg-[#F5F8FA]",
  IN_PROGRESS: "text-[#0091AE] bg-[#E8F5F8]",
  DELIVERED: "text-[#00BDA5] bg-[#E6FAF8]",
  FAILED: "text-red-500 bg-red-50",
  OUT_OF_DATE: "text-amber-600 bg-amber-50",
  CANCELLED: "text-[#99ACC2] bg-[#F5F8FA]",
};

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status.replace(/_/g, " ");
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_COLORS[status] ?? "text-[#516F90] bg-[#F5F8FA]"}`}>
      {label}
    </span>
  );
}

const TABS = [
  { id: "connect", label: "Connection", icon: Link2 },
  { id: "settings", label: "Settings", icon: Settings2 },
  { id: "browser", label: "Site Browser", icon: Globe },
  { id: "jobs", label: "Jobs", icon: Clock },
];

// ─── Plan Gate ────────────────────────────────────────────────────────────────

function PlanGate() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: "#21759B" }}>
          <SiWordpress className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#33475B" }}>WordPress Integration</h1>
          <p className="text-sm" style={{ color: "#516F90" }}>Translate your WordPress site into multiple languages.</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-[#CBD6E2] p-10 text-center">
        <div className="w-14 h-14 rounded-full bg-[#F5F8FA] flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7" style={{ color: "#99ACC2" }} />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: "#33475B" }}>Plan Upgrade Required</h2>
        <p className="text-sm mb-8 max-w-md mx-auto" style={{ color: "#516F90" }}>
          The WordPress integration is not included in your current plan. Connect your site, browse content, and push translations directly into your WP admin.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto mb-8 text-left">
          {[
            { icon: Globe, label: "WPML & Polylang support", desc: "Works with the multilingual plugin you already have" },
            { icon: FileText, label: "Full content coverage", desc: "Posts, pages, CPTs, ACF, Yoast SEO, menus" },
            { icon: Send, label: "Automatic push-back", desc: "Translated posts appear in your WP admin automatically" },
            { icon: Database, label: "Staleness detection", desc: "Know when source content changes after translation" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3 bg-[#F5F8FA] rounded-xl p-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#E8F5F8" }}>
                <Icon className="w-4 h-4" style={{ color: "#0091AE" }} />
              </div>
              <div>
                <p className="text-xs font-semibold mb-0.5" style={{ color: "#33475B" }}>{label}</p>
                <p className="text-xs" style={{ color: "#516F90" }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <Link href="/dashboard/billing">
          <Button style={{ background: "#FF7A59" }} className="gap-2">
            Upgrade to Agency <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WordpressPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") ?? "connect");

  const [connected, setConnected] = useState(false);
  const [conn, setConn] = useState<Connection | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  // planRequired is driven by the server-side hasFeature() check — no client-side plan string comparison
  const [planRequired, setPlanRequired] = useState<boolean | null>(null);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    const res = await fetch("/api/integrations/wordpress");
    if (res.ok) {
      const d = await res.json();
      setConnected(d.connected);
      setConn(d.connection);
      setPlanRequired(d.planRequired === true);
    }
    setLoadingStatus(false);
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  function switchTab(id: string) {
    setActiveTab(id);
    router.replace(`/dashboard/integrations/wordpress?tab=${id}`, { scroll: false });
  }

  // Show gate only once the API has responded; null = still loading
  if (planRequired === true) return <PlanGate />;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{ background: "#21759B" }}>
          <SiWordpress className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#33475B" }}>WordPress Integration</h1>
          <p className="text-sm" style={{ color: "#516F90" }}>
            Translate your WordPress site — powered by WPML or Polylang for language switching and URL routing.
          </p>
        </div>
        {!loadingStatus && (
          <div className={`ml-auto flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${connected ? "bg-teal-50 text-teal-600" : "bg-[#F5F8FA] text-[#99ACC2]"}`}>
            {connected ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
            {connected ? "Connected" : "Not Connected"}
          </div>
        )}
      </div>

      <div className="flex gap-1 border-b border-[#CBD6E2] mb-6">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.id ? "border-[#0091AE] text-[#0091AE]" : "border-transparent text-[#516F90] hover:text-[#33475B]"
              }`}
              data-testid={`wp-tab-${tab.id}`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "connect" && (
        <ConnectTab connected={connected} conn={conn} loading={loadingStatus} onRefresh={loadStatus}
          onConnected={() => { loadStatus(); switchTab("settings"); }} onDisconnected={loadStatus} />
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
          <SiWordpress className="w-12 h-12 mx-auto mb-3" style={{ color: "#CBD6E2" }} />
          <h3 className="font-semibold mb-2" style={{ color: "#33475B" }}>Not connected</h3>
          <p className="text-sm mb-4" style={{ color: "#516F90" }}>Connect your WordPress site first.</p>
          <Button onClick={() => switchTab("connect")} style={{ background: "#0091AE" }}>Go to Connection</Button>
        </div>
      )}
    </div>
  );
}

// ─── Connect Tab ──────────────────────────────────────────────────────────────

function ConnectTab({ connected, conn, loading, onRefresh, onConnected, onDisconnected }: {
  connected: boolean; conn: Connection | null; loading: boolean;
  onRefresh: () => void; onConnected: () => void; onDisconnected: () => void;
}) {
  const [siteUrl, setSiteUrl] = useState("");
  const [username, setUsername] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connectResult, setConnectResult] = useState<{ detectedPlugin: string; languages: any[]; polylangBeta?: boolean; polylangRestApiMissing?: boolean } | null>(null);
  const [updateBannerDismissed, setUpdateBannerDismissed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(PLUGIN_BANNER_DISMISSED_KEY) === PLUGIN_VERSION,
  );

  async function handleConnect() {
    if (!siteUrl.trim() || !username.trim() || !appPassword.trim()) return;
    setConnecting(true);
    setError(null);
    setConnectResult(null);
    const res = await fetch("/api/integrations/wordpress/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteUrl, username, appPassword }),
    });
    const data = await res.json();
    if (res.ok) {
      setConnectResult({ detectedPlugin: data.detectedPlugin, languages: data.languages ?? [], polylangBeta: data.polylangBeta ?? false, polylangRestApiMissing: data.polylangRestApiMissing ?? false });
      setSiteUrl(""); setUsername(""); setAppPassword("");
      onConnected();
    } else {
      setError(data.error ?? "Connection failed");
    }
    setConnecting(false);
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    await fetch("/api/integrations/wordpress", { method: "DELETE" });
    setConnectResult(null);
    onDisconnected();
    setDisconnecting(false);
  }

  if (loading) return <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: "#0091AE" }} /></div>;

  if (connected && conn) {
    // Use fresh connectResult (just connected) or fall back to cached siteProfile
    const displayLanguages: { code: string; name: string }[] =
      (connectResult?.languages ?? conn.siteProfile?.languages ?? []).map((l: any) => ({
        code: l.code ?? l,
        name: l.native_name ?? l.english_name ?? l.name ?? l.code ?? l,
      }));

    const showUpdateBanner =
      !updateBannerDismissed && isVersionOutdated(conn.pluginVersion, PLUGIN_VERSION);

    const showPolylangRestApiWarning =
      conn.multilingualPlugin === "Polylang" &&
      (connectResult?.polylangRestApiMissing ?? (conn.siteProfile as any)?.polylangRestApiMissing ?? false);

    return (
      <div className="max-w-lg space-y-4">
        {showUpdateBanner && (
          <PluginUpdateBanner
            installedVersion={conn.pluginVersion!}
            onDismiss={() => {
              setUpdateBannerDismissed(true);
              localStorage.setItem(PLUGIN_BANNER_DISMISSED_KEY, PLUGIN_VERSION);
            }}
          />
        )}
        {showPolylangRestApiWarning && (
          <div
            className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm"
            data-testid="banner-polylang-restapi-missing"
          >
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-semibold text-red-800">Polylang REST API extension not found</p>
              <p className="text-red-700 text-xs mt-0.5">
                Translations will be pushed to your site but will not be linked to their source posts.
                Install the{" "}
                <a
                  href="https://polylang.pro/downloads/polylang-rest-api/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-semibold"
                  data-testid="link-polylang-restapi-docs"
                >
                  Polylang REST API add-on
                </a>
                {" "}to enable automatic translation linking.
              </p>
            </div>
          </div>
        )}
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-teal-500" />
            <span className="font-semibold text-teal-700">Connected to WordPress</span>
          </div>
          <div className="space-y-1 text-sm text-teal-700">
            <p>Site: <a href={conn.siteUrl} target="_blank" rel="noopener noreferrer" className="font-mono underline">{conn.siteUrl}</a></p>
            <p>User: <code className="font-mono">{conn.username}</code></p>
            <p>Plugin: <code className="font-mono">{conn.multilingualPlugin}</code>
              {conn.multilingualPlugin === "Polylang" && (
                <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                  beta — custom post types may require manual configuration
                </span>
              )}
            </p>
            <p>Plugin version: <code className="font-mono" data-testid="text-plugin-version">{conn.pluginVersion ?? "Unknown"}</code></p>
            <p>Connected: {new Date(conn.connectedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
          </div>
          {displayLanguages.length > 0 && (
            <div className="mt-3 pt-3 border-t border-teal-200">
              <p className="text-xs font-semibold text-teal-700 mb-1.5">Detected languages ({displayLanguages.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {displayLanguages.map((lang) => (
                  <span key={lang.code} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700"
                    title={lang.name} data-testid={`lang-badge-${lang.code}`}>
                    {lang.code.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="bg-[#F5F8FA] rounded-xl border border-[#CBD6E2] p-4 text-xs space-y-2">
          <p className="font-semibold" style={{ color: "#33475B" }}>Companion WordPress Plugin</p>
          <p style={{ color: "#516F90" }}>
            Install the Contentech companion plugin on your WordPress site to get one-click translation from inside the WordPress editor, per-language status badges in the post list, and automatic change detection.
          </p>
          <div className="mt-1">
            <p className="font-semibold" style={{ color: "#33475B" }}>Plugin API Key</p>
            <p style={{ color: "#99ACC2" }}>
              The plugin requires a <code className="font-mono">ctk_live_</code> API key to authenticate with Contentech.
              Enter it in <strong>WordPress → Settings → Contentech → API Key</strong>.
            </p>
            <Link
              href="/dashboard/settings#api-keys"
              className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold underline"
              style={{ color: "#0091AE" }}
              data-testid="link-api-keys-settings"
            >
              Generate an API Key in Settings → API Keys
            </Link>
          </div>
          <a
            href="/api/integrations/wordpress/download"
            download
            data-testid="btn-download-plugin"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white"
            style={{ background: "#0091AE" }}
          >
            <Download className="w-3 h-3" />
            Download Plugin (v{PLUGIN_VERSION})
          </a>
          <div className="pt-1">
            <p className="font-semibold" style={{ color: "#33475B" }}>Contentech Site URL</p>
            <p style={{ color: "#99ACC2" }}>
              Enter this in <strong>WordPress → Settings → Contentech → Contentech Site URL</strong>.
            </p>
            <code className="block font-mono break-all text-[#516F90] mt-1 select-all" data-testid="text-contentech-base-url">
              {typeof window !== "undefined" ? window.location.origin : ""}
            </code>
          </div>
          <div className="pt-1">
            <p className="font-semibold" style={{ color: "#33475B" }}>Webhook endpoint</p>
            <p style={{ color: "#99ACC2" }}>Auto-configured when the plugin connects. For reference only.</p>
            <code className="block font-mono break-all text-[#516F90] mt-1">
              {typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/wordpress` : "/api/webhooks/wordpress"}
            </code>
          </div>
        </div>
        <Button variant="outline" className="gap-2 text-red-500 border-red-200 hover:bg-red-50"
          onClick={handleDisconnect} disabled={disconnecting} data-testid="btn-disconnect-wp">
          <Unlink className="w-4 h-4" />
          {disconnecting ? "Disconnecting…" : "Disconnect"}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-5">
      <div className="bg-[#F5F8FA] border border-[#CBD6E2] rounded-xl p-4 text-sm" style={{ color: "#516F90" }}>
        <p className="font-semibold mb-2" style={{ color: "#33475B" }}>Prerequisites</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>WordPress 5.6+ with the REST API enabled</li>
          <li>WPML or Polylang installed and configured with at least one target language</li>
          <li>An Application Password for your WP user (<strong>Users → Profile → Application Passwords</strong>)</li>
        </ul>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold" style={{ color: "#33475B" }}>WordPress Site URL <span className="text-red-400">*</span></Label>
        <Input data-testid="input-wp-site-url" placeholder="https://example.com" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold" style={{ color: "#33475B" }}>WordPress Username <span className="text-red-400">*</span></Label>
        <Input data-testid="input-wp-username" placeholder="admin" value={username} onChange={(e) => setUsername(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold" style={{ color: "#33475B" }}>Application Password <span className="text-red-400">*</span></Label>
        <Input data-testid="input-wp-app-password" type="password" placeholder="xxxx xxxx xxxx xxxx xxxx xxxx" value={appPassword} onChange={(e) => setAppPassword(e.target.value)} />
        <p className="text-xs" style={{ color: "#99ACC2" }}>
          Generate this in <strong>WordPress Admin → Users → Your Profile → Application Passwords</strong>.
        </p>
      </div>

      {error && <p className="text-sm text-red-500" data-testid="wp-connect-error">{error}</p>}

      <Button data-testid="btn-connect-wp" onClick={handleConnect}
        disabled={connecting || !siteUrl.trim() || !username.trim() || !appPassword.trim()}
        style={{ background: "#0091AE" }} className="gap-2">
        {connecting ? <><Loader2 className="w-4 h-4 animate-spin" /> Connecting…</> : <><Link2 className="w-4 h-4" /> Connect WordPress</>}
      </Button>
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({ conn, onSaved }: { conn: Connection; onSaved: () => void }) {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [postTypes, setPostTypes] = useState<PostType[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [sourceLanguage, setSourceLanguage] = useState(conn.sourceLanguage ?? "en");
  const [targetLanguages, setTargetLanguages] = useState<string[]>((conn.targetLanguages as string[]) ?? []);
  const [deliveryMode, setDeliveryMode] = useState(conn.deliveryMode ?? "DRAFT");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [savingMapping, setSavingMapping] = useState<string | null>(null);
  const [pendingMappings, setPendingMappings] = useState<Record<string, Partial<Mapping>>>({});
  const [discovering, setDiscovering] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);

  useEffect(() => {
    setDiscovering(true);
    Promise.all([
      fetch("/api/integrations/wordpress/discover").then((r) => r.json()),
      fetch("/api/integrations/wordpress/mappings").then((r) => r.json()),
    ]).then(([disc, maps]) => {
      setLanguages(disc.languages ?? []);
      setPostTypes(disc.postTypes ?? []);
      setMappings(Array.isArray(maps) ? maps : []);
      setDiscovering(false);
    }).catch(() => { setDiscoverError("Failed to load site data"); setDiscovering(false); });
  }, []);

  function getMappingFor(postType: string) { return mappings.find((m) => m.postType === postType); }
  function getPending(postType: string): Partial<Mapping> {
    const existing = getMappingFor(postType);
    return pendingMappings[postType] ?? {
      includeTitle: existing?.includeTitle ?? true,
      includeContent: existing?.includeContent ?? true,
      includeExcerpt: existing?.includeExcerpt ?? false,
      includeAcf: existing?.includeAcf ?? false,
      includeYoast: existing?.includeYoast ?? false,
      includeSlug: existing?.includeSlug ?? false,
      includeMenus: existing?.includeMenus ?? false,
      targetStatus: existing?.targetStatus ?? "DRAFT",
      workflowType: existing?.workflowType ?? "AI_HUMAN",
    };
  }

  function updatePending(postType: string, field: string, value: any) {
    setPendingMappings((p) => ({ ...p, [postType]: { ...getPending(postType), [field]: value } }));
  }

  async function saveMapping(pt: PostType) {
    const cur = getPending(pt.slug);
    setSavingMapping(pt.slug);
    const res = await fetch("/api/integrations/wordpress/mappings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postType: pt.slug, postTypeName: pt.name, ...cur }),
    });
    if (res.ok) {
      const updated = await res.json();
      setMappings((ms) => {
        const idx = ms.findIndex((m) => m.postType === pt.slug);
        return idx >= 0 ? ms.map((m, i) => (i === idx ? updated : m)) : [...ms, updated];
      });
    }
    setSavingMapping(null);
  }

  async function saveSettings() {
    setSaving(true);
    await fetch("/api/integrations/wordpress/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceLanguage, targetLanguages, deliveryMode }),
    });
    onSaved();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  }

  if (discovering) return <div className="flex items-center gap-2 py-10 justify-center" style={{ color: "#0091AE" }}><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading site data…</span></div>;
  if (discoverError) return <p className="text-sm text-red-500 py-4">{discoverError}</p>;

  return (
    <div className="space-y-8 max-w-3xl">
      {conn.multilingualPlugin === "Polylang" && (conn.siteProfile as any)?.polylangRestApiMissing && (
        <div
          className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm"
          data-testid="settings-banner-polylang-restapi-missing"
        >
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold text-red-800">Polylang REST API extension not found</p>
            <p className="text-red-700 text-xs mt-0.5">
              Translations will be pushed to your site but will not be linked to their source posts.
              Install the{" "}
              <a
                href="https://polylang.pro/downloads/polylang-rest-api/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold"
              >
                Polylang REST API add-on
              </a>
              {" "}to enable automatic translation linking.
            </p>
          </div>
        </div>
      )}
      {/* Languages */}
      <div className="bg-white rounded-2xl border border-[#CBD6E2] p-6">
        <h2 className="text-sm font-semibold mb-4" style={{ color: "#33475B" }}>Languages</h2>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold" style={{ color: "#33475B" }}>Source Language</Label>
            <div className="relative">
              <select className="w-full px-3 py-2 text-sm border border-[#CBD6E2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0091AE]/30 bg-white appearance-none"
                value={sourceLanguage} onChange={(e) => setSourceLanguage(e.target.value)} data-testid="select-wp-source-lang">
                {languages.map((l) => <option key={l.code} value={l.code}>{l.name} ({l.code})</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "#99ACC2" }} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold" style={{ color: "#33475B" }}>Target Languages</Label>
            <div className="flex flex-wrap gap-2">
              {languages.filter((l) => l.code !== sourceLanguage).map((l) => {
                const selected = targetLanguages.includes(l.code);
                return (
                  <button key={l.code}
                    onClick={() => setTargetLanguages((prev) => selected ? prev.filter((c) => c !== l.code) : [...prev, l.code])}
                    className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${selected ? "border-[#0091AE] bg-[#E8F5F8] text-[#0091AE]" : "border-[#CBD6E2] text-[#516F90] hover:border-[#0091AE]"}`}
                    data-testid={`wp-lang-toggle-${l.code}`}>
                    {selected && <Check className="w-3 h-3 inline mr-1" />}{l.name} ({l.code})
                  </button>
                );
              })}
              {languages.length === 0 && <p className="text-xs" style={{ color: "#99ACC2" }}>No languages detected from {conn.multilingualPlugin}. Ensure it is activated and configured.</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold" style={{ color: "#33475B" }}>Delivery Mode</Label>
            <div className="flex gap-3">
              {[["DRAFT", "Save as Draft"], ["PUBLISH", "Publish immediately"]].map(([val, label]) => (
                <button key={val} onClick={() => setDeliveryMode(val)}
                  className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${deliveryMode === val ? "border-[#0091AE] bg-[#E8F5F8] text-[#0091AE]" : "border-[#CBD6E2] text-[#516F90]"}`}
                  data-testid={`wp-delivery-${val.toLowerCase()}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={saveSettings} disabled={saving} style={{ background: "#FF7A59" }} className="gap-2" data-testid="btn-save-wp-settings">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : saved ? <><Check className="w-4 h-4" /> Saved</> : "Save Settings"}
          </Button>
        </div>
      </div>

      {/* Post Type Mappings */}
      <div className="bg-white rounded-2xl border border-[#CBD6E2] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#F5F8FA]" style={{ background: "#F5F8FA" }}>
          <h2 className="text-sm font-semibold" style={{ color: "#33475B" }}>Post Type Field Mappings</h2>
          <p className="text-xs mt-0.5" style={{ color: "#516F90" }}>Choose which fields to translate per content type.</p>
        </div>
        <div className="divide-y divide-[#F5F8FA]">
          {postTypes.map((pt) => {
            const mapping = getMappingFor(pt.slug);
            const pending = getPending(pt.slug);
            const isExpanded = expandedType === pt.slug;
            return (
              <div key={pt.slug}>
                <button className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#F5F8FA] transition-colors"
                  onClick={() => setExpandedType(isExpanded ? null : pt.slug)}
                  data-testid={`wp-posttype-${pt.slug}`}>
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-4 h-4" style={{ color: "#99ACC2" }} /> : <ChevronRight className="w-4 h-4" style={{ color: "#99ACC2" }} />}
                    <div className="text-left">
                      <p className="text-sm font-medium" style={{ color: "#33475B" }}>{pt.name}</p>
                      <p className="text-xs" style={{ color: "#99ACC2" }}>{pt.count != null ? `${pt.count} posts` : ""}</p>
                    </div>
                  </div>
                  {mapping && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-600">Configured</span>}
                </button>
                {isExpanded && (
                  <div className="px-6 pb-4 border-t border-[#F5F8FA] bg-[#FAFCFD] space-y-4 pt-4">
                    <div>
                      <p className="text-xs font-semibold mb-2" style={{ color: "#33475B" }}>Fields to translate</p>
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          ["includeTitle", "Title", ""],
                          ["includeContent", "Content (body)", ""],
                          ["includeExcerpt", "Excerpt", ""],
                          ["includeSlug", "Slug", ""],
                          ["includeYoast", "Yoast SEO meta", ""],
                          ["includeAcf", "ACF custom fields", ""],
                          ["includeMenus", "Navigation menus", "Translates all site-wide menu item labels. WordPress does not expose which menus are linked to a specific post, so all nav menus are included. Labels are written back once per target language to avoid duplicate updates."],
                        ] as [string, string, string][]).map(([field, label, tooltip]) => {
                          const checked = !!(pending as any)[field];
                          return (
                            <label key={field} className="flex items-center gap-2.5 cursor-pointer" title={tooltip || undefined} data-testid={`wp-field-${field}`}>
                              <div className={`w-4 h-4 rounded border flex items-center justify-center ${checked ? "border-[#0091AE] bg-[#0091AE]" : "border-[#CBD6E2]"}`}
                                onClick={() => updatePending(pt.slug, field, !checked)}>
                                {checked && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <span className="text-sm" style={{ color: "#33475B" }}>{label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold mb-2" style={{ color: "#33475B" }}>Target post status</p>
                      <div className="flex gap-2">
                        {[["DRAFT", "Draft"], ["PUBLISH", "Published"]].map(([val, label]) => (
                          <button key={val} onClick={() => updatePending(pt.slug, "targetStatus", val)}
                            data-testid={`wp-target-status-${val.toLowerCase()}`}
                            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${pending.targetStatus === val ? "border-[#FF7A59] bg-[#FFF4F1] text-[#FF7A59]" : "border-[#CBD6E2] text-[#516F90]"}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold mb-2" style={{ color: "#33475B" }}>Workflow</p>
                      <div className="flex gap-2">
                        {[["AI_HUMAN", "AI + Human"], ["CREDITS", "AI Only"], ["HUMAN_ONLY", "Human Only"]].map(([val, label]) => (
                          <button key={val} onClick={() => updatePending(pt.slug, "workflowType", val)}
                            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${pending.workflowType === val ? "border-[#0091AE] bg-[#E8F5F8] text-[#0091AE]" : "border-[#CBD6E2] text-[#516F90]"}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => saveMapping(pt)} disabled={savingMapping === pt.slug} style={{ background: "#FF7A59" }} className="gap-1.5">
                      {savingMapping === pt.slug ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Save Mapping
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
          {postTypes.length === 0 && (
            <div className="px-6 py-8 text-center text-sm" style={{ color: "#99ACC2" }}>No post types found. Ensure the site is connected and reachable.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Site Browser Tab ─────────────────────────────────────────────────────────

function BrowserTab({ conn }: { conn: Connection }) {
  const [postTypes, setPostTypes] = useState<PostType[]>([]);
  const [selectedType, setSelectedType] = useState<string>("post");
  const [posts, setPosts] = useState<WPPost[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [translating, setTranslating] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [translateSuccess, setTranslateSuccess] = useState<string | null>(null);
  const [filterLang, setFilterLang] = useState<string>(conn.sourceLanguage || "");
  const targetLangs: string[] = (conn.targetLanguages as string[]) ?? [];
  const isPolylang = conn.multilingualPlugin === "Polylang";
  const siteLanguages: { code: string; name: string }[] =
    (conn.siteProfile?.languages ?? []).map((l: any) => ({
      code: l.code ?? l,
      name: l.native_name ?? l.english_name ?? l.name ?? l.code ?? l,
    }));

  useEffect(() => {
    fetch("/api/integrations/wordpress/post-types").then((r) => r.json()).then((types) => {
      setPostTypes(types ?? []);
      setLoadingTypes(false);
    });
  }, []);

  const loadPosts = useCallback(async (type: string, pg: number) => {
    setLoadingPosts(true);
    const res = await fetch(`/api/integrations/wordpress/posts?postType=${type}&page=${pg}&perPage=20${filterLang ? `&lang=${encodeURIComponent(filterLang)}` : ""}`);
    if (res.ok) {
      const d = await res.json();
      setPosts(d.posts ?? []);
      setTotal(d.total ?? 0);
    }
    setLoadingPosts(false);
  }, [filterLang]);

  useEffect(() => { loadPosts(selectedType, 1); }, [selectedType, loadPosts]);

  function toggleSelect(id: number) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    setSelected((prev) => prev.size === posts.length ? new Set() : new Set(posts.map((p) => p.id)));
  }

  async function handleTranslate() {
    if (selected.size === 0 || selectedLangs.length === 0) return;
    setTranslating(true);
    setTranslateError(null);
    setTranslateSuccess(null);
    const res = await fetch("/api/integrations/wordpress/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postIds: Array.from(selected), postType: selectedType, targetLanguages: selectedLangs }),
    });
    const d = await res.json();
    if (res.ok) {
      setTranslateSuccess(`${d.created} job(s) created. Translations are being processed.`);
      setSelected(new Set());
      setShowLangPicker(false);
      setTimeout(() => { setTranslateSuccess(null); loadPosts(selectedType, page); }, 3000);
    } else {
      setTranslateError(d.error ?? "Failed to create jobs");
    }
    setTranslating(false);
  }

  const perPage = 20;
  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="flex gap-6">
      {/* Post type sidebar */}
      <div className="w-48 flex-shrink-0">
        <p className="text-xs font-semibold mb-2 px-1" style={{ color: "#33475B" }}>Content Types</p>
        {loadingTypes ? (
          <div className="flex items-center gap-2 px-2 py-3"><Loader2 className="w-4 h-4 animate-spin" style={{ color: "#0091AE" }} /></div>
        ) : (
          <div className="space-y-0.5">
            {postTypes.map((pt) => (
              <button key={pt.slug}
                onClick={() => { setSelectedType(pt.slug); setPage(1); setSelected(new Set()); }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${selectedType === pt.slug ? "bg-[#E8F5F8] text-[#0091AE] font-medium" : "text-[#516F90] hover:bg-[#F5F8FA]"}`}
                data-testid={`wp-type-btn-${pt.slug}`}>
                <span>{pt.name}</span>
                {pt.count != null && <span className="ml-1 text-xs opacity-60">({pt.count})</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Posts table */}
      <div className="flex-1 min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium" style={{ color: "#33475B" }}>
            {selected.size > 0 ? `${selected.size} selected` : `${total} posts`}
          </p>
          <div className="flex items-center gap-2">
            {translateError && <p className="text-xs text-red-500">{translateError}</p>}
            {translateSuccess && <p className="text-xs text-teal-600">{translateSuccess}</p>}
            {selected.size > 0 && (
              <div className="relative">
                <Button size="sm" style={{ background: "#FF7A59" }} className="gap-1.5"
                  onClick={() => setShowLangPicker(!showLangPicker)} data-testid="btn-translate-selected">
                  <Send className="w-3.5 h-3.5" /> Translate ({selected.size})
                </Button>
                {showLangPicker && (
                  <div className="absolute right-0 top-full mt-2 z-10 bg-white rounded-xl border border-[#CBD6E2] shadow-lg p-4 w-64">
                    <p className="text-xs font-semibold mb-2" style={{ color: "#33475B" }}>Target Languages</p>
                    <div className="space-y-1.5 mb-3">
                      {targetLangs.length === 0 && <p className="text-xs" style={{ color: "#99ACC2" }}>No target languages configured. Go to Settings.</p>}
                      {targetLangs.map((lang) => {
                        const checked = selectedLangs.includes(lang);
                        return (
                          <label key={lang} className="flex items-center gap-2 cursor-pointer">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${checked ? "border-[#0091AE] bg-[#0091AE]" : "border-[#CBD6E2]"}`}
                              onClick={() => setSelectedLangs((p) => checked ? p.filter((l) => l !== lang) : [...p, lang])}>
                              {checked && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <span className="text-sm" style={{ color: "#33475B" }}>{lang}</span>
                          </label>
                        );
                      })}
                    </div>
                    <Button size="sm" className="w-full gap-1.5" style={{ background: "#0091AE" }}
                      onClick={handleTranslate} disabled={translating || selectedLangs.length === 0} data-testid="btn-confirm-translate">
                      {translating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating…</> : "Start Translation"}
                    </Button>
                  </div>
                )}
              </div>
            )}
            {isPolylang && siteLanguages.length > 0 && (
              <select
                value={filterLang}
                onChange={(e) => {
                  setFilterLang(e.target.value);
                  setPage(1);
                  setSelected(new Set());
                }}
                className="text-xs border border-[#CBD6E2] rounded-lg px-2 py-1.5 bg-white"
                style={{ color: "#33475B" }}
                data-testid="select-filter-lang"
              >
                {siteLanguages.map((l) => (
                  <option key={l.code} value={l.code}>{l.name} ({l.code.toUpperCase()})</option>
                ))}
              </select>
            )}
            <Button size="sm" variant="outline" onClick={() => loadPosts(selectedType, page)} className="gap-1.5" data-testid="btn-refresh-posts">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-[#CBD6E2] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#F5F8FA]" style={{ background: "#F5F8FA" }}>
                  <th className="px-4 py-3 w-10">
                    <div className={`w-4 h-4 rounded border cursor-pointer flex items-center justify-center ${selected.size === posts.length && posts.length > 0 ? "border-[#0091AE] bg-[#0091AE]" : "border-[#CBD6E2]"}`}
                      onClick={toggleAll} data-testid="wp-select-all">
                      {selected.size === posts.length && posts.length > 0 && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "#33475B" }}>Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "#33475B" }}>Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "#33475B" }}>Language</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "#33475B" }}>Status</th>
                  {targetLangs.map((lang) => (
                    <th key={lang} className="px-3 py-3 text-center text-xs font-semibold" style={{ color: "#33475B" }}>{lang.toUpperCase()}</th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "#33475B" }}>Last Translated</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "#33475B" }}>Modified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F8FA]">
                {loadingPosts ? (
                  <tr><td colSpan={7 + targetLangs.length} className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: "#0091AE" }} /></td></tr>
                ) : posts.length === 0 ? (
                  <tr><td colSpan={7 + targetLangs.length} className="py-10 text-center text-sm" style={{ color: "#99ACC2" }}>No posts found</td></tr>
                ) : posts.map((post) => (
                  <tr key={post.id} className={`hover:bg-[#FAFCFD] transition-colors ${selected.has(post.id) ? "bg-[#F0F9FF]" : ""}`}
                    data-testid={`wp-post-row-${post.id}`}>
                    <td className="px-4 py-3">
                      <div className={`w-4 h-4 rounded border cursor-pointer flex items-center justify-center ${selected.has(post.id) ? "border-[#0091AE] bg-[#0091AE]" : "border-[#CBD6E2]"}`}
                        onClick={() => toggleSelect(post.id)}>
                        {selected.has(post.id) && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm max-w-xs truncate" style={{ color: "#33475B" }}>{post.title || "(No title)"}</p>
                        {post.link && (
                          <a href={post.link} target="_blank" rel="noopener noreferrer" className="opacity-40 hover:opacity-100 transition-opacity flex-shrink-0">
                            <ExternalLink className="w-3 h-3" style={{ color: "#0091AE" }} />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F5F8FA] capitalize" style={{ color: "#516F90" }} data-testid={`wp-post-type-${post.id}`}>
                        {post.type || selectedType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EEF2FF] uppercase" style={{ color: "#0091AE" }} data-testid={`wp-post-lang-${post.id}`}>
                        {(post.language || conn.sourceLanguage || "en").toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${post.status === "publish" ? "bg-teal-50 text-teal-600" : "bg-[#F5F8FA] text-[#99ACC2]"}`}>
                        {post.status}
                      </span>
                    </td>
                    {targetLangs.map((lang) => (
                      <td key={lang} className="px-3 py-3 text-center">
                        <StatusBadge status={post.translationStatus?.[lang] ?? "MISSING"} />
                      </td>
                    ))}
                    <td className="px-4 py-3 text-xs" style={{ color: "#99ACC2" }} data-testid={`wp-post-lasttranslated-${post.id}`}>
                      {post.lastTranslatedAt ? new Date(post.lastTranslatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#99ACC2" }}>
                      {post.modifiedAt ? new Date(post.modifiedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#F5F8FA]">
              <p className="text-xs" style={{ color: "#99ACC2" }}>Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 1}
                  onClick={() => { const np = page - 1; setPage(np); loadPosts(selectedType, np); }}>Prev</Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages}
                  onClick={() => { const np = page + 1; setPage(np); loadPosts(selectedType, np); }}>Next</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Jobs Tab ─────────────────────────────────────────────────────────────────

function JobsTab() {
  const [jobs, setJobs] = useState<WPJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLivePolling, setIsLivePolling] = useState(false);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);

  // Silent refresh: does not show the full-screen spinner — used by auto-poll.
  const silentRefresh = useCallback(async () => {
    const res = await fetch("/api/integrations/wordpress/jobs");
    if (res.ok) setJobs(await res.json());
  }, []);

  // Initial load: shows spinner until first data arrives.
  const loadJobs = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/integrations/wordpress/jobs");
    if (res.ok) setJobs(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  // Auto-refresh every 15 s while at least one job is QUEUED or IN_PROGRESS.
  useEffect(() => {
    const hasActive = jobs.some((j) => j.status === "QUEUED" || j.status === "IN_PROGRESS");
    setIsLivePolling(hasActive);
    if (!hasActive) return;
    const timer = setInterval(silentRefresh, 15000);
    return () => clearInterval(timer);
  }, [jobs, silentRefresh]);

  async function handleJobAction(jobId: string, action: "cancel" | "retry") {
    setActioning(jobId);
    try {
      const res = await fetch(`/api/integrations/wordpress/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) await silentRefresh();
    } finally {
      setActioning(null);
    }
  }

  if (loading) return <div className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: "#0091AE" }} /></div>;
  if (jobs.length === 0) return (
    <div className="text-center py-16">
      <Clock className="w-12 h-12 mx-auto mb-3" style={{ color: "#CBD6E2" }} />
      <h3 className="font-semibold mb-2" style={{ color: "#33475B" }}>No jobs yet</h3>
      <p className="text-sm" style={{ color: "#516F90" }}>Select posts in the Site Browser to start your first translation.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium" style={{ color: "#33475B" }}>{jobs.length} job{jobs.length !== 1 ? "s" : ""}</p>
          {isLivePolling && (
            <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full text-[#0091AE] bg-[#E8F5F8]" data-testid="badge-live-polling">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0091AE] animate-pulse inline-block" />
              Live
            </span>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={loadJobs} className="gap-1.5" data-testid="btn-refresh-jobs">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>
      {jobs.map((job) => {
        const isExpanded = expandedJob === job.id;
        const isActioning = actioning === job.id;
        const lastDelivered = job.locales
          .filter((l) => l.deliveredAt)
          .sort((a, b) => new Date(b.deliveredAt!).getTime() - new Date(a.deliveredAt!).getTime())[0]?.deliveredAt;
        // Collect error text from failed locales to surface in the collapsed row.
        const failedLocaleErrors = job.locales
          .filter((l) => l.status === "FAILED" && l.error)
          .map((l) => l.error as string);
        const topError = failedLocaleErrors[0] ?? null;
        return (
          <div key={job.id} className="bg-white rounded-xl border border-[#CBD6E2] overflow-hidden" data-testid={`wp-job-${job.id}`}>
            <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#FAFCFD] transition-colors"
              onClick={() => setExpandedJob(isExpanded ? null : job.id)}>
              <div className="flex items-center gap-3 min-w-0">
                {isExpanded ? <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: "#99ACC2" }} /> : <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "#99ACC2" }} />}
                <div className="text-left min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "#33475B" }}>{job.sourcePostTitle ?? `Post #${job.sourcePostId}`}</p>
                  <p className="text-xs" style={{ color: "#99ACC2" }}>
                    <span className="font-mono">{job.sourceLanguage.toUpperCase()}</span>
                    {" "}&middot; {job.sourcePostType} &middot; {job.wordCount} words
                    {" "}&middot; {new Date(job.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    {lastDelivered && (
                      <span> &middot; Delivered {new Date(lastDelivered).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                    )}
                  </p>
                  {job.status === "FAILED" && topError && (
                    <p className="text-xs text-red-500 mt-0.5 truncate max-w-sm" data-testid={`text-job-error-${job.id}`}>{topError}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                {(job.status === "QUEUED" || job.status === "IN_PROGRESS") && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#0091AE" }} />
                )}
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${JOB_STATUS_COLORS[job.status] ?? "text-[#516F90] bg-[#F5F8FA]"}`}>
                  {JOB_STATUS_LABELS[job.status] ?? job.status.replace(/_/g, " ")}
                </span>
                {(job.status === "QUEUED" || job.status === "IN_PROGRESS") && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleJobAction(job.id, "cancel"); }}
                    disabled={isActioning}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-red-500 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                    data-testid={`btn-cancel-job-${job.id}`}
                  >
                    {isActioning ? "..." : "Cancel"}
                  </button>
                )}
                {(job.status === "FAILED" || job.status === "OUT_OF_DATE") && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleJobAction(job.id, "retry"); }}
                    disabled={isActioning}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-[#0091AE] bg-[#E8F5F8] hover:bg-[#d4edf3] transition-colors disabled:opacity-50"
                    data-testid={`btn-retry-job-${job.id}`}
                  >
                    {isActioning ? "..." : "Retry"}
                  </button>
                )}
              </div>
            </button>
            {isExpanded && (
              <div className="px-5 pb-4 border-t border-[#F5F8FA] bg-[#FAFCFD]">
                <div className="pt-3 space-y-2">
                  <p className="text-xs font-semibold mb-2" style={{ color: "#33475B" }}>Target Languages</p>
                  {job.locales.map((locale) => {
                    const td = locale.translatedData as any;
                    const postLink: string | null = td?.translatedPostLink || null;
                    // Fallback: construct WordPress post permalink from siteUrl + targetPostId.
                    const fallbackLink = !postLink && locale.targetPostId
                      ? `${job.siteUrl.replace(/\/$/, "")}?p=${locale.targetPostId}`
                      : null;
                    const translationUrl = postLink ?? fallbackLink;
                    return (
                      <div key={locale.id} className="flex items-start justify-between py-2 border-b border-[#F5F8FA] last:border-0 gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="text-sm font-mono font-semibold w-8 flex-shrink-0 mt-0.5" style={{ color: "#33475B" }}>{locale.targetLanguage.toUpperCase()}</span>
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <StatusBadge status={locale.status} />
                            {locale.error && (
                              <p className="text-xs text-red-500 break-words" data-testid={`text-locale-error-${locale.id}`}>{locale.error}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-0.5 flex-shrink-0">
                          {translationUrl && (
                            <a href={translationUrl} target="_blank" rel="noopener noreferrer"
                              className="text-xs flex items-center gap-1 hover:underline"
                              style={{ color: "#0091AE" }} data-testid={`wp-locale-link-${locale.id}`}>
                              <ExternalLink className="w-3 h-3" />
                              {postLink ? "View translation" : `WP Post #${locale.targetPostId}`}
                            </a>
                          )}
                          {locale.deliveredAt && (
                            <span className="text-xs" style={{ color: "#99ACC2" }}>
                              {new Date(locale.deliveredAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
