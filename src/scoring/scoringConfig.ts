// Scoring Configuration and Factor Weights Documentation
// NOTE: This is an explainable, deterministic baseline scoring engine, NOT a machine learning or probabilistic model.
// Factor weights and thresholds are strictly documented and configurable.

export interface ScoringEngineConfig {
  // Thresholds for confidence levels
  confidenceThresholds: {
    high: number; // >= 75%
    medium: number; // >= 50%
    low: number; // >= 25%
    minimumForDefinitiveRanking: number; // 40%: Below this, score is 'Insufficient safety data'
  };

  // Factor weights for the Safety Indicator Score (Sum to 1.0)
  safetyWeights: {
    lighting: number; // 0.30 - verified functional lighting
    roadClassification: number; // 0.25 - arterial/frequented vs secluded rural dirt track
    facilityProximity: number; // 0.20 - proximity to open public safe havens (police, hospitals, transit)
    verifiedCommunityFeedback: number; // 0.15 - verified community hazard/safety reports
    districtContext: number; // 0.10 - macro regional context (never extrapolated to street level)
  };

  // Weights for Data Confidence Score (Sum to 1.0)
  confidenceWeights: {
    routeCoverage: number; // 0.35 - percentage of route segments with observable evidence
    freshness: number; // 0.25 - recency of evidence (< 180 days high, > 365 days stale)
    sourceQuality: number; // 0.20 - official/verified vs raw unverified
    geographicPrecision: number; // 0.15 - point/street segment vs broad district
    consistency: number; // 0.05 - absence of conflicting reports
  };

  // Freshness thresholds in days
  freshnessDaysLimit: {
    fresh: number; // <= 90 days
    acceptable: number; // <= 180 days
    stale: number; // > 365 days
  };
}

export const DEFAULT_SCORING_CONFIG: ScoringEngineConfig = {
  confidenceThresholds: {
    high: 75,
    medium: 50,
    low: 25,
    minimumForDefinitiveRanking: 40,
  },
  safetyWeights: {
    lighting: 0.30,
    roadClassification: 0.25,
    facilityProximity: 0.20,
    verifiedCommunityFeedback: 0.15,
    districtContext: 0.10,
  },
  confidenceWeights: {
    routeCoverage: 0.35,
    freshness: 0.25,
    sourceQuality: 0.20,
    geographicPrecision: 0.15,
    consistency: 0.05,
  },
  freshnessDaysLimit: {
    fresh: 90,
    acceptable: 180,
    stale: 365,
  },
};
