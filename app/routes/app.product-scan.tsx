import { useMemo, useState } from "react";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import { createReadOnlyProductReadinessReport } from "../storetruth/product-scan.server";
import type {
  FindingSeverity,
  MerchantReviewItem,
  MerchantReviewStatus,
} from "../storetruth/types";

const MERCHANT_REVIEW_STATUSES: MerchantReviewStatus[] = [
  "new",
  "reviewed",
  "needs_fix",
  "dismissed",
  "drafted",
  "approved_for_later",
];

type ReviewStatusFilter = "all" | MerchantReviewStatus;
type ReviewSourceFilter =
  | "all"
  | "product"
  | "public_discovery"
  | "policy_content"
  | "buyer_question";
type ReviewPriorityFilter = "all" | FindingSeverity;

const REVIEW_STATUS_FILTERS: ReviewStatusFilter[] = [
  "all",
  ...MERCHANT_REVIEW_STATUSES,
];

const REVIEW_SOURCE_FILTERS: Array<{
  label: string;
  value: ReviewSourceFilter;
}> = [
  { label: "All", value: "all" },
  { label: "Product", value: "product" },
  { label: "Public discovery", value: "public_discovery" },
  { label: "Policy / content", value: "policy_content" },
  { label: "Buyer question", value: "buyer_question" },
];

const REVIEW_PRIORITY_FILTERS: ReviewPriorityFilter[] = [
  "all",
  "info",
  "low",
  "medium",
  "high",
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
  const [statusFilter, setStatusFilter] =
    useState<ReviewStatusFilter>("all");
  const [sourceFilter, setSourceFilter] =
    useState<ReviewSourceFilter>("all");
  const [priorityFilter, setPriorityFilter] =
    useState<ReviewPriorityFilter>("all");
  const temporaryStatusChanges = report.merchantReview.items.filter((item) => {
    return reviewStatuses[item.id] !== item.status;
  }).length;
  const filteredReviewItems = useMemo(() => {
    return report.merchantReview.items.filter((item) =>
      reviewItemMatchesFilters({
        item,
        priorityFilter,
        sourceFilter,
        status: reviewStatuses[item.id] ?? item.status,
        statusFilter,
      }),
    );
  }, [
    priorityFilter,
    report.merchantReview.items,
    reviewStatuses,
    sourceFilter,
    statusFilter,
  ]);
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
  const clearReviewFilters = () => {
    setStatusFilter("all");
    setSourceFilter("all");
    setPriorityFilter("all");
  };
  const hasActiveReviewFilters =
    statusFilter !== "all" ||
    sourceFilter !== "all" ||
    priorityFilter !== "all";

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

          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="small">
              <s-heading>Review filters</s-heading>
              <s-paragraph>
                Filters are temporary for this page session and are not saved.
              </s-paragraph>
              <div
                style={{
                  display: "grid",
                  gap: 12,
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                }}
              >
                <ReviewFilterSelect
                  label="Status"
                  options={REVIEW_STATUS_FILTERS.map((option) => ({
                    label: formatReviewToken(option),
                    value: option,
                  }))}
                  value={statusFilter}
                  onChange={(value) =>
                    setStatusFilter(value as ReviewStatusFilter)
                  }
                />
                <ReviewFilterSelect
                  label="Source"
                  options={REVIEW_SOURCE_FILTERS}
                  value={sourceFilter}
                  onChange={(value) =>
                    setSourceFilter(value as ReviewSourceFilter)
                  }
                />
                <ReviewFilterSelect
                  label="Priority"
                  options={REVIEW_PRIORITY_FILTERS.map((option) => ({
                    label: formatReviewToken(option),
                    value: option,
                  }))}
                  value={priorityFilter}
                  onChange={(value) =>
                    setPriorityFilter(value as ReviewPriorityFilter)
                  }
                />
              </div>
              <s-paragraph>
                Showing {filteredReviewItems.length} of{" "}
                {report.merchantReview.items.length} review items.
              </s-paragraph>
              <button
                type="button"
                disabled={!hasActiveReviewFilters}
                onClick={clearReviewFilters}
                style={{
                  border: "1px solid #8a8a8a",
                  borderRadius: 6,
                  cursor: hasActiveReviewFilters ? "pointer" : "default",
                  font: "inherit",
                  maxWidth: 160,
                  padding: "8px 10px",
                }}
              >
                Clear filters
              </button>
            </s-stack>
          </s-box>

          {filteredReviewItems.length === 0 ? (
            <s-paragraph>No review items match the current filters.</s-paragraph>
          ) : null}

          {filteredReviewItems.map((item) => (
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
                  {item.status} · source {reviewSourceLabel(item)}
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

function ReviewFilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
      <select
        value={value}
        onChange={(event) => {
          onChange(event.currentTarget.value);
        }}
        style={{
          border: "1px solid #8a8a8a",
          borderRadius: 6,
          font: "inherit",
          padding: "8px 10px",
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
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

function reviewItemMatchesFilters({
  item,
  priorityFilter,
  sourceFilter,
  status,
  statusFilter,
}: {
  item: MerchantReviewItem;
  priorityFilter: ReviewPriorityFilter;
  sourceFilter: ReviewSourceFilter;
  status: MerchantReviewStatus;
  statusFilter: ReviewStatusFilter;
}) {
  if (statusFilter !== "all" && status !== statusFilter) {
    return false;
  }

  if (sourceFilter !== "all" && !reviewItemMatchesSource(item, sourceFilter)) {
    return false;
  }

  if (priorityFilter !== "all" && item.priority !== priorityFilter) {
    return false;
  }

  return true;
}

function reviewItemMatchesSource(
  item: MerchantReviewItem,
  sourceFilter: Exclude<ReviewSourceFilter, "all">,
) {
  if (
    sourceFilter === "buyer_question" &&
    (item.kind === "buyer_question" || item.linkedQuestionIds.length > 0)
  ) {
    return true;
  }

  return item.sourceReferences.some((reference) => {
    if (sourceFilter === "product") {
      return (
        reference.type === "product" ||
        Boolean(reference.productGid) ||
        reference.findingCategory === "product_readiness"
      );
    }

    if (sourceFilter === "public_discovery") {
      return (
        reference.type === "discovery_url" ||
        Boolean(reference.discoveryPath) ||
        reference.findingCategory === "agent_discovery"
      );
    }

    if (sourceFilter === "policy_content") {
      return (
        reference.type === "policy_page" ||
        Boolean(reference.pageGid) ||
        reference.findingCategory === "policy_faq"
      );
    }

    return (
      reference.type === "question" ||
      Boolean(reference.questionId) ||
      Boolean(reference.questionCategory)
    );
  });
}

function reviewSourceLabel(item: MerchantReviewItem) {
  if (reviewItemMatchesSource(item, "buyer_question")) {
    return "buyer question";
  }

  if (reviewItemMatchesSource(item, "product")) {
    return "product";
  }

  if (reviewItemMatchesSource(item, "public_discovery")) {
    return "public discovery";
  }

  if (reviewItemMatchesSource(item, "policy_content")) {
    return "policy / content";
  }

  return "general";
}

function formatReviewToken(value: string) {
  return value === "all"
    ? "All"
    : value.replace(/_/g, " ").replace(/^\w/, (letter) => letter.toUpperCase());
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
