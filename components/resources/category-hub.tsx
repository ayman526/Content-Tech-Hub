"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Search, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

type Category = {
  id: string; name: string; slug: string; description?: string | null;
  icon?: string | null; color?: string | null;
  _count: { articles: number; faqs: number };
};
type Article = {
  id: string; title: string; slug: string; excerpt?: string | null;
  contentType: string; icon?: string | null; audiences: string[];
};
type FaqItem = { id: string; question: string; answer: string };

const CONTENT_TYPE_LABELS: Record<string, string> = {
  GUIDE: "Guide",
  ROLE_HUB: "Role Hub",
  CMS_INTEGRATION: "CMS Integration",
  AI_LLM: "AI & LLM",
  FILE_FORMAT: "File Format",
  CREDITS: "Credits",
  FAQ_PAGE: "FAQ",
};

function FaqAccordion({ faqs }: { faqs: FaqItem[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden">
      {faqs.map((faq) => (
        <div key={faq.id}>
          <button
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
            onClick={() => setOpen(open === faq.id ? null : faq.id)}
            data-testid={`faq-toggle-${faq.id}`}
          >
            <span className="font-medium text-[#33475B] text-sm pr-4">{faq.question}</span>
            {open === faq.id
              ? <ChevronUp className="w-4 h-4 text-[#0091AE] shrink-0" />
              : <ChevronDown className="w-4 h-4 text-[#99ACC2] shrink-0" />}
          </button>
          {open === faq.id && (
            <div className="px-5 pb-4 text-sm text-[#516F90] leading-relaxed">{faq.answer}</div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function CategoryHub({
  category, articles, faqs,
}: {
  category: Category;
  articles: Article[];
  faqs: FaqItem[];
}) {
  const [q, setQ] = useState("");
  const [audienceFilter, setAudienceFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const allAudiences = Array.from(new Set(articles.flatMap((a) => a.audiences)));
  const allTypes = Array.from(new Set(articles.map((a) => a.contentType)));

  const filtered = articles.filter((a) => {
    if (q && !a.title.toLowerCase().includes(q.toLowerCase()) && !(a.excerpt ?? "").toLowerCase().includes(q.toLowerCase())) return false;
    if (audienceFilter && !a.audiences.includes(audienceFilter)) return false;
    if (typeFilter && a.contentType !== typeFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-white pt-24">
      {/* Top bar breadcrumb */}
      <div className="border-b border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-2 text-sm text-[#516F90]">
          <Link href="/resources" className="hover:text-[#0091AE] transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Resources
          </Link>
          <span>/</span>
          <span className="text-[#33475B] font-medium">{category.name}</span>
        </div>
      </div>

      {/* Category hero */}
      <section className="py-14 px-6 bg-[#F5F8FA] border-b border-[#CBD6E2]">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
              style={{ background: `${category.color ?? "#0091AE"}18` }}
            >
              {category.icon ?? <BookOpen className="w-7 h-7" style={{ color: category.color ?? "#0091AE" }} />}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#33475B]">{category.name}</h1>
              {category.description && (
                <p className="text-[#516F90] mt-1 text-sm">{category.description}</p>
              )}
            </div>
          </div>
          <p className="text-sm text-[#99ACC2]">
            {category._count.articles} articles · {category._count.faqs} FAQ items
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Filters */}
        {articles.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-8 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search articles in this category…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0091AE]/30"
                data-testid="category-search"
              />
            </div>
            {allAudiences.length > 1 && (
              <select
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none"
                value={audienceFilter} onChange={(e) => setAudienceFilter(e.target.value)}
                data-testid="filter-audience"
              >
                <option value="">All audiences</option>
                {allAudiences.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            )}
            {allTypes.length > 1 && (
              <select
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none"
                value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                data-testid="filter-type"
              >
                <option value="">All types</option>
                {allTypes.map((t) => <option key={t} value={t}>{CONTENT_TYPE_LABELS[t] ?? t}</option>)}
              </select>
            )}
          </div>
        )}

        {/* Articles */}
        {articles.length === 0 ? (
          <div className="text-center py-20 text-[#516F90]">
            <BookOpen className="w-10 h-10 text-gray-200 mx-auto mb-4" />
            <p className="text-sm">No articles in this category yet.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[#516F90] text-sm">No results match your filters.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
            {filtered.map((article) => (
              <Link
                key={article.id}
                href={`/resources/${article.slug}`}
                className="group bg-white rounded-2xl border border-[#CBD6E2] p-5 hover:border-[#0091AE] hover:shadow-md transition-all flex flex-col"
                data-testid={`article-card-${article.slug}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  {article.icon && <span className="text-xl">{article.icon}</span>}
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: `${category.color ?? "#0091AE"}18`, color: category.color ?? "#0091AE" }}
                  >
                    {CONTENT_TYPE_LABELS[article.contentType] ?? article.contentType}
                  </span>
                </div>
                <h3 className="font-semibold text-[#33475B] mb-2 group-hover:text-[#0091AE] transition-colors line-clamp-2">{article.title}</h3>
                {article.excerpt && (
                  <p className="text-sm text-[#516F90] line-clamp-3 flex-1">{article.excerpt}</p>
                )}
                {article.audiences.length > 0 && (
                  <div className="flex gap-1 mt-3 flex-wrap">
                    {article.audiences.map((aud) => (
                      <span key={aud} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{aud}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-1 mt-4 text-[#0091AE] text-xs font-medium">
                  Read guide <ArrowRight className="w-3 h-3" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* FAQs */}
        {faqs.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-[#33475B] mb-6">Frequently asked questions</h2>
            <FaqAccordion faqs={faqs} />
          </div>
        )}

        {/* Back link */}
        <div className="border-t border-gray-100 pt-8 mt-12">
          <Link href="/resources" className="flex items-center gap-2 text-sm text-[#0091AE] font-medium hover:underline w-fit">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Resources
          </Link>
        </div>
      </div>
    </div>
  );
}
