import {execSync} from 'node:child_process';

export function isDockerInstalled(): boolean {
  try {
    execSync('docker --version', {stdio: 'pipe'});
    return true;
  } catch {
    return false;
  }
}

export function isDockerRunning(): boolean {
  try {
    execSync('docker info', {stdio: 'pipe'});
    return true;
  } catch {
    return false;
  }
}

export function runDockerCompose(
  composeFile: string,
  command: string,
  args: string[] = [],
): void {
  try {
    execSync(`docker compose -f "${composeFile}" ${command} ${args.join(' ')}`, {
      stdio: 'pipe',
    });
  } catch (error) {
    // execSync captures the subprocess output on the thrown error when
    // stdio is piped. Surface it so failures (port conflicts, image pull
    // errors, etc.) are diagnosable instead of silently swallowed.
    const err = error as {
      stderr?: Buffer | string;
      stdout?: Buffer | string;
      message?: string;
    };
    const detail =
      err.stderr?.toString().trim() ||
      err.stdout?.toString().trim() ||
      err.message ||
      'unknown error';
    throw new Error(`docker compose ${command} failed:\n${detail}`);
  }
}

export function removeDockerVolume(name: string): void {
  try {
    execSync(`docker volume rm "${name}"`, {stdio: 'pipe'});
  } catch {
    // Volume may not exist
  }
}

export function isContainerRunning(name: string): boolean {
  try {
    const output = execSync(
      `docker ps --filter "name=${name}" --filter "status=running" --format "{{.Names}}"`,
      {stdio: 'pipe'},
    ).toString().trim();
    return output.includes(name);
  } catch {
    return false;
  }
}
