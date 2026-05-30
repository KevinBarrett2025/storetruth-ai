# Deterministic buyer-question simulation v0

This slice adds local-only buyer-question simulation to the StoreTruth
readiness report. It does not call an AI provider.

## Guardrails

- Uses existing local report data only:
  - bounded product scan
  - bounded public discovery checks
  - bounded policy/content scan
- Uses deterministic templates and rules.
- Does not write products, content, metaobjects, billing data, or merchant
  settings.
- Does not request customer, order, payment, token, session, price, inventory
  quantity, or protected customer data.
- Does not make claims about AI rankings, AI traffic, or sales lift.

## Question categories

The V0 simulation emits fixed local templates for these categories:

- `product_recommendation`
- `product_comparison`
- `shipping`
- `returns_refunds`
- `warranty_support`
- `sizing_options`
- `compatibility_specs`
- `materials_use_case`
- `contact_help_faq`

The public discovery question is currently grouped under `contact_help_faq`
because it checks whether an external agent can find declared public source
surfaces before answering store-level questions.

## Classification statuses

Each question receives one deterministic status:

- `answered`: bounded source data appears sufficient for a basic
  source-backed answer.
- `partially_answered`: some source data exists, but coverage is thin or
  incomplete.
- `unanswered`: the expected source signal is missing from the bounded report.
- `unclear`: source data exists, but it is too generic, blocked, timed out, or
  otherwise not reliable enough for a confident local classification.
- `contradiction_risk`: multiple candidate policy/source pages matched the
  same topic with distinct non-empty body hashes and should be reviewed before
  being treated as a single source of truth.

The score is the average of fixed status weights:

- `answered`: 100
- `partially_answered`: 60
- `unclear`: 35
- `contradiction_risk`: 20
- `unanswered`: 0

## Source references

Question results include source references where available:

- product GID, title, and handle
- policy/content page GID, title, and handle
- discovery URL path
- finding ID and category

These references are pointers into the same local report. They are not external
claims about AI visibility or buyer behavior.

## Run or view

Start the local Shopify app:

```sh
npm run dev
```

Open the embedded app on the configured development store, then open the
developer-only `Product Scan` route. The report view shows the buyer-question
section, and the JSON endpoint includes the same data at:

`/app/product-scan/report`

Both routes are authenticated through the embedded app and return `404` when
`NODE_ENV=production`.

## Report shape

The readiness report now includes:

```json
{
  "questionSimulation": {
    "id": "question-simulation-...",
    "generatedAt": "2026-05-30T00:00:00.000Z",
    "method": "local_template_rules",
    "readOnly": true,
    "score": 60,
    "summary": {
      "totalQuestions": 10,
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
      },
      "sourceSignalsUsed": []
    },
    "questions": [
      {
        "id": "question-shipping-expectations",
        "question": "Can a buyer understand shipping or delivery expectations before purchase?",
        "category": "shipping",
        "resultStatus": "unanswered",
        "sourceSummary": "No page title or handle matched Shipping policy.",
        "sourceReferences": [],
        "riskFlags": ["missing_policy_source"]
      }
    ],
    "findings": []
  }
}
```

Generated reports are local runtime output only. Do not commit copied report
JSON if it contains merchant catalog or store content.

## Limitations

- No AI model evaluates answers in this slice.
- The questions are fixed templates, not generated from shopper traffic or
  customer data.
- Policy coverage still uses the supported `pages` query and title/handle
  candidates from the policy/content scan V0.
- Compatibility, specs, materials, and use-case checks are simple keyword and
  field-presence heuristics.
