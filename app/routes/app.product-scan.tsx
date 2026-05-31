import { useMemo, useState } from "react";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import { createReadOnlyProductReadinessReport } from "../storetruth/product-scan.server";
import type { MerchantReviewStatus } from "../storetruth/types";

const MERCHANT_REVIEW_STATUSES: MerchantReviewStatus[] = [
  "new",
  "reviewed",
  "needs_fix",
  "dismissed",
  "drafted",
  "approved_for_later",
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  assertDeveloperOnlyRoute();
  const { admin, session } = await authenticate.admin(request);
  const report = await createReadOnlyProductReadinessReport({
    adminGraphql: admin.graphql,
    shopDomain: session.shop,
  });

  return {
    report,
    jsonReportPath: "/app/product-scan/report",
  };
};

export default function ProductScanPage() {
  const { report, jsonReportPath } = useLoaderData<typeof loader>();
  const initialReviewStatuses = useMemo(() => {
    return Object.fromEntries(
      report.merchantReview.items.map((item) => [item.id, item.status]),
    ) as Record<string, MerchantReviewStatus>;
  }, [report.merchantReview.items]);
  const [reviewStatuses, setReviewStatuses] =
    useState<Record<string, MerchantReviewStatus>>(initialReviewStatuses);
  const temporaryStatusChanges = report.merchantReview.items.filter((item) => {
    return reviewStatuses[item.id] !== item.status;
  }).length;
  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(
      MERCHANT_REVIEW_STATUSES.map((status) => [status, 0]),
    ) as Record<MerchantReviewStatus, number>;

    for (const item of report.merchantReview.items) {
      counts[reviewStatuses[item.id] ?? item.status] += 1;
    }

    return counts;
  }, [report.merchantReview.items, reviewStatuses]);

  const updateReviewStatus = (
    itemId: string,
    status: MerchantReviewStatus,
  ) => {
    setReviewStatuses((current) => ({
      ...current,
      [itemId]: status,
    }));
  };

  return (
    <s-page heading="Read-only Product Scan">
      <s-section heading="Feasibility Report">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Developer-only scan for {report.shopDomain}. The query is bounded to{" "}
            {report.source.productLimit} products, uses read-only Admin API access,
            and does not write product data.
          </s-paragraph>

          <s-grid gridTemplateColumns="repeat(auto-fit, minmax(160px, 1fr))" gap="base">
            <ScoreBox label="Products scanned" value={report.scan.productCount} />
            <ScoreBox label="Product score" value={report.scan.scores.products} />
            <ScoreBox
              label="Discovery score"
              value={report.scan.scores.agentDiscovery}
            />
            <ScoreBox
              label="Policy / FAQ score"
              value={report.scan.scores.policyFaq}
            />
            <ScoreBox
              label="Question score"
              value={report.scan.scores.aiQuestionCoverage}
            />
            <ScoreBox label="Overall score" value={report.scan.scores.overall} />
            <ScoreBox label="Findings" value={report.scan.findings.length} />
            <ScoreBox
              label="Review drafts"
              value={report.merchantReview.summary.draftSuggestionCount}
            />
          </s-grid>

          <s-link href={jsonReportPath}>Open JSON report</s-link>
        </s-stack>
      </s-section>

      <s-section heading="Public Discovery">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Checks are limited to GET requests for five HTTPS URLs on{" "}
            {report.shopDomain}. Redirects are not followed.
          </s-paragraph>

          {report.publicDiscovery.results.map((result) => (
            <s-box
              key={result.path}
              padding="base"
              borderWidth="base"
              borderRadius="base"
            >
              <s-stack direction="block" gap="small">
                <s-heading>{result.path}</s-heading>
                <s-paragraph>
                  {result.status} · HTTP {result.statusCode ?? "n/a"} ·{" "}
                  {result.contentType ?? "unknown content type"} ·{" "}
                  {result.responseSizeBytes} bytes
                </s-paragraph>
                {result.warnings.length > 0 ? (
                  <s-paragraph>{result.warnings.join(" ")}</s-paragraph>
                ) : null}
              </s-stack>
            </s-box>
          ))}
        </s-stack>
      </s-section>

      <s-section heading="Policy / FAQ Content">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Checks are based on a bounded read-only Admin API page sample. Page
            bodies are summarized and hashed rather than stored as full raw
            content.
          </s-paragraph>

          <s-grid gridTemplateColumns="repeat(auto-fit, minmax(180px, 1fr))" gap="base">
            <ScoreBox
              label="Pages scanned"
              value={report.policyContent.pages.length}
            />
            <ScoreBox
              label="Policy signals"
              value={
                report.policyContent.coverage.policies.filter(
                  (signal) => signal.present,
                ).length
              }
            />
            <ScoreBox
              label="Support signals"
              value={
                report.policyContent.coverage.pageCandidates.filter(
                  (signal) => signal.present,
                ).length
              }
            />
            <ScoreBox
              label="Thin pages"
              value={report.policyContent.coverage.thinContentPageGids.length}
            />
          </s-grid>

          {report.policyContent.coverage.policies.map((signal) => (
            <s-box
              key={signal.key}
              padding="base"
              borderWidth="base"
              borderRadius="base"
            >
              <s-stack direction="block" gap="small">
                <s-heading>{signal.label}</s-heading>
                <s-paragraph>
                  {signal.present ? "present" : "missing"} ·{" "}
                  {signal.matchedPageGids.length} matching page candidate(s)
                </s-paragraph>
              </s-stack>
            </s-box>
          ))}
        </s-stack>
      </s-section>

      <s-section heading="Buyer Question Simulation">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Questions are generated by deterministic local templates from the
            bounded product, discovery, and policy/content scan results. No AI
            provider is called.
          </s-paragraph>

          <s-grid gridTemplateColumns="repeat(auto-fit, minmax(180px, 1fr))" gap="base">
            <ScoreBox
              label="Questions"
              value={report.questionSimulation.summary.totalQuestions}
            />
            <ScoreBox
              label="Answered"
              value={report.questionSimulation.summary.byStatus.answered}
            />
            <ScoreBox
              label="Partial"
              value={
                report.questionSimulation.summary.byStatus.partially_answered
              }
            />
            <ScoreBox
              label="Unanswered"
              value={report.questionSimulation.summary.byStatus.unanswered}
            />
          </s-grid>

          {report.questionSimulation.questions.map((question) => (
            <s-box
              key={question.id}
              padding="base"
              borderWidth="base"
              borderRadius="base"
            >
              <s-stack direction="block" gap="small">
                <s-heading>{question.question}</s-heading>
                <s-paragraph>
                  {question.category} · {question.resultStatus}
                </s-paragraph>
                <s-paragraph>{question.sourceSummary}</s-paragraph>
                {question.riskFlags.length > 0 ? (
                  <s-paragraph>Flags: {question.riskFlags.join(", ")}</s-paragraph>
                ) : null}
              </s-stack>
            </s-box>
          ))}
        </s-stack>
      </s-section>

      <s-section heading="Merchant Review">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Review states and suggestions are generated locally for triage only.
            This slice does not persist review state or write back to Shopify.
          </s-paragraph>

          <s-grid gridTemplateColumns="repeat(auto-fit, minmax(180px, 1fr))" gap="base">
            <ScoreBox
              label="Review items"
              value={report.merchantReview.summary.totalItems}
            />
            <ScoreBox label="Needs fix" value={statusCounts.needs_fix} />
            <ScoreBox label="Drafted" value={statusCounts.drafted} />
            <ScoreBox label="Session changes" value={temporaryStatusChanges} />
          </s-grid>

          <s-paragraph>
            Status changes below are temporary for this page session. They are not
            saved, persisted, or written back to Shopify.
          </s-paragraph>

          {report.merchantReview.items.map((item) => (
            <s-box
              key={item.id}
              padding="base"
              borderWidth="base"
              borderRadius="base"
            >
              <s-stack direction="block" gap="small">
                <s-heading>{item.title}</s-heading>
                <s-paragraph>
                  {item.kind} · priority {item.priority} · default status{" "}
                  {item.status}
                </s-paragraph>
                <ReviewStatusSelect
                  itemId={item.id}
                  status={reviewStatuses[item.id] ?? item.status}
                  onChange={updateReviewStatus}
                />
                <s-paragraph>{item.summary}</s-paragraph>
                <s-paragraph>
                  Sources: {item.sourceReferences.length}. Linked findings:{" "}
                  {item.linkedFindingIds.length}. Linked questions:{" "}
                  {item.linkedQuestionIds.length}.
                </s-paragraph>
              </s-stack>
            </s-box>
          ))}
        </s-stack>
      </s-section>

      <s-section heading="Scanned Products">
        <s-stack direction="block" gap="base">
          {report.scannedProducts.map((product) => (
            <s-box
              key={product.productGid}
              padding="base"
              borderWidth="base"
              borderRadius="base"
            >
              <s-stack direction="block" gap="small">
                <s-heading>{product.title}</s-heading>
                <s-paragraph>
                  {product.handle} · {product.status} · {product.vendor || "No vendor"}
                </s-paragraph>
                <s-paragraph>
                  Description text: {product.description.textLength} chars. Images
                  with alt text: {product.images.withAltTextCount}/
                  {product.images.returnedCount}. SEO title:{" "}
                  {product.seo.titlePresent ? "present" : "missing"}. SEO
                  description:{" "}
                  {product.seo.descriptionPresent ? "present" : "missing"}.
                </s-paragraph>
              </s-stack>
            </s-box>
          ))}
        </s-stack>
      </s-section>

      <s-section heading="JSON Preview">
        <pre
          style={{
            background: "#f6f6f7",
            border: "1px solid #dcdfe4",
            borderRadius: 8,
            fontSize: 12,
            maxHeight: 520,
            overflow: "auto",
            padding: 16,
            whiteSpace: "pre-wrap",
          }}
        >
          {JSON.stringify(report, null, 2)}
        </pre>
      </s-section>
    </s-page>
  );
}

function ReviewStatusSelect({
  itemId,
  onChange,
  status,
}: {
  itemId: string;
  onChange: (itemId: string, status: MerchantReviewStatus) => void;
  status: MerchantReviewStatus;
}) {
  return (
    <label style={{ display: "grid", gap: 6, maxWidth: 280 }}>
      <span style={{ fontSize: 12, fontWeight: 600 }}>Session status</span>
      <select
        value={status}
        onChange={(event) => {
          onChange(itemId, event.currentTarget.value as MerchantReviewStatus);
        }}
        style={{
          border: "1px solid #8a8a8a",
          borderRadius: 6,
          font: "inherit",
          padding: "8px 10px",
        }}
      >
        {MERCHANT_REVIEW_STATUSES.map((option) => (
          <option key={option} value={option}>
            {option.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </label>
  );
}

function ScoreBox({ label, value }: { label: string; value: number }) {
  return (
    <s-box padding="base" borderWidth="base" borderRadius="base">
      <s-stack direction="block" gap="small">
        <s-heading>{label}</s-heading>
        <s-paragraph>{value}</s-paragraph>
      </s-stack>
    </s-box>
  );
}

function assertDeveloperOnlyRoute() {
  // eslint-disable-next-line no-undef
  if (process.env.NODE_ENV === "production") {
    throw new Response("Not found", { status: 404 });
  }
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
