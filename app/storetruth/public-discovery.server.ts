import { createHash } from "node:crypto";
import { TextDecoder } from "node:util";

import type {
  AgentDiscoveryCheck,
  PublicDiscoveryCheckResult,
  PublicDiscoveryPath,
  PublicDiscoveryReport,
  PublicDiscoveryStatus,
  ScanFinding,
} from "./types";

export const PUBLIC_DISCOVERY_PATHS: PublicDiscoveryPath[] = [
  "/robots.txt",
  "/sitemap.xml",
  "/agents.md",
  "/llms.txt",
  "/llms-full.txt",
];

export const PUBLIC_DISCOVERY_TIMEOUT_MS = 3_000;
export const PUBLIC_DISCOVERY_MAX_RESPONSE_BYTES = 64 * 1024;

const SUPPORTED_CONTENT_TYPES = [
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "application/markdown",
  "application/xml",
  "text/xml",
  "application/rss+xml",
];

export async function checkPublicDiscovery(
  shopDomain: string,
): Promise<PublicDiscoveryReport> {
  const baseUrl = createStorefrontBaseUrl(shopDomain);
  const checkedAt = new Date().toISOString();
  const results = await Promise.all(
    PUBLIC_DISCOVERY_PATHS.map((path) => checkDiscoveryPath(baseUrl, path)),
  );
  const findings = createDiscoveryFindings(results);

  return {
    checkedAt,
    shopDomain,
    baseUrl: baseUrl.toString(),
    score: calculateDiscoveryHealthScore(results),
    limits: {
      method: "GET",
      httpsOnly: true,
      sameDomainOnly: true,
      redirectPolicy: "manual",
      timeoutMs: PUBLIC_DISCOVERY_TIMEOUT_MS,
      maxResponseBytes: PUBLIC_DISCOVERY_MAX_RESPONSE_BYTES,
      paths: PUBLIC_DISCOVERY_PATHS,
    },
    results,
    findings,
  };
}

export function mapDiscoveryToAgentChecks(
  report: PublicDiscoveryReport,
): AgentDiscoveryCheck[] {
  return report.results.map((result) => ({
    path: result.path,
    status: result.status,
    ...(result.statusCode ? { statusCode: result.statusCode } : {}),
    summary: result.warnings[0] ?? discoveryStatusSummary(result.status),
  }));
}

function createStorefrontBaseUrl(shopDomain: string): URL {
  const normalizedDomain = shopDomain.trim().toLowerCase();

  if (!/^[a-z0-9][a-z0-9.-]*\.myshopify\.com$/.test(normalizedDomain)) {
    throw new Error(
      "Public discovery checks are limited to myshopify.com development store domains.",
    );
  }

  return new URL(`https://${normalizedDomain}`);
}

async function checkDiscoveryPath(
  baseUrl: URL,
  path: PublicDiscoveryPath,
): Promise<PublicDiscoveryCheckResult> {
  const startedAt = Date.now();
  const url = new URL(path, baseUrl);
  const baseOrigin = baseUrl.origin;

  if (url.protocol !== "https:" || url.origin !== baseOrigin) {
    return createErrorResult({
      durationMs: Date.now() - startedAt,
      path,
      status: "blocked",
      url: url.toString(),
      warning: "Discovery URL failed HTTPS or same-domain validation.",
    });
  }

  const abortController = new globalThis.AbortController();
  const timeout = globalThis.setTimeout(() => {
    abortController.abort();
  }, PUBLIC_DISCOVERY_TIMEOUT_MS);

  try {
    const response = await globalThis.fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: abortController.signal,
    });
    const body = await readCappedBody(response);
    const contentType = normalizeContentType(response.headers.get("content-type"));
    const status = classifyResponse(response, body, contentType);
    const snippet = createSafeSnippet(body.bytes, contentType, status);
    const warnings = createWarnings({ body, contentType, response, status });

    return {
      path,
      url: url.toString(),
      status,
      reachable: status === "reachable",
      statusCode: response.status,
      ...(contentType ? { contentType } : {}),
      responseSizeBytes: body.observedSizeBytes,
      ...(body.bytes.byteLength > 0 && !body.oversized
        ? { contentSha256: hashBuffer(body.bytes) }
        : {}),
      ...(snippet ? { snippet } : {}),
      warnings,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    const status = isAbortError(error) ? "timeout" : "error";

    return createErrorResult({
      durationMs: Date.now() - startedAt,
      path,
      status,
      url: url.toString(),
      warning:
        status === "timeout"
          ? `Request timed out after ${PUBLIC_DISCOVERY_TIMEOUT_MS}ms.`
          : "Network error while checking public discovery URL.",
    });
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

interface CappedBody {
  bytes: Buffer;
  observedSizeBytes: number;
  oversized: boolean;
}

async function readCappedBody(response: Response): Promise<CappedBody> {
  if (!response.body) {
    return {
      bytes: Buffer.alloc(0),
      observedSizeBytes: 0,
      oversized: false,
    };
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let capturedSizeBytes = 0;
  let observedSizeBytes = 0;
  let reading = true;

  while (reading) {
    const { done, value } = await reader.read();

    if (done) {
      reading = false;
      continue;
    }

    const chunk = Buffer.from(value);
    observedSizeBytes += chunk.byteLength;

    if (observedSizeBytes > PUBLIC_DISCOVERY_MAX_RESPONSE_BYTES) {
      const remainingBytes = Math.max(
        0,
        PUBLIC_DISCOVERY_MAX_RESPONSE_BYTES - capturedSizeBytes,
      );

      if (remainingBytes > 0) {
        chunks.push(chunk.subarray(0, remainingBytes));
        capturedSizeBytes += remainingBytes;
      }

      await reader.cancel();

      return {
        bytes: Buffer.concat(chunks, capturedSizeBytes),
        observedSizeBytes,
        oversized: true,
      };
    }

    chunks.push(chunk);
    capturedSizeBytes += chunk.byteLength;
  }

  return {
    bytes: Buffer.concat(chunks, capturedSizeBytes),
    observedSizeBytes,
    oversized: false,
  };
}

function classifyResponse(
  response: Response,
  body: CappedBody,
  contentType: string | undefined,
): PublicDiscoveryStatus {
  if (body.oversized) {
    return "oversized";
  }

  if (response.status === 404) {
    return "missing";
  }

  if (response.status === 401 || response.status === 403 || isRedirect(response.status)) {
    return "blocked";
  }

  if (!response.ok) {
    return "error";
  }

  if (!contentType || !isSupportedContentType(contentType)) {
    return "unsupported_content_type";
  }

  if (body.bytes.byteLength === 0 || normalizeWhitespace(decodeBody(body.bytes)) === "") {
    return "empty";
  }

  return "reachable";
}

function createWarnings({
  body,
  contentType,
  response,
  status,
}: {
  body: CappedBody;
  contentType: string | undefined;
  response: Response;
  status: PublicDiscoveryStatus;
}): string[] {
  const warnings: string[] = [];

  if (status !== "reachable") {
    warnings.push(discoveryStatusSummary(status));
  }

  if (isRedirect(response.status)) {
    warnings.push("Redirect response was not followed.");
  }

  if (body.oversized) {
    warnings.push(
      `Response exceeded ${PUBLIC_DISCOVERY_MAX_RESPONSE_BYTES} byte cap and was truncated.`,
    );
  }

  if (response.ok && contentType && !isSupportedContentType(contentType)) {
    warnings.push(`Unsupported content type: ${contentType}.`);
  }

  if (response.ok && !contentType) {
    warnings.push("Missing content type header.");
  }

  return warnings;
}

function createSafeSnippet(
  body: Buffer,
  contentType: string | undefined,
  status: PublicDiscoveryStatus,
): string | undefined {
  if (status !== "reachable" || !contentType || !isSupportedContentType(contentType)) {
    return undefined;
  }

  return summarizeText(decodeBody(body), 280);
}

function createDiscoveryFindings(
  results: PublicDiscoveryCheckResult[],
): ScanFinding[] {
  return results
    .filter((result) => result.status !== "reachable")
    .map((result) => ({
      id: `finding-discovery-${result.path.replace(/[^a-z0-9]+/gi, "-")}`,
      severity: discoverySeverity(result),
      category: "agent_discovery",
      resourceType: "discovery_url",
      title: `Public discovery check flagged ${result.path}`,
      description: discoveryStatusSummary(result.status),
      evidence: {
        path: result.path,
        url: result.url,
        status: result.status,
        statusCode: result.statusCode ?? 0,
        contentType: result.contentType ?? "unknown",
        responseSizeBytes: result.responseSizeBytes,
        warnings: result.warnings,
      },
      recommendation: discoveryRecommendation(result),
      status: "open",
    }));
}

function calculateDiscoveryHealthScore(
  results: PublicDiscoveryCheckResult[],
): number {
  if (results.length === 0) {
    return 0;
  }

  const total = results.reduce((sum, result) => {
    return sum + discoveryStatusScore(result.status);
  }, 0);

  return Math.round(total / results.length);
}

function discoveryStatusScore(status: PublicDiscoveryStatus): number {
  const scores: Record<PublicDiscoveryStatus, number> = {
    reachable: 100,
    missing: 25,
    empty: 20,
    blocked: 10,
    timeout: 10,
    oversized: 40,
    unsupported_content_type: 25,
    error: 10,
  };

  return scores[status];
}

function discoverySeverity(result: PublicDiscoveryCheckResult): "info" | "low" | "medium" {
  if (result.status === "missing" && isOptionalAgentFile(result.path)) {
    return "low";
  }

  if (result.status === "oversized" || result.status === "unsupported_content_type") {
    return "medium";
  }

  if (result.status === "blocked" || result.status === "timeout" || result.status === "error") {
    return "medium";
  }

  return "low";
}

function discoveryRecommendation(result: PublicDiscoveryCheckResult): string {
  if (result.status === "missing" && isOptionalAgentFile(result.path)) {
    return "Treat this as an optional merchant-reviewed discovery-file opportunity, not as a ranking or traffic guarantee.";
  }

  if (result.status === "missing") {
    return "Review the public storefront configuration for this expected discovery URL.";
  }

  if (result.status === "blocked") {
    return "Verify whether storefront access rules intentionally block this public discovery URL.";
  }

  if (result.status === "oversized") {
    return "Keep discovery files bounded so agents and tools can fetch them predictably.";
  }

  if (result.status === "unsupported_content_type") {
    return "Serve discovery files with a plain text, markdown, or XML content type.";
  }

  if (result.status === "timeout") {
    return "Retry later and keep public discovery responses fast enough for bounded checks.";
  }

  return "Review the public discovery URL and keep any merchant-facing fix workflow explicit.";
}

function isOptionalAgentFile(path: PublicDiscoveryPath): boolean {
  return path === "/agents.md" || path === "/llms.txt" || path === "/llms-full.txt";
}

function discoveryStatusSummary(status: PublicDiscoveryStatus): string {
  const summaries: Record<PublicDiscoveryStatus, string> = {
    reachable: "Discovery URL is reachable with a supported content type.",
    missing: "Discovery URL returned 404.",
    empty: "Discovery URL returned an empty response.",
    blocked: "Discovery URL was blocked or redirected and was not followed.",
    timeout: "Discovery URL timed out within the bounded request window.",
    oversized: "Discovery URL exceeded the bounded response-size cap.",
    unsupported_content_type:
      "Discovery URL responded with a content type outside this slice's allowlist.",
    error: "Discovery URL returned an unexpected error response.",
  };

  return summaries[status];
}

function createErrorResult({
  durationMs,
  path,
  status,
  url,
  warning,
}: {
  durationMs: number;
  path: PublicDiscoveryPath;
  status: PublicDiscoveryStatus;
  url: string;
  warning: string;
}): PublicDiscoveryCheckResult {
  return {
    path,
    url,
    status,
    reachable: false,
    responseSizeBytes: 0,
    warnings: [warning],
    durationMs,
  };
}

function isRedirect(statusCode: number): boolean {
  return statusCode >= 300 && statusCode < 400;
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}

function isSupportedContentType(contentType: string): boolean {
  const baseContentType = contentType.split(";")[0]?.trim().toLowerCase();

  return SUPPORTED_CONTENT_TYPES.includes(baseContentType);
}

function normalizeContentType(contentType: string | null): string | undefined {
  return contentType?.trim().toLowerCase() || undefined;
}

function decodeBody(body: Buffer): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(body);
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

function hashBuffer(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}
