# Public discovery checker v0

This slice adds bounded public discovery checks to the existing StoreTruth JSON
readiness report.

## URLs checked

For the configured development store, the checker builds HTTPS URLs on the same
`myshopify.com` domain and checks only these paths:

- `/robots.txt`
- `/sitemap.xml`
- `/agents.md`
- `/llms.txt`
- `/llms-full.txt`

For `storetruth-dev.myshopify.com`, those resolve to:

- `https://storetruth-dev.myshopify.com/robots.txt`
- `https://storetruth-dev.myshopify.com/sitemap.xml`
- `https://storetruth-dev.myshopify.com/agents.md`
- `https://storetruth-dev.myshopify.com/llms.txt`
- `https://storetruth-dev.myshopify.com/llms-full.txt`

## Safety limits

- `GET` only.
- `https://` only.
- Same `myshopify.com` development-store domain only.
- No broad crawling.
- No following redirects.
- Timeout: `3000ms` per request.
- Max response body captured: `65536` bytes per request.
- Supported content types:
  - `text/plain`
  - `text/markdown`
  - `text/x-markdown`
  - `application/markdown`
  - `application/xml`
  - `text/xml`
  - `application/rss+xml`

The checker records status and metadata for missing, empty, blocked, timed out,
oversized, unsupported content type, and network-error results.

## Run and view

Start the local Shopify app:

```sh
npm run dev
```

Open the Shopify app preview and use:

`Product Scan`

The page renders product-readiness and public-discovery sections together. The
developer-only JSON endpoint is:

`/app/product-scan/report`

Both routes are behind embedded app authentication and return `404` when
`NODE_ENV=production`.

## Report metadata

Each discovery result includes:

- URL path
- full checked URL
- status code when available
- content type when available
- reachable true/false
- observed response size
- content SHA-256 hash when a supported, non-oversized body was captured
- short local snippet for supported reachable text/XML responses
- warnings for missing, blocked, timeout, oversized, unsupported type, or error

Do not commit copied report JSON if it includes merchant catalog content or
storefront content snapshots.
