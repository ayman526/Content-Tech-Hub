<?php
/**
 * Multilingual plugin detection.
 *
 * Checks for WPML and Polylang on admin_init.
 * Shows a dismissible admin notice if neither is active.
 * Exposes detection results to JavaScript via wp_localize_script.
 */

class Contentech_Multilingual {

    /** @var string|null  'wpml' | 'polylang' | null */
    private static $detected = null;

    public function __construct() {
        add_action( 'admin_init', array( $this, 'detect' ) );
        add_action( 'admin_notices', array( $this, 'maybe_show_prereq_notice' ) );
        add_action( 'wp_ajax_contentech_dismiss_notice', array( $this, 'dismiss_notice' ) );
    }

    public function detect() {
        if ( defined( 'ICL_SITEPRESS_VERSION' ) || class_exists( 'SitePress' ) ) {
            self::$detected = 'wpml';
        } elseif ( function_exists( 'pll_the_languages' ) || defined( 'POLYLANG_VERSION' ) ) {
            self::$detected = 'polylang';
        } else {
            self::$detected = null;
        }
    }

    /**
     * Return the detected multilingual plugin slug, or null.
     */
    public static function get_active() {
        return self::$detected;
    }

    /**
     * Return the source language code as understood by the active multilingual plugin.
     * Returns empty string if detection failed or no current post.
     */
    public static function get_source_language( $post_id = null ) {
        if ( self::$detected === 'wpml' ) {
            $details = apply_filters( 'wpml_post_language_details', null, $post_id );
            return is_array( $details ) ? ( $details['language_code'] ?? '' ) : '';
        }
        if ( self::$detected === 'polylang' ) {
            if ( function_exists( 'pll_get_post_language' ) && $post_id ) {
                return pll_get_post_language( $post_id, 'slug' ) ?: '';
            }
        }
        return '';
    }

    public function maybe_show_prereq_notice() {
        // Only show in WP admin pages that aren't the Contentech settings page.
        $screen = get_current_screen();
        if ( ! $screen ) {
            return;
        }
        // Never show if dismissed or if a multilingual plugin is active.
        if ( self::$detected !== null ) {
            return;
        }
        if ( get_option( 'contentech_dismissed_notice' ) ) {
            return;
        }
        // Only show to admins.
        if ( ! current_user_can( 'activate_plugins' ) ) {
            return;
        }
        ?>
        <div class="notice notice-warning contentech-prereq-notice" id="contentech-prereq-notice">
            <p>
                <strong><?php esc_html_e( 'Contentech:', 'contentech' ); ?></strong>
                <?php
                printf(
                    /* translators: %1$s: WPML link, %2$s: Polylang link */
                    esc_html__( 'The Contentech plugin requires a multilingual plugin. Please install and activate %1$s or %2$s to enable translation workflows.', 'contentech' ),
                    '<a href="https://wpml.org" target="_blank" rel="noopener">WPML</a>',
                    '<a href="https://polylang.pro" target="_blank" rel="noopener">Polylang</a>'
                );
                ?>
                &nbsp;<a href="#" id="contentech-dismiss-notice"><?php esc_html_e( 'Dismiss', 'contentech' ); ?></a>
            </p>
        </div>
        <script>
        (function(){
            var el = document.getElementById('contentech-dismiss-notice');
            if (!el) return;
            el.addEventListener('click', function(e){
                e.preventDefault();
                document.getElementById('contentech-prereq-notice').style.display = 'none';
                var xhr = new XMLHttpRequest();
                xhr.open('POST', '<?php echo esc_js( admin_url( 'admin-ajax.php' ) ); ?>');
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                xhr.send('action=contentech_dismiss_notice&nonce=<?php echo esc_js( wp_create_nonce( 'contentech_dismiss' ) ); ?>');
            });
        })();
        </script>
        <?php
    }

    public function dismiss_notice() {
        check_ajax_referer( 'contentech_dismiss', 'nonce' );
        update_option( 'contentech_dismissed_notice', 1 );
        wp_die( '1' );
    }
}
