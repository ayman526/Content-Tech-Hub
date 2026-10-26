"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, RefreshCw, DollarSign, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type LinguistRate = {
  id: string;
  workflowType: string;
  ratePerWord: number;
  businessCutPct: number;
  label: string;
  description: string | null;
  updatedAt: string;
};

const WORKFLOW_META: Record<string, { color: string; bg: string; badge: string }> = {
  HUMAN_ONLY: { color: "#FF7A59", bg: "#FFF1EC", badge: "Full Translation" },
  AI_HUMAN:   { color: "#0091AE", bg: "#E8F5F8", badge: "AI + Review" },
};

export default function AdminLinguistRatesPage() {
  const [rates, setRates] = useState<LinguistRate[]>([]);
  const [edits, setEdits] = useState<Record<string, { ratePerWord: string; businessCutPct: string; description: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/linguist-rates");
    const data: LinguistRate[] = await res.json();
    setRates(data);
    const map: Record<string, { ratePerWord: string; businessCutPct: string; description: string }> = {};
    for (const r of data) {
      map[r.id] = {
        ratePerWord: Number(r.ratePerWord).toString(),
        businessCutPct: Number(r.businessCutPct).toString(),
        description: r.description ?? "",
      };
    }
    setEdits(map);
    setDirty({});
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleChange(id: string, field: "ratePerWord" | "businessCutPct" | "description", val: string) {
    setEdits((e) => ({ ...e, [id]: { ...e[id], [field]: val } }));
    setDirty((d) => ({ ...d, [id]: true }));
  }

  async function saveRate(rate: LinguistRate) {
    setSaving(rate.id);
    const e = edits[rate.id];
    await fetch(`/api/admin/linguist-rates/${rate.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ratePerWord: Number(e.ratePerWord),
        businessCutPct: Number(e.businessCutPct),
        description: e.description,
      }),
    });
    setSaving(null);
    setSaved(rate.id);
    setDirty((d) => ({ ...d, [rate.id]: false }));
    await load();
    setTimeout(() => setSaved(null), 2000);
  }

  const linguistNet = (ratePerWord: number, cutPct: number) =>
    ratePerWord * (1 - cutPct / 100);

  const businessNet = (ratePerWord: number, cutPct: number) =>
    ratePerWord * (cutPct / 100);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#33475B" }}>Reviewer Rates</h1>
          <p className="text-sm mt-0.5" style={{ color: "#516F90" }}>
            Configure per-word payout rates and platform revenue share. Internal reviewers are exempt.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2 text-xs">
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Internal reviewer note */}
      <div className="mb-6 rounded-xl border border-[#CBD6E2] bg-[#F5F8FA] px-5 py-4 text-sm" style={{ color: "#516F90" }}>
        <strong style={{ color: "#33475B" }}>Internal reviewers</strong> are always paid $0.00/word and the platform takes no cut — they are salaried employees billed outside this system.
      </div>

      {loading ? (
        <div className="text-sm text-center py-10" style={{ color: "#99ACC2" }}>Loading rates…</div>
      ) : rates.length === 0 ? (
        <div className="text-sm text-center py-10" style={{ color: "#99ACC2" }}>No rates configured.</div>
      ) : (
        <div className="space-y-6">
          {rates.map((rate) => {
            const e = edits[rate.id] ?? { ratePerWord: "0", businessCutPct: "10", description: "" };
            const rateNum = Number(e.ratePerWord) || 0;
            const cutNum = Number(e.businessCutPct) || 0;
            const meta = WORKFLOW_META[rate.workflowType] ?? { color: "#33475B", bg: "#EEF1F5", badge: rate.workflowType };
            const isDirty = dirty[rate.id] ?? false;
            const isSaving = saving === rate.id;
            const isSaved = saved === rate.id;

            return (
              <div key={rate.id} className="bg-white rounded-2xl border border-[#CBD6E2] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-[#F5F8FA] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: meta.bg, color: meta.color }}>
                      {meta.badge}
                    </span>
                    <div>
                      <div className="font-semibold text-sm" style={{ color: "#33475B" }}>{rate.label}</div>
                      <div className="text-xs font-mono" style={{ color: "#99ACC2" }}>{rate.workflowType}</div>
                    </div>
                  </div>
                  <div className="text-xs" style={{ color: "#99ACC2" }}>
                    Last updated {new Date(rate.updatedAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Fields */}
                <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold" style={{ color: "#33475B" }}>
                      Rate per Word (USD)
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#99ACC2" }} />
                      <Input
                        data-testid={`input-rate-${rate.id}`}
                        type="number"
                        min="0"
                        step="0.001"
                        className="pl-7 text-sm"
                        value={e.ratePerWord}
                        onChange={(ev) => handleChange(rate.id, "ratePerWord", ev.target.value)}
                      />
                    </div>
                    <p className="text-xs" style={{ color: "#99ACC2" }}>
                      Gross payout per word before platform cut
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold" style={{ color: "#33475B" }}>
                      Platform Revenue Share (%)
                    </Label>
                    <div className="relative">
                      <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#99ACC2" }} />
                      <Input
                        data-testid={`input-cut-${rate.id}`}
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        className="pl-7 text-sm"
                        value={e.businessCutPct}
                        onChange={(ev) => handleChange(rate.id, "businessCutPct", ev.target.value)}
                      />
                    </div>
                    <p className="text-xs" style={{ color: "#99ACC2" }}>
                      Percentage of linguist payout retained by the platform
                    </p>
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-xs font-semibold" style={{ color: "#33475B" }}>Description</Label>
                    <Textarea
                      data-testid={`input-desc-${rate.id}`}
                      className="text-sm resize-none"
                      rows={2}
                      value={e.description}
                      onChange={(ev) => handleChange(rate.id, "description", ev.target.value)}
                    />
                  </div>
                </div>

                {/* Live preview */}
                <div className="px-6 pb-4">
                  <div className="rounded-xl border border-[#CBD6E2] bg-[#F5F8FA] px-5 py-3 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-xs font-medium mb-0.5" style={{ color: "#99ACC2" }}>Gross per word</div>
                      <div className="text-base font-bold" style={{ color: "#33475B" }}>${rateNum.toFixed(4)}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium mb-0.5" style={{ color: "#99ACC2" }}>Linguist net</div>
                      <div className="text-base font-bold" style={{ color: "#00BDA5" }}>${linguistNet(rateNum, cutNum).toFixed(4)}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium mb-0.5" style={{ color: "#99ACC2" }}>Platform share</div>
                      <div className="text-base font-bold" style={{ color: "#FF7A59" }}>${businessNet(rateNum, cutNum).toFixed(4)}</div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 pb-5 flex items-center justify-end gap-3">
                  {isSaved && (
                    <span className="text-xs font-medium" style={{ color: "#00BDA5" }}>Saved</span>
                  )}
                  <Button
                    data-testid={`btn-save-${rate.id}`}
                    size="sm"
                    onClick={() => saveRate(rate)}
                    disabled={!isDirty || isSaving}
                    className="gap-2 text-xs"
                    style={{ background: isDirty ? "#FF7A59" : undefined }}
                  >
                    <Save className="w-3 h-3" />
                    {isSaving ? "Saving…" : "Save Changes"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
