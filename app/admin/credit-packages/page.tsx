"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Star, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type CreditPackage = {
  id: string;
  name: string;
  credits: number;
  bonusCredits: number;
  priceUsd: number;
  isPopular: boolean;
  isActive: boolean;
  displayOrder: number;
};

type CreditRate = {
  id: string;
  workflowType: string;
  creditsPerWord: number;
  label: string;
};

const EMPTY: Omit<CreditPackage, "id"> = {
  name: "", credits: 1000, bonusCredits: 0, priceUsd: 49,
  isPopular: false, isActive: true, displayOrder: 0,
};

function calcPerWord(totalCredits: number, priceUsd: number, rate: CreditRate) {
  if (!totalCredits || !priceUsd) return "—";
  const credPerWord = Number(rate.creditsPerWord);
  const costPerCredit = priceUsd / totalCredits;
  const costPerWord = costPerCredit * credPerWord;
  return `$${costPerWord.toFixed(4)}/word`;
}

function wordsPerPackage(totalCredits: number, rate: CreditRate) {
  const cpw = Number(rate.creditsPerWord);
  if (!cpw || !totalCredits) return "—";
  return Math.floor(totalCredits / cpw).toLocaleString() + " words";
}

export default function AdminCreditPackagesPage() {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [rates, setRates] = useState<CreditRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CreditPackage | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<CreditPackage, "id">>(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    const [pkgRes, rateRes] = await Promise.all([
      fetch("/api/admin/credit-packages"),
      fetch("/api/admin/credit-rates"),
    ]);
    setPackages(await pkgRes.json());
    setRates(await rateRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() { setForm(EMPTY); setEditing(null); setIsNew(true); }
  function openEdit(pkg: CreditPackage) { setForm({ ...pkg }); setEditing(pkg); setIsNew(false); }
  function closeModal() { setEditing(null); setIsNew(false); }

  async function save() {
    setSaving(true);
    const method = isNew ? "POST" : "PATCH";
    const url = isNew ? "/api/admin/credit-packages" : `/api/admin/credit-packages/${editing!.id}`;
    const payload = { ...form, credits: Number(form.credits), bonusCredits: Number(form.bonusCredits), priceUsd: Number(form.priceUsd), displayOrder: Number(form.displayOrder) };
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    closeModal();
    load();
  }

  async function deletePkg(id: string) {
    if (!confirm("Delete this credit package?")) return;
    setDeleting(id);
    await fetch(`/api/admin/credit-packages/${id}`, { method: "DELETE" });
    setDeleting(null);
    load();
  }

  async function toggleActive(pkg: CreditPackage) {
    await fetch(`/api/admin/credit-packages/${pkg.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !pkg.isActive }),
    });
    load();
  }

  const showModal = isNew || !!editing;
  const formTotal = Number(form.credits) + Number(form.bonusCredits);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#33475B" }}>Credit Packages</h1>
          <p className="text-sm mt-0.5" style={{ color: "#516F90" }}>Purchasable credit bundles shown on the client billing page</p>
        </div>
        <Button onClick={openNew} data-testid="button-add-package" style={{ background: "#FF7A59", color: "#fff", border: "none" }}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Package
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading packages...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#CBD6E2] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F8FA] border-b border-[#CBD6E2]">
              <tr>
                <th className="px-5 py-3 text-left font-semibold text-[#33475B]">Package</th>
                <th className="px-5 py-3 text-left font-semibold text-[#33475B]">Credits</th>
                <th className="px-5 py-3 text-left font-semibold text-[#33475B]">Price</th>
                <th className="px-5 py-3 text-left font-semibold text-[#33475B]">$/credit</th>
                <th className="px-5 py-3 text-center font-semibold text-[#33475B]">Popular</th>
                <th className="px-5 py-3 text-center font-semibold text-[#33475B]">Active</th>
                <th className="px-5 py-3 text-right font-semibold text-[#33475B]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CBD6E2]">
              {packages.map((pkg) => {
                const total = pkg.credits + pkg.bonusCredits;
                const ppc = Number(pkg.priceUsd) / total;
                return (
                  <tr key={pkg.id} className="hover:bg-[#F5F8FA] transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-[#33475B]">{pkg.name}</div>
                    </td>
                    <td className="px-5 py-4 text-[#33475B]">
                      {pkg.credits.toLocaleString()}
                      {pkg.bonusCredits > 0 && (
                        <span className="ml-1.5 text-xs text-[#00BDA5] font-medium">+{pkg.bonusCredits.toLocaleString()} bonus</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-[#33475B]">${Number(pkg.priceUsd).toFixed(2)}</td>
                    <td className="px-5 py-4 text-[#516F90]">${ppc.toFixed(5)}</td>
                    <td className="px-5 py-4 text-center">
                      {pkg.isPopular ? <Star className="w-4 h-4 text-amber-400 mx-auto" /> : <span className="text-[#CBD6E2]">—</span>}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button onClick={() => toggleActive(pkg)} data-testid={`toggle-pkg-active-${pkg.id}`}>
                        {pkg.isActive
                          ? <CheckCircle className="w-5 h-5 text-[#00BDA5] mx-auto" />
                          : <XCircle className="w-5 h-5 text-[#CBD6E2] mx-auto" />}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(pkg)} data-testid={`button-edit-pkg-${pkg.id}`}
                          className="p-1.5 rounded-lg hover:bg-[#F5F8FA] text-[#516F90] hover:text-[#33475B] transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => deletePkg(pkg.id)} disabled={deleting === pkg.id}
                          data-testid={`button-delete-pkg-${pkg.id}`}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-[#CBD6E2] hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showModal} onOpenChange={(o) => !o && closeModal()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isNew ? "Add Credit Package" : "Edit Credit Package"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2">
              <Label>Package Name</Label>
              <Input data-testid="input-pkg-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Base Credits</Label>
              <Input data-testid="input-pkg-credits" type="number" min={1} value={form.credits} onChange={(e) => setForm((f) => ({ ...f, credits: Number(e.target.value) }))} className="mt-1" />
            </div>
            <div>
              <Label>Bonus Credits</Label>
              <Input data-testid="input-pkg-bonus" type="number" min={0} value={form.bonusCredits} onChange={(e) => setForm((f) => ({ ...f, bonusCredits: Number(e.target.value) }))} className="mt-1" />
            </div>
            <div>
              <Label>Price (USD)</Label>
              <Input data-testid="input-pkg-price" type="number" min={0} step={0.01} value={form.priceUsd} onChange={(e) => setForm((f) => ({ ...f, priceUsd: Number(e.target.value) }))} className="mt-1" />
            </div>
            <div>
              <Label>Display Order</Label>
              <Input data-testid="input-pkg-order" type="number" min={0} value={form.displayOrder} onChange={(e) => setForm((f) => ({ ...f, displayOrder: Number(e.target.value) }))} className="mt-1" />
            </div>
            {formTotal > 0 && Number(form.priceUsd) > 0 && rates.length > 0 && (
              <div className="col-span-2 bg-[#F5F8FA] rounded-xl p-3 border border-[#CBD6E2]">
                <div className="text-xs font-semibold text-[#33475B] mb-2">Per-word cost preview ({formTotal.toLocaleString()} total credits)</div>
                <div className="space-y-1">
                  {rates.map((r) => (
                    <div key={r.id} className="flex justify-between text-xs text-[#516F90]">
                      <span>{r.label}</span>
                      <span className="font-medium text-[#33475B]">
                        {calcPerWord(formTotal, Number(form.priceUsd), r)}
                        <span className="ml-2 text-[#99ACC2]">({wordsPerPackage(formTotal, r)})</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Switch data-testid="switch-pkg-popular" checked={form.isPopular} onCheckedChange={(v) => setForm((f) => ({ ...f, isPopular: v }))} />
              <Label>Mark as Popular</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch data-testid="switch-pkg-active" checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={save} disabled={saving} data-testid="button-save-package"
              style={{ background: "#FF7A59", color: "#fff", border: "none" }}>
              {saving ? "Saving..." : "Save Package"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
