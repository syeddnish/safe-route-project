// Safety and confidence types for Safe Route AI
import { GeoCoordinate } from './route';

export type GeographicPrecision = 
  | 'exact_point' 
  | 'street_segment' 
  | 'neighborhood' 
  | 'district' 
  | 'unknown';

export type VerificationStatus = 
  | 'verified' 
  | 'unverified' 
  | 'rejected' 
  | 'pending_review';

export type EvidenceCategory =
  | 'streetlight'
  | 'road_type'
  | 'public_facility'
  | 'community_report'
  | 'district_crime_stat'
  | 'crowd_information';

export interface SafetyObservation {
  id: string;
  category: EvidenceCategory;
  coordinates: GeoCoordinate;
  geographicPrecision: GeographicPrecision;
  source: string; // e.g., 'osm_streetlights', 'municipal_gis', 'verified_community_reviewer'
  reportingPeriod?: string; // e.g. '2025-Q4'
  timestamp: string; // ISO 8601
  expirationDate?: string; // ISO 8601
  verificationStatus: VerificationStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  isStale: boolean;
  properties: {
    operationalStatus?: 'working' | 'broken' | 'flickering' | 'unknown';
    facilityType?: 'police_station' | 'hospital' | 'pharmacy' | 'bus_station' | 'metro' | 'open_shop';
    roadClassification?: 'primary' | 'secondary' | 'residential' | 'unpaved_rural' | 'isolated_path';
    hazardType?: 'poor_lighting' | 'deserted_stretch' | 'construction' | 'harassment_reported';
    severity?: 'low' | 'moderate' | 'high';
    details?: string;
  };
}

export type ConfidenceLevel = 'High' | 'Medium' | 'Low' | 'Insufficient' | 'Data unavailable';

export interface DataConfidenceBreakdown {
  coverageScore: number; // 0 - 100%
  freshnessScore: number; // 0 - 100%
  sourceQualityScore: number; // 0 - 100%
  geographicPrecisionScore: number; // 0 - 100%
  consistencyScore: number; // 0 - 100%
}

export interface KnownDataSourceInfo {
  name: string;
  category: string;
  lastUpdated?: string;
  geographicCoverage?: string;
  precision?: string;
  verificationStatus?: string;
}

export interface DataConfidenceEvaluation {
  score: number | null; // null when data is missing/unavailable to prevent fabricated percentages
  level: ConfidenceLevel;
  breakdown: DataConfidenceBreakdown;
  summaryText: string;
  missingDataItems: string[];
  staleDataItems: string[];
  conflictingItems: string[];
  knownSources: KnownDataSourceInfo[];
}

export type SafetyRankStatus = 
  | 'High Safety Indicators'
  | 'Moderate Safety Indicators'
  | 'Low Safety Indicators'
  | 'Insufficient safety data'
  | 'Data unavailable';

export interface SafetySubScores {
  lightingIndicator: number | null; // 0 - 100 or null if data is unavailable
  roadClassificationIndicator: number | null;
  facilityProximityIndicator: number | null;
  verifiedCommunityIndicator: number | null;
  districtContextIndicator: number | null;
  crimeIndicator?: number | null;
  crowdIndicator?: number | null;
}

export interface SafetyFactorDetail {
  id: string;
  name: string;
  category: EvidenceCategory | 'crime' | 'crowd';
  statusText: string; // e.g. "Data unavailable", "Verified records (2 working)", "1 user report"
  score: number | null; // null = 'Data unavailable'
  isAvailable: boolean;
  source?: string;
  lastUpdated?: string;
  geographicCoverage?: string;
  notes?: string;
}

export interface SafetyEvaluation {
  // If data confidence is below threshold or data is unavailable, safetyScore is null
  safetyScore: number | null; // null = Data unavailable; higher = more positive observable indicators
  status: SafetyRankStatus;
  isDefinitiveRankingAllowed: boolean;
  subScores: SafetySubScores;
  factorDetails?: SafetyFactorDetail[];
  explanations: string[];
  confidence: DataConfidenceEvaluation;
  isVillageOrRuralRoute: boolean;
  villageCoverageNotice?: string;
  disclaimer: string;
}

export interface CommunityReportInput {
  category: 'lighting_issue' | 'deserted_area' | 'safe_haven' | 'general_hazard';
  coordinates: GeoCoordinate;
  description: string;
  photoUrl?: string;
  contactConsent: boolean;
}
