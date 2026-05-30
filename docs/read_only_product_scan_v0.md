# Read-only product scan v0

This feasibility slice validates that StoreTruth AI can query a bounded product
sample from a Shopify development store and turn it into the existing local
readiness-report shape.

## Guardrails

- Uses the existing read-only scopes only:
  - `read_products`
  - `read_content`
  - `read_metaobjects`
- Runs an Admin GraphQL query for the first 10 products only.
- Does not write products, metaobjects, policies, billing data, or any merchant
  content.
- Does not request customer, order, payment, token, session, price, inventory
  quantity, or protected customer data.
- Does not call an AI provider.
- Does not make claims about AI rankings, AI traffic, or sales lift.

## Dev store

The local Shopify CLI project is configured to use:

`storetruth-dev.myshopify.com`

That value lives in `.shopify/project.json`, which is ignored and must not be
committed.

## Run the local app

Start Shopify app dev after confirming `shopify.app.toml` still has only the
read-only scopes:

```sh
npm run dev
```

Open the app preview URL provided by Shopify CLI, install/open the app on the
development store, then use the developer-only nav item:

`Product Scan`

The app route renders a JSON preview and a JSON endpoint:

`/app/product-scan/report`

The report includes both the bounded Admin API product sample and the bounded
public discovery checks. It also includes the bounded policy/FAQ content scan
and deterministic buyer-question simulation when running from a branch that
contains those slices. Merchant review workflow V0 adds local-only review items
and draft suggestions to the same report.

Both routes are authenticated through the embedded app and return `404` when
`NODE_ENV=production`.

## Product fields queried

The query is named `StoreTruthReadOnlyProductScan` and requests:

- `products.nodes.id`
- `products.nodes.title`
- `products.nodes.handle`
- `products.nodes.status`
- `products.nodes.productType`
- `products.nodes.vendor`
- `products.nodes.tags`
- `products.nodes.description`
- `products.nodes.descriptionHtml`
- `products.nodes.seo.title`
- `products.nodes.seo.description`
- `products.nodes.options.id`
- `products.nodes.options.name`
- `products.nodes.options.values`
- `products.nodes.variants.nodes.id`
- `products.nodes.variants.nodes.title`
- `products.nodes.variants.nodes.selectedOptions.name`
- `products.nodes.variants.nodes.selectedOptions.value`
- `products.nodes.media.nodes.mediaContentType`
- `products.nodes.media.nodes.alt`
- `products.nodes.media.nodes.MediaImage.id`
- `products.nodes.media.nodes.MediaImage.image.altText`
- `products.pageInfo.hasNextPage`

Descriptions are summarized locally, and `descriptionHtml` is represented in the
report by length plus SHA-256 hash.

## Report shape

The local report has this top-level shape:

```json
{
  "id": "read-only-product-scan-...",
  "generatedAt": "2026-05-30T00:00:00.000Z",
  "shopDomain": "storetruth-dev.myshopify.com",
  "source": {
    "api": "Shopify Admin GraphQL",
    "queryName": "StoreTruthReadOnlyProductScan",
    "productLimit": 10,
    "readOnly": true,
    "fieldsQueried": []
  },
  "scannedProducts": [],
  "publicDiscovery": {
    "score": 0,
    "limits": {
      "method": "GET",
      "httpsOnly": true,
      "sameDomainOnly": true,
      "redirectPolicy": "manual",
      "timeoutMs": 3000,
      "maxResponseBytes": 65536
    },
    "results": []
  },
  "policyContent": {
    "source": {
      "api": "Shopify Admin GraphQL",
      "queryName": "StoreTruthPolicyContentScan",
      "pageLimit": 25,
      "readOnly": true
    },
    "pages": [],
    "coverage": {
      "policies": [],
      "pageCandidates": [],
      "thinContentPageGids": [],
      "duplicateContentGroups": [],
      "score": 0
    },
    "findings": []
  },
  "questionSimulation": {
    "method": "local_template_rules",
    "readOnly": true,
    "score": 0,
    "summary": {
      "totalQuestions": 0,
      "byStatus": {
        "answered": 0,
        "partially_answered": 0,
        "unanswered": 0,
        "unclear": 0,
        "contradiction_risk": 0
      },
      "byCategory": {
        "product_recommendation": 0,
        "product_comparison": 0,
        "shipping": 0,
        "returns_refunds": 0,
        "warranty_support": 0,
        "sizing_options": 0,
        "compatibility_specs": 0,
        "materials_use_case": 0,
        "contact_help_faq": 0
      }
    },
    "questions": [],
    "findings": []
  },
  "merchantReview": {
    "readOnly": true,
    "persistence": "local_report_only",
    "summary": {
      "totalItems": 0,
      "byStatus": {
        "new": 0,
        "reviewed": 0,
        "needs_fix": 0,
        "dismissed": 0,
        "drafted": 0,
        "approved_for_later": 0
      },
      "draftSuggestionCount": 0,
      "needsFixCount": 0
    },
    "items": [],
    "draftSuggestions": []
  },
  "scan": {
    "status": "completed",
    "scores": {},
    "findings": [],
    "productScores": []
  }
}
```

Generated reports are local runtime output only. Do not commit copied report
JSON if it contains merchant catalog content.
