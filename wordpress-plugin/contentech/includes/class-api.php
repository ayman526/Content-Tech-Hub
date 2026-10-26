<?php
/**
 * Thin HTTP wrapper around the Contentech REST API.
 * All requests are authenticated with the stored API key.
 * On every public method, a missing site URL or API key returns WP_Error
 * immediately so callers can no-op gracefully.
 */

class Contentech_Api {

    private $site_url;
    private $api_key;

    public function __construct() {
        $this->site_url = rtrim( (string) get_option( CONTENTECH_OPTION_URL, '' ), '/' );
        $this->api_key  = (string) get_option( CONTENTECH_OPTION_KEY, '' );
    }

    public function is_configured() {
        return $this->site_url !== '' && $this->api_key !== '';
    }

    /**
     * Test connection against the Contentech /api/integrations/wordpress/connect endpoint.
     * Returns array( 'success' => true, 'webhookSecret' => '...' ) or WP_Error.
     */
    public function test_connection( $site_url, $api_key ) {
        $normalized = rtrim( $site_url, '/' );
        $endpoint   = $normalized . '/api/integrations/wordpress/connect';

        $current_site_url = get_bloginfo( 'url' );

        $response = wp_remote_post( $endpoint, array(
            'timeout' => 15,
            'headers' => array(
                'Content-Type'  => 'application/json',
                'Authorization' => 'Bearer ' . $api_key,
            ),
            'body' => wp_json_encode( array(
                'siteUrl'     => $current_site_url,
                'pluginVersion' => CONTENTECH_VERSION,
            ) ),
        ) );

        if ( is_wp_error( $response ) ) {
            return $response;
        }

        $code = wp_remote_retrieve_response_code( $response );
        $body = json_decode( wp_remote_retrieve_body( $response ), true );

        if ( $code === 403 ) {
            return new WP_Error( 'plan_required', esc_html__( 'Your Contentech plan does not include the WordPress connector. Please upgrade to Agency or Enterprise.', 'contentech' ) );
        }

        if ( $code < 200 || $code >= 300 ) {
            $msg = isset( $body['error'] ) ? $body['error'] : __( 'Unexpected response from Contentech.', 'contentech' );
            return new WP_Error( 'api_error', esc_html( $msg ) );
        }

        $secret = isset( $body['webhookSecret'] ) ? $body['webhookSecret'] : '';
        return array( 'success' => true, 'webhookSecret' => $secret );
    }

    /**
     * Fetch per-language translation status for a post.
     * Returns array of locale objects or WP_Error.
     */
    public function get_post_status( $wp_post_id ) {
        if ( ! $this->is_configured() ) {
            return new WP_Error( 'not_configured', '' );
        }
        $endpoint = $this->site_url . '/api/integrations/wordpress/posts?wpPostId=' . absint( $wp_post_id );
        return $this->get( $endpoint );
    }

    /**
     * Submit a post for translation via the Contentech jobs endpoint.
     *
     * @param int   $wp_post_id     WordPress post ID.
     * @param array $target_locales Array of locale codes.
     * @param string $post_type     WordPress post type slug.
     * @return array|WP_Error
     */
    public function create_job( $wp_post_id, $target_locales, $post_type = 'post' ) {
        if ( ! $this->is_configured() ) {
            return new WP_Error( 'not_configured', '' );
        }
        $endpoint = $this->site_url . '/api/integrations/wordpress/jobs';
        // Backend expects { postIds: int[], targetLanguages: string[], postType: string }.
        return $this->post( $endpoint, array(
            'postIds'         => array( (int) $wp_post_id ),
            'targetLanguages' => array_values( (array) $target_locales ),
            'postType'        => $post_type,
        ) );
    }

    /**
     * Fetch languages configured in the Contentech connection.
     * Returns array( 'sourceLanguage' => ..., 'targetLanguages' => [...] ) or WP_Error.
     */
    public function get_languages() {
        if ( ! $this->is_configured() ) {
            return new WP_Error( 'not_configured', '' );
        }
        return $this->get( $this->site_url . '/api/integrations/wordpress/discover' );
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private function get( $url ) {
        $response = wp_remote_get( $url, array(
            'timeout' => 10,
            'headers' => $this->auth_headers(),
        ) );
        return $this->parse( $response );
    }

    private function post( $url, $data ) {
        $response = wp_remote_post( $url, array(
            'timeout' => 15,
            'headers' => array_merge( $this->auth_headers(), array( 'Content-Type' => 'application/json' ) ),
            'body'    => wp_json_encode( $data ),
        ) );
        return $this->parse( $response );
    }

    private function auth_headers() {
        return array( 'Authorization' => 'Bearer ' . $this->api_key );
    }

    private function parse( $response ) {
        if ( is_wp_error( $response ) ) {
            return $response;
        }
        $code = wp_remote_retrieve_response_code( $response );
        $body = json_decode( wp_remote_retrieve_body( $response ), true );
        if ( $code < 200 || $code >= 300 ) {
            $msg = isset( $body['error'] ) ? $body['error'] : 'API error ' . $code;
            return new WP_Error( 'api_error', esc_html( $msg ) );
        }
        return $body;
    }
}
