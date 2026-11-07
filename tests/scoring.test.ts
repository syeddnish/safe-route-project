import { describe, it, expect } from 'vitest';
import { SafetyScoringEngine } from '../src/scoring/safetyScoringEngine';
import { RouteAlternative } from '../src/types/route';
import { SafetyObservation } from '../src/types/safety';

describe('SafetyScoringEngine', () => {
  const engine = new SafetyScoringEngine();

  const mockUrbanRoute: RouteAlternative = {
    id: 'route-urban',
    name: 'City Arterial Corridor',
    preference: 'safety_aware',
    summary: 'Via Main Avenue',
    distanceKm: 2.5,
    durationMinutes: 30,
    geometry: {
      type: 'LineString',
      coordinates: [[77.21, 28.63], [77.22, 28.64]],
    },
    segments: [
      {
        distanceMeters: 1200,
        durationSeconds: 900,
        roadType: 'primary',
        streetName: 'Main Avenue',
        safetyObservationsCount: 3,
        coordinates: [[77.21, 28.63], [77.215, 28.635]],
      },
      {
        distanceMeters: 1300,
        durationSeconds: 900,
        roadType: 'secondary',
        streetName: 'Hospital Boulevard',
        safetyObservationsCount: 2,
        coordinates: [[77.215, 28.635], [77.22, 28.64]],
      },
    ],
    isSampleIllustrative: false,
    routingProvider: 'OpenRouteService',
  };

  const mockVillageRoute: RouteAlternative = {
    id: 'route-village',
    name: 'Rural Village Link Track',
    preference: 'shortest',
    summary: 'Via Unpaved Village Pathway',
    distanceKm: 3.8,
    durationMinutes: 50,
    geometry: {
      type: 'LineString',
      coordinates: [[73.88, 18.84], [73.91, 18.86]],
    },
    segments: [
      {
        distanceMeters: 2000,
        durationSeconds: 1500,
        roadType: 'unpaved_rural',
        streetName: 'Gram Link Road',
        safetyObservationsCount: 0, // NO DATA
        coordinates: [[73.88, 18.84], [73.89, 18.85]],
      },
      {
        distanceMeters: 1800,
        durationSeconds: 1500,
        roadType: 'isolated_path',
        streetName: 'Field Boundary Track',
        safetyObservationsCount: 0, // NO DATA
        coordinates: [[73.89, 18.85], [73.91, 18.86]],
      },
    ],
    isSampleIllustrative: true,
    routingProvider: 'Demo',
  };

  it('evaluates high safety indicators when fresh, verified lighting and facilities exist', () => {
    const verifiedObservations: SafetyObservation[] = [
      {
        id: 'obs-1',
        category: 'streetlight',
        coordinates: [77.212, 28.632],
        geographicPrecision: 'exact_point',
        source: 'municipal_audit',
        timestamp: '2026-09-01T00:00:00Z',
        verificationStatus: 'verified',
        isStale: false,
        properties: { operationalStatus: 'working' },
      },
      {
        id: 'obs-2',
        category: 'public_facility',
        coordinates: [77.218, 28.638],
        geographicPrecision: 'exact_point',
        source: 'police_registry',
        timestamp: '2026-08-01T00:00:00Z',
        verificationStatus: 'verified',
        isStale: false,
        properties: { facilityType: 'police_station' },
      },
      {
        id: 'obs-3',
        category: 'road_type',
        coordinates: [77.215, 28.635],
        geographicPrecision: 'street_segment',
        source: 'osm_highways',
        timestamp: '2026-07-01T00:00:00Z',
        verificationStatus: 'verified',
        isStale: false,
        properties: { roadClassification: 'primary' },
      },
    ];

    const result = engine.evaluateRoute(mockUrbanRoute, verifiedObservations, new Date('2026-10-17T00:00:00Z'));

    expect(result.isDefinitiveRankingAllowed).toBe(true);
    expect(result.safetyScore).toBeGreaterThanOrEqual(70);
    expect(result.status).toBe('High Safety Indicators');
    expect(result.subScores.lightingIndicator).toBe(100);
    expect(result.explanations.length).toBeGreaterThan(0);
    expect(result.disclaimer).toContain('No route is guaranteed safe');
  });

  it('suppresses definitive ranking and marks status as unavailable when observations are absent', () => {
    // Zero observations available
    const emptyObservations: SafetyObservation[] = [];

    const result = engine.evaluateRoute(mockVillageRoute, emptyObservations, new Date('2026-10-17T00:00:00Z'));

    // With zero observations, score is null and status should reflect data being unavailable
    expect(result.status === 'Data unavailable' || result.status === 'Insufficient safety data').toBe(true);
    expect(result.safetyScore).toBeNull();
    expect(result.isDefinitiveRankingAllowed).toBe(false);
    expect(result.isVillageOrRuralRoute).toBe(true);
    expect(result.villageCoverageNotice).toBeDefined();
    // With zero observations, score is null (not a fabricated number) and level indicates no data
    expect(result.confidence.score === null || (typeof result.confidence.score === 'number' && result.confidence.score < 40)).toBe(true);
    expect(result.confidence.level === 'Data unavailable' || result.confidence.level === 'Insufficient').toBe(true);
  });

  it('does not score a route from unverified observations', () => {
    const singleObs: SafetyObservation[] = [
      {
        id: 'obs-single',
        category: 'streetlight',
        coordinates: [77.21, 28.63],
        geographicPrecision: 'unknown',
        source: 'raw_crowdsource',
        timestamp: '2026-09-01T00:00:00Z',
        verificationStatus: 'unverified',
        isStale: false,
        properties: { operationalStatus: 'working' },
      },
    ];

    const result = engine.evaluateRoute(mockUrbanRoute, singleObs, new Date('2026-10-17T00:00:00Z'));

    expect(result.confidence.score).toBeNull();
    expect(result.safetyScore).toBeNull();
    expect(result.status).toBe('Data unavailable');
    expect(result.isDefinitiveRankingAllowed).toBe(false);
  });

  it('does not invent road, facility, or community indicators when those evidence types are unavailable', () => {
    const routeWithUnknownRoads: RouteAlternative = {
      ...mockUrbanRoute,
      segments: mockUrbanRoute.segments.map((segment) => ({
        ...segment,
        roadType: 'unknown',
        safetyObservationsCount: 0,
      })),
    };
    const lightingObservations: SafetyObservation[] = [
      {
        id: 'verified-light-a',
        category: 'streetlight',
        coordinates: [77.212, 28.632],
        geographicPrecision: 'exact_point',
        source: 'municipal_audit',
        timestamp: '2026-10-01T00:00:00Z',
        verificationStatus: 'verified',
        isStale: false,
        properties: { operationalStatus: 'working' },
      },
      {
        id: 'verified-light-b',
        category: 'streetlight',
        coordinates: [77.218, 28.638],
        geographicPrecision: 'exact_point',
        source: 'municipal_audit',
        timestamp: '2026-10-01T00:00:00Z',
        verificationStatus: 'verified',
        isStale: false,
        properties: { operationalStatus: 'working' },
      },
      {
        id: 'unverified-broken-light',
        category: 'streetlight',
        coordinates: [77.215, 28.635],
        geographicPrecision: 'exact_point',
        source: 'unverified_submission',
        timestamp: '2026-10-10T00:00:00Z',
        verificationStatus: 'unverified',
        isStale: false,
        properties: { operationalStatus: 'broken' },
      },
      {
        id: 'stale-broken-light',
        category: 'streetlight',
        coordinates: [77.215, 28.635],
        geographicPrecision: 'exact_point',
        source: 'old_audit',
        timestamp: '2024-01-01T00:00:00Z',
        verificationStatus: 'verified',
        isStale: false,
        properties: { operationalStatus: 'broken' },
      },
    ];

    const result = engine.evaluateRoute(
      routeWithUnknownRoads,
      lightingObservations,
      new Date('2026-10-17T00:00:00Z')
    );

    expect(result.isDefinitiveRankingAllowed).toBe(true);
    expect(result.subScores.roadClassificationIndicator).toBeNull();
    expect(result.subScores.facilityProximityIndicator).toBeNull();
    expect(result.subScores.verifiedCommunityIndicator).toBeNull();
    expect(result.subScores.lightingIndicator).toBe(100);
  });
});
