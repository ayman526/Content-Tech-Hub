"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, Layers, FileText, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

interface AssetSummary {
  tms: { id: string; name: string; sourceLang: string; targetLang: string; entries: any[] }[];
  glossaries: { id: string; name: string; sourceLang: string; targetLang: string; terms: any[] }[];
  guides: { id: string; name: string; content: string }[];
}

const ASSET_CATEGORIES = [
  {
    key: "tms" as const,
    label: "Translation Memory",
    description: "Segment-level bilingual archives",
    icon: BookOpen,
    color: "#0091AE",
    href: "/portal/studio/tm",
    countLabel: (n: number) => `${n} TM${n !== 1 ? "s" : ""}`,
    itemLabel: (item: any) => `${item.name} · ${item.entries.length} entries`,
  },
  {
    key: "glossaries" as const,
    label: "Glossaries",
    description: "Term-level bilingual terminology",
    icon: Layers,
    color: "#FF7A59",
    href: "/portal/studio/glossaries",
    countLabel: (n: number) => `${n} glossar${n !== 1 ? "ies" : "y"}`,
    itemLabel: (item: any) => `${item.name} · ${item.terms.length} terms`,
  },
  {
    key: "guides" as const,
    label: "Style Guides",
    description: "Tone, voice, and formatting rules",
    icon: FileText,
    color: "#33475B",
    href: "/portal/studio/style-guides",
    countLabel: (n: number) => `${n} guide${n !== 1 ? "s" : ""}`,
    itemLabel: (item: any) => item.name,
  },
];

export default function StudioAssetsPage() {
  const { data: tms = [], isLoading: tmLoading } = useQuery<any[]>({
    queryKey: ["/api/studio/tm"],
  });
  const { data: glossaries = [], isLoading: glLoading } = useQuery<any[]>({
    queryKey: ["/api/studio/glossaries"],
  });
  const { data: guides = [], isLoading: guideLoading } = useQuery<any[]>({
    queryKey: ["/api/studio/style-guides"],
  });

  const dataMap: Record<string, any[]> = { tms, glossaries, guides };
  const loading = tmLoading || glLoading || guideLoading;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#33475B]">Assets</h1>
        <p className="text-sm text-gray-400 mt-0.5">All your linguistic assets in one place</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {ASSET_CATEGORIES.map((cat) => {
          const items = dataMap[cat.key] ?? [];
          return (
            <Link
              key={cat.key}
              href={cat.href}
              className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-shadow group block"
              data-testid={`asset-card-${cat.key}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: cat.color + "18" }}>
                  <cat.icon className="w-5 h-5" style={{ color: cat.color }} />
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </div>
              <p className="font-semibold text-[#33475B] mb-0.5">{cat.label}</p>
              <p className="text-xs text-gray-400 mb-3">{cat.description}</p>
              {loading ? (
                <Skeleton className="h-4 w-20" />
              ) : (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: cat.color + "15", color: cat.color }}>
                  {cat.countLabel(items.length)}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Recent assets per category */}
      {ASSET_CATEGORIES.map((cat) => {
        const items = (dataMap[cat.key] ?? []).slice(0, 3);
        if (loading || items.length === 0) return null;
        return (
          <div key={cat.key} className="bg-white rounded-2xl border border-gray-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-[#33475B] flex items-center gap-2">
                <cat.icon className="w-4 h-4" style={{ color: cat.color }} />
                {cat.label}
              </h2>
              <Link href={cat.href} className="text-xs font-medium flex items-center gap-1 hover:underline" style={{ color: "#0091AE" }}>
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <ul className="divide-y divide-gray-50">
              {items.map((item: any) => (
                <li key={item.id} className="px-6 py-3 text-sm text-[#33475B]">
                  {cat.itemLabel(item)}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
