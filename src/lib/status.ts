import {readProjectConfig} from './config.js';
import {buildProjectHostname} from './hostname.js';

/**
 * The user-facing services that make up a running Kiqr project. The mariadb
 * service is included because the site is not truly "up" without it, and
 * surfacing it helps diagnose a stuck/partial start.
 */
export const STATUS_SERVICES = ['wordpress', 'mariadb', 'phpmyadmin'] as const;

export type StatusService = (typeof STATUS_SERVICES)[number];

export interface ContainerStatus {
  name: string;
  running: boolean;
}

export interface ProjectStatus {
  initialized: boolean;
  running: boolean;
  containers: ContainerStatus[];
  urls?: {
    site: string;
    admin: string;
    phpmyadmin: string;
  };
}

export interface ProjectStatusDeps {
  /**
   * Returns true when a container whose name contains `name` is running.
   * Injected so the Docker call can be mocked in tests. Defaults to nothing
   * here on purpose — callers must supply it.
   */
  isContainerRunning: (name: string) => boolean;
  /** Read the project config. Injected so fs access can be controlled in tests. */
  readProjectConfig?: (dir?: string) => ReturnType<typeof readProjectConfig>;
  /** Working directory to resolve the project config from. */
  cwd?: string;
}

/**
 * Build the docker compose default container name for a service.
 *
 * The project compose file lives in a directory named after the project id, so
 * Compose names containers `<project_id>-<service>-<n>`. `isContainerRunning`
 * matches on a name substring, so the `<project_id>-<service>` prefix is a
 * precise, instance-number-agnostic filter.
 */
export function containerNameFor(projectId: string, service: StatusService): string {
  return `${projectId}-${service}`;
}

/**
 * Recover the bare service name from a `<project_id>-<service>` container name
 * for display, regardless of whether the project id itself contains hyphens.
 * Falls back to the full name if no known service suffix matches.
 */
export function serviceFromContainerName(name: string): string {
  const match = STATUS_SERVICES.find((service) => name.endsWith(`-${service}`));
  return match ?? name;
}

/**
 * Compute a project's live status: whether it is initialized, whether each
 * service container is running, the overall running state, and the URLs to
 * reach it (only when the site is up).
 *
 * Pure aside from the injected `isContainerRunning` check and the config read.
 */
export function getProjectStatus(deps: ProjectStatusDeps): ProjectStatus {
  const readConfig = deps.readProjectConfig ?? readProjectConfig;
  const pc = readConfig(deps.cwd);

  if (!pc) {
    return {initialized: false, running: false, containers: []};
  }

  const containers: ContainerStatus[] = STATUS_SERVICES.map((service) => {
    const name = containerNameFor(pc.project_id, service);
    return {name, running: deps.isContainerRunning(name)};
  });

  // The site is "running" when the WordPress front-end container is up. The
  // other services are reported individually so a partial state is visible.
  const wordpressName = containerNameFor(pc.project_id, 'wordpress');
  const running = containers.find((c) => c.name === wordpressName)?.running ?? false;

  const status: ProjectStatus = {
    initialized: true,
    running,
    containers,
  };

  if (running) {
    const hostname = buildProjectHostname(pc.name);
    const phpMyAdminHostname = buildProjectHostname(pc.name, 'phpmyadmin');
    status.urls = {
      site: `http://${hostname}:5477`,
      admin: `http://${hostname}:5477/wp-admin`,
      phpmyadmin: `http://${phpMyAdminHostname}:5477`,
    };
  }

  return status;
}
