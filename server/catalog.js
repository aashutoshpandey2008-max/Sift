import { readFileSync } from 'node:fs';

// Keep the supplied catalog unchanged; filtering happens only on the server.
export const catalog = JSON.parse(readFileSync(new URL('../data/catalog.json', import.meta.url), 'utf8'));
if (!Array.isArray(catalog) || !catalog.length || catalog.some(r =>
  !Number.isInteger(r.id) || typeof r.title !== 'string' || typeof r.category !== 'string' ||
  typeof r.level !== 'string' || !Number.isFinite(r.durationMinutes) || !Number.isFinite(r.rating)
)) throw new Error('Invalid catalog data');
if (new Set(catalog.map(r => r.id)).size !== catalog.length) throw new Error('Duplicate catalog IDs');

const categories = [...new Set(catalog.map(r => r.category))].sort();
const levels = ['Beginner', 'Intermediate', 'Advanced'];
export const sortOptions = ['id', 'rating-desc', 'duration-asc', 'duration-desc', 'title-asc'];
export const metadata = {
  total: catalog.length,
  categories: categories.map(name => ({ name, count: catalog.filter(r => r.category === name).length })),
  levels: levels.map(name => ({ name, count: catalog.filter(r => r.level === name).length })),
  maxDuration: Math.max(...catalog.map(r => r.durationMinutes)),
  sortOptions
};
export class QueryError extends Error {}
function single(params, key, fallback) {
  if (params.getAll(key).length > 1) throw new QueryError(`${key} must be specified once.`);
  return params.get(key) ?? fallback;
}
function number(params, key, fallback, min, max, integer = false) {
  const value = single(params, key, String(fallback));
  const n = Number(value);
  if (!value.trim() || !Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n)))
    throw new QueryError(`${key} must be ${integer ? 'an integer' : 'a number'} from ${min} to ${max}.`);
  return n;
}
function selection(params, key, allowed) {
  const values = [...new Set(params.getAll(key).flatMap(s => s.split(',')).map(s => s.trim()).filter(Boolean))];
  if (values.some(v => !allowed.includes(v))) throw new QueryError(`Invalid ${key}. Choose from: ${allowed.join(', ')}.`);
  return values;
}
export function searchCatalog(params) {
  const allowed = new Set(['search', 'category', 'level', 'page', 'limit', 'sort', 'minRating', 'maxDuration']);
  for (const key of params.keys()) if (!allowed.has(key)) throw new QueryError(`Unknown query parameter: ${key}`);
  const search = single(params, 'search', '').trim();
  if (search.length > 200) throw new QueryError('Search must be 200 characters or fewer.');
  const category = selection(params, 'category', categories);
  const level = selection(params, 'level', levels);
  const requestedPage = number(params, 'page', 1, 1, 1000000, true);
  const limit = number(params, 'limit', 12, 1, 100, true);
  const minRating = number(params, 'minRating', 0, 0, 5);
  const maxDuration = number(params, 'maxDuration', metadata.maxDuration, 0, 100000, true);
  const sort = single(params, 'sort', 'id');
  if (!sortOptions.includes(sort)) throw new QueryError('Invalid sort option.');
  const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
  let results = catalog.filter(r => {
    const haystack = `${r.title} ${r.category} ${r.level} ${r.id}`.toLowerCase();
    return terms.every(term => haystack.includes(term)) &&
      (!category.length || category.includes(r.category)) &&
      (!level.length || level.includes(r.level)) &&
      r.rating >= minRating && r.durationMinutes <= maxDuration;
  });
  const comparators = {
    id: (a, b) => a.id - b.id,
    'rating-desc': (a, b) => b.rating - a.rating || a.id - b.id,
    'duration-asc': (a, b) => a.durationMinutes - b.durationMinutes || a.id - b.id,
    'duration-desc': (a, b) => b.durationMinutes - a.durationMinutes || a.id - b.id,
    'title-asc': (a, b) => a.title.localeCompare(b.title, 'en', { numeric: true }) || a.id - b.id
  };
  results.sort(comparators[sort]);
  const total = results.length;
  const totalPages = Math.ceil(total / limit);
  const page = Math.min(requestedPage, Math.max(1, totalPages));
  return {
    items: results.slice((page - 1) * limit, page * limit),
    pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrevious: page > 1 },
    filters: { search, category, level, minRating, maxDuration, sort }
  };
}
