import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createAppServer } from '../server/index.js';
import { catalog } from '../server/catalog.js';

let server, base;
before(async () => { server = createAppServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); base = `http://127.0.0.1:${server.address().port}`; });
after(async () => { await new Promise(resolve => server.close(resolve)); });
const query = async (params = '') => { const response = await fetch(`${base}/api/resources?${params}`); return { status: response.status, body: await response.json() }; };

test('health and metadata report the supplied 250-record catalog', async () => {
  const health = await (await fetch(`${base}/api/health`)).json();
  assert.deepEqual(health, { status: 'ok', catalogSize: 250 });
  const meta = await (await fetch(`${base}/api/meta`)).json();
  assert.equal(meta.total, 250); assert.equal(meta.categories.length, 4);
  assert.equal(meta.categories.reduce((n, c) => n + c.count, 0), 250);
});
test('default pagination returns unchanged first 12 records', async () => {
  const { status, body } = await query();
  assert.equal(status, 200); assert.deepEqual(body.items, catalog.slice(0, 12));
  assert.deepEqual(body.pagination, { page: 1, limit: 12, total: 250, totalPages: 21, hasNext: true, hasPrevious: false });
});
test('all pages cover the catalog exactly once', async () => {
  const ids = [];
  for (let page = 1; page <= 21; page++) { const { body } = await query(`page=${page}`); ids.push(...body.items.map(r => r.id)); }
  assert.equal(new Set(ids).size, 250); assert.deepEqual(ids, catalog.map(r => r.id));
});
test('search is case insensitive and trims whitespace', async () => {
  const { body } = await query('search=%20LEARNING%20resource%20250%20');
  assert.deepEqual(body.items, [catalog.find(r => r.id === 250)]);
});
test('search includes category and level with all query words required', async () => {
  const { body } = await query('search=security%20beginner&limit=100');
  assert.deepEqual(body.items, catalog.filter(r => r.category === 'Security' && r.level === 'Beginner'));
});
test('literal regex characters cannot act as wildcards', async () => {
  const { body } = await query('search=.*'); assert.equal(body.pagination.total, 0);
});
test('repeated category parameters use OR within the group', async () => {
  const { body } = await query('category=Design&category=Analytics&limit=100');
  const expected = catalog.filter(r => ['Design', 'Analytics'].includes(r.category));
  assert.equal(body.pagination.total, expected.length); assert.deepEqual(body.items, expected.slice(0, 100));
});
test('comma-separated and repeated categories have identical results', async () => {
  assert.deepEqual((await query('category=Design,Security')).body, (await query('category=Design&category=Security')).body);
});
test('category, level, rating, duration, and search combine with AND', async () => {
  const { body } = await query('search=resource&category=Development&level=Beginner&minRating=4&maxDuration=120&limit=100');
  assert.deepEqual(body.items, catalog.filter(r => r.category === 'Development' && r.level === 'Beginner' && r.rating >= 4 && r.durationMinutes <= 120));
  assert.ok(body.items.length > 0);
});
test('multiple levels combine with OR', async () => {
  const { body } = await query('level=Beginner&level=Advanced&limit=100');
  assert.equal(body.pagination.total, catalog.filter(r => r.level !== 'Intermediate').length);
});
test('rating and duration sort on the server with stable id ties', async () => {
  for (const [sort, compare] of [['rating-desc', (a,b) => b.rating-a.rating || a.id-b.id], ['duration-asc', (a,b) => a.durationMinutes-b.durationMinutes || a.id-b.id], ['duration-desc', (a,b) => b.durationMinutes-a.durationMinutes || a.id-b.id]]) {
    const { body } = await query(`sort=${sort}`); assert.deepEqual(body.items, [...catalog].sort(compare).slice(0,12));
  }
});
test('natural title sort places resource 2 before resource 10', async () => { const { body } = await query('sort=title-asc'); assert.deepEqual(body.items.map(r => r.id), Array.from({length:12}, (_,i) => i+1)); });
test('empty results report zero pages and page one', async () => {
  const { body } = await query('search=zzzz-no-match&page=9');
  assert.deepEqual(body.items, []); assert.equal(body.pagination.page, 1); assert.equal(body.pagination.totalPages, 0); assert.equal(body.pagination.hasNext, false);
});
test('out-of-range pages clamp to the last real page', async () => { const { body } = await query('page=999'); assert.equal(body.pagination.page,21); assert.equal(body.items.length,10); assert.equal(body.pagination.hasNext,false); });
test('invalid queries return structured 400 errors', async () => {
  for (const params of ['page=0','page=-1','page=2.5','limit=101','limit=0','limit=abc','category=Unknown','level=Expert','sort=unknown','minRating=9','maxDuration=-2','search='+ 'x'.repeat(201),'page=1&page=2','minRating=','foo=bar']) {
    const { status, body } = await query(params); assert.equal(status,400,params); assert.equal(typeof body.error,'string');
  }
});
test('all frontend assets are served with correct MIME types and CSP', async () => {
  for (const [path,type] of [['/','text/html'],['/app.js','text/javascript'],['/state.js','text/javascript'],['/styles.css','text/css'],['/favicon.svg','image/svg+xml']]) {
    const response = await fetch(base+path); assert.equal(response.status,200); assert.ok(response.headers.get('content-type').startsWith(type)); assert.ok(response.headers.get('content-security-policy').includes("script-src 'self'"));
  }
});
test('unknown routes and private source paths are not exposed', async () => {
  for (const path of ['/api/missing','/server/index.js','/data/catalog.json','/.env','/%2e%2e/package.json']) assert.equal((await fetch(base+path)).status,404,path);
});
test('HEAD succeeds without a body and writes return 405', async () => {
  const head = await fetch(base+'/api/resources', {method:'HEAD'}); assert.equal(head.status,200); assert.equal(await head.text(),'');
  const post = await fetch(base+'/api/resources', {method:'POST'}); assert.equal(post.status,405); assert.equal(post.headers.get('allow'),'GET, HEAD');
});
