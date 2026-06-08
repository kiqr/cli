import fs from 'node:fs';
import path from 'node:path';

export const XDEBUG_DOCKERFILE = 'xdebug.Dockerfile';
export const XDEBUG_INI = 'xdebug.ini';

// Xdebug's default DBGp port. IDEs (e.g. VS Code) listen here for incoming
// debug connections from the running PHP process.
export const XDEBUG_CLIENT_PORT = 9003;

/**
 * Build the PHP ini that configures Xdebug for step-debugging.
 *
 * `host.docker.internal` resolves to the host machine from inside the
 * container (wired up via an `extra_hosts` entry on the wordpress service),
 * so the debugger connects out to the IDE listening on the host.
 */
export function xdebugIni(): string {
  return [
    'zend_extension=xdebug',
    'xdebug.mode=debug',
    'xdebug.start_with_request=yes',
    'xdebug.client_host=host.docker.internal',
    `xdebug.client_port=${XDEBUG_CLIENT_PORT}`,
    'xdebug.discover_client_host=true',
    '',
  ].join('\n');
}

/**
 * Build a minimal Dockerfile that layers Xdebug onto the official `wordpress`
 * image. The base image ships with the PECL/`docker-php-ext-*` helpers, so we
 * install the extension and drop the ini into the PHP conf.d directory. The
 * `zz-` prefix keeps it ordered last among conf.d files.
 */
export function buildXdebugDockerfile(baseImage: string): string {
  return [
    `FROM ${baseImage}`,
    'RUN pecl install xdebug && docker-php-ext-enable xdebug',
    `COPY ${XDEBUG_INI} /usr/local/etc/php/conf.d/zz-xdebug.ini`,
    '',
  ].join('\n');
}

/**
 * Write the Dockerfile + ini into the runtime dir so the wordpress service can
 * build from them. Returns the absolute path of the generated Dockerfile.
 */
export function writeXdebugAssets(runtimeDir: string, baseImage: string): string {
  fs.mkdirSync(runtimeDir, {recursive: true});
  const dockerfilePath = path.join(runtimeDir, XDEBUG_DOCKERFILE);
  const iniPath = path.join(runtimeDir, XDEBUG_INI);
  fs.writeFileSync(dockerfilePath, buildXdebugDockerfile(baseImage), 'utf-8');
  fs.writeFileSync(iniPath, xdebugIni(), 'utf-8');
  return dockerfilePath;
}

/**
 * Remove the generated Xdebug assets from the runtime dir. Safe to call when
 * they do not exist.
 */
export function removeXdebugAssets(runtimeDir: string): void {
  fs.rmSync(path.join(runtimeDir, XDEBUG_DOCKERFILE), {force: true});
  fs.rmSync(path.join(runtimeDir, XDEBUG_INI), {force: true});
}
