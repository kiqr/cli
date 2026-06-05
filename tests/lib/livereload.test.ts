import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {LiveReloadServer} from '../../src/lib/livereload.js';

describe('LiveReloadServer', () => {
  let server: LiveReloadServer;

  beforeEach(() => {
    server = new LiveReloadServer({port: 35729});
  });

  afterEach(() => {
    server.stop();
  });

  it('starts and stops without error', async () => {
    await expect(server.start()).resolves.toBeUndefined();
    expect(server.getPort()).toBe(35729);
    server.stop();
  });

  it('returns zero clients on start', () => {
    expect(server.getClientsCount()).toBe(0);
  });

  it('stops cleanly', () => {
    // Should not throw
    expect(() => server.stop()).not.toThrow();
  });

  it('can be stopped multiple times without error', async () => {
    await server.start();
    server.stop();
    // Should not throw on second stop
    expect(() => server.stop()).not.toThrow();
  });

  it('rejects on port conflict', async () => {
    const server1 = new LiveReloadServer({port: 35730});
    await server1.start();

    const server2 = new LiveReloadServer({port: 35730});
    await expect(server2.start()).rejects.toThrow();

    server1.stop();
  });
});