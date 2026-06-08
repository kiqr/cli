import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {writeMuPlugin} from '../../src/lib/mu-plugin.js';

describe('writeMuPlugin', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kiqr-mu-plugin-'));
  });

  afterEach(() => {
    fs.rmSync(tmp, {recursive: true, force: true});
  });

  it('writes the mu-plugin file and returns its path', () => {
    const filePath = writeMuPlugin(tmp);
    expect(filePath).toBe(path.join(tmp, 'kiqr-auto-login.php'));
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('creates the runtime directory if it does not exist', () => {
    const nested = path.join(tmp, 'a', 'b', 'c');
    const filePath = writeMuPlugin(nested);
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('writes a guarded WordPress PHP plugin header', () => {
    const content = fs.readFileSync(writeMuPlugin(tmp), 'utf-8');
    expect(content.startsWith('<?php')).toBe(true);
    expect(content).toContain('Plugin Name: Kiqr Development');
    // Bails out unless development mode is explicitly enabled
    expect(content).toContain("!defined('KIQR_DEVELOPMENT')");
    expect(content).toContain('!KIQR_DEVELOPMENT');
  });

  it('auto-activates the mounted theme by slug on init', () => {
    const content = fs.readFileSync(writeMuPlugin(tmp), 'utf-8');
    expect(content).toContain("add_action('init'");
    expect(content).toContain("getenv('KIQR_THEME_SLUG')");
    expect(content).toContain('switch_theme($slug)');
    // Only activates once, then records that it did so
    expect(content).toContain("get_option('kiqr_theme_activated')");
    expect(content).toContain("update_option('kiqr_theme_activated', '1')");
    expect(content).toContain('$theme->exists()');
  });

  it('implements signed-URL auto-login with constant-time secret comparison', () => {
    const content = fs.readFileSync(writeMuPlugin(tmp), 'utf-8');
    expect(content).toContain("$_GET['kiqr_login']");
    expect(content).toContain('is_user_logged_in()');
    expect(content).toContain("getenv('KIQR_LOGIN_SECRET')");
    // hash_equals guards against timing attacks
    expect(content).toContain("hash_equals($secret, $_GET['kiqr_login'])");
    expect(content).toContain('wp_set_current_user($user->ID)');
    expect(content).toContain('wp_set_auth_cookie($user->ID, true)');
  });

  it('falls back to the first administrator when no admin login exists', () => {
    const content = fs.readFileSync(writeMuPlugin(tmp), 'utf-8');
    expect(content).toContain("get_user_by('login', 'admin')");
    expect(content).toContain("get_users(['role' => 'administrator', 'number' => 1])");
  });

  it('redirects and exits after a successful auto-login', () => {
    const content = fs.readFileSync(writeMuPlugin(tmp), 'utf-8');
    expect(content).toContain("remove_query_arg('kiqr_login')");
    expect(content).toContain('wp_safe_redirect($redirect ?: admin_url())');
    expect(content).toContain('exit;');
  });

  it('injects a LiveReload script tag into the footer with the configured port', () => {
    const content = fs.readFileSync(writeMuPlugin(tmp), 'utf-8');
    expect(content).toContain("add_action('wp_footer'");
    expect(content).toContain("getenv('KIQR_LIVERELOAD_PORT')");
    expect(content).toContain('<script src="http://localhost:');
    expect(content).toContain("'/livereload.js?ver='");
    expect(content).toContain('esc_attr($lr_port)');
  });

  it('defaults the LiveReload port to 35729 when unset', () => {
    const content = fs.readFileSync(writeMuPlugin(tmp), 'utf-8');
    expect(content).toContain("if (!$lr_port) $lr_port = '35729'");
  });

  it('suppresses the LiveReload script tag on forwarded (tunneled) requests', () => {
    // The script src points at the host's localhost, unreachable from a
    // remote viewer over `kiqr share`, and would mixed-content-block on the
    // https tunnel page. Skip on any request that carries X-Forwarded-Host.
    const content = fs.readFileSync(writeMuPlugin(tmp), 'utf-8');
    expect(content).toContain("if (!empty($_SERVER['HTTP_X_FORWARDED_HOST'])) return;");
  });

  it('disables canonical-URL redirects to avoid redirect loops behind a reverse proxy', () => {
    // Behind cloudflared --http-host-header, WP's redirect_canonical and
    // Yoast SEO's redirector can disagree about the canonical URL and emit
    // 301s that point right back at themselves through the proxy, producing
    // ERR_TOO_MANY_REDIRECTS in the browser. Canonical enforcement is a
    // production concern; in dev we want pages to render wherever requested.
    const content = fs.readFileSync(writeMuPlugin(tmp), 'utf-8');
    expect(content).toContain("remove_filter('template_redirect', 'redirect_canonical')");
    expect(content).toContain('WPSEO_Frontend');
  });

  it('rewrites absolute production URLs in the response body to the current dynamic URL', () => {
    // A restored production DB still has absolute `https://prod.example.com/...`
    // URLs cached in postmeta / serialized options. ob_start in the mu-plugin
    // translates them to whatever URL the request came in on.
    const content = fs.readFileSync(writeMuPlugin(tmp), 'utf-8');
    expect(content).toContain("add_action('muplugins_loaded'");
    expect(content).toContain('ob_start(');
    // Reads the RAW DB option (not get_option which returns the WP_HOME
    // constant) so we can rewrite the stale stored value.
    expect(content).toContain('SELECT option_value FROM');
    expect(content).toContain("option_name IN ('siteurl', 'home')");
    // Replaces stored URLs with the dynamic WP_HOME constant.
    expect(content).toContain('str_replace($patterns, WP_HOME, $buf)');
    // Bails out on binary responses (images served via PHP, downloads, etc.).
    expect(content).toContain('Content-Type:');
  });

  it('routes outgoing mail to the kiqr-mailpit SMTP catcher via phpmailer_init', () => {
    const content = fs.readFileSync(writeMuPlugin(tmp), 'utf-8');
    expect(content).toContain("add_action('phpmailer_init'");
    expect(content).toContain('$phpmailer->isSMTP()');
    expect(content).toContain("$phpmailer->Host = 'kiqr-mailpit'");
    expect(content).toContain('$phpmailer->Port = 1025');
    expect(content).toContain('$phpmailer->SMTPAuth = false');
  });

  it('is deterministic across writes', () => {
    const first = fs.readFileSync(writeMuPlugin(tmp), 'utf-8');
    const second = fs.readFileSync(writeMuPlugin(tmp), 'utf-8');
    expect(first).toBe(second);
  });
});
