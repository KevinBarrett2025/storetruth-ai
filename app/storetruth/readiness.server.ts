import type { ProductReadinessScore, ReadinessScores } from "./types";

export function calculateProductReadinessScore(
  signals: ProductReadinessScore["signals"],
): number {
  const weights: Record<keyof ProductReadinessScore["signals"], number> = {
    titleClarity: 15,
    descriptionCompleteness: 25,
    variantClarity: 15,
    imageCoverage: 15,
    seoCoverage: 10,
    structuredAttributes: 20,
  };

  return Math.round(
    Object.entries(signals).reduce((total, [key, value]) => {
      return total + value * weights[key as keyof typeof weights];
    }, 0),
  );
}

export function calculateOverallReadinessScore(
  scores: Omit<ReadinessScores, "overall">,
): number {
  const weightedScore =
    scores.products * 0.35 +
    scores.policyFaq * 0.2 +
    scores.aiQuestionCoverage * 0.2 +
    scores.agentDiscovery * 0.15 -
    scores.riskPenalty * 0.1;

  return Math.max(0, Math.min(100, Math.round(weightedScore)));
}
