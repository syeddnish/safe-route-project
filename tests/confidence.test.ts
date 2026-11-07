import { describe, it, expect } from 'vitest';
import { DataConfidenceEngine } from '../src/scoring/dataConfidenceEngine';
import { SafetyObservation } from '../src/types/safety';
import { RouteSegment } from '../src/types/route';

describe('DataConfidenceEngine', () => {
  const engine = new DataConfidenceEngine();
  const currentDate = new Date('2026-10-17T00:00:00Z');

  const mockSegments: RouteSegment[] = [
    {
      distanceMeters: 500,
      durationSeconds: 360,
      roadType: 'primary',
      safetyObservationsCount: 2,
      coordinates: [[77.21, 28.63], [77.215, 28.635]],
    },
    {
      distanceMeters: 500,
      durationSeconds: 360,
      roadType: 'residential',
      safetyObservationsCount: 0,
      coordinates: [[77.215, 28.635], [77.22, 28.64]],
    },
  ];

  it('penalizes freshness and identifies stale or expired observations', () => {
    const observations: SafetyObservation[] = [
      {
        id: 'stale-1',
        category: 'district_crime_stat',
        coordinates: [77.21, 28.63],
        geographicPrecision: 'district',
        source: 'police_gazette_2022',
        timestamp: '2023-01-01T00:00:00Z', // > 3 years old!
        expirationDate: '2024-01-01T00:00:00Z', // Expired
        verificationStatus: 'verified',
        isStale: true,
        properties: {},
      },
    ];

    const result = engine.evaluate(mockSegments, observations, currentDate);

    expect(result.staleDataItems.length).toBeGreaterThan(0);
    expect(result.staleDataItems[0]).toContain('expired');
    expect(result.breakdown.freshnessScore).toBeLessThan(50);
  });

  it('detects conflicting observations and records contradiction notice', () => {
    const observations: SafetyObservation[] = [
      {
        id: 'light-work',
        category: 'streetlight',
        coordinates: [77.21, 28.63],
        geographicPrecision: 'exact_point',
        source: 'osm',
        timestamp: '2026-09-01T00:00:00Z',
        verificationStatus: 'verified',
        isStale: false,
        properties: { operationalStatus: 'working' },
      },
      {
        id: 'light-broken',
        category: 'streetlight',
        coordinates: [77.21, 28.63],
        geographicPrecision: 'exact_point',
        source: 'community_report',
        timestamp: '2026-10-01T00:00:00Z',
        verificationStatus: 'verified',
        isStale: false,
        properties: { operationalStatus: 'broken' },
      },
    ];

    const result = engine.evaluate(mockSegments, observations, currentDate);

    expect(result.conflictingItems.length).toBeGreaterThan(0);
    expect(result.conflictingItems[0]).toContain('Conflicting streetlight status');
    expect(result.breakdown.consistencyScore).toBeLessThan(100);
  });

  it('clearly catalogues missing evidence items for transparency', () => {
    // Only road type observation present; missing streetlights, facilities, and community reports
    const observations: SafetyObservation[] = [
      {
        id: 'road-only',
        category: 'road_type',
        coordinates: [77.21, 28.63],
        geographicPrecision: 'street_segment',
        source: 'osm',
        timestamp: '2026-09-01T00:00:00Z',
        verificationStatus: 'verified',
        isStale: false,
        properties: { roadClassification: 'primary' },
      },
    ];

    const result = engine.evaluate(mockSegments, observations, currentDate);

    expect(result.missingDataItems.some(item => item.includes('streetlight'))).toBe(true);
    expect(result.missingDataItems.some(item => item.includes('safe havens'))).toBe(true);
  });

  it('counts verified observations near route geometry as segment coverage', () => {
    const segments = mockSegments.map((segment) => ({
      ...segment,
      safetyObservationsCount: 0,
    }));
    const observations: SafetyObservation[] = [{
      id: 'near-route',
      category: 'streetlight',
      coordinates: [77.212, 28.632],
      geographicPrecision: 'exact_point',
      source: 'municipal_audit',
      timestamp: '2026-10-01T00:00:00Z',
      verificationStatus: 'verified',
      isStale: false,
      properties: {},
    }];

    const result = engine.evaluate(segments, observations, currentDate);
    expect(result.breakdown.coverageScore).toBe(50);
  });

  it('does not calculate confidence from unverified or illustrative observations', () => {
    const observations: SafetyObservation[] = [{
      id: 'demo-observation',
      category: 'streetlight',
      coordinates: [77.212, 28.632],
      geographicPrecision: 'exact_point',
      source: 'illustrative_demo',
      timestamp: '2026-10-01T00:00:00Z',
      verificationStatus: 'unverified',
      isStale: false,
      properties: { operationalStatus: 'working' },
    }];

    const result = engine.evaluate(mockSegments, observations, currentDate);

    expect(result.score).toBeNull();
    expect(result.level).toBe('Data unavailable');
    expect(result.summaryText).toContain('illustrative or unverified');
    expect(result.missingDataItems).toContain(
      'Illustrative or unverified observations are excluded from confidence and safety scoring.'
    );
    expect(result.missingDataItems.some((item) => item.includes('streetlight'))).toBe(true);
  });
});
