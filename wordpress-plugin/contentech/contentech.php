<?php
/**
 * Plugin Name:  Contentech
 * Plugin URI:   https://contentech.io
 * Description:  Connect your WordPress site to the Contentech enterprise translation platform. Send posts for translation, view per-language status from the post editor and list tables, and receive finished translations automatically.
 * Version:      1.0.0
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Author:       Contentech
 * Author URI:   https://contentech.io
 * License:      Proprietary
 * Text Domain:  contentech
 *
 * Changelog:
 *   1.0.0 - 2025-01-01 - Initial release. Settings page, post-editor sidebar,
 *                         list-table column, outbound webhooks, WPML detection.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'CONTENTECH_VERSION',    '1.0.0' );
define( 'CONTENTECH_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'CONTENTECH_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'CONTENTECH_OPTION_URL',    'contentech_site_url' );
define( 'CONTENTECH_OPTION_KEY',    'contentech_api_key' );
define( 'CONTENTECH_OPTION_SECRET', 'contentech_webhook_secret' );

spl_autoload_register( function ( $class ) {
    $prefix = 'Contentech_';
    if ( strpos( $class, $prefix ) !== 0 ) {
        return;
    }
    $tail = substr( $class, strlen( $prefix ) );
    $file = CONTENTECH_PLUGIN_DIR . 'includes/class-' . strtolower( str_replace( '_', '-', $tail ) ) . '.php';
    if ( file_exists( $file ) ) {
        require_once $file;
    }
} );

function contentech_instance() {
    static $instance = null;
    if ( null === $instance ) {
        $instance = new Contentech_Plugin();
    }
    return $instance;
}
add_action( 'plugins_loaded', 'contentech_instance' );

register_activation_hook(   __FILE__, array( 'Contentech_Plugin', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'Contentech_Plugin', 'deactivate' ) );

class Contentech_Plugin {

    public function __construct() {
        new Contentech_Settings();
        new Contentech_Multilingual();
        new Contentech_Editor_Sidebar();
        new Contentech_Admin_Column();
        new Contentech_Webhooks();
    }

    public static function activate() {
        if ( ! wp_next_scheduled( 'contentech_retry_webhook' ) ) {
            // Hook is registered per-event via WP-Cron schedule args; nothing global needed.
        }
    }

    public static function deactivate() {
        wp_clear_scheduled_hook( 'contentech_retry_webhook' );
    }
}
