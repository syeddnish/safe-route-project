// Data Confidence Engine
// Strictly separate from route danger/safety estimates.
// Evaluates coverage, freshness, source quality, geographic precision, and consistency.
// Missing data lowers confidence rather than artificially altering danger assumptions.
// NEVER displays fabricated confidence percentages when data is missing or unverified.

import { 
  SafetyObservation, 
  DataConfidenceEvaluation, 
  DataConfidenceBreakdown, 
  ConfidenceLevel,
  KnownDataSourceInfo 
} from '../types/safety';
import { RouteSegment } from '../types/route';
import { DEFAULT_SCORING_CONFIG, ScoringEngineConfig } from './scoringConfig';
import { isCoordinateNearLine } from '../utils/geography';

export class DataConfidenceEngine {
  private config: ScoringEngineConfig;

  constructor(config: ScoringEngineConfig = DEFAULT_SCORING_CONFIG) {
    this.config = config;
  }

  public evaluate(
    segments: RouteSegment[],
    observations: SafetyObservation[],
    currentTime: Date = new Date()
  ): DataConfidenceEvaluation {
    const missingDataItems: string[] = [];
    const staleDataItems: string[] = [];
    const conflictingItems: string[] = [];
    const knownSourcesMap = new Map<string, KnownDataSourceInfo>();

    const hasCurrentVerifiedObservation = (category: SafetyObservation['category']) =>
      observations.some((observation) =>
        observation.category === category &&
        observation.verificationStatus === 'verified' &&
        !observation.isStale &&
        (!observation.expirationDate || Date.parse(observation.expirationDate) > currentTime.getTime())
      );

    // Unverified/demo records are not evidence that a category has been surveyed.
    const hasLightingObs = hasCurrentVerifiedObservation('streetlight');
    const hasFacilityObs = hasCurrentVerifiedObservation('public_facility');
    const hasRoadTypeObs = hasCurrentVerifiedObservation('road_type');
    const hasCommunityObs = hasCurrentVerifiedObservation('community_report');
    const hasCrimeObs = hasCurrentVerifiedObservation('district_crime_stat');

    if (!hasLightingObs) {
      missingDataItems.push('No streetlight inventory: No verified lighting survey or municipal telemetry indexed along this route. Data unavailable.');
    }
    if (!hasFacilityObs) {
      missingDataItems.push('No verified public safe havens (police stations, hospitals, 24/7 facilities) mapped within route corridor. Data unavailable.');
    }
    if (!hasRoadTypeObs) {
      missingDataItems.push('Road infrastructure tags: Surface quality and lane characteristics are partially unclassified in open map data.');
    }
    if (!hasCommunityObs) {
      missingDataItems.push('Community reports: No verified user-submitted reports recorded for this path.');
    }
    if (!hasCrimeObs) {
      missingDataItems.push('Crime statistics: Data unavailable. No official crime statistics connected to this corridor. Missing data does NOT imply safety.');
    }
    missingDataItems.push('Live crowd density: Data unavailable. No lawful real-time crowd data provider configured; counts are not fabricated.');

    // Demo and unverified records cannot produce a numeric confidence estimate.
    if (!observations.some((observation) => observation.verificationStatus === 'verified')) {
      const hasUnverifiedObservations = observations.length > 0;
      if (hasUnverifiedObservations) {
        missingDataItems.push('Illustrative or unverified observations are excluded from confidence and safety scoring.');
      }
      return {
        score: null, // Null to prevent displaying a fabricated percentage
        level: 'Data unavailable',
        breakdown: {
          coverageScore: 0,
          freshnessScore: 0,
          sourceQualityScore: 0,
          geographicPrecisionScore: 0,
          consistencyScore: 100,
        },
        summaryText: hasUnverifiedObservations
          ? 'Data unavailable: Only illustrative or unverified observations are available for this corridor. They do not establish real-world safety or confidence.'
          : 'Data unavailable: No verified municipal telemetry, streetlight inventory, or local safety records are recorded for this corridor. Safe Route AI does not fabricate confidence percentages or safety ratings without verified data.',
        missingDataItems,
        staleDataItems,
        conflictingItems,
        knownSources: [],
      };
    }

    // 1. Route Coverage Score
    const totalSegments = Math.max(1, segments.length);
    const coveredSegments = segments.filter((segment) =>
      segment.safetyObservationsCount > 0 ||
      observations.some((observation) =>
        observation.verificationStatus === 'verified' &&
        isCoordinateNearLine(observation.coordinates, segment.coordinates, 300)
      )
    ).length;
    const rawCoverage = (coveredSegments / totalSegments) * 100;

    if (rawCoverage < 20) {
      missingDataItems.push(`Data coverage gap: ${Math.round(100 - rawCoverage)}% of the route corridor lacks verifiable safety records.`);
    }

    // 2. Freshness Score
    let freshnessSum = 0;
    for (const obs of observations) {
      const obsDate = new Date(obs.timestamp);
      const diffMs = currentTime.getTime() - obsDate.getTime();
      const diffDays = Math.max(0, diffMs / (1000 * 60 * 60 * 24));

      // Track known data source metadata
      if (!knownSourcesMap.has(obs.source)) {
        knownSourcesMap.set(obs.source, {
          name: obs.source,
          category: obs.category,
          lastUpdated: obs.timestamp ? obs.timestamp.split('T')[0] : undefined,
          precision: obs.geographicPrecision,
          verificationStatus: obs.verificationStatus,
        });
      }

      if (obs.expirationDate && new Date(obs.expirationDate) < currentTime) {
        staleDataItems.push(`Record [${obs.category} from ${obs.source}] expired on ${obs.expirationDate.split('T')[0]}.`);
        freshnessSum += 10;
      } else if (diffDays > this.config.freshnessDaysLimit.stale) {
        staleDataItems.push(`Record [${obs.category}] is ${Math.round(diffDays)} days old (> 1 year) and requires re-surveying.`);
        freshnessSum += 25;
      } else if (diffDays > this.config.freshnessDaysLimit.acceptable) {
        freshnessSum += 60;
      } else if (diffDays <= this.config.freshnessDaysLimit.fresh) {
        freshnessSum += 100;
      } else {
        freshnessSum += 80;
      }
    }
    const freshnessScore = freshnessSum / observations.length;

    // 3. Source Quality Score
    let qualitySum = 0;
    for (const obs of observations) {
      if (obs.verificationStatus === 'verified') {
        if (obs.source.includes('municipal') || obs.source.includes('official') || obs.source.includes('gis')) {
          qualitySum += 100;
        } else {
          qualitySum += 85;
        }
      } else if (obs.verificationStatus === 'pending_review') {
        qualitySum += 40;
      } else if (obs.verificationStatus === 'unverified') {
        qualitySum += 30;
      } else {
        qualitySum += 0;
      }
    }
    const sourceQualityScore = qualitySum / observations.length;

    // 4. Geographic Precision Score
    let precisionSum = 0;
    for (const obs of observations) {
      switch (obs.geographicPrecision) {
        case 'exact_point':
          precisionSum += 100;
          break;
        case 'street_segment':
          precisionSum += 80;
          break;
        case 'neighborhood':
          precisionSum += 50;
          break;
        case 'district':
          precisionSum += 25;
          break;
        case 'unknown':
        default:
          precisionSum += 10;
          break;
      }
    }
    const geographicPrecisionScore = precisionSum / observations.length;

    // 5. Consistency Score
    let conflictPenalties = 0;
    const brokenLights = observations.filter(o => o.category === 'streetlight' && o.properties.operationalStatus === 'broken');
    const workingLights = observations.filter(o => o.category === 'streetlight' && o.properties.operationalStatus === 'working');
    if (brokenLights.length > 0 && workingLights.length > 0) {
      conflictPenalties += 20;
      conflictingItems.push('Conflicting streetlight status: simultaneous records of working infrastructure and broken community reports.');
    }

    const consistencyScore = Math.max(0, 100 - conflictPenalties);

    // Compute composite weighted score
    const breakdown: DataConfidenceBreakdown = {
      coverageScore: Math.round(rawCoverage),
      freshnessScore: Math.round(freshnessScore),
      sourceQualityScore: Math.round(sourceQualityScore),
      geographicPrecisionScore: Math.round(geographicPrecisionScore),
      consistencyScore: Math.round(consistencyScore),
    };

    let compositeScore =
      breakdown.coverageScore * this.config.confidenceWeights.routeCoverage +
      breakdown.freshnessScore * this.config.confidenceWeights.freshness +
      breakdown.sourceQualityScore * this.config.confidenceWeights.sourceQuality +
      breakdown.geographicPrecisionScore * this.config.confidenceWeights.geographicPrecision +
      breakdown.consistencyScore * this.config.confidenceWeights.consistency;

    compositeScore = Math.round(Math.min(100, Math.max(0, compositeScore)));

    // Determine textual level
    let level: ConfidenceLevel = 'Insufficient';
    if (compositeScore >= this.config.confidenceThresholds.high) {
      level = 'High';
    } else if (compositeScore >= this.config.confidenceThresholds.medium) {
      level = 'Medium';
    } else if (compositeScore >= this.config.confidenceThresholds.low) {
      level = 'Low';
    } else {
      level = 'Insufficient';
    }

    let summaryText = '';
    if (level === 'Insufficient') {
      summaryText = 'Data confidence is insufficient. High uncertainty due to sparse local telemetry, unverified reports, or lack of geographic precision.';
    } else if (level === 'Low') {
      summaryText = 'Low data confidence: Several route sections lack verified survey points. Interpret indicators cautiously.';
    } else if (level === 'Medium') {
      summaryText = 'Moderate data confidence: Adequate coverage of street classification and municipal infrastructure, but some local reports are pending verification.';
    } else {
      summaryText = 'High data confidence: Fresh, verified, and geographically precise municipal and community observations cover this route.';
    }

    return {
      score: compositeScore,
      level,
      breakdown,
      summaryText,
      missingDataItems,
      staleDataItems,
      conflictingItems,
      knownSources: Array.from(knownSourcesMap.values()),
    };
  }
}
