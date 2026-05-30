import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import { createReadOnlyProductReadinessReport } from "../storetruth/product-scan.server";

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
            <ScoreBox label="Overall score" value={report.scan.scores.overall} />
            <ScoreBox label="Findings" value={report.scan.findings.length} />
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
