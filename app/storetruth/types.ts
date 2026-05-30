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
  path:
    | "/agents.md"
    | "/llms.txt"
    | "/llms-full.txt"
    | "/robots.txt"
    | "/sitemap.xml";
  status:
    | "not_checked"
    | "reachable"
    | "missing"
    | "empty"
    | "blocked"
    | "timeout"
    | "oversized"
    | "unsupported_content_type"
    | "error";
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

export interface ProductDescriptionSummary {
  textLength: number;
  textSummary: string;
  htmlLength: number;
  htmlSha256: string;
}

export interface ProductOptionSummary {
  id: string;
  name: string;
  valueCount: number;
  sampleValues: string[];
}

export interface ProductVariantSummary {
  returnedCount: number;
  sample: Array<{
    id: string;
    title: string;
    selectedOptions: Array<{
      name: string;
      value: string;
    }>;
  }>;
}

export interface ProductImageAltTextSummary {
  returnedCount: number;
  withAltTextCount: number;
  missingAltTextCount: number;
  sampleAltTexts: string[];
}

export interface ProductSeoSummary {
  titlePresent: boolean;
  titleLength: number;
  descriptionPresent: boolean;
  descriptionLength: number;
}

export interface StoreTruthProductSnapshot {
  productGid: string;
  title: string;
  handle: string;
  status: string;
  productType: string;
  vendor: string;
  tags: string[];
  description: ProductDescriptionSummary;
  options: ProductOptionSummary[];
  variants: ProductVariantSummary;
  images: ProductImageAltTextSummary;
  seo: ProductSeoSummary;
}

export interface ReadOnlyProductScanSource {
  api: "Shopify Admin GraphQL";
  queryName: "StoreTruthReadOnlyProductScan";
  productLimit: number;
  readOnly: true;
  fieldsQueried: string[];
  notes: string[];
}

export type PublicDiscoveryPath =
  | "/robots.txt"
  | "/sitemap.xml"
  | "/agents.md"
  | "/llms.txt"
  | "/llms-full.txt";

export type PublicDiscoveryStatus =
  | "reachable"
  | "missing"
  | "empty"
  | "blocked"
  | "timeout"
  | "oversized"
  | "unsupported_content_type"
  | "error";

export interface PublicDiscoveryCheckResult {
  path: PublicDiscoveryPath;
  url: string;
  status: PublicDiscoveryStatus;
  reachable: boolean;
  statusCode?: number;
  contentType?: string;
  responseSizeBytes: number;
  contentSha256?: string;
  snippet?: string;
  warnings: string[];
  durationMs: number;
}

export interface PublicDiscoverySafetyLimits {
  method: "GET";
  httpsOnly: true;
  sameDomainOnly: true;
  redirectPolicy: "manual";
  timeoutMs: number;
  maxResponseBytes: number;
  paths: PublicDiscoveryPath[];
}

export interface PublicDiscoveryReport {
  checkedAt: string;
  shopDomain: string;
  baseUrl: string;
  score: number;
  limits: PublicDiscoverySafetyLimits;
  results: PublicDiscoveryCheckResult[];
  findings: ScanFinding[];
}

export interface ReadOnlyProductReadinessReport {
  id: string;
  generatedAt: string;
  shopDomain: string;
  source: ReadOnlyProductScanSource;
  scannedProducts: StoreTruthProductSnapshot[];
  publicDiscovery: PublicDiscoveryReport;
  scan: ScanRun;
}
