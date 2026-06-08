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

// Disable WordPress's redirect_canonical and Yoast SEO's URL redirector in
// development. Behind a reverse proxy / tunnel that rewrites the Host header
// (cloudflared --http-host-header), WP and Yoast can disagree about whether
// the request URL matches the canonical URL, and emit a 301 back to a URL
// that, when followed, comes back through the proxy and triggers the same
// 301 again. The browser hits ERR_TOO_MANY_REDIRECTS. In dev we just want
// the page to render at whichever URL it was requested at -- canonical
// enforcement is a production concern, not a development one.
add_action('init', function () {
    remove_filter('template_redirect', 'redirect_canonical');
    // Yoast SEO: kill its redirect_canonical_fix / redirect logic, which can
    // also self-loop when WP_HOME shifts per request.
    if (class_exists('WPSEO_Frontend')) {
        $wpseo = WPSEO_Frontend::get_instance();
        remove_action('template_redirect', array($wpseo, 'archive_redirect'));
        remove_action('template_redirect', array($wpseo, 'page_redirect'), 99);
        remove_action('template_redirect', array($wpseo, 'attachment_redirect'), 1);
    }
}, 0);

// Route all outgoing mail to the kiqr agent's Mailpit catcher over SMTP.
// The WordPress container shares the kiqr network, so it resolves the
// "kiqr-mailpit" container by name. Mailpit accepts unauthenticated,
// unencrypted SMTP on port 1025.
add_action('phpmailer_init', function ($phpmailer) {
    $phpmailer->isSMTP();
    $phpmailer->Host = 'kiqr-mailpit';
    $phpmailer->Port = 1025;
    $phpmailer->SMTPAuth = false;
    $phpmailer->SMTPSecure = '';
    $phpmailer->SMTPAutoTLS = false;
});

// Inject LiveReload script in development.
//
// The script src points at http://localhost on the host machine, which is only
// reachable when the page is being viewed *on* that machine. When the site is
// exposed via 'kiqr share', the visitor is remote and that URL is both broken
// and a mixed-content violation on the https tunnel. Skip on forwarded requests.
add_action('wp_footer', function () {
    if (!empty($_SERVER['HTTP_X_FORWARDED_HOST'])) return;
    $lr_port = getenv('KIQR_LIVERELOAD_PORT');
    if (!$lr_port) $lr_port = '35729';
    echo '<script src="http://localhost:' . esc_attr($lr_port) . '/livereload.js?ver=' . time() . '"></script>';
});

// Dynamic-URL rewrite: translate absolute URLs in the response body from the
// canonical URLs stored in the database (typically the production URL after a
// DB import) to whatever URL the current request was served on. Without this,
// a restored production dump still emits absolute https://prod.example.com/...
// asset URLs that break on a local or tunneled dev site.
//
// We hook as early as possible (muplugins_loaded, before themes/plugins emit
// any output) and start an output buffer that runs string-replace in its
// flush callback. The candidate URLs come from the raw siteurl / home rows
// in wp_options -- using get_option() would return the WP_HOME / WP_SITEURL
// constants we defined in wp-config (the dynamic value), not the persisted
// DB value we are trying to rewrite away from.
//
// No-op when the stored URL already matches the current request URL.
add_action('muplugins_loaded', function () {
    if (!defined('WP_HOME')) return; // WORDPRESS_CONFIG_EXTRA did not load
    global $wpdb;
    if (!isset($wpdb) || !($wpdb instanceof wpdb)) return;

    static $patterns = null;
    if ($patterns === null) {
        $patterns = [];
        $rows = $wpdb->get_col(
            "SELECT option_value FROM {$wpdb->options} WHERE option_name IN ('siteurl', 'home')"
        );
        $current = rtrim(WP_HOME, '/');
        foreach (array_unique(array_filter((array) $rows)) as $url) {
            $parsed = parse_url($url);
            if (empty($parsed['host'])) continue;
            $http  = 'http://'  . $parsed['host'];
            $https = 'https://' . $parsed['host'];
            // Skip if the stored URL is already the current one.
            if (rtrim($http,  '/') === $current) continue;
            if (rtrim($https, '/') === $current) continue;
            $patterns[$http]  = true;
            $patterns[$https] = true;
        }
        $patterns = array_keys($patterns);
    }
    if (empty($patterns)) return;

    ob_start(function ($buf) use ($patterns) {
        // Only rewrite text-ish responses. Binary downloads, images, etc.
        // would be corrupted by a blind str_replace.
        foreach (headers_list() as $h) {
            if (stripos($h, 'Content-Type:') !== 0) continue;
            $ct = strtolower(substr($h, 13));
            if (
                strpos($ct, 'text/')             === false &&
                strpos($ct, 'application/json')  === false &&
                strpos($ct, 'application/xhtml') === false &&
                strpos($ct, 'application/xml')   === false &&
                strpos($ct, '+json')             === false &&
                strpos($ct, '+xml')              === false
            ) {
                return $buf;
            }
            break;
        }
        return str_replace($patterns, WP_HOME, $buf);
    });
}, 0);
`;

export function writeMuPlugin(runtimeDir: string): string {
  const filePath = path.join(runtimeDir, 'kiqr-auto-login.php');
  fs.mkdirSync(runtimeDir, {recursive: true});
  fs.writeFileSync(filePath, MU_PLUGIN_CONTENT, 'utf-8');
  return filePath;
}
