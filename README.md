# Sift — Live Query Filter System

A full-stack learning-resource explorer built for the Live Query Filter System internship assignment. The supplied 250-record synthetic catalog is preserved unchanged.

## Quick start

Install Node.js 22 or newer (Node 24 is recommended), extract this folder, and open a terminal **inside the folder containing `package.json`**.

```sh
npm ci
npm start
```

Open **http://localhost:3000**. Keep the terminal open while using the app. Stop with Ctrl+C.

There are no runtime or development package dependencies, no database setup, and no secrets. `npm ci` validates the included lockfile. The frontend and backend run together on one origin. Do not open `index.html` directly or use VS Code Live Server: the real API must be running.

## What is included

- A responsive catalog interface with desktop and mobile CSS layouts.
- A real Node.js HTTP API performing search, filtering, sorting, and pagination.
- Search debounced by 350 ms; Enter/Search sends the query immediately.
- AbortController cancellation and request-generation checks to prevent stale results.
- Multi-category and multi-level checkboxes, minimum rating, and maximum duration.
- Catalog order, highest rating, natural title order, and duration sorting.
- Server-calculated totals, page controls, and 6/12/24 items per page.
- Skeleton loading, empty results, retryable errors, and request timeouts.
- Removable filter chips and reset-all controls.
- URL query state, refresh persistence, and browser back/forward handling.
- Grid/list layouts and accessible native resource-details dialogs.
- Keyboard search shortcut (`/`), visible focus, status announcements, and reduced-motion support.
- Input validation, explicit static-asset routing, CSP, and a health endpoint.
- Automated API and client-state tests; Render configuration and GitHub CI workflow.

## Stack and data

**Frontend:** semantic HTML, CSS, and vanilla JavaScript ES modules.

**Backend:** Node.js built-in HTTP server. No external framework is necessary for this bounded read-only catalog.

**Data:** `data/catalog.json`, loaded and validated at server startup. The browser receives only metadata and the current page of matching records. It never downloads the full catalog for client-side filtering. The catalog is read-only; adding or changing records requires editing the source file and restarting/redeploying. A database was not required by the assignment.

These are synthetic resource records, not real courses. The dataset provides no lesson content, thumbnails, descriptions, or external course URLs. Card graphics are category decorations; the details dialog clearly identifies the sample data.

## Commands

| Command | Purpose |
| --- | --- |
| `npm start` | Run the frontend and API on port 3000 |
| `npm run dev` | Run the Node server in watch mode |
| `npm run check` | Check JavaScript syntax |
| `npm test` | Run 23 automated tests |

To use another port in Windows PowerShell:

```powershell
$env:PORT = "4000"
npm start
```

Then open `http://localhost:4000`. Render supplies `PORT` automatically. `.env.example` documents the optional setting; this dependency-free server reads environment variables directly and does not automatically load a `.env` file.

## Project structure

```text
public/                 Frontend HTML, CSS, and ES modules
server/index.js         HTTP routing, static assets, security headers
server/catalog.js       Catalog validation, filtering, sorting, pagination
data/catalog.json       Original 250-record input catalog
tests/                 API integration and client-state tests
 docs/                  Deployment, API reference, demo, validation notes
render.yaml             Single-service Render Blueprint
.github/workflows/      Continuous integration checks
```

## How a search works

1. Typing updates the input and immediately invalidates the previous request.
2. After 350 ms without another keystroke, the client creates URL query parameters.
3. The server validates the query, filters the catalog, sorts matching records, and slices the requested page.
4. The response includes `items`, `pagination`, and normalized `filters`.
5. The client displays the response only if it belongs to the current request generation.

Category selections use **OR**; level selections also use **OR**. Different filter groups combine with **AND**. Every search word must appear somewhere in a record's title, category, level, or ID. Filter counts show the full catalog distribution, not changing counts within the current query.

## Deployment and submission

Read [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for GitHub and Render steps. **One Render Web Service hosts both the frontend and API.** Use the root URL as the submission URL.

The source is ready for handoff; no GitHub repository or public deployment has been created by this package. The internship requires both a full-stack GitHub repository URL and a working deployed app URL. Read [docs/DEMO-AND-SUBMISSION.md](docs/DEMO-AND-SUBMISSION.md) before submitting.

## Verification

23 automated tests passed on Node.js v24.19.0. See [docs/VALIDATION.md](docs/VALIDATION.md) for coverage and remaining manual checks. A browser visual/accessibility run and a live Render deployment have not been verified in the build environment.
