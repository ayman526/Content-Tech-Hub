"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search, ArrowRight, BookOpen, Cpu, Globe2, FileText,
  HelpCircle, Users, Zap, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Category = {
  id: string; name: string; slug: string; description?: string | null;
  icon?: string | null; color?: string | null;
  _count: { articles: number; faqs: number };
};
type Article = {
  id: string; title: string; slug: string; excerpt?: string | null;
  contentType: string; icon?: string | null; featured: boolean;
  category?: { name: string; slug: string; color?: string | null } | null;
};
type FaqItem = {
  id: string; question: string; answer: string;
  category?: { name: string; slug: string } | null;
};

const CATEGORY_ICONS: Record<string, any> = {
  "by-role": Users,
  "product-guides": BookOpen,
  "ai-llms": Cpu,
  "integrations": Globe2,
  "file-formats": FileText,
  "help-center": HelpCircle,
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

export default function ResourcesHub({
  categories, featuredArticles, featuredFaqs,
}: {
  categories: Category[];
  featuredArticles: Article[];
  featuredFaqs: FaqItem[];
}) {
  const [q, setQ] = useState("");

  const filteredArticles = q
    ? featuredArticles.filter(
        (a) =>
          a.title.toLowerCase().includes(q.toLowerCase()) ||
          (a.excerpt ?? "").toLowerCase().includes(q.toLowerCase())
      )
    : featuredArticles;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="pt-36 pb-20 px-6" style={{ background: "linear-gradient(135deg, #33475B 0%, #0091AE 100%)" }}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold mb-6 uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5" /> Resources Hub
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
            Everything you need to get the most out of Contentech
          </h1>
          <p className="text-lg text-white/75 mb-8 max-w-2xl mx-auto">
            Guides, AI & LLM education, CMS integrations, credits explained, file format support, and role-based help — all in one place.
          </p>
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search guides, FAQs, integrations…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm text-[#33475B] focus:outline-none focus:ring-2 focus:ring-[#FF7A59]/50"
              data-testid="resources-search"
            />
          </div>
        </div>
      </section>

      {/* Category Cards */}
      {categories.length > 0 && !q && (
        <section className="py-16 px-6 bg-[#F5F8FA]">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-[#33475B] mb-8 text-center">Browse by topic</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {categories.map((cat) => {
                const Icon = CATEGORY_ICONS[cat.slug] ?? BookOpen;
                return (
                  <Link
                    key={cat.id}
                    href={`/resources/category/${cat.slug}`}
                    className="group bg-white rounded-2xl border border-[#CBD6E2] p-6 hover:border-[#0091AE] hover:shadow-md transition-all"
                    data-testid={`category-card-${cat.slug}`}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-xl"
                      style={{ background: `${cat.color ?? "#0091AE"}18` }}
                    >
                      {cat.icon ?? <Icon className="w-6 h-6" style={{ color: cat.color ?? "#0091AE" }} />}
                    </div>
                    <h3 className="font-semibold text-[#33475B] mb-1 group-hover:text-[#0091AE] transition-colors">{cat.name}</h3>
                    {cat.description && (
                      <p className="text-sm text-[#516F90] line-clamp-2">{cat.description}</p>
                    )}
                    <p className="text-xs text-[#99ACC2] mt-3">
                      {cat._count.articles} articles · {cat._count.faqs} FAQs
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Featured Articles / Search Results */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-[#33475B]">
              {q ? `Results for "${q}"` : "Featured guides"}
            </h2>
            {!q && (
              <Link href="/resources/category/product-guides" className="text-sm text-[#0091AE] font-medium hover:underline flex items-center gap-1">
                View all guides <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {filteredArticles.length === 0 ? (
            <div className="text-center py-16 text-[#516F90]">
              {q ? `No results found for "${q}".` : "No featured articles yet."}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/resources/${article.slug}`}
                  className="group bg-white rounded-2xl border border-[#CBD6E2] p-5 hover:border-[#0091AE] hover:shadow-md transition-all flex flex-col"
                  data-testid={`article-card-${article.slug}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    {article.icon && <span className="text-xl">{article.icon}</span>}
                    {article.category && (
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: `${article.category.color ?? "#0091AE"}18`,
                          color: article.category.color ?? "#0091AE",
                        }}
                      >
                        {article.category.name}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-[#33475B] mb-2 group-hover:text-[#0091AE] transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  {article.excerpt && (
                    <p className="text-sm text-[#516F90] line-clamp-3 flex-1">{article.excerpt}</p>
                  )}
                  <div className="flex items-center gap-1 mt-4 text-[#0091AE] text-xs font-medium">
                    Read guide <ArrowRight className="w-3 h-3" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Role Quick Links */}
      {!q && (
        <section className="py-16 px-6 bg-[#F5F8FA]">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-[#33475B] mb-3 text-center">Guides by role</h2>
            <p className="text-center text-[#516F90] mb-10 text-sm">Find the right documentation for how you use Contentech</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Customers", desc: "Projects, AI review, credits, delivery", href: "/resources/category/by-role", color: "#FF7A59", icon: "🏢" },
                { label: "Agencies", desc: "Client workspaces, PM, multi-client delivery", href: "/resources/category/by-role", color: "#0091AE", icon: "💼" },
                { label: "Linguists", desc: "Task inbox, review workflow, assets", href: "/resources/category/by-role", color: "#7B61FF", icon: "🌐" },
                { label: "Admins / IT", desc: "Routing, providers, user roles, connectors", href: "/resources/category/by-role", color: "#33475B", icon: "⚙️" },
              ].map((role) => (
                <Link
                  key={role.label}
                  href={role.href}
                  className="bg-white rounded-2xl border border-[#CBD6E2] p-5 hover:border-[#0091AE] hover:shadow-md transition-all"
                  data-testid={`role-card-${role.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="text-2xl mb-3">{role.icon}</div>
                  <h3 className="font-semibold text-[#33475B] mb-1" style={{ color: role.color }}>{role.label}</h3>
                  <p className="text-xs text-[#516F90]">{role.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured FAQs */}
      {!q && featuredFaqs.length > 0 && (
        <section className="py-16 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-[#33475B] mb-3 text-center">Frequently asked</h2>
            <p className="text-center text-[#516F90] mb-8 text-sm">Quick answers to the most common questions</p>
            <FaqAccordion faqs={featuredFaqs} />
            <div className="text-center mt-8">
              <Link href="/resources/category/help-center">
                <Button variant="outline" className="gap-2">
                  <HelpCircle className="w-4 h-4" /> View all FAQs
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Bottom CTA */}
      <section className="py-20 px-6" style={{ background: "linear-gradient(135deg, #FF7A59 0%, #FF5A36 100%)" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Can't find what you're looking for?</h2>
          <p className="text-white/80 mb-8">Our team is here to help. Reach out and we'll get you the answers you need.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/contact-sales">
              <Button className="bg-white font-semibold gap-2" style={{ color: "#FF7A59" }}>
                <Zap className="w-4 h-4" /> Contact Sales
              </Button>
            </Link>
            <Link href="/support">
              <Button variant="outline" className="border-white text-white hover:bg-white/10 gap-2">
                <HelpCircle className="w-4 h-4" /> Support Center
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
