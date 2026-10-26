"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Upload,
  Loader2,
  CheckCircle,
  Zap,
  Key,
  CreditCard,
  User,
  Users,
  Star,
  Bot,
  ArrowRight,
  X,
  Plus,
  Sparkles,
  Crown,
  AlertTriangle,
  AlertCircle,
  Trash2,
  Eye,
  EyeOff,
  Settings,
  Cloud,
  BookOpen,
  Database,
  ChevronLeft,
} from "lucide-react";
import { SiGoogledrive, SiDropbox } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

type WizardStep =
  | "upload"
  | "analyzing"
  | "target_language"
  | "workflow"
  | "ai_source"
  | "byok_config"
  | "credits_check"
  | "linguist_source"
  | "localization_assets"
  | "confirming"
  | "processing"
  | "ocr_request_created"
  | "ocr_quality_gate"
  | "done";

type PrimaryWorkflow = "ai_only" | "human_only" | "ai_human";
type AiSource = "byok" | "credits";
type LinguistSourceOption = "system_pool" | "preferred" | "internal";

interface Message {
  id: string;
  role: "bot" | "user";
  content: string;
}

interface DocSegment {
  text: string;
  formatHint: string;
}

interface DocAnalysis {
  docType: string;
  sourceLanguage: string;
  wordCount: number;
  filename: string;
  segments: DocSegment[];
  layoutHtml?: string | null;
  structuredData?: object | null;
  pdfStoredPath?: string | null;
  pptxStoredPath?: string | null;
  docxStoredPath?: string | null;
  scanned?: boolean;
  ocrConfidence?: number | null;
  ocrConfidenceThreshold?: number | null;
  ocrEnrichment?: {
    provider?: string;
    pages?: Array<{ pageNum?: number; text?: string; confidence?: number }>;
    avgConfidence?: number;
    extractedText?: string;
    extractedMarkdown?: string;
    structuredLayout?: unknown;
  } | null;
  sourceMimeType?: string | null;
  pageCount?: number;
  /** True when user explicitly clicked "Continue anyway" past the gate.
   *  Persisted on Project.ocrConfidenceWarning at submit time. */
  ocrContinueAnyway?: boolean;
}

interface ApiConfig {
  id: string;
  provider: string;
  model: string | null;
  lastUsed: string | null;
}

interface OrgInfo {
  id: string;
  name: string;
  plan: "STARTER" | "PROFESSIONAL" | "ENTERPRISE" | null;
  creditBalance: number;
}

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
  { code: "zh", name: "Chinese (Simplified)", flag: "🇨🇳" },
  { code: "zh-tw", name: "Chinese (Traditional)", flag: "🇹🇼" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "pt", name: "Portuguese", flag: "🇧🇷" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "ru", name: "Russian", flag: "🇷🇺" },
  { code: "tr", name: "Turkish", flag: "🇹🇷" },
  { code: "nl", name: "Dutch", flag: "🇳🇱" },
  { code: "pl", name: "Polish", flag: "🇵🇱" },
  { code: "sv", name: "Swedish", flag: "🇸🇪" },
  { code: "da", name: "Danish", flag: "🇩🇰" },
  { code: "he", name: "Hebrew", flag: "🇮🇱" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
  { code: "id", name: "Indonesian", flag: "🇮🇩" },
  { code: "th", name: "Thai", flag: "🇹🇭" },
];

const WORKFLOW_OPTIONS = [
  {
    id: "ai_only" as PrimaryWorkflow,
    icon: Sparkles,
    title: "Translate by AI",
    description: "Fast, cost-effective AI-powered translation",
    badge: "Fastest",
    badgeColor: "bg-purple-100 text-purple-700",
    color: "border-purple-200 hover:border-purple-400 hover:bg-purple-50",
    iconColor: "text-purple-600 bg-purple-100",
  },
  {
    id: "human_only" as PrimaryWorkflow,
    icon: User,
    title: "Native Creation",
    description: "A linguist creates the content from scratch in the target language. No AI involvement.",
    badge: "Highest quality",
    badgeColor: "bg-gold/20 text-amber-700",
    color: "border-gold/40 hover:border-gold hover:bg-gold/5",
    iconColor: "text-amber-700 bg-gold/15",
  },
  {
    id: "ai_human" as PrimaryWorkflow,
    icon: Zap,
    title: "AI Draft + Expert Review",
    description: "AI generates a first draft. An expert reviewer refines it for brand accuracy and quality.",
    badge: "Recommended",
    badgeColor: "bg-teal/10 text-teal",
    color: "border-teal/40 hover:border-teal hover:bg-teal/5",
    iconColor: "text-teal bg-teal/10",
  },
];

const PLANS = [
  {
    id: "STARTER",
    name: "Starter",
    price: "$29",
    credits: "500 credits/mo",
    features: ["500 AI translation credits", "5 projects/month", "Basic TM"],
    color: "border-gray-200 hover:border-navy",
    highlight: false,
  },
  {
    id: "PROFESSIONAL",
    name: "Professional",
    price: "$99",
    credits: "2,000 credits/mo",
    features: ["2,000 AI credits", "Unlimited projects", "Full TM & Glossary", "Priority support"],
    color: "border-teal/50 hover:border-teal ring-1 ring-teal/20",
    highlight: true,
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    price: "Custom",
    credits: "Unlimited",
    features: ["Unlimited AI credits", "Custom integrations", "Dedicated account manager", "SLA"],
    color: "border-navy/30 hover:border-navy",
    highlight: false,
  },
];

const PROVIDER_LABELS: Record<string, string> = {
  OPENAI: "OpenAI",
  AZURE: "Azure OpenAI",
  DEEPL: "DeepL",
  MODERNMT: "ModernMT",
  GOOGLE: "Google Translate",
};

const WIZARD_STEPS: WizardStep[] = [
  "upload", "analyzing", "target_language", "workflow",
  "ai_source", "byok_config", "credits_check", "localization_assets", "confirming", "processing", "done",
];

const CLOUD_INTEGRATIONS = [
  { id: "google_drive", name: "Google Drive", color: "text-[#4285F4]", bg: "bg-[#4285F4]/10", Icon: SiGoogledrive },
  { id: "onedrive", name: "OneDrive", color: "text-[#0078D4]", bg: "bg-[#0078D4]/10", Icon: Cloud },
  { id: "dropbox", name: "Dropbox", color: "text-[#0061FF]", bg: "bg-[#0061FF]/10", Icon: SiDropbox },
];

function getDeliveryEstimate(workflowId: PrimaryWorkflow, wordCount: number): { label: string; date: string } {
  if (workflowId === "ai_only") {
    return { label: "~5 min", date: "Today" };
  }
  const wordsPerDay = workflowId === "human_only" ? 2500 : 1500;
  const days = Math.ceil(wordCount / wordsPerDay);
  const d = new Date();
  d.setDate(d.getDate() + days);
  const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const label = days === 1 ? "1 day" : `${days} days`;
  return { label, date: dateStr };
}

const WORKFLOW_RATE_KEY: Record<PrimaryWorkflow, string | null> = {
  ai_only: "AI_TRANSLATION",
  ai_human: "HUMAN_REVISION",
  human_only: null,
};

function getCreditEstimate(
  workflowId: PrimaryWorkflow,
  wordCount: number,
  numLangs: number,
  ratesMap: Record<string, number>
): { credits: number; label: string; numLangs: number } | null {
  const key = WORKFLOW_RATE_KEY[workflowId];
  if (!key) return null;
  const cpw = ratesMap[key];
  if (!cpw) return null;
  const credits = Math.ceil(wordCount * cpw * numLangs);
  return { credits, label: credits.toLocaleString(), numLangs };
}

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 22) return "Good evening";
  return "Hi";
}

function buildWelcomeMessage(firstName: string | null): string {
  const name = firstName ? firstName : "there";
  return `Hi, ${name}! Drop your document and I'll detect its language, assess the content type, and walk you through every decision — from workflow to delivery.`;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-navy/30 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

export default function WizardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<WizardStep>("upload");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "bot",
      content: buildWelcomeMessage(null),
    },
  ]);
  const [greetingPersonalized, setGreetingPersonalized] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<DocAnalysis | null>(null);
  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
  const [langSearch, setLangSearch] = useState("");
  const [primaryWorkflow, setPrimaryWorkflow] = useState<PrimaryWorkflow | null>(null);
  const [aiSource, setAiSource] = useState<AiSource | null>(null);
  const [byokConfig, setByokConfig] = useState({ provider: "openai", apiKey: "", model: "gpt-4o", showKey: false });
  const [isDragging, setIsDragging] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingConfigs, setExistingConfigs] = useState<ApiConfig[]>([]);
  const [selectedExistingConfig, setSelectedExistingConfig] = useState<string | null>(null);
  const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null);
  const [loadingAiData, setLoadingAiData] = useState(false);
  const [creditRatesMap, setCreditRatesMap] = useState<Record<string, number>>({});
  const [cloudPickerLoading, setCloudPickerLoading] = useState<string | null>(null);
  const [cloudBrowser, setCloudBrowser] = useState<{
    provider: string; token: string;
    files: { id: string; name: string; size?: number; mimeType?: string; downloadUrl?: string }[];
    loading: boolean;
    error?: string;
  } | null>(null);
  const [selectedTMs, setSelectedTMs] = useState<string[]>([]);
  const [selectedGlossaries, setSelectedGlossaries] = useState<string[]>([]);
  const [selectedStyleGuides, setSelectedStyleGuides] = useState<string[]>([]);
  const [orgTMs, setOrgTMs] = useState<{ id: string; name: string; sourceLanguage: string; targetLanguage: string; entryCount: number }[]>([]);
  const [orgGlossaries, setOrgGlossaries] = useState<{ id: string; name: string; termCount: number }[]>([]);
  const [orgStyleGuides, setOrgStyleGuides] = useState<{ id: string; name: string }[]>([]);
  const [loadingLocAssets, setLoadingLocAssets] = useState(false);
  const [linguistSource, setLinguistSource] = useState<LinguistSourceOption>("system_pool");
  const [creatingOcrRequest, setCreatingOcrRequest] = useState(false);
  /** When the wizard was launched from a verified OCR request (via the
   *  detail-page CTA `?fromOcrRequest=...`) OR after the user clicked
   *  "Create OCR Request" in the quality-gate, this holds the linked
   *  OCR request id and is sent to /api/projects on submit. */
  const [attachedOcrRequestId, setAttachedOcrRequestId] = useState<string | null>(null);
  const [stepHistory, setStepHistory] = useState<WizardStep[]>([]);
  const [showBillingCta, setShowBillingCta] = useState(false);
  const [clientAccounts, setClientAccounts] = useState<{ id: string; name: string }[]>([]);
  const [selectedClientAccountId, setSelectedClientAccountId] = useState("");

  const BACK_VISIBLE: WizardStep[] = [
    "ai_source", "byok_config", "credits_check",
    "workflow", "linguist_source", "localization_assets", "confirming",
  ];

  function navigate(next: WizardStep) {
    setStepHistory((prev) => [...prev, step]);
    setStep(next);
  }

  function goBack() {
    setStepHistory((prev) => {
      const hist = [...prev];
      const prevStep = hist.pop();
      if (prevStep) setStep(prevStep);
      return hist;
    });
  }

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isTyping, step, scrollToBottom]);

  // Fetch client accounts on mount
  useEffect(() => {
    fetch("/api/client-accounts")
      .then((r) => r.ok ? r.json() : [])
      .then(setClientAccounts)
      .catch(() => {});
  }, []);

  // Fetch real org-level assets when entering the loc-assets step (filtered by selected client)
  useEffect(() => {
    if (step !== "localization_assets") return;
    setLoadingLocAssets(true);
    const clientFilter = selectedClientAccountId || "shared";
    const qs = `?clientAccountId=${clientFilter}`;
    Promise.all([
      fetch(`/api/tm${qs}`).then((r) => r.ok ? r.json() : []),
      fetch(`/api/glossary${qs}`).then((r) => r.ok ? r.json() : []),
      fetch(`/api/style-guides${qs}`).then((r) => r.ok ? r.json() : []),
    ]).then(([tms, glossaries, styleGuides]) => {
      setOrgTMs(tms);
      setOrgGlossaries(glossaries);
      setOrgStyleGuides(styleGuides);
    }).catch(() => {}).finally(() => setLoadingLocAssets(false));
  }, [step, selectedClientAccountId]);

  useEffect(() => {
    if (status === "loading" || greetingPersonalized) return;
    const firstName = session?.user?.name?.trim().split(/\s+/)[0] ?? null;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === "welcome" ? { ...m, content: buildWelcomeMessage(firstName) } : m
      )
    );
    setGreetingPersonalized(true);
  }, [status, session?.user?.name, greetingPersonalized]);

  /**
   * Detail-page handoff: when the wizard is opened with `?fromOcrRequest=...`,
   * load the verified OCR request, hydrate `analysis` from its persisted
   * extracted text, attach the OCR request id to be linked on submit, and
   * skip the upload step. (Server enforces verified + ownership.)
   */
  const searchParams = useSearchParams();
  useEffect(() => {
    const id = searchParams?.get("fromOcrRequest");
    if (!id) return;
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/ocr-requests/${id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted || !data?.id) return;
        if (data.status !== "VERIFIED") {
          addBotMessage(
            "That OCR request hasn't been verified yet — open it, review the extracted text, and mark it verified before starting a translation project.",
            200
          );
          return;
        }
        // Build a minimal DocAnalysis from the verified OCR text.
        const verifiedText: string =
          (typeof data.verifiedText === "string" && data.verifiedText.trim())
            ? data.verifiedText
            : (Array.isArray(data.pages)
                ? data.pages.map((p: { text?: string }) => p.text ?? "").join("\n\n")
                : "");
        const segments = verifiedText
          .split(/\n{2,}/)
          .map((t) => t.trim())
          .filter(Boolean)
          .map((text) => ({ text, formatHint: "p" }));
        setAnalysis({
          docType: "Document",
          sourceLanguage: data.sourceLanguage ?? "English",
          wordCount:
            typeof data.wordCount === "number"
              ? data.wordCount
              : verifiedText.split(/\s+/).filter(Boolean).length,
          filename: data.sourceFilename ?? "ocr-source",
          segments,
          pageCount: data.pageCount ?? segments.length,
          ocrConfidence: typeof data.avgConfidence === "number" ? data.avgConfidence : null,
          ocrConfidenceThreshold: null,
          sourceMimeType: data.sourceMimeType ?? null,
          // Carry the persisted source file + structured layout from the OCR
          // request through to project creation so layout-preserving delivery
          // works for OCR-derived projects (Document.originalFileUrl is set
          // and structuredData is available for `generateLayoutPdf`).
          pdfStoredPath: data.sourceFileUrl ?? null,
          structuredData: data.structuredLayout ?? null,
          layoutHtml: null,
          scanned: true,
          ocrEnrichment: null,
        });
        setAttachedOcrRequestId(data.id);
        setProjectName(data.name ?? data.sourceFilename ?? "OCR translation");
        setStep("target_language");
        addBotMessage(
          `Loaded the verified OCR text from "${data.sourceFilename}". Pick the target language(s) to continue.`,
          400
        );
      } catch {
        /* swallow — the wizard still works as a normal new order */
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);


  type CloudBrowserFile = {
    id: string;
    name: string;
    size?: number;
    mimeType?: string;
    downloadUrl?: string;
  };

  /** Open an OAuth popup and wait for the token via postMessage */
  function openCloudOAuth(provider: string): Promise<string> {
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

  /** List files from the provider API using the OAuth token */
  async function listCloudFiles(provider: string, token: string): Promise<CloudBrowserFile[]> {
    if (provider === "google_drive") {
      // Exclude folders and unsupported types (Forms, Sites, etc.)
      const excludedTypes = [
        "application/vnd.google-apps.folder",
        "application/vnd.google-apps.form",
        "application/vnd.google-apps.site",
        "application/vnd.google-apps.script",
        "application/vnd.google-apps.shortcut",
      ];
      const q = encodeURIComponent(
        `trashed=false and (${excludedTypes.map((t) => `mimeType!='${t}'`).join(" and ")})`
      );
      const fields = encodeURIComponent("files(id,name,size,mimeType)");
      const r = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=viewedByMeTime+desc&pageSize=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await r.json();
      return (data.files ?? []).map((f: any) => {
        // Native Google Workspace types can't use ?alt=media — must use export endpoint
        const GOOGLE_EXPORT_MAP: Record<string, { mime: string; ext: string }> = {
          "application/vnd.google-apps.document":
            { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ext: ".docx" },
          "application/vnd.google-apps.spreadsheet":
            { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ext: ".xlsx" },
          "application/vnd.google-apps.presentation":
            { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", ext: ".pptx" },
          "application/vnd.google-apps.drawing":
            { mime: "application/pdf", ext: ".pdf" },
        };
        const exportInfo = GOOGLE_EXPORT_MAP[f.mimeType];
        const downloadUrl = exportInfo
          ? `https://www.googleapis.com/drive/v3/files/${f.id}/export?mimeType=${encodeURIComponent(exportInfo.mime)}`
          : `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`;
        const name = exportInfo && !f.name.includes(".")
          ? `${f.name}${exportInfo.ext}`
          : f.name;
        return {
          id: f.id,
          name,
          size: f.size ? parseInt(f.size) : undefined,
          mimeType: exportInfo ? exportInfo.mime : f.mimeType,
          downloadUrl,
        };
      });
    }

    if (provider === "dropbox") {
      const r = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ path: "", recursive: false, limit: 50 }),
      });
      const data = await r.json();
      return (data.entries ?? [])
        .filter((e: any) => e[".tag"] === "file")
        .map((f: any) => ({
          id: f.id,
          name: f.name,
          size: f.size,
          downloadUrl: undefined, // will use /files/download endpoint
        }));
    }

    if (provider === "onedrive") {
      const r = await fetch("https://graph.microsoft.com/v1.0/me/drive/root/children?$top=50&$orderby=lastModifiedDateTime+desc", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      return (data.value ?? [])
        .filter((f: any) => f.file)
        .map((f: any) => ({
          id: f.id,
          name: f.name,
          size: f.size,
          mimeType: f.file?.mimeType,
          downloadUrl: f["@microsoft.graph.downloadUrl"],
        }));
    }

    return [];
  }

  /** Fetch a cloud file server-side and turn it into a File object */
  async function fetchCloudFile(url: string, filename: string, accessToken?: string): Promise<File> {
    const res = await fetch("/api/integrations/cloud/fetch-file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, filename, accessToken }),
    });
    if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type });
  }

  /** Read a stored cloud connection from localStorage (if valid) */
  function getStoredToken(provider: string): string | null {
    try {
      const raw = localStorage.getItem(`contentech_cloud_${provider}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed.expiresAt > Date.now()) return parsed.token;
      localStorage.removeItem(`contentech_cloud_${provider}`);
    } catch { /* ignore */ }
    return null;
  }

  /** Handle clicking a cloud provider button */
  async function handleCloudPick(provider: string) {
    if (cloudPickerLoading) return;
    setCloudBrowser(null);

    // Check for an existing connected session from the integrations page
    const existingToken = getStoredToken(provider);
    if (existingToken) {
      setCloudBrowser({ provider, token: existingToken, files: [], loading: true });
      const files = await listCloudFiles(provider, existingToken);
      setCloudBrowser({ provider, token: existingToken, files, loading: false });
      return;
    }

    // No stored token — open OAuth popup
    setCloudPickerLoading(provider);
    try {
      const token = await openCloudOAuth(provider);
      // Store for future use (1-hour implicit token)
      localStorage.setItem(`contentech_cloud_${provider}`, JSON.stringify({
        token, expiresAt: Date.now() + 55 * 60 * 1000,
      }));
      setCloudBrowser({ provider, token, files: [], loading: true });
      setCloudPickerLoading(null);
      const files = await listCloudFiles(provider, token);
      setCloudBrowser({ provider, token, files, loading: false });
    } catch (err: any) {
      setCloudPickerLoading(null);
      if (err.message === "not_configured") {
        addBotMessage("This cloud storage has not been set up yet. Go to Integrations to connect your account first.", 200);
      } else if (err.message !== "popup_closed") {
        addBotMessage("Could not connect to your cloud storage. Please try again or upload a file directly.", 200);
      }
    }
  }

  /** Pick a specific file from the cloud browser */
  async function pickCloudFile(file: CloudBrowserFile) {
    const { provider, token } = cloudBrowser!;
    setCloudBrowser((prev) => prev ? { ...prev, loading: true, error: undefined } : null);
    try {
      let downloadUrl = file.downloadUrl;

      // Dropbox: generate a temporary download URL via API
      if (provider === "dropbox" && !downloadUrl) {
        const r = await fetch("https://api.dropboxapi.com/2/files/get_temporary_link", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ path: file.id }),
        });
        const data = await r.json();
        downloadUrl = data.link;
      }

      if (!downloadUrl) throw new Error("no_download_url");

      const proxyRes = await fetch("/api/integrations/cloud/fetch-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: downloadUrl, filename: file.name, accessToken: token }),
      });

      if (!proxyRes.ok) {
        const errData = await proxyRes.json().catch(() => ({}));
        throw new Error(errData.detail ?? errData.error ?? `HTTP ${proxyRes.status}`);
      }

      const blob = await proxyRes.blob();
      const fileObj = new File([blob], file.name, { type: blob.type || "application/octet-stream" });
      setCloudBrowser(null);
      handleFileUpload(fileObj);
    } catch (err: any) {
      const msg = err?.message && err.message !== "no_download_url"
        ? `Download failed: ${err.message}`
        : "Could not download that file. Please try another or upload directly.";
      setCloudBrowser((prev) => prev ? { ...prev, loading: false, error: msg } : null);
    }
  }

  function addBotMessage(content: string, delay = 800) {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [...prev, { id: Date.now().toString(), role: "bot", content }]);
    }, delay);
  }

  function addUserMessage(content: string) {
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "user", content }]);
  }

  async function handleFileUpload(uploadedFile: File) {
    setFile(uploadedFile);
    setStep("analyzing");
    addUserMessage(`Uploaded: ${uploadedFile.name}`);
    addBotMessage("Reading and analyzing your document — this takes a few seconds…", 300);

    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);

      const res = await fetch("/api/upload/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        addBotMessage(
          err.error ?? "I could not read that file. Please upload a PDF, DOCX, or TXT file.",
          400
        );
        setStep("upload");
        return;
      }

      const data = await res.json();
      const threshold =
        typeof data.ocrConfidenceThreshold === "number"
          ? data.ocrConfidenceThreshold
          : 0.95;
      const result: DocAnalysis = {
        filename: data.filename,
        docType: data.docType,
        sourceLanguage: data.sourceLanguage,
        wordCount: data.wordCount,
        segments: data.segments ?? [],
        layoutHtml: data.layoutHtml ?? null,
        structuredData: data.structuredData ?? null,
        pdfStoredPath: data.pdfStoredPath ?? null,
        pptxStoredPath: data.pptxStoredPath ?? null,
        docxStoredPath: data.docxStoredPath ?? null,
        scanned: !!data.scanned,
        ocrConfidence: typeof data.ocrConfidence === "number" ? data.ocrConfidence : null,
        ocrConfidenceThreshold: threshold,
        ocrEnrichment: data.ocrEnrichment ?? null,
        sourceMimeType: data.sourceMimeType ?? null,
        pageCount: typeof data.pageCount === "number" ? data.pageCount : 0,
      };

      setAnalysis(result);
      setProjectName(uploadedFile.name.replace(/\.[^/.]+$/, ""));

      // OCR quality gate — block-card UX. When the analyze route flags
      // `requiresOcrRequest`, render the gate step (NOT auto-create). The
      // user explicitly picks "Create OCR Request" or "Continue anyway".
      // This is mandatory per Task #36 architectural constraint.
      if (data.requiresOcrRequest) {
        const rawConf = result.ocrConfidence;
        const hasConf = typeof rawConf === "number" && Number.isFinite(rawConf);
        const conf = hasConf ? Math.max(0, Math.min(1, rawConf as number)) : 0;
        const confLabel = hasConf ? `${(conf * 100).toFixed(1)}%` : "unknown";
        const thresholdLabel = `${(threshold * 100).toFixed(0)}%`;
        addBotMessage(
          `This scan needs cleanup before we can translate it accurately. ` +
            `Detected OCR confidence is **${confLabel}** (threshold: ${thresholdLabel}). ` +
            `You can route it to your OCR Requests queue for human verification, or continue anyway with a quality warning.`,
          400
        );
        setStep("ocr_quality_gate");
        return;
      }

      const conf =
        typeof result.ocrConfidence === "number" && Number.isFinite(result.ocrConfidence)
          ? result.ocrConfidence
          : 1;
      const scanNote = data.scanned
        ? ` (scanned PDF — text extracted via OCR, ${(conf * 100).toFixed(0)}% confidence)`
        : "";
      addBotMessage(
        `Analysis complete. This is a **${result.docType}** in **${result.sourceLanguage}** — ${result.wordCount.toLocaleString()} words across ${result.segments.length} segments${scanNote}.`,
        400
      );
      setTimeout(() => {
        setStep("target_language");
        addBotMessage("Which language(s) should we translate this into?", 1200);
      }, 1600);
    } catch {
      addBotMessage("A network error occurred while analyzing the file. Please try again.", 400);
      setStep("upload");
    }
  }

  async function handleLanguageConfirm() {
    if (selectedLangs.length === 0) return;
    const names = selectedLangs.map((c) => LANGUAGES.find((l) => l.code === c)?.name).join(", ");
    addUserMessage(`Translate to: ${names}`);
    setLoadingAiData(true);
    const [configsRes, orgRes, pkgRes] = await Promise.all([
      fetch("/api/api-config"),
      fetch("/api/organization"),
      fetch("/api/credit-packages"),
    ]);
    const configs = configsRes.ok ? await configsRes.json() : [];
    const org = orgRes.ok ? await orgRes.json() : null;
    if (pkgRes.ok) {
      const pkgData = await pkgRes.json();
      const map: Record<string, number> = {};
      for (const r of pkgData.rates ?? []) map[r.workflowType] = Number(r.creditsPerWord);
      setCreditRatesMap(map);
    }
    setExistingConfigs(configs);
    setOrgInfo(org);
    setLoadingAiData(false);
    navigate("ai_source");
    addBotMessage(
      "Would you like to use your own API key (BYOK) or pay with system credits?",
      800
    );
  }

  async function handleWorkflowSelect(wf: PrimaryWorkflow) {
    setPrimaryWorkflow(wf);
    const opt = WORKFLOW_OPTIONS.find((o) => o.id === wf)!;
    addUserMessage(opt.title);
    const needsHuman = wf === "human_only" || wf === "ai_human";
    if (needsHuman) {
      navigate("linguist_source");
      addBotMessage(
        "Who should handle the human work? Choose your linguist pool for this project.",
        800
      );
    } else {
      navigate("localization_assets");
      addBotMessage(
        "Almost there — would you like to attach any Translation Memory or Glossary files to this project?",
        800
      );
    }
  }

  function handleLinguistSourceSelect(src: LinguistSourceOption) {
    setLinguistSource(src);
    const labels: Record<LinguistSourceOption, string> = {
      system_pool: "Linguist Network",
      preferred: "Preferred Linguists",
      internal: "Internal Reviewers",
    };
    addUserMessage(labels[src]);
    navigate("localization_assets");
    if (src === "internal") {
      addBotMessage(
        "Internal reviewers selected — no reviewer credits will be charged for this job. Would you like to attach any Translation Memory or Glossary files?",
        800
      );
    } else {
      addBotMessage(
        "Before we submit, would you like to attach any Translation Memory or Glossary files to guide the reviewers?",
        800
      );
    }
  }

  function handleAiSourceSelect(source: AiSource) {
    setAiSource(source);
    if (source === "byok") {
      addUserMessage("Use my own API key");
      if (existingConfigs.length > 0) {
        setSelectedExistingConfig(existingConfigs[0].id);
      }
      navigate("byok_config");
      addBotMessage(
        existingConfigs.length > 0
          ? "You have existing API keys. Select one or add a new key below."
          : "Please configure your AI provider API key below.",
        600
      );
    } else {
      addUserMessage("Use system credits");
      const hasCredits = orgInfo && (orgInfo.creditBalance > 0 || orgInfo.plan);
      if (hasCredits) {
        navigate("workflow");
        addBotMessage(
          `You have ${orgInfo!.creditBalance} credits available. Now, how should we process this document?`,
          800
        );
      } else {
        navigate("credits_check");
        addBotMessage(
          "You don't have an active plan or credit balance. Choose a plan to continue.",
          800
        );
      }
    }
  }

  async function handleByokSave() {
    if (!byokConfig.apiKey.trim()) return;
    await fetch("/api/api-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: byokConfig.provider,
        apiKey: byokConfig.apiKey,
        model: byokConfig.model,
      }),
    });
    const configs = await fetch("/api/api-config").then((r) => r.json());
    setExistingConfigs(configs);
    setSelectedExistingConfig(configs[0]?.id ?? null);
    navigate("workflow");
    addBotMessage("API key saved! Now, how should we process this document?", 500);
  }

  function handleExistingConfigSelect() {
    navigate("workflow");
    const cfg = existingConfigs.find((c) => c.id === selectedExistingConfig);
    addBotMessage(
      `Using your ${cfg ? PROVIDER_LABELS[cfg.provider] ?? cfg.provider : "existing"} API key. Now, how should we process this document?`,
      500
    );
  }

  function handleLocalizationAssetsContinue(skipAssets: boolean) {
    if (skipAssets) {
      addUserMessage("No assets, continue");
    } else {
      const parts: string[] = [];
      if (selectedTMs.length > 0) parts.push(`${selectedTMs.length} TM${selectedTMs.length > 1 ? "s" : ""}`);
      if (selectedGlossaries.length > 0) parts.push(`${selectedGlossaries.length} glossar${selectedGlossaries.length > 1 ? "ies" : "y"}`);
      if (selectedStyleGuides.length > 0) parts.push(`${selectedStyleGuides.length} style guide${selectedStyleGuides.length > 1 ? "s" : ""}`);
      addUserMessage(`Attached: ${parts.join(", ")}`);
    }
    navigate("confirming");
    addBotMessage("Here's your complete order summary. Everything looks good!", 600);
  }

  function getWorkflowType(): string {
    if (primaryWorkflow === "human_only") return "HUMAN_ONLY";
    if (primaryWorkflow === "ai_human") return "AI_HUMAN";
    if (primaryWorkflow === "ai_only" && aiSource === "byok") return "BYOK";
    if (primaryWorkflow === "ai_only" && aiSource === "credits") return "CREDITS";
    return "AI_HUMAN";
  }

  async function handleStartTranslation() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setStep("processing");
    addUserMessage("Confirmed — Start translation");

    const workflow = getWorkflowType();
    const targetNames = selectedLangs.map((c) => LANGUAGES.find((l) => l.code === c)?.name).join(", ");
    const needsAI = workflow === "AI_HUMAN" || workflow === "CREDITS" || workflow === "BYOK";

    if (needsAI && (analysis?.segments?.length ?? 0) > 0) {
      addBotMessage(
        `Creating your project and running AI pre-translation into ${targetNames}. This may take up to 30 seconds for larger documents — please wait…`,
        400
      );
    } else {
      addBotMessage(`Creating your project for translation into ${targetNames}…`, 400);
    }

    try {
      const linguistSourceMap: Record<LinguistSourceOption, string> = {
        system_pool: "SYSTEM_POOL",
        preferred: "PREFERRED",
        internal: "INTERNAL",
      };

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName,
          sourceLanguage: analysis?.sourceLanguage ?? "English",
          targetLanguages: selectedLangs,
          workflowType: workflow,
          wordCount: analysis?.wordCount ?? 0,
          linguistSource: linguistSourceMap[linguistSource],
          segments: analysis?.segments ?? [],
          filename: analysis?.filename,
          docType: analysis?.docType,
          layoutHtml: analysis?.layoutHtml ?? null,
          structuredData: analysis?.structuredData ?? null,
          pdfStoredPath: analysis?.pdfStoredPath ?? null,
          pptxStoredPath: analysis?.pptxStoredPath ?? null,
          docxStoredPath: analysis?.docxStoredPath ?? null,
          attachedTmIds: selectedTMs,
          attachedGlossaryIds: selectedGlossaries,
          attachedStyleGuideIds: selectedStyleGuides,
          ...(selectedClientAccountId ? { clientAccountId: selectedClientAccountId } : {}),
          // ── OCR linkage (Task #36) ────────────────────────────────────
          // When the wizard was launched from a verified OCR request, OR
          // the user clicked "Continue anyway" past the quality gate, we
          // persist the linkage and the confidence warning on the project.
          ...(attachedOcrRequestId ? { attachedOcrRequestId } : {}),
          ocrConfidenceWarning: !!analysis?.ocrContinueAnyway,
        }),
      });

      if (res.ok) {
        const project = await res.json();
        setShowBillingCta(false);
        setStep("done");
        const jobCount = selectedLangs.length;
        const segCount = analysis?.segments?.length ?? 0;
        const aiNote =
          needsAI && segCount > 0
            ? ` AI has drafted all ${segCount} segments — linguists will review and refine.`
            : "";
        addBotMessage(
          `Your project is ready with ${jobCount} translation ${jobCount === 1 ? "job" : "jobs"}.${aiNote} Head to your project to track progress.`,
          600
        );
        setTimeout(() => router.push(`/dashboard/projects/${project.id}`), 3000);
      } else {
        let errMsg = "There was an issue creating your project. Please try again.";
        let isCreditsError = false;
        try {
          const errBody = await res.json();
          if (errBody?.error) {
            if (res.status === 402 || String(errBody.error).toLowerCase().includes("insufficient credits")) {
              isCreditsError = true;
              errMsg = `You don't have enough credits to start this project. ${errBody.error} Top up your balance and try again.`;
            } else {
              errMsg = errBody.error;
            }
          }
        } catch { /* non-JSON body — keep generic message */ }
        setShowBillingCta(isCreditsError);
        addBotMessage(errMsg, 600);
        setStep("confirming");
        setIsSubmitting(false);
      }
    } catch {
      addBotMessage("Network error. Please check your connection and try again.", 600);
      setStep("confirming");
      setIsSubmitting(false);
    }
  }

  const stepIndex = WIZARD_STEPS.indexOf(step);
  const filteredLangs = LANGUAGES.filter(
    (l) =>
      l.name.toLowerCase().includes(langSearch.toLowerCase()) ||
      l.code.includes(langSearch.toLowerCase())
  );
  const workflowLabel = primaryWorkflow ? WORKFLOW_OPTIONS.find((o) => o.id === primaryWorkflow)?.title : "";

  return (
    <div className="h-full flex flex-col bg-[#FAFBFC]">
      {/* Header — progress dots only */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex-shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-end">
          <div className="flex items-center gap-1.5">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i === Math.min(stepIndex, 5)
                    ? "bg-navy w-6"
                    : i < Math.min(stepIndex, 5)
                    ? "bg-teal w-2"
                    : "bg-gray-200 w-2"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg) =>
            msg.role === "bot" ? (
              <div key={msg.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-teal" />
                </div>
                <div className="flex-1">
                  <div className="bg-[#D9F0F5] border border-[#0091AE]/30 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-[#33475B] leading-relaxed shadow-sm">
                    {msg.content}
                  </div>
                </div>
              </div>
            ) : (
              <div key={msg.id} className="flex justify-end">
                <div className="bg-navy text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm max-w-xs shadow-sm">
                  {msg.content}
                </div>
              </div>
            )
          )}
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-teal" />
              </div>
              <div className="bg-[#D9F0F5] border border-[#0091AE]/30 rounded-2xl rounded-tl-sm shadow-sm">
                <TypingIndicator />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Action Panel */}
      <div className="flex-shrink-0 px-6 pb-6">
        <div className="max-w-3xl mx-auto">

          {/* Back button */}
          {BACK_VISIBLE.includes(step) && stepHistory.length > 0 && (
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-navy mb-3 transition-colors"
              data-testid="btn-wizard-back"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Back
            </button>
          )}

          {/* UPLOAD STEP — wrapped in a chat-bubble shell so it feels like
              Cento is presenting the form inside the conversation, not a
              separate floating panel. Order is intentional:
              1) Client Account (was buried below — now first decision)
              2) Upload zone (focal point with explicit CTA + type legend)
              3) Cloud import (clearly grouped as a separate cluster) */}
          {step === "upload" && (
            <div className="ml-11" data-testid="wizard-upload-step">
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm shadow-sm p-5 space-y-5">

                {/* 1. CLIENT ACCOUNT */}
                {clientAccounts.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-semibold text-[#516F90] uppercase tracking-wider mb-2">
                      Client Account
                    </label>
                    <div className="relative">
                      <select
                        data-testid="select-wizard-client"
                        className="w-full px-4 py-2.5 text-sm font-medium text-[#33475B] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0091AE]/30 focus:border-[#0091AE] appearance-none bg-white pr-10"
                        value={selectedClientAccountId}
                        onChange={(e) => setSelectedClientAccountId(e.target.value)}
                      >
                        <option value="">No specific client (shared)</option>
                        {clientAccounts.map((a) => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                      <svg className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* 2. UPLOAD DOCUMENT */}
                <div>
                  <label className="block text-[10px] font-semibold text-[#516F90] uppercase tracking-wider mb-2">
                    Upload Document
                  </label>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f); }}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-2xl px-6 py-7 text-center cursor-pointer transition-all",
                      isDragging
                        ? "border-[#0091AE] bg-[#0091AE]/5"
                        : "border-[#CBD6E2] bg-[#F5F8FA]/40 hover:border-[#0091AE] hover:bg-[#F0F8FA]"
                    )}
                    data-testid="upload-zone"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.docx,.doc,.pptx,.ppt,.xliff,.html,.json,.txt"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                    />
                    <div className="w-12 h-12 mx-auto rounded-full bg-white border border-[#CBD6E2] flex items-center justify-center mb-3 shadow-sm">
                      <Upload className="w-5 h-5 text-[#0091AE]" />
                    </div>
                    <p className="text-sm font-semibold text-[#33475B] mb-1">
                      {isDragging ? "Drop your file here" : "Drag & drop your file here"}
                    </p>
                    <p className="text-xs text-[#516F90] mb-4">or browse your computer</p>
                    <div className="flex flex-wrap items-center justify-center gap-1.5 mb-4" data-testid="file-type-legend">
                      {["PDF", "DOCX", "PPTX", "XLIFF", "HTML", "JSON", "TXT"].map((t) => (
                        <span
                          key={t}
                          className="px-2.5 py-0.5 bg-white border border-[#CBD6E2] text-[#516F90] text-[10px] font-semibold rounded-full"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                      className="inline-flex items-center gap-1.5 px-5 py-2 bg-white border border-[#33475B] text-[#33475B] text-sm font-semibold rounded-xl hover:bg-[#33475B] hover:text-white transition-colors shadow-sm"
                      data-testid="btn-browse-files"
                    >
                      Browse files
                    </button>
                  </div>
                </div>

                {/* 3. CLOUD IMPORT */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[10px] font-semibold text-[#516F90] uppercase tracking-wider whitespace-nowrap">
                      Or import from cloud storage
                    </span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {CLOUD_INTEGRATIONS.map(({ id, name, color, bg, Icon }) => {
                      const isLoading = cloudPickerLoading === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => handleCloudPick(id)}
                          disabled={!!cloudPickerLoading}
                          className="flex items-center gap-2.5 px-3 py-3 rounded-xl border border-gray-200 bg-white hover:border-[#0091AE] hover:shadow-sm cursor-pointer text-left transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                          data-testid={`cloud-picker-${id}`}
                        >
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", bg)}>
                            {isLoading ? (
                              <Loader2 className={cn("w-4 h-4 animate-spin", color)} />
                            ) : (
                              <Icon className={cn("w-4 h-4", color)} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[#33475B] truncate">{name}</p>
                            <p className="text-[10px] text-[#516F90] truncate">
                              {isLoading ? "Connecting…" : "Browse files"}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CLOUD FILE BROWSER — shown after OAuth */}
          {cloudBrowser && (
            <div className="mt-3 border border-[#0091AE]/30 rounded-2xl overflow-hidden bg-white shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 bg-[#F0F8FA] border-b border-[#0091AE]/20">
                <div className="flex items-center gap-2">
                  {CLOUD_INTEGRATIONS.find(c => c.id === cloudBrowser.provider) && (() => {
                    const cfg = CLOUD_INTEGRATIONS.find(c => c.id === cloudBrowser.provider)!;
                    return (
                      <div className={cn("w-5 h-5 rounded-md flex items-center justify-center", cfg.bg)}>
                        <cfg.Icon className={cn("w-3 h-3", cfg.color)} />
                      </div>
                    );
                  })()}
                  <span className="text-xs font-semibold text-[#33475B]">
                    {CLOUD_INTEGRATIONS.find(c => c.id === cloudBrowser.provider)?.name} — Select a file
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCloudBrowser(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  data-testid="cloud-browser-close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Inline error */}
              {cloudBrowser.error && (
                <div className="mx-4 mt-3 mb-1 flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{cloudBrowser.error}</span>
                </div>
              )}

              {/* Loading — only show spinner when fetching file list (no files yet) */}
              {cloudBrowser.loading && cloudBrowser.files.length === 0 ? (
                <div className="flex items-center justify-center py-8 gap-3 text-sm text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin text-[#0091AE]" />
                  Loading your files…
                </div>
              ) : cloudBrowser.files.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-400">No files found.</div>
              ) : (
                <ul className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                  {cloudBrowser.files.map((f) => (
                    <li key={f.id}>
                      <button
                        type="button"
                        onClick={() => !cloudBrowser.loading && pickCloudFile(f)}
                        disabled={cloudBrowser.loading}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F5F8FA] text-left transition-colors disabled:opacity-60 disabled:cursor-wait"
                        data-testid={`cloud-file-${f.id}`}
                      >
                        <span className="text-base leading-none select-none flex-shrink-0">
                          {f.mimeType?.includes("pdf") ? "📄" :
                           f.mimeType?.includes("word") || f.name.endsWith(".docx") ? "📝" :
                           f.mimeType?.includes("presentation") || f.name.endsWith(".pptx") || f.name.endsWith(".ppt") ? "📊" :
                           f.name.endsWith(".xliff") ? "🌐" :
                           f.name.endsWith(".xlsx") || f.name.endsWith(".csv") ? "📈" : "📎"}
                        </span>
                        <span className="text-sm text-gray-700 font-medium flex-1 truncate">{f.name}</span>
                        {cloudBrowser.loading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0091AE] flex-shrink-0" />
                        ) : f.size ? (
                          <span className="text-[10px] text-gray-400 flex-shrink-0">
                            {f.size > 1048576 ? `${(f.size / 1048576).toFixed(1)} MB` : `${Math.round(f.size / 1024)} KB`}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* ANALYZING */}
          {step === "analyzing" && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 flex items-center gap-4 shadow-sm">
              <Loader2 className="w-6 h-6 text-teal animate-spin flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-navy">Analyzing document…</p>
                <p className="text-xs text-gray-400">Detecting language, type, and word count</p>
              </div>
            </div>
          )}

          {/* LANGUAGE SELECTOR */}
          {step === "target_language" && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm" data-testid="language-selector">
              <input
                type="text"
                placeholder="Search languages…"
                value={langSearch}
                onChange={(e) => setLangSearch(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl mb-3 focus:outline-none focus:ring-2 focus:ring-navy/20"
                data-testid="input-lang-search"
              />
              {selectedLangs.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {selectedLangs.map((code) => {
                    const lang = LANGUAGES.find((l) => l.code === code);
                    return (
                      <span key={code} className="inline-flex items-center gap-1.5 bg-navy text-white text-xs px-2.5 py-1 rounded-full" data-testid={`selected-lang-${code}`}>
                        {lang?.flag} {lang?.name}
                        <button type="button" onClick={() => setSelectedLangs((p) => p.filter((c) => c !== code))} className="hover:text-red-300">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              <div className="grid grid-cols-3 gap-1 max-h-44 overflow-y-auto mb-3">
                {filteredLangs.map((lang) => {
                  const selected = selectedLangs.includes(lang.code);
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setSelectedLangs((p) => selected ? p.filter((c) => c !== lang.code) : [...p, lang.code])}
                      className={cn("flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors text-left", selected ? "bg-navy text-white" : "hover:bg-gray-50 text-gray-700")}
                      data-testid={`lang-btn-${lang.code}`}
                    >
                      <span>{lang.flag}</span>
                      <span className="truncate text-xs">{lang.name}</span>
                      {selected && <CheckCircle className="w-3.5 h-3.5 ml-auto flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <Button className="w-full" size="sm" disabled={selectedLangs.length === 0 || loadingAiData} onClick={handleLanguageConfirm} data-testid="btn-confirm-languages">
                {loadingAiData ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Loading…</>
                ) : (
                  <>Confirm {selectedLangs.length > 0 ? selectedLangs.length : ""} {selectedLangs.length === 1 ? "language" : "languages"}<ArrowRight className="ml-1.5 w-3.5 h-3.5" /></>
                )}
              </Button>
            </div>
          )}

          {/* WORKFLOW SELECTOR — 3 options */}
          {step === "workflow" && (
            <div className="space-y-2" data-testid="workflow-selector">
              {WORKFLOW_OPTIONS.map((opt) => {
                const estimate = analysis ? getDeliveryEstimate(opt.id, analysis.wordCount) : null;
                const creditEst = analysis
                  ? getCreditEstimate(opt.id, analysis.wordCount, selectedLangs.length || 1, creditRatesMap)
                  : null;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleWorkflowSelect(opt.id)}
                    disabled={loadingAiData}
                    className={cn(
                      "w-full flex items-center gap-4 p-5 rounded-2xl border-2 bg-white text-left transition-all",
                      opt.color,
                      loadingAiData && "opacity-60 cursor-wait"
                    )}
                    data-testid={`workflow-btn-${opt.id}`}
                  >
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", opt.iconColor)}>
                      <opt.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-navy">{opt.title}</p>
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", opt.badgeColor)}>{opt.badge}</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{opt.description}</p>
                      {/* Credit estimate — under the flow name */}
                      {analysis && (
                        <div className="flex items-baseline gap-1.5">
                          <p className="text-[10px] text-gray-400">Est. credits</p>
                          {creditEst ? (
                            <>
                              <p className="text-sm font-bold text-navy" data-testid={`credit-est-${opt.id}`}>
                                {creditEst.label}
                              </p>
                              {(creditEst.numLangs ?? 1) > 1 && (
                                <span className="text-[10px] font-semibold text-teal">×{creditEst.numLangs}</span>
                              )}
                              {opt.id === "ai_only" && (
                                <span className="text-[9px] text-gray-400">if credit-funded</span>
                              )}
                            </>
                          ) : (
                            <p className="text-[10px] text-amber-600 font-medium">Billed separately</p>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Delivery estimate — far right */}
                    <div className="shrink-0 text-right border-l border-gray-100 pl-4 min-w-[90px]">
                      {loadingAiData && opt.id !== "human_only" ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400 ml-auto" />
                      ) : estimate ? (
                        <>
                          <p className="text-[10px] text-gray-400 mb-0.5 whitespace-nowrap">Est. delivery</p>
                          <p className="text-sm font-bold text-navy whitespace-nowrap">{estimate.label}</p>
                          {estimate.date !== "Today" && (
                            <p className="text-[10px] text-gray-400 whitespace-nowrap">{estimate.date}</p>
                          )}
                          {estimate.date === "Today" && (
                            <p className="text-[10px] text-teal font-semibold whitespace-nowrap">Today</p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-gray-300">—</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* LINGUIST SOURCE SELECTOR */}
          {step === "linguist_source" && (
            <div className="space-y-2" data-testid="linguist-source-selector">
              {[
                {
                  id: "system_pool" as LinguistSourceOption,
                  title: "Linguist Network",
                  description: "Any verified linguist from the Contentech platform",
                  badge: "Widest availability",
                  badgeColor: "bg-gray-100 text-gray-600",
                  color: "border-gray-200 hover:border-gray-400 hover:bg-gray-50",
                  iconColor: "text-gray-600 bg-gray-100",
                },
                {
                  id: "preferred" as LinguistSourceOption,
                  title: "Preferred Linguists",
                  description: "Linguists you have approved and saved as preferred",
                  badge: "Priority routing",
                  badgeColor: "bg-gold/20 text-amber-700",
                  color: "border-gold/40 hover:border-gold hover:bg-gold/5",
                  iconColor: "text-amber-700 bg-gold/15",
                },
                {
                  id: "internal" as LinguistSourceOption,
                  title: "Internal Reviewers",
                  description: "Your own invited staff — no reviewer credits charged",
                  badge: "No credit charge",
                  badgeColor: "bg-blue-100 text-blue-700",
                  color: "border-blue-200 hover:border-blue-400 hover:bg-blue-50",
                  iconColor: "text-blue-600 bg-blue-100",
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleLinguistSourceSelect(opt.id)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-2xl border-2 bg-white text-left transition-all",
                    opt.color
                  )}
                  data-testid={`linguist-source-btn-${opt.id}`}
                >
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", opt.iconColor)}>
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-navy">{opt.title}</p>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", opt.badgeColor)}>
                        {opt.badge}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{opt.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* AI SOURCE — BYOK vs Credits */}
          {step === "ai_source" && (
            <div className="space-y-2" data-testid="ai-source-selector">
              <button
                type="button"
                onClick={() => handleAiSourceSelect("byok")}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 bg-white border-purple-200 hover:border-purple-400 hover:bg-purple-50 text-left transition-all"
                data-testid="ai-source-byok"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-purple-100 text-purple-600">
                  <Key className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-navy">Use My Own API Key (BYOK)</p>
                    {existingConfigs.length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        {existingConfigs.length} key{existingConfigs.length > 1 ? "s" : ""} saved
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Connect your OpenAI, DeepL, or other AI provider</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </button>

              <button
                type="button"
                onClick={() => handleAiSourceSelect("credits")}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 bg-white border-blue-200 hover:border-blue-400 hover:bg-blue-50 text-left transition-all"
                data-testid="ai-source-credits"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-100 text-blue-600">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-navy">Use System Credits</p>
                    {orgInfo && (
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        orgInfo.creditBalance > 0 ? "bg-teal/10 text-teal" : "bg-red-100 text-red-600"
                      )}>
                        {orgInfo.creditBalance} credits
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {orgInfo?.plan
                      ? `${orgInfo.plan} plan · ${orgInfo.creditBalance} credits remaining`
                      : "Pay per word with platform credits"}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          )}

          {/* BYOK CONFIG */}
          {step === "byok_config" && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm" data-testid="byok-config">
              {/* Existing keys */}
              {existingConfigs.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Saved API Keys</p>
                  <div className="space-y-2">
                    {existingConfigs.map((cfg) => (
                      <label
                        key={cfg.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                          selectedExistingConfig === cfg.id ? "border-navy bg-navy/5" : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <input
                          type="radio"
                          name="existing-config"
                          value={cfg.id}
                          checked={selectedExistingConfig === cfg.id}
                          onChange={() => setSelectedExistingConfig(cfg.id)}
                          className="accent-navy"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-navy">{PROVIDER_LABELS[cfg.provider] ?? cfg.provider}</p>
                          <p className="text-xs text-gray-400">{cfg.model ?? "Default model"} {cfg.lastUsed ? `· Last used ${new Date(cfg.lastUsed).toLocaleDateString()}` : ""}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  {selectedExistingConfig && (
                    <Button className="w-full mt-3" onClick={handleExistingConfigSelect} data-testid="btn-use-existing-key">
                      Use Selected Key
                      <ArrowRight className="ml-1.5 w-4 h-4" />
                    </Button>
                  )}
                  <div className="flex items-center gap-2 my-3">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400">or add a new key</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                </div>
              )}

              {/* New key form */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Provider</label>
                  <select
                    value={byokConfig.provider}
                    onChange={(e) => setByokConfig((p) => ({ ...p, provider: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="azure">Azure OpenAI</option>
                    <option value="deepl">DeepL</option>
                    <option value="modernmt">ModernMT</option>
                    <option value="google">Google Translate</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">API Key</label>
                  <div className="relative">
                    <input
                      type={byokConfig.showKey ? "text" : "password"}
                      placeholder="sk-…"
                      value={byokConfig.apiKey}
                      onChange={(e) => setByokConfig((p) => ({ ...p, apiKey: e.target.value }))}
                      className="w-full px-3 py-2 pe-10 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20"
                      data-testid="input-byok-apikey"
                    />
                    <button
                      type="button"
                      onClick={() => setByokConfig((p) => ({ ...p, showKey: !p.showKey }))}
                      className="absolute inset-y-0 end-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {byokConfig.showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {byokConfig.provider === "openai" && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Model</label>
                    <select
                      value={byokConfig.model}
                      onChange={(e) => setByokConfig((p) => ({ ...p, model: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20"
                    >
                      <option value="gpt-4o">GPT-4o</option>
                      <option value="gpt-4">GPT-4</option>
                      <option value="gpt-4o-mini">GPT-4o mini</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    </select>
                  </div>
                )}
                <Button className="w-full" onClick={handleByokSave} disabled={!byokConfig.apiKey.trim()} data-testid="btn-byok-connect">
                  Save Key & Continue
                  <ArrowRight className="ml-1.5 w-4 h-4" />
                </Button>
                <p className="text-[11px] text-gray-400 text-center">
                  Your key is encrypted and stored securely. Manage keys in{" "}
                  <Link href="/dashboard/settings" className="text-teal hover:underline">Settings → AI Keys</Link>.
                </p>
              </div>
            </div>
          )}

          {/* NO CREDITS — Upgrade prompt */}
          {step === "credits_check" && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm" data-testid="credits-check">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <p className="text-sm font-semibold text-navy">No active plan or credits</p>
              </div>
              <p className="text-xs text-gray-500 mb-5">Subscribe to a plan to use system credits for AI translation.</p>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {PLANS.map((plan) => (
                  <div key={plan.id} className={cn("rounded-xl border-2 p-3 text-center relative", plan.color)}>
                    {plan.highlight && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-teal text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                        POPULAR
                      </span>
                    )}
                    <Crown className={cn("w-5 h-5 mx-auto mb-1.5", plan.highlight ? "text-teal" : "text-gray-400")} />
                    <p className="text-xs font-bold text-navy">{plan.name}</p>
                    <p className="text-lg font-bold text-navy mt-0.5">{plan.price}</p>
                    <p className="text-[10px] text-gray-400 mb-2">{plan.credits}</p>
                    {plan.features.map((f) => (
                      <p key={f} className="text-[10px] text-gray-500 leading-tight mb-0.5">✓ {f}</p>
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" data-testid="btn-subscribe">
                  <Crown className="w-4 h-4 mr-1.5" /> Subscribe Now
                </Button>
                <Button variant="outline" onClick={() => handleAiSourceSelect("byok")} className="flex-1" data-testid="btn-use-byok-instead">
                  <Key className="w-4 h-4 mr-1.5" /> Use My API Key
                </Button>
              </div>
            </div>
          )}

          {/* LOCALIZATION ASSETS */}
          {step === "localization_assets" && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-5" data-testid="localization-assets">

              {loadingLocAssets ? (
                <div className="flex items-center justify-center py-8 gap-3 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Loading your brand assets…</span>
                </div>
              ) : (
                <>
                  {/* Translation Memories */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Database className="w-4 h-4 text-teal" />
                      <p className="text-sm font-semibold text-navy">Content Memory</p>
                      {selectedTMs.length > 0 && (
                        <span className="text-[10px] text-teal bg-teal/10 px-2 py-0.5 rounded-full font-medium">
                          {selectedTMs.length} selected
                        </span>
                      )}
                    </div>
                    {orgTMs.length === 0 ? (
                      <p className="text-xs text-gray-400 py-2">
                        No content memories in your account yet.{" "}
                        <Link href="/dashboard/memory" className="text-teal hover:underline" target="_blank">Create one</Link> to reuse past content.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {orgTMs.map((tm) => {
                          const checked = selectedTMs.includes(tm.id);
                          return (
                            <label
                              key={tm.id}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                                checked ? "border-teal/40 bg-teal/5" : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                              )}
                              data-testid={`tm-option-${tm.id}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setSelectedTMs((prev) =>
                                    checked ? prev.filter((id) => id !== tm.id) : [...prev, tm.id]
                                  )
                                }
                                className="w-4 h-4 accent-teal rounded"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-navy truncate">{tm.name}</p>
                                <p className="text-[11px] text-gray-400">
                                  {tm.entryCount?.toLocaleString() ?? 0} segments · {tm.sourceLanguage} → {tm.targetLanguage}
                                </p>
                              </div>
                              {checked && <CheckCircle className="w-4 h-4 text-teal flex-shrink-0" />}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-100" />

                  {/* Glossaries */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen className="w-4 h-4 text-gold" />
                      <p className="text-sm font-semibold text-navy">Glossary</p>
                      {selectedGlossaries.length > 0 && (
                        <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                          {selectedGlossaries.length} selected
                        </span>
                      )}
                    </div>
                    {orgGlossaries.length === 0 ? (
                      <p className="text-xs text-gray-400 py-2">
                        No glossaries yet.{" "}
                        <Link href="/dashboard/glossary" className="text-teal hover:underline" target="_blank">Add terminology</Link> to enforce brand consistency.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {orgGlossaries.map((gl) => {
                          const checked = selectedGlossaries.includes(gl.id);
                          return (
                            <label
                              key={gl.id}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                                checked ? "border-gold/40 bg-amber-50" : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                              )}
                              data-testid={`glossary-option-${gl.id}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setSelectedGlossaries((prev) =>
                                    checked ? prev.filter((id) => id !== gl.id) : [...prev, gl.id]
                                  )
                                }
                                className="w-4 h-4 accent-amber-500 rounded"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-navy truncate">{gl.name}</p>
                                <p className="text-[11px] text-gray-400">{gl.termCount?.toLocaleString() ?? 0} terms</p>
                              </div>
                              {checked && <CheckCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-100" />

                  {/* Style Guides */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Settings className="w-4 h-4 text-navy/60" />
                      <p className="text-sm font-semibold text-navy">Style Guides</p>
                      {selectedStyleGuides.length > 0 && (
                        <span className="text-[10px] text-navy bg-navy/10 px-2 py-0.5 rounded-full font-medium">
                          {selectedStyleGuides.length} selected
                        </span>
                      )}
                    </div>
                    {orgStyleGuides.length === 0 ? (
                      <p className="text-xs text-gray-400 py-2">
                        No style guides yet.{" "}
                        <Link href="/dashboard/style-guides" className="text-teal hover:underline" target="_blank">Upload a guide</Link> to enforce tone and writing rules.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {orgStyleGuides.map((sg) => {
                          const checked = selectedStyleGuides.includes(sg.id);
                          return (
                            <label
                              key={sg.id}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                                checked ? "border-navy/30 bg-navy/5" : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                              )}
                              data-testid={`style-guide-option-${sg.id}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setSelectedStyleGuides((prev) =>
                                    checked ? prev.filter((id) => id !== sg.id) : [...prev, sg.id]
                                  )
                                }
                                className="w-4 h-4 accent-navy rounded"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-navy truncate">{sg.name}</p>
                              </div>
                              {checked && <CheckCircle className="w-4 h-4 text-navy/60 flex-shrink-0" />}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button
                  className="flex-1"
                  onClick={() => handleLocalizationAssetsContinue(false)}
                  disabled={loadingLocAssets || (selectedTMs.length === 0 && selectedGlossaries.length === 0 && selectedStyleGuides.length === 0)}
                  data-testid="btn-attach-assets"
                >
                  <Database className="w-4 h-4 mr-2" />
                  Attach & Continue
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleLocalizationAssetsContinue(true)}
                  disabled={loadingLocAssets}
                  data-testid="btn-skip-assets"
                >
                  Skip
                </Button>
              </div>
            </div>
          )}

          {/* ORDER SUMMARY */}
          {step === "confirming" && analysis && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm" data-testid="order-summary">
              <h3 className="text-sm font-semibold text-navy mb-4">Order Summary</h3>
              <div className="space-y-2.5 mb-5">
                {[
                  { label: "Document", value: analysis.filename },
                  { label: "Type", value: analysis.docType },
                  { label: "Word Count", value: `${analysis.wordCount.toLocaleString()} words` },
                  { label: "Source", value: analysis.sourceLanguage },
                  { label: "Target Languages", value: selectedLangs.map((c) => LANGUAGES.find((l) => l.code === c)?.name).join(", ") },
                  { label: "Workflow", value: workflowLabel },
                  ...(aiSource ? [{ label: "AI Provider", value: aiSource === "byok" ? "Your API Key (BYOK)" : "System Credits" }] : []),
                  ...(primaryWorkflow !== "ai_only" ? [{ label: "Linguist Pool", value: linguistSource === "internal" ? "Internal Reviewers" : linguistSource === "preferred" ? "Preferred Linguists" : "Linguist Network" }] : []),
                  ...(selectedTMs.length > 0 ? [{ label: "Translation Memory", value: `${selectedTMs.length} attached` }] : []),
                  ...(selectedGlossaries.length > 0 ? [{ label: "Glossary", value: `${selectedGlossaries.length} attached` }] : []),
                  ...(selectedStyleGuides.length > 0 ? [{ label: "Style Guides", value: `${selectedStyleGuides.length} attached` }] : []),
                  ...(selectedClientAccountId ? [{ label: "Client Account", value: clientAccounts.find((a) => a.id === selectedClientAccountId)?.name ?? "" }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium text-navy text-right max-w-[60%] truncate">{value}</span>
                  </div>
                ))}
              </div>
              {/* No credits notice for internal linguists */}
              {linguistSource === "internal" && primaryWorkflow !== "ai_only" && (
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-700 text-[9px] font-bold">i</span>
                  </div>
                  <p className="text-xs text-blue-700">
                    Since you selected Internal Linguists, there will be no charge for human revision or translation credits for this job.
                  </p>
                </div>
              )}

              {showBillingCta && (
                <div className="mb-3 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-amber-800 mb-1">Insufficient credits</p>
                    <p className="text-xs text-amber-700 mb-2">Top up your balance to proceed with this project.</p>
                    <a
                      href="/dashboard/billing"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-900"
                      data-testid="link-go-to-billing"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Go to Billing
                    </a>
                  </div>
                </div>
              )}
              <Button className="w-full" onClick={handleStartTranslation} disabled={isSubmitting} data-testid="btn-confirm-order">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                Start Translation
              </Button>
            </div>
          )}

          {/* PROCESSING */}
          {step === "processing" && (
            <div className="bg-teal/5 border border-teal/20 rounded-2xl p-5" data-testid="processing-indicator">
              <div className="flex items-center gap-3 mb-3">
                <Loader2 className="w-5 h-5 text-teal animate-spin" />
                <span className="text-sm font-semibold text-navy">Processing your order…</span>
              </div>
              <div className="space-y-2">
                {["Creating project workspace", "Assigning to linguist network", "Initializing translation pipeline"].map((s, i) => (
                  <div key={s} className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DONE */}
          {step === "done" && (
            <div className="flex gap-3" data-testid="wizard-done">
              <Button onClick={() => router.push("/dashboard/projects")}>
                View All Projects <ArrowRight className="ml-1.5 w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={() => router.push("/dashboard")}>
                Back to Dashboard
              </Button>
            </div>
          )}

          {step === "ocr_request_created" && (
            <div className="flex gap-3" data-testid="wizard-ocr-request">
              <Button
                onClick={() => router.push("/dashboard/ocr-requests")}
                data-testid="button-view-ocr-requests"
              >
                Open OCR Requests <ArrowRight className="ml-1.5 w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={() => router.push("/dashboard")}>
                Back to Dashboard
              </Button>
            </div>
          )}

          {step === "ocr_quality_gate" && analysis && (
            <div
              className="rounded-lg border border-amber-300 bg-amber-50 p-5 max-w-2xl"
              data-testid="card-ocr-quality-gate"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3
                    className="text-base font-semibold text-[#33475B] mb-1"
                    data-testid="text-ocr-gate-title"
                  >
                    This scan needs cleanup before we can translate it accurately.
                  </h3>
                  <p className="text-sm text-slate-700 mb-1">
                    Detected OCR confidence:{" "}
                    <span className="font-semibold" data-testid="text-ocr-gate-confidence">
                      {typeof analysis.ocrConfidence === "number"
                        ? `${(analysis.ocrConfidence * 100).toFixed(1)}%`
                        : "unknown"}
                    </span>{" "}
                    · Threshold:{" "}
                    <span className="font-semibold">
                      {typeof analysis.ocrConfidenceThreshold === "number"
                        ? `${(analysis.ocrConfidenceThreshold * 100).toFixed(0)}%`
                        : "95%"}
                    </span>
                  </p>
                  <p className="text-sm text-slate-700 mb-4">
                    Send the file to your OCR Requests queue so a linguist can
                    review and clean up the recognized text first, or continue
                    anyway with a quality warning attached to the project.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={async () => {
                        if (!analysis) return;
                        setCreatingOcrRequest(true);
                        const enrichment = analysis.ocrEnrichment ?? null;
                        const canonicalPages =
                          enrichment && Array.isArray(enrichment.pages) ? enrichment.pages : [];
                        const conf =
                          typeof analysis.ocrConfidence === "number" &&
                          Number.isFinite(analysis.ocrConfidence)
                            ? Math.max(0, Math.min(1, analysis.ocrConfidence))
                            : 0;
                        try {
                          const createRes = await fetch("/api/ocr-requests", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              sourceFilename: analysis.filename,
                              sourceFileUrl: analysis.pdfStoredPath ?? "",
                              sourceMimeType: analysis.sourceMimeType ?? null,
                              sourceLanguage: analysis.sourceLanguage,
                              pageCount: analysis.pageCount ?? canonicalPages.length,
                              wordCount: analysis.wordCount,
                              avgConfidence: conf,
                              perPageConfidence: canonicalPages.map((p: { confidence?: unknown }) =>
                                typeof p.confidence === "number" ? p.confidence : 0
                              ),
                              pages: canonicalPages,
                              provider: enrichment?.provider ?? "tesseract",
                              extractedText: enrichment?.extractedText ?? null,
                              extractedMarkdown: enrichment?.extractedMarkdown ?? null,
                              // Persist the full PdfStructured produced by
                              // PyMuPDF + Tesseract (with bbox / font_size /
                              // line metadata) so layout-preserving delivery
                              // works for OCR-derived projects. The lighter
                              // OcrExtractResult.structuredLayout is not
                              // sufficient for `generateLayoutPdf`.
                              structuredLayout:
                                analysis.structuredData ??
                                enrichment?.structuredLayout ??
                                null,
                              workflowType: "AI_HUMAN",
                            }),
                          });
                          if (!createRes.ok) {
                            const e = await createRes.json().catch(() => ({}));
                            addBotMessage(
                              e.error
                                ? `Could not create the OCR request: ${e.error}`
                                : "Could not create the OCR request. Please try again.",
                              200
                            );
                            return;
                          }
                          const created = await createRes.json().catch(() => null);
                          if (created?.id) setAttachedOcrRequestId(created.id);
                          addBotMessage(
                            "Created. Open OCR Requests in the sidebar to review and approve.",
                            200
                          );
                          setStep("ocr_request_created");
                        } catch {
                          addBotMessage("Network error while creating the OCR request.", 200);
                        } finally {
                          setCreatingOcrRequest(false);
                        }
                      }}
                      disabled={creatingOcrRequest}
                      className="bg-[#FF7A59] hover:bg-[#FF8F73]"
                      data-testid="button-create-ocr-request"
                    >
                      {creatingOcrRequest ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating…
                        </>
                      ) : (
                        <>Create OCR Request</>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAnalysis((a) => (a ? { ...a, ocrContinueAnyway: true } : a));
                        addBotMessage(
                          "Continuing with the raw OCR text. The output may be imperfect — a warning will be attached to the project.",
                          200
                        );
                        setTimeout(() => {
                          setStep("target_language");
                          addBotMessage(
                            "Which language(s) should we translate this into?",
                            800
                          );
                        }, 800);
                      }}
                      disabled={creatingOcrRequest}
                      data-testid="button-continue-anyway"
                    >
                      Continue anyway
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
