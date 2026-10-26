"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn, getSession } from "next-auth/react";
import {
  Globe2,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  CheckCircle,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/client";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";

const BENEFITS = [
  "Get matched to projects that fit your expertise",
  "Preferred routing for favourite clients",
  "60-minute exclusive window on preferred jobs",
  "Transparent payout every two weeks",
  "Build your profile and rating over time",
];

export default function LinguistLoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      if (result.error === "CallbackRouteError") {
        setError("The service is temporarily unavailable. Please try again in a moment.");
      } else {
        setError(t("auth.invalidCredentials"));
      }
      return;
    }

    const session = await getSession();
    const role = (session?.user as any)?.role;

    if (role === "CLIENT") {
      setError("This portal is for linguists only. Please sign in at the client portal.");
      return;
    }

    window.location.href = "/portal";
  }

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex">
      {/* Left panel — navy sidebar */}
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
            Welcome back to the Contentech linguist network
          </h2>
          <div className="space-y-4 text-sm text-white/60">
            {BENEFITS.map((item) => (
              <div key={item} className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-teal flex-shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="text-white/30 text-xs">
          {t("register.noAccount")}{" "}
          <Link href="/linguist-register" className="text-teal hover:underline">
            {t("register.applyNow")}
          </Link>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Globe2 className="w-6 h-6 text-navy" />
            <span className="text-navy font-bold text-lg">contentech</span>
            <span className="text-gray-400 text-sm">· Linguist Portal</span>
          </div>

          <div className="flex justify-end mb-6">
            <LanguageSwitcher />
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <UserCheck className="w-5 h-5 text-teal" />
              <span className="text-sm font-semibold text-teal uppercase tracking-wide">
                Linguist Portal
              </span>
            </div>
            <h1 className="text-3xl font-bold text-navy">{t("auth.signInTitle")}</h1>
            <p className="text-gray-500 text-sm mt-1">{t("auth.signInSubtitleLinguist")}</p>
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700" data-testid="error-message">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t("auth.email")}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition-colors"
                placeholder="you@example.com"
                required
                data-testid="input-email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t("auth.password")}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition-colors pe-10"
                  placeholder="••••••••"
                  required
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded" />
                <span className="text-gray-600">{t("auth.rememberMe")}</span>
              </label>
              <Link href="/forgot-password" className="text-teal hover:underline font-medium">
                {t("auth.forgotPassword")}
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading}
              data-testid="btn-login"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {t("auth.signIn")}
                  <ArrowRight className="ms-2 w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">
              {t("register.noAccount")}{" "}
              <Link href="/linguist-register" className="text-navy font-semibold hover:underline">
                {t("register.applyAsLinguist")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
