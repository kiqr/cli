import fs from 'node:fs';
import path from 'node:path';

export type ThemeType = 'block' | 'classic';

export interface ScaffoldOptions {
  name: string;
  slug: string;
  type: ThemeType;
  author?: string;
  description?: string;
}

const THEME_VERSION = '0.1.0';
const REQUIRES_WP = '6.5';
const TESTED_WP = '6.8';
const REQUIRES_PHP = '8.0';

function styleHeader(opts: ScaffoldOptions): string {
  const author = opts.author ?? 'Your Name';
  const description =
    opts.description ??
    `A ${opts.type === 'block' ? 'block (Full Site Editing)' : 'classic'} WordPress theme scaffolded with Kiqr.`;
  return `/*
Theme Name: ${opts.name}
Theme URI: https://example.com/themes/${opts.slug}
Author: ${author}
Author URI: https://example.com
Description: ${description}
Version: ${THEME_VERSION}
Requires at least: ${REQUIRES_WP}
Tested up to: ${TESTED_WP}
Requires PHP: ${REQUIRES_PHP}
License: GNU General Public License v2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html
Text Domain: ${opts.slug}
*/
`;
}

function readme(opts: ScaffoldOptions): string {
  const author = opts.author ?? 'Your Name';
  const description =
    opts.description ??
    `A ${opts.type === 'block' ? 'block (Full Site Editing)' : 'classic'} WordPress theme scaffolded with Kiqr.`;
  return `=== ${opts.name} ===
Contributors: ${slugContributor(author)}
Requires at least: ${REQUIRES_WP}
Tested up to: ${TESTED_WP}
Requires PHP: ${REQUIRES_PHP}
Stable tag: ${THEME_VERSION}
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

${description}

== Description ==

${description}

== Changelog ==

= ${THEME_VERSION} =
* Initial release.
`;
}

function slugContributor(author: string): string {
  return author
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 30);
}

function gitignore(): string {
  return `# Dependencies
node_modules/
vendor/

# Build output
build/
dist/

# OS / editor
.DS_Store
Thumbs.db
*.log

# Kiqr local runtime config
.kiqr/
`;
}

function themeJson(): string {
  const data = {
    $schema: 'https://schemas.wp.org/trunk/theme.json',
    version: 3,
    settings: {
      appearanceTools: true,
      layout: {
        contentSize: '640px',
        wideSize: '1200px',
      },
      color: {
        defaultPalette: false,
        defaultGradients: false,
        palette: [
          {slug: 'base', color: '#ffffff', name: 'Base'},
          {slug: 'contrast', color: '#111111', name: 'Contrast'},
          {slug: 'primary', color: '#3858e9', name: 'Primary'},
          {slug: 'secondary', color: '#f0f0f0', name: 'Secondary'},
          {slug: 'accent', color: '#e26d5c', name: 'Accent'},
        ],
      },
      typography: {
        fluid: true,
        fontFamilies: [
          {
            slug: 'system',
            name: 'System Sans',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          },
          {
            slug: 'serif',
            name: 'Serif',
            fontFamily: 'Georgia, "Times New Roman", serif',
          },
          {
            slug: 'mono',
            name: 'Monospace',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          },
        ],
        fontSizes: [
          {
            slug: 'small',
            name: 'Small',
            size: '0.875rem',
            fluid: {min: '0.8125rem', max: '0.875rem'},
          },
          {
            slug: 'medium',
            name: 'Medium',
            size: '1rem',
            fluid: {min: '1rem', max: '1.125rem'},
          },
          {
            slug: 'large',
            name: 'Large',
            size: '1.5rem',
            fluid: {min: '1.25rem', max: '1.5rem'},
          },
          {
            slug: 'x-large',
            name: 'Extra Large',
            size: '2.25rem',
            fluid: {min: '1.75rem', max: '2.25rem'},
          },
          {
            slug: 'xx-large',
            name: 'Huge',
            size: '3.5rem',
            fluid: {min: '2.5rem', max: '3.5rem'},
          },
        ],
      },
      spacing: {
        units: ['px', 'em', 'rem', '%', 'vw', 'vh'],
        spacingScale: {
          operator: '*',
          increment: 1.5,
          steps: 7,
          mediumStep: 1.5,
          unit: 'rem',
        },
      },
      useRootPaddingAwareAlignments: true,
    },
    styles: {
      color: {
        background: 'var(--wp--preset--color--base)',
        text: 'var(--wp--preset--color--contrast)',
      },
      typography: {
        fontFamily: 'var(--wp--preset--font-family--system)',
        fontSize: 'var(--wp--preset--font-size--medium)',
        lineHeight: '1.6',
      },
      spacing: {
        padding: {
          top: '0',
          right: 'var(--wp--preset--spacing--50)',
          bottom: '0',
          left: 'var(--wp--preset--spacing--50)',
        },
      },
      elements: {
        link: {
          color: {text: 'var(--wp--preset--color--primary)'},
        },
        heading: {
          typography: {
            fontFamily: 'var(--wp--preset--font-family--system)',
            fontWeight: '700',
            lineHeight: '1.2',
          },
        },
        button: {
          color: {
            background: 'var(--wp--preset--color--primary)',
            text: 'var(--wp--preset--color--base)',
          },
          spacing: {
            padding: {
              top: '0.6rem',
              right: '1.2rem',
              bottom: '0.6rem',
              left: '1.2rem',
            },
          },
        },
      },
    },
    templateParts: [
      {name: 'header', title: 'Header', area: 'header'},
      {name: 'footer', title: 'Footer', area: 'footer'},
    ],
  };
  return `${JSON.stringify(data, null, 2)}\n`;
}

function blockStyleCss(opts: ScaffoldOptions): string {
  return `${styleHeader(opts)}
/*
 * This is a block (Full Site Editing) theme. Most styling is handled by
 * theme.json. Add any additional global CSS below.
 */

body {
  margin: 0;
}
`;
}

function blockFunctionsPhp(opts: ScaffoldOptions): string {
  const fn = phpPrefix(opts.slug);
  return `<?php
/**
 * ${opts.name} functions and definitions.
 *
 * @package ${opts.name}
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('${fn}_setup')) {
    /**
     * Set up theme support.
     */
    function ${fn}_setup(): void {
        add_theme_support('wp-block-styles');
        add_theme_support('editor-styles');
        add_theme_support('responsive-embeds');
        add_theme_support('html5', [
            'comment-list',
            'comment-form',
            'search-form',
            'gallery',
            'caption',
            'style',
            'script',
        ]);
        load_theme_textdomain('${opts.slug}', get_template_directory() . '/languages');
    }
}
add_action('after_setup_theme', '${fn}_setup');

if (!function_exists('${fn}_enqueue_assets')) {
    /**
     * Enqueue the theme stylesheet.
     */
    function ${fn}_enqueue_assets(): void {
        wp_enqueue_style(
            '${opts.slug}-style',
            get_stylesheet_uri(),
            [],
            wp_get_theme()->get('Version')
        );
    }
}
add_action('wp_enqueue_scripts', '${fn}_enqueue_assets');
`;
}

function phpPrefix(slug: string): string {
  return slug.replace(/-/g, '_');
}

function headerHtml(): string {
  return `<!-- wp:group {"tagName":"header","style":{"spacing":{"padding":{"top":"var:preset|spacing|40","bottom":"var:preset|spacing|40"}}},"layout":{"type":"constrained"}} -->
<header class="wp-block-group" style="padding-top:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--40)">
\t<!-- wp:group {"layout":{"type":"flex","flexWrap":"wrap","justifyContent":"space-between","verticalAlignment":"center"}} -->
\t<div class="wp-block-group">
\t\t<!-- wp:site-title {"level":1} /-->

\t\t<!-- wp:navigation {"layout":{"type":"flex","setCascadingProperties":true,"justifyContent":"right"}} /-->
\t</div>
\t<!-- /wp:group -->
</header>
<!-- /wp:group -->
`;
}

function footerHtml(opts: ScaffoldOptions): string {
  return `<!-- wp:group {"tagName":"footer","style":{"spacing":{"padding":{"top":"var:preset|spacing|50","bottom":"var:preset|spacing|50"}}},"layout":{"type":"constrained"}} -->
<footer class="wp-block-group" style="padding-top:var(--wp--preset--spacing--50);padding-bottom:var(--wp--preset--spacing--50)">
\t<!-- wp:paragraph {"align":"center","fontSize":"small"} -->
\t<p class="has-text-align-center has-small-font-size">© <!-- wp:site-title /--> — Powered by WordPress &amp; ${opts.name}.</p>
\t<!-- /wp:paragraph -->
</footer>
<!-- /wp:group -->
`;
}

function indexHtml(): string {
  return `<!-- wp:template-part {"slug":"header","tagName":"header"} /-->

<!-- wp:group {"tagName":"main","style":{"spacing":{"blockGap":"var:preset|spacing|60","margin":{"top":"var:preset|spacing|60","bottom":"var:preset|spacing|60"}}},"layout":{"type":"constrained"}} -->
<main class="wp-block-group" style="margin-top:var(--wp--preset--spacing--60);margin-bottom:var(--wp--preset--spacing--60)">
\t<!-- wp:query {"queryId":0,"query":{"perPage":10,"pages":0,"offset":0,"postType":"post","order":"desc","orderBy":"date","inherit":true},"layout":{"type":"constrained"}} -->
\t<div class="wp-block-query">
\t\t<!-- wp:post-template {"style":{"spacing":{"blockGap":"var:preset|spacing|60"}}} -->
\t\t\t<!-- wp:post-title {"isLink":true,"fontSize":"large"} /-->
\t\t\t<!-- wp:post-excerpt /-->
\t\t<!-- /wp:post-template -->

\t\t<!-- wp:query-pagination {"layout":{"type":"flex","justifyContent":"space-between"}} -->
\t\t\t<!-- wp:query-pagination-previous /-->
\t\t\t<!-- wp:query-pagination-numbers /-->
\t\t\t<!-- wp:query-pagination-next /-->
\t\t<!-- /wp:query-pagination -->

\t\t<!-- wp:query-no-results -->
\t\t\t<!-- wp:paragraph -->
\t\t\t<p>No posts found.</p>
\t\t\t<!-- /wp:paragraph -->
\t\t<!-- /wp:query-no-results -->
\t</div>
\t<!-- /wp:query -->
</main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->
`;
}

function singleHtml(): string {
  return `<!-- wp:template-part {"slug":"header","tagName":"header"} /-->

<!-- wp:group {"tagName":"main","style":{"spacing":{"blockGap":"var:preset|spacing|50","margin":{"top":"var:preset|spacing|60","bottom":"var:preset|spacing|60"}}},"layout":{"type":"constrained"}} -->
<main class="wp-block-group" style="margin-top:var(--wp--preset--spacing--60);margin-bottom:var(--wp--preset--spacing--60)">
\t<!-- wp:post-title {"level":1,"fontSize":"x-large"} /-->
\t<!-- wp:post-date /-->
\t<!-- wp:post-featured-image {"align":"wide"} /-->
\t<!-- wp:post-content {"layout":{"type":"constrained"}} /-->

\t<!-- wp:spacer {"height":"var:preset|spacing|50"} -->
\t<div style="height:var(--wp--preset--spacing--50)" aria-hidden="true" class="wp-block-spacer"></div>
\t<!-- /wp:spacer -->

\t<!-- wp:comments -->
\t<div class="wp-block-comments">
\t\t<!-- wp:comment-template -->
\t\t\t<!-- wp:comment-author-name /-->
\t\t\t<!-- wp:comment-date /-->
\t\t\t<!-- wp:comment-content /-->
\t\t<!-- /wp:comment-template -->
\t\t<!-- wp:post-comments-form /-->
\t</div>
\t<!-- /wp:comments -->
</main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->
`;
}

function pageHtml(): string {
  return `<!-- wp:template-part {"slug":"header","tagName":"header"} /-->

<!-- wp:group {"tagName":"main","style":{"spacing":{"blockGap":"var:preset|spacing|50","margin":{"top":"var:preset|spacing|60","bottom":"var:preset|spacing|60"}}},"layout":{"type":"constrained"}} -->
<main class="wp-block-group" style="margin-top:var(--wp--preset--spacing--60);margin-bottom:var(--wp--preset--spacing--60)">
\t<!-- wp:post-title {"level":1,"fontSize":"x-large"} /-->
\t<!-- wp:post-featured-image {"align":"wide"} /-->
\t<!-- wp:post-content {"layout":{"type":"constrained"}} /-->
</main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->
`;
}

function heroPattern(opts: ScaffoldOptions): string {
  return `<?php
/**
 * Title: Hero
 * Slug: ${opts.slug}/hero
 * Categories: featured, banner
 * Description: A simple hero section with a heading, paragraph and call-to-action button.
 *
 * @package ${opts.name}
 */
?>
<!-- wp:group {"style":{"spacing":{"padding":{"top":"var:preset|spacing|70","bottom":"var:preset|spacing|70"}}},"backgroundColor":"secondary","layout":{"type":"constrained"}} -->
<div class="wp-block-group has-secondary-background-color has-background" style="padding-top:var(--wp--preset--spacing--70);padding-bottom:var(--wp--preset--spacing--70)">
\t<!-- wp:heading {"textAlign":"center","level":1,"fontSize":"xx-large"} -->
\t<h1 class="wp-block-heading has-text-align-center has-xx-large-font-size"><?php echo esc_html__('Build something remarkable', '${opts.slug}'); ?></h1>
\t<!-- /wp:heading -->

\t<!-- wp:paragraph {"align":"center","fontSize":"large"} -->
\t<p class="has-text-align-center has-large-font-size"><?php echo esc_html__('A modern WordPress block theme scaffolded with Kiqr. Edit this hero in the Site Editor.', '${opts.slug}'); ?></p>
\t<!-- /wp:paragraph -->

\t<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
\t<div class="wp-block-buttons">
\t\t<!-- wp:button -->
\t\t<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="#"><?php echo esc_html__('Get started', '${opts.slug}'); ?></a></div>
\t\t<!-- /wp:button -->
\t</div>
\t<!-- /wp:buttons -->
</div>
<!-- /wp:group -->
`;
}

function generateBlockTheme(opts: ScaffoldOptions): Record<string, string> {
  return {
    'style.css': blockStyleCss(opts),
    'theme.json': themeJson(),
    'functions.php': blockFunctionsPhp(opts),
    'readme.txt': readme(opts),
    '.gitignore': gitignore(),
    'templates/index.html': indexHtml(),
    'templates/single.html': singleHtml(),
    'templates/page.html': pageHtml(),
    'parts/header.html': headerHtml(),
    'parts/footer.html': footerHtml(opts),
    'patterns/hero.php': heroPattern(opts),
  };
}

function classicStyleCss(opts: ScaffoldOptions): string {
  return `${styleHeader(opts)}
body {
  margin: 0;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial,
    sans-serif;
  line-height: 1.6;
  color: #111;
}

.site-header,
.site-footer {
  padding: 1.5rem;
}

.site-content {
  max-width: 640px;
  margin: 0 auto;
  padding: 1.5rem;
}

a {
  color: #3858e9;
}
`;
}

function classicFunctionsPhp(opts: ScaffoldOptions): string {
  const fn = phpPrefix(opts.slug);
  return `<?php
/**
 * ${opts.name} functions and definitions.
 *
 * @package ${opts.name}
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('${fn}_setup')) {
    /**
     * Set up theme support.
     */
    function ${fn}_setup(): void {
        add_theme_support('title-tag');
        add_theme_support('post-thumbnails');
        add_theme_support('automatic-feed-links');
        add_theme_support('html5', [
            'comment-list',
            'comment-form',
            'search-form',
            'gallery',
            'caption',
            'style',
            'script',
        ]);
        register_nav_menus([
            'primary' => __('Primary Menu', '${opts.slug}'),
        ]);
        load_theme_textdomain('${opts.slug}', get_template_directory() . '/languages');
    }
}
add_action('after_setup_theme', '${fn}_setup');

if (!function_exists('${fn}_enqueue_assets')) {
    /**
     * Enqueue the theme stylesheet.
     */
    function ${fn}_enqueue_assets(): void {
        wp_enqueue_style(
            '${opts.slug}-style',
            get_stylesheet_uri(),
            [],
            wp_get_theme()->get('Version')
        );
    }
}
add_action('wp_enqueue_scripts', '${fn}_enqueue_assets');
`;
}

function classicHeaderPhp(opts: ScaffoldOptions): string {
  return `<?php
/**
 * The header for ${opts.name}.
 *
 * @package ${opts.name}
 */
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
\t<meta charset="<?php bloginfo('charset'); ?>">
\t<meta name="viewport" content="width=device-width, initial-scale=1">
\t<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<header class="site-header">
\t<a class="site-title" href="<?php echo esc_url(home_url('/')); ?>"><?php bloginfo('name'); ?></a>
\t<?php
\twp_nav_menu([
\t\t'theme_location' => 'primary',
\t\t'fallback_cb' => false,
\t]);
\t?>
</header>
<div class="site-content">
`;
}

function classicFooterPhp(opts: ScaffoldOptions): string {
  return `<?php
/**
 * The footer for ${opts.name}.
 *
 * @package ${opts.name}
 */
?>
</div><!-- .site-content -->
<footer class="site-footer">
\t<p>&copy; <?php echo esc_html(date('Y')); ?> <?php bloginfo('name'); ?> &mdash; Powered by WordPress &amp; ${opts.name}.</p>
</footer>
<?php wp_footer(); ?>
</body>
</html>
`;
}

function classicIndexPhp(opts: ScaffoldOptions): string {
  return `<?php
/**
 * The main template file for ${opts.name}.
 *
 * @package ${opts.name}
 */

get_header();
?>

<main class="site-main">
\t<?php if (have_posts()) : ?>
\t\t<?php while (have_posts()) : the_post(); ?>
\t\t\t<article <?php post_class(); ?>>
\t\t\t\t<h2 class="entry-title">
\t\t\t\t\t<a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
\t\t\t\t</h2>
\t\t\t\t<div class="entry-content">
\t\t\t\t\t<?php the_excerpt(); ?>
\t\t\t\t</div>
\t\t\t</article>
\t\t<?php endwhile; ?>

\t\t<?php the_posts_pagination(); ?>
\t<?php else : ?>
\t\t<p><?php echo esc_html__('No posts found.', '${opts.slug}'); ?></p>
\t<?php endif; ?>
</main>

<?php
get_footer();
`;
}

function generateClassicTheme(opts: ScaffoldOptions): Record<string, string> {
  return {
    'style.css': classicStyleCss(opts),
    'index.php': classicIndexPhp(opts),
    'functions.php': classicFunctionsPhp(opts),
    'header.php': classicHeaderPhp(opts),
    'footer.php': classicFooterPhp(opts),
    'readme.txt': readme(opts),
    '.gitignore': gitignore(),
  };
}

/**
 * Generate the complete file map for a WordPress theme.
 *
 * Pure function: returns a map of `{ relativeFilePath: fileContents }`.
 * It does not touch the filesystem so it can be unit tested.
 */
export function generateTheme(opts: ScaffoldOptions): Record<string, string> {
  return opts.type === 'classic' ? generateClassicTheme(opts) : generateBlockTheme(opts);
}

function isNonEmptyDir(dir: string): boolean {
  if (!fs.existsSync(dir)) return false;
  if (!fs.statSync(dir).isDirectory()) return true;
  return fs.readdirSync(dir).length > 0;
}

/**
 * Write a generated theme file map to disk.
 *
 * Creates nested directories as needed. Refuses to write if `targetDir`
 * already exists and is non-empty, to avoid clobbering existing files.
 */
export function writeTheme(targetDir: string, files: Record<string, string>): void {
  if (isNonEmptyDir(targetDir)) {
    throw new Error(
      `Directory "${targetDir}" already exists and is not empty. Choose a different name or remove it first.`,
    );
  }

  fs.mkdirSync(targetDir, {recursive: true});

  for (const [relativePath, contents] of Object.entries(files)) {
    const fullPath = path.join(targetDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), {recursive: true});
    fs.writeFileSync(fullPath, contents, 'utf-8');
  }
}
