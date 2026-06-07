import fs from 'node:fs';
import path from 'node:path';

const MU_PLUGIN_CONTENT = `<?php
/**
 * Plugin Name: Kiqr Development
 * Description: Auto login, theme activation, and dev helpers for Kiqr.
 */

if (!defined('ABSPATH') || !defined('KIQR_DEVELOPMENT') || !KIQR_DEVELOPMENT) {
    return;
}

// Auto-activate the mounted theme on first boot
add_action('init', function () {
    $slug = getenv('KIQR_THEME_SLUG');
    if (!$slug) return;

    $active = get_option('stylesheet');
    if ($active === $slug) return;

    // Only auto-activate if the theme hasn't been manually changed before
    if (get_option('kiqr_theme_activated')) return;

    $theme = wp_get_theme($slug);
    if (!$theme->exists()) return;

    switch_theme($slug);
    update_option('kiqr_theme_activated', '1');
}, 1);

// Auto login via signed URL
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

// Inject LiveReload script in development
add_action('wp_footer', function () {
    $lr_port = getenv('KIQR_LIVERELOAD_PORT');
    if (!$lr_port) $lr_port = '35729';
    echo '<script src="http://localhost:' . esc_attr($lr_port) . '/livereload.js?ver=' . time() . '"></script>';
});
`;

export function writeMuPlugin(runtimeDir: string): string {
  const filePath = path.join(runtimeDir, 'kiqr-auto-login.php');
  fs.mkdirSync(runtimeDir, {recursive: true});
  fs.writeFileSync(filePath, MU_PLUGIN_CONTENT, 'utf-8');
  return filePath;
}
