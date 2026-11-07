import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { RouteAlternative } from '../types/route';
import { SafetyObservation } from '../types/safety';

interface MapViewProps {
  routes: RouteAlternative[];
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
  observations: SafetyObservation[];
  onMapClick?: (coords: [number, number]) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  routes,
  selectedRouteId,
  onSelectRoute,
  observations,
  onMapClick,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  // Initialize MapLibre Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Use OpenStreetMap-compatible style
    // Carto Positron GL style or fallback standard OSM
    const mapStyle =
      import.meta.env.VITE_MAP_STYLE_URL ||
      {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: [
              'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
          },
        },
        layers: [
          {
            id: 'osm-tiles-layer',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      };

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: mapStyle as any,
      center: [77.2240, 28.6380], // Default centered on sample city corridor
      zoom: 13,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    map.addControl(
      new maplibregl.AttributionControl({
        compact: false,
        customAttribution: '© OpenStreetMap contributors | Safe Route AI',
      }),
      'bottom-right'
    );

    map.on('click', (e) => {
      if (onMapClick) {
        onMapClick([e.lngLat.lng, e.lngLat.lat]);
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update routes layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const renderRoutes = () => {
      if (!map.isStyleLoaded()) return;

      // Clean existing route layers and sources
      const existingLayers = ['route-layer-inactive', 'route-layer-active'];
      for (const layerId of existingLayers) {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
      }
      if (map.getSource('routes-source')) {
        map.removeSource('routes-source');
      }

      if (routes.length === 0) return;

      // Construct GeoJSON FeatureCollection
      const features = routes.map((route) => {
        const isSelected = route.id === selectedRouteId;
        let routeColor = '#64748b'; // Inactive slate

        if (isSelected) {
          if (route.preference === 'safety_aware') routeColor = '#06b6d4'; // Cyan for safety-aware
          else if (route.preference === 'fastest' || route.preference === 'fastest_shortest') routeColor = '#3b82f6'; // Blue for fastest
          else routeColor = '#8b5cf6'; // Purple for shortest
        }

        return {
          type: 'Feature' as const,
          properties: {
            id: route.id,
            name: route.name,
            preference: route.preference,
            isSelected,
            color: routeColor,
            width: isSelected ? 6 : 3.5,
            opacity: isSelected ? 0.95 : 0.45,
          },
          geometry: route.geometry,
        };
      });

      map.addSource('routes-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features,
        },
      });

      // Layer for inactive routes
      map.addLayer({
        id: 'route-layer-inactive',
        type: 'line',
        source: 'routes-source',
        filter: ['==', 'isSelected', false],
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['get', 'width'],
          'line-opacity': ['get', 'opacity'],
        },
      });

      // Layer for selected active route
      map.addLayer({
        id: 'route-layer-active',
        type: 'line',
        source: 'routes-source',
        filter: ['==', 'isSelected', true],
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['get', 'width'],
          'line-opacity': ['get', 'opacity'],
        },
      });

      // Click on inactive route to select it
      map.on('click', 'route-layer-inactive', (e) => {
        const feature = e.features?.[0];
        if (feature?.properties?.id) {
          onSelectRoute(feature.properties.id);
        }
      });

      // Fit map bounds to encompass all routes
      const bounds = new maplibregl.LngLatBounds();
      let hasCoords = false;

      routes.forEach((r) => {
        r.geometry.coordinates.forEach((coord) => {
          bounds.extend(coord as [number, number]);
          hasCoords = true;
        });
      });

      if (hasCoords) {
        map.fitBounds(bounds, {
          padding: { top: 60, bottom: 60, left: 60, right: 380 },
          maxZoom: 16,
          duration: 1000,
        });
      }
    };

    if (map.isStyleLoaded()) {
      renderRoutes();
    } else {
      map.once('style.load', renderRoutes);
    }
  }, [routes, selectedRouteId]);

  // Update Observation & Origin/Destination Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add Origin and Destination markers if routes are present
    if (routes.length > 0) {
      const activeRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
      const coords = activeRoute.geometry.coordinates;

      if (coords.length > 0) {
        const originCoord = coords[0];
        const destCoord = coords[coords.length - 1];

        // Origin marker (Green)
        const originEl = document.createElement('div');
        originEl.className = 'w-7 h-7 rounded-full bg-emerald-500 border-2 border-white shadow-lg flex items-center justify-center text-xs font-bold text-slate-950 cursor-pointer';
        originEl.innerText = 'A';
        const originMarker = new maplibregl.Marker({ element: originEl })
          .setLngLat(originCoord as [number, number])
          .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML('<div class="text-xs font-medium">Route Origin</div>'))
          .addTo(map);
        markersRef.current.push(originMarker);

        // Destination marker (Red/Crimson)
        const destEl = document.createElement('div');
        destEl.className = 'w-7 h-7 rounded-full bg-rose-500 border-2 border-white shadow-lg flex items-center justify-center text-xs font-bold text-white cursor-pointer';
        destEl.innerText = 'B';
        const destMarker = new maplibregl.Marker({ element: destEl })
          .setLngLat(destCoord as [number, number])
          .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML('<div class="text-xs font-medium">Route Destination</div>'))
          .addTo(map);
        markersRef.current.push(destMarker);
      }
    }

    // Add Safety Observation Markers
    observations.forEach((obs) => {
      const el = document.createElement('div');
      let bgColor = 'bg-blue-500';
      let icon = 'ℹ️';

      if (obs.category === 'streetlight') {
        if (obs.properties.operationalStatus === 'broken') {
          bgColor = 'bg-amber-600';
          icon = '💡❌';
        } else {
          bgColor = 'bg-amber-400';
          icon = '💡';
        }
      } else if (obs.category === 'public_facility') {
        if (obs.properties.facilityType === 'police_station') {
          bgColor = 'bg-indigo-600';
          icon = '👮';
        } else if (obs.properties.facilityType === 'hospital') {
          bgColor = 'bg-emerald-600';
          icon = '🏥';
        } else {
          bgColor = 'bg-blue-600';
          icon = '🏢';
        }
      } else if (obs.category === 'community_report') {
        bgColor = obs.verificationStatus === 'verified' ? 'bg-orange-600' : 'bg-slate-600';
        icon = '⚠️';
      }

      el.className = `w-6 h-6 rounded-full ${bgColor} border border-slate-900 shadow-md flex items-center justify-center text-[10px] cursor-pointer hover:scale-125 transition-transform`;
      el.innerText = icon;

      const popupHtml = `
        <div class="space-y-1.5 min-w-[200px]">
          <div class="flex items-center justify-between border-b border-slate-700 pb-1">
            <span class="text-xs font-semibold capitalize text-slate-200">${obs.category.replace('_', ' ')}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded ${
              obs.verificationStatus === 'verified'
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                : 'bg-amber-950 text-amber-400 border border-amber-800'
            }">${obs.verificationStatus}</span>
          </div>
          <div class="text-xs text-slate-300">
            ${obs.properties.details || obs.properties.operationalStatus || obs.properties.facilityType || 'Observation Recorded'}
          </div>
          <div class="text-[10px] text-slate-400 flex flex-col space-y-0.5 pt-1">
            <span>Source: <strong class="text-slate-300">${obs.source}</strong></span>
            <span>Precision: <span class="capitalize">${obs.geographicPrecision.replace('_', ' ')}</span></span>
            <span>Recorded: ${new Date(obs.timestamp).toLocaleDateString()}</span>
            ${obs.expirationDate ? `<span>Expires: ${new Date(obs.expirationDate).toLocaleDateString()}</span>` : ''}
          </div>
        </div>
      `;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(obs.coordinates as [number, number])
        .setPopup(new maplibregl.Popup({ offset: 10 }).setHTML(popupHtml))
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [observations, routes, selectedRouteId]);

  return (
    <div className="relative w-full h-full min-h-[500px] bg-slate-900 overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Map Legend */}
      <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 shadow-xl space-y-1.5 hidden md:block max-w-[220px]">
        <div className="font-semibold text-slate-100 flex items-center justify-between">
          <span>Map Indicators</span>
          <span className="text-[10px] text-slate-400">OpenStreetMap</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block"></span>
            <span>Safety-Aware</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
            <span>Fastest</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span>
            <span>Shortest</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span>💡</span>
            <span>Streetlight</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span>👮/🏥</span>
            <span>Facility</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span>⚠️</span>
            <span>Report</span>
          </div>
        </div>
      </div>
    </div>
  );
};
