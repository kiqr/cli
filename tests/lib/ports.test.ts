import {describe, it, expect} from 'vitest';
import {findAvailablePort, isPortAvailable} from '../../src/lib/ports.js';

describe('isPortAvailable', () => {
  it('returns true for an available port', async () => {
    const result = await isPortAvailable(0);
    expect(result).toBe(true);
  });
});

describe('findAvailablePort', () => {
  it('returns a port in the valid range', async () => {
    const port = await findAvailablePort(10000, 10100);
    expect(port).toBeGreaterThanOrEqual(10000);
    expect(port).toBeLessThanOrEqual(10100);
  });
});
