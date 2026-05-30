# Policy / FAQ content scan v0

This slice adds a bounded read-only Admin GraphQL content scan to the existing
StoreTruth readiness report.

## GraphQL support note

The validated Admin API schema for the development store did not expose
`Shop.privacyPolicy`, `Shop.refundPolicy`, `Shop.shippingPolicy`, or
`Shop.termsOfService`. This slice therefore scans Online Store pages through
the supported `pages` query and treats policy coverage as deterministic title
and handle candidates.

## Query

The query is named `StoreTruthPolicyContentScan` and requests at most 25 pages:

- `pages.nodes.id`
- `pages.nodes.title`
- `pages.nodes.handle`
- `pages.nodes.body`
- `pages.nodes.createdAt`
- `pages.nodes.updatedAt`
- `pages.nodes.publishedAt`
- `pages.pageInfo.hasNextPage`

The raw page body is not stored in the report. StoreTruth records body text
length, HTML length, a SHA-256 hash, and a short local text summary.

## Coverage signals

The scan checks for page title/handle candidates for:

- shipping policy
- refund / return policy
- privacy policy
- terms of service
- contact page
- about page
- help page
- FAQ page

It also flags:

- thin or empty page content
- exact duplicate body hashes where detectable inside the bounded sample
- bounded scan notice when more pages exist

## Run and view

Start the local Shopify app:

```sh
npm run dev
```

Open the Shopify app preview and use:

`Product Scan`

The developer-only JSON endpoint remains:

`/app/product-scan/report`

The report includes product readiness, public discovery, and policy/FAQ content
sections together. Both routes are behind embedded app authentication and return
`404` when `NODE_ENV=production`.

Do not commit copied report JSON if it contains merchant catalog or store
content snapshots.
