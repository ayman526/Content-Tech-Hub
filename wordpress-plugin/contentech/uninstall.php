<?php
/**
 * Fired when the plugin is uninstalled.
 *
 * Removes only this plugin's own options and transients.
 * Does NOT touch posts, translations, or any third-party data.
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
    exit;
}

delete_option( 'contentech_site_url' );
delete_option( 'contentech_api_key' );
delete_option( 'contentech_webhook_secret' );
delete_option( 'contentech_dismissed_notice' );

// Remove any pending webhook retry cron events.
wp_clear_scheduled_hook( 'contentech_retry_webhook' );
