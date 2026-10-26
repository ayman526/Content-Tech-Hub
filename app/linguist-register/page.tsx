"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  Globe2,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/client";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";

const LANGUAGE_OPTIONS = [
  "English → Arabic", "English → French", "English → German",
  "English → Spanish", "English → Portuguese", "English → Japanese",
  "English → Chinese", "English → Korean", "English → Italian",
  "English → Russian", "Arabic → English", "French → English",
  "German → English", "Spanish → English", "Japanese → English",
];

const SPECIALIZATION_OPTIONS = [
  "Legal", "Medical / Life Sciences", "Technical / Engineering",
  "Financial / Compliance", "Marketing / Transcreation",
  "IT / Software", "AI Training Data", "Academic / Research",
];

export default function LinguistRegisterPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    languages: [] as string[],
    specializations: [] as string[],
  });

  function toggleArr(arr: string[], val: string) {
    return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (form.languages.length === 0) {
      setError("Please select at least one language pair.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register-linguist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          languages: form.languages,
          specializations: form.specializations,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Registration failed.");
        setLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        router.push("/login?registered=true");
      } else {
        router.push("/portal");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-80 bg-navy flex-col p-10 justify-between flex-shrink-0">
        <div>
          <Link href="/" className="flex items-center gap-2.5 mb-12">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
              <Globe2 className="w-4 h-4 text-teal" />
            </div>
            <span className="text-white font-bold text-lg">contentech</span>
          </Link>
          <p className="text-teal text-xs font-semibold uppercase tracking-widest mb-3">
            Linguist Portal
          </p>
          <h2 className="text-2xl font-bold text-white mb-6 leading-tight">
            Join 300+ expert linguists on the Contentech network
          </h2>
          <div className="space-y-4 text-sm text-white/60">
            {[
              "Get matched to projects that fit your expertise",
              "Preferred routing for favorite clients",
              "60-minute exclusive window on preferred jobs",
              "Transparent payout every two weeks",
              "Build your profile and rating over time",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-teal flex-shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="text-white/30 text-xs">
          {t("register.alreadyLinguist")}{" "}
          <Link href="/linguist-login" className="text-teal hover:underline">
            {t("register.signIn")}
          </Link>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Globe2 className="w-6 h-6 text-navy" />
            <span className="text-navy font-bold text-lg">contentech</span>
            <span className="text-gray-400 text-sm">· Linguist Portal</span>
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <UserCheck className="w-5 h-5 text-teal" />
              <span className="text-sm font-semibold text-teal">
                Step {step} of 2
              </span>
            </div>
            <h1 className="text-3xl font-bold text-navy">
              {step === 1 ? t("register.title") : t("register.step2")}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {step === 1 ? t("register.subtitle") : t("profile.specializationsDesc")}
            </p>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-8">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? "bg-navy text-white" : "bg-gray-200 text-gray-500"}`}>1</div>
              <span className="text-xs text-gray-500 hidden sm:block">Account</span>
            </div>
            <div className="flex-1 h-px bg-gray-200 max-w-[60px]" />
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? "bg-navy text-white" : "bg-gray-200 text-gray-500"}`}>2</div>
              <span className="text-xs text-gray-500 hidden sm:block">Expertise</span>
            </div>
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={step === 1 ? (e) => { e.preventDefault(); if (form.name && form.email && form.password && form.confirm) { if (form.password !== form.confirm) { setError("Passwords do not match."); return; } setError(""); setStep(2); } } : handleSubmit}>
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("register.fullName")}</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                    placeholder="Your professional name"
                    required
                    data-testid="input-name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("auth.email")}</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                    placeholder="you@example.com"
                    required
                    data-testid="input-email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("auth.password")}</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy pr-10"
                      placeholder="Min. 8 characters"
                      required
                      minLength={8}
                      data-testid="input-password"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                  <input
                    type="password"
                    value={form.confirm}
                    onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                    placeholder="••••••••"
                    required
                    data-testid="input-confirm"
                  />
                </div>
                <Button type="submit" className="w-full mt-2" size="lg" data-testid="btn-next">
                  {t("register.continue")}
                  <ArrowRight className="ms-2 w-4 h-4" />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-navy mb-3">
                    Language Pairs <span className="text-red-500">*</span>
                    <span className="text-gray-400 font-normal ml-1">(select all that apply)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                    {LANGUAGE_OPTIONS.map((lang) => {
                      const selected = form.languages.includes(lang);
                      return (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, languages: toggleArr(p.languages, lang) }))}
                          className={`px-3 py-2 rounded-xl text-xs text-left font-medium transition-colors border ${
                            selected
                              ? "bg-navy text-white border-navy"
                              : "bg-white text-gray-700 border-gray-200 hover:border-navy/40"
                          }`}
                          data-testid={`lang-${lang.replace(/\s/g, "-").toLowerCase()}`}
                        >
                          {selected && "✓ "}{lang}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-navy mb-3">
                    Specializations
                    <span className="text-gray-400 font-normal ml-1">(optional)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SPECIALIZATION_OPTIONS.map((spec) => {
                      const selected = form.specializations.includes(spec);
                      return (
                        <button
                          key={spec}
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, specializations: toggleArr(p.specializations, spec) }))}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                            selected
                              ? "bg-teal text-navy border-teal"
                              : "bg-white text-gray-600 border-gray-200 hover:border-teal/50"
                          }`}
                        >
                          {spec}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                    {t("general.back")}
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading} data-testid="btn-register">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("register.finish")}
                    {!loading && <ArrowRight className="ms-2 w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}
          </form>

          <div className="flex justify-center mt-4">
            <LanguageSwitcher />
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">
            {t("register.alreadyLinguist")}{" "}
            <Link href="/linguist-login" className="text-navy font-semibold hover:underline">
              {t("register.signInPortal")}
            </Link>
          </p>
          <p className="text-center text-xs text-gray-400 mt-2">
            Looking for client access?{" "}
            <Link href="/register" className="text-teal hover:underline">
              Register as a client →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
