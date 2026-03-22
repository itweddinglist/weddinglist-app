<?php
/**
 * Plugin Name: Weddinglist Bridge
 * Description: Bootstrap endpoint for Weddinglist Next.js app using the current WordPress session.
 * Version: 1.3.0
 * Author: Weddinglist
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Allowed frontend origins.
 * Default: localhost + app.weddinglist.ro
 * Preview domains: add_filter('wl_bridge_allowed_origins', function($origins) { ... })
 */
function wl_bridge_allowed_origins(): array {
    $defaults = [
        'http://localhost:3000',
        'https://app.weddinglist.ro',
    ];
    return apply_filters('wl_bridge_allowed_origins', $defaults);
}

function wl_bridge_get_allowed_origin(): ?string {
    $origin = get_http_origin();
    if (!$origin) return null;
    return in_array($origin, wl_bridge_allowed_origins(), true) ? $origin : null;
}

function wl_bridge_send_cors_headers(): void {
    $allowed_origin = wl_bridge_get_allowed_origin();
    if (!$allowed_origin) return;

    header('Access-Control-Allow-Origin: ' . esc_url_raw($allowed_origin));
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
    header('Vary: Origin', false);
}

function wl_bridge_send_no_cache_headers(): void {
    nocache_headers();
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0', true);
    header('Pragma: no-cache', true);
    header('Expires: Wed, 11 Jan 1984 05:00:00 GMT', true);
}

/**
 * CORS preflight handler.
 * Tratat separat de ruta REST — intentionat.
 */
add_action('init', function (): void {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'OPTIONS') return;
    if (strpos($_SERVER['REQUEST_URI'] ?? '', '/wp-json/weddinglist/v1/bootstrap') === false) return;

    if (!wl_bridge_get_allowed_origin()) {
        status_header(403);
        exit;
    }

    wl_bridge_send_cors_headers();
    wl_bridge_send_no_cache_headers();
    status_header(204);
    exit;
});

/**
 * Register bootstrap endpoint.
 */
add_action('rest_api_init', function (): void {
    register_rest_route('weddinglist/v1', '/bootstrap', [
        'methods'             => WP_REST_Server::READABLE,
        'callback'            => 'wl_bridge_bootstrap_handler',
        'permission_callback' => '__return_true',
    ]);
});

add_filter('rest_pre_serve_request', function ($served, $result, $request) {
    if (!($request instanceof WP_REST_Request)) return $served;
    if ($request->get_route() !== '/weddinglist/v1/bootstrap') return $served;

    wl_bridge_send_cors_headers();
    wl_bridge_send_no_cache_headers();

    return $served;
}, 10, 3);

/**
 * Builds the user payload.
 * Extensibil ulterior cu plan_tier din Voxel, weddings, etc.
 */
function wl_bridge_build_user_payload(WP_User $user): array {
    return [
        'wp_user_id'   => (int) $user->ID,
        'email'        => (string) $user->user_email,
        'display_name' => (string) $user->display_name,
        'plan_tier'    => null, // placeholder — populated later from Voxel
    ];
}

/**
 * Bootstrap handler.
 */
function wl_bridge_bootstrap_handler(WP_REST_Request $request): WP_REST_Response {
    if (!wl_bridge_get_allowed_origin()) {
        return new WP_REST_Response([
            'authenticated' => false,
            'user'          => null,
            'weddings'      => [],
            'error'         => 'origin_not_allowed',
        ], 403);
    }

    // Validare explicita cookie sesiune WP
    $user_id = wp_validate_auth_cookie('', 'logged_in');

    if ($user_id) {
        wp_set_current_user($user_id);
    }

    $user = wp_get_current_user();

    if (!$user instanceof WP_User || !$user->ID) {
        return new WP_REST_Response([
            'authenticated' => false,
            'user'          => null,
            'weddings'      => [],
        ], 200);
    }

    return new WP_REST_Response([
        'authenticated' => true,
        'user'          => wl_bridge_build_user_payload($user),
        'weddings'      => [], // placeholder — populated in 0B.3
    ], 200);
}
