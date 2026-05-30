import { useEffect } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import { createDryRunScan, feasibilityTodos } from "../storetruth/dry-run.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  return {
    scan: createDryRunScan(session.shop),
    feasibilityTodos,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  return {
    scan: createDryRunScan(session.shop),
  };
};

export default function Index() {
  const { scan, feasibilityTodos: todos } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const activeScan = fetcher.data?.scan ?? scan;
  const isLoading =
    ["loading", "submitting"].includes(fetcher.state) &&
    fetcher.formMethod === "POST";

  useEffect(() => {
    if (fetcher.data?.scan.id) {
      shopify.toast.show("Dry-run scan complete");
    }
  }, [fetcher.data?.scan.id, shopify]);

  const runDryScan = () => fetcher.submit({}, { method: "POST" });

  return (
    <s-page heading="StoreTruth AI">
      <s-button
        slot="primary-action"
        onClick={runDryScan}
        {...(isLoading ? { loading: true } : {})}
      >
        Run dry scan
      </s-button>

      <s-section heading="AI Agent Readiness">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Local mock scan for {activeScan.shopDomain}. This slice does not
            write products, call an AI provider, enable billing, or fetch
            protected customer data.
          </s-paragraph>

          <s-grid gridTemplateColumns="repeat(auto-fit, minmax(160px, 1fr))" gap="base">
            <ScoreBox label="Overall" value={activeScan.scores.overall} />
            <ScoreBox label="Products" value={activeScan.scores.products} />
            <ScoreBox label="Policy / FAQ" value={activeScan.scores.policyFaq} />
            <ScoreBox
              label="AI Questions"
              value={activeScan.scores.aiQuestionCoverage}
            />
            <ScoreBox
              label="Agent Discovery"
              value={activeScan.scores.agentDiscovery}
            />
          </s-grid>
        </s-stack>
      </s-section>

      <s-section heading="Priority Findings">
        <s-stack direction="block" gap="base">
          {activeScan.findings.map((finding) => (
            <s-box
              key={finding.id}
              padding="base"
              borderWidth="base"
              borderRadius="base"
            >
              <s-stack direction="block" gap="small">
                <s-heading>{finding.title}</s-heading>
                <s-paragraph>{finding.description}</s-paragraph>
                <s-paragraph>
                  Severity: {finding.severity}. Recommendation:{" "}
                  {finding.recommendation}
                </s-paragraph>
              </s-stack>
            </s-box>
          ))}
        </s-stack>
      </s-section>

      <s-section heading="AI Question Simulation">
        <s-stack direction="block" gap="base">
          {activeScan.questionSimulations.map((test) => (
            <s-box
              key={test.id}
              padding="base"
              borderWidth="base"
              borderRadius="base"
            >
              <s-stack direction="block" gap="small">
                <s-heading>{test.question}</s-heading>
                <s-paragraph>Status: {test.resultStatus}</s-paragraph>
                <s-paragraph>{test.sourceSummary}</s-paragraph>
              </s-stack>
            </s-box>
          ))}
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="Discovery Checks">
        <s-stack direction="block" gap="small">
          {activeScan.agentDiscoveryChecks.map((check) => (
            <s-paragraph key={check.path}>
              {check.path}: {check.status}
            </s-paragraph>
          ))}
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="Feasibility TODOs">
        <s-unordered-list>
          {todos.map((todo) => (
            <s-list-item key={todo}>{todo}</s-list-item>
          ))}
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

function ScoreBox({ label, value }: { label: string; value: number }) {
  return (
    <s-box padding="base" borderWidth="base" borderRadius="base">
      <s-stack direction="block" gap="small">
        <s-heading>{label}</s-heading>
        <s-paragraph>{value}/100</s-paragraph>
      </s-stack>
    </s-box>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
