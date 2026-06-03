<?php
/**
 * Plugin Name: Kiqr Auto Login
 * Description: Development-only auto login via signed URL.
 */

if (!defined('ABSPATH') || !defined('KIQR_DEVELOPMENT') || !KIQR_DEVELOPMENT) {
    return;
}

add_action('init', function () {
    if (empty($_GET['kiqr_login']) || is_user_logged_in()) {
        return;
    }

    $secret = getenv('KIQR_LOGIN_SECRET');
    if (!$secret || !hash_equals($secret, $_GET['kiqr_login'])) {
        return;
    }

    $user = get_user_by('login', 'admin');
    if (!$user) {
        $user = get_users(['role' => 'administrator', 'number' => 1])[0] ?? null;
    }
    if (!$user) {
        return;
    }

    wp_set_current_user($user->ID);
    wp_set_auth_cookie($user->ID, true);

    $redirect = remove_query_arg('kiqr_login');
    wp_safe_redirect($redirect ?: admin_url());
    exit;
});
