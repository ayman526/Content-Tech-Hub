/**
 * Contentech Gutenberg Sidebar
 *
 * Uses WordPress globals (no build step required).
 * Registered via wp_enqueue_script with dependencies:
 *   wp-plugins, wp-edit-post, wp-element, wp-components, wp-data, wp-i18n, wp-api-fetch
 */
( function () {
    'use strict';

    var el            = wp.element.createElement;
    var registerPlugin = wp.plugins.registerPlugin;
    var PluginSidebar  = wp.editPost.PluginSidebar;
    var PluginSidebarMoreMenuItem = wp.editPost.PluginSidebarMoreMenuItem;
    var useState       = wp.element.useState;
    var useEffect      = wp.element.useEffect;
    var useSelect      = wp.data.useSelect;
    var Button         = wp.components.Button;
    var CheckboxControl = wp.components.CheckboxControl;
    var Spinner        = wp.components.Spinner;
    var Notice         = wp.components.Notice;
    var __             = wp.i18n.__;

    // Config injected by PHP via wp_localize_script.
    var cfg = window.contntechSidebarData || {};

    // --- Status badge helper ----------------------------------------------------

    function statusLabel( status ) {
        var map = {
            DELIVERED:    __( 'Up to date',  'contentech' ),
            IN_PROGRESS:  __( 'In progress', 'contentech' ),
            QUEUED:       __( 'In progress', 'contentech' ),
            OUT_OF_DATE:  __( 'Stale',       'contentech' ),
            FAILED:       __( 'Failed',      'contentech' ),
            MISSING:      __( 'Not started', 'contentech' ),
        };
        return map[ status ] || status;
    }

    function statusColor( status ) {
        var map = {
            DELIVERED:    '#00a32a',
            IN_PROGRESS:  '#0091AE',
            QUEUED:       '#0091AE',
            OUT_OF_DATE:  '#FF7A59',
            FAILED:       '#d63638',
            MISSING:      '#8c8f94',
        };
        return map[ status ] || '#8c8f94';
    }

    function Badge( props ) {
        return el( 'span', {
            style: {
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '3px',
                fontSize: '11px',
                fontWeight: '600',
                background: statusColor( props.status ) + '22',
                color: statusColor( props.status ),
                border: '1px solid ' + statusColor( props.status ) + '44',
            }
        }, statusLabel( props.status ) );
    }

    // --- Main sidebar component -------------------------------------------------

    function ContentechPanel() {
        var postId   = useSelect( function ( select ) {
            return select( 'core/editor' ).getCurrentPostId();
        } );
        var postType = useSelect( function ( select ) {
            return select( 'core/editor' ).getCurrentPostType();
        } );

        var [ loading,  setLoading  ] = useState( true );
        var [ sending,  setSending  ] = useState( false );
        var [ locales,  setLocales  ] = useState( [] );
        var [ selected, setSelected ] = useState( [] );
        var [ notice,   setNotice   ] = useState( null );   // { type, msg }
        var [ jobUrl,   setJobUrl   ] = useState( null );

        // Load status from Contentech on mount.
        useEffect( function () {
            if ( ! postId ) return;
            setLoading( true );
            wp.apiFetch( { path: '/contentech/v1/post-status?post_id=' + postId } )
                .then( function ( data ) {
                    setLocales( data.locales || [] );
                    setJobUrl( data.jobUrl || null );
                    setLoading( false );
                } )
                .catch( function () {
                    setLoading( false );
                } );
        }, [ postId ] );

        function toggleLocale( code, checked ) {
            setSelected( function ( prev ) {
                return checked ? prev.concat( [ code ] ) : prev.filter( function ( c ) { return c !== code; } );
            } );
        }

        function sendForTranslation() {
            if ( ! selected.length ) {
                setNotice( { type: 'warning', msg: __( 'Select at least one target language.', 'contentech' ) } );
                return;
            }
            setSending( true );
            setNotice( null );
            wp.apiFetch( {
                path: '/contentech/v1/send-for-translation',
                method: 'POST',
                data: { post_id: postId, post_type: postType, target_locales: selected },
            } )
                .then( function ( res ) {
                    setSending( false );
                    setSelected( [] );
                    setJobUrl( res.jobUrl || null );
                    // Reload status.
                    return wp.apiFetch( { path: '/contentech/v1/post-status?post_id=' + postId } );
                } )
                .then( function ( data ) {
                    setLocales( data.locales || [] );
                    setNotice( { type: 'success', msg: __( 'Sent for translation.', 'contentech' ) } );
                } )
                .catch( function ( err ) {
                    setSending( false );
                    setNotice( { type: 'error', msg: ( err && err.message ) || __( 'Failed to send for translation.', 'contentech' ) } );
                } );
        }

        if ( ! cfg.configured ) {
            return el( 'div', { style: { padding: '12px' } },
                el( 'p', null,
                    __( 'Contentech is not yet configured. ', 'contentech' ),
                    el( 'a', { href: cfg.settingsUrl, target: '_top' }, __( 'Open Settings', 'contentech' ) )
                )
            );
        }

        if ( ! cfg.multilingualActive ) {
            return el( 'div', { style: { padding: '12px' } },
                el( 'p', null,
                    __( 'A multilingual plugin (WPML or Polylang) is required. Please install one and return here.', 'contentech' )
                )
            );
        }

        return el( 'div', { style: { padding: '12px' } },

            // Source language
            cfg.sourceLanguage && el( 'p', { style: { marginBottom: '12px', fontSize: '12px', color: '#646970' } },
                __( 'Source language: ', 'contentech' ),
                el( 'strong', null, cfg.sourceLanguage )
            ),

            // Status list
            loading
                ? el( Spinner )
                : locales.length === 0
                    ? el( 'p', { style: { color: '#646970', fontSize: '12px' } }, __( 'No translations yet.', 'contentech' ) )
                    : el( 'table', { style: { width: '100%', borderCollapse: 'collapse', marginBottom: '12px' } },
                        el( 'tbody', null,
                            locales.map( function ( loc ) {
                                return el( 'tr', { key: loc.locale },
                                    el( 'td', { style: { padding: '4px 0', fontSize: '12px', width: '50%' } }, loc.name || loc.locale ),
                                    el( 'td', { style: { padding: '4px 0', textAlign: 'right' } },
                                        el( Badge, { status: loc.status } )
                                    )
                                );
                            } )
                        )
                    ),

            // Target language multi-select
            cfg.targetLanguages && cfg.targetLanguages.length > 0 && el( 'div', { style: { marginBottom: '12px' } },
                el( 'p', { style: { fontWeight: '600', fontSize: '12px', marginBottom: '6px' } }, __( 'Send for translation:', 'contentech' ) ),
                cfg.targetLanguages.map( function ( lang ) {
                    return el( CheckboxControl, {
                        key: lang.code,
                        label: lang.name || lang.code,
                        checked: selected.indexOf( lang.code ) !== -1,
                        onChange: function ( v ) { toggleLocale( lang.code, v ); },
                    } );
                } )
            ),

            // Send button
            el( Button, {
                variant: 'primary',
                isBusy: sending,
                disabled: sending || loading,
                onClick: sendForTranslation,
                style: { marginBottom: '10px', width: '100%', justifyContent: 'center' },
            }, __( 'Send for Translation', 'contentech' ) ),

            // Job link
            jobUrl && el( 'p', { style: { fontSize: '12px', textAlign: 'center' } },
                el( 'a', { href: jobUrl, target: '_blank', rel: 'noopener' }, __( 'View job in Contentech \u2197', 'contentech' ) )
            ),

            // Notice
            notice && el( Notice, {
                status: notice.type,
                isDismissible: true,
                onRemove: function () { setNotice( null ); },
            }, notice.msg )
        );
    }

    // Register plugin.
    registerPlugin( 'contentech-sidebar', {
        render: function () {
            return el( wp.element.Fragment, null,
                el( PluginSidebarMoreMenuItem, { target: 'contentech-sidebar' }, 'Contentech' ),
                el( PluginSidebar, { name: 'contentech-sidebar', title: 'Contentech' },
                    el( ContentechPanel )
                )
            );
        },
        icon: el( 'svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 20 20', fill: 'currentColor' },
            el( 'path', { d: 'M10 2a8 8 0 100 16A8 8 0 0010 2zm0 14a6 6 0 110-12 6 6 0 010 12zm-1-9h2v4h-2zm0 6h2v2h-2z' } )
        ),
    } );

} )();
