"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Wand2, Globe, BookOpen, Layers, FileText, Users, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const FEATURES = [
  {
    icon: Users,
    title: "Client Management",
    description: "Organize all your translation clients in one place — contact info, linked jobs, and asset assignments.",
  },
  {
    icon: Globe,
    title: "Job Workspace",
    description: "Create and manage jobs with source/target languages, deadlines, and real-time status tracking.",
  },
  {
    icon: Wand2,
    title: "AI-Assisted Translation",
    description: "Generate AI drafts for your translation segments using Cento — your built-in AI translation partner.",
  },
  {
    icon: BookOpen,
    title: "Translation Memory",
    description: "Reuse previously translated segments automatically to save time and ensure consistency.",
  },
  {
    icon: Layers,
    title: "Glossaries",
    description: "Define terminology once, enforce it everywhere — across jobs, clients, and language pairs.",
  },
  {
    icon: FileText,
    title: "Style Guides",
    description: "Attach writing rules and tone instructions to any client or job for consistent quality delivery.",
  },
];

export default function StudioPromoClient() {
  const router = useRouter();
  const { toast } = useToast();

  const subscribeMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/studio/subscribe", { action: "subscribe" }),
    onSuccess: () => {
      toast({ title: "Welcome to Creator Studio", description: "Your workspace is ready." });
      router.refresh();
      router.push("/portal/studio/overview");
    },
    onError: () => {
      toast({ title: "Something went wrong", description: "Could not activate Studio.", variant: "destructive" });
    },
  });

  return (
    <div className="min-h-full bg-[#F5F8FA]">
      {/* Hero */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
            style={{ background: "#FF7A5915", color: "#FF7A59" }}>
            <Wand2 className="w-3.5 h-3.5" />
            Creator Studio
          </div>
          <h1 className="text-4xl font-bold text-[#33475B] mb-4 leading-tight">
            Your own Translation Management System
          </h1>
          <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto leading-relaxed">
            Run your freelance translation business like a studio. Manage clients, jobs, and assets — all from within Contentech.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="gap-2 font-semibold text-white"
              style={{ background: "#FF7A59" }}
              onClick={() => subscribeMutation.mutate()}
              disabled={subscribeMutation.isPending}
              data-testid="btn-activate-studio"
            >
              {subscribeMutation.isPending ? "Activating..." : "Activate Studio"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-4">No payment required during beta.</p>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-4xl mx-auto px-6 py-14">
        <h2 className="text-xl font-bold text-[#33475B] text-center mb-10">Everything a professional Linguist needs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "#0091AE15" }}>
                <f.icon className="w-5 h-5" style={{ color: "#0091AE" }} />
              </div>
              <h3 className="font-semibold text-[#33475B] mb-1.5">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>

        {/* Checklist */}
        <div className="mt-14 bg-white rounded-2xl border border-gray-100 p-8">
          <h2 className="text-lg font-bold text-[#33475B] mb-6">What you get with Studio</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              "Unlimited clients",
              "Unlimited translation jobs",
              "AI-assisted drafts with Cento",
              "Translation memory per language pair",
              "Glossary management",
              "Style guide storage",
              "Activity log and audit trail",
              "File upload and segment management",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#0091AE" }} />
                <span className="text-sm text-gray-600">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
