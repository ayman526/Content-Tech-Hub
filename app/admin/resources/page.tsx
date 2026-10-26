"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Pencil, Trash2, Eye, EyeOff, Search, ChevronDown, ChevronUp,
  BookOpen, MessageSquare, Tag, Star, StarOff, Save, X, RefreshCw,
  Layers, FileText, HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Category = {
  id: string; name: string; slug: string; description?: string | null;
  icon?: string | null; color?: string | null; sortOrder: number;
  isVisible: boolean; _count: { articles: number; faqs: number };
};
type Article = {
  id: string; title: string; slug: string; excerpt?: string | null;
  contentType: string; audiences: string[]; status: string; featured: boolean;
  sortOrder: number; category?: { name: string; slug: string } | null;
};
type FaqItem = {
  id: string; question: string; answer: string; status: string; featured: boolean;
  audiences: string[]; sortOrder: number; category?: { name: string; slug: string } | null;
};

type Tab = "categories" | "articles" | "faq";

const AUDIENCES = ["CUSTOMER", "AGENCY", "LINGUIST", "ADMIN"];
const CONTENT_TYPES = ["GUIDE", "ROLE_HUB", "CMS_INTEGRATION", "AI_LLM", "FILE_FORMAT", "CREDITS", "FAQ_PAGE"];
const STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"];

function statusBadge(status: string) {
  return status === "PUBLISHED"
    ? "bg-green-100 text-green-700"
    : status === "DRAFT"
    ? "bg-yellow-100 text-yellow-700"
    : "bg-gray-100 text-gray-500";
}

// ─── Category Form ────────────────────────────────────────────────────────────
function CategoryForm({
  initial, categories, onSave, onCancel,
}: {
  initial?: Category | null;
  categories: Category[];
  onSave: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "");
  const [color, setColor] = useState(initial?.color ?? "#0091AE");
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? (categories.length * 10));
  const [isVisible, setIsVisible] = useState(initial?.isVisible ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!initial && name && !slug) {
      setSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  }, [name, initial, slug]);

  async function save() {
    setSaving(true); setError("");
    const method = initial ? "PATCH" : "POST";
    const url = initial ? `/api/admin/resources/categories/${initial.id}` : "/api/admin/resources/categories";
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug, description, icon, color, sortOrder: Number(sortOrder), isVisible }),
    });
    setSaving(false);
    if (res.ok) { onSave(); }
    else { const d = await res.json(); setError(d.error ?? "Save failed"); }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#CBD6E2] p-6 space-y-4">
      <h3 className="font-semibold text-[#33475B]">{initial ? "Edit Category" : "New Category"}</h3>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} data-testid="cat-name" />
        </div>
        <div>
          <Label>Slug *</Label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} data-testid="cat-slug" />
        </div>
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Icon (emoji or name)</Label>
          <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="📚" />
        </div>
        <div>
          <Label>Color</Label>
          <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="#0091AE" />
        </div>
        <div>
          <Label>Sort Order</Label>
          <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={isVisible} onChange={(e) => setIsVisible(e.target.checked)} id="cat-visible" />
        <label htmlFor="cat-visible" className="text-sm text-[#516F90]">Visible on public site</label>
      </div>
      <div className="flex gap-2 pt-2">
        <Button size="sm" onClick={save} disabled={saving} data-testid="btn-save-category">
          {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {saving ? "Saving…" : "Save Category"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

// ─── Article Form ─────────────────────────────────────────────────────────────
function ArticleForm({
  initial, categories, onSave, onCancel,
}: {
  initial?: any;
  categories: Category[];
  onSave: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [contentType, setContentType] = useState(initial?.contentType ?? "GUIDE");
  const [audiences, setAudiences] = useState<string[]>(initial?.audiences ?? []);
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [icon, setIcon] = useState(initial?.icon ?? "");
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [seoTitle, setSeoTitle] = useState(initial?.seoTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(initial?.metaDescription ?? "");
  const [status, setStatus] = useState(initial?.status ?? "DRAFT");
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (!initial && title && !slug) {
      setSlug(title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  }, [title, initial, slug]);

  async function save(newStatus?: string) {
    setSaving(true); setError("");
    const method = initial ? "PATCH" : "POST";
    const url = initial ? `/api/admin/resources/articles/${initial.id}` : "/api/admin/resources/articles";
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title, subtitle, slug, excerpt, body, contentType, audiences,
        categoryId: categoryId || null,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        icon, featured, seoTitle, metaDescription,
        status: newStatus ?? status,
        sortOrder: Number(sortOrder),
      }),
    });
    setSaving(false);
    if (res.ok) { onSave(); }
    else { const d = await res.json(); setError(d.error ?? "Save failed"); }
  }

  function toggleAudience(a: string) {
    setAudiences((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);
  }

  return (
    <div className="bg-white rounded-2xl border border-[#CBD6E2] p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[#33475B]">{initial ? "Edit Article" : "New Article"}</h3>
        <Button size="sm" variant="ghost" onClick={() => setPreview(!preview)}>
          <Eye className="w-3.5 h-3.5 mr-1" /> {preview ? "Edit" : "Preview"}
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {preview ? (
        <div className="prose max-w-none border rounded-xl p-4 bg-gray-50 min-h-[200px]">
          <h2>{title}</h2>
          {excerpt && <p className="text-gray-500 italic">{excerpt}</p>}
          <pre className="whitespace-pre-wrap text-sm">{body}</pre>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} data-testid="art-title" />
            </div>
            <div>
              <Label>Slug *</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} data-testid="art-slug" />
            </div>
          </div>
          <div>
            <Label>Subtitle</Label>
            <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
          </div>
          <div>
            <Label>Excerpt / Summary</Label>
            <Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Body (Markdown supported)</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              className="font-mono text-sm"
              data-testid="art-body"
              placeholder="## Heading&#10;&#10;Paragraph text here...&#10;&#10;- Bullet point&#10;- Another point"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Content Type</Label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                value={contentType} onChange={(e) => setContentType(e.target.value)}
                data-testid="art-content-type"
              >
                {CONTENT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div>
              <Label>Category</Label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">— No category —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Status</Label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                value={status} onChange={(e) => setStatus(e.target.value)}
                data-testid="art-status"
              >
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Audience</Label>
            <div className="flex gap-2 flex-wrap">
              {AUDIENCES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAudience(a)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                    audiences.includes(a)
                      ? "border-teal-500 bg-teal-50 text-teal-700"
                      : "border-gray-200 text-gray-500 hover:border-gray-400"
                  )}
                  data-testid={`audience-${a}`}
                >{a}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Icon (emoji)</Label>
              <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="📖" />
            </div>
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="ai, routing, guide" />
            </div>
            <div>
              <Label>Sort Order</Label>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>SEO Title</Label>
              <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
            </div>
            <div>
              <Label>Meta Description</Label>
              <Input value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} id="art-featured" />
              <label htmlFor="art-featured" className="text-sm text-[#516F90]">Featured</label>
            </div>
          </div>
        </>
      )}

      <div className="flex gap-2 pt-2 flex-wrap">
        <Button size="sm" onClick={() => save("DRAFT")} disabled={saving} variant="outline">
          <Save className="w-3.5 h-3.5" /> Save Draft
        </Button>
        <Button size="sm" onClick={() => save("PUBLISHED")} disabled={saving} data-testid="btn-publish">
          {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
          Publish
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}><X className="w-3.5 h-3.5" /> Cancel</Button>
      </div>
    </div>
  );
}

// ─── FAQ Form ─────────────────────────────────────────────────────────────────
function FaqForm({
  initial, categories, onSave, onCancel,
}: {
  initial?: FaqItem | null;
  categories: Category[];
  onSave: () => void;
  onCancel: () => void;
}) {
  const [question, setQuestion] = useState(initial?.question ?? "");
  const [answer, setAnswer] = useState(initial?.answer ?? "");
  const [categoryId, setCategoryId] = useState((initial as any)?.categoryId ?? "");
  const [audiences, setAudiences] = useState<string[]>(initial?.audiences ?? []);
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [status, setStatus] = useState(initial?.status ?? "PUBLISHED");
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleAudience(a: string) {
    setAudiences((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);
  }

  async function save() {
    setSaving(true); setError("");
    const method = initial ? "PATCH" : "POST";
    const url = initial ? `/api/admin/resources/faq/${initial.id}` : "/api/admin/resources/faq";
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, answer, categoryId: categoryId || null, audiences, featured, status, sortOrder: Number(sortOrder) }),
    });
    setSaving(false);
    if (res.ok) { onSave(); }
    else { const d = await res.json(); setError(d.error ?? "Save failed"); }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#CBD6E2] p-6 space-y-4">
      <h3 className="font-semibold text-[#33475B]">{initial ? "Edit FAQ" : "New FAQ Item"}</h3>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <Label>Question *</Label>
        <Input value={question} onChange={(e) => setQuestion(e.target.value)} data-testid="faq-question" />
      </div>
      <div>
        <Label>Answer *</Label>
        <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={4} data-testid="faq-answer" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Category</Label>
          <select
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">— None —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <Label>Status</Label>
          <select
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            value={status} onChange={(e) => setStatus(e.target.value)}
          >
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>
        <div>
          <Label>Sort Order</Label>
          <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
        </div>
      </div>
      <div>
        <Label className="mb-2 block">Audience</Label>
        <div className="flex gap-2 flex-wrap">
          {AUDIENCES.map((a) => (
            <button key={a} type="button" onClick={() => toggleAudience(a)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                audiences.includes(a) ? "border-teal-500 bg-teal-50 text-teal-700" : "border-gray-200 text-gray-500"
              )}
            >{a}</button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} id="faq-featured" />
        <label htmlFor="faq-featured" className="text-sm text-[#516F90]">Featured on hub</label>
      </div>
      <div className="flex gap-2 pt-2">
        <Button size="sm" onClick={save} disabled={saving} data-testid="btn-save-faq">
          {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {saving ? "Saving…" : "Save FAQ"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}><X className="w-3.5 h-3.5" /> Cancel</Button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminResourcesPage() {
  const [tab, setTab] = useState<Tab>("articles");
  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [editingCat, setEditingCat] = useState<Category | null | "new">(null);
  const [editingArticle, setEditingArticle] = useState<any | null | "new">(null);
  const [editingFaq, setEditingFaq] = useState<FaqItem | null | "new">(null);

  // Filters
  const [artQ, setArtQ] = useState("");
  const [artStatus, setArtStatus] = useState("");
  const [artCatFilter, setArtCatFilter] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [cats, arts, faqsData] = await Promise.all([
      fetch("/api/admin/resources/categories").then((r) => r.json()),
      fetch("/api/admin/resources/articles").then((r) => r.json()),
      fetch("/api/admin/resources/faq").then((r) => r.json()),
    ]);
    setCategories(Array.isArray(cats) ? cats : []);
    setArticles(Array.isArray(arts) ? arts : []);
    setFaqs(Array.isArray(faqsData) ? faqsData : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function deleteCategory(id: string) {
    if (!confirm("Delete this category? Articles in it will be uncategorized.")) return;
    await fetch(`/api/admin/resources/categories/${id}`, { method: "DELETE" });
    fetchAll();
  }
  async function deleteArticle(id: string) {
    if (!confirm("Delete this article permanently?")) return;
    await fetch(`/api/admin/resources/articles/${id}`, { method: "DELETE" });
    fetchAll();
  }
  async function deleteFaq(id: string) {
    if (!confirm("Delete this FAQ item?")) return;
    await fetch(`/api/admin/resources/faq/${id}`, { method: "DELETE" });
    fetchAll();
  }
  async function toggleArticleStatus(article: Article) {
    const newStatus = article.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    await fetch(`/api/admin/resources/articles/${article.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchAll();
  }
  async function toggleFaqStatus(faq: FaqItem) {
    const newStatus = faq.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    await fetch(`/api/admin/resources/faq/${faq.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchAll();
  }
  async function loadArticleForEdit(article: Article) {
    const res = await fetch(`/api/admin/resources/articles/${article.id}`);
    const full = await res.json();
    setEditingArticle(full);
    setTab("articles");
  }

  const filteredArticles = articles.filter((a) => {
    if (artStatus && a.status !== artStatus) return false;
    if (artCatFilter && a.category?.slug !== artCatFilter) return false;
    if (artQ && !a.title.toLowerCase().includes(artQ.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#33475B]">Resources CMS</h1>
          <p className="text-sm text-[#516F90] mt-1">Manage categories, articles, guides, and FAQ items for the public Resources hub.</p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchAll} data-testid="btn-refresh-resources">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Tag, label: "Categories", value: categories.length, color: "text-violet-600 bg-violet-50" },
          { icon: FileText, label: "Articles", value: articles.length, color: "text-teal-600 bg-teal-50" },
          { icon: HelpCircle, label: "FAQ Items", value: faqs.length, color: "text-orange-600 bg-orange-50" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-[#CBD6E2] p-4 flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", color)}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-[#33475B]">{value}</p>
              <p className="text-xs text-[#516F90]">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F5F8FA] rounded-xl p-1 w-fit border border-[#CBD6E2]">
        {([
          { id: "articles", label: "Articles & Guides", icon: FileText },
          { id: "categories", label: "Categories", icon: Tag },
          { id: "faq", label: "FAQ Items", icon: HelpCircle },
        ] as { id: Tab; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setTab(id); setEditingCat(null); setEditingArticle(null); setEditingFaq(null); }}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              tab === id ? "bg-white shadow-sm text-[#33475B] border border-[#CBD6E2]" : "text-[#516F90] hover:text-[#33475B]"
            )}
            data-testid={`tab-${id}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="w-5 h-5 animate-spin text-[#0091AE]" />
        </div>
      ) : (
        <>
          {/* ── ARTICLES TAB ── */}
          {tab === "articles" && (
            <div className="space-y-4">
              {editingArticle ? (
                <ArticleForm
                  initial={editingArticle === "new" ? null : editingArticle}
                  categories={categories}
                  onSave={() => { setEditingArticle(null); fetchAll(); }}
                  onCancel={() => setEditingArticle(null)}
                />
              ) : (
                <>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[180px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <Input
                        className="pl-9" placeholder="Search articles…"
                        value={artQ} onChange={(e) => setArtQ(e.target.value)}
                        data-testid="search-articles"
                      />
                    </div>
                    <select
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                      value={artStatus} onChange={(e) => setArtStatus(e.target.value)}
                      data-testid="filter-status"
                    >
                      <option value="">All statuses</option>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                      value={artCatFilter} onChange={(e) => setArtCatFilter(e.target.value)}
                    >
                      <option value="">All categories</option>
                      {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
                    </select>
                    <Button size="sm" onClick={() => setEditingArticle("new")} data-testid="btn-new-article">
                      <Plus className="w-3.5 h-3.5" /> New Article
                    </Button>
                  </div>

                  <div className="bg-white rounded-2xl border border-[#CBD6E2] overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-[#F5F8FA] border-b border-[#CBD6E2]">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#516F90] uppercase tracking-wide">Title</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#516F90] uppercase tracking-wide">Category</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#516F90] uppercase tracking-wide">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#516F90] uppercase tracking-wide">Audiences</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#516F90] uppercase tracking-wide">Status</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-[#516F90] uppercase tracking-wide">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredArticles.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                              No articles yet — click New Article to create one.
                            </td>
                          </tr>
                        )}
                        {filteredArticles.map((a) => (
                          <tr key={a.id} className="border-b border-[#F5F8FA] hover:bg-[#F5F8FA] transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {a.featured && <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
                                <div>
                                  <p className="font-medium text-[#33475B] truncate max-w-[220px]">{a.title}</p>
                                  <p className="text-[11px] text-gray-400">/resources/{a.slug}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-[#516F90]">{a.category?.name ?? "—"}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-500">{a.contentType.replace(/_/g, " ")}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {a.audiences.map((aud) => (
                                  <span key={aud} className="px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-600">{aud}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium", statusBadge(a.status))}>
                                {a.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => toggleArticleStatus(a)}
                                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                                  title={a.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                                  data-testid={`toggle-article-${a.id}`}
                                >
                                  {a.status === "PUBLISHED" ? <EyeOff className="w-3.5 h-3.5 text-gray-400" /> : <Eye className="w-3.5 h-3.5 text-teal-500" />}
                                </button>
                                <button
                                  onClick={() => loadArticleForEdit(a)}
                                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                                  data-testid={`edit-article-${a.id}`}
                                >
                                  <Pencil className="w-3.5 h-3.5 text-[#516F90]" />
                                </button>
                                <button
                                  onClick={() => deleteArticle(a.id)}
                                  className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                  data-testid={`delete-article-${a.id}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── CATEGORIES TAB ── */}
          {tab === "categories" && (
            <div className="space-y-4">
              {editingCat ? (
                <CategoryForm
                  initial={editingCat === "new" ? null : editingCat}
                  categories={categories}
                  onSave={() => { setEditingCat(null); fetchAll(); }}
                  onCancel={() => setEditingCat(null)}
                />
              ) : (
                <>
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => setEditingCat("new")} data-testid="btn-new-category">
                      <Plus className="w-3.5 h-3.5" /> New Category
                    </Button>
                  </div>
                  <div className="grid gap-3">
                    {categories.length === 0 && (
                      <div className="bg-white rounded-2xl border border-[#CBD6E2] p-10 text-center text-sm text-gray-400">
                        No categories yet.
                      </div>
                    )}
                    {categories.map((cat) => (
                      <div key={cat.id} className="bg-white rounded-2xl border border-[#CBD6E2] p-4 flex items-center gap-4">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                          style={{ background: `${cat.color}20` }}
                        >
                          {cat.icon || "📂"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-[#33475B]">{cat.name}</p>
                            {!cat.isVisible && <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded">Hidden</span>}
                          </div>
                          <p className="text-xs text-[#516F90] truncate">{cat.description ?? "/"}{cat.slug}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {cat._count.articles} articles · {cat._count.faqs} FAQs
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => setEditingCat(cat)} className="p-1.5 rounded-lg hover:bg-gray-100" data-testid={`edit-cat-${cat.id}`}>
                            <Pencil className="w-3.5 h-3.5 text-[#516F90]" />
                          </button>
                          <button onClick={() => deleteCategory(cat.id)} className="p-1.5 rounded-lg hover:bg-red-50" data-testid={`delete-cat-${cat.id}`}>
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── FAQ TAB ── */}
          {tab === "faq" && (
            <div className="space-y-4">
              {editingFaq ? (
                <FaqForm
                  initial={editingFaq === "new" ? null : editingFaq}
                  categories={categories}
                  onSave={() => { setEditingFaq(null); fetchAll(); }}
                  onCancel={() => setEditingFaq(null)}
                />
              ) : (
                <>
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => setEditingFaq("new")} data-testid="btn-new-faq">
                      <Plus className="w-3.5 h-3.5" /> New FAQ
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {faqs.length === 0 && (
                      <div className="bg-white rounded-2xl border border-[#CBD6E2] p-10 text-center text-sm text-gray-400">
                        No FAQ items yet.
                      </div>
                    )}
                    {faqs.map((faq) => (
                      <div key={faq.id} className="bg-white rounded-2xl border border-[#CBD6E2] p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium", statusBadge(faq.status))}>
                                {faq.status}
                              </span>
                              {faq.featured && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                              {faq.category && <span className="text-[11px] text-gray-400">{faq.category.name}</span>}
                            </div>
                            <p className="font-medium text-[#33475B] text-sm">{faq.question}</p>
                            <p className="text-xs text-[#516F90] mt-1 line-clamp-2">{faq.answer}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => toggleFaqStatus(faq)} className="p-1.5 rounded-lg hover:bg-gray-100" data-testid={`toggle-faq-${faq.id}`}>
                              {faq.status === "PUBLISHED" ? <EyeOff className="w-3.5 h-3.5 text-gray-400" /> : <Eye className="w-3.5 h-3.5 text-teal-500" />}
                            </button>
                            <button onClick={() => setEditingFaq(faq)} className="p-1.5 rounded-lg hover:bg-gray-100" data-testid={`edit-faq-${faq.id}`}>
                              <Pencil className="w-3.5 h-3.5 text-[#516F90]" />
                            </button>
                            <button onClick={() => deleteFaq(faq.id)} className="p-1.5 rounded-lg hover:bg-red-50" data-testid={`delete-faq-${faq.id}`}>
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
