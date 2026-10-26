import { decrypt } from "./encrypt";
import { prisma } from "./prisma";
import crypto from "crypto";

// ─── Multilingual Adapter Abstraction ────────────────────────────────────────

export interface WPLanguage {
  code: string;
  name: string;
  nativeName?: string;
  isDefault: boolean;
}

export interface WPPostType {
  slug: string;
  name: string;
  restBase: string;
  hierarchical: boolean;
  count?: number;
}

export interface WPPost {
  id: number;
  type: string;
  title: string;
  content: string;
  excerpt?: string;
  slug: string;
  status: string;
  link?: string;
  modifiedAt: string;
  language?: string;
  acf?: Record<string, any>;
  yoast?: Record<string, string>;
  taxonomies?: Record<string, WPTerm[]>;
  /** WordPress attachment ID of the featured image */
  featuredMediaId?: number;
  /** Alt text of the featured image (for translation) */
  featuredImageAlt?: string;
}

export interface WPTerm {
  id: number;
  name: string;
  slug: string;
  description?: string;
  taxonomy: string;
}

export interface CreateTranslationPayload {
  originalPostId: number;
  postType: string;
  targetLanguage: string;
  title: string;
  content: string;
  excerpt?: string;
  slug?: string;
  status: "draft" | "publish";
  acf?: Record<string, any>;
  yoast?: Record<string, string>;
  /** WordPress attachment ID of the featured image — carried over to translated post */
  featuredMediaId?: number;
  /** Translated alt text for the featured image (written as post meta on the new post) */
  featuredImageAlt?: string;
  /** Translated taxonomy terms to write back (keyed by taxonomy slug) */
  taxonomies?: Record<string, WPTerm[]>;
}

export interface WPMenuItem {
  id: number;
  menuId: number;
  menuName: string;
  label: string;
  url: string;
  order: number;
}

export interface MultilingualAdapter {
  /** List languages registered in the plugin. */
  listLanguages(): Promise<WPLanguage[]>;
  /** List translatable post types. */
  listPostTypes(): Promise<WPPostType[]>;
  /** Fetch posts for a type with pagination + lang filter. */
  listPosts(postType: string, page: number, perPage: number, lang?: string): Promise<{ posts: WPPost[]; total: number }>;
  /** Fetch a single post with full content, ACF, Yoast. */
  getPost(postId: number, postType: string): Promise<WPPost>;
  /**
   * Create a new translation post and link it to the original.
   * Returns { postId, link } where link is the frontend permalink of the created post.
   */
  createTranslation(payload: CreateTranslationPayload): Promise<{ postId: number; link: string }>;
  /** Write a translated label back to a navigation menu item. Best-effort. */
  updateMenuItemLabel(menuItemId: number, translatedLabel: string): Promise<void>;
  /** Probe whether the plugin is active on this WP site. */
  probe(): Promise<boolean>;
  /** Plugin identifier. */
  pluginId: "WPML" | "Polylang" | "Unknown";
  /**
   * List all navigation menu items from this site.
   * Uses WP REST API v2 /menus and /menu-items endpoints (WP 5.9+).
   * Returns empty array when the API is unavailable (older WP / disabled).
   */
  listMenuItems(): Promise<WPMenuItem[]>;
}

// ─── WPML Adapter ────────────────────────────────────────────────────────────

export class WPMLAdapter implements MultilingualAdapter {
  pluginId = "WPML" as const;

  constructor(private client: WordpressRestClient) {}

  async probe(): Promise<boolean> {
    try {
      await this.client.get("/wpml/v1/languages");
      return true;
    } catch {
      return false;
    }
  }

  async listLanguages(): Promise<WPLanguage[]> {
    const data = await this.client.get<any[]>("/wpml/v1/languages");
    return (data ?? []).map((l: any) => ({
      code: l.language_code ?? l.code,
      name: l.translated_name ?? l.english_name ?? l.code,
      nativeName: l.native_name,
      isDefault: !!l.default,
    }));
  }

  async listPostTypes(): Promise<WPPostType[]> {
    const data = await this.client.get<Record<string, any>>("/wp/v2/types");
    return Object.values(data ?? {})
      .filter((pt: any) => pt.rest_base && pt.show_in_rest !== false)
      .map((pt: any) => ({
        slug: pt.slug,
        name: pt.name,
        restBase: pt.rest_base,
        hierarchical: !!pt.hierarchical,
      }));
  }

  async listPosts(postType: string, page = 1, perPage = 20, lang?: string): Promise<{ posts: WPPost[]; total: number }> {
    const restBase = await this.getRestBase(postType);
    const params: Record<string, any> = { page, per_page: perPage, _fields: "id,title,excerpt,slug,status,date_modified,type,link" };
    if (lang) params.lang = lang;
    const res = await this.client.getWithHeaders<any[]>(`/wp/v2/${restBase}`, params);
    const posts: WPPost[] = (res.data ?? []).map((p: any) => ({
      id: p.id,
      type: postType,
      title: p.title?.rendered ?? p.title ?? "",
      content: "",
      excerpt: p.excerpt?.rendered ?? "",
      slug: p.slug,
      status: p.status,
      link: p.link,
      modifiedAt: p.date_modified ?? p.modified ?? "",
      language: lang,
    }));
    return { posts, total: parseInt(res.headers["x-wp-total"] ?? "0", 10) };
  }

  async getPost(postId: number, postType: string): Promise<WPPost> {
    const restBase = await this.getRestBase(postType);
    const p = await this.client.get<any>(`/wp/v2/${restBase}/${postId}?context=edit`);
    const acf = p.acf ?? undefined;
    const yoast = extractYoastMeta(p);

    // Fetch featured image alt text if a featured_media ID is set
    let featuredImageAlt: string | undefined;
    const featuredMediaId: number | undefined = p.featured_media || undefined;
    if (featuredMediaId) {
      try {
        const media = await this.client.get<any>(`/wp/v2/media/${featuredMediaId}`);
        if (media?.alt_text?.trim()) featuredImageAlt = media.alt_text;
      } catch { /* featured media fetch is best-effort */ }
    }

    return {
      id: p.id,
      type: postType,
      title: p.title?.raw ?? p.title?.rendered ?? "",
      content: p.content?.raw ?? p.content?.rendered ?? "",
      excerpt: p.excerpt?.raw ?? p.excerpt?.rendered ?? "",
      slug: p.slug,
      status: p.status,
      link: p.link,
      modifiedAt: p.modified ?? "",
      acf,
      yoast,
      taxonomies: await this.fetchTaxonomiesForPost(p, postType),
      featuredMediaId,
      featuredImageAlt,
    };
  }

  async createTranslation(payload: CreateTranslationPayload): Promise<{ postId: number; link: string }> {
    const restBase = await this.getRestBase(payload.postType);

    // ── 1. Create the post in the target language ──────────────────────
    const body: Record<string, any> = {
      title: payload.title,
      content: payload.content,
      excerpt: payload.excerpt ?? "",
      slug: payload.slug,
      status: payload.status,
      lang: payload.targetLanguage,
    };
    // Carry over featured media (same image ID; alt text updated separately)
    if (payload.featuredMediaId) body.featured_media = payload.featuredMediaId;

    const newPost = await this.client.post<any>(`/wp/v2/${restBase}`, body);
    const newPostId: number = newPost.id;

    // ── 2. Link as WPML translation of the original post ──────────────
    // This is a required step — without it, the translated post is an orphan
    // and WPML cannot surface it as the translation of the original.
    await this.client.post(`/wpml/v1/translations`, {
      post_id: payload.originalPostId,
      post_type: payload.postType,
      translations: [{ language_code: payload.targetLanguage, id: newPostId }],
    });

    // ── 3. Write Yoast SEO meta ─────────────────────────────────────────
    if (payload.yoast && Object.keys(payload.yoast).length > 0) {
      try {
        const yoastMeta: Record<string, string> = {};
        const YOAST_META_MAP: Record<string, string> = {
          title: "_yoast_wpseo_title",
          description: "_yoast_wpseo_metadesc",
          og_title: "_yoast_wpseo_opengraph-title",
          og_description: "_yoast_wpseo_opengraph-description",
        };
        for (const [k, v] of Object.entries(payload.yoast)) {
          const metaKey = YOAST_META_MAP[k] ?? `_yoast_wpseo_${k}`;
          if (v) yoastMeta[metaKey] = v;
        }
        await this.client.post(`/wp/v2/${restBase}/${newPostId}`, { meta: yoastMeta });
      } catch (yoastErr: any) {
        console.warn(`[WPML] Yoast meta write failed for post ${newPostId}: ${yoastErr?.message ?? yoastErr}`);
      }
    }

    // ── 4. Write translated featured image alt text ────────────────────
    // Alt text is stored as post meta on the translated post because the
    // featured_media attachment is shared; updating it globally would corrupt
    // the source language version.  Themes/SEO plugins can read this meta.
    if (payload.featuredImageAlt && payload.featuredMediaId) {
      try {
        await this.client.post(`/wp/v2/${restBase}/${newPostId}`, {
          meta: { _contentech_feat_img_alt: payload.featuredImageAlt },
        });
      } catch { /* post meta write is best-effort; theme/plugin may register it */ }
    }

    // ── 5. Write ACF fields ─────────────────────────────────────────────
    if (payload.acf && Object.keys(payload.acf).length > 0) {
      try {
        await this.client.post(`/wp/v2/${restBase}/${newPostId}`, { acf: payload.acf });
      } catch { /* ACF REST write requires ACF PRO — best-effort */ }
    }

    // ── 5. Write taxonomy terms (translated names) ──────────────────────
    if (payload.taxonomies && Object.keys(payload.taxonomies).length > 0) {
      try {
        const taxData = await this.client.get<Record<string, any>>("/wp/v2/taxonomies");
        const termIdMap: Record<string, number[]> = {};

        for (const [taxSlug, terms] of Object.entries(payload.taxonomies)) {
          const tax = taxData[taxSlug];
          if (!tax?.rest_base) continue;
          const termRestBase = tax.rest_base;
          const ids: number[] = [];
          for (const term of terms) {
            try {
              // Try to find existing term by translated name
              const existing = await this.client.get<any[]>(
                `/wp/v2/${termRestBase}?search=${encodeURIComponent(term.name)}&lang=${payload.targetLanguage}&per_page=5`
              );
              const found = (existing ?? []).find((t: any) => t.name.toLowerCase() === term.name.toLowerCase());
              if (found) {
                ids.push(found.id);
              } else {
                // Create new term
                const created = await this.client.post<any>(`/wp/v2/${termRestBase}`, {
                  name: term.name, slug: term.slug, lang: payload.targetLanguage,
                });
                if (created?.id) ids.push(created.id);
              }
            } catch { /* individual term errors are non-fatal */ }
          }
          if (ids.length > 0) termIdMap[taxSlug] = ids;
        }

        if (Object.keys(termIdMap).length > 0) {
          await this.client.post(`/wp/v2/${restBase}/${newPostId}`, termIdMap);
        }
      } catch (taxErr: any) {
        console.warn(`[WPML] Taxonomy write-back failed for post ${newPostId}: ${taxErr?.message ?? taxErr}`);
      }
    }

    return { postId: newPostId, link: (newPost.link as string) ?? "" };
  }

  async updateMenuItemLabel(menuItemId: number, translatedLabel: string): Promise<void> {
    await this.client.post(`/wp/v2/menu-items/${menuItemId}`, { title: translatedLabel });
  }

  private restBaseCache: Record<string, string> = {};
  private async getRestBase(postType: string): Promise<string> {
    if (this.restBaseCache[postType]) return this.restBaseCache[postType];
    const types = await this.client.get<Record<string, any>>("/wp/v2/types");
    for (const [, pt] of Object.entries(types ?? {})) {
      if ((pt as any).slug === postType) {
        this.restBaseCache[postType] = (pt as any).rest_base;
        return (pt as any).rest_base;
      }
    }
    return postType + "s";
  }

  private async fetchTaxonomiesForPost(post: any, postType: string): Promise<Record<string, WPTerm[]>> {
    const result: Record<string, WPTerm[]> = {};
    try {
      const taxData = await this.client.get<Record<string, any>>("/wp/v2/taxonomies");
      for (const [taxSlug, tax] of Object.entries(taxData ?? {})) {
        const t = tax as any;
        if (!Array.isArray(t.types) || !t.types.includes(postType)) continue;
        const termIds: number[] = post[taxSlug] ?? post[t.rest_base] ?? [];
        if (!Array.isArray(termIds) || termIds.length === 0) continue;
        const restBase = t.rest_base ?? taxSlug;
        const terms = await this.client.get<any[]>(`/wp/v2/${restBase}?include=${termIds.join(",")}`);
        result[taxSlug] = (terms ?? []).map((tr: any) => ({
          id: tr.id, name: tr.name, slug: tr.slug, description: tr.description ?? "", taxonomy: taxSlug,
        }));
      }
    } catch { /* optional */ }
    return result;
  }

  async listMenuItems(): Promise<WPMenuItem[]> {
    return listMenuItemsViaWPRest(this.client);
  }
}

// ─── Polylang Adapter ─────────────────────────────────────────────────────────

export class PolylangAdapter implements MultilingualAdapter {
  pluginId = "Polylang" as const;
  constructor(private client: WordpressRestClient) {}

  async probe(): Promise<boolean> {
    try { await this.client.get("/pll/v1/languages"); return true; } catch { return false; }
  }

  /**
   * Probe whether the Polylang REST API add-on is installed.
   * The add-on registers POST /pll/v1/posts — without it, translation linking
   * silently fails and posts are left orphaned (no language group membership).
   * Returns true when the endpoint exists (even if our GET returns 405 or 401).
   * Returns false only on a 404, which means the route was never registered.
   */
  async probeRestApiExtension(): Promise<boolean> {
    try {
      await this.client.get("/pll/v1/posts");
      return true;
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      // 404 = route not registered (add-on absent); anything else = installed
      return !msg.includes("WP REST 404");
    }
  }

  async listLanguages(): Promise<WPLanguage[]> {
    const data = await this.client.get<any[]>("/pll/v1/languages");
    return (data ?? []).map((l: any) => ({
      code: l.slug ?? l.locale,
      name: l.name ?? l.slug,
      nativeName: l.name,
      isDefault: !!l.is_default,
    }));
  }

  async listPostTypes(): Promise<WPPostType[]> {
    const data = await this.client.get<Record<string, any>>("/wp/v2/types");
    return Object.values(data ?? {})
      .filter((pt: any) => pt.rest_base && pt.show_in_rest !== false)
      .map((pt: any) => ({
        slug: pt.slug, name: pt.name, restBase: pt.rest_base, hierarchical: !!pt.hierarchical,
      }));
  }

  async listPosts(postType: string, page = 1, perPage = 20, lang?: string): Promise<{ posts: WPPost[]; total: number }> {
    const restBase = await this.getRestBase(postType);
    const params: Record<string, any> = { page, per_page: perPage, _fields: "id,title,excerpt,slug,status,date_modified,type,link" };
    if (lang) params.lang = lang;
    const res = await this.client.getWithHeaders<any[]>(`/wp/v2/${restBase}`, params);
    const posts: WPPost[] = (res.data ?? []).map((p: any) => ({
      id: p.id,
      type: postType,
      title: p.title?.rendered ?? p.title ?? "",
      content: "",
      excerpt: p.excerpt?.rendered ?? "",
      slug: p.slug,
      status: p.status,
      link: p.link,
      modifiedAt: p.date_modified ?? p.modified ?? "",
      language: lang,
    }));
    return { posts, total: parseInt(res.headers["x-wp-total"] ?? "0", 10) };
  }

  async getPost(postId: number, postType: string): Promise<WPPost> {
    const restBase = await this.getRestBase(postType);
    const p = await this.client.get<any>(`/wp/v2/${restBase}/${postId}?context=edit`);
    const acf = p.acf ?? undefined;
    const yoast = extractYoastMeta(p);

    // Fetch featured image alt text if a featured_media ID is set
    let featuredImageAlt: string | undefined;
    const featuredMediaId: number | undefined = p.featured_media || undefined;
    if (featuredMediaId) {
      try {
        const media = await this.client.get<any>(`/wp/v2/media/${featuredMediaId}`);
        if (media?.alt_text?.trim()) featuredImageAlt = media.alt_text;
      } catch { /* featured media fetch is best-effort */ }
    }

    return {
      id: p.id,
      type: postType,
      title: p.title?.raw ?? p.title?.rendered ?? "",
      content: p.content?.raw ?? p.content?.rendered ?? "",
      excerpt: p.excerpt?.raw ?? p.excerpt?.rendered ?? "",
      slug: p.slug,
      status: p.status,
      link: p.link,
      modifiedAt: p.modified ?? "",
      acf,
      yoast,
      taxonomies: await this.fetchTaxonomiesForPost(p, postType),
      featuredMediaId,
      featuredImageAlt,
    };
  }

  async createTranslation(payload: CreateTranslationPayload): Promise<{ postId: number; link: string }> {
    const restBase = await this.getRestBase(payload.postType);

    // ── 1. Create the post in the target language ──────────────────────
    const body: Record<string, any> = {
      title: payload.title,
      content: payload.content,
      excerpt: payload.excerpt ?? "",
      slug: payload.slug,
      status: payload.status,
      lang: payload.targetLanguage,
    };
    if (payload.featuredMediaId) body.featured_media = payload.featuredMediaId;

    const newPost = await this.client.post<any>(`/wp/v2/${restBase}`, body);
    const newPostId: number = newPost.id;

    // ── 2. Link as Polylang translation of the original post ───────────
    // This registers the new post as a translation of the original in Polylang's
    // translation group — without this, both posts are orphaned (no language link).
    // A failure here is fatal: we do not want to silently return a post that is
    // not linked, as that would produce an orphan and mislead the caller into
    // thinking the translation was delivered successfully.
    await this.client.post(`/pll/v1/posts`, {
      post_id: newPostId,
      lang: payload.targetLanguage,
      original_id: payload.originalPostId,
    });

    // ── 3. Write Yoast SEO meta ─────────────────────────────────────────
    if (payload.yoast && Object.keys(payload.yoast).length > 0) {
      try {
        const yoastMeta: Record<string, string> = {};
        const YOAST_META_MAP: Record<string, string> = {
          title: "_yoast_wpseo_title",
          description: "_yoast_wpseo_metadesc",
          og_title: "_yoast_wpseo_opengraph-title",
          og_description: "_yoast_wpseo_opengraph-description",
        };
        for (const [k, v] of Object.entries(payload.yoast)) {
          const metaKey = YOAST_META_MAP[k] ?? `_yoast_wpseo_${k}`;
          if (v) yoastMeta[metaKey] = v;
        }
        await this.client.post(`/wp/v2/${restBase}/${newPostId}`, { meta: yoastMeta });
      } catch (yoastErr: any) {
        console.warn(`[Polylang] Yoast meta write failed for post ${newPostId}: ${yoastErr?.message ?? yoastErr}`);
      }
    }

    // ── 4. Write translated featured image alt text ────────────────────
    // Alt text is stored as post meta on the translated post because the
    // featured_media attachment is shared; updating it globally would corrupt
    // the source language version.  Themes/SEO plugins can read this meta.
    if (payload.featuredImageAlt && payload.featuredMediaId) {
      try {
        await this.client.post(`/wp/v2/${restBase}/${newPostId}`, {
          meta: { _contentech_feat_img_alt: payload.featuredImageAlt },
        });
      } catch { /* post meta write is best-effort; theme/plugin may register it */ }
    }

    // ── 5. Write ACF fields ─────────────────────────────────────────────
    if (payload.acf && Object.keys(payload.acf).length > 0) {
      try {
        await this.client.post(`/wp/v2/${restBase}/${newPostId}`, { acf: payload.acf });
      } catch { /* ACF REST write requires ACF PRO — best-effort */ }
    }

    // ── 6. Write taxonomy terms (translated names) ──────────────────────
    if (payload.taxonomies && Object.keys(payload.taxonomies).length > 0) {
      try {
        const taxData = await this.client.get<Record<string, any>>("/wp/v2/taxonomies");
        const termIdMap: Record<string, number[]> = {};

        for (const [taxSlug, terms] of Object.entries(payload.taxonomies)) {
          const tax = taxData[taxSlug];
          if (!tax?.rest_base) continue;
          const termRestBase = tax.rest_base;
          const ids: number[] = [];
          for (const term of terms) {
            try {
              // Try to find existing term by translated name
              const existing = await this.client.get<any[]>(
                `/wp/v2/${termRestBase}?search=${encodeURIComponent(term.name)}&lang=${payload.targetLanguage}&per_page=5`
              );
              const found = (existing ?? []).find((t: any) => t.name.toLowerCase() === term.name.toLowerCase());
              if (found) {
                ids.push(found.id);
              } else {
                // Create new term in target language
                const created = await this.client.post<any>(`/wp/v2/${termRestBase}`, {
                  name: term.name, slug: term.slug, lang: payload.targetLanguage,
                });
                if (created?.id) ids.push(created.id);
              }
            } catch { /* individual term errors are non-fatal */ }
          }
          if (ids.length > 0) termIdMap[taxSlug] = ids;
        }

        if (Object.keys(termIdMap).length > 0) {
          await this.client.post(`/wp/v2/${restBase}/${newPostId}`, termIdMap);
        }
      } catch (taxErr: any) {
        console.warn(`[Polylang] Taxonomy write-back failed for post ${newPostId}: ${taxErr?.message ?? taxErr}`);
      }
    }

    return { postId: newPostId, link: (newPost.link as string) ?? "" };
  }

  async updateMenuItemLabel(menuItemId: number, translatedLabel: string): Promise<void> {
    try {
      await this.client.post(`/wp/v2/menu-items/${menuItemId}`, { title: translatedLabel });
    } catch { /* best-effort */ }
  }

  async listMenuItems(): Promise<WPMenuItem[]> {
    return listMenuItemsViaWPRest(this.client);
  }

  private restBaseCache: Record<string, string> = {};
  private async getRestBase(postType: string): Promise<string> {
    if (this.restBaseCache[postType]) return this.restBaseCache[postType];
    const types = await this.client.get<Record<string, any>>("/wp/v2/types");
    for (const [, pt] of Object.entries(types ?? {})) {
      if ((pt as any).slug === postType) {
        this.restBaseCache[postType] = (pt as any).rest_base;
        return (pt as any).rest_base;
      }
    }
    return postType + "s";
  }

  private async fetchTaxonomiesForPost(post: any, postType: string): Promise<Record<string, WPTerm[]>> {
    const result: Record<string, WPTerm[]> = {};
    try {
      const taxData = await this.client.get<Record<string, any>>("/wp/v2/taxonomies");
      for (const [taxSlug, tax] of Object.entries(taxData ?? {})) {
        const t = tax as any;
        if (!Array.isArray(t.types) || !t.types.includes(postType)) continue;
        const termIds: number[] = post[taxSlug] ?? post[t.rest_base] ?? [];
        if (!Array.isArray(termIds) || termIds.length === 0) continue;
        const restBase = t.rest_base ?? taxSlug;
        const terms = await this.client.get<any[]>(`/wp/v2/${restBase}?include=${termIds.join(",")}`);
        result[taxSlug] = (terms ?? []).map((tr: any) => ({
          id: tr.id, name: tr.name, slug: tr.slug, description: tr.description ?? "", taxonomy: taxSlug,
        }));
      }
    } catch { /* optional */ }
    return result;
  }
}

// ─── Shared Menu Extraction ───────────────────────────────────────────────────
// Uses WP REST API /wp/v2/menus + /wp/v2/menu-items (available in WP 5.9+
// when the Gutenberg block editor is active).  Falls back to an empty array
// on older WP versions or when the endpoint is unavailable.

async function listMenuItemsViaWPRest(client: WordpressRestClient): Promise<WPMenuItem[]> {
  try {
    const menus = await client.get<any[]>("/wp/v2/menus?per_page=100");
    if (!Array.isArray(menus) || menus.length === 0) return [];

    const items: WPMenuItem[] = [];
    for (const menu of menus) {
      try {
        const menuItems = await client.get<any[]>(`/wp/v2/menu-items?menus=${menu.id}&per_page=100`);
        for (const item of menuItems ?? []) {
          const label = item.title?.rendered ?? item.title ?? "";
          if (!label.trim()) continue;
          items.push({
            id: item.id,
            menuId: menu.id,
            menuName: menu.name ?? String(menu.id),
            label,
            url: item.url ?? "",
            order: item.menu_order ?? 0,
          });
        }
      } catch { /* best-effort per-menu */ }
    }
    return items;
  } catch {
    // Endpoint not available (WP < 5.9 or Gutenberg disabled) — return empty
    return [];
  }
}

/**
 * Extract navigation menu item labels as WPSegments.
 * Keyed as `menu:{menuId}:item:{itemId}:label` for stable round-tripping.
 */
export async function extractMenuSegments(adapter: MultilingualAdapter): Promise<WPSegment[]> {
  const items = await adapter.listMenuItems();
  return items
    .filter((item) => item.label.trim().length >= 2)
    .map((item) => ({
      key: `menu:${item.menuId}:item:${item.id}:label`,
      text: item.label,
      source: "menu" as const,
    }));
}

// ─── Adapter Factory ─────────────────────────────────────────────────────────

export async function createAdapter(client: WordpressRestClient, hint?: string): Promise<MultilingualAdapter> {
  // When a plugin is explicitly configured, probe only that plugin and fail hard if absent.
  if (hint === "Polylang") {
    const adapter = new PolylangAdapter(client);
    if (await adapter.probe()) return adapter;
    throw new Error(
      "Polylang plugin is not active on this site. Please verify Polylang is installed and enabled, or reconnect with the correct plugin."
    );
  }
  if (hint === "WPML") {
    const wpml = new WPMLAdapter(client);
    if (await wpml.probe()) return wpml;
    throw new Error(
      "WPML plugin is not active on this site. Please verify WPML is installed and enabled, or reconnect with the correct plugin."
    );
  }
  // Auto-detect: try WPML, then Polylang, fail explicitly if neither is found.
  const wpml = new WPMLAdapter(client);
  if (await wpml.probe()) return wpml;
  const polylang = new PolylangAdapter(client);
  if (await polylang.probe()) return polylang;
  throw new Error(
    "No multilingual plugin detected. Please install and activate WPML or Polylang, then reconnect."
  );
}

// ─── WordPress REST Client ────────────────────────────────────────────────────

export class WordpressRestClient {
  private baseUrl: string;
  private authHeader: string;

  constructor(siteUrl: string, username: string, appPassword: string) {
    this.baseUrl = siteUrl.replace(/\/$/, "") + "/wp-json";
    this.authHeader = "Basic " + Buffer.from(`${username}:${appPassword}`).toString("base64");
  }

  async get<T>(path: string): Promise<T> {
    const url = this.baseUrl + (path.startsWith("/") ? path : "/" + path);
    const res = await fetchWithRetry(url, { headers: { Authorization: this.authHeader, Accept: "application/json" } });
    if (!res.ok) throw new Error(`WP REST ${res.status}: ${await res.text()}`);
    return res.json() as Promise<T>;
  }

  async getWithHeaders<T>(path: string, params: Record<string, any> = {}): Promise<{ data: T; headers: Record<string, string> }> {
    const url = new URL(this.baseUrl + (path.startsWith("/") ? path : "/" + path));
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
    const res = await fetchWithRetry(url.toString(), { headers: { Authorization: this.authHeader, Accept: "application/json" } });
    if (!res.ok) throw new Error(`WP REST ${res.status}: ${await res.text()}`);
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k] = v; });
    return { data: (await res.json()) as T, headers };
  }

  async post<T>(path: string, body: Record<string, any>): Promise<T> {
    const url = this.baseUrl + (path.startsWith("/") ? path : "/" + path);
    const res = await fetchWithRetry(url, {
      method: "POST",
      headers: { Authorization: this.authHeader, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`WP REST POST ${res.status}: ${await res.text()}`);
    return res.json() as Promise<T>;
  }
}

// ─── Client from DB connection ────────────────────────────────────────────────

export async function getWPClient(orgId: string): Promise<{ client: WordpressRestClient; adapter: MultilingualAdapter; conn: any }> {
  const conn = await prisma.wordpressConnection.findUnique({ where: { organizationId: orgId } });
  if (!conn) throw new Error("WordPress not connected for this organization");
  const appPassword = decrypt(conn.encryptedAppPassword);
  const client = new WordpressRestClient(conn.siteUrl, conn.username, appPassword);
  const adapter = await createAdapter(client, conn.multilingualPlugin);
  return { client, adapter, conn };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractYoastMeta(post: any): Record<string, string> {
  const yoast: Record<string, string> = {};
  if (post.yoast_head_json) {
    const j = post.yoast_head_json;
    if (j.title) yoast.title = j.title;
    if (j.description) yoast.description = j.description;
    if (j.og_title) yoast.og_title = j.og_title;
    if (j.og_description) yoast.og_description = j.og_description;
  }
  // Also look at _yoast_wpseo_* meta directly (via meta field in REST)
  const meta = post.meta ?? {};
  const yoastKeys = ["_yoast_wpseo_title", "_yoast_wpseo_metadesc", "_yoast_wpseo_opengraph-title", "_yoast_wpseo_opengraph-description"];
  for (const key of yoastKeys) {
    const shortKey = key.replace("_yoast_wpseo_", "").replace("-", "_");
    if (meta[key]) yoast[shortKey] = meta[key];
  }
  return yoast;
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      if (i === retries) throw err;
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw new Error("unreachable");
}

// ─── Content Extraction & Rebuild ────────────────────────────────────────────

export interface WPSegment {
  key: string;
  text: string;
  source: "title" | "content" | "excerpt" | "slug" | "acf" | "yoast" | "taxonomy" | "alt" | "menu";
}

/**
 * Extract translatable segments from a WP post based on the mapping config.
 * Returns ordered array of {key, text} so we can put them back by key.
 */
export function extractPostSegments(post: WPPost, mapping: {
  includeTitle: boolean;
  includeContent: boolean;
  includeExcerpt: boolean;
  includeSlug: boolean;
  includeAcf: boolean;
  includeYoast: boolean;
}): WPSegment[] {
  const segs: WPSegment[] = [];

  if (mapping.includeTitle && post.title?.trim()) {
    segs.push({ key: "title", text: post.title, source: "title" });
  }

  if (mapping.includeContent && post.content?.trim()) {
    // Strip HTML to get translatable plain-text segments; preserve block structure
    const blocks = extractGutenbergSegments(post.content);
    for (const b of blocks) segs.push(b);
  }

  if (mapping.includeExcerpt) {
    const ex = stripHtml(post.excerpt ?? "").trim();
    if (ex) segs.push({ key: "excerpt", text: ex, source: "excerpt" });
  }

  if (mapping.includeSlug && post.slug?.trim()) {
    segs.push({ key: "slug", text: post.slug, source: "slug" });
  }

  if (mapping.includeYoast && post.yoast) {
    for (const [k, v] of Object.entries(post.yoast)) {
      if (v?.trim()) segs.push({ key: `yoast:${k}`, text: v, source: "yoast" });
    }
  }

  if (mapping.includeAcf && post.acf) {
    const acfSegs = extractAcfSegments("acf", post.acf);
    segs.push(...acfSegs);
  }

  if (post.taxonomies) {
    for (const [taxSlug, terms] of Object.entries(post.taxonomies)) {
      for (const term of terms) {
        if (term.name?.trim()) segs.push({ key: `tax:${taxSlug}:${term.id}:name`, text: term.name, source: "taxonomy" });
        if (term.description?.trim()) segs.push({ key: `tax:${taxSlug}:${term.id}:desc`, text: term.description, source: "taxonomy" });
      }
    }
  }

  // Featured image alt text (translatable for SEO)
  if (post.featuredImageAlt?.trim()) {
    segs.push({ key: "feat_image_alt", text: post.featuredImageAlt, source: "alt" });
  }

  return segs;
}

/**
 * Rebuild translated WP post payload from segment translations.
 */
export function rebuildPostPayload(
  originalPost: WPPost,
  translationMap: Map<string, string>,
  mapping: { includeTitle: boolean; includeContent: boolean; includeExcerpt: boolean; includeSlug: boolean; includeYoast: boolean; includeAcf: boolean }
): {
  title: string; content: string; excerpt: string; slug: string;
  acf?: Record<string, any>; yoast?: Record<string, string>;
  featuredMediaId?: number;
  featuredImageAlt?: string;
  taxonomies?: Record<string, WPTerm[]>;
} {
  const title = translationMap.get("title") ?? originalPost.title;
  const excerpt = translationMap.get("excerpt") ?? stripHtml(originalPost.excerpt ?? "");
  const slug = mapping.includeSlug ? (translationMap.get("slug") ?? originalPost.slug) : originalPost.slug;

  // Rebuild content block by block
  let content = originalPost.content;
  if (mapping.includeContent) {
    content = rebuildGutenbergContent(originalPost.content, translationMap);
  }

  // Rebuild Yoast
  let yoast: Record<string, string> | undefined;
  if (mapping.includeYoast && originalPost.yoast) {
    yoast = {};
    for (const k of Object.keys(originalPost.yoast)) {
      yoast[k] = translationMap.get(`yoast:${k}`) ?? originalPost.yoast[k];
    }
  }

  // Rebuild taxonomy terms (translated names from translationMap)
  let taxonomies: Record<string, WPTerm[]> | undefined;
  if (originalPost.taxonomies) {
    taxonomies = {};
    for (const [taxSlug, terms] of Object.entries(originalPost.taxonomies)) {
      taxonomies[taxSlug] = terms.map((term) => ({
        ...term,
        name: translationMap.get(`tax:${taxSlug}:${term.id}:name`) ?? term.name,
        description: term.description
          ? (translationMap.get(`tax:${taxSlug}:${term.id}:desc`) ?? term.description)
          : undefined,
      }));
    }
  }

  // Rebuild ACF
  let acf: Record<string, any> | undefined;
  if (mapping.includeAcf && originalPost.acf) {
    acf = rebuildAcf("acf", originalPost.acf, translationMap);
  }

  return {
    title, content, excerpt, slug, acf, yoast, taxonomies,
    featuredMediaId: originalPost.featuredMediaId,
    featuredImageAlt: translationMap.get("feat_image_alt") ?? originalPost.featuredImageAlt,
  };
}

// ─── Gutenberg Block Parsing ──────────────────────────────────────────────────

function extractGutenbergSegments(html: string): WPSegment[] {
  const segs: WPSegment[] = [];
  // Split on Gutenberg block comment markers (same pattern used in rebuild).
  // IMPORTANT: preserve the raw HTML of each block so inline markup (bold, italic,
  // links, spans) is NOT lost during translation.  The AI translation prompt instructs
  // the model to preserve HTML/XML tags — passing raw HTML ensures faithful round-trip.
  const blocks = html.split(/<!-- (?:\/)?wp:[^\s>]+ [^>]*?>/g).filter((b) => b.trim());
  blocks.forEach((block, idx) => {
    // Use raw HTML block (not stripped) — AI must preserve inline markup tags
    const text = block.trim();
    const plainLen = stripHtml(text).trim().length;
    if (plainLen >= 5) {
      segs.push({ key: `content:block:${idx}`, text, source: "content" });
    }
  });
  // If no Gutenberg blocks, fall back to paragraph-level (Classic editor)
  if (segs.length === 0) {
    const paragraphs: string[] = html.match(/<p[^>]*>[\s\S]*?<\/p>/gi) ?? [];
    paragraphs.forEach((p, idx) => {
      const text = p.trim(); // raw HTML preserved
      const plainLen = stripHtml(text).trim().length;
      if (plainLen >= 5) segs.push({ key: `content:p:${idx}`, text, source: "content" });
    });
  }
  if (segs.length === 0) {
    const text = stripHtml(html).trim();
    if (text) segs.push({ key: "content:plain", text, source: "content" });
  }
  return segs;
}

function rebuildGutenbergContent(originalHtml: string, translationMap: Map<string, string>): string {
  // Reconstruct by replacing text in each block while preserving block structure.
  // The split regex captures Gutenberg comment markers as separate tokens.
  const blockSplitRe = /(<!-- (?:\/)?wp:[^\s>]+ [^>]*?>)/g;
  const tokens = originalHtml.split(blockSplitRe);

  // We must match indices with extractGutenbergSegments which uses .filter(Boolean)
  // on the same split (without capture group).  Skip empty/whitespace-only content
  // tokens so indices stay aligned.
  let blockContentIdx = 0;
  const parts: string[] = [];
  for (const token of tokens) {
    if (token.startsWith("<!--")) {
      parts.push(token); // keep comment marker verbatim
    } else if (!token.trim()) {
      parts.push(token); // keep whitespace-only content verbatim, do NOT advance idx
    } else {
      const translated = translationMap.get(`content:block:${blockContentIdx}`);
      if (translated) {
        // Translated value is raw HTML (AI preserved inline markup); use directly.
        // The trailing whitespace of the original token is preserved for formatting.
        const trailingWs = token.match(/\s*$/)?.[0] ?? "";
        parts.push(translated.trimEnd() + trailingWs);
      } else {
        parts.push(token);
      }
      blockContentIdx++;
    }
  }

  // Fallback: if no Gutenberg markers were found, try paragraph-level replacement
  if (blockContentIdx === 0) {
    let pIdx = 0;
    return originalHtml.replace(/<p([^>]*)>([\s\S]*?)<\/p>/gi, (match, attrs) => {
      const translated = translationMap.get(`content:p:${pIdx++}`);
      // Translated value is a full <p>...</p> fragment — use its inner content directly
      if (translated) {
        const innerMatch = translated.match(/^<p[^>]*>([\s\S]*?)<\/p>$/i);
        return innerMatch ? `<p${attrs}>${innerMatch[1]}</p>` : `<p${attrs}>${translated}</p>`;
      }
      return match;
    });
  }

  return parts.join("");
}

/**
 * Inject translated text into an HTML fragment while preserving its structural tags.
 *
 * Strategy:
 * 1. For recognisable block-level elements (p, h1-h6, li, td, th, etc.) replace
 *    the entire inner content, discarding inline marks (which would be invalidated
 *    by the translated text anyway).
 * 2. For plain text with no tags, replace directly.
 * 3. Fallback: replace only the first non-empty text node so we never duplicate
 *    the translated string across multiple nodes.
 */
function replaceTextInHtml(html: string, newText: string): string {
  const trimmed = html.trim();

  // Pure text — no tags present
  if (!/</.test(trimmed)) return newText;

  // Recognisable block-level elements whose full inner content can be replaced
  const BLOCK_TAGS = "p|h[1-6]|li|td|th|figcaption|blockquote|pre|summary|caption|dt|dd|legend|label|button|a";
  const blockElemRe = new RegExp(
    `^(\\s*<(${BLOCK_TAGS})([^>]*)>)([\\s\\S]*?)(<\\/\\2>\\s*)$`,
    "i"
  );
  const m = trimmed.match(blockElemRe);
  if (m) {
    // Replace inner content wholesale; preserve outer tag + attributes
    return m[1] + newText + m[5];
  }

  // Fallback: replace only the first non-empty text node to avoid duplication
  let replaced = false;
  const result = html.replace(/>([^<]+)</g, (match, text) => {
    if (!replaced && text.trim()) {
      replaced = true;
      return `>${newText}<`;
    }
    return match;
  });
  return replaced ? result : html;
}

// ─── ACF Helpers ──────────────────────────────────────────────────────────────

function extractAcfSegments(prefix: string, obj: any): WPSegment[] {
  const segs: WPSegment[] = [];
  if (!obj || typeof obj !== "object") return segs;
  for (const [key, val] of Object.entries(obj)) {
    const fullKey = `${prefix}:${key}`;
    if (typeof val === "string" && val.trim().length > 3) {
      segs.push({ key: fullKey, text: val, source: "acf" });
    } else if (typeof val === "object" && val !== null && !Array.isArray(val)) {
      segs.push(...extractAcfSegments(fullKey, val));
    } else if (Array.isArray(val)) {
      val.forEach((item, i) => {
        if (typeof item === "string" && item.trim().length > 3) {
          segs.push({ key: `${fullKey}:${i}`, text: item, source: "acf" });
        } else if (typeof item === "object") {
          segs.push(...extractAcfSegments(`${fullKey}:${i}`, item));
        }
      });
    }
  }
  return segs;
}

function rebuildAcf(prefix: string, obj: any, translationMap: Map<string, string>): any {
  if (!obj || typeof obj !== "object") return obj;
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    const fullKey = `${prefix}:${key}`;
    if (typeof val === "string") {
      result[key] = translationMap.get(fullKey) ?? val;
    } else if (typeof val === "object" && val !== null && !Array.isArray(val)) {
      result[key] = rebuildAcf(fullKey, val, translationMap);
    } else if (Array.isArray(val)) {
      result[key] = val.map((item, i) => {
        if (typeof item === "string") return translationMap.get(`${fullKey}:${i}`) ?? item;
        if (typeof item === "object") return rebuildAcf(`${fullKey}:${i}`, item, translationMap);
        return item;
      });
    } else {
      result[key] = val;
    }
  }
  return result;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#160;/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ─── Word Count ────────────────────────────────────────────────────────────────

export function countSegmentWords(segs: WPSegment[]): number {
  return segs.reduce((sum, s) => sum + s.text.split(/\s+/).filter(Boolean).length, 0);
}

// ─── HMAC webhook secret generation ──────────────────────────────────────────

export function generateWebhookSecret(): string {
  return "wpwhsec_" + crypto.randomBytes(24).toString("hex");
}

export function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
