"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  FolderOpen,
  BookOpen,
  Library,
  FileText,
  X,
  Check,
  Loader2,
  Lock,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type ClientAccount = {
  id: string;
  name: string;
  notes: string | null;
  websiteUrl: string | null;
  industry: string | null;
  companyBio: string | null;
  createdAt: string;
  projectCount: number;
  tmCount: number;
  glossaryCount: number;
  styleGuideCount: number;
};

type ClientFormState = {
  name: string;
  notes: string;
  websiteUrl: string;
  industry: string;
  companyBio: string;
};

const EMPTY_FORM: ClientFormState = {
  name: "",
  notes: "",
  websiteUrl: "",
  industry: "",
  companyBio: "",
};

function ContextExplainer() {
  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4 flex gap-3">
      <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5 text-orange-500" />
      <p className="text-xs leading-relaxed text-[#516F90]">
        <span className="font-semibold text-[#33475B]">Why we ask for this:</span>{" "}
        Cento (our AI translator) uses your client's website, industry, and short bio to
        ground every translation draft in their domain vocabulary and brand voice. Drafts
        come back more accurate and on-brand, so your linguists spend less time editing.
        These fields are sent only to the AI model and are never shown to end-readers.
      </p>
    </div>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ClientsPage() {
  const [accounts, setAccounts] = useState<ClientAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgPlan, setOrgPlan] = useState<string | null>(null);
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean> | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<ClientFormState>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<ClientAccount | null>(null);
  const [editForm, setEditForm] = useState<ClientFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/client-accounts");
    if (res.ok) setAccounts(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/organization").then((r) => r.ok ? r.json() : null).then((data) => {
      setOrgPlan(data?.plan ?? "STARTER");
      setFeatureFlags(data?.featureFlags ?? null);
    });
    load();
  }, [load]);

  // Use DB-backed feature flag; fall back to plan string only if flags not loaded yet
  const canAccessClients = featureFlags !== null
    ? (featureFlags["clients_tab"] ?? false)
    : (orgPlan === "AGENCY" || orgPlan === "ENTERPRISE");

  if (orgPlan !== null && !canAccessClients) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: "#33475B" }}>Clients</h1>
          <p className="text-sm mt-0.5" style={{ color: "#516F90" }}>
            Manage client accounts and keep each client's work and assets separate
          </p>
        </div>

        <div className="rounded-2xl border border-[#CBD6E2] bg-white overflow-hidden">
          <div className="px-8 py-10 text-center border-b border-[#CBD6E2]"
            style={{ background: "linear-gradient(135deg, #F5F8FA 0%, #EEF4F8 100%)" }}>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
              style={{ background: "#FF7A5915" }}>
              <Lock className="w-8 h-8" style={{ color: "#FF7A59" }} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: "#33475B" }}>
              Plan Upgrade Required
            </h2>
            <p className="text-sm max-w-md mx-auto mb-6" style={{ color: "#516F90" }}>
              Client workspace management is not included in your current plan.
              Upgrade to manage multiple end-clients with fully isolated workspaces, assets, and analytics.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/dashboard/billing">
                <Button
                  data-testid="btn-upgrade-to-agency"
                  className="gap-2"
                  style={{ background: "#FF7A59", color: "#fff", border: "none" }}
                >
                  Upgrade to Agency — $100/mo
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/en/pricing">
                <Button variant="outline" data-testid="btn-view-plans">
                  View all plans
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 divide-x divide-[#CBD6E2]">
            {[
              {
                icon: FolderOpen,
                title: "Per-Client Projects",
                desc: "Each client gets their own project space. Work is fully isolated — no cross-client data leakage.",
              },
              {
                icon: BookOpen,
                title: "Per-Client Translation Memory",
                desc: "Maintain separate TMs per client so each client benefits from their own translation history.",
              },
              {
                icon: Library,
                title: "Per-Client Glossaries",
                desc: "Define client-specific terminology. Each client's brand voice and technical terms stay in their own glossary.",
              },
              {
                icon: Layers,
                title: "Client-Level Analytics",
                desc: "Track spend, volume, and performance per client. Generate per-client reports for billing and review.",
              },
            ].map((feat) => (
              <div key={feat.title} className="p-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl mb-3"
                  style={{ background: "#0091AE15" }}>
                  <feat.icon className="w-5 h-5" style={{ color: "#0091AE" }} />
                </div>
                <h3 className="text-sm font-semibold mb-1" style={{ color: "#33475B" }}>{feat.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "#516F90" }}>{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  async function handleCreate() {
    if (!createForm.name.trim()) return;
    setCreating(true);
    setCreateError(null);
    const res = await fetch("/api/client-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm),
    });
    if (res.ok) {
      setShowCreate(false);
      setCreateForm(EMPTY_FORM);
      await load();
    } else {
      const data = await res.json();
      setCreateError(data.error ?? "Failed to create client account");
    }
    setCreating(false);
  }

  function openEdit(account: ClientAccount) {
    setEditTarget(account);
    setEditForm({
      name: account.name,
      notes: account.notes ?? "",
      websiteUrl: account.websiteUrl ?? "",
      industry: account.industry ?? "",
      companyBio: account.companyBio ?? "",
    });
    setSaveError(null);
  }

  async function handleSave() {
    if (!editTarget || !editForm.name.trim()) return;
    setSaving(true);
    setSaveError(null);
    const res = await fetch(`/api/client-accounts/${editTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      setEditTarget(null);
      await load();
    } else {
      const data = await res.json();
      setSaveError(data.error ?? "Failed to save");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch(`/api/client-accounts/${id}`, { method: "DELETE" });
    setConfirmDeleteId(null);
    await load();
    setDeletingId(null);
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#33475B" }}>Clients</h1>
          <p className="text-sm mt-0.5" style={{ color: "#516F90" }}>
            Manage client accounts and keep each client's work and assets separate
          </p>
        </div>
        <Button
          data-testid="btn-new-client"
          className="gap-2"
          style={{ background: "#FF7A59" }}
          onClick={() => { setShowCreate(true); setCreateError(null); setCreateForm(EMPTY_FORM); }}
        >
          <Plus className="w-4 h-4" /> New Client
        </Button>
      </div>

      <div className="rounded-xl border border-[#CBD6E2] bg-[#F5F8FA] px-5 py-4 mb-6 flex gap-3">
        <Layers className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#0091AE" }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: "#33475B" }}>How Client Accounts Work</p>
          <p className="text-sm mt-0.5" style={{ color: "#516F90" }}>
            Create a client account for each end-client you work with. You can tag translation memories, glossaries, and style guides to a specific client — and when placing an order in the wizard, select which client it's for so assets are filtered automatically.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-sm" style={{ color: "#99ACC2" }}>Loading…</div>
      ) : accounts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#CBD6E2] p-16 text-center">
          <Layers className="w-14 h-14 mx-auto mb-4" style={{ color: "#CBD6E2" }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: "#33475B" }}>No client accounts yet</h3>
          <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: "#516F90" }}>
            Create your first client account to start organizing projects and localization assets per client.
          </p>
          <Button
            variant="outline"
            onClick={() => { setShowCreate(true); setCreateError(null); setCreateForm(EMPTY_FORM); }}
          >
            <Plus className="w-4 h-4 mr-2" /> Create First Client
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="bg-white rounded-2xl border border-[#CBD6E2] p-5 hover:border-[#0091AE]/40 transition-colors group"
              data-testid={`client-card-${account.id}`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm truncate" style={{ color: "#33475B" }}>
                    {account.name}
                  </h3>
                  {account.notes && (
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "#99ACC2" }}>
                      {account.notes}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="p-1.5 rounded-lg hover:bg-[#F5F8FA] transition-colors"
                    title="Edit"
                    data-testid={`btn-edit-client-${account.id}`}
                    onClick={() => openEdit(account)}
                  >
                    <Pencil className="w-3.5 h-3.5" style={{ color: "#516F90" }} />
                  </button>
                  <button
                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    title="Delete"
                    data-testid={`btn-delete-client-${account.id}`}
                    onClick={() => setConfirmDeleteId(account.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <Stat icon={FolderOpen} label="Projects" value={account.projectCount} color="#0091AE" />
                <Stat icon={BookOpen} label="TMs" value={account.tmCount} color="#FF7A59" />
                <Stat icon={Library} label="Glossaries" value={account.glossaryCount} color="#6366F1" />
                <Stat icon={FileText} label="Style Guides" value={account.styleGuideCount} color="#10B981" />
              </div>

              <p className="text-[11px]" style={{ color: "#99ACC2" }}>
                Created {formatDate(account.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => { if (!o) { setShowCreate(false); setCreateError(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Client Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Client Name <span className="text-red-400">*</span></Label>
              <Input
                data-testid="input-client-name"
                placeholder="e.g. Nike, ACME Corp, Pharma Co."
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </div>

            <ContextExplainer />

            <div className="space-y-1.5">
              <Label>Client website <span className="text-[#99ACC2] font-normal">(optional)</span></Label>
              <Input
                data-testid="input-client-website"
                placeholder="https://www.client-website.com"
                value={createForm.websiteUrl}
                onChange={(e) => setCreateForm((f) => ({ ...f, websiteUrl: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Industry <span className="text-[#99ACC2] font-normal">(optional)</span></Label>
              <Input
                data-testid="input-client-industry"
                placeholder="e.g. Fashion, Pharmaceuticals, Hospitality, Legal services"
                value={createForm.industry}
                onChange={(e) => setCreateForm((f) => ({ ...f, industry: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Company bio <span className="text-[#99ACC2] font-normal">(optional)</span></Label>
              <Textarea
                data-testid="input-client-bio"
                rows={4}
                maxLength={1500}
                placeholder="What does this client do? Who do they serve? Any tone or terminology preferences?"
                value={createForm.companyBio}
                onChange={(e) => setCreateForm((f) => ({ ...f, companyBio: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Internal notes <span className="text-[#99ACC2] font-normal">(optional, not sent to AI)</span></Label>
              <Input
                data-testid="input-client-notes"
                placeholder="Contact person, billing reference, any internal reminders…"
                value={createForm.notes}
                onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            {createError && <p className="text-sm text-red-500">{createError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              data-testid="btn-confirm-create-client"
              onClick={handleCreate}
              disabled={creating || !createForm.name.trim()}
              style={{ background: "#FF7A59" }}
            >
              {creating ? "Creating…" : "Create Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Client Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Client Name <span className="text-red-400">*</span></Label>
              <Input
                data-testid="input-edit-client-name"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <ContextExplainer />

            <div className="space-y-1.5">
              <Label>Client website <span className="text-[#99ACC2] font-normal">(optional)</span></Label>
              <Input
                data-testid="input-edit-client-website"
                placeholder="https://www.client-website.com"
                value={editForm.websiteUrl}
                onChange={(e) => setEditForm((f) => ({ ...f, websiteUrl: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Industry <span className="text-[#99ACC2] font-normal">(optional)</span></Label>
              <Input
                data-testid="input-edit-client-industry"
                placeholder="e.g. Fashion, Pharmaceuticals, Hospitality"
                value={editForm.industry}
                onChange={(e) => setEditForm((f) => ({ ...f, industry: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Company bio <span className="text-[#99ACC2] font-normal">(optional)</span></Label>
              <Textarea
                data-testid="input-edit-client-bio"
                rows={4}
                maxLength={1500}
                placeholder="What does this client do? Who do they serve? Any tone or terminology preferences?"
                value={editForm.companyBio}
                onChange={(e) => setEditForm((f) => ({ ...f, companyBio: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Internal notes <span className="text-[#99ACC2] font-normal">(optional, not sent to AI)</span></Label>
              <Input
                data-testid="input-edit-client-notes"
                value={editForm.notes}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            {saveError && <p className="text-sm text-red-500">{saveError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button
              data-testid="btn-confirm-edit-client"
              onClick={handleSave}
              disabled={saving || !editForm.name.trim()}
              style={{ background: "#0091AE" }}
            >
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!confirmDeleteId} onOpenChange={(o) => { if (!o) setConfirmDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Client Account</DialogTitle>
          </DialogHeader>
          <p className="text-sm py-2" style={{ color: "#516F90" }}>
            This will remove the client account. Projects and assets tagged to this client will become untagged (shared) — they will not be deleted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
            <Button
              data-testid="btn-confirm-delete-client"
              variant="destructive"
              disabled={deletingId === confirmDeleteId}
              onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
            >
              {deletingId === confirmDeleteId
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Deleting…</>
                : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-[#F5F8FA] px-3 py-2">
      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
      <div className="min-w-0">
        <p className="text-xs font-bold" style={{ color: "#33475B" }}>{value}</p>
        <p className="text-[10px]" style={{ color: "#99ACC2" }}>{label}</p>
      </div>
    </div>
  );
}
