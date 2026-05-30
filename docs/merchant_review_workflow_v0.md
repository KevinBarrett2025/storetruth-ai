# Merchant review workflow v0

This slice adds a local-only review layer to the StoreTruth readiness report.
It helps a merchant triage findings, buyer-question results, and draft fix
ideas without writing anything back to Shopify.

## Guardrails

- No Shopify writes.
- No write scopes.
- No billing.
- No protected customer data.
- No AI provider calls.
- No persistence or database migration.
- No production deployment or app submission.
- No claims about AI rankings, AI traffic, or sales lift.

## Review statuses

The V0 report supports these statuses:

- `new`
- `reviewed`
- `needs_fix`
- `dismissed`
- `drafted`
- `approved_for_later`

Generated V0 items use deterministic defaults:

- medium/high findings become `needs_fix`
- low findings become `new`
- info findings become `reviewed`
- unanswered or contradiction-risk buyer questions become `needs_fix`
- partially answered or unclear buyer questions become `new`
- answered buyer questions become `reviewed`
- generated draft suggestions become `drafted`

`dismissed` and `approved_for_later` are supported statuses for a later
merchant action workflow, but V0 does not auto-assign them because there is no
persisted merchant decision state yet.

## Draft suggestion types

The V0 report creates conservative deterministic draft suggestions:

- `add_shipping_policy_page`
- `add_return_refund_policy_page`
- `improve_thin_product_description`
- `add_size_option_guidance`
- `add_faq_contact_help_page`
- `review_agent_discovery_file`
- `review_contradictory_source`
- `improve_product_source_data`

Drafts are tied back to existing source references where available:

- product GID, title, and handle
- page GID, title, and handle
- discovery path
- question ID and category
- finding ID and category

## Run or view

Start the local Shopify app:

```sh
npm run dev
```

Open the embedded app on the configured development store, then open the
developer-only `Product Scan` route. The page includes a `Merchant Review`
section. The same data is included in the JSON endpoint:

`/app/product-scan/report`

Both routes are authenticated through the embedded app and return `404` when
`NODE_ENV=production`.

## Report shape

The readiness report now includes:

```json
{
  "merchantReview": {
    "id": "merchant-review-...",
    "generatedAt": "2026-05-30T00:00:00.000Z",
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
    "items": [
      {
        "id": "review-finding-missing-shipping-policy",
        "kind": "finding",
        "status": "needs_fix",
        "title": "Shipping policy candidate is missing",
        "sourceReferences": [
          {
            "type": "finding",
            "findingId": "finding-missing-shipping-policy",
            "findingCategory": "policy_faq",
            "label": "Finding: Shipping policy candidate is missing"
          }
        ],
        "linkedFindingIds": ["finding-missing-shipping-policy"],
        "linkedQuestionIds": []
      }
    ],
    "draftSuggestions": [
      {
        "id": "draft-add-shipping-policy-page-...",
        "type": "add_shipping_policy_page",
        "status": "drafted",
        "title": "Add shipping policy page",
        "linkedFindingIds": ["finding-missing-shipping-policy"],
        "linkedQuestionIds": [],
        "guardrails": [
          "Local draft only; does not write to Shopify.",
          "Requires merchant review before any future write workflow.",
          "Does not claim AI rankings, AI traffic, or sales lift."
        ]
      }
    ]
  }
}
```

Generated reports are local runtime output only. Do not commit copied report
JSON if it contains merchant catalog or store content.

## Limitations

- V0 does not persist merchant decisions.
- V0 does not write products, content, discovery files, or metaobjects.
- V0 does not create an approval UI with saved state.
- Draft suggestions are deterministic placeholders, not final merchant-approved
  copy.
