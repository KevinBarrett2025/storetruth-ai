# Local review state UI v0

This slice adds page-session review status controls to the developer-only
StoreTruth product scan view.

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

## Behavior

The `Product Scan` page now renders each merchant review item with a status
control. Supported statuses match the merchant review report:

- `new`
- `reviewed`
- `needs_fix`
- `dismissed`
- `drafted`
- `approved_for_later`

Changing a status updates React component state only. The change is visible in
the current browser page session and affects the summary counts shown in the
Merchant Review section.

The change is discarded when:

- the page reloads
- the user navigates away
- the scan route is fetched again
- the browser tab is closed

## Implementation

The route uses `useState<Record<string, MerchantReviewStatus>>` keyed by
merchant review item ID. Initial values come from the generated local readiness
report. There is no form action, server action, API route, storage call, or
database write for review status changes.

## Limitations

- Status changes are not included in the JSON report endpoint.
- Status changes cannot be shared with another browser tab or user.
- There is no saved approval workflow.
- Draft suggestions remain local deterministic placeholders, not final
  merchant-approved copy.
