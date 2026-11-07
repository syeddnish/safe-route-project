// Open Source Routing Machine (OSRM) Provider
import { IRoutingProvider, RouteRequestParams } from './routingProvider';
import { RoutingResponse, RouteAlternative, RouteWaypoint, GeoCoordinate } from '../../types/route';

export class OSRMProvider implements IRoutingProvider {
  public readonly id = 'osrm';
  public readonly name = 'OSRM OpenStreetMap Routing';
  public readonly isIllustrativeDemo = false;

  private baseUrl: string;

  constructor(baseUrl: string = 'https://router.project-osrm.org') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  public async calculateRoutes(params: RouteRequestParams): Promise<RoutingResponse> {
    const { origin, destination, originName, destinationName } = params;

    const coordsStr = `${origin[0]},${origin[1]};${destination[0]},${destination[1]}`;
    const url = `${this.baseUrl}/route/v1/foot/${coordsStr}?overview=full&geometries=geojson&alternatives=true&steps=true`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OSRM Routing Error: HTTP ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error(data.message || 'No route found by OSRM provider.');
    }

    const originWaypoint: RouteWaypoint = {
      name: originName || 'Origin',
      coordinates: origin,
    };
    const destinationWaypoint: RouteWaypoint = {
      name: destinationName || 'Destination',
      coordinates: destination,
    };

    const routes: RouteAlternative[] = data.routes.map((r: any, idx: number) => {
      const distanceKm = Number((r.distance / 1000).toFixed(2));
      const durationMinutes = Math.round(r.duration / 60);
      const coords: GeoCoordinate[] = r.geometry.coordinates;

      const legs = r.legs?.[0];
      const steps = legs?.steps || [];
      const segments = steps.map((s: any) => ({
        distanceMeters: s.distance,
        durationSeconds: s.duration,
        roadType: 'unknown',
        streetName: s.name || 'Local Street',
        safetyObservationsCount: 0,
        coordinates: s.geometry?.coordinates || coords.slice(0, 5),
      }));

      return {
        id: `osrm-${idx}-${Date.now()}`,
        name: `OSRM Route ${idx + 1}`,
        preference: 'alternative',
        summary: `Via ${steps[0]?.name || 'public roads'} (${distanceKm} km, ${durationMinutes} mins)`,
        distanceKm,
        durationMinutes,
        geometry: {
          type: 'LineString',
          coordinates: coords,
        },
        segments: segments.length > 0 ? segments : [{
          distanceMeters: r.distance,
          durationSeconds: r.duration,
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
      if (index === fastestIndex && index === shortestIndex && routes.length > 1) {
        route.preference = 'fastest_shortest';
        route.name = 'Fastest & Shortest Route (OSRM)';
      } else if (index === fastestIndex) {
        route.preference = 'fastest';
        route.name = 'Fastest Route (OSRM)';
      } else if (index === shortestIndex) {
        route.preference = 'shortest';
        route.name = 'Shortest Route (OSRM)';
      } else {
        route.preference = 'alternative';
        route.name = `Alternative Route ${index + 1} (OSRM)`;
      }
    });

    return {
      provider: this.name,
      isIllustrative: false,
      origin: originWaypoint,
      destination: destinationWaypoint,
      routes,
      notices: [
        'Route calculated using OpenStreetMap routing topology.',
        'Data attribution: © OpenStreetMap contributors under ODbL.',
      ],
    };
  }

  public async geocode(query: string): Promise<RouteWaypoint[]> {
    if (!query || query.trim().length < 3) return [];
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OpenStreetMap location search failed: HTTP ${response.status}.`);
    }
    const items = await response.json();
    return (items || [])
      .filter((item: any) =>
        typeof item.display_name === 'string' &&
        Number.isFinite(Number(item.lon)) &&
        Number.isFinite(Number(item.lat)) &&
        Number(item.lon) >= -180 &&
        Number(item.lon) <= 180 &&
        Number(item.lat) >= -90 &&
        Number(item.lat) <= 90
      )
      .map((item: any) => ({
        name: item.display_name.split(',')[0],
        address: item.display_name,
        coordinates: [Number(item.lon), Number(item.lat)] as GeoCoordinate,
      }));
  }
}
