import { describe, it, expect } from 'vitest';
import { DemoRoutingProvider, DEMO_PRESETS } from '../src/services/routing/demoRoutingProvider';
import { OpenRouteServiceProvider } from '../src/services/routing/openRouteService';

describe('Routing Providers', () => {
  describe('OpenRouteServiceProvider', () => {
    it('throws descriptive error if instantiated without API key', () => {
      expect(() => new OpenRouteServiceProvider('')).toThrow(
        'OpenRouteService API key is missing'
      );
    });
  });

  describe('DemoRoutingProvider', () => {
    const provider = new DemoRoutingProvider();

    it('returns fastest, shortest, and safety-aware route alternatives labeled as illustrative', async () => {
      const response = await provider.calculateRoutes({
        origin: DEMO_PRESETS.urban.origin.coordinates,
        destination: DEMO_PRESETS.urban.destination.coordinates,
        originName: DEMO_PRESETS.urban.origin.name,
        destinationName: DEMO_PRESETS.urban.destination.name,
      });

      expect(response.isIllustrative).toBe(true);
      expect(response.routes.length).toBeGreaterThanOrEqual(3);

      const preferences = response.routes.map(r => r.preference);
      expect(preferences).toContain('safety_aware');
      expect(preferences).toContain('fastest');
      expect(preferences).toContain('shortest');

      response.routes.forEach(route => {
        expect(route.isSampleIllustrative).toBe(true);
        expect(route.distanceKm).toBeGreaterThan(0);
        expect(route.durationMinutes).toBeGreaterThan(0);
        expect(route.geometry.coordinates.length).toBeGreaterThan(1);
      });
    });

    it('provides village route demonstration with rural road characteristics', async () => {
      const response = await provider.calculateRoutes({
        origin: DEMO_PRESETS.village.origin.coordinates,
        destination: DEMO_PRESETS.village.destination.coordinates,
        originName: DEMO_PRESETS.village.origin.name,
        destinationName: DEMO_PRESETS.village.destination.name,
      });

      expect(response.isIllustrative).toBe(true);
      const ruralRoute = response.routes.find(r => 
        r.segments.some(s => s.roadType === 'unpaved_rural' || s.roadType === 'isolated_path')
      );
      expect(ruralRoute).toBeDefined();
    });
  });
});
