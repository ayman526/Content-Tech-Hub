"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, CheckCircle2, Settings, ExternalLink,
  Cloud, Loader2, UserCheck, LogOut, AlertCircle,
} from "lucide-react";
import { SiGoogledrive, SiDropbox, SiContentful, SiWordpress, SiSanity } from "react-icons/si";
import { TbBrandWebflow } from "react-icons/tb";

interface CloudStatus {
  dropbox: { configured: boolean; appKey: string | null };
  google_drive: { configured: boolean; clientId: string | null; apiKey: string | null };
  onedrive: { configured: boolean; clientId: string | null };
}

interface StoredConnection {
  token: string;
  expiresAt: number;
  displayName?: string;
}

const STORAGE_KEY = (id: string) => `contentech_cloud_${id}`;

const CMS_INTEGRATIONS = [
  {
    id: "contentful",
    name: "Contentful",
    description: "Translate where the content lives. Connect your Contentful space, pick content types, and push translations back automatically.",
    href: "/dashboard/integrations/contentful",
    color: "#2478CC",
    Icon: SiContentful,
    badge: null,
  },
  {
    id: "wordpress",
    name: "WordPress",
    description: "Translate your WordPress site with WPML or Polylang. Browse posts, send for translation, and receive translated content back in your WP admin.",
    href: "/dashboard/integrations/wordpress",
    color: "#21759B",
    Icon: SiWordpress,
    badge: "Agency+",
  },
];

const CMS_COMING_SOON = [
  { name: "Strapi", letter: "S", color: "#4945FF" },
  { name: "Sanity", Icon: SiSanity, color: "#F03E2F" },
  { name: "Webflow", Icon: TbBrandWebflow, color: "#4353FF" },
  { name: "HubSpot CMS", letter: "H", color: "#FF7A59" },
];

const FILE_SHARING = [
  {
    id: "google_drive",
    name: "Google Drive",
    description: "Import documents directly from Google Drive. Supports Docs, Sheets, and all file types your workspace accepts.",
    Icon: SiGoogledrive,
    color: "#4285F4",
    bg: "bg-[#4285F4]",
    setupDocs: "https://developers.google.com/drive/api/guides/about-sdk",
    envVars: ["NEXT_PUBLIC_GOOGLE_CLIENT_ID", "NEXT_PUBLIC_GOOGLE_API_KEY"],
  },
  {
    id: "dropbox",
    name: "Dropbox",
    description: "Pick files straight from Dropbox. Authorize once and import any file directly into your translation order.",
    Icon: SiDropbox,
    color: "#0061FF",
    bg: "bg-[#0061FF]",
    setupDocs: "https://www.dropbox.com/developers/chooser",
    envVars: ["NEXT_PUBLIC_DROPBOX_APP_KEY"],
  },
  {
    id: "onedrive",
    name: "OneDrive",
    description: "Browse and import files from Microsoft OneDrive or SharePoint with your Microsoft 365 account.",
    Icon: Cloud,
    color: "#0078D4",
    bg: "bg-[#0078D4]",
    setupDocs: "https://learn.microsoft.com/en-us/onedrive/developer/controls/file-pickers/",
    envVars: ["NEXT_PUBLIC_ONEDRIVE_CLIENT_ID"],
  },
];

export default function IntegrationsPage() {
  const [cloudStatus, setCloudStatus] = useState<CloudStatus | null>(null);
  const [connections, setConnections] = useState<Record<string, StoredConnection | null>>({});
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/integrations/cloud-status")
      .then((r) => r.json())
      .then(setCloudStatus)
      .catch(() => {});

    // Load any stored connections from localStorage
    const stored: Record<string, StoredConnection | null> = {};
    for (const fs of FILE_SHARING) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY(fs.id));
        if (raw) {
          const parsed: StoredConnection = JSON.parse(raw);
          stored[fs.id] = parsed.expiresAt > Date.now() ? parsed : null;
          if (!stored[fs.id]) localStorage.removeItem(STORAGE_KEY(fs.id));
        } else {
          stored[fs.id] = null;
        }
      } catch {
        stored[fs.id] = null;
      }
    }
    setConnections(stored);
  }, []);

  function isConfigured(id: string): boolean {
    if (!cloudStatus) return false;
    if (id === "google_drive") return cloudStatus.google_drive.configured;
    if (id === "dropbox") return cloudStatus.dropbox.configured;
    if (id === "onedrive") return cloudStatus.onedrive.configured;
    return false;
  }

  function openOAuth(provider: string): Promise<string> {
    const redirectUri = encodeURIComponent(`${window.location.origin}/oauth/callback`);
    let authUrl = "";

    if (provider === "google_drive") {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId) throw new Error("not_configured");
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.readonly&response_type=token&state=google_drive`;
    } else if (provider === "dropbox") {
      const appKey = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY;
      if (!appKey) throw new Error("not_configured");
      authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${appKey}&response_type=token&redirect_uri=${redirectUri}&state=dropbox&token_access_type=legacy`;
    } else if (provider === "onedrive") {
      const clientId = process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID;
      if (!clientId) throw new Error("not_configured");
      authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&scope=files.read+offline_access&response_type=token&redirect_uri=${redirectUri}&state=onedrive`;
    }

    return new Promise<string>((resolve, reject) => {
      const popup = window.open(authUrl, "contentech_oauth", "width=540,height=660,popup=yes,left=200,top=100");

      const handler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === "contentech_oauth_token" && event.data.provider === provider) {
          window.removeEventListener("message", handler);
          clearInterval(closedCheck);
          if (event.data.token) resolve(event.data.token);
          else reject(new Error("no_token"));
        }
      };
      window.addEventListener("message", handler);

      const closedCheck = setInterval(() => {
        if (popup?.closed) {
          clearInterval(closedCheck);
          window.removeEventListener("message", handler);
          reject(new Error("popup_closed"));
        }
      }, 600);
    });
  }

  /** Fetch display name from provider API after OAuth */
  async function getDisplayName(provider: string, token: string): Promise<string | undefined> {
    try {
      if (provider === "google_drive") {
        const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await r.json();
        return d.name ?? d.email;
      }
      if (provider === "dropbox") {
        const r = await fetch("https://api.dropboxapi.com/2/users/get_current_account", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        const d = await r.json();
        return d.name?.display_name ?? d.email;
      }
      if (provider === "onedrive") {
        const r = await fetch("https://graph.microsoft.com/v1.0/me?$select=displayName,mail", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await r.json();
        return d.displayName ?? d.mail;
      }
    } catch { /* ignore */ }
    return undefined;
  }

  async function handleConnect(provider: string) {
    setConnecting(provider);
    setConnectError(null);
    try {
      const token = await openOAuth(provider);
      const displayName = await getDisplayName(provider, token);
      // Implicit tokens expire in 1 hour
      const conn: StoredConnection = { token, expiresAt: Date.now() + 55 * 60 * 1000, displayName };
      localStorage.setItem(STORAGE_KEY(provider), JSON.stringify(conn));
      setConnections((prev) => ({ ...prev, [provider]: conn }));
    } catch (err: any) {
      if (err.message !== "popup_closed") {
        setConnectError(`Could not connect to ${FILE_SHARING.find(f => f.id === provider)?.name ?? provider}. Please try again.`);
      }
    } finally {
      setConnecting(null);
    }
  }

  function handleDisconnect(provider: string) {
    localStorage.removeItem(STORAGE_KEY(provider));
    setConnections((prev) => ({ ...prev, [provider]: null }));
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#33475B" }}>All Integrations</h1>
        <p className="text-sm mt-0.5" style={{ color: "#516F90" }}>
          Connect third-party platforms so translations flow directly where your content lives.
        </p>
      </div>

      {/* ── CMS Integrations ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-base font-semibold" style={{ color: "#33475B" }}>CMS Integrations</h2>
          <span className="text-[11px] bg-[#E5F7F6] text-[#0091AE] font-semibold px-2 py-0.5 rounded-full">
            {CMS_INTEGRATIONS.length} available
          </span>
        </div>
        <p className="text-xs mb-5" style={{ color: "#516F90" }}>
          Push and pull content between Contentech and your headless CMS or website platform.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CMS_INTEGRATIONS.map((int) => (
            <Link
              key={int.id}
              href={int.href}
              className="bg-white rounded-2xl border border-[#CBD6E2] p-6 hover:shadow-md hover:border-[#0091AE] transition-all group"
              data-testid={`integration-card-${int.id}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                  style={{ background: int.color }}
                >
                  <int.Icon className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-2">
                  {int.badge ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FFF3EF] text-[#FF7A59]">
                      {int.badge}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-[#00BDA5]">
                      <CheckCircle2 className="w-3 h-3" /> Available
                    </span>
                  )}
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#0091AE" }} />
                </div>
              </div>
              <h3 className="font-semibold mb-1" style={{ color: "#33475B" }}>{int.name}</h3>
              <p className="text-xs leading-relaxed" style={{ color: "#516F90" }}>{int.description}</p>
            </Link>
          ))}

          {CMS_COMING_SOON.map(({ name, Icon, letter, color }) => (
            <div
              key={name}
              className="bg-[#F5F8FA] rounded-2xl border border-dashed border-[#CBD6E2] p-6 opacity-60"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg mb-4"
                style={{ background: color }}
              >
                {Icon ? <Icon className="w-5 h-5" /> : letter}
              </div>
              <h3 className="font-semibold mb-1" style={{ color: "#33475B" }}>{name}</h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#CBD6E2] text-[#516F90]">Coming Soon</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── File Sharing Apps ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-base font-semibold" style={{ color: "#33475B" }}>File Sharing Apps</h2>
          <span className="text-[11px] bg-[#FFF3EF] text-[#FF7A59] font-semibold px-2 py-0.5 rounded-full">
            {FILE_SHARING.length} supported
          </span>
        </div>
        <p className="text-xs mb-5" style={{ color: "#516F90" }}>
          Connect your cloud storage accounts so your team can import files directly when starting a new order.
        </p>

        {connectError && (
          <div className="mb-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {connectError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FILE_SHARING.map((fs) => {
            const configured = isConfigured(fs.id);
            const conn = connections[fs.id] ?? null;
            const isConnecting = connecting === fs.id;

            return (
              <div
                key={fs.id}
                className="bg-white rounded-2xl border border-[#CBD6E2] p-6 flex flex-col gap-4"
                data-testid={`cloud-integration-${fs.id}`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                    style={{ background: fs.color }}
                  >
                    <fs.Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      conn
                        ? "bg-[#E5F7F6] text-[#00BDA5]"
                        : configured
                        ? "bg-[#EEF2FF] text-[#516F90]"
                        : "bg-[#F5F8FA] text-[#99ACC2]"
                    }`}
                  >
                    {conn ? (
                      <><CheckCircle2 className="w-3 h-3" /> Connected</>
                    ) : configured ? (
                      <><Settings className="w-3 h-3" /> Ready to connect</>
                    ) : (
                      <><Settings className="w-3 h-3" /> Setup required</>
                    )}
                  </span>
                </div>

                {/* Name + description */}
                <div>
                  <h3 className="font-semibold mb-1" style={{ color: "#33475B" }}>{fs.name}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "#516F90" }}>{fs.description}</p>
                </div>

                {/* Bottom area */}
                <div className="mt-auto pt-3 border-t border-[#F5F8FA] space-y-3">
                  {conn ? (
                    /* ── Connected state ── */
                    <>
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-3.5 h-3.5 text-[#00BDA5]" />
                        <span className="text-xs text-[#33475B] font-medium truncate">
                          {conn.displayName ?? "Account connected"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDisconnect(fs.id)}
                        className="flex items-center gap-1.5 text-xs text-[#99ACC2] hover:text-red-500 transition-colors"
                        data-testid={`disconnect-${fs.id}`}
                      >
                        <LogOut className="w-3 h-3" /> Disconnect
                      </button>
                    </>
                  ) : configured ? (
                    /* ── Configured but not connected ── */
                    <button
                      type="button"
                      onClick={() => handleConnect(fs.id)}
                      disabled={!!connecting}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
                      style={{ background: fs.color }}
                      data-testid={`connect-${fs.id}`}
                    >
                      {isConnecting ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Connecting…</>
                      ) : (
                        <>Connect {fs.name}</>
                      )}
                    </button>
                  ) : (
                    /* ── Not configured by admin ── */
                    <div className="space-y-1.5">
                      <p className="text-xs" style={{ color: "#99ACC2" }}>
                        Required env vars:
                      </p>
                      {fs.envVars.map((v) => (
                        <code key={v} className="block text-[10px] font-mono bg-[#F5F8FA] text-[#516F90] px-2 py-0.5 rounded">
                          {v}
                        </code>
                      ))}
                      <a
                        href={fs.setupDocs}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium mt-1"
                        style={{ color: "#0091AE" }}
                      >
                        Setup guide <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
