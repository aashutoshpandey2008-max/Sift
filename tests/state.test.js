import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaults, toParams, fromParams, debounce } from '../public/state.js';

test('URL round trip preserves multi-category filters and pagination', () => {
  const state = { ...defaults(), search: 'resource 10', category: ['Design','Security'], level: ['Beginner'], minRating: '4', maxDuration: '120', sort: 'rating-desc', page: 2, limit: 6 };
  assert.deepEqual(fromParams(toParams(state)),state);
});
test('search text with query delimiters remains one parameter', () => { const state = {...defaults(),search:'a&category=Security?'}; assert.equal(toParams(state).get('search'),state.search); assert.deepEqual(toParams(state).getAll('category'),[]); });
test('invalid URL numbers fall back safely', () => { const state=fromParams(new URLSearchParams('page=-1&limit=abc')); assert.equal(state.page,1); assert.equal(state.limit,12); });
test('debounce sends only the latest typing value', async () => {
  const calls=[]; const send=debounce(value=>calls.push(value),30);
  send('a'); send('an'); send('analytics');
  await new Promise(resolve=>setTimeout(resolve,60)); assert.deepEqual(calls,['analytics']);
});
test('cancel prevents a pending debounced request', async () => {
  let calls=0; const send=debounce(()=>calls++,20); send(); send.cancel();
  await new Promise(resolve=>setTimeout(resolve,40)); assert.equal(calls,0);
});
