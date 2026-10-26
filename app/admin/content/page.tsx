"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Save, Plus, Trash2, RefreshCw, ChevronUp, ChevronDown,
  Globe2, AlertCircle, Search, Eye, EyeOff,
  Radio, Clock, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type Lang = "en" | "ar";
type BilingualValue<T> = { en: T; ar: T | null };

async function patchConfig(key: string, value: unknown) {
  await fetch("/api/admin/site-config", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  });
}

async function patchPageMeta(data: object) {
  await fetch("/api/admin/page-meta", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

function LangToggle({ active, onChange }: { active: Lang; onChange: (l: Lang) => void }) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl border border-[#CBD6E2] bg-[#F5F8FA] w-fit">
      {(["en", "ar"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          className={cn(
            "px-4 py-1.5 text-sm font-semibold rounded-lg transition-all",
            active === l
              ? "bg-white text-[#33475B] shadow-sm border border-[#CBD6E2]"
              : "text-[#99ACC2] hover:text-[#516F90]"
          )}
          data-testid={`toggle-lang-${l}`}
        >
          {l === "en" ? "English" : "العربية"}
        </button>
      ))}
    </div>
  );
}

function EmptyArWarning() {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
      style={{ background: "#FFF8EC", border: "1px solid #FFD166", color: "#B76E00" }}>
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
      AR content empty — site falls back to EN
    </div>
  );
}

function SaveBtn({ onClick, saving, saved }: { onClick: () => void; saving: boolean; saved: boolean }) {
  return (
    <Button onClick={onClick} disabled={saving}
      style={{ background: "#FF7A59", color: "#fff", border: "none" }} size="sm">
      {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
      {saved ? "Saved" : "Save"}
    </Button>
  );
}

export default function AdminContentPage() {
  const [rawConfigs, setRawConfigs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [activeLang, setActiveLang] = useState<Lang>("en");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  // SEO tab state
  const [pageMetas, setPageMetas] = useState<Record<string, any>>({});
  const [seoSaving, setSeoSaving] = useState<string | null>(null);
  const [seoSaved, setSeoSaved] = useState<string | null>(null);

  // ChangeLog tab state
  const [changelog, setChangelog] = useState<any[]>([]);
  const [changelogLoading, setChangelogLoading] = useState(false);

  // Publish state
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [cfgRes, metaRes] = await Promise.all([
      fetch("/api/admin/site-config"),
      fetch("/api/admin/page-meta"),
    ]);
    const cfgData = await cfgRes.json();
    const metaData = await metaRes.json();
    setRawConfigs(cfgData);
    setPageMetas(metaData);
    setLoading(false);
  }, []);

  const loadChangelog = useCallback(async () => {
    setChangelogLoading(true);
    const res = await fetch("/api/admin/changelog?limit=50");
    const data = await res.json();
    setChangelog(Array.isArray(data) ? data : []);
    setChangelogLoading(false);
  }, []);

  async function publish() {
    setPublishing(true);
    await fetch("/api/admin/revalidate", { method: "POST" });
    setPublishing(false);
    setPublished(true);
    setTimeout(() => setPublished(false), 3000);
  }

  useEffect(() => { load(); }, [load]);

  function getLocalized<T>(key: string, fallback: T): T {
    const val = rawConfigs[key];
    if (!val) return fallback;
    if (val && typeof val === "object" && ("en" in val || "ar" in val)) {
      return (val[activeLang] ?? val["en"] ?? fallback) as T;
    }
    return (val ?? fallback) as T;
  }

  function hasArContent(key: string): boolean {
    const val = rawConfigs[key];
    if (!val || typeof val !== "object") return false;
    const ar = val["ar"];
    if (ar === null || ar === undefined) return false;
    if (typeof ar === "object" && !Array.isArray(ar) && Object.keys(ar).length === 0) return false;
    if (Array.isArray(ar) && ar.length === 0) return false;
    return true;
  }

  async function save(key: string, value: unknown) {
    setSavingKey(key);
    const existing = rawConfigs[key];
    let bilingualValue: BilingualValue<unknown>;
    if (existing && typeof existing === "object" && ("en" in existing || "ar" in existing)) {
      bilingualValue = { en: existing.en, ar: existing.ar ?? null, [activeLang]: value } as any;
    } else {
      bilingualValue = { en: activeLang === "en" ? value : existing, ar: activeLang === "ar" ? value : null };
    }
    await patchConfig(key, bilingualValue);
    setRawConfigs((prev) => ({ ...prev, [key]: bilingualValue }));
    setSavingKey(null);
    setSavedKey(key);
    setTimeout(() => setSavedKey(null), 2000);
  }

  async function saveRaw(key: string, value: unknown) {
    setSavingKey(key);
    await patchConfig(key, value);
    setRawConfigs((prev) => ({ ...prev, [key]: value }));
    setSavingKey(null);
    setSavedKey(key);
    setTimeout(() => setSavedKey(null), 2000);
  }

  async function saveSeoMeta(pageKey: string, locale: Lang, data: object) {
    const id = `${pageKey}-${locale}`;
    setSeoSaving(id);
    await patchPageMeta({ pageKey, locale, ...data });
    setPageMetas((prev) => ({
      ...prev,
      [pageKey]: { ...(prev[pageKey] ?? {}), [locale]: { ...(prev[pageKey]?.[locale] ?? {}), ...data } },
    }));
    setSeoSaving(null);
    setSeoSaved(id);
    setTimeout(() => setSeoSaved(null), 2000);
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Loading content...</div>;

  const hero = getLocalized("hero", { badge: "", headline: "", subheadline: "", ctaPrimary: { text: "", href: "" }, ctaSecondary: { text: "", href: "" } });
  const stats = getLocalized("stats", []);
  const valueProps = getLocalized("value_props", []);
  const faq = getLocalized("faq", []);
  const navLinks = getLocalized("nav_links", []);
  const footerLinks = getLocalized("footer_links", {} as Record<string, Array<{ label: string; href: string }>>);

  const trustCompanies: string[] = getLocalized("home.trust_companies", []);
  const services: any[] = getLocalized("home.services", []);
  const steps: any[] = getLocalized("home.steps", []);
  const useCases: any[] = getLocalized("home.use_cases", []);
  const testimonials: any[] = getLocalized("home.testimonials", []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#33475B" }}>Site Content Manager</h1>
          <p className="text-sm mt-0.5" style={{ color: "#516F90" }}>Edit marketing page content. Changes are reflected on the public site immediately.</p>
        </div>
        <Button
          onClick={publish}
          disabled={publishing}
          data-testid="button-publish"
          className="flex-shrink-0"
          style={{ background: published ? "#00BDA5" : "#0091AE", color: "#fff", border: "none" }}
        >
          {publishing
            ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Publishing…</>
            : published
              ? <><Radio className="w-3.5 h-3.5 mr-1.5" />Published</>
              : <><Radio className="w-3.5 h-3.5 mr-1.5" />Publish Changes</>}
        </Button>
      </div>

      {/* Language toggle */}
      <div className="flex items-center gap-4 mb-6 p-4 rounded-2xl border border-[#CBD6E2] bg-[#F5F8FA]">
        <div className="flex items-center gap-2">
          <Globe2 className="w-4 h-4" style={{ color: "#0091AE" }} />
          <span className="text-sm font-semibold" style={{ color: "#33475B" }}>Editing language:</span>
        </div>
        <LangToggle active={activeLang} onChange={setActiveLang} />
        {activeLang === "ar" && (
          <p className="text-xs" style={{ color: "#516F90" }}>
            Editing Arabic content. Where empty, the site falls back to the English version.
          </p>
        )}
      </div>

      <Tabs defaultValue="hero">
        <TabsList className="mb-6 bg-[#F5F8FA] border border-[#CBD6E2] flex-wrap h-auto gap-0.5">
          {(["hero", "stats", "value_props", "nav_links", "footer_links", "faq", "seo", "trust_logos", "services", "steps", "use_cases", "testimonials", "changelog"] as const).map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize text-sm relative"
              {...(t === "changelog" ? { onClick: loadChangelog } : {})}
            >
              {t === "seo" ? "SEO & Meta"
                : t === "trust_logos" ? "Trust Logos"
                : t === "use_cases" ? "Use Cases"
                : t === "changelog" ? "Audit Log"
                : t.replace(/_/g, " ")}
              {!["seo", "trust_logos", "services", "steps", "use_cases", "testimonials", "changelog"].includes(t)
                && activeLang === "ar" && !hasArContent(t) && (
                <span className="ml-1.5 w-2 h-2 rounded-full inline-block" style={{ background: "#FFB347" }} title="AR empty" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="hero">
          <div className="mb-3 flex items-center justify-between">
            {activeLang === "ar" && !hasArContent("hero") && <EmptyArWarning />}
            <span />
          </div>
          <HeroEditor
            key={`hero-${activeLang}`}
            hero={hero}
            onSave={(v) => save("hero", v)}
            saving={savingKey === "hero"}
            saved={savedKey === "hero"}
          />
        </TabsContent>

        <TabsContent value="stats">
          {activeLang === "ar" && !hasArContent("stats") && <div className="mb-3"><EmptyArWarning /></div>}
          <StatsEditor
            key={`stats-${activeLang}`}
            stats={stats}
            onSave={(v) => save("stats", v)}
            saving={savingKey === "stats"}
            saved={savedKey === "stats"}
          />
        </TabsContent>

        <TabsContent value="value_props">
          {activeLang === "ar" && !hasArContent("value_props") && <div className="mb-3"><EmptyArWarning /></div>}
          <ValuePropsEditor
            key={`value_props-${activeLang}`}
            props={valueProps}
            onSave={(v) => save("value_props", v)}
            saving={savingKey === "value_props"}
            saved={savedKey === "value_props"}
          />
        </TabsContent>

        <TabsContent value="nav_links">
          {activeLang === "ar" && !hasArContent("nav_links") && <div className="mb-3"><EmptyArWarning /></div>}
          <LinksEditor
            key={`nav_links-${activeLang}`}
            title="Navigation Links"
            links={navLinks}
            onSave={(v) => save("nav_links", v)}
            saving={savingKey === "nav_links"}
            saved={savedKey === "nav_links"}
          />
        </TabsContent>

        <TabsContent value="footer_links">
          {activeLang === "ar" && !hasArContent("footer_links") && <div className="mb-3"><EmptyArWarning /></div>}
          <FooterLinksEditor
            key={`footer_links-${activeLang}`}
            footerLinks={footerLinks}
            onSave={(v) => save("footer_links", v)}
            saving={savingKey === "footer_links"}
            saved={savedKey === "footer_links"}
          />
        </TabsContent>

        <TabsContent value="faq">
          {activeLang === "ar" && !hasArContent("faq") && <div className="mb-3"><EmptyArWarning /></div>}
          <FAQEditor
            key={`faq-${activeLang}`}
            items={faq}
            onSave={(v) => save("faq", v)}
            saving={savingKey === "faq"}
            saved={savedKey === "faq"}
          />
        </TabsContent>

        <TabsContent value="seo">
          <SEOEditor
            pageMetas={pageMetas}
            onSave={saveSeoMeta}
            seoSaving={seoSaving}
            seoSaved={seoSaved}
          />
        </TabsContent>

        <TabsContent value="trust_logos">
          <TrustLogosEditor
            key={`trust_logos-${activeLang}-${JSON.stringify(trustCompanies)}`}
            items={trustCompanies}
            onSave={(v) => save("home.trust_companies", v)}
            saving={savingKey === "home.trust_companies"}
            saved={savedKey === "home.trust_companies"}
          />
        </TabsContent>

        <TabsContent value="services">
          <ServicesEditor
            key={`services-${activeLang}-${JSON.stringify(services)}`}
            items={services}
            onSave={(v) => save("home.services", v)}
            saving={savingKey === "home.services"}
            saved={savedKey === "home.services"}
          />
        </TabsContent>

        <TabsContent value="steps">
          <StepsEditor
            key={`steps-${activeLang}-${JSON.stringify(steps)}`}
            items={steps}
            onSave={(v) => save("home.steps", v)}
            saving={savingKey === "home.steps"}
            saved={savedKey === "home.steps"}
          />
        </TabsContent>

        <TabsContent value="use_cases">
          <UseCasesEditor
            key={`use_cases-${activeLang}-${JSON.stringify(useCases)}`}
            items={useCases}
            onSave={(v) => save("home.use_cases", v)}
            saving={savingKey === "home.use_cases"}
            saved={savedKey === "home.use_cases"}
          />
        </TabsContent>

        <TabsContent value="testimonials">
          <TestimonialsEditor
            key={`testimonials-${activeLang}-${JSON.stringify(testimonials)}`}
            items={testimonials}
            onSave={(v) => save("home.testimonials", v)}
            saving={savingKey === "home.testimonials"}
            saved={savedKey === "home.testimonials"}
          />
        </TabsContent>

        <TabsContent value="changelog">
          <ChangeLogTab items={changelog} loading={changelogLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ── Hero Editor ── */
function HeroEditor({ hero, onSave, saving, saved }: { hero: any; onSave: (v: any) => void; saving: boolean; saved: boolean }) {
  const [form, setForm] = useState(hero);
  useEffect(() => setForm(hero), [hero]);
  const f = (field: string, val: string) => setForm((p: any) => ({ ...p, [field]: val }));
  const fc = (sub: string, field: string, val: string) => setForm((p: any) => ({ ...p, [sub]: { ...p[sub], [field]: val } }));
  return (
    <div className="bg-white rounded-2xl border border-[#CBD6E2] p-6 space-y-4">
      <h2 className="font-semibold text-[#33475B] mb-2">Homepage Hero Section</h2>
      <div><Label>Badge Text</Label><Input className="mt-1" value={form.badge ?? ""} onChange={(e) => f("badge", e.target.value)} data-testid="input-hero-badge" /></div>
      <div><Label>Headline</Label><Textarea className="mt-1" rows={2} value={form.headline ?? ""} onChange={(e) => f("headline", e.target.value)} data-testid="input-hero-headline" /></div>
      <div><Label>Subheadline</Label><Textarea className="mt-1" rows={3} value={form.subheadline ?? ""} onChange={(e) => f("subheadline", e.target.value)} data-testid="input-hero-subheadline" /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Primary CTA Text</Label><Input className="mt-1" value={form.ctaPrimary?.text ?? ""} onChange={(e) => fc("ctaPrimary", "text", e.target.value)} data-testid="input-hero-cta-primary-text" /></div>
        <div><Label>Primary CTA Link</Label><Input className="mt-1" value={form.ctaPrimary?.href ?? ""} onChange={(e) => fc("ctaPrimary", "href", e.target.value)} data-testid="input-hero-cta-primary-href" /></div>
        <div><Label>Secondary CTA Text</Label><Input className="mt-1" value={form.ctaSecondary?.text ?? ""} onChange={(e) => fc("ctaSecondary", "text", e.target.value)} data-testid="input-hero-cta-secondary-text" /></div>
        <div><Label>Secondary CTA Link</Label><Input className="mt-1" value={form.ctaSecondary?.href ?? ""} onChange={(e) => fc("ctaSecondary", "href", e.target.value)} data-testid="input-hero-cta-secondary-href" /></div>
      </div>
      <div className="flex justify-end pt-2">
        <SaveBtn onClick={() => onSave(form)} saving={saving} saved={saved} />
      </div>
    </div>
  );
}

/* ── Stats Editor ── */
function StatsEditor({ stats, onSave, saving, saved }: { stats: any[]; onSave: (v: any) => void; saving: boolean; saved: boolean }) {
  const [items, setItems] = useState(stats);
  useEffect(() => setItems(stats), [stats]);
  const update = (i: number, field: string, val: string) => setItems((p) => p.map((x, idx) => idx === i ? { ...x, [field]: val } : x));
  return (
    <div className="bg-white rounded-2xl border border-[#CBD6E2] p-6 space-y-4">
      <h2 className="font-semibold text-[#33475B] mb-2">Stats Bar</h2>
      {items.map((stat, i) => (
        <div key={i} className="grid grid-cols-2 gap-3">
          <div><Label>Value</Label><Input className="mt-1" value={stat.value} onChange={(e) => update(i, "value", e.target.value)} data-testid={`input-stat-value-${i}`} /></div>
          <div><Label>Label</Label><Input className="mt-1" value={stat.label} onChange={(e) => update(i, "label", e.target.value)} data-testid={`input-stat-label-${i}`} /></div>
        </div>
      ))}
      <div className="flex justify-end pt-2">
        <SaveBtn onClick={() => onSave(items)} saving={saving} saved={saved} />
      </div>
    </div>
  );
}

/* ── Value Props Editor ── */
function ValuePropsEditor({ props, onSave, saving, saved }: { props: any[]; onSave: (v: any) => void; saving: boolean; saved: boolean }) {
  const [items, setItems] = useState(props);
  useEffect(() => setItems(props), [props]);
  const update = (i: number, field: string, val: string) => setItems((p) => p.map((x, idx) => idx === i ? { ...x, [field]: val } : x));
  return (
    <div className="bg-white rounded-2xl border border-[#CBD6E2] p-6 space-y-5">
      <h2 className="font-semibold text-[#33475B] mb-2">Value Propositions</h2>
      {items.map((prop, i) => (
        <div key={i} className="space-y-2 pb-4 border-b border-[#F5F8FA] last:border-0">
          <div><Label>Title</Label><Input className="mt-1" value={prop.title} onChange={(e) => update(i, "title", e.target.value)} data-testid={`input-prop-title-${i}`} /></div>
          <div><Label>Description</Label><Textarea className="mt-1" rows={2} value={prop.description} onChange={(e) => update(i, "description", e.target.value)} data-testid={`input-prop-desc-${i}`} /></div>
        </div>
      ))}
      <div className="flex justify-end pt-2">
        <SaveBtn onClick={() => onSave(items)} saving={saving} saved={saved} />
      </div>
    </div>
  );
}

/* ── Generic Links Editor (nav) ── */
function LinksEditor({ title, links, onSave, saving, saved }: { title: string; links: any[]; onSave: (v: any) => void; saving: boolean; saved: boolean }) {
  const [items, setItems] = useState(links);
  useEffect(() => setItems(links), [links]);
  const update = (i: number, field: string, val: string) => setItems((p) => p.map((x, idx) => idx === i ? { ...x, [field]: val } : x));
  const add = () => setItems((p) => [...p, { label: "", href: "" }]);
  const remove = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i));
  return (
    <div className="bg-white rounded-2xl border border-[#CBD6E2] p-6 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-[#33475B]">{title}</h2>
        <Button variant="outline" size="sm" onClick={add} data-testid="button-add-nav-link"><Plus className="w-3.5 h-3.5 mr-1" />Add</Button>
      </div>
      {items.map((link, i) => (
        <div key={i} className="flex gap-3 items-end">
          <div className="flex-1"><Label>Label</Label><Input className="mt-1" value={link.label} onChange={(e) => update(i, "label", e.target.value)} data-testid={`input-nav-label-${i}`} /></div>
          <div className="flex-1"><Label>Href</Label><Input className="mt-1" value={link.href} onChange={(e) => update(i, "href", e.target.value)} data-testid={`input-nav-href-${i}`} /></div>
          <button onClick={() => remove(i)} className="mb-1 p-1.5 text-[#CBD6E2] hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
        </div>
      ))}
      <div className="flex justify-end pt-2">
        <SaveBtn onClick={() => onSave(items)} saving={saving} saved={saved} />
      </div>
    </div>
  );
}

/* ── Footer Links Editor ── */
function FooterLinksEditor({ footerLinks, onSave, saving, saved }: { footerLinks: Record<string, any[]>; onSave: (v: any) => void; saving: boolean; saved: boolean }) {
  const [columns, setColumns] = useState<Record<string, any[]>>(footerLinks);
  useEffect(() => setColumns(footerLinks), [footerLinks]);
  function updateLink(col: string, i: number, field: string, val: string) {
    setColumns((p) => ({ ...p, [col]: p[col].map((x, idx) => idx === i ? { ...x, [field]: val } : x) }));
  }
  function addLink(col: string) { setColumns((p) => ({ ...p, [col]: [...(p[col] || []), { label: "", href: "" }] })); }
  function removeLink(col: string, i: number) { setColumns((p) => ({ ...p, [col]: p[col].filter((_, idx) => idx !== i) })); }
  function addColumn() {
    const name = prompt("New column heading:");
    if (name) setColumns((p) => ({ ...p, [name]: [] }));
  }
  function removeColumn(col: string) {
    if (!confirm(`Remove column "${col}"?`)) return;
    setColumns((p) => { const { [col]: _, ...rest } = p; return rest; });
  }
  return (
    <div className="bg-white rounded-2xl border border-[#CBD6E2] p-6 space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-[#33475B]">Footer Link Columns</h2>
        <Button variant="outline" size="sm" onClick={addColumn}><Plus className="w-3.5 h-3.5 mr-1" />Add Column</Button>
      </div>
      {Object.entries(columns).map(([col, links]) => (
        <div key={col} className="border border-[#CBD6E2] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-[#33475B]">{col}</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => addLink(col)}><Plus className="w-3.5 h-3.5 mr-1" />Link</Button>
              <button onClick={() => removeColumn(col)} className="text-[#CBD6E2] hover:text-red-400 transition-colors p-1"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
          {links.map((link: any, i: number) => (
            <div key={i} className="flex gap-3 items-end mb-2">
              <div className="flex-1"><Input className="text-sm" value={link.label} onChange={(e) => updateLink(col, i, "label", e.target.value)} placeholder="Label" data-testid={`input-footer-${col}-label-${i}`} /></div>
              <div className="flex-1"><Input className="text-sm" value={link.href} onChange={(e) => updateLink(col, i, "href", e.target.value)} placeholder="/href" data-testid={`input-footer-${col}-href-${i}`} /></div>
              <button onClick={() => removeLink(col, i)} className="p-1.5 text-[#CBD6E2] hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      ))}
      <div className="flex justify-end pt-2">
        <SaveBtn onClick={() => onSave(columns)} saving={saving} saved={saved} />
      </div>
    </div>
  );
}

/* ── FAQ Editor ── */
function FAQEditor({ items: initial, onSave, saving, saved }: { items: any[]; onSave: (v: any) => void; saving: boolean; saved: boolean }) {
  const [items, setItems] = useState(initial);
  useEffect(() => setItems(initial), [initial]);
  const update = (i: number, field: string, val: string) => setItems((p) => p.map((x, idx) => idx === i ? { ...x, [field]: val } : x));
  const add = () => setItems((p) => [...p, { q: "", a: "" }]);
  const remove = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const copy = [...items];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setItems(copy);
  };
  return (
    <div className="bg-white rounded-2xl border border-[#CBD6E2] p-6 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-[#33475B]">FAQ Items</h2>
        <Button variant="outline" size="sm" onClick={add}><Plus className="w-3.5 h-3.5 mr-1" />Add FAQ</Button>
      </div>
      {items.map((item, i) => (
        <div key={i} className="border border-[#CBD6E2] rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#99ACC2]">FAQ #{i + 1}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="p-1 text-[#CBD6E2] hover:text-[#33475B] disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
              <button onClick={() => move(i, 1)} disabled={i === items.length - 1} className="p-1 text-[#CBD6E2] hover:text-[#33475B] disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
              <button onClick={() => remove(i)} className="p-1 text-[#CBD6E2] hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
          <div><Label>Question</Label><Input className="mt-1" value={item.q} onChange={(e) => update(i, "q", e.target.value)} data-testid={`input-faq-q-${i}`} /></div>
          <div><Label>Answer</Label><Textarea className="mt-1" rows={3} value={item.a} onChange={(e) => update(i, "a", e.target.value)} data-testid={`input-faq-a-${i}`} /></div>
        </div>
      ))}
      <div className="flex justify-end pt-2">
        <SaveBtn onClick={() => onSave(items)} saving={saving} saved={saved} />
      </div>
    </div>
  );
}

/* ── SEO Editor (T004) ── */
const SEO_PAGES = [
  { pageKey: "home", label: "Home", path: "/" },
  { pageKey: "pricing", label: "Pricing", path: "/pricing" },
  { pageKey: "about", label: "About", path: "/about" },
  { pageKey: "login", label: "Login", path: "/login" },
  { pageKey: "admin-login", label: "Admin Login", path: "/admin/login" },
] as const;

function CharCounter({ value, max }: { value: string; max: number }) {
  const len = value.length;
  const ok = len <= max;
  return (
    <span className="text-xs ml-1" style={{ color: ok ? "#99ACC2" : "#FF7A59" }}>
      {len}/{max}
    </span>
  );
}

function GooglePreview({ title, description, path }: { title: string; description: string; path: string }) {
  const displayUrl = `contentech.ai${path}`;
  return (
    <div className="rounded-xl border p-4" style={{ background: "#FAFAFA", borderColor: "#E5EAF0" }}>
      <div className="flex items-center gap-2 mb-2">
        <Search className="w-3.5 h-3.5" style={{ color: "#99ACC2" }} />
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#99ACC2" }}>Google Preview</span>
      </div>
      <div className="text-[#1558D6] text-lg font-medium leading-snug hover:underline cursor-pointer truncate" style={{ fontFamily: "Arial, sans-serif" }}>
        {title || "Page Title"}
      </div>
      <div className="text-[#006621] text-xs my-0.5 truncate" style={{ fontFamily: "Arial, sans-serif" }}>
        {displayUrl}
      </div>
      <div className="text-[#545454] text-sm leading-snug line-clamp-2" style={{ fontFamily: "Arial, sans-serif" }}>
        {description || "Page description will appear here..."}
      </div>
    </div>
  );
}

function PageMetaForm({
  pageKey, path, label, locale, data, onSave, saving, saved,
}: {
  pageKey: string; path: string; label: string; locale: Lang;
  data: any; onSave: (data: object) => void; saving: boolean; saved: boolean;
}) {
  const [form, setForm] = useState({
    title: data?.title ?? "",
    description: data?.description ?? "",
    ogTitle: data?.ogTitle ?? "",
    ogDescription: data?.ogDescription ?? "",
    ogImage: data?.ogImage ?? "",
    canonical: data?.canonical ?? "",
    noIndex: data?.noIndex ?? false,
  });

  useEffect(() => {
    setForm({
      title: data?.title ?? "",
      description: data?.description ?? "",
      ogTitle: data?.ogTitle ?? "",
      ogDescription: data?.ogDescription ?? "",
      ogImage: data?.ogImage ?? "",
      canonical: data?.canonical ?? "",
      noIndex: data?.noIndex ?? false,
    });
  }, [data, locale]);

  const f = (field: string, val: string | boolean) => setForm((p) => ({ ...p, [field]: val }));

  return (
    <div className="space-y-5">
      <GooglePreview title={form.title} description={form.description} path={`/${locale}${path === "/" ? "" : path}`} />

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>Title <CharCounter value={form.title} max={60} /></Label>
        </div>
        <Input value={form.title} onChange={(e) => f("title", e.target.value)} placeholder="Page title for search engines"
          className={form.title.length > 60 ? "border-[#FF7A59]" : ""}
          data-testid={`input-seo-title-${pageKey}-${locale}`} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>Description <CharCounter value={form.description} max={160} /></Label>
        </div>
        <Textarea value={form.description} onChange={(e) => f("description", e.target.value)} rows={2}
          placeholder="Meta description for search engines"
          className={form.description.length > 160 ? "border-[#FF7A59]" : ""}
          data-testid={`input-seo-desc-${pageKey}-${locale}`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>OG Title <CharCounter value={form.ogTitle} max={60} /></Label>
          </div>
          <Input value={form.ogTitle} onChange={(e) => f("ogTitle", e.target.value)} placeholder="Open Graph title (social sharing)"
            data-testid={`input-seo-og-title-${pageKey}-${locale}`} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>OG Description <CharCounter value={form.ogDescription} max={160} /></Label>
          </div>
          <Input value={form.ogDescription} onChange={(e) => f("ogDescription", e.target.value)} placeholder="Open Graph description"
            data-testid={`input-seo-og-desc-${pageKey}-${locale}`} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="mb-1 block">OG Image URL</Label>
          <Input value={form.ogImage} onChange={(e) => f("ogImage", e.target.value)} placeholder="https://..." data-testid={`input-seo-og-image-${pageKey}-${locale}`} />
        </div>
        <div>
          <Label className="mb-1 block">Canonical URL</Label>
          <Input value={form.canonical} onChange={(e) => f("canonical", e.target.value)} placeholder="https://contentech.ai/..." data-testid={`input-seo-canonical-${pageKey}-${locale}`} />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[#F5F8FA]">
        <div className="flex items-center gap-3">
          <Switch
            id={`noindex-${pageKey}-${locale}`}
            checked={form.noIndex}
            onCheckedChange={(v) => f("noIndex", v)}
            data-testid={`toggle-noindex-${pageKey}-${locale}`}
          />
          <Label htmlFor={`noindex-${pageKey}-${locale}`} className="flex items-center gap-1.5 cursor-pointer">
            {form.noIndex ? <EyeOff className="w-3.5 h-3.5 text-[#FF7A59]" /> : <Eye className="w-3.5 h-3.5 text-[#00BDA5]" />}
            <span>noindex</span>
            {form.noIndex && <span className="text-xs font-medium text-[#FF7A59]">(hidden from search engines)</span>}
          </Label>
        </div>
        <SaveBtn onClick={() => onSave(form)} saving={saving} saved={saved} />
      </div>
    </div>
  );
}

function SEOEditor({
  pageMetas, onSave, seoSaving, seoSaved,
}: {
  pageMetas: Record<string, any>;
  onSave: (pageKey: string, locale: Lang, data: object) => void;
  seoSaving: string | null;
  seoSaved: string | null;
}) {
  const [expandedPage, setExpandedPage] = useState<string>("home");
  const [seoLang, setSeoLang] = useState<Lang>("en");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold" style={{ color: "#33475B" }}>SEO & Page Meta</h2>
          <p className="text-sm mt-0.5" style={{ color: "#516F90" }}>
            Set per-page title, description, Open Graph tags, and indexing for each language.
          </p>
        </div>
        <LangToggle active={seoLang} onChange={setSeoLang} />
      </div>

      {SEO_PAGES.map(({ pageKey, label, path }) => {
        const isOpen = expandedPage === pageKey;
        const hasData = !!pageMetas[pageKey]?.[seoLang]?.title;
        const id = `${pageKey}-${seoLang}`;

        return (
          <div key={pageKey} className="border rounded-2xl overflow-hidden" style={{ borderColor: "#CBD6E2" }}>
            <button
              className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-[#F5F8FA] transition-colors"
              onClick={() => setExpandedPage(isOpen ? "" : pageKey)}
              data-testid={`seo-page-toggle-${pageKey}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "#EEF1F5" }}>
                  <Search className="w-4 h-4" style={{ color: "#33475B" }} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold" style={{ color: "#33475B" }}>{label}</p>
                  <p className="text-xs" style={{ color: "#99ACC2" }}>{path}</p>
                </div>
                {!hasData && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ background: "#FFF8EC", color: "#B76E00", border: "1px solid #FFD166" }}>
                    {seoLang === "ar" ? "AR empty" : "No meta"}
                  </span>
                )}
              </div>
              <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} style={{ color: "#99ACC2" }} />
            </button>

            {isOpen && (
              <div className="px-5 pb-5 pt-2 border-t" style={{ borderColor: "#F0F3F7" }}>
                <PageMetaForm
                  key={id}
                  pageKey={pageKey}
                  path={path}
                  label={label}
                  locale={seoLang}
                  data={pageMetas[pageKey]?.[seoLang]}
                  onSave={(data) => onSave(pageKey, seoLang, data)}
                  saving={seoSaving === id}
                  saved={seoSaved === id}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Trust Logos Editor ── */
function TrustLogosEditor({ items: initial, onSave, saving, saved }: { items: string[]; onSave: (v: string[]) => void; saving: boolean; saved: boolean }) {
  const [items, setItems] = useState<string[]>(initial);
  useEffect(() => setItems(initial), [initial]);
  const update = (i: number, val: string) => setItems((p) => p.map((x, idx) => idx === i ? val : x));
  const add = () => setItems((p) => [...p, ""]);
  const remove = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i));
  return (
    <div className="bg-white rounded-2xl border border-[#CBD6E2] p-6 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="font-semibold text-[#33475B]">Trust Logos — Company Names</h2>
          <p className="text-xs mt-0.5" style={{ color: "#99ACC2" }}>These appear as pill badges in the "Trusted by teams at" band.</p>
        </div>
        <Button variant="outline" size="sm" onClick={add} data-testid="button-add-trust-logo"><Plus className="w-3.5 h-3.5 mr-1" />Add</Button>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((name, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input value={name} onChange={(e) => update(i, e.target.value)} placeholder="Company name"
              className="flex-1" data-testid={`input-trust-logo-${i}`} />
            <button onClick={() => remove(i)} className="p-1.5 text-[#CBD6E2] hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
      <div className="flex justify-end pt-2">
        <SaveBtn onClick={() => onSave(items)} saving={saving} saved={saved} />
      </div>
    </div>
  );
}

/* ── Services Editor ── */
const EMPTY_SERVICE = () => ({ name: "", tagline: "", href: "", description: "", bullets: [""] });

function ServicesEditor({ items: initial, onSave, saving, saved }: { items: any[]; onSave: (v: any[]) => void; saving: boolean; saved: boolean }) {
  const [items, setItems] = useState(initial.length ? initial : [EMPTY_SERVICE()]);
  useEffect(() => setItems(initial.length ? initial : [EMPTY_SERVICE()]), [initial]);
  const update = (i: number, field: string, val: any) => setItems((p) => p.map((x, idx) => idx === i ? { ...x, [field]: val } : x));
  const updateBullet = (i: number, bi: number, val: string) => setItems((p) => p.map((x, idx) => idx === i ? { ...x, bullets: (x.bullets ?? []).map((b: string, j: number) => j === bi ? val : b) } : x));
  const addBullet = (i: number) => setItems((p) => p.map((x, idx) => idx === i ? { ...x, bullets: [...(x.bullets ?? []), ""] } : x));
  const removeBullet = (i: number, bi: number) => setItems((p) => p.map((x, idx) => idx === i ? { ...x, bullets: (x.bullets ?? []).filter((_: any, j: number) => j !== bi) } : x));
  const add = () => setItems((p) => [...p, EMPTY_SERVICE()]);
  const remove = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i));
  return (
    <div className="bg-white rounded-2xl border border-[#CBD6E2] p-6 space-y-5">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="font-semibold text-[#33475B]">Service Cards</h2>
          <p className="text-xs mt-0.5" style={{ color: "#99ACC2" }}>Up to 4 cards displayed in a 2-column grid on the homepage.</p>
        </div>
        <Button variant="outline" size="sm" onClick={add} data-testid="button-add-service"><Plus className="w-3.5 h-3.5 mr-1" />Add</Button>
      </div>
      {items.map((svc, i) => (
        <div key={i} className="border border-[#CBD6E2] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#99ACC2]">Service #{i + 1}</span>
            <button onClick={() => remove(i)} className="p-1 text-[#CBD6E2] hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Name</Label><Input className="mt-1" value={svc.name ?? ""} onChange={(e) => update(i, "name", e.target.value)} data-testid={`input-service-name-${i}`} /></div>
            <div><Label>Tagline</Label><Input className="mt-1" value={svc.tagline ?? ""} onChange={(e) => update(i, "tagline", e.target.value)} data-testid={`input-service-tagline-${i}`} /></div>
          </div>
          <div><Label>Link (href)</Label><Input className="mt-1" value={svc.href ?? ""} onChange={(e) => update(i, "href", e.target.value)} placeholder="/services/..." data-testid={`input-service-href-${i}`} /></div>
          <div><Label>Description</Label><Textarea className="mt-1" rows={3} value={svc.description ?? ""} onChange={(e) => update(i, "description", e.target.value)} data-testid={`input-service-desc-${i}`} /></div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Feature Bullets</Label>
              <button onClick={() => addBullet(i)} className="text-xs text-[#0091AE] hover:underline flex items-center gap-0.5"><Plus className="w-3 h-3" />Add bullet</button>
            </div>
            {(svc.bullets ?? []).map((b: string, bi: number) => (
              <div key={bi} className="flex gap-2 items-center mt-1">
                <Input value={b} onChange={(e) => updateBullet(i, bi, e.target.value)} className="flex-1 text-sm" data-testid={`input-service-bullet-${i}-${bi}`} />
                <button onClick={() => removeBullet(i, bi)} className="p-1 text-[#CBD6E2] hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="flex justify-end pt-2">
        <SaveBtn onClick={() => onSave(items)} saving={saving} saved={saved} />
      </div>
    </div>
  );
}

/* ── Steps Editor ── */
const EMPTY_STEP = (n: number) => ({ step: `0${n}`, title: "", description: "", detail: "" });

function StepsEditor({ items: initial, onSave, saving, saved }: { items: any[]; onSave: (v: any[]) => void; saving: boolean; saved: boolean }) {
  const [items, setItems] = useState(initial.length ? initial : [1, 2, 3].map(EMPTY_STEP));
  useEffect(() => setItems(initial.length ? initial : [1, 2, 3].map(EMPTY_STEP)), [initial]);
  const update = (i: number, field: string, val: string) => setItems((p) => p.map((x, idx) => idx === i ? { ...x, [field]: val } : x));
  return (
    <div className="bg-white rounded-2xl border border-[#CBD6E2] p-6 space-y-5">
      <div>
        <h2 className="font-semibold text-[#33475B] mb-1">How It Works — Steps</h2>
        <p className="text-xs" style={{ color: "#99ACC2" }}>Displayed in the dark blue "From upload to delivery" section.</p>
      </div>
      {items.map((step, i) => (
        <div key={i} className="border border-[#CBD6E2] rounded-xl p-5 space-y-3">
          <span className="text-xs font-semibold text-[#99ACC2]">Step #{i + 1}</span>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Step Number / Label</Label><Input className="mt-1" value={step.step ?? ""} onChange={(e) => update(i, "step", e.target.value)} placeholder="01" data-testid={`input-step-num-${i}`} /></div>
            <div><Label>Title</Label><Input className="mt-1" value={step.title ?? ""} onChange={(e) => update(i, "title", e.target.value)} data-testid={`input-step-title-${i}`} /></div>
          </div>
          <div><Label>Description</Label><Textarea className="mt-1" rows={2} value={step.description ?? ""} onChange={(e) => update(i, "description", e.target.value)} data-testid={`input-step-desc-${i}`} /></div>
          <div><Label>Detail (orange accent text)</Label><Input className="mt-1" value={step.detail ?? ""} onChange={(e) => update(i, "detail", e.target.value)} data-testid={`input-step-detail-${i}`} /></div>
        </div>
      ))}
      <div className="flex justify-end pt-2">
        <SaveBtn onClick={() => onSave(items)} saving={saving} saved={saved} />
      </div>
    </div>
  );
}

/* ── Use Cases Editor ── */
const EMPTY_USECASE = () => ({ title: "", description: "" });

function UseCasesEditor({ items: initial, onSave, saving, saved }: { items: any[]; onSave: (v: any[]) => void; saving: boolean; saved: boolean }) {
  const [items, setItems] = useState(initial.length ? initial : Array(6).fill(null).map(EMPTY_USECASE));
  useEffect(() => setItems(initial.length ? initial : Array(6).fill(null).map(EMPTY_USECASE)), [initial]);
  const update = (i: number, field: string, val: string) => setItems((p) => p.map((x, idx) => idx === i ? { ...x, [field]: val } : x));
  const add = () => setItems((p) => [...p, EMPTY_USECASE()]);
  const remove = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i));
  return (
    <div className="bg-white rounded-2xl border border-[#CBD6E2] p-6 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="font-semibold text-[#33475B]">Use Cases</h2>
          <p className="text-xs mt-0.5" style={{ color: "#99ACC2" }}>6 cards in a 3-column grid. Icons are auto-assigned by position.</p>
        </div>
        <Button variant="outline" size="sm" onClick={add} data-testid="button-add-usecase"><Plus className="w-3.5 h-3.5 mr-1" />Add</Button>
      </div>
      {items.map((uc, i) => (
        <div key={i} className="border border-[#CBD6E2] rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#99ACC2]">Use Case #{i + 1}</span>
            <button onClick={() => remove(i)} className="p-1 text-[#CBD6E2] hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
          <div><Label>Title</Label><Input className="mt-1" value={uc.title ?? ""} onChange={(e) => update(i, "title", e.target.value)} data-testid={`input-uc-title-${i}`} /></div>
          <div><Label>Description</Label><Textarea className="mt-1" rows={2} value={uc.description ?? ""} onChange={(e) => update(i, "description", e.target.value)} data-testid={`input-uc-desc-${i}`} /></div>
        </div>
      ))}
      <div className="flex justify-end pt-2">
        <SaveBtn onClick={() => onSave(items)} saving={saving} saved={saved} />
      </div>
    </div>
  );
}

/* ── Testimonials Editor ── */
const EMPTY_TESTIMONIAL = () => ({ name: "", role: "", company: "", stars: 5, quote: "", metric: "" });

function TestimonialsEditor({ items: initial, onSave, saving, saved }: { items: any[]; onSave: (v: any[]) => void; saving: boolean; saved: boolean }) {
  const [items, setItems] = useState(initial.length ? initial : Array(3).fill(null).map(EMPTY_TESTIMONIAL));
  useEffect(() => setItems(initial.length ? initial : Array(3).fill(null).map(EMPTY_TESTIMONIAL)), [initial]);
  const update = (i: number, field: string, val: any) => setItems((p) => p.map((x, idx) => idx === i ? { ...x, [field]: val } : x));
  const add = () => setItems((p) => [...p, EMPTY_TESTIMONIAL()]);
  const remove = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i));
  return (
    <div className="bg-white rounded-2xl border border-[#CBD6E2] p-6 space-y-5">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="font-semibold text-[#33475B]">Testimonials</h2>
          <p className="text-xs mt-0.5" style={{ color: "#99ACC2" }}>3 cards in a row. Initials avatar is auto-generated from the name.</p>
        </div>
        <Button variant="outline" size="sm" onClick={add} data-testid="button-add-testimonial"><Plus className="w-3.5 h-3.5 mr-1" />Add</Button>
      </div>
      {items.map((t, i) => (
        <div key={i} className="border border-[#CBD6E2] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#99ACC2]">Testimonial #{i + 1}</span>
            <button onClick={() => remove(i)} className="p-1 text-[#CBD6E2] hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Name</Label><Input className="mt-1" value={t.name ?? ""} onChange={(e) => update(i, "name", e.target.value)} data-testid={`input-testimonial-name-${i}`} /></div>
            <div><Label>Role</Label><Input className="mt-1" value={t.role ?? ""} onChange={(e) => update(i, "role", e.target.value)} data-testid={`input-testimonial-role-${i}`} /></div>
            <div><Label>Company</Label><Input className="mt-1" value={t.company ?? ""} onChange={(e) => update(i, "company", e.target.value)} data-testid={`input-testimonial-company-${i}`} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Stars (1–5)</Label>
              <Input className="mt-1" type="number" min={1} max={5} value={t.stars ?? 5}
                onChange={(e) => update(i, "stars", parseInt(e.target.value) || 5)} data-testid={`input-testimonial-stars-${i}`} />
            </div>
            <div><Label>Metric Badge</Label><Input className="mt-1" value={t.metric ?? ""} onChange={(e) => update(i, "metric", e.target.value)} placeholder="e.g. 70% faster delivery" data-testid={`input-testimonial-metric-${i}`} /></div>
          </div>
          <div><Label>Quote</Label><Textarea className="mt-1" rows={3} value={t.quote ?? ""} onChange={(e) => update(i, "quote", e.target.value)} data-testid={`input-testimonial-quote-${i}`} /></div>
        </div>
      ))}
      <div className="flex justify-end pt-2">
        <SaveBtn onClick={() => onSave(items)} saving={saving} saved={saved} />
      </div>
    </div>
  );
}

/* ── ChangeLog Tab ── */
function ChangeLogTab({ items, loading }: { items: any[]; loading: boolean }) {
  if (loading) return <div className="py-12 text-center text-[#99ACC2] text-sm">Loading audit log…</div>;
  if (!items.length) return (
    <div className="py-12 text-center">
      <Clock className="w-8 h-8 mx-auto mb-3 text-[#CBD6E2]" />
      <p className="text-sm text-[#99ACC2]">No changes recorded yet. Audit trail appears here once edits are made.</p>
    </div>
  );
  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-semibold text-[#33475B]">Audit Log</h2>
        <p className="text-xs mt-0.5 text-[#99ACC2]">All admin edits to plans and site content are recorded here.</p>
      </div>
      <div className="divide-y divide-[#F5F8FA] border border-[#CBD6E2] rounded-2xl overflow-hidden bg-white">
        {items.map((entry) => {
          const date = new Date(entry.createdAt);
          return (
            <div key={entry.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: entry.entityType === "PLAN" ? "#FFF1EC" : "#E8F5F8" }}>
                    <User className="w-3.5 h-3.5" style={{ color: entry.entityType === "PLAN" ? "#FF7A59" : "#0091AE" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#33475B]">
                      {entry.entityType} — {entry.entityKey ?? "unknown"}
                    </p>
                    <p className="text-xs text-[#99ACC2]">by {entry.adminEmail ?? entry.adminId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Clock className="w-3 h-3 text-[#99ACC2]" />
                  <span className="text-xs text-[#99ACC2]" title={date.toISOString()}>
                    {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
              {(entry.before || entry.after) && (
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  {entry.before && (
                    <div className="rounded-lg p-2.5 overflow-auto max-h-32" style={{ background: "#FFF8EC", border: "1px solid #FFD166" }}>
                      <p className="font-semibold text-[#B76E00] mb-1">Before</p>
                      <pre className="text-[#516F90] whitespace-pre-wrap break-all">{JSON.stringify(entry.before, null, 2)}</pre>
                    </div>
                  )}
                  {entry.after && (
                    <div className="rounded-lg p-2.5 overflow-auto max-h-32" style={{ background: "#F0FBF9", border: "1px solid #00BDA5" }}>
                      <p className="font-semibold text-[#00857A] mb-1">After</p>
                      <pre className="text-[#516F90] whitespace-pre-wrap break-all">{JSON.stringify(entry.after, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
