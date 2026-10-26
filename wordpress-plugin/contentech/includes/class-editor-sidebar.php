<?php
/**
 * Post editor integration.
 *
 * - Gutenberg: registers a Plugin Sidebar (via sidebar.js) and a REST route
 *   that proxies Contentech API calls with the stored credentials.
 * - Classic editor: registers a meta box with per-language checkboxes and
 *   a "Send for Translation" button.
 */

class Contentech_Editor_Sidebar {

    public function __construct() {
        add_action( 'enqueue_block_editor_assets',  array( $this, 'enqueue_block_assets' ) );
        add_action( 'add_meta_boxes',               array( $this, 'add_classic_metabox' ) );
        add_action( 'admin_enqueue_scripts',        array( $this, 'enqueue_classic_assets' ) );
        add_action( 'rest_api_init',                array( $this, 'register_rest_routes' ) );
    }

    // ------------------------------------------------------------------
    // Gutenberg
    // ------------------------------------------------------------------

    public function enqueue_block_assets() {
        $post = get_post();
        if ( ! $post ) {
            return;
        }
        wp_enqueue_script(
            'contentech-sidebar',
            CONTENTECH_PLUGIN_URL . 'assets/js/sidebar.js',
            array( 'wp-plugins', 'wp-edit-post', 'wp-element', 'wp-components', 'wp-data', 'wp-i18n', 'wp-api-fetch' ),
            CONTENTECH_VERSION,
            true
        );
        wp_enqueue_style(
            'contentech-admin',
            CONTENTECH_PLUGIN_URL . 'assets/css/admin.css',
            array(),
            CONTENTECH_VERSION
        );
        wp_localize_script( 'contentech-sidebar', 'contntechSidebarData', $this->sidebar_data( $post ) );
    }

    // ------------------------------------------------------------------
    // Classic editor meta box
    // ------------------------------------------------------------------

    public function add_classic_metabox() {
        $post_types = $this->get_translatable_post_types();
        foreach ( $post_types as $pt ) {
            add_meta_box(
                'contentech-metabox',
                'Contentech',
                array( $this, 'render_classic_metabox' ),
                $pt,
                'side',
                'default'
            );
        }
    }

    public function render_classic_metabox( $post ) {
        $api  = new Contentech_Api();
        $data = $this->sidebar_data( $post );
        ?>
        <div id="contentech-metabox">
            <?php if ( ! $data['configured'] ) : ?>
                <p style="font-size:12px">
                    <?php esc_html_e( 'Contentech is not configured.', 'contentech' ); ?>
                    <a href="<?php echo esc_url( $data['settingsUrl'] ); ?>"><?php esc_html_e( 'Open Settings', 'contentech' ); ?></a>
                </p>
            <?php elseif ( ! $data['multilingualActive'] ) : ?>
                <p style="font-size:12px">
                    <?php esc_html_e( 'A multilingual plugin (WPML or Polylang) is required.', 'contentech' ); ?>
                </p>
            <?php else : ?>
                <?php if ( $data['sourceLanguage'] ) : ?>
                    <p style="font-size:12px;color:#646970;margin-bottom:8px">
                        <?php esc_html_e( 'Source:', 'contentech' ); ?>
                        <strong><?php echo esc_html( $data['sourceLanguage'] ); ?></strong>
                    </p>
                <?php endif; ?>

                <div id="contentech-status-list" style="margin-bottom:10px">
                    <span class="spinner is-active" style="float:none;margin:0"></span>
                </div>

                <?php if ( ! empty( $data['targetLanguages'] ) ) : ?>
                    <p style="font-size:12px;font-weight:600;margin-bottom:6px">
                        <?php esc_html_e( 'Send for translation:', 'contentech' ); ?>
                    </p>
                    <?php foreach ( $data['targetLanguages'] as $lang ) : ?>
                        <div class="contentech-lang-row">
                            <input
                                type="checkbox"
                                class="contentech-lang-checkbox"
                                id="ctnlng_<?php echo esc_attr( $lang['code'] ); ?>"
                                value="<?php echo esc_attr( $lang['code'] ); ?>"
                            />
                            <label for="ctnlng_<?php echo esc_attr( $lang['code'] ); ?>" style="font-size:13px">
                                <?php echo esc_html( $lang['name'] ?: $lang['code'] ); ?>
                            </label>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>

                <button type="button" id="contentech-send-btn" class="button button-primary" style="margin-top:8px;width:100%">
                    <?php esc_html_e( 'Send for Translation', 'contentech' ); ?>
                </button>
                <p id="contentech-send-notice" style="margin-top:4px;font-size:12px;font-weight:600"></p>
            <?php endif; ?>
        </div>
        <?php
    }

    public function enqueue_classic_assets( $hook ) {
        if ( ! in_array( $hook, array( 'post.php', 'post-new.php' ), true ) ) {
            return;
        }
        // Only enqueue if block editor is NOT active for this post.
        if ( $this->post_uses_block_editor() ) {
            return;
        }
        wp_enqueue_script(
            'contentech-classic-metabox',
            CONTENTECH_PLUGIN_URL . 'assets/js/classic-metabox.js',
            array( 'jquery' ),
            CONTENTECH_VERSION,
            true
        );
        wp_enqueue_style( 'contentech-admin', CONTENTECH_PLUGIN_URL . 'assets/css/admin.css', array(), CONTENTECH_VERSION );
        $post = get_post();
        wp_localize_script( 'contentech-classic-metabox', 'contntechSidebarData',
            array_merge( $this->sidebar_data( $post ), array(
                'restRoot'  => rest_url( 'contentech/v1/' ),
                'restNonce' => wp_create_nonce( 'wp_rest' ),
                'postType'  => $post ? $post->post_type : 'post',
                'postId'    => $post ? $post->ID : 0,
            ) )
        );
    }

    // ------------------------------------------------------------------
    // WP REST routes (proxy to Contentech API, authenticated via stored key)
    // ------------------------------------------------------------------

    public function register_rest_routes() {
        register_rest_route( 'contentech/v1', '/post-status', array(
            'methods'             => 'GET',
            'callback'            => array( $this, 'rest_post_status' ),
            'permission_callback' => array( $this, 'rest_permission' ),
            'args'                => array(
                'post_id' => array( 'required' => true, 'type' => 'integer' ),
            ),
        ) );

        register_rest_route( 'contentech/v1', '/send-for-translation', array(
            'methods'             => 'POST',
            'callback'            => array( $this, 'rest_send' ),
            'permission_callback' => array( $this, 'rest_permission' ),
            'args'                => array(
                'post_id'       => array( 'required' => true, 'type' => 'integer' ),
                'post_type'     => array( 'required' => false, 'type' => 'string', 'default' => 'post' ),
                'target_locales' => array( 'required' => true, 'type' => 'array', 'items' => array( 'type' => 'string' ) ),
            ),
        ) );
    }

    public function rest_permission() {
        // Global guard: caller must be logged-in and capable of editing at least
        // one post. Per-post capability is checked inside each callback.
        return is_user_logged_in() && current_user_can( 'edit_posts' );
    }

    public function rest_post_status( WP_REST_Request $req ) {
        $post_id = (int) $req->get_param( 'post_id' );

        // Per-object authorization: user must be able to read/view this post.
        if ( ! current_user_can( 'edit_post', $post_id ) ) {
            return new WP_REST_Response( array( 'message' => 'Forbidden' ), 403 );
        }

        $api    = new Contentech_Api();
        $result = $api->get_post_status( $post_id );
        if ( is_wp_error( $result ) ) {
            return new WP_REST_Response( array( 'locales' => array(), 'jobUrl' => null ), 200 );
        }
        // Contentech returns { posts: [{ locale, status, jobId }] } or similar.
        // Normalize to { locales: [...], jobUrl }
        $locales = array();
        $job_url = null;
        if ( isset( $result['posts'] ) && is_array( $result['posts'] ) ) {
            $site_url = rtrim( (string) get_option( CONTENTECH_OPTION_URL, '' ), '/' );
            foreach ( $result['posts'] as $p ) {
                $locales[] = array(
                    'locale' => $p['locale'] ?? '',
                    'name'   => $p['localeName'] ?? ( $p['locale'] ?? '' ),
                    'status' => $p['status'] ?? 'MISSING',
                );
                if ( ! $job_url && ! empty( $p['wpJobId'] ) ) {
                    $job_url = $site_url . '/dashboard/integrations/wordpress?job=' . rawurlencode( $p['wpJobId'] );
                }
            }
        }
        return new WP_REST_Response( array( 'locales' => $locales, 'jobUrl' => $job_url ), 200 );
    }

    public function rest_send( WP_REST_Request $req ) {
        $post_id = (int) $req->get_param( 'post_id' );

        // Per-object authorization: caller must be able to edit this specific post.
        if ( ! current_user_can( 'edit_post', $post_id ) ) {
            return new WP_REST_Response( array( 'message' => 'Forbidden' ), 403 );
        }

        // Validate that the post exists and post_type matches.
        $post = get_post( $post_id );
        if ( ! $post ) {
            return new WP_REST_Response( array( 'message' => 'Post not found' ), 404 );
        }
        $requested_type = sanitize_key( $req->get_param( 'post_type' ) ?: 'post' );
        if ( $post->post_type !== $requested_type ) {
            return new WP_REST_Response( array( 'message' => 'Post type mismatch' ), 400 );
        }

        // Validate target_locales against configured connection target languages.
        $target_locales = array_values( (array) $req->get_param( 'target_locales' ) );
        $allowed_langs  = $this->get_allowed_target_languages();
        if ( ! empty( $allowed_langs ) ) {
            $target_locales = array_values( array_intersect( $target_locales, $allowed_langs ) );
        }
        if ( empty( $target_locales ) ) {
            return new WP_REST_Response( array( 'message' => 'No valid target languages provided' ), 400 );
        }

        $api    = new Contentech_Api();
        $result = $api->create_job( $post_id, $target_locales, $requested_type );
        if ( is_wp_error( $result ) ) {
            return new WP_REST_Response( array( 'message' => $result->get_error_message() ), 502 );
        }

        // Mark this post as tracked by Contentech so webhooks will be emitted for it.
        update_post_meta( $post_id, '_contentech_tracked', '1' );

        $site_url = rtrim( (string) get_option( CONTENTECH_OPTION_URL, '' ), '/' );
        $job_url  = null;
        // Backend returns { jobs: [{ id, ... }] }; extract first job ID for deep-link.
        $job_id = $result['jobs'][0]['id'] ?? $result['wpJobId'] ?? null;
        if ( $job_id ) {
            $job_url = $site_url . '/dashboard/integrations/wordpress?job=' . rawurlencode( $job_id );
        }
        return new WP_REST_Response( array( 'success' => true, 'jobUrl' => $job_url ), 200 );
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private function sidebar_data( $post ) {
        $api        = new Contentech_Api();
        $configured = $api->is_configured();
        $ml_active  = Contentech_Multilingual::get_active();

        $target_langs = array();
        if ( $configured && $ml_active ) {
            $langs = $api->get_languages();
            if ( ! is_wp_error( $langs ) && isset( $langs['targetLanguages'] ) ) {
                foreach ( $langs['targetLanguages'] as $lang ) {
                    $target_langs[] = array(
                        'code' => $lang['code'] ?? $lang['locale'] ?? '',
                        'name' => $lang['name'] ?? '',
                    );
                }
            }
        }

        return array(
            'configured'      => $configured,
            'multilingualActive' => (bool) $ml_active,
            'multilingualPlugin' => $ml_active ?: '',
            'sourceLanguage'  => $post ? Contentech_Multilingual::get_source_language( $post->ID ) : '',
            'targetLanguages' => $target_langs,
            'settingsUrl'     => admin_url( 'options-general.php?page=contentech' ),
            'postId'          => $post ? (int) $post->ID : 0,
        );
    }

    /**
     * Return the list of allowed target language codes from the Contentech connection.
     * Returns an empty array if the API is not configured or the call fails —
     * callers should treat an empty array as "allow all" (no server-side restriction).
     *
     * @return string[]
     */
    private function get_allowed_target_languages() {
        $api = new Contentech_Api();
        if ( ! $api->is_configured() ) {
            return array();
        }
        $result = $api->get_languages();
        if ( is_wp_error( $result ) || ! isset( $result['targetLanguages'] ) ) {
            return array();
        }
        $codes = array();
        foreach ( (array) $result['targetLanguages'] as $lang ) {
            $code = $lang['code'] ?? $lang['locale'] ?? '';
            if ( $code !== '' ) {
                $codes[] = $code;
            }
        }
        return $codes;
    }

    private function get_translatable_post_types() {
        return array_values( get_post_types( array( 'public' => true ) ) );
    }

    private function post_uses_block_editor() {
        if ( ! function_exists( 'use_block_editor_for_post' ) ) {
            return false;
        }
        $post = get_post();
        return $post ? use_block_editor_for_post( $post ) : false;
    }
}
