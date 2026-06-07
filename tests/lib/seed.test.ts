import {describe, expect, it} from 'vitest';
import {generateSeedWxr, SEED_PRESETS, type SeedPreset} from '../../src/lib/seed.js';

/**
 * Minimal, dependency-free XML well-formedness checker.
 *
 * It is not a full parser — it just walks the document, skipping over CDATA
 * sections, comments, the XML declaration, and attribute values, then verifies
 * that every start tag has a matching end tag in the correct order. That is
 * enough to catch the structural mistakes a hand-rolled generator could make
 * (unbalanced tags, stray `<`/`>`, broken CDATA).
 */
function assertWellFormed(xml: string): void {
  const stack: string[] = [];
  let i = 0;
  const n = xml.length;

  while (i < n) {
    const lt = xml.indexOf('<', i);
    if (lt === -1) break;

    // Text between tags must not contain a raw '<' (already handled) — and
    // crucially must not contain a raw '>' that would imply a broken tag.
    const text = xml.slice(i, lt);
    if (text.includes('>')) {
      throw new Error(`Unescaped '>' in text content near: ${text.slice(0, 40)}`);
    }

    if (xml.startsWith('<![CDATA[', lt)) {
      const end = xml.indexOf(']]>', lt);
      if (end === -1) throw new Error('Unterminated CDATA section');
      i = end + 3;
      continue;
    }

    if (xml.startsWith('<!--', lt)) {
      const end = xml.indexOf('-->', lt);
      if (end === -1) throw new Error('Unterminated comment');
      i = end + 3;
      continue;
    }

    if (xml.startsWith('<?', lt)) {
      const end = xml.indexOf('?>', lt);
      if (end === -1) throw new Error('Unterminated processing instruction');
      i = end + 2;
      continue;
    }

    const gt = xml.indexOf('>', lt);
    if (gt === -1) throw new Error('Unterminated tag');
    const raw = xml.slice(lt + 1, gt).trim();

    if (raw.endsWith('/')) {
      // self-closing tag — nothing to push
      i = gt + 1;
      continue;
    }

    if (raw.startsWith('/')) {
      const name = raw.slice(1).trim();
      const open = stack.pop();
      if (open !== name) {
        throw new Error(`Mismatched closing tag </${name}> (expected </${open}>)`);
      }
      i = gt + 1;
      continue;
    }

    // Start tag: the name is everything up to the first whitespace.
    const name = raw.split(/\s/)[0];
    stack.push(name);
    i = gt + 1;
  }

  if (stack.length !== 0) {
    throw new Error(`Unclosed tags: ${stack.join(', ')}`);
  }
}

/** Count occurrences of a substring. */
function count(haystack: string, needle: string): number {
  let total = 0;
  let from = 0;
  for (;;) {
    const idx = haystack.indexOf(needle, from);
    if (idx === -1) break;
    total += 1;
    from = idx + needle.length;
  }
  return total;
}

/** Extract the value of every `<wp:post_type>` element. */
function postTypes(xml: string): string[] {
  const matches = [
    ...xml.matchAll(/<wp:post_type><!\[CDATA\[([^\]]*)\]\]><\/wp:post_type>/g),
  ];
  return matches.map((m) => m[1]);
}

const EXPECTED: Record<SeedPreset, {items: number; types: Record<string, number>}> = {
  blog: {items: 6, types: {post: 5, page: 1}},
  portfolio: {items: 5, types: {page: 5}},
  woocommerce: {items: 6, types: {product: 6}},
};

describe('SEED_PRESETS', () => {
  it('exposes the three documented presets', () => {
    expect(SEED_PRESETS).toEqual(['blog', 'portfolio', 'woocommerce']);
  });
});

describe('generateSeedWxr', () => {
  it.each(SEED_PRESETS)('produces well-formed XML for the %s preset', (preset) => {
    const xml = generateSeedWxr(preset);
    expect(() => assertWellFormed(xml)).not.toThrow();
  });

  it.each(SEED_PRESETS)('emits a valid WXR 1.2 envelope for %s', (preset) => {
    const xml = generateSeedWxr(preset);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8" ?>');
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain('xmlns:wp="http://wordpress.org/export/1.2/"');
    expect(xml).toContain('xmlns:content="http://purl.org/rss/1.0/modules/content/"');
    expect(xml).toContain('xmlns:dc="http://purl.org/dc/elements/1.1/"');
    expect(xml).toContain('<wp:wxr_version>1.2</wp:wxr_version>');
    expect(count(xml, '<channel>')).toBe(1);
    expect(count(xml, '</channel>')).toBe(1);
  });

  it.each(SEED_PRESETS)('contains the expected item count for %s', (preset) => {
    const xml = generateSeedWxr(preset);
    expect(count(xml, '<item>')).toBe(EXPECTED[preset].items);
    expect(count(xml, '</item>')).toBe(EXPECTED[preset].items);
  });

  it.each(SEED_PRESETS)('uses the expected post types for %s', (preset) => {
    const xml = generateSeedWxr(preset);
    const types = postTypes(xml);
    const counts: Record<string, number> = {};
    for (const t of types) counts[t] = (counts[t] ?? 0) + 1;
    expect(counts).toEqual(EXPECTED[preset].types);
  });

  it.each(SEED_PRESETS)('publishes every item for %s', (preset) => {
    const xml = generateSeedWxr(preset);
    const items = EXPECTED[preset].items;
    expect(count(xml, '<wp:status><![CDATA[publish]]></wp:status>')).toBe(items);
  });

  it.each(SEED_PRESETS)('wraps content in CDATA for %s', (preset) => {
    const xml = generateSeedWxr(preset);
    const items = EXPECTED[preset].items;
    expect(count(xml, '<content:encoded><![CDATA[')).toBe(items);
    // Every item carries a post_name slug.
    expect(count(xml, '<wp:post_name><![CDATA[')).toBe(items);
  });

  it.each(SEED_PRESETS)('uses block-editor markup for %s', (preset) => {
    const xml = generateSeedWxr(preset);
    expect(xml).toContain('<!-- wp:paragraph -->');
    expect(xml).toContain('<!-- /wp:paragraph -->');
  });

  it('renders WooCommerce products with prices in the content', () => {
    const xml = generateSeedWxr('woocommerce');
    expect(xml).toContain('Price: $48.00');
    expect(xml).toContain('Price: $18.50');
  });

  it('includes an About page for the blog preset', () => {
    const xml = generateSeedWxr('blog');
    expect(xml).toContain('<wp:post_name><![CDATA[about]]></wp:post_name>');
  });

  it('includes an intro page plus four projects for the portfolio preset', () => {
    const xml = generateSeedWxr('portfolio');
    expect(xml).toContain('<wp:post_name><![CDATA[selected-work]]></wp:post_name>');
    expect(xml).toContain('<!-- wp:cover');
    expect(xml).toContain('<!-- wp:columns -->');
  });

  it.each(SEED_PRESETS)('derives dates from fixed literals for %s', (preset) => {
    const xml = generateSeedWxr(preset);
    // No ISO timestamp with a millisecond/Z suffix, which would betray a
    // runtime Date() call leaking into the output.
    expect(xml).not.toMatch(/\dT\d{2}:\d{2}:\d{2}\.\d{3}Z/);
    expect(xml).toContain('2024-');
  });

  it.each(SEED_PRESETS)('is byte-for-byte deterministic for %s', (preset) => {
    expect(generateSeedWxr(preset)).toBe(generateSeedWxr(preset));
  });

  it('produces different output per preset', () => {
    const blog = generateSeedWxr('blog');
    const portfolio = generateSeedWxr('portfolio');
    const woo = generateSeedWxr('woocommerce');
    expect(blog).not.toBe(portfolio);
    expect(portfolio).not.toBe(woo);
    expect(blog).not.toBe(woo);
  });
});
