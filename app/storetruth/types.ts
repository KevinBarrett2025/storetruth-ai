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
  | "unclear"
  | "contradiction_risk";

export type BuyerQuestionCategory =
  | "product_recommendation"
  | "product_comparison"
  | "shipping"
  | "returns_refunds"
  | "warranty_support"
  | "sizing_options"
  | "compatibility_specs"
  | "materials_use_case"
  | "contact_help_faq";

export interface QuestionSourceReference {
  type:
    | "product"
    | "policy_page"
    | "discovery_url"
    | "finding"
    | "question"
    | "store";
  productGid?: string;
  productTitle?: string;
  productHandle?: string;
  pageGid?: string;
  pageTitle?: string;
  pageHandle?: string;
  discoveryPath?: PublicDiscoveryPath;
  findingId?: string;
  findingCategory?: FindingCategory;
  questionId?: string;
  questionCategory?: BuyerQuestionCategory;
  label: string;
}

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
  category: BuyerQuestionCategory;
  resultStatus: QuestionResultStatus;
  sourceSummary: string;
  sourceReferences: QuestionSourceReference[];
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

export interface PolicyContentPageSnapshot {
  pageGid: string;
  title: string;
  handle: string;
  bodyTextLength: number;
  bodyHtmlLength: number;
  bodySha256: string;
  textSummary: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
}

export type PolicyCoverageKey = "shipping" | "returns" | "privacy" | "terms";

export type PageCandidateKey = "contact" | "about" | "help" | "faq";

export interface ContentCoverageSignal<TKind extends string> {
  key: TKind;
  label: string;
  present: boolean;
  matchedPageGids: string[];
}

export interface DuplicateContentGroup {
  bodySha256: string;
  pageGids: string[];
}

export interface PolicyContentCoverage {
  policies: Array<ContentCoverageSignal<PolicyCoverageKey>>;
  pageCandidates: Array<ContentCoverageSignal<PageCandidateKey>>;
  thinContentPageGids: string[];
  duplicateContentGroups: DuplicateContentGroup[];
  hasNextPage: boolean;
  score: number;
}

export interface PolicyContentScanSource {
  api: "Shopify Admin GraphQL";
  queryName: "StoreTruthPolicyContentScan";
  pageLimit: number;
  readOnly: true;
  fieldsQueried: string[];
  notes: string[];
}

export interface PolicyContentReport {
  id: string;
  checkedAt: string;
  shopDomain: string;
  source: PolicyContentScanSource;
  pages: PolicyContentPageSnapshot[];
  coverage: PolicyContentCoverage;
  findings: ScanFinding[];
}

export interface QuestionCoverageSummary {
  totalQuestions: number;
  byStatus: Record<QuestionResultStatus, number>;
  byCategory: Record<BuyerQuestionCategory, number>;
  sourceSignalsUsed: string[];
}

export interface BuyerQuestionSimulationReport {
  id: string;
  generatedAt: string;
  method: "local_template_rules";
  readOnly: true;
  score: number;
  summary: QuestionCoverageSummary;
  questions: AIQuestionSimulation[];
  findings: ScanFinding[];
  notes: string[];
}

export type MerchantReviewStatus =
  | "new"
  | "reviewed"
  | "needs_fix"
  | "dismissed"
  | "drafted"
  | "approved_for_later";

export type MerchantReviewItemKind =
  | "finding"
  | "buyer_question"
  | "draft_suggestion";

export type MerchantDraftSuggestionType =
  | "add_shipping_policy_page"
  | "add_return_refund_policy_page"
  | "improve_thin_product_description"
  | "add_size_option_guidance"
  | "add_faq_contact_help_page"
  | "review_agent_discovery_file"
  | "review_contradictory_source"
  | "improve_product_source_data";

export interface MerchantReviewItem {
  id: string;
  kind: MerchantReviewItemKind;
  status: MerchantReviewStatus;
  title: string;
  summary: string;
  priority: FindingSeverity;
  sourceReferences: QuestionSourceReference[];
  linkedFindingIds: string[];
  linkedQuestionIds: string[];
  recommendedNextStep: string;
}

export interface MerchantDraftSuggestion {
  id: string;
  type: MerchantDraftSuggestionType;
  status: "drafted";
  title: string;
  summary: string;
  sourceReferences: QuestionSourceReference[];
  linkedFindingIds: string[];
  linkedQuestionIds: string[];
  guardrails: string[];
}

export interface MerchantReviewSummary {
  totalItems: number;
  byStatus: Record<MerchantReviewStatus, number>;
  draftSuggestionCount: number;
  needsFixCount: number;
}

export interface MerchantReviewReport {
  id: string;
  generatedAt: string;
  readOnly: true;
  persistence: "local_report_only";
  summary: MerchantReviewSummary;
  items: MerchantReviewItem[];
  draftSuggestions: MerchantDraftSuggestion[];
  notes: string[];
}

export interface ReadOnlyProductReadinessReport {
  id: string;
  generatedAt: string;
  shopDomain: string;
  source: ReadOnlyProductScanSource;
  scannedProducts: StoreTruthProductSnapshot[];
  publicDiscovery: PublicDiscoveryReport;
  policyContent: PolicyContentReport;
  questionSimulation: BuyerQuestionSimulationReport;
  merchantReview: MerchantReviewReport;
  scan: ScanRun;
}
