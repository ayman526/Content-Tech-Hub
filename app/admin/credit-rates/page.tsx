"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, Save, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CreditRate = {
  id: string;
  workflowType: string;
  creditsPerWord: number;
  label: string;
  description: string | null;
};

const PRICE_PER_1000 = 49;

function calcDisplay(cpw: number) {
  if (!cpw || cpw <= 0) return { wordsPerCredit: "—", wordsPerThousand: "—", dollarsPerWord: "—" };
  const wordsPerCredit = 1 / cpw;
  const wordsPerThousand = Math.round(1000 / cpw);
  const dollarsPerWord = (PRICE_PER_1000 / 1000) * cpw;
  return {
    wordsPerCredit: wordsPerCredit >= 1 ? `${wordsPerCredit.toFixed(2)} words/credit` : `${(1 / wordsPerCredit).toFixed(2)} credits/word`,
    wordsPerThousand: wordsPerThousand.toLocaleString() + " words per 1,000 credits",
    dollarsPerWord: `$${dollarsPerWord.toFixed(5)}/word`,
  };
}

export default function AdminCreditRatesPage() {
  const [rates, setRates] = useState<CreditRate[]>([]);
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/credit-rates");
    const data = await res.json();
    setRates(data);
    const map: Record<string, number> = {};
    for (const r of data) map[r.id] = Number(r.creditsPerWord);
    setEdits(map);
    setDirty({});
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleChange(id: string, val: string) {
    setEdits((e) => ({ ...e, [id]: Number(val) }));
    setDirty((d) => ({ ...d, [id]: true }));
  }

  async function saveRate(rate: CreditRate) {
    setSaving(rate.id);
    await fetch("/api/admin/credit-rates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rate.id, creditsPerWord: edits[rate.id] }),
    });
    setSaving(null);
    setSaved(rate.id);
    setDirty((d) => ({ ...d, [rate.id]: false }));
    setTimeout(() => setSaved(null), 2000);
    load();
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: "#33475B" }}>Credit Rate Configuration</h1>
        <p className="text-sm mt-0.5" style={{ color: "#516F90" }}>
          These rates govern billing for all future jobs. Changing them affects cost calculations for clients immediately.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3 mb-6">
        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-amber-700">
          Rate changes affect all future job billing. Existing jobs are not retroactively adjusted. The platform reference rate is <strong>$49 per 1,000 credits</strong>.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading rates...</div>
      ) : (
        <div className="space-y-4">
          {rates.map((rate) => {
            const current = edits[rate.id] ?? Number(rate.creditsPerWord);
            const display = calcDisplay(current);
            const isDirty = dirty[rate.id];
            return (
              <div key={rate.id} className="bg-white rounded-2xl border border-[#CBD6E2] p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-[#33475B]">{rate.label}</h3>
                    <p className="text-xs text-[#99ACC2] mt-0.5">{rate.description}</p>
                  </div>
                  {isDirty && (
                    <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-medium">Unsaved</span>
                  )}
                  {saved === rate.id && (
                    <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-medium">Saved</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 items-end">
                  <div>
                    <Label className="text-xs text-[#516F90]">Credits per word</Label>
                    <Input
                      data-testid={`input-rate-${rate.workflowType}`}
                      type="number"
                      min={0.0001}
                      step={0.0001}
                      value={current}
                      onChange={(e) => handleChange(rate.id, e.target.value)}
                      className="mt-1 font-mono"
                    />
                  </div>
                  <Button
                    onClick={() => saveRate(rate)}
                    disabled={saving === rate.id || !isDirty}
                    data-testid={`button-save-rate-${rate.workflowType}`}
                    style={isDirty ? { background: "#FF7A59", color: "#fff", border: "none" } : {}}
                    variant={isDirty ? "default" : "outline"}
                  >
                    {saving === rate.id ? <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
                    Save
                  </Button>
                </div>
                <div className="mt-3 pt-3 border-t border-[#F5F8FA] grid grid-cols-3 gap-3">
                  {[
                    { label: "Rate", val: display.wordsPerCredit },
                    { label: "Per 1,000 credits", val: display.wordsPerThousand },
                    { label: "Cost per word", val: display.dollarsPerWord },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <div className="text-xs text-[#99ACC2]">{label}</div>
                      <div className="text-sm font-semibold text-[#33475B] mt-0.5">{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
