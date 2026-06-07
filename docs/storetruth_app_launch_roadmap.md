# StoreTruth AI app launch roadmap

Last updated: 2026-06-07

Status key:

- ✅ Complete
- 🟡 In progress / partial
- ⬜ Not started
- ⏸ Deferred until after launch
- ⚠️ Blocked / decision needed

## A. Launch goal

The smallest credible StoreTruth AI launch is a read-only Shopify AI commerce
readiness and store-truth audit app. It should let a merchant install the app
with minimal read-only permissions, run a bounded scan, and review evidence
about product truth, public agent-discovery surfaces, policy/content coverage,
deterministic buyer-question coverage, and merchant-controlled review items.

The launch should avoid unsupported automated publishing, broad write access,
AI ranking claims, AI traffic attribution claims, guaranteed sales claims,
customer-data access, billing complexity that is not ready, and any production
behavior that writes products, content, metaobjects, files, themes, or policies
without an explicit approved future workflow.

## B. Current repository status

- Current branch: `feature/review-filtering-v0`
- Current feature commit: `fc0ec45a535e02e6ea450e9c141b6f226aeeabce`
- Current `main` commit before merge: `8c90c5b15c6c1cf09f3aca44df2b2587ad88463d`
- Package/runtime stack: Shopify CLI React Router app, React 18, React Router
  7, TypeScript 5.9, Vite 6, `@shopify/shopify-app-react-router` 1.1,
  App Bridge React, Shopify web components, Prisma session storage, Node
  `>=20.19 <22 || >=22.12`, npm.
- Current Shopify scopes: `read_products,read_content,read_metaobjects`
- Current validation commands:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`
  - `git diff --check`
  - `git diff --cached --check`
- Known untracked local-only directories: `Marketing & Graphics/`
- Ignored local/generated paths observed in the repo include `.shopify/`,
  `.react-router/`, `build/`, `node_modules/`, and `prisma/dev.sqlite`.

## C. Completed foundation

### Shopify app scaffold and authentication foundation

- ✅ Complete: Shopify React Router app scaffold exists with TypeScript,
  Shopify app package, App Bridge, Prisma session storage, webhook route files,
  and Shopify CLI config.
- Evidence: `e693f80` (`Scaffold StoreTruth AI Shopify app`), `package.json`,
  `app/shopify.server.ts`, `shopify.app.toml`, `prisma/schema.prisma`.

### React Router and TypeScript foundation

- ✅ Complete: app routes, server loaders, TypeScript types, and validation
  scripts are present.
- Evidence: `app/routes/`, `app/storetruth/types.ts`, `npm run typecheck`,
  `npm run lint`, `npm run build`.

### Read-only Shopify scopes

- ✅ Complete: current config requests only
  `read_products,read_content,read_metaobjects`.
- Evidence: `shopify.app.toml`.

### Product scanning

- ✅ Complete: bounded Admin GraphQL product scan fetches first 10 products and
  summarizes non-customer product data into the local readiness report.
- Evidence: `732a816` (`Add read-only StoreTruth product scan`),
  `app/storetruth/product-scan.server.ts`,
  `docs/read_only_product_scan_v0.md`.

### Public discovery checks

- ✅ Complete: bounded same-domain HTTPS GET checks for `/robots.txt`,
  `/sitemap.xml`, `/agents.md`, `/llms.txt`, and `/llms-full.txt` with timeout
  and response-size limits.
- Evidence: `6e06d95` (`Add read-only public discovery checker`),
  `app/storetruth/public-discovery.server.ts`,
  `docs/public_discovery_checker_v0.md`.

### Policy/content scanning

- ✅ Complete: bounded read-only `pages` query scans policy/FAQ candidates,
  summarizes content length/hash, and records coverage signals.
- 🟡 In progress / partial: direct `Shop.privacyPolicy`,
  `Shop.refundPolicy`, `Shop.shippingPolicy`, and `Shop.termsOfService`
  fields were not exposed by the validated Admin schema during this slice, so
  V0 derives coverage from page title/handle candidates.
- Evidence: `487baf4` (`Add read-only policy content scan`),
  `app/storetruth/policy-content.server.ts`,
  `docs/policy_content_scan_v0.md`.

### Deterministic buyer-question simulation

- ✅ Complete: local template/rule simulation uses existing report data and
  does not call an AI provider.
- Evidence: `2ac7c3e` (`Add deterministic buyer question simulation`),
  `app/storetruth/question-simulation.server.ts`,
  `docs/deterministic_question_simulation_v0.md`.

### Merchant review workflow

- ✅ Complete: local-only review item and draft suggestion report data exists.
- 🟡 In progress / partial: merchant decisions are not persisted yet.
- Evidence: `1d6ff44` (`Add merchant review workflow V0`),
  `app/storetruth/merchant-review.server.ts`,
  `docs/merchant_review_workflow_v0.md`.

### Local review states

- ✅ Complete: page-session status controls are present for merchant review
  items.
- 🟡 In progress / partial: status changes are intentionally temporary.
- Evidence: `8c90c5b` (`Add local review state UI V0`),
  `docs/local_review_state_ui_v0.md`.

### Review filtering

- 🟡 In progress / partial: `feature/review-filtering-v0` adds local status,
  source, and priority filtering. Merge to `main` is pending in this pass.
- Evidence: `fc0ec45` (`Add review filtering V0`),
  `docs/review_filtering_v0.md`.

### Existing documentation and safety boundaries

- ✅ Complete: current docs repeatedly state no product writes, no write scopes,
  no billing, no protected customer data, no AI provider calls, no production
  deployment, no app submission, and no unsupported AI ranking, traffic, or
  sales claims.
- Evidence: `docs/storetruth_ai_blueprint.md`,
  `docs/storetruth_ai_first_slice.md`, V0 slice docs.

## D. Current slice

- Branch: `feature/review-filtering-v0`
- Commit: `fc0ec45a535e02e6ea450e9c141b6f226aeeabce`
- Status before merge: 🟡 In progress / partial
- Merge status: Needs verification until this pass fast-forwards `main`.

What it adds:

- Status filter: `all`, `new`, `reviewed`, `needs_fix`, `dismissed`,
  `drafted`, `approved_for_later`
- Source filter: `all`, product, public discovery, policy/content, buyer
  question
- Priority filter: `all`, `info`, `low`, `medium`, `high`
- Filtered count: `Showing X of Y review items`
- Clear filters action
- Local source labels for review items in the Merchant Review section

What it intentionally does not add:

- Review sorting
- Persistence
- Backend save actions
- Database migrations
- `localStorage` or `sessionStorage`
- URL or query-string persistence
- Shopify writes or new Shopify scopes
- AI provider calls
- Billing, deployment, or app submission behavior

Validation status:

- Needs verification in this pass before merge.

## E. Remaining work before a credible beta

### 1. Merchant review workflow completion

- ⬜ Not started: review sorting by priority, status, and source.
- 🟡 In progress / partial: review-state UX exists but needs polish.
- ⬜ Not started: empty states for no products, no findings, no review items,
  and no filter matches beyond the current simple no-match message.
- ⬜ Not started: filter/sort interaction rules.
- ⬜ Not started: focused unit or component tests for review filtering/status
  behavior.

### 2. Dashboard and report polish

- 🟡 In progress / partial: developer-only report view exists.
- ⬜ Not started: merchant-facing readiness summary and clearer score
  explanations.
- ⬜ Not started: evidence/source presentation polish.
- ⬜ Not started: loading, empty, and error states across scan sections.

### 3. Scan history and persistence

- ⚠️ Blocked / decision needed: minimum persistence model is not decided.
- ⬜ Not started: migrations for persisted scan reports.
- ⬜ Not started: repeat scan history.
- ⬜ Not started: comparison between scans.
- 🟡 In progress / partial: Shopify session persistence exists from the
  scaffold, but StoreTruth scan/review persistence is not implemented.
- ⬜ Not started: uninstall and data-cleanup behavior for StoreTruth report
  data if persistence is added.

### 4. Report export

- ⬜ Not started: export format decision.
- ⬜ Not started: safe merchant-facing report copy.
- ⬜ Not started: sensitive data leakage checks for exports.
- ⬜ Not started: print/download validation.

### 5. Onboarding and permissions

- 🟡 In progress / partial: read-only scopes are configured.
- ⬜ Not started: merchant-facing scope explanation.
- ⬜ Not started: read-only trust messaging in onboarding.
- ⬜ Not started: first scan flow.
- ⬜ Not started: install/reinstall behavior verification.
- ⬜ Not started: reauthorization handling UX.

### 6. Reliability and Shopify lifecycle handling

- 🟡 In progress / partial: app-specific `app/uninstalled` and
  `app/scopes_update` webhook routes exist from the scaffold.
- Needs verification: webhook verification beyond `authenticate.webhook`.
- Needs verification: idempotency and error handling for lifecycle routes.
- 🟡 In progress / partial: `app/uninstalled` deletes Shopify sessions.
- 🟡 In progress / partial: `app/scopes_update` updates stored session scope.
- ⬜ Not started: StoreTruth scan-data cleanup because scan persistence does not
  exist yet.
- ⬜ Not started: API error-state UX and retry strategy.
- ⬜ Not started: rate-limit handling strategy.
- ⬜ Not started: pagination beyond bounded V0 samples.

### 7. Privacy, legal, and merchant trust

- ⬜ Not started: production privacy policy.
- ⬜ Not started: production terms of service.
- ⬜ Not started: production support contact.
- ⚠️ Blocked / decision needed: data retention and deletion policy depends on
  whether scan persistence is added.
- Needs verification: Shopify mandatory compliance webhooks beyond the current
  app lifecycle webhooks.
- ⬜ Not started: merchant-facing disclosure of read-only behavior.

### 8. Billing decision

- ⚠️ Blocked / decision needed: decide whether billing is required for initial
  beta or public launch.
- ⬜ Not started: pricing model.
- ⬜ Not started: billing UX.
- ⬜ Not started: trial behavior.
- ⬜ Not started: cancellation and reinstall behavior.
- Do not implement billing in this pass.

### 9. App listing and marketing assets

- ⬜ Not started: app icon in an approved tracked asset path.
- ⬜ Not started: feature/hero image.
- ⬜ Not started: screenshot sequence.
- ⬜ Not started: listing copy.
- ⬜ Not started: support and privacy URLs.
- ⬜ Not started: review prototype marketing claims against shipped
  functionality.
- 🟡 In progress / partial: `Marketing & Graphics/` exists locally but is
  untracked and must remain untracked unless an approved repository asset path
  is established.

### 10. Testing and beta readiness

- ⬜ Not started: unit tests for StoreTruth scoring, findings, policy/content
  candidates, discovery classification, question simulation, and review UI
  behavior.
- ⬜ Not started: integration tests for the developer report loader.
- ⬜ Not started: Playwright or equivalent critical-flow coverage.
- ⬜ Not started: installation tests.
- ⬜ Not started: multiple-store validation.
- ⬜ Not started: permission and error-state testing.
- ⬜ Not started: accessibility and responsive checks.
- 🟡 In progress / partial: manual secret/safety scans have been performed in
  prior slices; automated security scanning is not established.
- ⬜ Not started: dependency review.

### 11. Deployment and Shopify App Store submission

- ⬜ Not started: production hosting.
- ⬜ Not started: production environment configuration.
- ⚠️ Blocked / decision needed: database and backup plan if persistence is
  added.
- ⬜ Not started: monitoring and sanitized logs.
- 🟡 In progress / partial: Shopify app config exists for development, but
  `application_url` and `redirect_urls` still use placeholder URLs.
- ⬜ Not started: listing submission.
- ⬜ Not started: review credentials and reviewer instructions.
- ⬜ Not started: app-review remediation plan.

## F. Launch gates

### Internal alpha

- ✅ App installs and authenticates on the configured development store.
- ✅ Current scopes remain read-only.
- ✅ Developer-only report can run product, discovery, policy/content,
  question-simulation, merchant-review, local-state, and filtering slices.
- ⬜ Add basic error/empty states for the current report view.
- ⬜ Add focused tests for deterministic report helpers.
- ⬜ Confirm no secrets/local auth files are tracked.

### Merchant beta

- ⬜ Merchant-facing report summary and source evidence are understandable.
- ⬜ Onboarding explains read-only scopes and scan boundaries.
- ⬜ Privacy/support/legal pages exist.
- ⬜ Decision made on persistence and scan history.
- ⬜ Error, rate-limit, and reinstall flows are tested.
- ⬜ At least two stores validate the bounded scan safely.

### Shopify App Store submission

- ⬜ Production hosting and environment variables are configured.
- ⬜ Required Shopify webhooks and compliance requirements are verified.
- ⬜ App listing assets, screenshots, support URL, privacy URL, and terms URL are
  ready.
- ⬜ App-review credentials and reviewer instructions are ready.
- ⬜ Security, dependency, accessibility, and critical-flow tests pass.
- ⬜ All public claims match shipped functionality and avoid unsupported AI
  ranking, traffic, or sales claims.

### Public launch

- ⬜ Beta feedback has been reviewed.
- ⬜ Monitoring and sanitized logging are in place.
- ⬜ Data retention/deletion behavior is documented and tested.
- ⬜ Billing, if used, is tested end to end.
- ⬜ Support process and remediation plan are ready.

## G. Deferred hardening and post-launch work

- ⏸ Deferred until after launch: advanced AI provider integration.
- ⏸ Deferred until after launch: merchant-approved drafting with saved approval
  state.
- ⏸ Deferred until after launch: Shopify write workflows and write scopes.
- ⏸ Deferred until after launch: richer historical comparisons.
- ⏸ Deferred until after launch: advanced analytics.
- ⏸ Deferred until after launch: automation.
- ⏸ Deferred until after launch: additional vertical-specific question packs.
- ⏸ Deferred until after launch: broader integrations beyond Shopify surfaces.

These items are useful hardening or expansion paths, but they are not approved
launch blockers unless a future launch decision changes the scope.

## H. Recommended next slice

Recommended next branch after this merge:

`feature/review-sorting-v0`

Proposed local-only scope:

- sort merchant review items by priority
- sort merchant review items by status
- sort merchant review items by source
- no persistence
- no backend action
- no browser storage
- no Shopify writes
- no new Shopify scopes

Do not start this branch until `feature/review-filtering-v0` has been reviewed,
merged, and pushed.

## I. Roadmap update log

| Date | Branch or commit | Change | Validation | Next step |
| --- | --- | --- | --- | --- |
| 2026-06-07 | `feature/review-filtering-v0` | Created canonical launch roadmap and repo-local reporting instruction while review-filtering merge was pending. | Needs verification before merge. | Validate, fast-forward `main`, push, and update merge status. |
