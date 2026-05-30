# StoreTruth AI First Slice

This slice is intentionally local and dry-run only. It establishes the Shopify React Router app foundation and StoreTruth architecture boundaries without product writes, billing, customer data, AI provider calls, deployment, or app submission.

## Current Scope

- Shopify React Router TypeScript scaffold
- `@shopify/shopify-app-react-router`
- GraphQL Admin API-ready app shell
- App Bridge and Shopify web components
- Read-only app scopes
- Local mock scan report

## Dry-Run Architecture Skeleton

- `scan runs`: represented by `ScanRun`
- `scan findings`: represented by `ScanFinding`
- `product readiness scoring`: `calculateProductReadinessScore`
- `agent discovery checks`: `AgentDiscoveryCheck`
- `AI question simulation`: `AIQuestionSimulation`
- `merchant-approved content suggestions`: `ContentSuggestion`

## Feasibility TODOs

- Query products through Shopify GraphQL Admin API with `read_products` only.
- Fetch `/agents.md`, `/llms.txt`, `/llms-full.txt`, `/robots.txt`, and sitemap from the public storefront.
- Test public Storefront, MCP, and UCP surfaces only where official and reachable.
- Produce a local JSON readiness report without product writes or AI provider calls.

## Validation Commands

```sh
npm run typecheck
npm run lint
npm run build
```

## Guardrails

- No product write scopes
- No billing
- No protected customer data
- No real AI provider calls
- No production deployment
- No app submission
- No unsupported claims about AI rankings, AI traffic, or guaranteed sales
