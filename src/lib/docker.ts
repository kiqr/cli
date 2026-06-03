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
  execSync(`docker compose -f "${composeFile}" ${command} ${args.join(' ')}`, {
    stdio: 'pipe',
  });
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
