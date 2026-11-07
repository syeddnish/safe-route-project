import React, { useEffect, useState } from 'react';
import { Search, MapPin, Navigation, Compass, Loader2, Info } from 'lucide-react';
import { GeoCoordinate, RouteWaypoint } from '../types/route';
import { DEMO_PRESETS } from '../services/routing/demoRoutingProvider';

interface RouteSearchPanelProps {
  onSearch: (origin: RouteWaypoint, destination: RouteWaypoint) => void;
  onGeocode: (query: string) => Promise<RouteWaypoint[]>;
  isLoading: boolean;
  onSelectPreset: (presetKey: 'urban' | 'village') => void;
  activePreset: 'urban' | 'village' | 'custom';
}

export const RouteSearchPanel: React.FC<RouteSearchPanelProps> = ({
  onSearch,
  onGeocode,
  isLoading,
  onSelectPreset,
  activePreset,
}) => {
  const [originInput, setOriginInput] = useState(DEMO_PRESETS.urban.origin.name);
  const [destinationInput, setDestinationInput] = useState(DEMO_PRESETS.urban.destination.name);
  const [originLatitude, setOriginLatitude] = useState(String(DEMO_PRESETS.urban.origin.coordinates[1]));
  const [originLongitude, setOriginLongitude] = useState(String(DEMO_PRESETS.urban.origin.coordinates[0]));
  const [destinationLatitude, setDestinationLatitude] = useState(String(DEMO_PRESETS.urban.destination.coordinates[1]));
  const [destinationLongitude, setDestinationLongitude] = useState(String(DEMO_PRESETS.urban.destination.coordinates[0]));

  const [locatingUser, setLocatingUser] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState<'origin' | 'destination' | null>(null);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [originSuggestions, setOriginSuggestions] = useState<RouteWaypoint[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<RouteWaypoint[]>([]);
  const [coordinateError, setCoordinateError] = useState<string | null>(null);

  useEffect(() => {
    if (activePreset === 'custom') {
      return;
    }
    const preset = DEMO_PRESETS[activePreset];
    setOriginInput(preset.origin.name);
    setOriginLongitude(String(preset.origin.coordinates[0]));
    setOriginLatitude(String(preset.origin.coordinates[1]));
    setDestinationInput(preset.destination.name);
    setDestinationLongitude(String(preset.destination.coordinates[0]));
    setDestinationLatitude(String(preset.destination.coordinates[1]));
    setLocationStatus(null);
    setLocationError(null);
    setGeocodeError(null);
    setCoordinateError(null);
  }, [activePreset]);

  const handleUseMyLocation = () => {
    setLocationError(null);
    setLocationStatus(null);
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      setLocationError('Browser location requires HTTPS or localhost. Enter coordinates manually or use Find location.');
      return;
    }
    if (!navigator.geolocation) {
      setLocationError('This browser does not provide location services. Enter coordinates manually or use Find location.');
      return;
    }

    setLocatingUser(true);
    setLocationStatus('Requesting location permission...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: GeoCoordinate = [position.coords.longitude, position.coords.latitude];
        setOriginLongitude(String(coords[0]));
        setOriginLatitude(String(coords[1]));
        setOriginInput('Current Location');
        setOriginSuggestions([]);
        setGeocodeError(null);
        setLocationStatus('Using current GPS coordinates (not stored or logged).');
        setLocatingUser(false);
      },
      (error) => {
        setLocatingUser(false);
        setLocationStatus(null);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location permission was denied. Allow location access in browser settings, or enter coordinates/use Find location.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('The device could not determine your location. Enter coordinates or use Find location instead.');
            break;
          case error.TIMEOUT:
            setLocationError('Location request timed out. Try again or enter coordinates/use Find location.');
            break;
          default:
            setLocationError('Location could not be determined. Enter coordinates or use Find location instead.');
        }
      },
      { timeout: 15000, enableHighAccuracy: false, maximumAge: 60000 }
    );
  };

  const findLocation = async (target: 'origin' | 'destination') => {
    const query = target === 'origin' ? originInput.trim() : destinationInput.trim();
    if (query.length < 3) {
      setGeocodeError('Enter at least 3 characters to search for a location.');
      return;
    }

    setGeocodeError(null);
    setLocationError(null);
    setGeocoding(target);
    setOriginSuggestions([]);
    setDestinationSuggestions([]);
    try {
      const matches = await onGeocode(query);
      if (matches.length === 0) {
        setGeocodeError('No matching locations were found. Try a nearby village, town, district, or a more specific address.');
      } else if (target === 'origin') {
        setOriginSuggestions(matches);
      } else {
        setDestinationSuggestions(matches);
      }
    } catch (error) {
      setGeocodeError(error instanceof Error ? error.message : 'Location search failed. Enter coordinates manually.');
    } finally {
      setGeocoding(null);
    }
  };

  const selectGeocodeResult = (target: 'origin' | 'destination', waypoint: RouteWaypoint) => {
    if (target === 'origin') {
      setOriginInput(waypoint.name);
      setOriginLongitude(String(waypoint.coordinates[0]));
      setOriginLatitude(String(waypoint.coordinates[1]));
      setOriginSuggestions([]);
    } else {
      setDestinationInput(waypoint.name);
      setDestinationLongitude(String(waypoint.coordinates[0]));
      setDestinationLatitude(String(waypoint.coordinates[1]));
      setDestinationSuggestions([]);
    }
    setGeocodeError(null);
  };

  const handlePresetClick = (presetKey: 'urban' | 'village') => {
    onSelectPreset(presetKey);
    const preset = DEMO_PRESETS[presetKey];
    setOriginInput(preset.origin.name);
    setOriginLongitude(String(preset.origin.coordinates[0]));
    setOriginLatitude(String(preset.origin.coordinates[1]));
    setDestinationInput(preset.destination.name);
    setDestinationLongitude(String(preset.destination.coordinates[0]));
    setDestinationLatitude(String(preset.destination.coordinates[1]));
    setLocationStatus(null);
    setLocationError(null);
    setGeocodeError(null);
    setCoordinateError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const origin: GeoCoordinate = [Number(originLongitude), Number(originLatitude)];
    const destination: GeoCoordinate = [Number(destinationLongitude), Number(destinationLatitude)];
    const allCoordinates = [...origin, ...destination];
    if (
      allCoordinates.some((coordinate) => !Number.isFinite(coordinate)) ||
      origin[0] < -180 || origin[0] > 180 || destination[0] < -180 || destination[0] > 180 ||
      origin[1] < -90 || origin[1] > 90 || destination[1] < -90 || destination[1] > 90
    ) {
      setCoordinateError('Enter valid longitude (−180 to 180) and latitude (−90 to 90) for both locations.');
      return;
    }
    setCoordinateError(null);
    onSearch(
      { name: originInput.trim() || 'Origin', coordinates: origin },
      { name: destinationInput.trim() || 'Destination', coordinates: destination }
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl text-slate-100">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-slate-100 flex items-center space-x-2">
          <Navigation className="w-4 h-4 text-cyan-400" />
          <span>Plan Safety-Aware Route</span>
        </h2>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
          Navigation
        </span>
      </div>

      {/* Preset Selector */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          type="button"
          onClick={() => handlePresetClick('urban')}
          className={`py-2 px-3 text-xs font-medium rounded-lg border text-left transition-all ${
            activePreset === 'urban'
              ? 'bg-blue-900/60 border-cyan-500 text-cyan-200 ring-1 ring-cyan-500'
              : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <div className="font-semibold text-slate-100">🏙️ City Corridor</div>
          <div className="text-[10px] text-slate-400 truncate">Urban lighting & facilities</div>
        </button>

        <button
          type="button"
          onClick={() => handlePresetClick('village')}
          className={`py-2 px-3 text-xs font-medium rounded-lg border text-left transition-all ${
            activePreset === 'village'
              ? 'bg-amber-950/60 border-amber-500 text-amber-200 ring-1 ring-amber-500'
              : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <div className="font-semibold text-slate-100">🌾 Village Route Demo</div>
          <div className="text-[10px] text-amber-300/80 truncate">Missing data demonstration</div>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Origin */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-300 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Origin</span>
            </label>
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={locatingUser}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 font-medium disabled:opacity-50"
            >
              {locatingUser ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Locating...</span>
                </>
              ) : (
                <>
                  <Compass className="w-3 h-3" />
                  <span>Use My Location</span>
                </>
              )}
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              value={originInput}
              onChange={(e) => {
                setOriginInput(e.target.value);
                setOriginSuggestions([]);
              }}
              placeholder="Enter start location or address"
              className="w-full bg-slate-800/90 border border-slate-700 rounded-lg py-2 pl-3 pr-8 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
            <MapPin className="w-4 h-4 text-emerald-400 absolute right-2.5 top-2.5" />
          </div>
          <button
            type="button"
            onClick={() => void findLocation('origin')}
            disabled={geocoding !== null}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 disabled:opacity-50 flex items-center space-x-1"
          >
            {geocoding === 'origin' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
            <span>Find origin location</span>
          </button>
          {originSuggestions.length > 0 && (
            <div className="rounded-lg border border-slate-700 bg-slate-950 overflow-hidden">
              {originSuggestions.map((waypoint, index) => (
                <button
                  key={`${waypoint.coordinates.join(',')}-${index}`}
                  type="button"
                  onClick={() => selectGeocodeResult('origin', waypoint)}
                  className="w-full px-3 py-2 text-left text-[11px] text-slate-200 hover:bg-slate-800 border-b last:border-b-0 border-slate-800"
                >
                  <span className="block">{waypoint.name}</span>
                  <span className="block text-slate-500">{waypoint.address || waypoint.coordinates.join(', ')}</span>
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[10px] text-slate-400">
              Longitude
              <input
                type="number"
                step="any"
                value={originLongitude}
                onChange={(event) => {
                  setOriginLongitude(event.target.value);
                  setCoordinateError(null);
                }}
                className="mt-1 w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-slate-200"
              />
            </label>
            <label className="text-[10px] text-slate-400">
              Latitude
              <input
                type="number"
                step="any"
                value={originLatitude}
                onChange={(event) => {
                  setOriginLatitude(event.target.value);
                  setCoordinateError(null);
                }}
                className="mt-1 w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-slate-200"
              />
            </label>
          </div>
        </div>

        {/* Destination */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-300 flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Destination</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={destinationInput}
              onChange={(e) => {
                setDestinationInput(e.target.value);
                setDestinationSuggestions([]);
              }}
              placeholder="Enter destination location or address"
              className="w-full bg-slate-800/90 border border-slate-700 rounded-lg py-2 pl-3 pr-8 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
            <MapPin className="w-4 h-4 text-rose-400 absolute right-2.5 top-2.5" />
          </div>
          <button
            type="button"
            onClick={() => void findLocation('destination')}
            disabled={geocoding !== null}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 disabled:opacity-50 flex items-center space-x-1"
          >
            {geocoding === 'destination' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
            <span>Find destination location</span>
          </button>
          {destinationSuggestions.length > 0 && (
            <div className="rounded-lg border border-slate-700 bg-slate-950 overflow-hidden">
              {destinationSuggestions.map((waypoint, index) => (
                <button
                  key={`${waypoint.coordinates.join(',')}-${index}`}
                  type="button"
                  onClick={() => selectGeocodeResult('destination', waypoint)}
                  className="w-full px-3 py-2 text-left text-[11px] text-slate-200 hover:bg-slate-800 border-b last:border-b-0 border-slate-800"
                >
                  <span className="block">{waypoint.name}</span>
                  <span className="block text-slate-500">{waypoint.address || waypoint.coordinates.join(', ')}</span>
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[10px] text-slate-400">
              Longitude
              <input
                type="number"
                step="any"
                value={destinationLongitude}
                onChange={(event) => {
                  setDestinationLongitude(event.target.value);
                  setCoordinateError(null);
                }}
                className="mt-1 w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-slate-200"
              />
            </label>
            <label className="text-[10px] text-slate-400">
              Latitude
              <input
                type="number"
                step="any"
                value={destinationLatitude}
                onChange={(event) => {
                  setDestinationLatitude(event.target.value);
                  setCoordinateError(null);
                }}
                className="mt-1 w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-slate-200"
              />
            </label>
          </div>
        </div>

        {/* Location Status Notice */}
        {locationStatus && (
          <div className="text-[11px] px-2.5 py-1.5 rounded bg-slate-800 text-slate-300 flex items-start space-x-1.5 border border-slate-700">
            <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
            <span>{locationStatus}</span>
          </div>
        )}
        {(locationError || geocodeError || coordinateError) && (
          <div role="alert" className="text-[11px] px-2.5 py-1.5 rounded bg-rose-950/60 text-rose-200 flex items-start space-x-1.5 border border-rose-800">
            <Info className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
            <span>{locationError || geocodeError || coordinateError}</span>
          </div>
        )}
        <p className="text-[10px] text-slate-500">
          Search location names and select a result, or enter longitude and latitude directly. Names alone do not change route coordinates.
        </p>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium text-xs flex items-center justify-center space-x-2 transition-all shadow-md shadow-cyan-900/30 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Calculating Route Alternatives...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>Compare Route Alternatives</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
