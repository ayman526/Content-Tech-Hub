<?php
/**
 * Outbound webhooks to Contentech.
 *
 * - save_post → emits `post.updated` to Contentech.
 * - before_delete_post → emits `post.deleted`.
 * - WP-Cron retries on transient HTTP failures (up to 3 attempts).
 *
 * The webhook body is signed with HMAC-SHA256 using the secret stored at connect time.
 * If no secret is configured the plugin no-ops gracefully.
 */

class Contentech_Webhooks {

    const CRON_HOOK        = 'contentech_retry_webhook';
    const MAX_RETRIES      = 3;
    const RETRY_INTERVAL   = 300; // 5 minutes

    public function __construct() {
        add_action( 'save_post',          array( $this, 'on_save_post' ), 10, 3 );
        add_action( 'before_delete_post', array( $this, 'on_delete_post' ), 10, 2 );
        add_action( self::CRON_HOOK,      array( $this, 'cron_retry' ), 10, 3 );
    }

    /**
     * Fired on save_post.
     *
     * Only emits for posts that have previously been sent for translation via
     * Contentech (identified by the _contentech_tracked post meta flag).
     *
     * @param int     $post_id
     * @param WP_Post $post
     * @param bool    $update  True if this is an update, false on insert.
     */
    public function on_save_post( $post_id, $post, $update ) {
        // Skip autosaves, revisions, trashing, and new drafts not yet tracked.
        if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
            return;
        }
        if ( wp_is_post_revision( $post_id ) ) {
            return;
        }
        if ( $post->post_status === 'auto-draft' ) {
            return;
        }
        // Primary gate: post was sent via this plugin.
        $is_tracked = (bool) get_post_meta( $post_id, '_contentech_tracked', true );

        // Fallback: post may have been translated via the Contentech dashboard
        // (not the plugin), so _contentech_tracked was never written locally.
        // Ask the Contentech API — if a job exists, mark it tracked and proceed.
        if ( ! $is_tracked ) {
            $api    = new Contentech_Api();
            if ( $api->is_configured() ) {
                $result = $api->get_post_status( $post_id );
                if ( ! is_wp_error( $result ) && ! empty( $result['posts'] ) ) {
                    update_post_meta( $post_id, '_contentech_tracked', '1' );
                    $is_tracked = true;
                }
            }
        }

        if ( ! $is_tracked ) {
            return;
        }

        $this->dispatch( 'post.updated', array(
            'postId'   => $post_id,
            'postType' => $post->post_type,
            'siteUrl'  => get_bloginfo( 'url' ),
        ) );
    }

    /**
     * Fired before_delete_post.
     *
     * Only emits if the post is tracked by Contentech.
     *
     * @param int     $post_id
     * @param WP_Post $post
     */
    public function on_delete_post( $post_id, $post ) {
        if ( wp_is_post_revision( $post_id ) ) {
            return;
        }
        if ( ! get_post_meta( $post_id, '_contentech_tracked', true ) ) {
            return;
        }
        $this->dispatch( 'post.deleted', array(
            'postId'   => $post_id,
            'postType' => $post->post_type,
            'siteUrl'  => get_bloginfo( 'url' ),
        ) );
    }

    /**
     * Send the webhook immediately. On failure, schedule a WP-Cron retry.
     *
     * @param string $event   Event name (e.g. 'post.updated').
     * @param array  $payload Payload data.
     * @param int    $attempt 1-based attempt number.
     */
    public function dispatch( $event, array $payload, $attempt = 1 ) {
        $site_url = rtrim( (string) get_option( CONTENTECH_OPTION_URL, '' ), '/' );
        $secret   = (string) get_option( CONTENTECH_OPTION_SECRET, '' );

        // No-op if not configured.
        if ( $site_url === '' || $secret === '' ) {
            return;
        }

        $endpoint = $site_url . '/api/webhooks/wordpress';
        $body     = wp_json_encode( array_merge( $payload, array( 'event' => $event ) ) );
        $sig      = 'sha256=' . hash_hmac( 'sha256', $body, $secret );

        $response = wp_remote_post( $endpoint, array(
            'timeout' => 8,
            'headers' => array(
                'Content-Type'          => 'application/json',
                'X-Contentech-Signature' => $sig,
            ),
            'body'    => $body,
        ) );

        // Success: HTTP 2xx.
        if ( ! is_wp_error( $response ) ) {
            $code = (int) wp_remote_retrieve_response_code( $response );
            if ( $code >= 200 && $code < 300 ) {
                return; // Done.
            }
            // 401 / 403 — misconfiguration, do not retry.
            if ( $code === 401 || $code === 403 ) {
                return;
            }
        }

        // Schedule retry if under max attempts.
        if ( $attempt < self::MAX_RETRIES ) {
            wp_schedule_single_event(
                time() + self::RETRY_INTERVAL * $attempt,
                self::CRON_HOOK,
                array( $event, $payload, $attempt + 1 )
            );
        }
    }

    /**
     * WP-Cron callback for retries.
     */
    public function cron_retry( $event, array $payload, $attempt ) {
        $this->dispatch( $event, $payload, $attempt );
    }
}
