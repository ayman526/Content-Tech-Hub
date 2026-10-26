/**
 * E2E test for PolylangAdapter using a mock WordPress REST API server.
 *
 * Run with:  npx tsx --test __tests__/polylang-adapter.test.ts
 */

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { PolylangAdapter, WordpressRestClient } from "../lib/wordpress-client.js";

// ─── Minimal mock server ─────────────────────────────────────────────────────

type RouteHandler = (req: http.IncomingMessage, res: http.ServerResponse) => void;

function createMockServer(routes: Record<string, RouteHandler>): http.Server {
  return http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const path = url.pathname;

    // Match by exact path first, then prefix
    const handler = routes[path] ?? Object.entries(routes).find(([k]) => path.startsWith(k))?.[1];
    if (handler) {
      handler(req, res);
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: `Mock: no handler for ${path}` }));
    }
  });
}

function json(res: http.ServerResponse, data: unknown, status = 200, extra: Record<string, string> = {}) {
  res.writeHead(status, { "Content-Type": "application/json", "X-WP-Total": "2", ...extra });
  res.end(JSON.stringify(data));
}

async function readBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let buf = "";
    req.on("data", (c) => (buf += c));
    req.on("end", () => resolve(buf ? JSON.parse(buf) : {}));
  });
}

// ─── Shared state captured by mock server ────────────────────────────────────

let capturedPostBody: any = null;
let capturedLinkBody: any = null;
let capturedYoastBody: any = null;
let capturedAcfBody: any = null;
let capturedTaxonomyBody: any = null;
let capturedFeatAltBody: any = null;

// ─── Mock data ───────────────────────────────────────────────────────────────

const LANGUAGES = [
  { slug: "en", name: "English", is_default: true },
  { slug: "fr", name: "French", is_default: false },
];

const POST_TYPES = {
  post: { slug: "post", name: "Posts", rest_base: "posts", show_in_rest: true, hierarchical: false },
  page: { slug: "page", name: "Pages", rest_base: "pages", show_in_rest: true, hierarchical: true },
};

const SOURCE_POST = {
  id: 42,
  title: { raw: "Hello World", rendered: "Hello World" },
  content: { raw: "<p>Original content.</p>", rendered: "<p>Original content.</p>" },
  excerpt: { raw: "Original excerpt", rendered: "Original excerpt" },
  slug: "hello-world",
  status: "publish",
  link: "https://example.com/hello-world",
  modified: "2024-01-01T00:00:00",
  featured_media: 7,
  acf: { tagline: "Buy now" },
  yoast_head_json: { title: "SEO Title", description: "SEO Desc" },
  meta: {},
  categories: [5],
};

const TAXONOMIES = {
  category: {
    slug: "category",
    rest_base: "categories",
    types: ["post"],
  },
};

const CATEGORIES = [{ id: 5, name: "News", slug: "news", description: "News category", taxonomy: "category" }];

const FEATURED_MEDIA = { id: 7, alt_text: "A beautiful image" };

const CREATED_POST = { id: 99, link: "https://example.com/fr/bonjour-monde" };

// ─── Build mock routes ────────────────────────────────────────────────────────

function buildRoutes(): Record<string, RouteHandler> {
  return {
    "/wp-json/pll/v1/languages": (_req, res) => json(res, LANGUAGES),

    "/wp-json/pll/v1/posts": async (req, res) => {
      capturedLinkBody = await readBody(req);
      json(res, { success: true });
    },

    "/wp-json/wp/v2/types": (_req, res) => json(res, POST_TYPES),

    "/wp-json/wp/v2/taxonomies": (_req, res) => json(res, TAXONOMIES),

    "/wp-json/wp/v2/posts": async (req, res) => {
      const url = new URL(req.url ?? "/", "http://localhost");
      // GET list
      if (req.method === "GET") {
        json(res, [SOURCE_POST], 200, { "X-WP-Total": "1" });
        return;
      }
      // POST create
      capturedPostBody = await readBody(req);
      json(res, CREATED_POST, 201);
    },

    "/wp-json/wp/v2/posts/42": (_req, res) => json(res, SOURCE_POST),

    "/wp-json/wp/v2/posts/99": async (req, res) => {
      if (req.method === "POST") {
        const body = await readBody(req);
        if (body.meta?._yoast_wpseo_title) capturedYoastBody = body;
        else if (body.acf) capturedAcfBody = body;
        else if (body.meta?._contentech_feat_img_alt) capturedFeatAltBody = body;
        else if (body.categories) capturedTaxonomyBody = body;
        json(res, { id: 99 });
        return;
      }
      json(res, CREATED_POST);
    },

    "/wp-json/wp/v2/media/7": (_req, res) => json(res, FEATURED_MEDIA),

    "/wp-json/wp/v2/categories": (req, res) => {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (req.method === "GET") {
        const search = url.searchParams.get("search") ?? "";
        // Simulate: no existing translated category
        json(res, search ? [] : CATEGORIES);
        return;
      }
      // POST: create term
      json(res, { id: 88, name: "Actualités", slug: "actualites" }, 201);
    },

    "/wp-json/wp/v2/categories/": (req, res) => {
      // include=5
      json(res, CATEGORIES);
    },
  };
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe("PolylangAdapter", () => {
  let server: http.Server;
  let port: number;
  let adapter: PolylangAdapter;

  before(async () => {
    // Reset captured state
    capturedPostBody = null;
    capturedLinkBody = null;
    capturedYoastBody = null;
    capturedAcfBody = null;
    capturedTaxonomyBody = null;
    capturedFeatAltBody = null;

    server = createMockServer(buildRoutes());
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    port = (server.address() as any).port;

    const client = new WordpressRestClient(`http://127.0.0.1:${port}`, "admin", "pass");
    adapter = new PolylangAdapter(client);
  });

  after(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  });

  test("probe() returns true when /pll/v1/languages is reachable", async () => {
    const result = await adapter.probe();
    assert.equal(result, true);
  });

  test("listLanguages() maps slug→code and detects default", async () => {
    const langs = await adapter.listLanguages();
    assert.equal(langs.length, 2);
    const en = langs.find((l) => l.code === "en");
    const fr = langs.find((l) => l.code === "fr");
    assert.ok(en, "English language not found");
    assert.ok(fr, "French language not found");
    assert.equal(en!.isDefault, true);
    assert.equal(fr!.isDefault, false);
  });

  test("listPostTypes() uses dynamic REST types endpoint", async () => {
    const types = await adapter.listPostTypes();
    const post = types.find((t) => t.slug === "post");
    assert.ok(post, "post type not found");
    assert.equal(post!.restBase, "posts");
  });

  test("listPosts() uses dynamic restBase from /wp/v2/types", async () => {
    const { posts, total } = await adapter.listPosts("post", 1, 20, "en");
    assert.equal(total, 1);
    assert.equal(posts[0].id, 42);
  });

  test("getPost() fetches ACF, Yoast, featured image alt, and taxonomies", async () => {
    const post = await adapter.getPost(42, "post");
    assert.equal(post.id, 42);
    assert.equal(post.title, "Hello World");
    // ACF
    assert.deepEqual(post.acf, { tagline: "Buy now" });
    // Yoast
    assert.equal(post.yoast?.title, "SEO Title");
    assert.equal(post.yoast?.description, "SEO Desc");
    // Featured image alt
    assert.equal(post.featuredMediaId, 7);
    assert.equal(post.featuredImageAlt, "A beautiful image");
  });

  test("createTranslation() throws when Polylang link step fails (no orphan posts)", async () => {
    // Spin up a separate server where /pll/v1/posts returns 500
    let brokenLinkCalled = false;
    const brokenRoutes: Record<string, RouteHandler> = {
      ...buildRoutes(),
      "/wp-json/pll/v1/posts": async (req, res) => {
        brokenLinkCalled = true;
        await readBody(req);
        json(res, { message: "Internal Server Error" }, 500);
      },
    };
    const brokenServer = createMockServer(brokenRoutes);
    await new Promise<void>((resolve) => brokenServer.listen(0, "127.0.0.1", resolve));
    const brokenPort = (brokenServer.address() as any).port;
    const brokenClient = new WordpressRestClient(`http://127.0.0.1:${brokenPort}`, "admin", "pass");
    const brokenAdapter = new PolylangAdapter(brokenClient);

    try {
      await assert.rejects(
        () => brokenAdapter.createTranslation({
          originalPostId: 42,
          postType: "post",
          targetLanguage: "fr",
          title: "Bonjour",
          content: "<p>Contenu.</p>",
          status: "draft",
        }),
        /500/
      );
      assert.ok(brokenLinkCalled, "Polylang link endpoint was not called");
    } finally {
      await new Promise<void>((resolve) => brokenServer.close(() => resolve()));
    }
  });

  test("createTranslation() creates post, links via /pll/v1/posts, writes Yoast+ACF+alt", async () => {
    const result = await adapter.createTranslation({
      originalPostId: 42,
      postType: "post",
      targetLanguage: "fr",
      title: "Bonjour le monde",
      content: "<p>Contenu traduit.</p>",
      excerpt: "Extrait",
      slug: "bonjour-monde",
      status: "draft",
      acf: { tagline: "Achetez maintenant" },
      yoast: { title: "Titre SEO", description: "Desc SEO" },
      featuredMediaId: 7,
      featuredImageAlt: "Une belle image",
      taxonomies: {
        category: [{ id: 5, name: "Actualités", slug: "actualites", description: "", taxonomy: "category" }],
      },
    });

    // New post created
    assert.equal(result.postId, 99);
    assert.equal(result.link, "https://example.com/fr/bonjour-monde");

    // Post body has correct language
    assert.equal(capturedPostBody?.lang, "fr");
    assert.equal(capturedPostBody?.title, "Bonjour le monde");

    // Polylang linking call happened
    assert.ok(capturedLinkBody, "Polylang link POST was not called");
    assert.equal(capturedLinkBody.post_id, 99);
    assert.equal(capturedLinkBody.lang, "fr");
    assert.equal(capturedLinkBody.original_id, 42);

    // Yoast meta written
    assert.ok(capturedYoastBody, "Yoast meta POST was not called");
    assert.equal(capturedYoastBody.meta._yoast_wpseo_title, "Titre SEO");
    assert.equal(capturedYoastBody.meta._yoast_wpseo_metadesc, "Desc SEO");

    // ACF written
    assert.ok(capturedAcfBody, "ACF POST was not called");
    assert.equal(capturedAcfBody.acf.tagline, "Achetez maintenant");

    // Featured image alt written
    assert.ok(capturedFeatAltBody, "Featured image alt POST was not called");
    assert.equal(capturedFeatAltBody.meta._contentech_feat_img_alt, "Une belle image");
  });
});
