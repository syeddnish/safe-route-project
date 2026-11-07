// Explainable, Deterministic Baseline Safety Scoring Engine
// NOTE: This is a rule-based heuristic indicator based on documented evidence weights, NOT machine learning.
// It explicitly separates data confidence from safety indicators.
// It will NEVER claim any route is guaranteed safe.

import { 
  SafetyObservation, 
  SafetyEvaluation, 
  SafetySubScores, 
  SafetyRankStatus 
} from '../types/safety';
import { RouteAlternative } from '../types/route';
import { DataConfidenceEngine } from './dataConfidenceEngine';
import { DEFAULT_SCORING_CONFIG, ScoringEngineConfig } from './scoringConfig';

export class SafetyScoringEngine {
  private config: ScoringEngineConfig;
  private confidenceEngine: DataConfidenceEngine;

  constructor(config: ScoringEngineConfig = DEFAULT_SCORING_CONFIG) {
    this.config = config;
    this.confidenceEngine = new DataConfidenceEngine(config);
  }

  private isUsableObservation(observation: SafetyObservation, currentTime: Date): boolean {
    if (observation.verificationStatus !== 'verified' || observation.isStale) {
      return false;
    }

    const timestamp = Date.parse(observation.timestamp);
    if (!Number.isFinite(timestamp)) {
      return false;
    }
    if (observation.expirationDate) {
      const expiration = Date.parse(observation.expirationDate);
      if (!Number.isFinite(expiration) || expiration <= currentTime.getTime()) {
        return false;
      }
    }

    const ageDays = Math.max(0, (currentTime.getTime() - timestamp) / (1000 * 60 * 60 * 24));
    return ageDays <= this.config.freshnessDaysLimit.stale;
  }

  public evaluateRoute(
    route: RouteAlternative,
    observations: SafetyObservation[],
    currentTime: Date = new Date(),
    villageOrRuralContext: boolean = false
  ): SafetyEvaluation {
    const explanations: string[] = [];

    // 1. Calculate Data Confidence first
    const confidence = this.confidenceEngine.evaluate(route.segments, observations, currentTime);

    // Detect if this is a rural or village route
    const isVillageOrRuralRoute = villageOrRuralContext || route.segments.some(
      s => s.roadType === 'unpaved_rural' || 
           s.roadType === 'isolated_path' || 
           s.roadType === 'track' ||
           s.streetName?.toLowerCase().includes('village') ||
           s.streetName?.toLowerCase().includes('gram') ||
           s.streetName?.toLowerCase().includes('rural')
    );

    // If data confidence is null (no data at all) or below the minimum threshold, avoid definitive ranking
    if (confidence.score === null || confidence.score < this.config.confidenceThresholds.minimumForDefinitiveRanking) {
      explanations.push(
        'Due to sparse or unverified data (confidence below 40%), a definitive safety ranking cannot be responsibly computed.'
      );
      if (isVillageOrRuralRoute) {
        explanations.push(
          'Rural/village route detected: Public streetlight inventory and facility mapping are unrecorded in official databases.'
        );
      }
      explanations.push(
        'Missing crime data in this sector does NOT prove the area is safe.'
      );

      return {
        safetyScore: null,
        status: confidence.score === null ? 'Data unavailable' : 'Insufficient safety data',
        isDefinitiveRankingAllowed: false,
        subScores: {
          lightingIndicator: null,
          roadClassificationIndicator: null,
          facilityProximityIndicator: null,
          verifiedCommunityIndicator: null,
          districtContextIndicator: null,
        },
        explanations,
        confidence,
        isVillageOrRuralRoute,
        villageCoverageNotice: isVillageOrRuralRoute
          ? 'Rural route alert: Safety indicators are currently unindexed for this sector. Rural roads may lack night illumination or rapid public emergency facilities.'
          : undefined,
        disclaimer:
          'DISCLAIMER: Safety indicators are heuristic estimations derived solely from available evidence. No route is guaranteed safe. Missing evidence must never be interpreted as absence of risk.',
      };
    }

    // 2. Compute explainable sub-scores (0 - 100)
    // A. Lighting Indicator
    const lightingObs = observations.filter(o =>
      o.category === 'streetlight' && this.isUsableObservation(o, currentTime)
    );
    let lightingIndicator: number | null = null;

    if (lightingObs.length === 0) {
      lightingIndicator = null;
      explanations.push('Lighting: No verified active lighting surveys found for this route.');
    } else {
      const working = lightingObs.filter(o => o.properties.operationalStatus === 'working').length;
      const broken = lightingObs.filter(o => o.properties.operationalStatus === 'broken').length;
      const total = lightingObs.length;

      // Note: A mapped streetlight in OSM does not prove it is functional unless verified
      const operationalRate = (working / total);
      lightingIndicator = Math.round(operationalRate * 100);
      if (broken > 0) {
        lightingIndicator = Math.max(0, lightingIndicator - broken * 15);
        explanations.push(`Lighting: ${broken} verified broken or dark streetlights recorded.`);
      }
      if (operationalRate > 0.7) {
        explanations.push(`Lighting: High density of operational streetlights recorded (${Math.round(operationalRate * 100)}%).`);
      }
    }

    // B. Road Classification Indicator
    let roadScoreSum = 0;
    let classifiedSegments = 0;
    for (const segment of route.segments) {
      if (!segment.roadType || segment.roadType === 'unknown') {
        continue;
      }
      classifiedSegments += 1;
      switch (segment.roadType) {
        case 'primary':
        case 'trunk':
        case 'motorway':
          roadScoreSum += 90; // High visibility, regular motorized traffic
          break;
        case 'secondary':
        case 'tertiary':
          roadScoreSum += 75;
          break;
        case 'residential':
          roadScoreSum += 60;
          break;
        case 'unpaved_rural':
        case 'track':
          roadScoreSum += 35; // Lower vehicular presence and potential assistance
          break;
        case 'isolated_path':
        case 'footway_dark':
          roadScoreSum += 20; // Isolated footpaths
          break;
        default:
          roadScoreSum += 50;
          break;
      }
    }
    const roadClassificationIndicator = classifiedSegments > 0
      ? Math.round(roadScoreSum / classifiedSegments)
      : null;
    if (roadClassificationIndicator !== null && roadClassificationIndicator >= 75) {
      explanations.push('Road Infrastructure: Major arterial or secondary streets with active vehicular circulation.');
    } else if (roadClassificationIndicator !== null && roadClassificationIndicator < 40) {
      explanations.push('Road Infrastructure: Route traverses secluded paths, narrow unpaved tracks, or unclassified rural corridors.');
    } else if (roadClassificationIndicator === null) {
      explanations.push('Road Infrastructure: Road classification data is unavailable for this route.');
    }

    // C. Public Facility Proximity
    const facilityObs = observations.filter(o =>
      o.category === 'public_facility' && this.isUsableObservation(o, currentTime)
    );
    let facilityProximityIndicator: number | null = null;
    if (facilityObs.length === 0) {
      facilityProximityIndicator = null;
      explanations.push('Facilities: Data unavailable; no verified public facilities are mapped in the route corridor.');
    } else {
      let facilityScore = 40;
      const police = facilityObs.filter(f => f.properties.facilityType === 'police_station').length;
      const medical = facilityObs.filter(f => f.properties.facilityType === 'hospital' || f.properties.facilityType === 'pharmacy').length;
      const transit = facilityObs.filter(f => f.properties.facilityType === 'bus_station' || f.properties.facilityType === 'metro').length;

      facilityScore += police * 25 + medical * 15 + transit * 10;
      facilityProximityIndicator = Math.min(100, facilityScore);
      explanations.push(`Facilities: Near ${police} police post(s), ${medical} healthcare facility/pharmacy, and ${transit} transit hub(s).`);
    }

    // D. Verified Community Reports
    const verifiedReports = observations.filter(o =>
      o.category === 'community_report' && this.isUsableObservation(o, currentTime)
    );
    let verifiedCommunityIndicator: number | null = null;
    if (verifiedReports.length === 0) {
      verifiedCommunityIndicator = null;
      explanations.push('Community Reports: No verified community observations are available for this route.');
    } else {
      const hazards = verifiedReports.filter(r => r.properties.hazardType !== undefined).length;
      const safeHavens = verifiedReports.filter(r => r.properties.facilityType !== undefined || r.properties.operationalStatus === 'working').length;
      let communityScore = 50 + (safeHavens * 15) - (hazards * 25);
      verifiedCommunityIndicator = Math.min(100, Math.max(0, communityScore));
      if (hazards > 0) {
        explanations.push(`Community: ${hazards} verified hazard alert(s) on or near this corridor.`);
      }
    }

    // E. District Context (Macro, regional only)
    const districtObs = observations.filter(o =>
      o.category === 'district_crime_stat' && this.isUsableObservation(o, currentTime)
    );
    let districtContextIndicator: number | null = null;
    if (districtObs.length > 0) {
      districtContextIndicator = 55; // Neutral macro indicator; prompt explicitly forbids turning district rates into street-level claims
      explanations.push('Regional Context: Broad district-level statistical baseline referenced without extrapolating to micro street coordinates.');
    } else {
      districtContextIndicator = null;
    }

    // 3. Normalized Heuristic Composite
    // Dynamically adjust weights when certain sub-indicators are null
    let activeWeightSum = 0;
    let weightedSum = 0;

    if (lightingIndicator !== null) {
      weightedSum += lightingIndicator * this.config.safetyWeights.lighting;
      activeWeightSum += this.config.safetyWeights.lighting;
    }
    if (roadClassificationIndicator !== null) {
      weightedSum += roadClassificationIndicator * this.config.safetyWeights.roadClassification;
      activeWeightSum += this.config.safetyWeights.roadClassification;
    }
    if (facilityProximityIndicator !== null) {
      weightedSum += facilityProximityIndicator * this.config.safetyWeights.facilityProximity;
      activeWeightSum += this.config.safetyWeights.facilityProximity;
    }
    if (verifiedCommunityIndicator !== null) {
      weightedSum += verifiedCommunityIndicator * this.config.safetyWeights.verifiedCommunityFeedback;
      activeWeightSum += this.config.safetyWeights.verifiedCommunityFeedback;
    }
    if (districtContextIndicator !== null) {
      weightedSum += districtContextIndicator * this.config.safetyWeights.districtContext;
      activeWeightSum += this.config.safetyWeights.districtContext;
    }

    const normalizedScore = activeWeightSum > 0 ? Math.round(weightedSum / activeWeightSum) : null;

    let status: SafetyRankStatus = 'Insufficient safety data';
    if (normalizedScore !== null) {
      if (normalizedScore >= 70) {
        status = 'High Safety Indicators';
      } else if (normalizedScore >= 45) {
        status = 'Moderate Safety Indicators';
      } else {
        status = 'Low Safety Indicators';
      }
    }

    const subScores: SafetySubScores = {
      lightingIndicator,
      roadClassificationIndicator,
      facilityProximityIndicator,
      verifiedCommunityIndicator,
      districtContextIndicator,
    };

    return {
      safetyScore: normalizedScore,
      status,
      isDefinitiveRankingAllowed: true,
      subScores,
      explanations,
      confidence,
      isVillageOrRuralRoute,
      villageCoverageNotice: isVillageOrRuralRoute
        ? 'Rural route notice: Rural roads may feature unmapped segments and sparse lighting.'
        : undefined,
      disclaimer:
        'DISCLAIMER: Safety indicators are heuristic estimations derived solely from available public and verified community evidence. No route is guaranteed safe. Always stay alert and rely on personal judgment.',
    };
  }
}
