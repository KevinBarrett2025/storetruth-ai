import type {
  AIQuestionSimulation,
  BuyerQuestionSimulationReport,
  FindingCategory,
  MerchantDraftSuggestion,
  MerchantDraftSuggestionType,
  MerchantReviewItem,
  MerchantReviewReport,
  MerchantReviewStatus,
  PolicyContentPageSnapshot,
  PolicyContentReport,
  PublicDiscoveryReport,
  QuestionResultStatus,
  QuestionSourceReference,
  ScanFinding,
  StoreTruthProductSnapshot,
} from "./types";

const REVIEW_STATUSES: MerchantReviewStatus[] = [
  "new",
  "reviewed",
  "needs_fix",
  "dismissed",
  "drafted",
  "approved_for_later",
];

const DRAFT_GUARDRAILS = [
  "Local draft only; does not write to Shopify.",
  "Requires merchant review before any future write workflow.",
  "Does not claim AI rankings, AI traffic, or sales lift.",
];

export function createMerchantReviewReport({
  findings,
  generatedAt,
  policyContent,
  products,
  publicDiscovery,
  questionSimulation,
}: {
  findings: ScanFinding[];
  generatedAt: string;
  policyContent: PolicyContentReport;
  products: StoreTruthProductSnapshot[];
  publicDiscovery: PublicDiscoveryReport;
  questionSimulation: BuyerQuestionSimulationReport;
}): MerchantReviewReport {
  const findingItems = findings.map((finding) =>
    createFindingReviewItem({ finding, policyContent, products, publicDiscovery }),
  );
  const questionItems = questionSimulation.questions.map((question) =>
    createQuestionReviewItem(question),
  );
  const draftSuggestions = createDraftSuggestions({
    findings,
    policyContent,
    products,
    publicDiscovery,
    questions: questionSimulation.questions,
  });
  const suggestionItems = draftSuggestions.map(createSuggestionReviewItem);
  const items = [...findingItems, ...questionItems, ...suggestionItems];

  return {
    id: `merchant-review-${generatedAt.replace(/[:.]/g, "-")}`,
    generatedAt,
    readOnly: true,
    persistence: "local_report_only",
    summary: createSummary(items, draftSuggestions),
    items,
    draftSuggestions,
    notes: [
      "Review state is generated locally inside the readiness report.",
      "No review state is persisted to a database in this V0 slice.",
      "Draft suggestions are deterministic placeholders for merchant review and do not write to Shopify.",
    ],
  };
}

function createFindingReviewItem({
  finding,
  policyContent,
  products,
  publicDiscovery,
}: {
  finding: ScanFinding;
  policyContent: PolicyContentReport;
  products: StoreTruthProductSnapshot[];
  publicDiscovery: PublicDiscoveryReport;
}): MerchantReviewItem {
  return {
    id: `review-${finding.id}`,
    kind: "finding",
    status: statusForFinding(finding),
    title: finding.title,
    summary: finding.description,
    priority: finding.severity,
    sourceReferences: sourceReferencesForFinding({
      finding,
      policyContent,
      products,
      publicDiscovery,
    }),
    linkedFindingIds: [finding.id],
    linkedQuestionIds: [],
    recommendedNextStep: finding.recommendation,
  };
}

function createQuestionReviewItem(
  question: AIQuestionSimulation,
): MerchantReviewItem {
  return {
    id: `review-${question.id}`,
    kind: "buyer_question",
    status: statusForQuestion(question.resultStatus),
    title: question.question,
    summary: question.sourceSummary,
    priority: priorityForQuestion(question.resultStatus),
    sourceReferences: [
      questionReference(question),
      ...question.sourceReferences.slice(0, 6),
    ],
    linkedFindingIds: question.sourceReferences
      .map((reference) => reference.findingId)
      .filter(isString),
    linkedQuestionIds: [question.id],
    recommendedNextStep:
      question.resultStatus === "answered"
        ? "Keep this source path available for merchant review."
        : "Review source gaps and decide whether a merchant-approved fix should be drafted later.",
  };
}

function createSuggestionReviewItem(
  suggestion: MerchantDraftSuggestion,
): MerchantReviewItem {
  return {
    id: `review-${suggestion.id}`,
    kind: "draft_suggestion",
    status: "drafted",
    title: suggestion.title,
    summary: suggestion.summary,
    priority: "low",
    sourceReferences: suggestion.sourceReferences,
    linkedFindingIds: suggestion.linkedFindingIds,
    linkedQuestionIds: suggestion.linkedQuestionIds,
    recommendedNextStep:
      "Keep as a local draft until a merchant explicitly approves a future write workflow.",
  };
}

function createDraftSuggestions({
  findings,
  policyContent,
  products,
  publicDiscovery,
  questions,
}: {
  findings: ScanFinding[];
  policyContent: PolicyContentReport;
  products: StoreTruthProductSnapshot[];
  publicDiscovery: PublicDiscoveryReport;
  questions: AIQuestionSimulation[];
}): MerchantDraftSuggestion[] {
  const suggestions = [
    ...findings.flatMap((finding) =>
      suggestionForFinding({
        finding,
        policyContent,
        products,
        publicDiscovery,
      }),
    ),
    ...questions.flatMap((question) =>
      suggestionForQuestion({
        policyContent,
        products,
        question,
      }),
    ),
  ];

  return dedupeSuggestions(suggestions);
}

function suggestionForFinding({
  finding,
  policyContent,
  products,
  publicDiscovery,
}: {
  finding: ScanFinding;
  policyContent: PolicyContentReport;
  products: StoreTruthProductSnapshot[];
  publicDiscovery: PublicDiscoveryReport;
}): MerchantDraftSuggestion[] {
  const references = sourceReferencesForFinding({
    finding,
    policyContent,
    products,
    publicDiscovery,
  });

  if (finding.id === "finding-missing-shipping-policy") {
    return [
      createSuggestion({
        linkedFindingIds: [finding.id],
        references,
        summary:
          "Prepare a merchant-reviewed shipping policy source page so buyer delivery questions have a clear source.",
        title: "Add shipping policy page",
        type: "add_shipping_policy_page",
      }),
    ];
  }

  if (finding.id === "finding-missing-returns-policy") {
    return [
      createSuggestion({
        linkedFindingIds: [finding.id],
        references,
        summary:
          "Prepare a merchant-reviewed return/refund policy source page so return questions have a clear source.",
        title: "Add return/refund policy page",
        type: "add_return_refund_policy_page",
      }),
    ];
  }

  if (
    finding.id === "finding-missing-contact-page" ||
    finding.id === "finding-missing-help-page" ||
    finding.id === "finding-missing-faq-page"
  ) {
    return [
      createSuggestion({
        linkedFindingIds: [finding.id],
        references,
        summary:
          "Prepare a merchant-reviewed contact, help, or FAQ page source for store-level buyer questions.",
        title: "Add FAQ/contact/help page",
        type: "add_faq_contact_help_page",
      }),
    ];
  }

  if (finding.id.includes("thin-description")) {
    return [
      createSuggestion({
        linkedFindingIds: [finding.id],
        references,
        summary:
          "Draft source details such as use cases, materials, dimensions, compatibility, or care notes for merchant review.",
        title: "Improve thin product description",
        type: "improve_thin_product_description",
      }),
    ];
  }

  if (finding.id.includes("structured-attributes")) {
    return [
      createSuggestion({
        linkedFindingIds: [finding.id],
        references,
        summary:
          "Draft missing product source attributes, including option guidance when relevant, for merchant review.",
        title: "Improve product source data",
        type: "improve_product_source_data",
      }),
    ];
  }

  if (finding.id.includes("discovery")) {
    return [
      createSuggestion({
        linkedFindingIds: [finding.id],
        references,
        summary:
          "Review public discovery availability and decide whether an optional agents.md or llms.txt source file is appropriate.",
        title: "Review missing llms.txt or agents.md availability",
        type: "review_agent_discovery_file",
      }),
    ];
  }

  if (finding.id.includes("thin-content")) {
    return [
      createSuggestion({
        linkedFindingIds: [finding.id],
        references,
        summary:
          "Expand the thin source page with merchant-approved content if it is expected to answer buyer questions.",
        title: "Improve thin help or policy page",
        type: "add_faq_contact_help_page",
      }),
    ];
  }

  return [];
}

function suggestionForQuestion({
  policyContent,
  products,
  question,
}: {
  policyContent: PolicyContentReport;
  products: StoreTruthProductSnapshot[];
  question: AIQuestionSimulation;
}): MerchantDraftSuggestion[] {
  if (question.resultStatus === "answered") {
    return [];
  }

  const references = [
    questionReference(question),
    ...question.sourceReferences.slice(0, 6),
  ];

  if (question.resultStatus === "contradiction_risk") {
    return [
      createSuggestion({
        linkedQuestionIds: [question.id],
        references,
        summary:
          "Review conflicting candidate source pages before using this topic as a single source of truth.",
        title: "Review contradictory source candidates",
        type: "review_contradictory_source",
      }),
    ];
  }

  if (question.category === "shipping") {
    return [
      createSuggestion({
        linkedQuestionIds: [question.id],
        references,
        summary:
          "Draft a merchant-reviewed shipping policy source page or improve the existing shipping source.",
        title: "Add shipping policy page",
        type: "add_shipping_policy_page",
      }),
    ];
  }

  if (question.category === "returns_refunds") {
    return [
      createSuggestion({
        linkedQuestionIds: [question.id],
        references,
        summary:
          "Draft a merchant-reviewed return/refund policy source page or improve the existing return source.",
        title: "Add return/refund policy page",
        type: "add_return_refund_policy_page",
      }),
    ];
  }

  if (question.category === "sizing_options") {
    return [
      createSuggestion({
        linkedQuestionIds: [question.id],
        references: referencesWithFallbackProducts(references, products),
        summary:
          "Draft merchant-reviewed size, option, or variant guidance for scanned products.",
        title: "Add size/option guidance",
        type: "add_size_option_guidance",
      }),
    ];
  }

  if (question.category === "contact_help_faq") {
    const fallbackPages = pageReferences(policyContent.pages.slice(0, 2));

    return [
      createSuggestion({
        linkedQuestionIds: [question.id],
        references: [...references, ...fallbackPages],
        summary:
          "Draft or improve merchant-reviewed FAQ, contact, or help source content.",
        title: "Add FAQ/contact/help page",
        type: "add_faq_contact_help_page",
      }),
    ];
  }

  return [
    createSuggestion({
      linkedQuestionIds: [question.id],
      references: referencesWithFallbackProducts(references, products),
      summary:
        "Draft missing product source data for merchant review before using this buyer-question path.",
      title: "Improve product source data",
      type: "improve_product_source_data",
    }),
  ];
}

function createSuggestion({
  linkedFindingIds = [],
  linkedQuestionIds = [],
  references,
  summary,
  title,
  type,
}: {
  linkedFindingIds?: string[];
  linkedQuestionIds?: string[];
  references: QuestionSourceReference[];
  summary: string;
  title: string;
  type: MerchantDraftSuggestionType;
}): MerchantDraftSuggestion {
  const key = [
    type,
    linkedFindingIds.join("-"),
    linkedQuestionIds.join("-"),
    references.map((reference) => reference.label).join("-"),
  ]
    .filter(Boolean)
    .join("-")
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase()
    .slice(0, 96);

  return {
    id: `draft-${key}`,
    type,
    status: "drafted",
    title,
    summary,
    sourceReferences: references.slice(0, 8),
    linkedFindingIds,
    linkedQuestionIds,
    guardrails: DRAFT_GUARDRAILS,
  };
}

function dedupeSuggestions(
  suggestions: MerchantDraftSuggestion[],
): MerchantDraftSuggestion[] {
  const seen = new Set<string>();
  const deduped: MerchantDraftSuggestion[] = [];

  for (const suggestion of suggestions) {
    const key = [
      suggestion.type,
      suggestion.linkedFindingIds.join(","),
      suggestion.linkedQuestionIds.join(","),
      suggestion.sourceReferences.map((reference) => reference.label).join(","),
    ].join("|");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(suggestion);
  }

  return deduped;
}

function sourceReferencesForFinding({
  finding,
  policyContent,
  products,
  publicDiscovery,
}: {
  finding: ScanFinding;
  policyContent: PolicyContentReport;
  products: StoreTruthProductSnapshot[];
  publicDiscovery: PublicDiscoveryReport;
}): QuestionSourceReference[] {
  const references: QuestionSourceReference[] = [
    {
      type: "finding",
      findingId: finding.id,
      findingCategory: finding.category as FindingCategory,
      label: `Finding: ${finding.title}`,
    },
  ];
  const product = products.find(
    (candidate) => candidate.productGid === finding.resourceGid,
  );

  if (product) {
    references.push(productReference(product));
  }

  const pageGid = stringEvidence(finding, "pageGid") ?? finding.resourceGid;
  const page = policyContent.pages.find(
    (candidate) => candidate.pageGid === pageGid,
  );

  if (page) {
    references.push(pageReference(page));
  }

  const discoveryPath = stringEvidence(finding, "path");
  const discoveryResult = publicDiscovery.results.find(
    (candidate) => candidate.path === discoveryPath,
  );

  if (discoveryResult) {
    references.push({
      type: "discovery_url",
      discoveryPath: discoveryResult.path,
      label: `${discoveryResult.path}: ${discoveryResult.status}`,
    });
  }

  return references.slice(0, 8);
}

function productReference(
  product: StoreTruthProductSnapshot,
): QuestionSourceReference {
  return {
    type: "product",
    productGid: product.productGid,
    productTitle: product.title,
    productHandle: product.handle,
    label: `Product: ${product.title} (${product.handle})`,
  };
}

function pageReference(page: PolicyContentPageSnapshot): QuestionSourceReference {
  return {
    type: "policy_page",
    pageGid: page.pageGid,
    pageTitle: page.title,
    pageHandle: page.handle,
    label: `Page: ${page.title} (${page.handle})`,
  };
}

function pageReferences(
  pages: PolicyContentPageSnapshot[],
): QuestionSourceReference[] {
  return pages.map(pageReference);
}

function questionReference(
  question: AIQuestionSimulation,
): QuestionSourceReference {
  return {
    type: "question",
    questionId: question.id,
    questionCategory: question.category,
    label: `Question: ${question.category} (${question.resultStatus})`,
  };
}

function referencesWithFallbackProducts(
  references: QuestionSourceReference[],
  products: StoreTruthProductSnapshot[],
): QuestionSourceReference[] {
  if (references.some((reference) => reference.type === "product")) {
    return references;
  }

  return [...references, ...products.slice(0, 2).map(productReference)];
}

function statusForFinding(finding: ScanFinding): MerchantReviewStatus {
  if (finding.severity === "high" || finding.severity === "medium") {
    return "needs_fix";
  }

  if (finding.severity === "info") {
    return "reviewed";
  }

  return "new";
}

function statusForQuestion(
  status: QuestionResultStatus,
): MerchantReviewStatus {
  if (status === "answered") {
    return "reviewed";
  }

  if (status === "unanswered" || status === "contradiction_risk") {
    return "needs_fix";
  }

  return "new";
}

function priorityForQuestion(
  status: QuestionResultStatus,
): MerchantReviewItem["priority"] {
  if (status === "unanswered" || status === "contradiction_risk") {
    return "medium";
  }

  if (status === "partially_answered" || status === "unclear") {
    return "low";
  }

  return "info";
}

function createSummary(
  items: MerchantReviewItem[],
  draftSuggestions: MerchantDraftSuggestion[],
): MerchantReviewReport["summary"] {
  const byStatus = Object.fromEntries(
    REVIEW_STATUSES.map((status) => [status, 0]),
  ) as Record<MerchantReviewStatus, number>;

  for (const item of items) {
    byStatus[item.status] += 1;
  }

  return {
    totalItems: items.length,
    byStatus,
    draftSuggestionCount: draftSuggestions.length,
    needsFixCount: byStatus.needs_fix,
  };
}

function stringEvidence(
  finding: ScanFinding,
  key: string,
): string | undefined {
  const value = finding.evidence[key];

  return typeof value === "string" ? value : undefined;
}

function isString(value: string | undefined): value is string {
  return typeof value === "string";
}
