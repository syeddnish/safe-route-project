// Safety Observations Service
// Fetches observations from Supabase or returns clearly labelled illustrative mock observations in demo mode.

import { supabase, isSupabaseConfigured } from './client';
import { SafetyObservation } from '../../types/safety';
import { GeoCoordinate } from '../../types/route';
import { isCoordinateNearLine } from '../../utils/geography';

// Illustrative mock observations are never verified evidence and must not affect route scores.
export const DEMO_URBAN_OBSERVATIONS: SafetyObservation[] = [
  {
    id: 'demo-obs-light-1',
    category: 'streetlight',
    coordinates: [77.2200, 28.6360],
    geographicPrecision: 'exact_point',
    source: 'illustrative_demo',
    timestamp: '2026-08-15T10:00:00Z',
    expirationDate: '2027-08-15T10:00:00Z',
    verificationStatus: 'unverified',
    isStale: false,
    properties: {
      operationalStatus: 'working',
      details: 'Illustrative demo only: sample streetlight observation.',
    },
  },
  {
    id: 'demo-obs-light-2',
    category: 'streetlight',
    coordinates: [77.2260, 28.6410],
    geographicPrecision: 'exact_point',
    source: 'illustrative_demo',
    timestamp: '2026-07-20T10:00:00Z',
    verificationStatus: 'unverified',
    isStale: false,
    properties: {
      operationalStatus: 'working',
    },
  },
  {
    id: 'demo-obs-light-3-broken',
    category: 'streetlight',
    coordinates: [77.2185, 28.6345],
    geographicPrecision: 'exact_point',
    source: 'illustrative_demo',
    timestamp: '2026-09-01T14:30:00Z',
    verificationStatus: 'unverified',
    isStale: false,
    properties: {
      operationalStatus: 'broken',
      details: 'Illustrative demo only: sample lighting issue.',
    },
  },
  {
    id: 'demo-obs-facility-police',
    category: 'public_facility',
    coordinates: [77.2280, 28.6430],
    geographicPrecision: 'exact_point',
    source: 'illustrative_demo',
    timestamp: '2026-01-10T00:00:00Z',
    verificationStatus: 'unverified',
    isStale: false,
    properties: {
      facilityType: 'police_station',
      details: 'Illustrative demo only: sample public facility.',
    },
  },
  {
    id: 'demo-obs-facility-hospital',
    category: 'public_facility',
    coordinates: [77.2240, 28.6390],
    geographicPrecision: 'exact_point',
    source: 'illustrative_demo',
    timestamp: '2026-02-15T00:00:00Z',
    verificationStatus: 'unverified',
    isStale: false,
    properties: {
      facilityType: 'hospital',
      details: 'Illustrative demo only: sample healthcare facility.',
    },
  },
  {
    id: 'demo-obs-road-arterial',
    category: 'road_type',
    coordinates: [77.2220, 28.6370],
    geographicPrecision: 'street_segment',
    source: 'illustrative_demo',
    timestamp: '2026-06-01T00:00:00Z',
    verificationStatus: 'unverified',
    isStale: false,
    properties: {
      roadClassification: 'primary',
      details: 'Illustrative demo only: sample road classification.',
    },
  },
  {
    id: 'demo-obs-stale-stat',
    category: 'district_crime_stat',
    coordinates: [77.2200, 28.6350],
    geographicPrecision: 'district',
    source: 'illustrative_demo',
    reportingPeriod: '2023-Annual',
    timestamp: '2024-01-01T00:00:00Z',
    expirationDate: '2025-01-01T00:00:00Z', // EXPIRED!
    verificationStatus: 'unverified',
    isStale: true,
    properties: {
      details: 'Illustrative demo only: sample district context.',
    },
  },
];

// In the village scenario, virtually zero observations exist, accurately representing rural data gaps
export const DEMO_VILLAGE_OBSERVATIONS: SafetyObservation[] = [
  // Only 1 unverified raw observation at the village boundary; rest is completely unmapped
  {
    id: 'demo-village-obs-1',
    category: 'road_type',
    coordinates: [73.8850, 18.8470],
    geographicPrecision: 'street_segment',
    source: 'illustrative_demo',
    timestamp: '2025-03-10T00:00:00Z',
    verificationStatus: 'unverified',
    isStale: true,
    properties: {
      roadClassification: 'unpaved_rural',
      details: 'Illustrative demo only: sample rural road classification.',
    },
  },
];

export class SafetyService {
  /**
   * Fetches safety observations within the route corridor
   */
  public static async fetchCorridorObservations(
    corridorCoords: GeoCoordinate[],
    isVillageDemo: boolean = false
  ): Promise<SafetyObservation[]> {
    if (corridorCoords.length === 0) {
      return [];
    }

    corridorCoords.forEach(([longitude, latitude]) => {
      if (
        !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
        !Number.isFinite(latitude) || latitude < -90 || latitude > 90
      ) {
        throw new Error('Route contains invalid geographic coordinates.');
      }
    });

    if (!isSupabaseConfigured || !supabase) {
      // Return illustrative demo observations
      return isVillageDemo ? DEMO_VILLAGE_OBSERVATIONS : DEMO_URBAN_OBSERVATIONS;
    }

    const [minLon, maxLon, minLat, maxLat] = corridorCoords.reduce(
      ([minX, maxX, minY, maxY], [longitude, latitude]) => {
        return [
          Math.min(minX, longitude),
          Math.max(maxX, longitude),
          Math.min(minY, latitude),
          Math.max(maxY, latitude),
        ];
      },
      [180, -180, 90, -90]
    );

    // A small bounding box buffer; the route shape is further filtered by safety scoring.
    const buffer = 0.005;
    const { data, error } = await supabase
      .from('safety_observations')
      .select('*')
      .eq('verification_status', 'verified')
      .gte('longitude', Math.max(-180, minLon - buffer))
      .lte('longitude', Math.min(180, maxLon + buffer))
      .gte('latitude', Math.max(-90, minLat - buffer))
      .lte('latitude', Math.min(90, maxLat + buffer))
      .order('created_at', { ascending: false })
      .range(0, 499);

    if (error) {
      throw new Error(`Failed to load safety observations: ${error.message}`);
    }

    const now = new Date();
    return (data || []).map((row) => ({
        id: row.id,
        category: row.category as SafetyObservation['category'],
        coordinates: [row.longitude, row.latitude] as GeoCoordinate,
        geographicPrecision: row.geographic_precision as SafetyObservation['geographicPrecision'],
        source: row.source_name,
        reportingPeriod: row.reporting_period ?? undefined,
        timestamp: row.created_at,
        expirationDate: row.expires_at ?? undefined,
        verificationStatus: row.verification_status,
        verifiedBy: row.verified_by ?? undefined,
        verifiedAt: row.verified_at ?? undefined,
        isStale: row.expires_at ? new Date(row.expires_at) < now : false,
        properties: (row.properties as SafetyObservation['properties']) || {},
      })).filter((observation) =>
        isCoordinateNearLine(observation.coordinates, corridorCoords, 300)
      );
  }
}
