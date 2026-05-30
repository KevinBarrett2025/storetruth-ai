import { createHash } from "node:crypto";
import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";

import type {
  ContentCoverageSignal,
  DuplicateContentGroup,
  PageCandidateKey,
  PolicyContentPageSnapshot,
  PolicyContentReport,
  PolicyCoverageKey,
  ScanFinding,
} from "./types";

export const POLICY_CONTENT_PAGE_LIMIT = 25;

export const POLICY_CONTENT_SCAN_FIELDS = [
  "pages.nodes.id",
  "pages.nodes.title",
  "pages.nodes.handle",
  "pages.nodes.body",
  "pages.nodes.createdAt",
  "pages.nodes.updatedAt",
  "pages.nodes.publishedAt",
  "pages.pageInfo.hasNextPage",
] as const;

export const POLICY_CONTENT_SCAN_QUERY = `#graphql
  query StoreTruthPolicyContentScan($pagesFirst: Int!) {
    pages(first: $pagesFirst, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        id
        title
        handle
        body
        createdAt
        updatedAt
        publishedAt
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;

interface PageNode {
  id: string;
  title: string;
  handle: string;
  body: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  publishedAt?: string | null;
}

interface PolicyContentQueryData {
  pages: {
    nodes: PageNode[];
    pageInfo: {
      hasNextPage: boolean;
    };
  };
}

interface AdminGraphqlJson<TData> {
  data?: TData;
  errors?: Array<{
    message: string;
  }>;
}

const policyMatchers: Record<
  PolicyCoverageKey,
  { label: string; pattern: RegExp }
> = {
  shipping: {
    label: "Shipping policy",
    pattern: /\b(shipping|delivery|fulfillment)\b/i,
  },
  returns: {
    label: "Refund / return policy",
    pattern: /\b(refund|return|returns|exchange|exchanges)\b/i,
  },
  privacy: {
    label: "Privacy policy",
    pattern: /\b(privacy|data sharing|data-sharing|personal information)\b/i,
  },
  terms: {
    label: "Terms of service",
    pattern: /\b(terms|conditions|terms of service)\b/i,
  },
};

const pageCandidateMatchers: Record<
  PageCandidateKey,
  { label: string; pattern: RegExp }
> = {
  contact: {
    label: "Contact page",
    pattern: /\b(contact|get in touch|get-in-touch)\b/i,
  },
  about: {
    label: "About page",
    pattern: /\b(about|our story|story|mission)\b/i,
  },
  help: {
    label: "Help page",
    pattern: /\b(help|support|customer service|customer-service)\b/i,
  },
  faq: {
    label: "FAQ page",
    pattern: /\b(faq|frequently asked|questions)\b/i,
  },
};

export async function createPolicyContentReport({
  adminGraphql,
  shopDomain,
  pageLimit = POLICY_CONTENT_PAGE_LIMIT,
}: {
  adminGraphql: AdminGraphqlClient;
  shopDomain: string;
  pageLimit?: number;
}): Promise<PolicyContentReport> {
  const boundedLimit = Math.min(
    Math.max(pageLimit, 1),
    POLICY_CONTENT_PAGE_LIMIT,
  );
  const response = await adminGraphql(POLICY_CONTENT_SCAN_QUERY, {
    variables: { pagesFirst: boundedLimit },
  });
  const result = (await response.json()) as AdminGraphqlJson<PolicyContentQueryData>;

  if (result.errors?.length) {
    throw new Error(
      `Shopify Admin GraphQL content scan failed: ${result.errors
        .map((error) => error.message)
        .join("; ")}`,
    );
  }

  if (!result.data) {
    throw new Error("Shopify Admin GraphQL content scan returned no data.");
  }

  const checkedAt = new Date().toISOString();
  const pages = result.data.pages.nodes.map(mapPageSnapshot);
  const coverage = createContentCoverage({
    hasNextPage: result.data.pages.pageInfo.hasNextPage,
    pages,
  });
  const findings = createPolicyContentFindings(pages, coverage, boundedLimit);

  return {
    id: `policy-content-scan-${checkedAt.replace(/[:.]/g, "-")}`,
    checkedAt,
    shopDomain,
    source: {
      api: "Shopify Admin GraphQL",
      queryName: "StoreTruthPolicyContentScan",
      pageLimit: boundedLimit,
      readOnly: true,
      fieldsQueried: [...POLICY_CONTENT_SCAN_FIELDS],
      notes: [
        "Bounded to the first 25 Online Store pages or fewer.",
        "Specific shop policy fields were not available on the Admin API Shop type in the validated schema.",
        "Page bodies are summarized locally and represented by text length, HTML length, and SHA-256 hash.",
      ],
    },
    pages,
    coverage,
    findings,
  };
}

function mapPageSnapshot(page: PageNode): PolicyContentPageSnapshot {
  const body = page.body ?? "";
  const bodyText = htmlToText(body);

  return {
    pageGid: page.id,
    title: page.title,
    handle: page.handle,
    bodyTextLength: bodyText.length,
    bodyHtmlLength: body.length,
    bodySha256: hashText(body),
    textSummary: summarizeText(bodyText, 240),
    ...(page.createdAt ? { createdAt: page.createdAt } : {}),
    ...(page.updatedAt ? { updatedAt: page.updatedAt } : {}),
    ...(page.publishedAt ? { publishedAt: page.publishedAt } : {}),
  };
}

function createContentCoverage({
  hasNextPage,
  pages,
}: {
  hasNextPage: boolean;
  pages: PolicyContentPageSnapshot[];
}) {
  const policies = createCoverageSignals(policyMatchers, pages);
  const pageCandidates = createCoverageSignals(pageCandidateMatchers, pages);
  const thinContentPageGids = pages
    .filter((page) => page.bodyTextLength < 120)
    .map((page) => page.pageGid);
  const duplicateContentGroups = createDuplicateContentGroups(pages);
  const policyScore =
    (policies.filter((signal) => signal.present).length / policies.length) * 50;
  const pageScore =
    (pageCandidates.filter((signal) => signal.present).length /
      pageCandidates.length) *
    30;
  const qualityScore =
    pages.length === 0
      ? 0
      : ((pages.length - thinContentPageGids.length) / pages.length) * 20;

  return {
    policies,
    pageCandidates,
    thinContentPageGids,
    duplicateContentGroups,
    hasNextPage,
    score: Math.round(policyScore + pageScore + qualityScore),
  };
}

function createCoverageSignals<TKey extends string>(
  matchers: Record<TKey, { label: string; pattern: RegExp }>,
  pages: PolicyContentPageSnapshot[],
): Array<ContentCoverageSignal<TKey>> {
  return Object.entries(matchers).map(([key, matcher]) => {
    const typedMatcher = matcher as { label: string; pattern: RegExp };
    const matchedPageGids = pages
      .filter((page) => {
        const searchableText = `${page.title} ${page.handle}`.toLowerCase();

        return typedMatcher.pattern.test(searchableText);
      })
      .map((page) => page.pageGid);

    return {
      key: key as TKey,
      label: typedMatcher.label,
      present: matchedPageGids.length > 0,
      matchedPageGids,
    };
  });
}

function createDuplicateContentGroups(
  pages: PolicyContentPageSnapshot[],
): DuplicateContentGroup[] {
  const groups = new Map<string, string[]>();

  for (const page of pages) {
    if (page.bodyTextLength < 20) {
      continue;
    }

    groups.set(page.bodySha256, [
      ...(groups.get(page.bodySha256) ?? []),
      page.pageGid,
    ]);
  }

  return [...groups.entries()]
    .filter(([, pageGids]) => pageGids.length > 1)
    .map(([bodySha256, pageGids]) => ({
      bodySha256,
      pageGids,
    }));
}

function createPolicyContentFindings(
  pages: PolicyContentPageSnapshot[],
  coverage: ReturnType<typeof createContentCoverage>,
  pageLimit: number,
): ScanFinding[] {
  const findings: ScanFinding[] = [];

  if (pages.length === 0) {
    findings.push({
      id: "finding-no-content-pages-returned",
      severity: "high",
      category: "policy_faq",
      resourceType: "store",
      title: "No Online Store pages returned from bounded content scan",
      description:
        "The content scan connected to Shopify, but no pages were returned for policy or FAQ coverage checks.",
      evidence: {
        returnedPages: 0,
        pageLimit,
      },
      recommendation:
        "Add merchant-approved policy, contact, help, or FAQ pages before relying on policy/FAQ readiness scoring.",
      status: "open",
    });
  }

  for (const signal of coverage.policies.filter((candidate) => !candidate.present)) {
    findings.push({
      id: `finding-missing-${signal.key}-policy`,
      severity: "medium",
      category: "policy_faq",
      resourceType: "policy",
      title: `${signal.label} candidate is missing`,
      description:
        "The bounded page scan did not find a page title or handle matching this policy coverage signal.",
      evidence: {
        coverageKey: signal.key,
        pageLimit,
      },
      recommendation:
        "Create or identify the merchant-approved source page for this policy topic before drafting any suggested fix.",
      status: "open",
    });
  }

  for (const signal of coverage.pageCandidates.filter(
    (candidate) => !candidate.present,
  )) {
    findings.push({
      id: `finding-missing-${signal.key}-page`,
      severity: "low",
      category: "policy_faq",
      resourceType: "faq",
      title: `${signal.label} candidate is missing`,
      description:
        "The bounded page scan did not find a page title or handle matching this support-content signal.",
      evidence: {
        coverageKey: signal.key,
        pageLimit,
      },
      recommendation:
        "Consider adding a merchant-approved source page if this support topic is relevant to the store.",
      status: "open",
    });
  }

  for (const pageGid of coverage.thinContentPageGids) {
    const page = pages.find((candidate) => candidate.pageGid === pageGid);

    findings.push({
      id: `finding-thin-content-${page?.handle ?? pageGid.split("/").at(-1)}`,
      severity: "medium",
      category: "policy_faq",
      resourceType: "faq",
      resourceGid: pageGid,
      title: "Content page may be too thin for source-backed answers",
      description:
        "The page has little or no body text for deterministic policy/FAQ readiness checks.",
      evidence: {
        pageGid,
        handle: page?.handle ?? "",
        title: page?.title ?? "",
        bodyTextLength: page?.bodyTextLength ?? 0,
      },
      recommendation:
        "Add merchant-approved source text if this page is expected to answer buyer or agent questions.",
      status: "open",
    });
  }

  for (const duplicateGroup of coverage.duplicateContentGroups) {
    findings.push({
      id: `finding-duplicate-content-${duplicateGroup.bodySha256.slice(0, 12)}`,
      severity: "low",
      category: "policy_faq",
      resourceType: "faq",
      title: "Duplicate page body content detected",
      description:
        "Two or more scanned pages have the same body hash. This may be intentional, but it can reduce source clarity.",
      evidence: {
        bodySha256: duplicateGroup.bodySha256,
        pageGids: duplicateGroup.pageGids,
      },
      recommendation:
        "Review duplicate source pages and keep canonical merchant-approved policy or FAQ content clear.",
      status: "open",
    });
  }

  if (coverage.hasNextPage) {
    findings.push({
      id: "finding-content-scan-bounded",
      severity: "info",
      category: "policy_faq",
      resourceType: "store",
      title: "Content scan is intentionally bounded",
      description: `This feasibility slice queried at most ${pageLimit} pages and did not scan the full content library.`,
      evidence: {
        pageLimit,
        returnedPages: pages.length,
        hasNextPage: coverage.hasNextPage,
      },
      recommendation:
        "Keep the bounded query while validating fields, scopes, and merchant review workflow.",
      status: "open",
    });
  }

  return findings;
}

function htmlToText(value: string): string {
  return normalizeWhitespace(
    value
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">"),
  );
}

function summarizeText(value: string, maxLength: number): string {
  const normalized = normalizeWhitespace(value);

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trim()}...`;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function hashText(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
