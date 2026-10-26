<?php
/**
 * Contentech column in Posts / Pages / CPT list tables.
 *
 * - Per-language status badges.
 * - A filter dropdown: All | Not started | In progress | Up to date | Stale | Failed.
 * - Sortable column (sorts by none — WP custom columns cannot sort by remote data,
 *   so we make the column registered but not sortable to avoid confusion).
 */

class Contentech_Admin_Column {

    public function __construct() {
        add_action( 'admin_init', array( $this, 'hook_post_types' ) );
        add_action( 'restrict_manage_posts', array( $this, 'render_filter_dropdown' ) );
        add_action( 'pre_get_posts', array( $this, 'apply_filter' ) );
        add_action( 'admin_enqueue_scripts', array( $this, 'enqueue' ) );
    }

    public function hook_post_types() {
        $pts = array_values( get_post_types( array( 'public' => true ) ) );
        foreach ( $pts as $pt ) {
            add_filter( 'manage_' . $pt . '_posts_columns',          array( $this, 'add_column' ) );
            add_action( 'manage_' . $pt . '_posts_custom_column',    array( $this, 'render_column' ), 10, 2 );
            add_filter( 'manage_' . $pt . '_posts_sortable_columns', array( $this, 'register_sortable' ) );
        }
    }

    public function register_sortable( $columns ) {
        $columns['contentech'] = 'contentech';
        return $columns;
    }

    public function add_column( $columns ) {
        $columns['contentech'] = 'Contentech';
        return $columns;
    }

    public function render_column( $column_name, $post_id ) {
        if ( $column_name !== 'contentech' ) {
            return;
        }
        $api = new Contentech_Api();
        if ( ! $api->is_configured() ) {
            echo '<span style="color:#8c8f94;font-size:11px">&mdash;</span>';
            return;
        }
        $result = $api->get_post_status( $post_id );
        if ( is_wp_error( $result ) || empty( $result['posts'] ) ) {
            echo '<span style="color:#8c8f94;font-size:11px">' . esc_html__( 'Not started', 'contentech' ) . '</span>';
            return;
        }
        $output = '';
        foreach ( $result['posts'] as $loc ) {
            $status = $loc['status'] ?? 'MISSING';
            $name   = esc_html( $loc['localeName'] ?? $loc['locale'] ?? '??' );
            $css    = $this->status_css_class( $status );
            $output .= '<span class="contentech-badge ' . esc_attr( $css ) . '" title="' . $name . '">' . $name . '</span> ';
        }
        echo $output; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
    }

    private function status_css_class( $status ) {
        $map = array(
            'DELIVERED'   => 'contentech-badge--delivered',
            'IN_PROGRESS' => 'contentech-badge--in-progress',
            'QUEUED'      => 'contentech-badge--in-progress',
            'OUT_OF_DATE' => 'contentech-badge--stale',
            'FAILED'      => 'contentech-badge--failed',
            'MISSING'     => 'contentech-badge--missing',
        );
        return $map[ $status ] ?? 'contentech-badge--missing';
    }

    // ------------------------------------------------------------------
    // Filter dropdown
    // ------------------------------------------------------------------

    public function render_filter_dropdown( $post_type ) {
        if ( ! in_array( $post_type, array_values( get_post_types( array( 'public' => true ) ) ), true ) ) {
            return;
        }
        $api = new Contentech_Api();
        if ( ! $api->is_configured() ) {
            return;
        }
        $current = sanitize_key( $_GET['contentech_status'] ?? '' );
        $options = array(
            ''            => __( 'All (Contentech)', 'contentech' ),
            'not_started' => __( 'Not started',      'contentech' ),
            'in_progress' => __( 'In progress',      'contentech' ),
            'delivered'   => __( 'Up to date',       'contentech' ),
            'stale'       => __( 'Stale',            'contentech' ),
            'failed'      => __( 'Failed',           'contentech' ),
        );
        echo '<select name="contentech_status" class="contentech-filter-wrap">';
        foreach ( $options as $val => $label ) {
            printf(
                '<option value="%s"%s>%s</option>',
                esc_attr( $val ),
                selected( $current, $val, false ),
                esc_html( $label )
            );
        }
        echo '</select>';
    }

    /**
     * Filter AND sort posts by Contentech status.
     *
     * Because Contentech status is stored remotely we cannot filter/sort via DB query.
     * Instead we fetch the relevant post IDs from Contentech, inject them via post__in,
     * and — for sorting — also set orderby=post__in so WP preserves our sorted order.
     */
    public function apply_filter( WP_Query $query ) {
        if ( ! is_admin() || ! $query->is_main_query() ) {
            return;
        }

        $status  = sanitize_key( $_GET['contentech_status'] ?? '' );
        $orderby = sanitize_key( $query->get( 'orderby' ) );

        $api      = new Contentech_Api();
        $site_url = rtrim( (string) get_option( CONTENTECH_OPTION_URL, '' ), '/' );
        $api_key  = (string) get_option( CONTENTECH_OPTION_KEY, '' );

        if ( ! $api->is_configured() ) {
            return;
        }

        // Current post type (post / page / CPT slug) — default to 'post' if not set.
        $post_type = sanitize_key( $query->get( 'post_type' ) ?: 'post' );

        // ---- Status filter ------------------------------------------------
        if ( $status ) {
            $api_status_map = array(
                'not_started' => 'MISSING',
                'in_progress' => 'IN_PROGRESS',
                'delivered'   => 'DELIVERED',
                'stale'       => 'OUT_OF_DATE',
                'failed'      => 'FAILED',
            );
            $api_status = $api_status_map[ $status ] ?? null;
            if ( $api_status ) {
                $ids = $this->fetch_post_ids_by_status( $site_url, $api_key, $api_status, $post_type );
                $query->set( 'post__in', $ids ?: array( 0 ) );
            }
        }

        // ---- Contentech column sorting ------------------------------------
        if ( $orderby === 'contentech' ) {
            $sorted_ids = $this->fetch_all_post_ids_sorted_by_status( $site_url, $api_key, $query->get( 'order' ), $post_type );
            if ( ! empty( $sorted_ids ) ) {
                $query->set( 'post__in', $sorted_ids );
                $query->set( 'orderby', 'post__in' );
            }
        }
    }

    /**
     * Fetch post IDs from Contentech that match a given status string.
     *
     * @param  string $site_url   Contentech base URL.
     * @param  string $api_key    API key.
     * @param  string $api_status Status string (e.g. 'DELIVERED').
     * @param  string $post_type  WordPress post type slug.
     * @return int[]
     */
    private function fetch_post_ids_by_status( $site_url, $api_key, $api_status, $post_type = 'post' ) {
        $endpoint = $site_url . '/api/integrations/wordpress/posts?postType=' . rawurlencode( $post_type )
            . '&status=' . rawurlencode( $api_status ) . '&perPage=500';
        return $this->fetch_ids_from_endpoint( $endpoint, $api_key );
    }

    /**
     * Fetch all translated post IDs ordered by translation status priority.
     *
     * Status sort order (ascending): DELIVERED < IN_PROGRESS < OUT_OF_DATE < FAILED < MISSING.
     * When order=DESC the priority is reversed.
     *
     * Untranslated posts (not in any Contentech job) appear at the end because
     * they are not returned by the Contentech API and remain beyond our control.
     *
     * @param  string $site_url  Contentech base URL.
     * @param  string $api_key   API key.
     * @param  string $order     'ASC' or 'DESC'.
     * @param  string $post_type WordPress post type slug.
     * @return int[]  Post IDs in the requested sort order.
     */
    private function fetch_all_post_ids_sorted_by_status( $site_url, $api_key, $order, $post_type = 'post' ) {
        // Fetch all posts for the given type in a single API call.
        $endpoint = $site_url . '/api/integrations/wordpress/posts?postType=' . rawurlencode( $post_type ) . '&perPage=500';
        $response = wp_remote_get( $endpoint, array(
            'timeout' => 10,
            'headers' => array( 'Authorization' => 'Bearer ' . $api_key ),
        ) );
        if ( is_wp_error( $response ) ) {
            return array();
        }
        $body  = json_decode( wp_remote_retrieve_body( $response ), true );
        $posts = isset( $body['posts'] ) && is_array( $body['posts'] ) ? $body['posts'] : array();

        // Priority map: lower number = "better" / earlier in ASC sort.
        $priority = array(
            'DELIVERED'   => 1,
            'IN_PROGRESS' => 2,
            'QUEUED'      => 2,
            'OUT_OF_DATE' => 3,
            'FAILED'      => 4,
            'MISSING'     => 5,
        );

        usort( $posts, function ( $a, $b ) use ( $priority, $order ) {
            $pa = $priority[ $a['status'] ?? 'MISSING' ] ?? 5;
            $pb = $priority[ $b['status'] ?? 'MISSING' ] ?? 5;
            return strtoupper( $order ) === 'DESC' ? $pb - $pa : $pa - $pb;
        } );

        $ids = array();
        foreach ( $posts as $p ) {
            if ( isset( $p['wpPostId'] ) ) {
                $ids[] = (int) $p['wpPostId'];
            }
        }
        return $ids;
    }

    /**
     * Reusable helper: GET endpoint, return array of wpPostId integers.
     */
    private function fetch_ids_from_endpoint( $endpoint, $api_key ) {
        $response = wp_remote_get( $endpoint, array(
            'timeout' => 10,
            'headers' => array( 'Authorization' => 'Bearer ' . $api_key ),
        ) );
        if ( is_wp_error( $response ) ) {
            return array();
        }
        $body = json_decode( wp_remote_retrieve_body( $response ), true );
        $ids  = array();
        if ( isset( $body['posts'] ) && is_array( $body['posts'] ) ) {
            foreach ( $body['posts'] as $post ) {
                if ( isset( $post['wpPostId'] ) ) {
                    $ids[] = (int) $post['wpPostId'];
                }
            }
        }
        return $ids;
    }

    public function enqueue( $hook ) {
        if ( ! in_array( $hook, array( 'edit.php' ), true ) ) {
            return;
        }
        wp_enqueue_style( 'contentech-admin', CONTENTECH_PLUGIN_URL . 'assets/css/admin.css', array(), CONTENTECH_VERSION );
    }
}
