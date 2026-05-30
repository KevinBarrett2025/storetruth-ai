import {
  calculateOverallReadinessScore,
  calculateProductReadinessScore,
} from "./readiness.server";
import { feasibilityTodos } from "./feasibility";
import type {
  AgentDiscoveryCheck,
  AIQuestionSimulation,
  ContentSuggestion,
  ProductReadinessScore,
  ScanFinding,
  ScanRun,
} from "./types";

const mockProductScores: ProductReadinessScore[] = [
  {
    productGid: "gid://shopify/Product/dry-run-1",
    handle: "mock-canvas-weekender",
    title: "Canvas Weekender Bag",
    signals: {
      titleClarity: 0.92,
      descriptionCompleteness: 0.54,
      variantClarity: 0.7,
      imageCoverage: 0.82,
      seoCoverage: 0.4,
      structuredAttributes: 0.35,
    },
    score: 0,
  },
  {
    productGid: "gid://shopify/Product/dry-run-2",
    handle: "mock-walnut-desk-lamp",
    title: "Walnut Desk Lamp",
    signals: {
      titleClarity: 0.88,
      descriptionCompleteness: 0.48,
      variantClarity: 0.6,
      imageCoverage: 0.75,
      seoCoverage: 0.3,
      structuredAttributes: 0.25,
    },
    score: 0,
  },
];

const agentDiscoveryChecks: AgentDiscoveryCheck[] = [
  {
    path: "/agents.md",
    status: "not_checked",
    summary: "TODO: Fetch the public storefront URL during the feasibility spike.",
  },
  {
    path: "/llms.txt",
    status: "not_checked",
    summary: "TODO: Check whether an agent-facing summary file exists.",
  },
  {
    path: "/llms-full.txt",
    status: "not_checked",
    summary: "TODO: Check whether a complete agent-facing file exists.",
  },
  {
    path: "/robots.txt",
    status: "not_checked",
    summary: "TODO: Check crawl rules without making ranking or traffic claims.",
  },
  {
    path: "/sitemap.xml",
    status: "not_checked",
    summary: "TODO: Discover and fetch sitemap URLs where public and reachable.",
  },
];

const questionSimulations: AIQuestionSimulation[] = [
  {
    id: "question-size-fit",
    question: "Which bag is best for a weekend trip and what can it fit?",
    category: "product_recommendation",
    resultStatus: "partially_answered",
    sourceSummary:
      "Mock data has product title and generic description, but missing capacity and dimensions.",
    riskFlags: ["missing_dimensions", "missing_capacity"],
  },
  {
    id: "question-returns",
    question: "Can I return the lamp if it does not match my office?",
    category: "returns",
    resultStatus: "missing_source",
    sourceSummary:
      "Policy content is not queried in the dry run. Feasibility spike should verify read_content coverage.",
    riskFlags: ["policy_not_checked"],
  },
];

const findings: ScanFinding[] = [
  {
    id: "finding-missing-attributes",
    severity: "medium",
    category: "product_readiness",
    resourceType: "product",
    resourceGid: "gid://shopify/Product/dry-run-1",
    title: "Key recommendation attributes are missing",
    description:
      "AI shopping agents may need materials, dimensions, fit, compatibility, or use-case details to answer buyer questions accurately.",
    evidence: {
      missingFields: ["dimensions", "capacity", "materials"],
      source: "local dry-run mock",
    },
    recommendation:
      "Add merchant-approved product attributes before enabling any write workflow.",
    status: "open",
  },
  {
    id: "finding-discovery-not-checked",
    severity: "info",
    category: "agent_discovery",
    resourceType: "store",
    title: "Agent discovery files are queued for feasibility testing",
    description:
      "The dry-run slice records the discovery paths but does not fetch public storefront files yet.",
    evidence: {
      paths: [
        "/agents.md",
        "/llms.txt",
        "/llms-full.txt",
        "/robots.txt",
        "/sitemap.xml",
      ],
      source: "local dry-run mock",
    },
    recommendation:
      "Fetch only public, official, reachable discovery surfaces in the next spike.",
    status: "open",
  },
];

const contentSuggestions: ContentSuggestion[] = [
  {
    id: "suggestion-product-attributes",
    findingId: "finding-missing-attributes",
    resourceType: "product",
    suggestionType: "product_attribute",
    status: "merchant_review_required",
    summary:
      "Draft a merchant-approved checklist for materials, dimensions, capacity, and care instructions.",
  },
  {
    id: "suggestion-faq-returns",
    findingId: "finding-discovery-not-checked",
    resourceType: "faq",
    suggestionType: "faq_answer",
    status: "draft",
    summary:
      "Draft a source-backed return-policy FAQ only after read_content feasibility is confirmed.",
  },
];

export function createDryRunScan(shopDomain: string): ScanRun {
  const productScores = mockProductScores.map((product) => ({
    ...product,
    score: calculateProductReadinessScore(product.signals),
  }));

  const products = Math.round(
    productScores.reduce((total, product) => total + product.score, 0) /
      productScores.length,
  );

  const baseScores = {
    products,
    policyFaq: 45,
    aiQuestionCoverage: 50,
    agentDiscovery: 20,
    riskPenalty: 12,
  };

  return {
    id: "dry-run-storetruth-scan-001",
    shopDomain,
    status: "completed",
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    productCount: productScores.length,
    scores: {
      ...baseScores,
      overall: calculateOverallReadinessScore(baseScores),
    },
    findings,
    productScores,
    agentDiscoveryChecks,
    questionSimulations,
    contentSuggestions,
  };
}

export { feasibilityTodos };
