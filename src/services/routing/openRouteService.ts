// OpenRouteService Provider Implementation
import { IRoutingProvider, RouteRequestParams } from './routingProvider';
import { RoutingResponse, RouteAlternative, RouteWaypoint, GeoCoordinate } from '../../types/route';

export class OpenRouteServiceProvider implements IRoutingProvider {
  public readonly id = 'openrouteservice';
  public readonly name = 'OpenRouteService (Live API)';
  public readonly isIllustrativeDemo = false;

  private apiKey: string;
  private baseUrl = 'https://api.openrouteservice.org';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('OpenRouteService API key is missing. Please configure VITE_OPENROUTESERVICE_API_KEY.');
    }
    this.apiKey = apiKey;
  }

  public async calculateRoutes(params: RouteRequestParams): Promise<RoutingResponse> {
    const { origin, destination, originName, destinationName } = params;

    // Call OpenRouteService Directions API with alternative routes
    const url = `${this.baseUrl}/v2/directions/foot-walking/geojson`;
    
    const body = {
      coordinates: [origin, destination],
      alternative_routes: {
        target_count: 2,
        weight_factor: 1.4,
      },
      elevation: false,
      instructions: true,
      preference: 'recommended',
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouteService HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      throw new Error('No route found between the specified coordinates.');
    }

    const originWaypoint: RouteWaypoint = {
      name: originName || 'Origin',
      coordinates: origin,
    };
    const destinationWaypoint: RouteWaypoint = {
      name: destinationName || 'Destination',
      coordinates: destination,
    };

    // Transform GeoJSON features to RouteAlternative.
    const routes: RouteAlternative[] = data.features.map((feature: any, index: number) => {
      const summary = feature.properties.summary;
      const distanceKm = Number((summary.distance / 1000).toFixed(2));
      const durationMinutes = Math.round(summary.duration / 60);
      const coords: GeoCoordinate[] = feature.geometry.coordinates;

      const segments = (feature.properties.segments?.[0]?.steps || []).map((step: any) => ({
        distanceMeters: step.distance,
        durationSeconds: step.duration,
        roadType: 'unknown',
        streetName: step.name || 'Street',
        safetyObservationsCount: 0,
        coordinates: coords.slice(step.way_points[0], step.way_points[1] + 1),
      }));

      return {
        id: `ors-${index}-${Date.now()}`,
        name: `OpenRouteService Route ${index + 1}`,
        preference: 'alternative',
        summary: `Via ${segments[0]?.streetName || 'main roads'} (${distanceKm} km, ${durationMinutes} mins)`,
        distanceKm,
        durationMinutes,
        geometry: {
          type: 'LineString',
          coordinates: coords,
        },
        segments: segments.length > 0 ? segments : [{
          distanceMeters: summary.distance,
          durationSeconds: summary.duration,
          roadType: 'unknown',
          safetyObservationsCount: 0,
          coordinates: coords,
        }],
        isSampleIllustrative: false,
        routingProvider: this.name,
      };
    });
    const fastestIndex = routes.reduce(
      (bestIndex, route, index) =>
        route.durationMinutes < routes[bestIndex].durationMinutes ? index : bestIndex,
      0
    );
    const shortestIndex = routes.reduce(
      (bestIndex, route, index) =>
        route.distanceKm < routes[bestIndex].distanceKm ? index : bestIndex,
      0
    );
    routes.forEach((route, index) => {
      if (index === fastestIndex && index === shortestIndex) {
        route.preference = 'fastest_shortest';
        route.name = 'Fastest & Shortest Route (ORS)';
      } else if (index === fastestIndex) {
        route.preference = 'fastest';
        route.name = 'Fastest Route (ORS)';
      } else if (index === shortestIndex) {
        route.preference = 'shortest';
        route.name = 'Shortest Route (ORS)';
      } else {
        route.preference = 'alternative';
        route.name = `Alternative Route ${index + 1} (ORS)`;
      }
    });

    return {
      provider: this.name,
      isIllustrative: false,
      origin: originWaypoint,
      destination: destinationWaypoint,
      routes,
      notices: [
        'Distances and durations retrieved directly from OpenRouteService live API.',
        'Always verify road conditions and remain vigilant in unfamiliar environments.',
      ],
    };
  }

  public async geocode(query: string): Promise<RouteWaypoint[]> {
    if (!query || query.trim().length < 3) return [];

    const url = `${this.baseUrl}/geocode/search?api_key=${this.apiKey}&text=${encodeURIComponent(query)}&size=5`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OpenRouteService location search failed: HTTP ${response.status}.`);
    }

    const data = await response.json();
    return (data.features || [])
      .filter((feature: any) =>
        typeof feature.properties?.label === 'string' &&
        Array.isArray(feature.geometry?.coordinates) &&
        feature.geometry.coordinates.length === 2 &&
        feature.geometry.coordinates.every((coordinate: unknown) => typeof coordinate === 'number' && Number.isFinite(coordinate))
      )
      .map((feature: any) => ({
        name: feature.properties.label,
        address: feature.properties.locality || feature.properties.country,
        coordinates: feature.geometry.coordinates as GeoCoordinate,
      }));
  }
}
