// Best-effort validation of the configured WordPress x PHP combination against
// Docker Hub. Not every `wordpress:<version>-php<php>` tag is published (for
// example `wordpress:6.4-php8.5` and `wordpress:6.7-php8.5` do not exist), so a
// `docker compose pull` would otherwise fail with a confusing error.
//
// The Docker Hub HTTP fetch is injectable so this module can be unit-tested
// without touching the network.

const DOCKER_HUB_TAGS_URL =
  'https://hub.docker.com/v2/repositories/library/wordpress/tags';

/**
 * Build the official `wordpress` image tag for a WordPress + PHP combination.
 *
 * Mirrors `BitnamiRuntimeProvider.getWordPressImage`'s tag scheme:
 *   - `php8.3` for the latest WordPress on a given PHP version
 *   - `6.7-php8.3` for a specific WordPress + PHP combination
 */
export function wordpressImageTag(version: string, php: string): string {
  return version === 'latest' ? `php${php}` : `${version}-php${php}`;
}

/**
 * Check whether a `wordpress` image tag exists on Docker Hub.
 *
 * Returns `true` on HTTP 200, `false` on HTTP 404, and `null` on any other
 * status or thrown error. The `null` case is deliberate: this check is
 * best-effort and an unknown/offline result must never block `kiqr up`.
 */
export async function wordpressTagExists(
  tag: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean | null> {
  try {
    const res = await fetchImpl(`${DOCKER_HUB_TAGS_URL}/${tag}`);
    if (res.status === 200) return true;
    if (res.status === 404) return false;
    return null;
  } catch {
    return null;
  }
}

/**
 * List the PHP versions that ARE published for a given WordPress version.
 *
 * Queries Docker Hub for tags matching the relevant prefix (`php` for `latest`,
 * otherwise `<version>-php`), extracts the `php8.x` portion from each tag name,
 * and returns a sorted, de-duplicated list. Returns `[]` on any error.
 */
export async function availablePhpVersionsFor(
  version: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string[]> {
  const prefix = version === 'latest' ? 'php' : `${version}-php`;
  try {
    const res = await fetchImpl(`${DOCKER_HUB_TAGS_URL}?page_size=100&name=${prefix}`);
    if (!res.ok) return [];
    const body = (await res.json()) as {results?: Array<{name?: string}>};
    const results = body.results ?? [];
    const versions = new Set<string>();
    for (const result of results) {
      const name = result.name;
      if (!name) continue;
      const match = name.match(/php(\d+\.\d+)/);
      if (match?.[1]) versions.add(match[1]);
    }
    return Array.from(versions).sort();
  } catch {
    return [];
  }
}

export interface WordPressTagCheck {
  ok: boolean;
  tag: string;
  message?: string;
  availablePhp?: string[];
}

/**
 * Validate a configured WordPress + PHP combination against Docker Hub.
 *
 * Best-effort: if the tag's existence cannot be determined (network failure or
 * unexpected response), the check passes so offline use is never blocked. The
 * check only fails when Docker Hub positively reports the tag as missing.
 */
export async function validateWordPressPhp(
  version: string,
  php: string,
  fetchImpl: typeof fetch = fetch,
): Promise<WordPressTagCheck> {
  const tag = wordpressImageTag(version, php);
  const exists = await wordpressTagExists(tag, fetchImpl);

  // Unknown (offline / unexpected status) or known-good: do not block.
  if (exists === null || exists === true) return {ok: true, tag};

  const availablePhp = await availablePhpVersionsFor(version, fetchImpl);
  const label = version === 'latest' ? 'the latest WordPress' : `WordPress ${version}`;
  const available =
    availablePhp.length > 0
      ? `Available PHP versions for ${label}: ${availablePhp.join(', ')}.`
      : `No PHP-pinned tags were found for ${label} on Docker Hub.`;

  return {
    ok: false,
    tag,
    availablePhp,
    message:
      `The Docker image "wordpress:${tag}" does not exist on Docker Hub, so ${label} ` +
      `is not published for PHP ${php}.\n${available}\n` +
      'Update "wordpress.php_version" in kiqr.yaml to a supported version and try again.',
  };
}
