import { createHash } from "node:crypto";
import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";

import {
  calculateOverallReadinessScore,
  calculateProductReadinessScore,
} from "./readiness.server";
import {
  checkPublicDiscovery,
  mapDiscoveryToAgentChecks,
} from "./public-discovery.server";
import { createPolicyContentReport } from "./policy-content.server";
import { createBuyerQuestionSimulationReport } from "./question-simulation.server";
import type {
  BuyerQuestionSimulationReport,
  ContentSuggestion,
  PolicyContentReport,
  ProductReadinessScore,
  PublicDiscoveryReport,
  ReadOnlyProductReadinessReport,
  ScanFinding,
  ScanRun,
  StoreTruthProductSnapshot,
} from "./types";

export const PRODUCT_SCAN_LIMIT = 10;

interface ScanBuildResult {
  scan: ScanRun;
  questionSimulation: BuyerQuestionSimulationReport;
}

export const READ_ONLY_PRODUCT_SCAN_FIELDS = [
  "products.nodes.id",
  "products.nodes.title",
  "products.nodes.handle",
  "products.nodes.status",
  "products.nodes.productType",
  "products.nodes.vendor",
  "products.nodes.tags",
  "products.nodes.description",
  "products.nodes.descriptionHtml",
  "products.nodes.seo.title",
  "products.nodes.seo.description",
  "products.nodes.options.id",
  "products.nodes.options.name",
  "products.nodes.options.values",
  "products.nodes.variants.nodes.id",
  "products.nodes.variants.nodes.title",
  "products.nodes.variants.nodes.selectedOptions.name",
  "products.nodes.variants.nodes.selectedOptions.value",
  "products.nodes.media.nodes.mediaContentType",
  "products.nodes.media.nodes.alt",
  "products.nodes.media.nodes.MediaImage.id",
  "products.nodes.media.nodes.MediaImage.image.altText",
  "products.pageInfo.hasNextPage",
] as const;

export const READ_ONLY_PRODUCT_SCAN_QUERY = `#graphql
  query StoreTruthReadOnlyProductScan($first: Int!) {
    products(first: $first, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        id
        title
        handle
        status
        productType
        vendor
        tags
        description
        descriptionHtml
        seo {
          title
          description
        }
        options {
          id
          name
          values
        }
        variants(first: 10) {
          nodes {
            id
            title
            selectedOptions {
              name
              value
            }
          }
        }
        media(first: 10) {
          nodes {
            mediaContentType
            alt
            ... on MediaImage {
              id
              image {
                altText
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;

interface ProductOptionNode {
  id: string;
  name: string;
  values: string[];
}

interface ProductVariantNode {
  id: string;
  title: string;
  selectedOptions: Array<{
    name: string;
    value: string;
  }>;
}

interface ProductMediaNode {
  id?: string;
  mediaContentType: string;
  alt?: string | null;
  image?: {
    altText?: string | null;
  } | null;
}

interface ProductNode {
  id: string;
  title: string;
  handle: string;
  status: string;
  productType: string;
  vendor: string;
  tags: string[];
  description: string | null;
  descriptionHtml: string | null;
  seo: {
    title?: string | null;
    description?: string | null;
  } | null;
  options: ProductOptionNode[];
  variants: {
    nodes: ProductVariantNode[];
  };
  media: {
    nodes: ProductMediaNode[];
  };
}

interface ProductScanQueryData {
  products: {
    nodes: ProductNode[];
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

export async function createReadOnlyProductReadinessReport({
  adminGraphql,
  shopDomain,
  productLimit = PRODUCT_SCAN_LIMIT,
}: {
  adminGraphql: AdminGraphqlClient;
  shopDomain: string;
  productLimit?: number;
}): Promise<ReadOnlyProductReadinessReport> {
  const boundedLimit = Math.min(Math.max(productLimit, 1), PRODUCT_SCAN_LIMIT);
  const response = await adminGraphql(READ_ONLY_PRODUCT_SCAN_QUERY, {
    variables: { first: boundedLimit },
  });
  const result = (await response.json()) as AdminGraphqlJson<ProductScanQueryData>;

  if (result.errors?.length) {
    throw new Error(
      `Shopify Admin GraphQL product scan failed: ${result.errors
        .map((error) => error.message)
        .join("; ")}`,
    );
  }

  if (!result.data) {
    throw new Error("Shopify Admin GraphQL product scan returned no data.");
  }

  const generatedAt = new Date().toISOString();
  const scannedProducts = result.data.products.nodes.map(mapProductSnapshot);
  const [publicDiscovery, policyContent] = await Promise.all([
    checkPublicDiscovery(shopDomain),
    createPolicyContentReport({
      adminGraphql,
      shopDomain,
    }),
  ]);
  const { questionSimulation, scan } = createScanRunFromProducts({
    generatedAt,
    hasNextPage: result.data.products.pageInfo.hasNextPage,
    productLimit: boundedLimit,
    policyContent,
    publicDiscovery,
    scannedProducts,
    shopDomain,
  });

  return {
    id: scan.id,
    generatedAt,
    shopDomain,
    source: {
      api: "Shopify Admin GraphQL",
      queryName: "StoreTruthReadOnlyProductScan",
      productLimit: boundedLimit,
      readOnly: true,
      fieldsQueried: [...READ_ONLY_PRODUCT_SCAN_FIELDS],
      notes: [
        "Bounded to the first 10 products or fewer.",
        "Does not request customer, order, price, inventory quantity, token, or secret data.",
        "Descriptions are summarized and descriptionHtml is represented by length plus SHA-256 hash.",
      ],
    },
    scannedProducts,
    publicDiscovery,
    policyContent,
    questionSimulation,
    scan,
  };
}

function createScanRunFromProducts({
  generatedAt,
  hasNextPage,
  policyContent,
  productLimit,
  publicDiscovery,
  scannedProducts,
  shopDomain,
}: {
  generatedAt: string;
  hasNextPage: boolean;
  policyContent: PolicyContentReport;
  productLimit: number;
  publicDiscovery: PublicDiscoveryReport;
  scannedProducts: StoreTruthProductSnapshot[];
  shopDomain: string;
}): ScanBuildResult {
  const productScores = scannedProducts.map(createProductReadinessScore);
  const productFindings = createProductFindings(
    scannedProducts,
    productScores,
    hasNextPage,
  );
  const findings = [...productFindings, ...publicDiscovery.findings];
  const allFindings = [...findings, ...policyContent.findings];
  const questionSimulation = createBuyerQuestionSimulationReport({
    findings: allFindings,
    generatedAt,
    policyContent,
    products: scannedProducts,
    publicDiscovery,
  });
  const finalFindings = [
    ...allFindings,
    ...questionSimulation.findings,
    createScanScopeFinding({
      hasNextPage,
      productLimit,
      returnedProducts: scannedProducts.length,
    }),
  ];
  const contentSuggestions = createContentSuggestions(allFindings);
  const products =
    productScores.length === 0
      ? 0
      : Math.round(
          productScores.reduce((total, product) => total + product.score, 0) /
            productScores.length,
        );
  const riskPenalty = Math.min(
    25,
    finalFindings.reduce((penalty, finding) => {
      if (finding.severity === "high") return penalty + 8;
      if (finding.severity === "medium") return penalty + 4;
      if (finding.severity === "low") return penalty + 2;
      return penalty;
    }, 0),
  );
  const baseScores = {
    products,
    policyFaq: policyContent.coverage.score,
    aiQuestionCoverage: questionSimulation.score,
    agentDiscovery: publicDiscovery.score,
    riskPenalty,
  };

  return {
    scan: {
      id: `read-only-product-scan-${generatedAt.replace(/[:.]/g, "-")}`,
      shopDomain,
      status: "completed",
      startedAt: generatedAt,
      finishedAt: generatedAt,
      productCount: scannedProducts.length,
      scores: {
        ...baseScores,
        overall: calculateOverallReadinessScore(baseScores),
      },
      findings: finalFindings,
      productScores,
      agentDiscoveryChecks: mapDiscoveryToAgentChecks(publicDiscovery),
      questionSimulations: questionSimulation.questions,
      contentSuggestions,
    },
    questionSimulation,
  };
}

function createScanScopeFinding({
  hasNextPage,
  productLimit,
  returnedProducts,
}: {
  hasNextPage: boolean;
  productLimit: number;
  returnedProducts: number;
}): ScanFinding {
  return {
    id: "finding-scan-scope-limited",
    severity: hasNextPage ? "info" : "low",
    category: "product_readiness",
    resourceType: "store",
    title: "Product scan is intentionally bounded",
    description: `This feasibility slice queried at most ${productLimit} products and did not crawl the full catalog.`,
    evidence: {
      productLimit,
      returnedProducts,
      hasNextPage,
    },
    recommendation:
      "Keep the bounded query while validating fields, scopes, and merchant review workflow.",
    status: "open",
  };
}

function mapProductSnapshot(product: ProductNode): StoreTruthProductSnapshot {
  const description = product.description ?? "";
  const descriptionHtml = product.descriptionHtml ?? "";
  const imageAltTexts = product.media.nodes
    .filter((media) => media.mediaContentType === "IMAGE")
    .map((media) => normalizeWhitespace(media.image?.altText ?? media.alt ?? ""))
    .filter(Boolean);
  const imageCount = product.media.nodes.filter(
    (media) => media.mediaContentType === "IMAGE",
  ).length;

  return {
    productGid: product.id,
    title: product.title,
    handle: product.handle,
    status: product.status,
    productType: product.productType,
    vendor: product.vendor,
    tags: product.tags,
    description: {
      textLength: normalizeWhitespace(description).length,
      textSummary: summarizeText(description, 220),
      htmlLength: descriptionHtml.length,
      htmlSha256: hashText(descriptionHtml),
    },
    options: product.options.map((option) => ({
      id: option.id,
      name: option.name,
      valueCount: option.values.length,
      sampleValues: option.values.slice(0, 10),
    })),
    variants: {
      returnedCount: product.variants.nodes.length,
      sample: product.variants.nodes.slice(0, 10).map((variant) => ({
        id: variant.id,
        title: variant.title,
        selectedOptions: variant.selectedOptions,
      })),
    },
    images: {
      returnedCount: imageCount,
      withAltTextCount: imageAltTexts.length,
      missingAltTextCount: Math.max(0, imageCount - imageAltTexts.length),
      sampleAltTexts: imageAltTexts.slice(0, 10),
    },
    seo: {
      titlePresent: Boolean(normalizeWhitespace(product.seo?.title ?? "")),
      titleLength: normalizeWhitespace(product.seo?.title ?? "").length,
      descriptionPresent: Boolean(
        normalizeWhitespace(product.seo?.description ?? ""),
      ),
      descriptionLength: normalizeWhitespace(product.seo?.description ?? "").length,
    },
  };
}

function createProductReadinessScore(
  product: StoreTruthProductSnapshot,
): ProductReadinessScore {
  const signals: ProductReadinessScore["signals"] = {
    titleClarity: scoreTitle(product.title),
    descriptionCompleteness: clamp(product.description.textLength / 500),
    variantClarity: scoreVariants(product),
    imageCoverage: scoreImages(product),
    seoCoverage:
      (Number(product.seo.titlePresent) + Number(product.seo.descriptionPresent)) / 2,
    structuredAttributes: scoreStructuredAttributes(product),
  };

  return {
    productGid: product.productGid,
    handle: product.handle,
    title: product.title,
    signals,
    score: calculateProductReadinessScore(signals),
  };
}

function createProductFindings(
  products: StoreTruthProductSnapshot[],
  productScores: ProductReadinessScore[],
  hasNextPage: boolean,
): ScanFinding[] {
  if (products.length === 0) {
    return [
      {
        id: "finding-no-products-returned",
        severity: "high",
        category: "product_readiness",
        resourceType: "store",
        title: "No products returned from bounded Admin API scan",
        description:
          "StoreTruth could connect to Shopify, but the bounded product query did not return products to evaluate.",
        evidence: { returnedProducts: 0, hasNextPage },
        recommendation:
          "Add sample products to the development store before validating readiness scoring.",
        status: "open",
      },
    ];
  }

  return products.flatMap((product) => {
    const score = productScores.find(
      (candidate) => candidate.productGid === product.productGid,
    );
    const productFindings: ScanFinding[] = [];

    if (product.description.textLength < 120) {
      productFindings.push({
        id: `${product.handle}-thin-description`,
        severity: "medium",
        category: "product_readiness",
        resourceType: "product",
        resourceGid: product.productGid,
        title: "Product description may be too thin for agent answers",
        description:
          "The product has limited descriptive text for source-backed buyer questions.",
        evidence: {
          handle: product.handle,
          descriptionTextLength: product.description.textLength,
        },
        recommendation:
          "Add merchant-approved details such as use cases, materials, dimensions, fit, compatibility, or care notes.",
        status: "open",
      });
    }

    if (product.images.returnedCount === 0 || product.images.missingAltTextCount > 0) {
      productFindings.push({
        id: `${product.handle}-image-alt-text`,
        severity: "low",
        category: "product_readiness",
        resourceType: "product",
        resourceGid: product.productGid,
        title: "Image alt text coverage is incomplete",
        description:
          "Image alt text helps product media remain understandable when agents or accessibility tools inspect product data.",
        evidence: {
          handle: product.handle,
          returnedImages: product.images.returnedCount,
          missingAltTextCount: product.images.missingAltTextCount,
        },
        recommendation:
          "Draft merchant-reviewed alt text for product images that lack useful descriptions.",
        status: "open",
      });
    }

    if (!product.seo.titlePresent || !product.seo.descriptionPresent) {
      productFindings.push({
        id: `${product.handle}-seo-fields`,
        severity: "low",
        category: "product_readiness",
        resourceType: "product",
        resourceGid: product.productGid,
        title: "SEO fields are incomplete",
        description:
          "The bounded scan found missing SEO title or description metadata for this product.",
        evidence: {
          handle: product.handle,
          seoTitlePresent: product.seo.titlePresent,
          seoDescriptionPresent: product.seo.descriptionPresent,
        },
        recommendation:
          "Draft source-backed SEO metadata for merchant review without making ranking or traffic claims.",
        status: "open",
      });
    }

    if (score && score.signals.structuredAttributes < 0.5) {
      productFindings.push({
        id: `${product.handle}-structured-attributes`,
        severity: "medium",
        category: "product_readiness",
        resourceType: "product",
        resourceGid: product.productGid,
        title: "Structured product attributes are sparse",
        description:
          "Product type, vendor, tags, options, or variant values are limited for deterministic readiness checks.",
        evidence: {
          handle: product.handle,
          productTypePresent: Boolean(product.productType),
          vendorPresent: Boolean(product.vendor),
          tagCount: product.tags.length,
          optionCount: product.options.length,
        },
        recommendation:
          "Add merchant-approved attributes before building any automated content workflow.",
        status: "open",
      });
    }

    return productFindings;
  });
}

function createContentSuggestions(findings: ScanFinding[]): ContentSuggestion[] {
  return findings
    .filter((finding) => finding.resourceType === "product")
    .map((finding) => ({
      id: `${finding.id}-suggestion`,
      findingId: finding.id,
      resourceType: finding.resourceType,
      suggestionType: finding.id.includes("image-alt-text")
        ? "alt_text"
        : "product_attribute",
      status: "merchant_review_required",
      summary:
        "Create a draft fix only for merchant review. This slice does not write product data.",
    }));
}

function scoreTitle(title: string): number {
  const normalizedTitle = normalizeWhitespace(title).toLowerCase();

  if (!normalizedTitle || normalizedTitle.includes("untitled")) {
    return 0.1;
  }

  return clamp(normalizedTitle.length / 16);
}

function scoreVariants(product: StoreTruthProductSnapshot): number {
  if (product.variants.returnedCount === 0) {
    return 0.6;
  }

  const meaningfulVariants = product.variants.sample.filter(
    (variant) =>
      normalizeWhitespace(variant.title).toLowerCase() !== "default title" ||
      variant.selectedOptions.length > 0,
  ).length;

  return clamp(meaningfulVariants / product.variants.returnedCount);
}

function scoreImages(product: StoreTruthProductSnapshot): number {
  if (product.images.returnedCount === 0) {
    return 0;
  }

  const altCoverage =
    product.images.withAltTextCount / Math.max(1, product.images.returnedCount);
  const mediaPresence = Math.min(product.images.returnedCount / 3, 1);

  return clamp(altCoverage * 0.8 + mediaPresence * 0.2);
}

function scoreStructuredAttributes(product: StoreTruthProductSnapshot): number {
  const signals = [
    Boolean(normalizeWhitespace(product.productType)),
    Boolean(normalizeWhitespace(product.vendor)),
    product.tags.length > 0,
    product.options.some((option) => option.valueCount > 0),
  ];

  return signals.filter(Boolean).length / signals.length;
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

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}
