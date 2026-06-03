import net from 'node:net';

export async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port);
  });
}

export async function findAvailablePort(
  rangeStart: number = 10000,
  rangeEnd: number = 20000,
): Promise<number> {
  for (let port = rangeStart; port <= rangeEnd; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found in range ${rangeStart}-${rangeEnd}`);
}
