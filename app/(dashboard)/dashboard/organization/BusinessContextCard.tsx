"use client";

import { useState } from "react";
import { Sparkles, Save, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type BusinessContextValues = {
  websiteUrl: string;
  industry: string;
  companyBio: string;
};

export default function BusinessContextCard({
  initial,
  canEdit,
}: {
  initial: BusinessContextValues;
  canEdit: boolean;
}) {
  const [form, setForm] = useState<BusinessContextValues>(initial);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl: form.websiteUrl,
          industry: form.industry,
          companyBio: form.companyBio,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to save");
      }
      setSavedAt(Date.now());
    } catch (e: any) {
      setError(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const dirty =
    form.websiteUrl !== initial.websiteUrl ||
    form.industry !== initial.industry ||
    form.companyBio !== initial.companyBio;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6" data-testid="card-business-context">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-navy">Business context for AI drafts</h3>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            Cento, our AI translator, uses these details to understand your industry, product,
            and tone of voice. With this context, the first AI draft is far more accurate and
            on-brand — fewer edits for your linguists, faster turnaround, and consistent
            terminology across every project. These details are sent only to the AI model that
            produces your translation drafts; they are never shown to end-readers.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="org-website">Company website</Label>
          <Input
            id="org-website"
            data-testid="input-org-website"
            placeholder="https://www.example.com"
            value={form.websiteUrl}
            onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
            disabled={!canEdit || saving}
          />
          <p className="text-xs text-gray-400">
            Helps the AI ground brand names, product names, and tone in your real positioning.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="org-industry">Industry</Label>
          <Input
            id="org-industry"
            data-testid="input-org-industry"
            placeholder="e.g. SaaS, Pharmaceuticals, Hospitality, Legal services"
            value={form.industry}
            onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
            disabled={!canEdit || saving}
          />
          <p className="text-xs text-gray-400">
            Steers domain terminology — medical, legal, technical, marketing, and so on.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="org-bio">Company bio</Label>
          <Textarea
            id="org-bio"
            data-testid="input-org-bio"
            placeholder="A short description of what your company does, who you serve, and any voice or terminology preferences (e.g. 'formal, B2B, prefer British English spellings')."
            rows={5}
            value={form.companyBio}
            onChange={(e) => setForm((f) => ({ ...f, companyBio: e.target.value }))}
            disabled={!canEdit || saving}
            maxLength={1500}
          />
          <p className="text-xs text-gray-400">
            Up to ~1,500 characters. Mention what you sell, your customers, and any
            tone/style notes you want every draft to respect.
          </p>
        </div>

        {!canEdit && (
          <p className="text-xs text-gray-500 italic">
            Only organization owners and admins can edit this section.
          </p>
        )}

        {error && <p className="text-sm text-red-500" data-testid="text-bizcontext-error">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <Button
            data-testid="btn-save-business-context"
            onClick={handleSave}
            disabled={!canEdit || !dirty || saving}
            style={{ background: "#FF7A59" }}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" /> Save changes
              </>
            )}
          </Button>
          {savedAt && !dirty && !saving && (
            <span className="text-sm text-green-600 inline-flex items-center gap-1" data-testid="text-bizcontext-saved">
              <Check className="w-4 h-4" /> Saved
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
