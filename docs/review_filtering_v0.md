# Review filtering v0

This slice adds local filtering controls to the developer-only StoreTruth
product scan view. Filters apply to merchant review items already present in the
local readiness report.

## Guardrails

- No Shopify writes.
- No write scopes.
- No persistence.
- No database migration.
- No `localStorage` or `sessionStorage`.
- No billing.
- No protected customer data.
- No AI provider calls.
- No production deployment or app submission.
- No claims about AI rankings, AI traffic, or sales lift.

## Filters

The Merchant Review section supports page-session filters for:

- review status: `all`, `new`, `reviewed`, `needs_fix`, `dismissed`,
  `drafted`, `approved_for_later`
- source area: `all`, product, public discovery, policy/content, buyer question
- priority: `all`, `info`, `low`, `medium`, `high`

The page shows a filtered count in the form `Showing X of Y review items` and
includes a `Clear filters` control.

## Implementation

Filtering uses React component state only. Status filtering uses the current
page-session status for each item, so temporary review status changes can affect
the filtered list without being saved.

Source filters are deterministic and derived from existing review item fields:

- product references and product-readiness findings
- discovery URL references and agent-discovery findings
- policy page references and policy/FAQ findings
- buyer-question review items, linked questions, or question references

Priority filtering uses the existing review item `priority` field.

## Limitations

- Filter state is discarded when the page reloads or the user navigates away.
- Filter state is not included in the JSON report endpoint.
- There is no backend action, database write, browser storage call, or Shopify
  write path for filter changes.
- The source filter is a local grouping for review triage, not a complete
  taxonomy.
