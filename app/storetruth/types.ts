export type ScanRunStatus = "queued" | "running" | "completed" | "failed";

export type FindingSeverity = "info" | "low" | "medium" | "high";

export type FindingCategory =
  | "product_readiness"
  | "agent_discovery"
  | "ai_question_coverage"
  | "policy_faq"
  | "content_suggestion";

export type ResourceType =
  | "store"
  | "product"
  | "policy"
  | "faq"
  | "discovery_url";

export type SuggestionStatus =
  | "draft"
  | "merchant_review_required"
  | "approved"
  | "ignored";

export type QuestionResultStatus =
  | "answered"
  | "partially_answered"
  | "unanswered"
  | "contradicted"
  | "risky"
  | "missing_source";

export interface ProductReadinessScore {
  productGid: string;
  handle: string;
  title: string;
  score: number;
  signals: {
    titleClarity: number;
    descriptionCompleteness: number;
    variantClarity: number;
    imageCoverage: number;
    seoCoverage: number;
    structuredAttributes: number;
  };
}

export interface AgentDiscoveryCheck {
  path: "/agents.md" | "/llms.txt" | "/llms-full.txt" | "/robots.txt" | "sitemap";
  status: "not_checked" | "reachable" | "missing" | "blocked" | "error";
  statusCode?: number;
  summary: string;
}

export interface AIQuestionSimulation {
  id: string;
  question: string;
  category:
    | "product_recommendation"
    | "product_comparison"
    | "shipping"
    | "returns"
    | "warranty"
    | "sizing"
    | "compatibility"
    | "materials";
  resultStatus: QuestionResultStatus;
  sourceSummary: string;
  riskFlags: string[];
}

export interface ContentSuggestion {
  id: string;
  findingId: string;
  resourceType: ResourceType;
  suggestionType:
    | "product_attribute"
    | "faq_answer"
    | "policy_clarity"
    | "alt_text"
    | "discovery_file";
  status: SuggestionStatus;
  summary: string;
  beforeText?: string;
  afterText?: string;
}

export interface ScanFinding {
  id: string;
  severity: FindingSeverity;
  category: FindingCategory;
  resourceType: ResourceType;
  resourceGid?: string;
  title: string;
  description: string;
  evidence: Record<string, string | number | boolean | string[]>;
  recommendation: string;
  status: "open" | "reviewed" | "ignored";
}

export interface ReadinessScores {
  overall: number;
  products: number;
  policyFaq: number;
  aiQuestionCoverage: number;
  agentDiscovery: number;
  riskPenalty: number;
}

export interface ScanRun {
  id: string;
  shopDomain: string;
  status: ScanRunStatus;
  startedAt: string;
  finishedAt?: string;
  productCount: number;
  scores: ReadinessScores;
  findings: ScanFinding[];
  productScores: ProductReadinessScore[];
  agentDiscoveryChecks: AgentDiscoveryCheck[];
  questionSimulations: AIQuestionSimulation[];
  contentSuggestions: ContentSuggestion[];
}
