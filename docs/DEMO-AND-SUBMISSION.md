# Demo and submission checklist

## Short demo sequence

1. Open the root URL and show 250 total resources, category counts, cards, and pagination.
2. Open browser Developer Tools → Network and filter for `resources`.
3. Type `learning resource 25` quickly. After typing stops for 350 ms, one request should be sent for that burst. If you pause longer than 350 ms between characters, more requests are expected.
4. Clear the search, select both Design and Development, then select Beginner. Explain OR within category and AND between groups.
5. Set minimum rating to 4.0, then sort Highest rated. The returned cards should match.
6. Reset filters. Go to page 2, then change page size. Explain that filter/page-size changes return to page 1.
7. Search `zzzz-no-match` to demonstrate the empty state. Clear all filters.
8. Open a resource's details and explain that the supplied catalog is synthetic metadata.
9. Copy a filtered URL, refresh it, then try browser Back.
10. Resize to phone width and switch between grid and list.

To show loading, use browser Network throttling, then search again. To show an error, switch the browser Network setting to Offline and change a filter. Re-enable the network and click Retry. Do not leave the network offline for the final demo.

## Required submission proof

- [ ] Full-stack code is pushed to the intended GitHub repository.
- [ ] Repository includes frontend, server, original catalog, tests, README, and render.yaml.
- [ ] Deployed root URL opens the app and is accessible to the evaluator.
- [ ] `/api/health` returns status `ok` with 250 records.
- [ ] Search, multi-category filters, pagination, and loading states work on the deployed URL.
- [ ] Screenshots or a short demo recording captured if the internship portal requests them.
- [ ] Submit the actual GitHub repository URL and actual Render root URL.

## Viva notes

**Why debounce?** It waits for a pause in typing before asking the server for results, reducing unnecessary requests.

**Why AbortController and a request counter?** Cancellation avoids unnecessary work on the client; the counter also prevents an old response from painting over newer state.

**Where does filtering happen?** On the Node server. The client sends query parameters and receives just the current page.

**Why no database?** The assignment supplies a fixed, read-only 250-record JSON catalog. A database would be useful for editable or much larger data, but it is not required for these deliverables.

**What is pagination?** The server filters and sorts first, then slices `(page - 1) * limit` through `page * limit`. It also returns totals so the client can build controls.

**What if there are no matches?** The API returns an empty array and total 0. The UI offers a clear-filter action.
