// Routing Factory: Instantiates configured routing provider or defaults to Demo Provider
import { IRoutingProvider } from './routingProvider';
import { OpenRouteServiceProvider } from './openRouteService';
import { OSRMProvider } from './osrmProvider';
import { DemoRoutingProvider } from './demoRoutingProvider';

export function createRoutingProvider(): IRoutingProvider {
  const providerType = (import.meta.env.VITE_ROUTING_PROVIDER || 'demo').toLowerCase();
  const orsApiKey = import.meta.env.VITE_OPENROUTESERVICE_API_KEY;
  const osrmBaseUrl = import.meta.env.VITE_OSRM_BASE_URL;

  if (providerType === 'openrouteservice' && orsApiKey && orsApiKey.trim().length > 0) {
    try {
      return new OpenRouteServiceProvider(orsApiKey.trim());
    } catch (e) {
      console.warn('Failed to initialize OpenRouteService provider, falling back to Demo mode:', e);
      return new DemoRoutingProvider();
    }
  }

  if (providerType === 'osrm') {
    return new OSRMProvider(osrmBaseUrl || 'https://router.project-osrm.org');
  }

  // Default to Demo / Illustrative provider
  return new DemoRoutingProvider();
}
