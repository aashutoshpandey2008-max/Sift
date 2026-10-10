# API reference

All endpoints are same-origin, read-only, and return JSON. GET and HEAD are supported. Other methods return 405. Unknown paths return 404. Invalid query parameters return 400 with an `error` string.

## GET /api/health

```json
{"status":"ok","catalogSize":250}
```

## GET /api/meta

Returns the full catalog size, category counts, level counts, maximum duration, and allowed sort values. Counts describe the full catalog independently of active filters.

## GET /api/resources

| Parameter | Default | Accepted values / meaning |
| --- | --- | --- |
| `search` | Empty | Up to 200 characters; case-insensitive all-word match across title, category, level, ID |
| `category` | All | Analytics, Design, Development, Security; repeat parameter or comma-separate |
| `level` | All | Beginner, Intermediate, Advanced; repeat parameter or comma-separate |
| `page` | 1 | Integer 1–1,000,000; excessive valid pages clamp to the last result page |
| `limit` | 12 | Integer 1–100; UI exposes 6, 12, 24 |
| `sort` | `id` | `id`, `rating-desc`, `duration-asc`, `duration-desc`, `title-asc` |
| `minRating` | 0 | Number from 0 to 5 inclusive |
| `maxDuration` | 240 | Integer from 0 to 100,000 minutes inclusive |

Scalar parameters must occur once. Unknown parameter names and category/level values are rejected. Empty category/level selections mean all. Search terms are literal substrings, not regular expressions. Numeric sorts use ascending ID to break ties. Title sort is natural/numeric, so 2 precedes 10.

Example:

```text
/api/resources?search=resource&category=Design&category=Development&level=Beginner&minRating=4&maxDuration=120&sort=rating-desc&page=1&limit=6
```

Response structure (illustrative, not a saved live result):

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "limit": 6,
    "total": 0,
    "totalPages": 0,
    "hasNext": false,
    "hasPrevious": false
  },
  "filters": {
    "search": "resource",
    "category": ["Design", "Development"],
    "level": ["Beginner"],
    "minRating": 4,
    "maxDuration": 120,
    "sort": "rating-desc"
  }
}
```

`items` contains unchanged records with `id`, `title`, `category`, `level`, `durationMinutes`, and `rating`. An empty search result reports page 1, totalPages 0, and an empty items array. No endpoint modifies the catalog.

The API allows more numeric ranges than the UI. When loading a shared URL, the UI normalizes unsupported UI options to its defaults. The API returns 400 for invalid direct requests.
