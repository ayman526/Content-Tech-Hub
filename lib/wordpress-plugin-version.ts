/**
 * Single source of truth for the WordPress plugin version.
 *
 * To release a new version, run:
 *   npx tsx scripts/bump-plugin-version.ts <new-version>
 *
 * That script updates the Version header and CONTENTECH_VERSION constant in
 * wordpress-plugin/contentech/contentech.php, then updates this constant so
 * that all three locations stay in sync automatically.
 */

export const PLUGIN_VERSION = "1.0.0";

/** localStorage key used to persist which plugin version the user dismissed the update banner for. */
export const PLUGIN_BANNER_DISMISSED_KEY = "contentech-plugin-banner-dismissed";
