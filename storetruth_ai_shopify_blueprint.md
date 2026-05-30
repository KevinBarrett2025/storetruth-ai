# StoreTruth AI — Shopify AI Agent Readiness / Store Truth Layer Blueprint

_Last updated: 2026-05-30_

## 0. Executive Summary

**Working product name:** StoreTruth AI
**Category:** Shopify app / AI agent readiness / store truth layer / AI commerce quality control
**One-liner:** StoreTruth AI audits how AI shopping agents may understand a Shopify store, finds product-data, policy, FAQ, and agent-discovery gaps, and gives merchants a prioritized, merchant-approved fix workflow.

### Core thesis

Shopify is moving commerce into AI channels through Agentic Storefronts, Shopify Catalog, UCP/MCP-based agent infrastructure, and agent-facing store discovery surfaces such as `/agents.md`, `/llms.txt`, and `/llms-full.txt`. Merchants will increasingly need to know whether AI agents can accurately understand, answer questions about, and recommend their products.

StoreTruth AI should not be “another AI product description generator” or “another LLMs.txt app.” The durable opportunity is to become the **truth, QA, and readiness layer** between messy merchant store data and AI shopping agents.

### Recommended first version

Build a read-only Shopify app that:

1. Connects to a Shopify store.
2. Scans products, variants, collections, policies, available metafields/metaobjects where appropriate, and agent-facing discovery surfaces.
3. Produces an **AI Agent Readiness Score**.
4. Simulates buyer questions.
5. Detects missing product attributes, inconsistent policy answers, weak FAQ coverage, and agent-discovery issues.
6. Generates merchant-approved fix recommendations.
7. Exports a report and prioritized fix list.

Do **not** launch with automatic rewriting, ranking guarantees, customer-data access, direct agent traffic attribution, or unsupported claims.

---

## 1. Research-Backed Market Rationale

### 1.1 Shopify is actively enabling agentic commerce

Official Shopify materials describe Agentic Storefronts as a way for customers to discover and purchase products in AI channels such as ChatGPT, Google AI Mode/Gemini, and Microsoft Copilot. Shopify says eligible products are made available to AI channels through Shopify Catalog and that merchants can manage AI channels inside the Shopify admin.

Relevant official docs:

- Shopify agentic storefronts:
  https://help.shopify.com/en/manual/online-sales-channels/agentic-storefronts

- Shopify Catalog and product discovery for agentic storefronts:
  https://help.shopify.com/en/manual/online-sales-channels/agentic-storefronts/products

- Shopify agentic commerce / UCP docs:
  https://shopify.dev/docs/agents

### 1.2 The merchant pain

AI commerce creates a new class of operational risk:

- AI agents may misunderstand products.
- AI agents may answer policy questions incorrectly.
- Products may be under-described for AI recommendation contexts.
- B2B/wholesale-only products may create visibility confusion.
- Custom metafield/metaobject product data may not be reflected well in Shopify Catalog unless configured.
- Store policies, FAQs, product pages, and shipping/return/warranty details may contradict each other.
- Merchants may not understand what agent-facing files or product data surfaces exist.

Shopify’s docs specifically note that products are listed through Shopify Catalog by default with title, description, options, images, price, availability, and other key attributes in a structure AI agents can parse. The docs also say Catalog Mapping is useful when product data lives in custom fields, metafields, metaobjects, tag prefixes, or delimited titles.

### 1.3 Existing tools validate demand but leave room

Early Shopify apps already exist around LLMs.txt, AEO/GEO, AI visibility, and agent readiness. That is validation, not a reason to stop. The mistake would be competing as a commodity “generate LLMs.txt” app.

The wedge should be:

> StoreTruth AI is not just an AI visibility tool. It is an AI truth and readiness QA system.

### 1.4 Why this is better than chargeback automation as a first passive-income app

Compared with Shopify chargeback/dispute automation, StoreTruth AI has:

- Lower compliance burden.
- Lower customer-data sensitivity.
- Lower legal/financial risk.
- More passive potential.
- Easier public app review path.
- Lower merchant trust barrier.
- Faster MVP path.
- Stronger timing due to Shopify’s new AI commerce push.

Chargebacks may have higher willingness to pay per customer, but they are more support-heavy and riskier. StoreTruth AI can start as a read-only audit/reporting app and expand gradually.

---

## 2. Product Positioning

### 2.1 Main positioning

**StoreTruth AI helps Shopify merchants control how AI shopping agents understand, answer questions about, and recommend their products.**

### 2.2 App Store subtitle options

- “Audit your store for AI shopping readiness.”
- “Find product, policy, and FAQ gaps before AI agents misrepresent your brand.”
- “Scan product data, policies, and agent-facing store information for AI readiness.”

### 2.3 Avoid these claims

Do not claim:

- “Rank #1 in ChatGPT.”
- “Guaranteed AI traffic.”
- “Guaranteed AI sales.”
- “The first/best/only AI SEO app.”
- “Guaranteed placement in AI answers.”
- “We control how ChatGPT recommends your products.”

Shopify App Store requirements emphasize secure, truthful, privacy-safe apps that operate within Shopify’s platform.

Official docs:

- Shopify App Store requirements:
  https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements

### 2.4 Trust-first framing

Preferred language:

- “Readiness”
- “Accuracy”
- “Completeness”
- “Coverage”
- “Merchant-approved fixes”
- “Source-backed recommendations”
- “AI shopping preparedness”
- “Agent-facing store QA”

---

## 3. Core User

### Primary customer

Small-to-mid-sized Shopify merchants selling physical products who depend on product discovery and customer trust.

### Best early verticals

Prioritize categories where missing product details cause real buyer hesitation:

1. Apparel and accessories
2. Furniture and home goods
3. Tools/hardware
4. Beauty/skincare
5. Outdoor gear
6. Pet products
7. Specialty food
8. Electronics/accessories
9. Home improvement fixtures
10. Automotive/motorcycle accessories

### Merchant jobs-to-be-done

- “Tell me whether my products are ready for AI shopping agents.”
- “Tell me what product details are missing.”
- “Tell me whether my store policies and FAQs are clear.”
- “Tell me what AI buyers might ask that my store cannot answer.”
- “Give me a prioritized fix list.”
- “Let me approve improvements without rewriting everything manually.”

---

## 4. MVP Product Scope

## 4.1 MVP v0.1 — Read-only scanner and report

This is the first build target.

### Included

- Shopify install/auth.
- Read product catalog through GraphQL Admin API.
- Read variants, options, descriptions, product type, vendor, tags, images, and SEO fields where available.
- Read collections where relevant.
- Read store policies where available.
- Read selected metafield definitions and product metafield summaries if scope allows.
- Fetch public agent-facing URLs:
  - `/agents.md`
  - `/llms.txt`
  - `/llms-full.txt`
  - `/robots.txt`
  - sitemap where useful.
- Run deterministic readiness checks.
- Generate AI-assisted findings.
- Generate buyer-question simulations.
- Produce dashboard and findings table.
- Export report as Markdown/CSV/JSON initially.

### Excluded

- No write actions.
- No automatic product edits.
- No protected customer data.
- No billing in the first feasibility slice.
- No ranking guarantees.
- No competitor tracking in V1.
- No direct agent-platform API dependence beyond public/official surfaces.
- No fragile scraping-heavy architecture.

## 4.2 MVP v0.2 — Merchant-approved recommendations

Add:

- Suggested FAQ answers.
- Suggested product content improvements.
- Suggested alt text improvements.
- Suggested missing attributes.
- Policy contradiction explanations.
- Copy/export workflow.

Still no automatic application.

## 4.3 MVP v0.3 — Controlled write actions

Only after validation:

- Apply approved product content changes.
- Apply approved SEO field changes.
- Apply approved alt text changes.
- Create app-owned metafields/metaobjects if clearly needed.
- Full diff preview before apply.
- Audit log and rollback metadata.

---

## 5. Core Screens

## 5.1 Dashboard

Purpose: one-page merchant understanding.

Components:

- Overall StoreTruth Score: 0–100.
- Product Data Readiness.
- Policy/FAQ Readiness.
- AI Question Coverage.
- Agent Discovery Health.
- Risk/Contradiction Warnings.
- Last scan date.
- Scan status.
- Top 5 recommended fixes.
- “Run Scan” CTA.
- “View Report” CTA.

Example:

> Your store is 64% ready for AI shopping agents. We found 42 products missing key recommendation attributes, 6 policy contradictions, and 18 unanswered buyer questions.

## 5.2 Product Truth Audit

Checks per product:

- Title clarity.
- Description completeness.
- Use-case language.
- Material/specification details.
- Size/fit/compatibility details where relevant.
- Variant naming clarity.
- Image presence.
- Alt text presence.
- SEO title/meta description presence.
- Product type/category clarity.
- Collection placement.
- Missing metafield opportunity.
- Thin/duplicate content.
- B2B/D2C visibility risk.
- Policy/product contradiction risk.

## 5.3 AI Question Simulator

Purpose: test whether a store can answer real buyer questions.

Question categories:

- Product recommendation
- Product comparison
- Shipping
- Returns
- Warranty
- Sizing
- Compatibility
- Materials
- Use case
- Safety/compliance
- Giftability
- International buyer questions

Result statuses:

- Answered
- Partially answered
- Unanswered
- Contradicted
- Risky/hallucination-prone
- Missing source
- Wrong/weak product match

## 5.4 Knowledge/FAQ Gap Finder

Purpose: help merchants improve the source material AI agents use.

Features:

- Recommended FAQ list.
- Missing FAQ detection.
- Duplicate FAQ detection.
- Contradiction detection.
- Suggested concise answers.
- Export to CSV/Markdown/JSON.
- Later: apply to Shopify Knowledge Base or metaobjects if safe and supported.

## 5.5 Fix Center

Purpose: turn findings into action.

V1 fix types:

- Copy suggestion.
- Export suggestion.
- Mark reviewed.
- Ignore finding.
- Add note.
- Prioritize.

Later fix types:

- Apply product content edit.
- Apply alt text.
- Create metafield.
- Update metaobject.
- Update content page/policy draft.

All write actions must be explicit and merchant-approved.

---

## 6. Technical Foundation

## 6.1 Recommended Shopify stack

Use Shopify’s current recommended app path:

- Shopify CLI
- React Router app template
- TypeScript
- `@shopify/shopify-app-react-router`
- GraphQL Admin API
- App Bridge
- Shopify web components
- Shopify App Design Guidelines

Official docs:

- Build a Shopify app using React Router:
  https://shopify.dev/docs/apps/build/build

- `@shopify/shopify-app-react-router`:
  https://shopify.dev/docs/api/shopify-app-react-router/latest

## 6.2 Recommended app stack

| Layer | Recommendation |
|---|---|
| Language | TypeScript |
| App framework | Shopify React Router template |
| UI | Shopify web components / App Bridge |
| API | GraphQL Admin API |
| Database | PostgreSQL |
| ORM | Prisma or Drizzle |
| Validation | Zod |
| Background jobs | Inngest, Trigger.dev, BullMQ, Cloudflare Queues, or similar |
| AI provider | Provider adapter, start with OpenAI or Anthropic |
| Error monitoring | Sentry |
| Product analytics | PostHog or internal events |
| Hosting | Render, Fly.io, Railway, Cloud Run, or similar |

## 6.3 Why TypeScript first

The user is comfortable with Python, but this product is Shopify-native. TypeScript reduces Shopify integration friction:

- Better alignment with official Shopify templates.
- Easier embedded admin UI.
- Easier App Bridge integration.
- Easier GraphQL codegen.
- Easier App Store review alignment.

Python can still be used later for offline analysis, scripts, or ML experiments, but not as the primary app foundation.

---

## 7. Shopify Scopes

## 7.1 Read-only MVP scopes

Start as low-risk as possible.

Likely initial scopes:

```txt
read_products
read_content
read_metaobjects
```

Potentially later:

```txt
read_files
read_themes
read_markets
```

Only request what is needed.

## 7.2 Later write scopes

Only add after merchant-approved write workflow exists:

```txt
write_products
write_content
write_metaobjects
write_files
write_themes
```

## 7.3 Avoid protected customer data in V1

Do not request customer data in V1.

Shopify protected customer data requirements focus on data minimization, transparency, and security. Apps using customer names, addresses, phone numbers, emails, or other customer data can require additional review. Avoid this complexity in V1.

Official docs:

- Work with protected customer data:
  https://shopify.dev/docs/apps/launch/protected-customer-data

---

## 8. Data Model

Use PostgreSQL. Keep raw data retention limited. Prefer hashes/summaries where possible.

### 8.1 Tables

```txt
shops
- id uuid primary key
- shop_domain text unique not null
- access_token_encrypted text not null
- scopes text[]
- plan text
- installed_at timestamptz
- uninstalled_at timestamptz
- created_at timestamptz
- updated_at timestamptz

scan_runs
- id uuid primary key
- shop_id uuid references shops(id)
- status text not null
- started_at timestamptz
- finished_at timestamptz
- product_count int
- collection_count int
- score_overall int
- score_products int
- score_policies int
- score_faq int
- score_agent_discovery int
- error_message text
- created_at timestamptz

scan_findings
- id uuid primary key
- scan_run_id uuid references scan_runs(id)
- severity text
- category text
- resource_type text
- resource_gid text
- title text
- description text
- evidence_json jsonb
- recommendation_json jsonb
- status text
- created_at timestamptz
- updated_at timestamptz

product_snapshots
- id uuid primary key
- scan_run_id uuid references scan_runs(id)
- shopify_product_gid text
- handle text
- title text
- product_type text
- vendor text
- tags text[]
- description_hash text
- seo_hash text
- image_count int
- variant_count int
- metafield_summary_json jsonb
- variant_summary_json jsonb
- readiness_score int
- created_at timestamptz

agent_discovery_snapshots
- id uuid primary key
- scan_run_id uuid references scan_runs(id)
- url text
- status_code int
- content_hash text
- content_summary text
- finding_json jsonb
- created_at timestamptz

question_tests
- id uuid primary key
- scan_run_id uuid references scan_runs(id)
- question text
- category text
- result_status text
- answer_summary text
- source_match_json jsonb
- risk_flags_json jsonb
- created_at timestamptz

content_suggestions
- id uuid primary key
- shop_id uuid references shops(id)
- finding_id uuid references scan_findings(id)
- resource_type text
- resource_gid text
- suggestion_type text
- before_text text
- after_text text
- model_name text
- prompt_version text
- status text
- approved_at timestamptz
- applied_at timestamptz
- created_at timestamptz
- updated_at timestamptz

usage_events
- id uuid primary key
- shop_id uuid references shops(id)
- event_type text
- units int
- model_name text
- estimated_tokens int
- estimated_cost numeric
- created_at timestamptz

audit_events
- id uuid primary key
- shop_id uuid references shops(id)
- actor_type text
- action text
- resource_type text
- resource_id text
- metadata_json jsonb
- created_at timestamptz
```

### 8.2 Data retention principles

- Store minimum required merchant data.
- Do not store customer data in V1.
- Store product summaries and hashes where possible.
- Store AI outputs with prompt version and source references.
- Keep uninstall cleanup support.

---

## 9. Scoring System

## 9.1 Overall score

Initial deterministic formula:

```txt
Overall Score =
  35% Product Data Readiness
  20% Policy / FAQ Readiness
  20% AI Question Coverage
  15% Agent Discovery Health
  10% Risk / Contradiction Penalty
```

## 9.2 Product Data Readiness

Signals:

- Title is clear and specific.
- Description is non-thin.
- Product type/category exists.
- Product has images.
- Product has options/variants named clearly.
- Product has price and availability.
- Product has use-case terms.
- Product has specs/materials/dimensions where relevant.
- Product has sizing/compatibility guidance where relevant.
- Product has SEO title/meta description where available.
- Product data is not contradictory.

## 9.3 Policy / FAQ Readiness

Signals:

- Shipping policy exists.
- Return/refund policy exists.
- Warranty/support policy exists where relevant.
- Policies are not contradictory.
- Basic customer questions can be answered.
- Important restrictions are clear.

## 9.4 AI Question Coverage

Signals:

- Generated buyer questions have source-backed answers.
- Answers are not contradicted by product/policy data.
- High-intent questions are answered.
- Product recommendations can be made using product attributes.

## 9.5 Agent Discovery Health

Signals:

- `/agents.md` reachable.
- `/llms.txt` reachable.
- `/llms-full.txt` reachable.
- `/robots.txt` reachable and not obviously blocking desired crawlers.
- Sitemap reachable.
- Discovery files are not empty or obviously broken.
- Public product pages are indexable where intended.

---

## 10. AI Usage Design

## 10.1 AI should help with

- Classifying findings.
- Generating buyer-style questions.
- Drafting FAQ answers.
- Drafting product improvement suggestions.
- Explaining findings in plain English.
- Summarizing reports.

## 10.2 AI should not be trusted as source of truth

Source of truth must be:

- Shopify product data.
- Shopify policy data.
- Public discovery surfaces.
- Public storefront pages where used.
- Merchant-approved content.
- Recorded scan evidence.

Every AI recommendation should be source-backed.

## 10.3 Prompting rules

- Use low temperature.
- Use structured JSON output.
- Validate with Zod.
- Keep prompt versions.
- Store model name and estimated tokens.
- Refuse to invent details.
- If data is missing, mark it missing.
- Distinguish “missing,” “unclear,” and “contradictory.”

## 10.4 Provider abstraction

Do not hardcode to one provider.

Create an interface:

```ts
interface AIProvider {
  generateStructuredFinding(input: FindingInput): Promise<FindingOutput>;
  generateQuestionSet(input: QuestionSetInput): Promise<QuestionSetOutput>;
  generateContentSuggestion(input: SuggestionInput): Promise<SuggestionOutput>;
}
```

Start with one provider but keep the adapter boundary.

---

## 11. Background Job Flow

Scans should run as background jobs.

### 11.1 Scan lifecycle

```txt
Merchant clicks Run Scan
  -> create scan_run(status='queued')
  -> enqueue scan job
  -> fetch product/page/policy/discovery data
  -> create product snapshots
  -> run deterministic checks
  -> run AI-assisted checks where needed
  -> run question simulations
  -> calculate scores
  -> write findings
  -> mark scan_run(status='completed')
  -> dashboard updates
```

### 11.2 Important job requirements

- Idempotent.
- Retry-safe.
- Per-shop rate limiting.
- Progress tracking.
- Failure reason visible to merchant.
- Do not block request/response path with long AI work.
- Avoid scanning huge stores all at once on free plan.

---

## 12. Security, Privacy, and Compliance

## 12.1 Security principles

- Encrypt access tokens.
- Never log access tokens.
- Never log full product data unnecessarily.
- Validate all external inputs.
- Rate-limit scan triggers.
- Verify Shopify auth/session handling through official package.
- Use environment variables for secrets.
- Keep prompt injection risks in mind when processing merchant content.

## 12.2 Privacy principles

- No customer data in V1.
- Minimal product/store data retention.
- Clear privacy policy.
- Uninstall cleanup.
- Merchant-controlled reports.
- No training on merchant data unless explicitly disclosed and opted in.

## 12.3 App review considerations

- Truthful listing.
- No unsupported claims.
- Embedded UI follows Shopify guidelines.
- Minimal scopes.
- Billing clear.
- Privacy policy complete.
- Support contact available.
- No hidden write behavior.

---

## 13. Pricing

Initial pricing should favor installs and reviews.

### Suggested launch pricing

| Plan | Price | Includes |
|---|---:|---|
| Free | $0 | 25 products, 10 AI questions, basic report |
| Starter | $29/mo | 250 products, monthly scans, FAQ suggestions |
| Growth | $79/mo | 2,000 products, weekly scans, exports, product fix drafts |
| Pro | $149/mo | 10,000 products, daily scans, multi-market reports, bulk suggestions |

Optional usage charges later:

- Extra scan credits.
- Extra AI question simulations.
- Bulk rewrite credits.
- Large catalog add-on.

Do not add complex usage billing until real usage patterns are known.

---

## 14. First Codex Build Plan

## 14.1 Codex should not start with full implementation

Codex should start with a narrow feasibility/scaffold slice.

### First Codex goal

Create the initial Shopify app scaffold and a design/architecture file inside the repo, then optionally add a dry-run local scanner route or CLI that proves the data surfaces are reachable.

### First slice boundaries

Allowed:

- Scaffold Shopify React Router app.
- Add project README/planning docs.
- Add TypeScript types for scan model.
- Add stub scanner services.
- Add a dashboard placeholder.
- Add no-op scan button.
- Add local/mock scan result.
- Add `docs/storetruth_ai_blueprint.md`.
- Add validation commands.

Not allowed yet:

- No product write scopes.
- No billing.
- No protected customer data.
- No automatic product edits.
- No AI provider secret wiring beyond placeholder env docs.
- No unsupported claims in UI.
- No production deployment.
- No app submission.
- No scraping-heavy implementation.

## 14.2 First Codex prompt

Use this as the first message to Codex:

```txt
We are starting a new Shopify app called StoreTruth AI.

Goal:
Build a Shopify AI Agent Readiness / Store Truth Layer app. It audits how AI shopping agents may understand a Shopify store, finds product-data, policy, FAQ, and agent-discovery gaps, and gives merchants a prioritized merchant-approved fix workflow.

Important:
Start with a safe scaffold/planning slice only. Do not build the full app yet.

Use the current Shopify-recommended stack:
- Shopify CLI React Router app template
- TypeScript
- @shopify/shopify-app-react-router
- GraphQL Admin API
- App Bridge
- Shopify web components
- Strict typing
- Minimal scopes

First slice requirements:
1. Inspect the current project/repo state if one exists. If no repo exists, propose the exact scaffold command and folder structure before making assumptions.
2. Add or create `docs/storetruth_ai_blueprint.md` containing the product/technical blueprint.
3. Create an initial architecture skeleton for:
   - scan runs
   - scan findings
   - product readiness scoring
   - agent discovery checks
   - AI question simulation
   - merchant-approved content suggestions
4. If code is added, keep it dry-run/mock only:
   - no Shopify product writes
   - no billing
   - no protected customer data
   - no real AI provider calls unless explicitly approved later
   - no production deployment
5. Add clear TODOs for the feasibility spike:
   - query products through GraphQL
   - fetch `/agents.md`, `/llms.txt`, `/llms-full.txt`, `/robots.txt`, sitemap
   - test public Storefront/MCP/UCP surfaces only where official and reachable
   - produce a local JSON readiness report
6. Include validation commands and report exactly what was changed.

Guardrails:
- Do not request customer-data scopes.
- Do not add write scopes.
- Do not claim guaranteed rankings, AI traffic, or sales.
- Do not overbuild.
- Prefer small, reviewable commits.
- Keep secrets out of code and logs.

Before coding, return a short implementation plan and any assumptions.
```

---

## 15. Feasibility Spike Checklist

Before building the polished app, prove:

### Shopify access

- Can app install on a dev store?
- Can app query products with current GraphQL Admin API?
- Can app read collections?
- Can app read product SEO fields?
- Can app read product images/alt text?
- Can app read metafield definitions and summaries with minimal scopes?
- Can app read policies/content pages?

### Agent-facing surfaces

- Is `/agents.md` reachable on a dev store?
- Is `/llms.txt` reachable?
- Is `/llms-full.txt` reachable?
- Is `/robots.txt` reachable?
- Is sitemap reachable?
- Is Storefront MCP/UCP endpoint reachable and useful for store-specific tests?

### Scoring

- Can deterministic product checks produce useful findings?
- Can a 10-product report reveal obvious gaps?
- Are findings understandable to merchants?

### AI simulation

- Can the app generate useful buyer questions?
- Can answers be source-backed?
- Can the app avoid hallucinating?
- Can output be validated as JSON?

### App review safety

- Are requested scopes minimal?
- Does UI avoid unsupported claims?
- Is privacy exposure low?

---

## 16. MVP Acceptance Criteria

The first working MVP is acceptable when:

1. Merchant can install app on a dev/test store.
2. Merchant can run a read-only scan.
3. App creates a scan run record.
4. App reads at least products and public discovery surfaces.
5. App produces deterministic readiness scores.
6. App shows findings in embedded Shopify admin UI.
7. App generates at least 10 buyer-style test questions.
8. App marks each question as answered/partial/unanswered/risky.
9. App exports a simple report.
10. App requests no protected customer data.
11. App performs no product writes.
12. App has clear privacy/app-review-safe positioning.

---

## 17. Future Roadmap

### V1 — Read-only readiness report

- Store scan.
- Product scoring.
- Agent discovery health.
- Buyer question simulation.
- Findings dashboard.
- Export report.

### V2 — Fix recommendations

- FAQ suggestions.
- Product content suggestions.
- Policy clarity suggestions.
- Alt text suggestions.
- Copy/export workflows.

### V3 — Approved write actions

- Diff preview.
- Apply selected product edits.
- Apply alt text.
- Create app-owned metafields.
- Audit log.
- Rollback metadata.

### V4 — Multi-market readiness

- Country-specific shipping/return questions.
- Localization gap reports.
- Market-specific FAQ packs.
- Multi-language suggestions.

### V5 — Competitive/AI visibility intelligence

- Competitor comparison.
- Simulated category searches.
- Share-of-answer tracking.
- AI channel analytics integrations where official and available.

---

## 18. Risks and Mitigations

### Risk: Shopify agentic infrastructure changes quickly

Mitigation:
Build around general readiness and source-backed QA, not one fragile endpoint.

### Risk: Commodity LLMs.txt apps flood the category

Mitigation:
Position as truth/QA/fix workflow, not file generation.

### Risk: Overpromising AI rankings

Mitigation:
Use readiness and accuracy language only.

### Risk: AI suggestions damage merchant content

Mitigation:
No auto-apply in V1. Merchant approval and diff preview before writes.

### Risk: Large catalogs are expensive to scan

Mitigation:
Plan limits, batching, deterministic checks first, AI only for high-value issues.

### Risk: App review scope rejection

Mitigation:
Start read-only, minimal scopes, no protected customer data.

---

## 19. Success Metrics

### Early validation metrics

- Install-to-first-scan completion rate.
- Number of findings per store.
- Merchant “this is useful” feedback.
- Report export rate.
- Fix recommendation approval intent.
- Trial-to-paid conversion.
- Support burden per install.

### Product value metrics

- Average readiness score improvement.
- Number of missing FAQs found.
- Number of product attribute gaps fixed.
- Number of risky contradictions detected.
- Number of recurring scans completed.
- Number of merchant-approved fixes.

### Business metrics

- Free-to-paid conversion.
- Monthly recurring revenue.
- Churn.
- CAC if paid ads are used.
- Support time per account.
- App Store review quality.
- Organic install growth from Shopify search.

---

## 20. Bottom Line

StoreTruth AI is in a good place for Codex to begin, but Codex should begin with a conservative scaffold and feasibility spike.

The right first implementation is:

> A read-only Shopify app foundation that scans product and agent-facing store surfaces, produces a readiness report, and proves merchants would value a Store Truth Layer before any write actions, billing complexity, or ranking claims.

This is the safest path to build quickly without winging it.
