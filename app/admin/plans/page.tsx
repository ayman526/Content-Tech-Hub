"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Pencil, Trash2, Star, CheckCircle, XCircle, GripVertical,
  Shield, ToggleLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

// ── Types ────────────────────────────────────────────────────────────────────

type Plan = {
  id: string;
  name: string;
  slug: string;
  price: number;
  period: string;
  description: string | null;
  features: string[];
  creditsPerCycle: number;
  isPopular: boolean;
  isActive: boolean;
  displayOrder: number;
  ctaText: string;
  ctaHref: string;
};

const PLAN_SLUGS = ["starter", "professional", "agency", "enterprise"] as const;
const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  professional: "Professional",
  agency: "Agency",
  enterprise: "Enterprise",
};

type FeatureRow = {
  key: string;
  label: string;
  description: string;
  plans: Record<string, boolean>;
};

const EMPTY: Omit<Plan, "id"> = {
  name: "", slug: "", price: 0, period: "/mo", description: "",
  features: [], creditsPerCycle: 0, isPopular: false, isActive: true,
  displayOrder: 0, ctaText: "Get Started", ctaHref: "/register",
};

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminPlansPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"plans" | "features">("plans");

  // ── Plans tab state ──────────────────────────────────────────────────────

  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [featureInput, setFeatureInput] = useState("");
  const [form, setForm] = useState<Omit<Plan, "id">>(EMPTY);

  const loadPlans = useCallback(async () => {
    setPlansLoading(true);
    const res = await fetch("/api/admin/plans");
    setPlans(await res.json());
    setPlansLoading(false);
  }, []);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  function openNew() { setForm(EMPTY); setFeatureInput(""); setEditing(null); setIsNew(true); }
  function openEdit(plan: Plan) { setForm({ ...plan }); setFeatureInput(""); setEditing(plan); setIsNew(false); }
  function closeModal() { setEditing(null); setIsNew(false); }

  async function save() {
    setSaving(true);
    const method = isNew ? "POST" : "PATCH";
    const url = isNew ? "/api/admin/plans" : `/api/admin/plans/${editing!.id}`;
    const payload = { ...form, price: Number(form.price), creditsPerCycle: Number(form.creditsPerCycle), displayOrder: Number(form.displayOrder) };
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    closeModal();
    loadPlans();
  }

  async function deletePlan(id: string) {
    if (!confirm("Delete this plan? This cannot be undone.")) return;
    setDeleting(id);
    await fetch(`/api/admin/plans/${id}`, { method: "DELETE" });
    setDeleting(null);
    loadPlans();
  }

  async function toggleActive(plan: Plan) {
    await fetch(`/api/admin/plans/${plan.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !plan.isActive }),
    });
    loadPlans();
  }

  function addFeature() {
    if (!featureInput.trim()) return;
    setForm((f) => ({ ...f, features: [...f.features, featureInput.trim()] }));
    setFeatureInput("");
  }

  function removeFeature(i: number) {
    setForm((f) => ({ ...f, features: f.features.filter((_, idx) => idx !== i) }));
  }

  // ── Features tab state ───────────────────────────────────────────────────

  const [featureRows, setFeatureRows] = useState<FeatureRow[]>([]);
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const loadFeatures = useCallback(async () => {
    setFeaturesLoading(true);
    const res = await fetch("/api/admin/plan-features");
    const data = await res.json();
    setFeatureRows(data.features ?? []);
    setFeaturesLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "features" && featureRows.length === 0) loadFeatures();
  }, [tab, featureRows.length, loadFeatures]);

  async function toggleFeature(featureKey: string, planSlug: string, current: boolean) {
    const id = `${featureKey}::${planSlug}`;
    setToggling(id);
    const res = await fetch("/api/admin/plan-features", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feature: featureKey, planSlug, enabled: !current }),
    });
    if (res.ok) {
      setFeatureRows((rows) =>
        rows.map((r) =>
          r.key === featureKey
            ? { ...r, plans: { ...r.plans, [planSlug]: !current } }
            : r
        )
      );
      toast({ title: `${PLAN_LABELS[planSlug] ?? planSlug} — feature updated` });
    } else {
      toast({ title: "Update failed", description: "Failed to update feature flag", variant: "destructive" });
    }
    setToggling(null);
  }

  const showModal = isNew || !!editing;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#33475B" }}>Plans & Features</h1>
          <p className="text-sm mt-0.5" style={{ color: "#516F90" }}>
            Manage subscription plans and control which platform features each plan can access
          </p>
        </div>
        {tab === "plans" && (
          <Button onClick={openNew} data-testid="button-add-plan"
            style={{ background: "#FF7A59", color: "#fff", border: "none" }}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Plan
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#CBD6E2]">
        <button
          onClick={() => setTab("plans")}
          data-testid="tab-plans"
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "plans"
              ? "border-[#FF7A59] text-[#FF7A59]"
              : "border-transparent text-[#516F90] hover:text-[#33475B]"
          }`}
        >
          Subscription Plans
        </button>
        <button
          onClick={() => setTab("features")}
          data-testid="tab-features"
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            tab === "features"
              ? "border-[#FF7A59] text-[#FF7A59]"
              : "border-transparent text-[#516F90] hover:text-[#33475B]"
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          Platform Features
        </button>
      </div>

      {/* ── Plans Tab ─────────────────────────────────────────────────── */}
      {tab === "plans" && (
        <>
          {plansLoading ? (
            <div className="text-center py-16 text-gray-400">Loading plans...</div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#CBD6E2] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#F5F8FA] border-b border-[#CBD6E2]">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold text-[#33475B]">Plan</th>
                    <th className="px-5 py-3 text-left font-semibold text-[#33475B]">Price</th>
                    <th className="px-5 py-3 text-left font-semibold text-[#33475B]">Credits/mo</th>
                    <th className="px-5 py-3 text-left font-semibold text-[#33475B]">Features</th>
                    <th className="px-5 py-3 text-center font-semibold text-[#33475B]">Popular</th>
                    <th className="px-5 py-3 text-center font-semibold text-[#33475B]">Active</th>
                    <th className="px-5 py-3 text-right font-semibold text-[#33475B]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CBD6E2]">
                  {plans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-[#F5F8FA] transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-[#33475B]">{plan.name}</div>
                        <div className="text-xs text-[#99ACC2]">{plan.slug}</div>
                      </td>
                      <td className="px-5 py-4 text-[#33475B]">
                        {Number(plan.price) === 0 ? "Free" : `$${Number(plan.price)}${plan.period}`}
                      </td>
                      <td className="px-5 py-4 text-[#33475B]">
                        {plan.creditsPerCycle > 0 ? plan.creditsPerCycle.toLocaleString() : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[#516F90]">{plan.features.length} features</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {plan.isPopular
                          ? <Star className="w-4 h-4 text-amber-400 mx-auto" />
                          : <span className="text-[#CBD6E2]">—</span>}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button onClick={() => toggleActive(plan)} data-testid={`toggle-active-${plan.id}`}>
                          {plan.isActive
                            ? <CheckCircle className="w-5 h-5 text-[#00BDA5] mx-auto" />
                            : <XCircle className="w-5 h-5 text-[#CBD6E2] mx-auto" />}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(plan)} data-testid={`button-edit-plan-${plan.id}`}
                            className="p-1.5 rounded-lg hover:bg-[#F5F8FA] text-[#516F90] hover:text-[#33475B] transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => deletePlan(plan.id)} disabled={deleting === plan.id}
                            data-testid={`button-delete-plan-${plan.id}`}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-[#CBD6E2] hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Platform Features Tab ─────────────────────────────────────── */}
      {tab === "features" && (
        <>
          <div className="mb-4 p-3 rounded-lg text-xs" style={{ background: "#F5F8FA", color: "#516F90", border: "1px solid #CBD6E2" }}>
            Toggle switches to enable or disable each platform feature for a subscription tier.
            Changes take effect immediately for all users on that plan.
          </div>

          {featuresLoading ? (
            <div className="text-center py-16 text-gray-400">Loading features...</div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#CBD6E2] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#F5F8FA] border-b border-[#CBD6E2]">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold text-[#33475B] w-56">Feature</th>
                    {PLAN_SLUGS.map((slug) => (
                      <th key={slug} className="px-4 py-3 text-center font-semibold text-[#33475B] w-32">
                        {PLAN_LABELS[slug]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CBD6E2]">
                  {featureRows.map((feat) => (
                    <tr key={feat.key} className="hover:bg-[#F5F8FA] transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-[#33475B] text-xs">{feat.label}</div>
                        <div className="text-[11px] text-[#99ACC2] mt-0.5 leading-snug">{feat.description}</div>
                      </td>
                      {PLAN_SLUGS.map((slug) => {
                        const enabled = feat.plans[slug] ?? false;
                        const id = `${feat.key}::${slug}`;
                        const busy = toggling === id;
                        return (
                          <td key={slug} className="px-4 py-4 text-center">
                            <Switch
                              checked={enabled}
                              disabled={busy}
                              onCheckedChange={() => toggleFeature(feat.key, slug, enabled)}
                              data-testid={`feature-toggle-${feat.key}-${slug}`}
                              className={enabled ? "data-[state=checked]:bg-[#0091AE]" : ""}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Edit / New Plan Dialog ────────────────────────────────────── */}
      <Dialog open={showModal} onOpenChange={(o) => !o && closeModal()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? "Add Plan" : "Edit Plan"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div>
              <Label>Name</Label>
              <Input data-testid="input-plan-name" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Slug</Label>
              <Input data-testid="input-plan-slug" value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                className="mt-1" placeholder="e.g. professional" />
            </div>
            <div>
              <Label>Price (USD)</Label>
              <Input data-testid="input-plan-price" type="number" min={0} value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} className="mt-1" />
            </div>
            <div>
              <Label>Period</Label>
              <Input data-testid="input-plan-period" value={form.period}
                onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
                className="mt-1" placeholder="/mo" />
            </div>
            <div>
              <Label>Credits / Billing Cycle</Label>
              <Input data-testid="input-plan-credits" type="number" min={0} value={form.creditsPerCycle}
                onChange={(e) => setForm((f) => ({ ...f, creditsPerCycle: Number(e.target.value) }))} className="mt-1" />
            </div>
            <div>
              <Label>Display Order</Label>
              <Input data-testid="input-plan-order" type="number" min={0} value={form.displayOrder}
                onChange={(e) => setForm((f) => ({ ...f, displayOrder: Number(e.target.value) }))} className="mt-1" />
            </div>
            <div>
              <Label>CTA Button Text</Label>
              <Input data-testid="input-plan-cta-text" value={form.ctaText}
                onChange={(e) => setForm((f) => ({ ...f, ctaText: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>CTA Button Link</Label>
              <Input data-testid="input-plan-cta-href" value={form.ctaHref}
                onChange={(e) => setForm((f) => ({ ...f, ctaHref: e.target.value }))} className="mt-1" />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea data-testid="input-plan-description" value={form.description ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="mt-1" rows={2} />
            </div>
            <div className="col-span-2">
              <Label>Marketing Feature List</Label>
              <div className="mt-1 space-y-1.5">
                {form.features.map((feat, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-[#CBD6E2]" />
                    <span className="flex-1 text-sm text-[#33475B]">{feat}</span>
                    <button onClick={() => removeFeature(i)} className="text-[#CBD6E2] hover:text-red-400 transition-colors">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2 mt-2">
                  <Input data-testid="input-plan-feature" value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addFeature()}
                    placeholder="Add a feature line and press Enter or click Add"
                    className="flex-1 text-sm" />
                  <Button type="button" onClick={addFeature} variant="outline" size="sm">Add</Button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch data-testid="switch-plan-popular" checked={form.isPopular}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isPopular: v }))} />
              <Label>Mark as Popular</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch data-testid="switch-plan-active" checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={save} disabled={saving} data-testid="button-save-plan"
              style={{ background: "#FF7A59", color: "#fff", border: "none" }}>
              {saving ? "Saving..." : "Save Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
