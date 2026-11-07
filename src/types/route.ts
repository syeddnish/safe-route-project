// Route types and interfaces for Safe Route AI

export type GeoCoordinate = [number, number]; // [longitude, latitude]

export interface RouteWaypoint {
  name: string;
  coordinates: GeoCoordinate;
  address?: string;
}

export type RoutePreference = 'fastest' | 'shortest' | 'fastest_shortest' | 'alternative' | 'safety_aware';

export interface RouteGeometry {
  type: 'LineString';
  coordinates: GeoCoordinate[];
}

export interface RouteSegment {
  distanceMeters: number;
  durationSeconds: number;
  roadType: string;
  streetName?: string;
  hasStreetlights?: boolean | 'unknown';
  safetyObservationsCount: number;
  coordinates: GeoCoordinate[];
}

export interface RouteAlternative {
  id: string;
  name: string;
  preference: RoutePreference;
  summary: string;
  distanceKm: number;
  durationMinutes: number;
  geometry: RouteGeometry;
  segments: RouteSegment[];
  isSampleIllustrative: boolean;
  routingProvider: string;
  safetyEvaluation?: import('./safety').SafetyEvaluation;
}

export interface RoutingResponse {
  provider: string;
  isIllustrative: boolean;
  origin: RouteWaypoint;
  destination: RouteWaypoint;
  routes: RouteAlternative[];
  notices?: string[];
}
