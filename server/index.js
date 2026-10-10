import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { searchCatalog, metadata, QueryError } from './catalog.js';

const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/state.js', ['state.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/favicon.svg', ['favicon.svg', 'image/svg+xml']]
]);
const headers = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
  'Cache-Control': 'no-cache'
};
export function createAppServer() {
  return http.createServer({ maxHeaderSize: 16384, requestTimeout: 15000 }, async (req, res) => {
    const send = (status, body, type = 'application/json; charset=utf-8', extra = {}) => {
      res.writeHead(status, { ...headers, 'Content-Type': type, ...extra });
      res.end(req.method === 'HEAD' ? undefined : (type.startsWith('application/json') ? JSON.stringify(body) : body));
    };
    try {
      if (!['GET', 'HEAD'].includes(req.method)) return send(405, { error: 'Method not allowed.' }, undefined, { Allow: 'GET, HEAD' });
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/api/health') return send(200, { status: 'ok', catalogSize: metadata.total });
      if (url.pathname === '/api/meta') return send(200, metadata);
      if (url.pathname === '/api/resources') return send(200, searchCatalog(url.searchParams));
      const asset = assets.get(url.pathname);
      if (!asset) return send(404, { error: 'Endpoint not found.' });
      send(200, await readFile(new URL(`../public/${asset[0]}`, import.meta.url)), asset[1]);
    } catch (error) {
      if (error instanceof QueryError) return send(400, { error: error.message });
      console.error('Request failed:', error.message);
      send(500, { error: 'Unable to complete this request. Please try again.' });
    }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535.');
  const server = createAppServer();
  server.listen(port, '0.0.0.0', () => console.log(`Sift is running on http://localhost:${port}`));
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  });
}
