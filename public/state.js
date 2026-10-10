export const defaults = () => ({ search: '', category: [], level: [], minRating: '0', maxDuration: '240', sort: 'id', page: 1, limit: 12 });
export function toParams(state) {
  const params = new URLSearchParams();
  if (state.search.trim()) params.set('search', state.search.trim());
  state.category.forEach(v => params.append('category', v));
  state.level.forEach(v => params.append('level', v));
  if (state.minRating !== '0') params.set('minRating', state.minRating);
  if (state.maxDuration !== '240') params.set('maxDuration', state.maxDuration);
  if (state.sort !== 'id') params.set('sort', state.sort);
  params.set('page', String(state.page));
  params.set('limit', String(state.limit));
  return params;
}
export function fromParams(params) {
  const state = defaults();
  state.search = (params.get('search') || '').slice(0, 200);
  for (const key of ['category', 'level']) state[key] = [...new Set(params.getAll(key).flatMap(v => v.split(',')).filter(Boolean))];
  for (const key of ['minRating', 'maxDuration', 'sort']) if (params.has(key)) state[key] = params.get(key);
  for (const key of ['page', 'limit']) {
    const n = Number(params.get(key));
    if (Number.isInteger(n) && n > 0) state[key] = n;
  }
  return state;
}
export function debounce(fn, ms) {
  let timer;
  const debounced = (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}
