import {describe, it, expect, vi, beforeEach} from 'vitest';
import {isDockerInstalled, isDockerRunning} from '../../src/lib/docker.js';
import {execSync} from 'node:child_process';

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
