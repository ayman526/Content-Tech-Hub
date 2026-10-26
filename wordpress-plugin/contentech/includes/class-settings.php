<?php
/**
 * Settings → Contentech admin page.
 * Provides: Contentech Site URL, API Key, connectivity test, success/failure messaging.
 * On successful test the returned per-connection HMAC secret is persisted.
 */

class Contentech_Settings {

    const UPDATE_TRANSIENT_KEY = 'contentech_plugin_update_info';
    const UPDATE_TRANSIENT_TTL = 43200; // 12 hours in seconds

    public function __construct() {
        add_action( 'admin_menu',    array( $this, 'add_menu' ) );
        add_action( 'admin_init',    array( $this, 'register_settings' ) );
        add_action( 'admin_init',    array( $this, 'handle_test_connection' ) );
        add_action( 'admin_notices', array( $this, 'show_notices' ) );

        add_filter( 'pre_set_site_transient_update_plugins', array( $this, 'inject_update_transient' ) );
        add_filter( 'plugins_api', array( $this, 'plugin_info_api' ), 20, 3 );
    }

    // ------------------------------------------------------------------
    // Plugin update hooks
    // ------------------------------------------------------------------

    /**
     * Fetch plugin metadata from the Contentech server, caching the result
     * for 12 hours via a WordPress transient.
     *
     * @return array|false Decoded plugin-info response or false on failure.
     */
    private function fetch_plugin_info() {
        $cached = get_transient( self::UPDATE_TRANSIENT_KEY );
        if ( $cached !== false ) {
            return $cached;
        }

        $site_url = rtrim( (string) get_option( CONTENTECH_OPTION_URL, '' ), '/' );
        $api_key  = (string) get_option( CONTENTECH_OPTION_KEY, '' );

        if ( empty( $site_url ) ) {
            return false;
        }

        $args = array(
            'timeout' => 10,
            'headers' => array(),
        );

        if ( ! empty( $api_key ) ) {
            $args['headers']['X-API-Key'] = $api_key;
        }

        $response = wp_remote_get( $site_url . '/api/integrations/wordpress/plugin-info', $args );

        if ( is_wp_error( $response ) || wp_remote_retrieve_response_code( $response ) !== 200 ) {
            // Cache a short negative result so we don't hammer the server on failure.
            set_transient( self::UPDATE_TRANSIENT_KEY, false, 300 );
            return false;
        }

        $data = json_decode( wp_remote_retrieve_body( $response ), true );
        if ( ! is_array( $data ) || empty( $data['version'] ) ) {
            set_transient( self::UPDATE_TRANSIENT_KEY, false, 300 );
            return false;
        }

        set_transient( self::UPDATE_TRANSIENT_KEY, $data, self::UPDATE_TRANSIENT_TTL );
        return $data;
    }

    /**
     * Hook: pre_set_site_transient_update_plugins
     * Injects an update entry into WordPress's plugin-update transient when a
     * newer version is available from the Contentech server.
     *
     * @param object $transient The update_plugins transient object.
     * @return object
     */
    public function inject_update_transient( $transient ) {
        if ( empty( $transient->checked ) ) {
            return $transient;
        }

        $info = $this->fetch_plugin_info();
        if ( ! $info ) {
            return $transient;
        }

        $remote_version = isset( $info['version'] ) ? $info['version'] : '';
        $plugin_file    = 'contentech/contentech.php';

        if ( ! isset( $transient->checked[ $plugin_file ] ) ) {
            return $transient;
        }

        $local_version = $transient->checked[ $plugin_file ];

        if ( version_compare( $remote_version, $local_version, '>' ) ) {
            $update = new stdClass();
            $update->id          = isset( $info['update']['id'] )          ? $info['update']['id']          : "contentech/{$plugin_file}";
            $update->slug        = isset( $info['update']['slug'] )        ? $info['update']['slug']        : 'contentech';
            $update->plugin      = $plugin_file;
            $update->new_version = $remote_version;
            $update->url         = isset( $info['update']['url'] )         ? $info['update']['url']         : 'https://contentech.io';
            $update->package     = isset( $info['update']['package'] )     ? $info['update']['package']     : '';

            $transient->response[ $plugin_file ] = $update;
        }

        return $transient;
    }

    /**
     * Hook: plugins_api
     * Returns rich plugin metadata for the "View Details" popup in the
     * WordPress Plugins list when the user clicks on the update information.
     *
     * @param false|object|array $result  Default false; override to return our data.
     * @param string             $action  The type of info requested.
     * @param object             $args    The plugin API arguments.
     * @return false|object
     */
    public function plugin_info_api( $result, $action, $args ) {
        if ( 'plugin_information' !== $action ) {
            return $result;
        }

        if ( ! isset( $args->slug ) || $args->slug !== 'contentech' ) {
            return $result;
        }

        $info = $this->fetch_plugin_info();
        if ( ! $info ) {
            return $result;
        }

        $response                = new stdClass();
        $response->name          = isset( $info['name'] )         ? $info['name']         : 'Contentech';
        $response->slug          = 'contentech';
        $response->version       = isset( $info['version'] )      ? $info['version']      : CONTENTECH_VERSION;
        $response->author        = isset( $info['author'] )       ? $info['author']       : 'Contentech';
        $response->homepage      = isset( $info['homepage'] )     ? $info['homepage']     : 'https://contentech.io';
        $response->requires      = isset( $info['requires'] )     ? $info['requires']     : '6.0';
        $response->requires_php  = isset( $info['requires_php'] ) ? $info['requires_php'] : '7.4';
        $response->last_updated  = isset( $info['last_updated'] ) ? $info['last_updated'] : '';
        $response->download_link = isset( $info['download_link'] ) ? $info['download_link'] : '';
        $response->sections      = array(
            'description' => isset( $info['sections']['description'] ) ? $info['sections']['description'] : '',
            'changelog'   => isset( $info['sections']['changelog'] )   ? $info['sections']['changelog']   : '',
        );

        return $response;
    }

    public function add_menu() {
        add_options_page(
            esc_html__( 'Contentech', 'contentech' ),
            esc_html__( 'Contentech', 'contentech' ),
            'manage_options',
            'contentech',
            array( $this, 'render_page' )
        );
    }

    public function register_settings() {
        register_setting( 'contentech_settings_group', CONTENTECH_OPTION_URL,    array( 'sanitize_callback' => 'esc_url_raw' ) );
        register_setting( 'contentech_settings_group', CONTENTECH_OPTION_KEY,    array( 'sanitize_callback' => 'sanitize_text_field' ) );
        register_setting( 'contentech_settings_group', CONTENTECH_OPTION_SECRET, array( 'sanitize_callback' => 'sanitize_text_field' ) );
    }

    public function handle_test_connection() {
        if (
            ! isset( $_POST['contentech_test_connection'] ) ||
            ! check_admin_referer( 'contentech_test_nonce', 'contentech_nonce' )
        ) {
            return;
        }
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }

        $site_url = esc_url_raw( wp_unslash( $_POST[ CONTENTECH_OPTION_URL ] ?? '' ) );
        $api_key  = sanitize_text_field( wp_unslash( $_POST[ CONTENTECH_OPTION_KEY ] ?? '' ) );

        // Save first so the test can read them if needed.
        update_option( CONTENTECH_OPTION_URL, $site_url );
        update_option( CONTENTECH_OPTION_KEY, $api_key );

        $api    = new Contentech_Api();
        $result = $api->test_connection( $site_url, $api_key );

        if ( is_wp_error( $result ) ) {
            set_transient( 'contentech_notice_error', $result->get_error_message(), 60 );
        } else {
            if ( ! empty( $result['webhookSecret'] ) ) {
                update_option( CONTENTECH_OPTION_SECRET, sanitize_text_field( $result['webhookSecret'] ) );
            }
            set_transient( 'contentech_notice_success',
                __( 'Connection successful. Contentech is now linked to this site.', 'contentech' ),
                60
            );
        }

        wp_redirect( admin_url( 'options-general.php?page=contentech' ) );
        exit;
    }

    public function show_notices() {
        $screen = get_current_screen();
        if ( ! $screen || $screen->id !== 'settings_page_contentech' ) {
            return;
        }

        $success = get_transient( 'contentech_notice_success' );
        if ( $success ) {
            delete_transient( 'contentech_notice_success' );
            echo '<div class="notice notice-success is-dismissible"><p>' . esc_html( $success ) . '</p></div>';
        }

        $error = get_transient( 'contentech_notice_error' );
        if ( $error ) {
            delete_transient( 'contentech_notice_error' );
            echo '<div class="notice notice-error is-dismissible"><p>' . esc_html( $error ) . '</p></div>';
        }
    }

    public function render_page() {
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }
        $site_url  = esc_attr( get_option( CONTENTECH_OPTION_URL, '' ) );
        $api_key   = esc_attr( get_option( CONTENTECH_OPTION_KEY, '' ) );
        $has_secret = (bool) get_option( CONTENTECH_OPTION_SECRET, '' );
        ?>
        <div class="wrap">
            <h1><?php esc_html_e( 'Contentech Settings', 'contentech' ); ?></h1>
            <p>
                <?php
                printf(
                    /* translators: %s: link to Contentech dashboard */
                    esc_html__( 'Connect this WordPress site to your %s account. You will find your API key under Settings → API Keys in the Contentech dashboard.', 'contentech' ),
                    '<a href="https://contentech.io" target="_blank" rel="noopener">Contentech</a>'
                );
                ?>
            </p>

            <form method="post" action="">
                <?php wp_nonce_field( 'contentech_test_nonce', 'contentech_nonce' ); ?>

                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row">
                            <label for="contentech_site_url">
                                <?php esc_html_e( 'Contentech Site URL', 'contentech' ); ?>
                            </label>
                        </th>
                        <td>
                            <input
                                type="url"
                                id="contentech_site_url"
                                name="<?php echo esc_attr( CONTENTECH_OPTION_URL ); ?>"
                                value="<?php echo $site_url; ?>"
                                class="regular-text"
                                placeholder="https://app.contentech.io"
                            />
                            <p class="description">
                                <?php esc_html_e( 'The URL of your Contentech instance (no trailing slash).', 'contentech' ); ?>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="contentech_api_key">
                                <?php esc_html_e( 'API Key', 'contentech' ); ?>
                            </label>
                        </th>
                        <td>
                            <input
                                type="password"
                                id="contentech_api_key"
                                name="<?php echo esc_attr( CONTENTECH_OPTION_KEY ); ?>"
                                value="<?php echo $api_key; ?>"
                                class="regular-text"
                                autocomplete="new-password"
                                placeholder="ctk_live_..."
                            />
                            <p class="description">
                                <?php esc_html_e( 'Your API key (starts with ctk_live_). Keep this secret.', 'contentech' ); ?>
                            </p>
                        </td>
                    </tr>
                    <?php if ( $has_secret ) : ?>
                    <tr>
                        <th scope="row"><?php esc_html_e( 'Connection Status', 'contentech' ); ?></th>
                        <td>
                            <span style="color:#00a32a;font-weight:600;">&#10003; <?php esc_html_e( 'Connected', 'contentech' ); ?></span>
                            <p class="description">
                                <?php esc_html_e( 'Webhook secret is stored. Outbound webhooks are active.', 'contentech' ); ?>
                            </p>
                        </td>
                    </tr>
                    <?php endif; ?>
                </table>

                <p class="submit">
                    <button type="submit" name="contentech_test_connection" class="button button-primary">
                        <?php esc_html_e( 'Save &amp; Test Connection', 'contentech' ); ?>
                    </button>
                </p>
            </form>
        </div>
        <?php
    }
}
