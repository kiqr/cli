import http from 'node:http';

export interface LiveReloadOptions {
  port?: number;
  host?: string;
}

interface SSEClient {
  id: number;
  res: http.ServerResponse;
}

const LIVERELOAD_CLIENT_SCRIPT = `
// Kiqr LiveReload Client
(function() {
  var PROTOCOL = 7;
  var PORT = __PORT__;
  var connected = false;
  var reconnectTimeout;

  function connect() {
    var es = new EventSource('http://' + window.location.hostname + ':' + PORT + '/events');

    es.onopen = function() {
      connected = true;
      console.log('[Kiqr] LiveReload connected');
    };

    es.onmessage = function(e) {
      var data = JSON.parse(e.data || '{}');
      if (data.type === 'reload') {
        location.reload();
      } else if (data.type === 'css') {
        var links = document.querySelectorAll('link[rel="stylesheet"]');
        links.forEach(function(link) {
          var href = link.href;
          link.href = href + (href.indexOf('?') > -1 ? '&' : '?') + '_r=' + Date.now();
        });
      }
    };

    es.onerror = function() {
      connected = false;
      es.close();
      console.log('[Kiqr] LiveReload disconnected, reconnecting...');
      reconnectTimeout = setTimeout(connect, 1000);
    };
  }

  connect();
})();
`.replace('__PORT__', '35729');

export class LiveReloadServer {
  private server: http.Server | null = null;
  private clients: SSEClient[] = [];
  private port: number;
  private host: string;
  private clientIdCounter = 0;

  constructor(options: LiveReloadOptions = {}) {
    this.port = options.port ?? 35729;
    this.host = options.host ?? 'localhost';
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        const url = new URL(req.url || '/', `http://localhost:${this.port}`);

        if (url.pathname === '/livereload.js') {
          res.writeHead(200, {
            'Content-Type': 'application/javascript',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache',
          });
          res.end(LIVERELOAD_CLIENT_SCRIPT);
        } else if (url.pathname === '/events') {
          this.handleSSEConnection(req, res);
        } else if (url.pathname === '/status') {
          res.writeHead(200, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({connected: this.clients.length > 0}));
        } else {
          res.writeHead(404);
          res.end('Not found');
        }
      });

      this.server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          reject(new Error(`LiveReload port ${this.port} is already in use`));
        } else {
          reject(err);
        }
      });

      this.server.listen(this.port, this.host, () => {
        resolve();
      });
    });
  }

  private handleSSEConnection(req: http.IncomingMessage, res: http.ServerResponse): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    const client: SSEClient = {
      id: ++this.clientIdCounter,
      res,
    };

    this.clients.push(client);

    // Send initial connection message
    res.write('data: {"type":"connected"}\n\n');

    // Clean up on close
    req.on('close', () => {
      this.clients = this.clients.filter((c) => c.id !== client.id);
    });
  }

  stop(): void {
    for (const client of this.clients) {
      try {
        client.res.end();
      } catch {
        // Response may already be closed
      }
    }
    this.clients = [];
    this.server?.close();
    this.server = null;
  }

  reload(message?: string): void {
    const data = message
      ? JSON.stringify({type: 'message', data: message})
      : JSON.stringify({type: 'reload'});

    for (const client of this.clients) {
      try {
        client.res.write(`data: ${data}\n\n`);
      } catch {
        // Client may have disconnected
      }
    }
  }

  reloadCSS(): void {
    const data = JSON.stringify({type: 'css'});
    for (const client of this.clients) {
      try {
        client.res.write(`data: ${data}\n\n`);
      } catch {
        // Client may have disconnected
      }
    }
  }

  getPort(): number {
    return this.port;
  }

  getClientsCount(): number {
    return this.clients.length;
  }
}