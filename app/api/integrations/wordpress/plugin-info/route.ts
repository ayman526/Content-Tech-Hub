import { NextRequest, NextResponse } from "next/server";
import { PLUGIN_VERSION } from "@/lib/wordpress-plugin-version";

/**
 * GET /api/integrations/wordpress/plugin-info
 *
 * Public endpoint — no authentication required.
 * Returns plugin metadata in WordPress transient-compatible JSON format so
 * the companion WordPress plugin can hook into the native WP update system.
 *
 * WordPress expects:
 *   plugins_api response  → { name, slug, version, author, homepage,
 *                             download_link, sections: { changelog } }
 *   update_plugins object → { id, slug, plugin, new_version, url, package }
 *
 * The caller (WordPress plugin) passes its own API key via the
 * X-API-Key header so the download_link / package URL can be personalised
 * with a key-based token that the /download endpoint will accept.
 */

const PLUGIN_SLUG = "contentech";
const PLUGIN_FILE = "contentech/contentech.php"; // relative to wp-content/plugins

const CHANGELOG = `
= 1.0.0 =
* Initial release.
* Settings page with API key and site URL configuration.
* Gutenberg sidebar and Classic editor meta-box for submitting posts for translation.
* Translation status column in post list tables.
* Outbound signed webhooks for post.updated and post.deleted events.
* WPML detection and abstraction layer.
`.trim();

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;

  // The plugin sends its API key so we can embed it in the download URL,
  // allowing WordPress to fetch the zip without a browser session.
  const apiKey = req.headers.get("x-api-key") ?? "";
  const downloadUrl = apiKey
    ? `${origin}/api/integrations/wordpress/download?api_key=${encodeURIComponent(apiKey)}`
    : `${origin}/api/integrations/wordpress/download`;

  const body = {
    name:          "Contentech",
    slug:          PLUGIN_SLUG,
    version:       PLUGIN_VERSION,
    author:        "Contentech",
    author_profile: "https://contentech.io",
    homepage:      "https://contentech.io",
    requires:      "6.0",
    requires_php:  "7.4",
    last_updated:  "2025-01-01",
    download_link: downloadUrl,
    sections: {
      description: "Connect your WordPress site to the Contentech enterprise translation platform.",
      changelog:   CHANGELOG,
    },
    update: {
      id:          PLUGIN_FILE,
      slug:        PLUGIN_SLUG,
      plugin:      PLUGIN_FILE,
      new_version: PLUGIN_VERSION,
      url:         "https://contentech.io",
      package:     downloadUrl,
    },
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, max-age=43200", // 12 h — mirrors the plugin-side transient TTL
    },
  });
}
