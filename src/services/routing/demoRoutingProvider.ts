// Demo / Illustrative Routing Provider
// Provides clearly labelled illustrative route alternatives when live API keys are not present.
// Explicitly marks all mock data as DEMO / ILLUSTRATIVE.

import { IRoutingProvider, RouteRequestParams } from './routingProvider';
import { RoutingResponse, RouteAlternative, RouteWaypoint, GeoCoordinate } from '../../types/route';

export const DEMO_PRESETS = {
  urban: {
    origin: {
      name: 'Central Metro Station (City Corridor)',
      address: 'Station Gate 2, Metro Line 1',
      coordinates: [77.2167, 28.6328] as GeoCoordinate,
    },
    destination: {
      name: 'Technology Park Campus',
      address: 'Main Boulevard, Sector 4',
      coordinates: [77.2350, 28.6480] as GeoCoordinate,
    },
  },
  village: {
    origin: {
      name: 'Khed Village Bus Stop (Rural Sector)',
      address: 'State Rural Road 14, Pune District',
      coordinates: [73.8820, 18.8450] as GeoCoordinate,
    },
    destination: {
      name: 'Gram Panchayat Hall / Community Center',
      address: 'Old Hamlet Ward 3, Khed Rural',
      coordinates: [73.9100, 18.8680] as GeoCoordinate,
    },
  },
};

export class DemoRoutingProvider implements IRoutingProvider {
  public readonly id = 'demo';
  public readonly name = 'Demo / Illustrative Routing Mode';
  public readonly isIllustrativeDemo = true;

  public async calculateRoutes(params: RouteRequestParams): Promise<RoutingResponse> {
    const { origin, destination, originName, destinationName } = params;

    // Check if this matches or approximates the village scenario
    const isVillageDemo =
      (originName && originName.toLowerCase().includes('village')) ||
      (destinationName && destinationName.toLowerCase().includes('panchayat')) ||
      (Math.abs(origin[0] - DEMO_PRESETS.village.origin.coordinates[0]) < 0.05 &&
       Math.abs(origin[1] - DEMO_PRESETS.village.origin.coordinates[1]) < 0.05);

    const routes: RouteAlternative[] = isVillageDemo 
      ? this.generateVillageDemoRoutes(origin, destination)
      : this.generateUrbanDemoRoutes(origin, destination);

    return {
      provider: 'Illustrative Demo Engine (Mock Data)',
      isIllustrative: true,
      origin: {
        name: originName || (isVillageDemo ? DEMO_PRESETS.village.origin.name : 'Sample Start Point'),
        coordinates: origin,
      },
      destination: {
        name: destinationName || (isVillageDemo ? DEMO_PRESETS.village.destination.name : 'Sample End Point'),
        coordinates: destination,
      },
      routes,
      notices: [
        'DEMO / ILLUSTRATIVE — NOT VERIFIED REAL-WORLD DATA',
        'Routes and travel calculations shown in Demo Mode are synthetic demonstrations.',
        'Configure VITE_OPENROUTESERVICE_API_KEY in .env for verified live routing.',
      ],
    };
  }

  public async geocode(query: string): Promise<RouteWaypoint[]> {
    const q = query.toLowerCase().trim();
    const allPresets = [
      DEMO_PRESETS.urban.origin,
      DEMO_PRESETS.urban.destination,
      DEMO_PRESETS.village.origin,
      DEMO_PRESETS.village.destination,
      {
        name: 'District Civil Hospital',
        address: 'Healthcare Corridor, North Sector',
        coordinates: [77.2240, 28.6390] as GeoCoordinate,
      },
      {
        name: 'Women Police Station Sector 12',
        address: 'Civil Lines Road',
        coordinates: [77.2280, 28.6430] as GeoCoordinate,
      },
    ];

    return allPresets.filter(
      p => p.name.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q)
    );
  }

  private generateUrbanDemoRoutes(origin: GeoCoordinate, dest: GeoCoordinate): RouteAlternative[] {
    const [lon1, lat1] = origin;
    const [lon2, lat2] = dest;

    // 1. Safety-Aware Alternative (Follows major lit avenue with active facilities)
    const midSafety: GeoCoordinate = [
      lon1 + (lon2 - lon1) * 0.45 + 0.005,
      lat1 + (lat2 - lat1) * 0.55 + 0.004,
    ];
    const safetyCoords: GeoCoordinate[] = [
      origin,
      [lon1 + (lon2 - lon1) * 0.2, lat1 + (lat2 - lat1) * 0.25],
      midSafety,
      [lon1 + (lon2 - lon1) * 0.75, lat1 + (lat2 - lat1) * 0.8],
      dest,
    ];

    // 2. Fastest Alternative (Direct arterial road)
    const midFast: GeoCoordinate = [
      lon1 + (lon2 - lon1) * 0.5,
      lat1 + (lat2 - lat1) * 0.5,
    ];
    const fastCoords: GeoCoordinate[] = [
      origin,
      [lon1 + (lon2 - lon1) * 0.33, lat1 + (lat2 - lat1) * 0.35],
      midFast,
      [lon1 + (lon2 - lon1) * 0.66, lat1 + (lat2 - lat1) * 0.7],
      dest,
    ];

    // 3. Shortest Alternative (Cuts through narrow residential side lanes)
    const midShort: GeoCoordinate = [
      lon1 + (lon2 - lon1) * 0.4 - 0.006,
      lat1 + (lat2 - lat1) * 0.45 - 0.005,
    ];
    const shortCoords: GeoCoordinate[] = [
      origin,
      [lon1 + (lon2 - lon1) * 0.25 - 0.004, lat1 + (lat2 - lat1) * 0.2],
      midShort,
      [lon1 + (lon2 - lon1) * 0.7 - 0.003, lat1 + (lat2 - lat1) * 0.65],
      dest,
    ];

    return [
      {
        id: 'demo-safety-aware',
        name: 'Safety-Aware Alternative (Illustrative)',
        preference: 'safety_aware',
        summary: 'Via Main Boulevard & illuminated transit corridor',
        distanceKm: 3.4,
        durationMinutes: 42,
        geometry: { type: 'LineString', coordinates: safetyCoords },
        segments: [
          {
            distanceMeters: 1200,
            durationSeconds: 900,
            roadType: 'primary',
            streetName: 'Main Commercial Boulevard',
            hasStreetlights: true,
            safetyObservationsCount: 8,
            coordinates: safetyCoords.slice(0, 3),
          },
          {
            distanceMeters: 2200,
            durationSeconds: 1620,
            roadType: 'secondary',
            streetName: 'Transit Plaza Avenue',
            hasStreetlights: true,
            safetyObservationsCount: 6,
            coordinates: safetyCoords.slice(2),
          },
        ],
        isSampleIllustrative: true,
        routingProvider: 'Demo / Illustrative',
      },
      {
        id: 'demo-fastest',
        name: 'Fastest Alternative (Illustrative)',
        preference: 'fastest',
        summary: 'Via Ring Expressway Connector',
        distanceKm: 3.1,
        durationMinutes: 36,
        geometry: { type: 'LineString', coordinates: fastCoords },
        segments: [
          {
            distanceMeters: 3100,
            durationSeconds: 2160,
            roadType: 'primary',
            streetName: 'Expressway Link Road',
            hasStreetlights: true,
            safetyObservationsCount: 4,
            coordinates: fastCoords,
          },
        ],
        isSampleIllustrative: true,
        routingProvider: 'Demo / Illustrative',
      },
      {
        id: 'demo-shortest',
        name: 'Shortest Alternative (Illustrative)',
        preference: 'shortest',
        summary: 'Via Backstreet alleys and secluded paths',
        distanceKm: 2.7,
        durationMinutes: 34,
        geometry: { type: 'LineString', coordinates: shortCoords },
        segments: [
          {
            distanceMeters: 1400,
            durationSeconds: 1050,
            roadType: 'residential',
            streetName: 'Old Market Alley',
            hasStreetlights: 'unknown',
            safetyObservationsCount: 1,
            coordinates: shortCoords.slice(0, 3),
          },
          {
            distanceMeters: 1300,
            durationSeconds: 990,
            roadType: 'isolated_path',
            streetName: 'Service Corridor Path',
            hasStreetlights: false,
            safetyObservationsCount: 0,
            coordinates: shortCoords.slice(2),
          },
        ],
        isSampleIllustrative: true,
        routingProvider: 'Demo / Illustrative',
      },
    ];
  }

  private generateVillageDemoRoutes(origin: GeoCoordinate, dest: GeoCoordinate): RouteAlternative[] {
    const [lon1, lat1] = origin;
    const [lon2, lat2] = dest;

    // Rural village route with unpaved road segments and missing safety data
    const villageCoords1: GeoCoordinate[] = [
      origin,
      [lon1 + (lon2 - lon1) * 0.3, lat1 + (lat2 - lat1) * 0.25],
      [lon1 + (lon2 - lon1) * 0.6, lat1 + (lat2 - lat1) * 0.65],
      dest,
    ];

    const villageCoords2: GeoCoordinate[] = [
      origin,
      [lon1 + (lon2 - lon1) * 0.25 - 0.003, lat1 + (lat2 - lat1) * 0.35],
      [lon1 + (lon2 - lon1) * 0.5 - 0.005, lat1 + (lat2 - lat1) * 0.5],
      [lon1 + (lon2 - lon1) * 0.8 - 0.002, lat1 + (lat2 - lat1) * 0.85],
      dest,
    ];

    return [
      {
        id: 'demo-village-rural-road',
        name: 'Village Connecting Road (Sparse Telemetry)',
        preference: 'safety_aware',
        summary: 'Via Rural State Highway link (Partially unmapped)',
        distanceKm: 4.8,
        durationMinutes: 58,
        geometry: { type: 'LineString', coordinates: villageCoords1 },
        segments: [
          {
            distanceMeters: 2800,
            durationSeconds: 2040,
            roadType: 'secondary',
            streetName: 'Rural Panchayat Link Road',
            hasStreetlights: 'unknown',
            safetyObservationsCount: 0, // NO DATA
            coordinates: villageCoords1.slice(0, 2),
          },
          {
            distanceMeters: 2000,
            durationSeconds: 1440,
            roadType: 'unpaved_rural',
            streetName: 'Agricultural Feeder Track',
            hasStreetlights: 'unknown',
            safetyObservationsCount: 0, // NO DATA
            coordinates: villageCoords1.slice(1),
          },
        ],
        isSampleIllustrative: true,
        routingProvider: 'Demo / Illustrative (Village Model)',
      },
      {
        id: 'demo-village-shortcut',
        name: 'Shortest Village Trail (Unlit Dirt Path)',
        preference: 'shortest',
        summary: 'Via Field Boundaries and Stream Crossing',
        distanceKm: 3.9,
        durationMinutes: 49,
        geometry: { type: 'LineString', coordinates: villageCoords2 },
        segments: [
          {
            distanceMeters: 3900,
            durationSeconds: 2940,
            roadType: 'isolated_path',
            streetName: 'Unpaved Hamlet Path',
            hasStreetlights: 'unknown',
            safetyObservationsCount: 0,
            coordinates: villageCoords2,
          },
        ],
        isSampleIllustrative: true,
        routingProvider: 'Demo / Illustrative (Village Model)',
      },
    ];
  }
}
