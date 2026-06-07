import {execSync} from 'node:child_process';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {
  isDockerInstalled,
  isDockerRunning,
  runDockerCompose,
} from '../../src/lib/docker.js';

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

const mockExecSync = vi.mocked(execSync);

describe('isDockerInstalled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when docker command succeeds', () => {
    mockExecSync.mockReturnValueOnce(Buffer.from('Docker version 24.0.0'));
    expect(isDockerInstalled()).toBe(true);
  });

  it('returns false when docker command fails', () => {
    mockExecSync.mockImplementationOnce(() => {
      throw new Error('command not found');
    });
    expect(isDockerInstalled()).toBe(false);
  });
});

describe('isDockerRunning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when docker info succeeds', () => {
    mockExecSync.mockReturnValueOnce(Buffer.from(''));
    expect(isDockerRunning()).toBe(true);
  });

  it('returns false when docker info fails', () => {
    mockExecSync.mockImplementationOnce(() => {
      throw new Error('Cannot connect');
    });
    expect(isDockerRunning()).toBe(false);
  });
});

describe('runDockerCompose', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not throw when the command succeeds', () => {
    mockExecSync.mockReturnValueOnce(Buffer.from(''));
    expect(() => runDockerCompose('/tmp/compose.yaml', 'up', ['-d'])).not.toThrow();
  });

  it('surfaces the captured stderr in the thrown error', () => {
    mockExecSync.mockImplementationOnce(() => {
      throw Object.assign(new Error('Command failed'), {
        stderr: Buffer.from('Error: port 5477 is already allocated'),
      });
    });
    expect(() => runDockerCompose('/tmp/compose.yaml', 'up', ['-d'])).toThrow(
      /port 5477 is already allocated/,
    );
  });

  it('falls back to stdout when stderr is empty', () => {
    mockExecSync.mockImplementationOnce(() => {
      throw Object.assign(new Error('Command failed'), {
        stderr: Buffer.from(''),
        stdout: Buffer.from('pull access denied for some-image'),
      });
    });
    expect(() => runDockerCompose('/tmp/compose.yaml', 'up')).toThrow(
      /pull access denied/,
    );
  });

  it('falls back to the error message when no output is captured', () => {
    mockExecSync.mockImplementationOnce(() => {
      throw new Error('spawn docker ENOENT');
    });
    expect(() => runDockerCompose('/tmp/compose.yaml', 'down')).toThrow(
      /spawn docker ENOENT/,
    );
  });
});
