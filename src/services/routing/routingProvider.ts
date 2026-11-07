// Modular Routing Provider Interface
import { GeoCoordinate, RoutingResponse, RouteWaypoint } from '../../types/route';

export interface RouteRequestParams {
  origin: GeoCoordinate;
  destination: GeoCoordinate;
  originName?: string;
  destinationName?: string;
  preferences?: ('fastest' | 'shortest' | 'safety_aware')[];
}

export interface IRoutingProvider {
  readonly id: string;
  readonly name: string;
  readonly isIllustrativeDemo: boolean;

  /**
   * Calculates route alternatives (Fastest, Shortest, and Safety-Aware)
   */
  calculateRoutes(params: RouteRequestParams): Promise<RoutingResponse>;

  /**
   * Search geocoding suggestions
   */
  geocode(query: string): Promise<RouteWaypoint[]>;
}
