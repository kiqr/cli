import {describe, expect, it, vi} from 'vitest';
import {
  availablePhpVersionsFor,
  validateWordPressPhp,
  wordpressImageTag,
  wordpressTagExists,
} from '../../src/lib/image-tags.js';

function mockResponse(init: {
  status?: number;
  ok?: boolean;
  json?: () => Promise<unknown>;
}): Response {
  const status = init.status ?? 200;
  return {
    status,
    ok: init.ok ?? (status >= 200 && status < 300),
    json: init.json ?? (async () => ({})),
  } as Response;
}

describe('wordpressImageTag', () => {
  it('builds a PHP-only tag for the latest WordPress', () => {
    expect(wordpressImageTag('latest', '8.3')).toBe('php8.3');
  });

  it('builds a version-pinned tag for a specific WordPress version', () => {
    expect(wordpressImageTag('6.7', '8.3')).toBe('6.7-php8.3');
  });

  it('handles other PHP versions', () => {
    expect(wordpressImageTag('6.4', '8.5')).toBe('6.4-php8.5');
    expect(wordpressImageTag('latest', '8.2')).toBe('php8.2');
  });
});

describe('wordpressTagExists', () => {
  it('returns true on HTTP 200', async () => {
    const fetchImpl = vi.fn(async () => mockResponse({status: 200}));
    await expect(wordpressTagExists('6.7-php8.3', fetchImpl)).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://hub.docker.com/v2/repositories/library/wordpress/tags/6.7-php8.3',
    );
  });

  it('returns false on HTTP 404', async () => {
    const fetchImpl = vi.fn(async () => mockResponse({status: 404}));
    await expect(wordpressTagExists('6.7-php8.5', fetchImpl)).resolves.toBe(false);
  });

  it('returns null on an unexpected status (best-effort)', async () => {
    const fetchImpl = vi.fn(async () => mockResponse({status: 500}));
    await expect(wordpressTagExists('6.7-php8.3', fetchImpl)).resolves.toBeNull();
  });

  it('returns null when fetch throws (offline)', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('network down');
    });
    await expect(wordpressTagExists('6.7-php8.3', fetchImpl)).resolves.toBeNull();
  });
});

describe('availablePhpVersionsFor', () => {
  it('parses, de-duplicates and sorts PHP versions for a pinned version', async () => {
    const fetchImpl = vi.fn(async () =>
      mockResponse({
        status: 200,
        json: async () => ({
          results: [
            {name: '6.7-php8.3'},
            {name: '6.7-php8.2'},
            {name: '6.7-php8.3-apache'},
            {name: '6.7-php8.1-fpm'},
          ],
        }),
      }),
    );
    await expect(availablePhpVersionsFor('6.7', fetchImpl)).resolves.toEqual([
      '8.1',
      '8.2',
      '8.3',
    ]);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://hub.docker.com/v2/repositories/library/wordpress/tags?page_size=100&name=6.7-php',
    );
  });

  it('uses the php prefix for the latest version', async () => {
    const fetchImpl = vi.fn(async () =>
      mockResponse({
        status: 200,
        json: async () => ({results: [{name: 'php8.4'}, {name: 'php8.3'}]}),
      }),
    );
    await expect(availablePhpVersionsFor('latest', fetchImpl)).resolves.toEqual([
      '8.3',
      '8.4',
    ]);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://hub.docker.com/v2/repositories/library/wordpress/tags?page_size=100&name=php',
    );
  });

  it('ignores tags without a php segment and entries without a name', async () => {
    const fetchImpl = vi.fn(async () =>
      mockResponse({
        status: 200,
        json: async () => ({
          results: [{name: '6.7'}, {}, {name: '6.7-php8.3'}],
        }),
      }),
    );
    await expect(availablePhpVersionsFor('6.7', fetchImpl)).resolves.toEqual(['8.3']);
  });

  it('returns an empty list on a non-ok response', async () => {
    const fetchImpl = vi.fn(async () => mockResponse({status: 500, ok: false}));
    await expect(availablePhpVersionsFor('6.7', fetchImpl)).resolves.toEqual([]);
  });

  it('returns an empty list when fetch throws', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('offline');
    });
    await expect(availablePhpVersionsFor('6.7', fetchImpl)).resolves.toEqual([]);
  });

  it('returns an empty list when results are missing', async () => {
    const fetchImpl = vi.fn(async () =>
      mockResponse({status: 200, json: async () => ({})}),
    );
    await expect(availablePhpVersionsFor('6.7', fetchImpl)).resolves.toEqual([]);
  });
});

describe('validateWordPressPhp', () => {
  it('passes when the tag exists', async () => {
    const fetchImpl = vi.fn(async () => mockResponse({status: 200}));
    const result = await validateWordPressPhp('6.7', '8.3', fetchImpl);
    expect(result).toEqual({ok: true, tag: '6.7-php8.3'});
    // Should not need a second call to list available versions.
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('passes (best-effort) when existence is unknown', async () => {
    const fetchImpl = vi.fn(async () => mockResponse({status: 500}));
    const result = await validateWordPressPhp('6.7', '8.3', fetchImpl);
    expect(result).toEqual({ok: true, tag: '6.7-php8.3'});
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('passes (best-effort) when fetch throws (offline)', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('offline');
    });
    const result = await validateWordPressPhp('6.7', '8.5', fetchImpl);
    expect(result).toEqual({ok: true, tag: '6.7-php8.5'});
  });

  it('fails and lists available PHP versions when the tag is missing', async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const href = String(url);
      if (href.endsWith('/tags/6.7-php8.5')) {
        return mockResponse({status: 404});
      }
      return mockResponse({
        status: 200,
        json: async () => ({
          results: [{name: '6.7-php8.2'}, {name: '6.7-php8.3'}, {name: '6.7-php8.4'}],
        }),
      });
    });

    const result = await validateWordPressPhp('6.7', '8.5', fetchImpl);
    expect(result.ok).toBe(false);
    expect(result.tag).toBe('6.7-php8.5');
    expect(result.availablePhp).toEqual(['8.2', '8.3', '8.4']);
    expect(result.message).toContain('wordpress:6.7-php8.5');
    expect(result.message).toContain('8.2, 8.3, 8.4');
    expect(result.message).toContain('kiqr.yaml');
  });

  it('fails gracefully when the missing tag has no listable alternatives', async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const href = String(url);
      if (href.includes('/tags/')) return mockResponse({status: 404});
      return mockResponse({status: 200, json: async () => ({results: []})});
    });

    const result = await validateWordPressPhp('6.7', '8.5', fetchImpl);
    expect(result.ok).toBe(false);
    expect(result.availablePhp).toEqual([]);
    expect(result.message).toContain('No PHP-pinned tags');
  });

  it('reports the latest-version label for missing latest tags', async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const href = String(url);
      if (href.includes('/tags/')) return mockResponse({status: 404});
      return mockResponse({
        status: 200,
        json: async () => ({results: [{name: 'php8.3'}, {name: 'php8.4'}]}),
      });
    });

    const result = await validateWordPressPhp('latest', '8.9', fetchImpl);
    expect(result.ok).toBe(false);
    expect(result.tag).toBe('php8.9');
    expect(result.message).toContain('the latest WordPress');
    expect(result.availablePhp).toEqual(['8.3', '8.4']);
  });
});
