"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  UserCheck,
  Star,
  Globe,
  Award,
  Save,
  Loader2,
  CheckCircle,
  Upload,
  FileText,
  X,
  Sparkles,
  Shield,
  BadgeCheck,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/client";
import { InfoNote } from "@/components/ui/info-tip";

const LANGUAGE_PAIRS = [
  "English → Arabic", "English → French", "English → German",
  "English → Spanish", "English → Portuguese", "English → Japanese",
  "English → Chinese", "English → Korean", "English → Italian",
  "English → Russian", "Arabic → English", "French → English",
  "German → English", "Spanish → English", "Japanese → English",
];

const SPECIALIZATIONS = [
  "Legal", "Medical / Life Sciences", "Technical / Engineering",
  "Financial / Compliance", "Marketing / Transcreation",
  "IT / Software", "AI Training Data", "Academic / Research",
];

const CERT_SUGGESTIONS = [
  "ATA Certified Translator",
  "ISO 17100 Certified",
  "NAATI Credentialed",
  "CIoL Member",
  "ITI Member",
  "Sworn Translator",
  "UN Certified",
];

export default function LinguistProfilePage() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [bio, setBio] = useState("");
  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
  const [hourlyRate, setHourlyRate] = useState("");
  const [certifications, setCertifications] = useState<string[]>([]);
  const [newCert, setNewCert] = useState("");
  const [cvUrl, setCvUrl] = useState<string | null>(null);

  const [cvFile, setCvFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseSuccess, setParseSuccess] = useState(false);

  const [stats, setStats] = useState({ rating: 0, reviewCount: 0, completedJobs: 0, isVerified: false });

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((p) => {
        if (p && p.userId) {
          setBio(p.bio ?? "");
          const pairs = Array.isArray(p.languagePairs)
            ? p.languagePairs.map((lp: any) =>
                typeof lp === "string" ? lp : `${lp.source} → ${lp.target}`
              )
            : [];
          setSelectedLangs(pairs);
          setSelectedSpecs(p.specializations ?? []);
          setHourlyRate(p.hourlyRate ? String(p.hourlyRate) : "");
          setCertifications(p.certifications ?? []);
          setCvUrl(p.cvUrl ?? null);
          setStats({
            rating: Number(p.rating ?? 0),
            reviewCount: p.reviewCount ?? 0,
            completedJobs: p.completedJobs ?? 0,
            isVerified: p.isVerified ?? false,
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function toggleItem(arr: string[], val: string, set: (v: string[]) => void) {
    set(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  }

  async function handleCvUpload(file: File) {
    setCvFile(file);
    setParsing(true);
    setParseSuccess(false);

    const formData = new FormData();
    formData.append("cv", file);

    try {
      const res = await fetch("/api/profile/parse-cv", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        if (data.bio) setBio(data.bio);
        if (data.languagePairs?.length) setSelectedLangs(data.languagePairs);
        if (data.specializations?.length) setSelectedSpecs(data.specializations);
        if (data.hourlyRate) setHourlyRate(String(data.hourlyRate));
        if (data.certifications?.length) setCertifications(data.certifications);
        setParseSuccess(true);
      }
    } catch {
    } finally {
      setParsing(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleCvUpload(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleCvUpload(file);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const pairs = selectedLangs.map((lp) => {
      const [source, target] = lp.split(" → ");
      return { source, target };
    });
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bio,
        languagePairs: pairs,
        specializations: selectedSpecs,
        hourlyRate,
        certifications,
        cvUrl,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function addCert() {
    const c = newCert.trim();
    if (c && !certifications.includes(c)) {
      setCertifications((prev) => [...prev, c]);
    }
    setNewCert("");
  }

  const user = session?.user as any;
  const initials = user?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() ?? "LG";

  const completionItems = [
    { label: "Bio", done: bio.trim().length > 20 },
    { label: "Language pairs", done: selectedLangs.length > 0 },
    { label: "Specializations", done: selectedSpecs.length > 0 },
    { label: "Hourly rate", done: !!hourlyRate },
    { label: "CV uploaded", done: !!cvFile || !!cvUrl },
    { label: "Certifications", done: certifications.length > 0 },
  ];
  const completionPct = Math.round((completionItems.filter((i) => i.done).length / completionItems.length) * 100);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-6 h-6 text-teal animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-5 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-navy to-teal flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-2xl font-bold text-navy">{user?.name ?? "Linguist"}</h1>
            {stats.isVerified && (
              <span className="flex items-center gap-1 text-xs font-medium text-teal bg-teal/10 border border-teal/20 px-2 py-0.5 rounded-full">
                <BadgeCheck className="w-3 h-3" /> Verified
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-2">{user?.email}</p>
          <div className="flex items-center gap-4 flex-wrap">
            {stats.rating > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${s <= Math.round(stats.rating) ? "text-gold fill-gold" : "text-gray-200 fill-gray-200"}`}
                    />
                  ))}
                </div>
                <span className="text-xs font-semibold text-navy">{Number(stats.rating).toFixed(2)}</span>
                <span className="text-xs text-gray-400">({stats.reviewCount} {t("profile.reviews")})</span>
              </div>
            )}
            {stats.completedJobs > 0 && (
              <span className="text-xs text-gray-500">
                <span className="font-semibold text-navy">{stats.completedJobs}</span> {t("profile.jobsCompleted")}
              </span>
            )}
          </div>
        </div>

        {/* Profile completion */}
        <div className="flex-shrink-0 text-right">
          <div className="text-xs text-gray-500 mb-1">{t("profile.profileCompleteness")}</div>
          <div className="flex items-center gap-2">
            <div className="w-28 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${completionPct >= 80 ? "bg-teal" : completionPct >= 50 ? "bg-gold" : "bg-red-400"}`}
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <span className={`text-sm font-bold ${completionPct >= 80 ? "text-teal" : completionPct >= 50 ? "text-gold" : "text-red-500"}`}>
              {completionPct}%
            </span>
          </div>
          <div className="flex flex-wrap gap-1 mt-2 justify-end max-w-[180px]">
            {completionItems.map((item) => (
              <span
                key={item.label}
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${item.done ? "bg-teal/10 text-teal" : "bg-gray-100 text-gray-400"}`}
              >
                {item.done ? "✓ " : ""}{item.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* CV Upload */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-navy flex items-center gap-2 mb-3">
            <Upload className="w-4 h-4" />
            {t("profile.uploadCV")}
            <span className="text-xs font-normal text-gray-400">{t("profile.cvSubtitle")}</span>
          </h2>
          <InfoNote className="mb-4">
            Upload your CV and Cento's AI will automatically extract your language pairs, specializations, certifications, and suggested hourly rate — saving you the manual entry. Supported formats: PDF, Word (.doc/.docx), or plain text. You can always review and adjust the extracted values before saving.
          </InfoNote>

          {!cvFile && !cvUrl ? (
            <div
              className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-navy/30 hover:bg-navy/5 transition-colors cursor-pointer group"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              data-testid="cv-drop-zone"
            >
              <div className="w-12 h-12 bg-navy/5 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:bg-navy/10 transition-colors">
                <FileText className="w-6 h-6 text-navy/50" />
              </div>
              <p className="text-sm font-medium text-gray-700 mb-1">{t("profile.dropCV")}</p>
              <p className="text-xs text-gray-400">{t("profile.cvFormats")}</p>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-teal font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                {t("profile.aiPowered")}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={handleFileSelect}
                data-testid="input-cv-file"
              />
            </div>
          ) : (
            <div className="relative">
              <div className={`flex items-center gap-4 p-4 rounded-2xl border ${parseSuccess ? "border-teal/30 bg-teal/5" : parsing ? "border-gold/30 bg-gold/5" : "border-gray-200 bg-gray-50"}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${parseSuccess ? "bg-teal/10" : "bg-navy/10"}`}>
                  {parsing ? (
                    <Loader2 className="w-5 h-5 text-teal animate-spin" />
                  ) : (
                    <FileText className="w-5 h-5 text-navy" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy truncate">{cvFile?.name ?? "CV uploaded"}</p>
                  {parsing ? (
                    <p className="text-xs text-gold font-medium flex items-center gap-1.5 mt-0.5">
                      <Sparkles className="w-3 h-3" />
                      {t("profile.parsingCV")}
                    </p>
                  ) : parseSuccess ? (
                    <p className="text-xs text-teal font-medium flex items-center gap-1.5 mt-0.5">
                      <CheckCircle className="w-3 h-3" />
                      {t("profile.parsedSuccess")}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-0.5">{cvFile ? `${(cvFile.size / 1024).toFixed(0)} KB` : "Saved CV"}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setCvFile(null); setCvUrl(null); setParseSuccess(false); }}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bio */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-navy flex items-center gap-2 mb-4">
            <UserCheck className="w-4 h-4" />
            {t("profile.professionalProfile")}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t("profile.bio")}</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                placeholder={t("profile.bioPlaceholder")}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none leading-relaxed"
                data-testid="input-bio"
              />
              <p className="text-xs text-gray-400 mt-1">{bio.length} / 500 {t("editor.characters")}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t("profile.hourlyRate")}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    placeholder="e.g. 55"
                    min={10}
                    max={300}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                    data-testid="input-hourly-rate"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t("profile.perWordRate")}</label>
                <div className="px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-500">
                  {hourlyRate
                    ? `~$${(Number(hourlyRate) / 250).toFixed(3)} ${t("profile.perWord")}`
                    : t("profile.setHourlyFirst")}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Language pairs */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-navy flex items-center gap-2 mb-1">
            <Globe className="w-4 h-4" />
            {t("profile.languagePairs")}
          </h2>
          <p className="text-xs text-gray-400 mb-3">{t("profile.languagePairsDesc")}</p>
          <InfoNote className="mb-4">
            The pairs you select here determine which jobs you are eligible to receive. The matching engine filters available jobs against your declared pairs — only jobs whose source → target language combination matches one of your selections will appear in your feed or be offered exclusively to you.
          </InfoNote>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {LANGUAGE_PAIRS.map((lang) => {
              const selected = selectedLangs.includes(lang);
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleItem(selectedLangs, lang, setSelectedLangs)}
                  className={`px-3 py-2.5 rounded-xl text-xs text-left font-medium transition-all border ${
                    selected
                      ? "bg-navy text-white border-navy shadow-sm"
                      : "bg-[#FAFBFC] text-gray-700 border-gray-200 hover:border-navy/40 hover:bg-navy/5"
                  }`}
                  data-testid={`lang-toggle-${lang.replace(/[\s→]/g, "-").toLowerCase()}`}
                >
                  {selected && <span className="mr-1">✓</span>}{lang}
                </button>
              );
            })}
          </div>
          {selectedLangs.length > 0 && (
            <p className="text-xs text-teal font-medium mt-3">{selectedLangs.length} pair{selectedLangs.length !== 1 ? "s" : ""} selected</p>
          )}
        </div>

        {/* Specializations */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-navy flex items-center gap-2 mb-1">
            <Award className="w-4 h-4" />
            {t("profile.specializations")}
          </h2>
          <p className="text-xs text-gray-400 mb-4">{t("profile.specializationsDesc")}</p>
          <div className="flex flex-wrap gap-2">
            {SPECIALIZATIONS.map((spec) => {
              const selected = selectedSpecs.includes(spec);
              return (
                <button
                  key={spec}
                  type="button"
                  onClick={() => toggleItem(selectedSpecs, spec, setSelectedSpecs)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                    selected
                      ? "bg-teal text-navy border-teal shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-teal/50 hover:bg-teal/5"
                  }`}
                  data-testid={`spec-${spec.replace(/[\s/]/g, "-").toLowerCase()}`}
                >
                  {spec}
                </button>
              );
            })}
          </div>
        </div>

        {/* Certifications */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-navy flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4" />
            {t("profile.certifications")}
          </h2>
          <InfoNote className="mb-4">
            Certifications increase your visibility for specialized and high-value jobs. Clients can filter for linguists with specific credentials such as ATA, NAATI, or ISO 17100. Adding verified certifications also contributes to your profile completeness score and may unlock access to Enterprise client jobs.
          </InfoNote>

          {certifications.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {certifications.map((cert) => (
                <div key={cert} className="flex items-center gap-1.5 bg-gold/10 border border-gold/20 text-amber-800 text-xs font-medium px-3 py-1.5 rounded-full">
                  <BadgeCheck className="w-3 h-3 text-gold" />
                  {cert}
                  <button
                    type="button"
                    onClick={() => setCertifications((prev) => prev.filter((c) => c !== cert))}
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 mb-3">
            <input
              value={newCert}
              onChange={(e) => setNewCert(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCert())}
              placeholder={t("profile.certificationPlaceholder")}
              className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-navy/20"
              data-testid="input-certification"
            />
            <Button type="button" variant="outline" onClick={addCert} size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {CERT_SUGGESTIONS.filter((c) => !certifications.includes(c)).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCertifications((prev) => [...prev, c])}
                className="text-xs px-2.5 py-1 rounded-full border border-dashed border-gray-300 text-gray-500 hover:border-gold/50 hover:text-gold hover:bg-gold/5 transition-colors"
              >
                + {c}
              </button>
            ))}
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3 pb-8">
          <Button type="submit" disabled={saving} size="lg" data-testid="btn-save-profile">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : saved ? (
              <CheckCircle className="w-4 h-4 mr-2 text-white" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {saving ? t("profile.savingProfile") : saved ? t("profile.savedProfile") : t("profile.saveProfile")}
          </Button>
          {saved && (
            <span className="text-sm text-teal font-medium flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> {t("profile.profileUpdated")}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
