/**
 * Classic Editor metabox JavaScript.
 * Fetches status from the Contentech WP REST API and handles "Send for Translation".
 */
( function ( $ ) {
    'use strict';

    var cfg     = window.contntechSidebarData || {};
    var postId  = cfg.postId || 0;

    function statusLabel( s ) {
        var map = { DELIVERED:'Up to date', IN_PROGRESS:'In progress', QUEUED:'In progress', OUT_OF_DATE:'Stale', FAILED:'Failed', MISSING:'Not started' };
        return map[s] || s;
    }
    function statusColor( s ) {
        var map = { DELIVERED:'#00a32a', IN_PROGRESS:'#0091AE', QUEUED:'#0091AE', OUT_OF_DATE:'#FF7A59', FAILED:'#d63638', MISSING:'#8c8f94' };
        return map[s] || '#8c8f94';
    }

    function badge( status ) {
        var c = statusColor( status );
        return '<span style="display:inline-block;padding:2px 8px;border-radius:3px;font-size:11px;font-weight:600;background:' + c + '22;color:' + c + ';border:1px solid ' + c + '44">' + statusLabel( status ) + '</span>';
    }

    function apiFetch( path, opts ) {
        var url  = cfg.restRoot + path;
        var headers = { 'X-WP-Nonce': cfg.restNonce, 'Content-Type': 'application/json' };
        return $.ajax( $.extend( { url: url, headers: headers }, opts || {} ) );
    }

    function loadStatus() {
        if ( ! postId ) return;
        var $status = $( '#contentech-status-list' );
        $status.html( '<span class="spinner is-active" style="float:none;margin:0"></span>' );

        apiFetch( 'post-status?post_id=' + postId )
            .done( function ( data ) {
                var locales = data.locales || [];
                var jobUrl  = data.jobUrl  || null;
                if ( ! locales.length ) {
                    $status.html( '<p style="color:#646970;font-size:12px">No translations yet.</p>' );
                    return;
                }
                var html = '<table style="width:100%;border-collapse:collapse;margin-bottom:8px"><tbody>';
                locales.forEach( function ( loc ) {
                    html += '<tr><td style="padding:3px 0;font-size:12px">' + loc.name + '</td><td style="text-align:right">' + badge( loc.status ) + '</td></tr>';
                } );
                html += '</tbody></table>';
                if ( jobUrl ) {
                    html += '<p style="font-size:12px;text-align:center"><a href="' + jobUrl + '" target="_blank" rel="noopener">View job in Contentech &#8599;</a></p>';
                }
                $status.html( html );
            } )
            .fail( function () {
                $status.html( '<p style="color:#d63638;font-size:12px">Could not load status.</p>' );
            } );
    }

    $( document ).ready( function () {
        if ( ! cfg.configured ) return;

        loadStatus();

        $( '#contentech-send-btn' ).on( 'click', function () {
            var selected = [];
            $( '.contentech-lang-checkbox:checked' ).each( function () {
                selected.push( $( this ).val() );
            } );
            if ( ! selected.length ) {
                alert( 'Please select at least one target language.' );
                return;
            }
            var $btn = $( this );
            $btn.prop( 'disabled', true ).text( 'Sending...' );
            $( '#contentech-send-notice' ).text( '' );

            apiFetch( 'send-for-translation', {
                method: 'POST',
                data: JSON.stringify( { post_id: postId, post_type: cfg.postType, target_locales: selected } ),
            } )
                .done( function () {
                    $btn.prop( 'disabled', false ).text( 'Send for Translation' );
                    $( '.contentech-lang-checkbox' ).prop( 'checked', false );
                    $( '#contentech-send-notice' ).css( 'color', '#00a32a' ).text( 'Sent for translation.' );
                    loadStatus();
                } )
                .fail( function ( xhr ) {
                    $btn.prop( 'disabled', false ).text( 'Send for Translation' );
                    var msg = ( xhr.responseJSON && xhr.responseJSON.message ) || 'Failed to send.';
                    $( '#contentech-send-notice' ).css( 'color', '#d63638' ).text( msg );
                } );
        } );
    } );

} )( jQuery );
