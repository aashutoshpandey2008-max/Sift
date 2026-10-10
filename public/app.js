import { defaults, toParams, fromParams, debounce } from './state.js';

const $ = selector => document.querySelector(selector);
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const symbols = { Analytics: '▥', Development: '〈/〉', Design: '✳', Security: '◇' };
let state = fromParams(new URLSearchParams(location.search));
let meta;
let request;
let generation = 0;
let currentItems = [];
let layout = 'grid';
let lastUrl = location.pathname + location.search;
const grid = $('#result-grid');
const dialog = $('#details');
const delayedSearch = debounce(() => loadResults(), 350);

async function getJSON(path, signal) {
  const response = await fetch(path, { signal });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'The catalog could not be loaded.');
  return body;
}
function filtersMarkup(items, key) {
  return items.map(({ name, count }) => `<label><input type="checkbox" name="${key}" value="${esc(name)}"><span>${esc(name)}</span><span class="count">${count}</span></label>`).join('');
}
function normalizeState() {
  state.category = state.category.filter(v => meta.categories.some(c => c.name === v));
  state.level = state.level.filter(v => meta.levels.some(c => c.name === v));
  if (!meta.sortOptions.includes(state.sort)) state.sort = 'id';
  if (!['0', '4', '4.5', '5'].includes(state.minRating)) state.minRating = '0';
  if (!['60', '120', '180', '240'].includes(state.maxDuration)) state.maxDuration = '240';
  if (![6, 12, 24].includes(state.limit)) state.limit = 12;
  if (state.page > 1000000) state.page = 1;
}
function syncControls() {
  $('#search').value = state.search;
  for (const key of ['category', 'level']) document.querySelectorAll(`input[name="${key}"]`).forEach(el => { el.checked = state[key].includes(el.value); });
  $('#rating').value = state.minRating;
  $('#duration').value = state.maxDuration;
  $('#sort').value = state.sort;
  $('#limit').value = String(state.limit);
  renderChips();
}
function saveURL(mode = 'push') {
  const url = `${location.pathname}?${toParams(state)}`;
  if (url !== lastUrl) history[mode === 'replace' ? 'replaceState' : 'pushState']({}, '', url);
  lastUrl = url;
}
function renderChips() {
  const chips = [];
  if (state.search.trim()) chips.push(['search', '', `Search: ${state.search.trim()}`]);
  state.category.forEach(v => chips.push(['category', v, v]));
  state.level.forEach(v => chips.push(['level', v, v]));
  if (state.minRating !== '0') chips.push(['minRating', '', `${state.minRating}+ stars`]);
  if (state.maxDuration !== '240') chips.push(['maxDuration', '', `Up to ${state.maxDuration} min`]);
  $('#active-filters').innerHTML = chips.map(([key, value, label]) => `<button class="chip" data-remove="${key}" data-value="${esc(value)}" aria-label="Remove ${esc(label)}">${esc(label)} <span aria-hidden="true">×</span></button>`).join('');
}
function invalidate() {
  delayedSearch.cancel();
  request?.abort();
  generation++;
}
function showLoading() {
  grid.setAttribute('aria-busy', 'true');
  grid.innerHTML = Array.from({ length: Math.min(state.limit, 6) }, () => '<div class="skeleton" aria-hidden="true"></div>').join('');
  $('#result-count').textContent = 'Finding your resources…';
  $('#pagination-bar').hidden = true;
}
async function loadResults(mode = 'push') {
  invalidate();
  const token = generation;
  request = new AbortController();
  const controller = request;
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 20000);
  showLoading();
  renderChips();
  saveURL(mode);
  try {
    const data = await getJSON(`/api/resources?${toParams(state)}`, controller.signal);
    if (token !== generation) return;
    state.page = data.pagination.page;
    saveURL('replace');
    currentItems = data.items;
    renderResults(data);
  } catch (error) {
    if (token !== generation) return;
    if (error.name === 'AbortError' && !timedOut) return;
    $('#result-count').textContent = 'Could not load results';
    grid.innerHTML = `<div class="state-panel" role="alert"><span class="state-symbol" aria-hidden="true">!</span><h3>Let’s try that again.</h3><p>${esc(timedOut ? 'The server took too long to respond. It may be starting up. Please retry in a moment.' : error.message)}</p><button class="primary" data-action="retry">Retry search</button></div>`;
  } finally {
    clearTimeout(timeout);
    if (token === generation) grid.setAttribute('aria-busy', 'false');
  }
}
function renderResults({ items, pagination: p }) {
  const from = p.total ? (p.page - 1) * p.limit + 1 : 0;
  const to = p.total ? Math.min(p.page * p.limit, p.total) : 0;
  $('#result-count').innerHTML = p.total ? `Showing <strong>${from}–${to}</strong> of <strong>${p.total}</strong> resources` : '<strong>0</strong> resources found';
  if (!items.length) {
    grid.innerHTML = '<div class="state-panel"><span class="state-symbol" aria-hidden="true">⌕</span><h3>A fresh start?</h3><p>No resources match these filters. Try a broader search or clear your filters to explore the full collection.</p><button class="primary" data-action="reset">Clear all filters</button></div>';
    $('#pagination-bar').hidden = true;
    return;
  }
  grid.innerHTML = items.map(r => `<article class="card ${esc(r.category.toLowerCase())}">
    <div class="card-art" aria-hidden="true"><span class="category-symbol">${symbols[r.category] || '✳'}</span><span class="art-index">NO. ${String(r.id).padStart(3, '0')}</span></div>
    <div class="card-body"><p class="card-category">${esc(r.category)}</p><h3>${esc(r.title)}</h3>
      <div class="card-meta"><span class="level-badge">${esc(r.level)}</span><span aria-hidden="true">·</span><span>${r.durationMinutes} min</span></div>
      <div class="card-bottom"><span class="rating" aria-label="Rating ${r.rating} out of 5"><span class="star" aria-hidden="true">★</span>${r.rating.toFixed(1)} <small>/ 5</small></span><button class="details-button" data-id="${r.id}" aria-label="View details for ${esc(r.title)}">View details <span aria-hidden="true">↗</span></button></div>
    </div></article>`).join('');
  $('#pagination-bar').hidden = false;
  const pages = new Set([1, p.totalPages, p.page - 1, p.page, p.page + 1].filter(n => n >= 1 && n <= p.totalPages));
  const ordered = [...pages].sort((a, b) => a - b);
  let buttons = `<button class="page-button" data-page="${p.page - 1}" aria-label="Previous page" ${!p.hasPrevious ? 'disabled' : ''}>←</button>`;
  ordered.forEach((n, i) => {
    if (i && n - ordered[i - 1] > 1) buttons += '<span class="ellipsis" aria-hidden="true">…</span>';
    buttons += `<button class="page-button" data-page="${n}" aria-label="Page ${n}" ${n === p.page ? 'aria-current="page"' : ''}>${n}</button>`;
  });
  buttons += `<button class="page-button" data-page="${p.page + 1}" aria-label="Next page" ${!p.hasNext ? 'disabled' : ''}>→</button>`;
  $('#pagination').innerHTML = buttons;
}
function reset() {
  state = defaults();
  syncControls();
  loadResults();
}
function update(patch) {
  state = { ...state, ...patch, page: 1 };
  syncControls();
  loadResults();
}
function showDialog(html) {
  $('#dialog-content').innerHTML = html;
  dialog.showModal();
}
$('#search').addEventListener('input', event => {
  state.search = event.target.value;
  state.page = 1;
  // Invalidate immediately, before the debounce delay: an old request cannot paint stale results.
  invalidate();
  showLoading();
  renderChips();
  delayedSearch();
});
$('#search-form').addEventListener('submit', event => { event.preventDefault(); state.page = 1; loadResults(); });
$('.sidebar').addEventListener('change', event => {
  if (['category', 'level'].includes(event.target.name)) {
    const key = event.target.name;
    update({ [key]: [...document.querySelectorAll(`input[name="${key}"]:checked`)].map(el => el.value) });
  }
});
$('#rating').addEventListener('change', event => update({ minRating: event.target.value }));
$('#duration').addEventListener('change', event => update({ maxDuration: event.target.value }));
$('#sort').addEventListener('change', event => update({ sort: event.target.value }));
$('#limit').addEventListener('change', event => update({ limit: Number(event.target.value) }));
$('#reset').addEventListener('click', reset);
$('#active-filters').addEventListener('click', event => {
  const button = event.target.closest('[data-remove]');
  if (!button) return;
  const key = button.dataset.remove;
  update({ [key]: Array.isArray(state[key]) ? state[key].filter(v => v !== button.dataset.value) : defaults()[key] });
});
$('#pagination').addEventListener('click', event => {
  const button = event.target.closest('[data-page]');
  if (!button || button.disabled || Number(button.dataset.page) === state.page) return;
  state.page = Number(button.dataset.page);
  loadResults();
  $('#results').focus({ preventScroll: true });
  $('#results').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
grid.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.action === 'retry') return meta ? loadResults() : initialize();
  if (button.dataset.action === 'reset') return reset();
  const item = currentItems.find(r => r.id === Number(button.dataset.id));
  if (!item) return;
  showDialog(`<p class="dialog-label">${esc(item.category)} · Resource ${item.id}</p><h2 id="dialog-title">${esc(item.title)}</h2><dl class="detail-stats"><div><dt>EXPERIENCE</dt><dd>${esc(item.level)}</dd></div><div><dt>DURATION</dt><dd>${item.durationMinutes} minutes</dd></div><div><dt>RATING</dt><dd>★ ${item.rating.toFixed(1)} / 5</dd></div></dl><p class="dataset-note">This is a synthetic learning resource from the supplied 250-record catalog. The dataset contains metadata only; no lesson content or external course link is provided.</p>`);
});
for (const view of ['grid', 'list']) $(`#${view}-view`).addEventListener('click', () => {
  layout = view;
  grid.classList.toggle('list', layout === 'list');
  for (const option of ['grid', 'list']) {
    $(`#${option}-view`).classList.toggle('selected', option === layout);
    $(`#${option}-view`).setAttribute('aria-pressed', String(option === layout));
  }
});
$('#about-button').addEventListener('click', () => showDialog('<p class="dialog-label">The project</p><h2 id="dialog-title">A little more about Sift.</h2><p class="dialog-copy">Explore 250 synthetic learning resources across Analytics, Design, Development, and Security. Combine categories, experience levels, ratings, and duration to narrow your results.</p><p class="dialog-copy">Search matches words in titles, categories, levels, and resource IDs. Multiple categories include results from any selected category. Other filter groups narrow the selection together.</p><p class="dataset-note">Built as a Live Query Filter System. The supplied records are preserved unchanged. Resource cards represent sample metadata, not real courses.</p>'));
$('#close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
document.addEventListener('keydown', event => {
  if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !dialog.open && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && !document.activeElement.isContentEditable) { event.preventDefault(); $('#search').focus(); }
});
window.addEventListener('popstate', () => {
  state = fromParams(new URLSearchParams(location.search));
  lastUrl = location.pathname + location.search;
  if (meta) normalizeState();
  syncControls();
  loadResults('replace');
});
async function initialize() {
  showLoading();
  try {
    meta = await getJSON('/api/meta', AbortSignal.timeout(20000));
    $('#catalog-total').textContent = meta.total;
    $('#category-filters').innerHTML = filtersMarkup(meta.categories, 'category');
    $('#level-filters').innerHTML = filtersMarkup(meta.levels, 'level');
    normalizeState();
    syncControls();
    await loadResults('replace');
  } catch {
    $('#result-count').textContent = 'Catalog unavailable';
    grid.setAttribute('aria-busy', 'false');
    grid.innerHTML = '<div class="state-panel" role="alert"><span class="state-symbol" aria-hidden="true">!</span><h3>The collection is taking a moment.</h3><p>Check your connection and try again. The server may need a moment to start.</p><button class="primary" data-action="retry">Try again</button></div>';
  }
}
initialize();
