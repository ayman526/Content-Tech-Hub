=== Contentech ===
Contributors: contentech
Tags: translation, multilingual, WPML, Polylang, i18n
Requires at least: 6.0
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 1.0.0
License: Proprietary

Connect WordPress to the Contentech enterprise translation platform.

== Description ==

The Contentech companion plugin bridges your WordPress site and the Contentech
translation management platform, allowing editors to send posts for translation
and monitor status without leaving the WordPress admin.

Features:
* Settings page — enter your Contentech site URL and API key; run a connectivity test.
* Post editor sidebar — Gutenberg panel and Classic editor metabox showing per-language
  status badges, a target-language multi-select, and a "Send for Translation" button.
* List table column — per-language status badges on the Posts / Pages / CPT list tables,
  with a filter dropdown (untranslated / in progress / up to date / stale / failed).
* Outbound webhooks — signs and emits post.updated and post.deleted events to Contentech
  whenever tracked content changes, with automatic WP-Cron retries on transient failures.

Requirements: WPML or Polylang must be active.

== Installation ==

1. Download contentech-1.0.0.zip from your Contentech dashboard
   (WordPress Connector → Download Plugin).
2. In your WordPress admin go to Plugins → Add New → Upload Plugin.
3. Choose the downloaded zip and click Install Now.
4. Activate the plugin.
5. Go to Settings → Contentech and enter your Contentech Site URL and API key.
6. Click "Save & Test Connection". A green confirmation confirms the link.

== Changelog ==

= 1.0.0 =
* Initial release.
