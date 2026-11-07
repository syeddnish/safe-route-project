import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Trees, 
  PlusCircle, 
  UserCheck, 
  Lock, 
  Menu, 
  X 
} from 'lucide-react';
import { RouteAlternative, RouteWaypoint } from './types/route';
import { SafetyObservation } from './types/safety';
import { createRoutingProvider } from './services/routing/routingFactory';
import { DEMO_PRESETS } from './services/routing/demoRoutingProvider';
import { SafetyService } from './services/supabase/safetyService';
import { isSupabaseConfigured } from './services/supabase/client';
import { SafetyScoringEngine } from './scoring/safetyScoringEngine';

import { DemoModeBanner } from './components/DemoModeBanner';
import { MapView } from './components/MapView';
import { RouteSearchPanel } from './components/RouteSearchPanel';
import { RouteComparisonCards } from './components/RouteComparisonCards';
import { SafetyScoreCard } from './components/SafetyScoreCard';
import { ConfidenceIndicator } from './components/ConfidenceIndicator';
import { VillageRouteDemoModal } from './components/VillageRouteDemoModal';
import { CommunityReportModal } from './components/CommunityReportModal';
import { AdminVerificationPanel } from './components/AdminVerificationPanel';
import { PrivacyNoticeModal } from './components/PrivacyNoticeModal';

export const App: React.FC = () => {
  const [routingProvider] = useState(() => createRoutingProvider());
  const [scoringEngine] = useState(() => new SafetyScoringEngine());

  const [activePreset, setActivePreset] = useState<'urban' | 'village' | 'custom'>('urban');
  const [routes, setRoutes] = useState<RouteAlternative[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [observations, setObservations] = useState<SafetyObservation[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals state
  const [showVillageModal, setShowVillageModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReviewerModal, setShowReviewerModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Mobile drawer toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Initial load: compute routes for default urban scenario
  useEffect(() => {
    handleExecuteRouting(
      DEMO_PRESETS.urban.origin,
      DEMO_PRESETS.urban.destination,
      'urban'
    );
  }, []);

  const handleExecuteRouting = async (
    origin: RouteWaypoint,
    destination: RouteWaypoint,
    presetType: 'urban' | 'village' | 'custom' = 'custom'
  ) => {
    setIsLoading(true);
    setErrorMessage(null);
    setActivePreset(presetType);

    try {
      // 1. Calculate routes via modular routing provider
      const routingRes = await routingProvider.calculateRoutes({
        origin: origin.coordinates,
        destination: destination.coordinates,
        originName: origin.name,
        destinationName: destination.name,
      });

      // 2. Fetch observations independently for each route so nearby alternatives
      // do not inherit evidence queried only for another route's corridor.
      const isVillage = presetType === 'village';
      let routeObservations: SafetyObservation[][];
      try {
        routeObservations = await Promise.all(
          routingRes.routes.map((route) =>
            SafetyService.fetchCorridorObservations(route.geometry.coordinates, isVillage)
          )
        );
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'Unknown safety data error.';
        setErrorMessage(`Routes were calculated, but safety data could not be loaded: ${detail}`);
        routeObservations = routingRes.routes.map(() => []);
      }
      const obs = Array.from(
        new Map(routeObservations.flat().map((observation) => [observation.id, observation])).values()
      );
      setObservations(obs);

      // 3. Evaluate each route alternative with safety scoring & confidence engine
      const evaluatedRoutes = routingRes.routes.map((route, index) => {
        const evaluation = scoringEngine.evaluateRoute(
          route,
          routeObservations[index],
          new Date(),
          isVillage
        );
        return {
          ...route,
          safetyEvaluation: evaluation,
        };
      });

      setRoutes(evaluatedRoutes);

      // Set default selected route: prefer safety_aware, else first
      const defaultRoute =
        evaluatedRoutes.find((r) => r.preference === 'safety_aware') || evaluatedRoutes[0];
      setSelectedRouteId(defaultRoute ? defaultRoute.id : null);
    } catch (err: any) {
      console.error('Routing execution error:', err);
      setErrorMessage(err.message || 'Failed to calculate route alternatives. Please check parameters.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPreset = (presetKey: 'urban' | 'village') => {
    const preset = DEMO_PRESETS[presetKey];
    handleExecuteRouting(preset.origin, preset.destination, presetKey);
  };

  const refreshSafetyData = async () => {
    if (routes.length === 0) {
      return;
    }

    try {
      const observationsByRoute = await Promise.all(
        routes.map((route) =>
          SafetyService.fetchCorridorObservations(
            route.geometry.coordinates,
            activePreset === 'village'
          )
        )
      );
      const allObservations = Array.from(
        new Map(observationsByRoute.flat().map((observation) => [observation.id, observation])).values()
      );
      setObservations(allObservations);
      setRoutes((currentRoutes) =>
        currentRoutes.map((route, index) => ({
          ...route,
          safetyEvaluation: scoringEngine.evaluateRoute(
            route,
            observationsByRoute[index],
            new Date(),
            activePreset === 'village'
          ),
        }))
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to refresh route safety data.');
    }
  };

  const selectedRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {(routingProvider.isIllustrativeDemo || !isSupabaseConfigured) && (
        <DemoModeBanner
          isRoutingDemo={routingProvider.isIllustrativeDemo}
          isSafetyDataDemo={!isSupabaseConfigured}
          routingProviderName={routingProvider.name}
        />
      )}
      {/* Main Navigation Header */}
      <header className="h-14 bg-navy-900 border-b border-slate-800 px-4 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-950">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm sm:text-base tracking-tight text-white flex items-center space-x-1.5">
                <span>Safe Route AI</span>
                <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-1.5 py-0.2 rounded font-mono">
                  v1.0
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                Safety-Aware Navigation & Confidence Auditing
              </p>
            </div>
          </div>
        </div>

        {/* Action Header Nav */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          {/* Village Demonstration Button */}
          <button
            onClick={() => setShowVillageModal(true)}
            className="px-2.5 py-1.5 rounded-lg bg-amber-950/70 hover:bg-amber-900 border border-amber-800/80 text-amber-200 text-xs font-medium flex items-center space-x-1.5 transition-colors"
          >
            <Trees className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Village Route Demo</span>
            <span className="sm:hidden">Village</span>
          </button>

          {/* Submit Community Report */}
          <button
            onClick={() => setShowReportModal(true)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center space-x-1.5 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Submit Observation</span>
            <span className="sm:hidden">Report</span>
          </button>

          {/* Reviewer Portal */}
          <button
            onClick={() => setShowReviewerModal(true)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center space-x-1.5 transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Reviewer Portal</span>
          </button>

          {/* Privacy Notice */}
          <button
            onClick={() => setShowPrivacyModal(true)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            title="Privacy & Safety Principles"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Application Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar Controls and Evaluation Cards */}
        <div
          className={`absolute md:relative z-20 w-full sm:w-[420px] md:w-[440px] h-full bg-navy-900/95 backdrop-blur-md md:backdrop-blur-none border-r border-slate-800 flex flex-col transition-transform duration-300 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Search and Parameter Panel */}
            <RouteSearchPanel
              onSearch={(orig, dest) => handleExecuteRouting(orig, dest, 'custom')}
              onGeocode={(query) => routingProvider.geocode(query)}
              isLoading={isLoading}
              onSelectPreset={handleSelectPreset}
              activePreset={activePreset}
            />

            {/* Error Message if any */}
            {errorMessage && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-200 text-xs space-y-1">
                <div className="font-semibold text-rose-300">Routing Notice</div>
                <div>{errorMessage}</div>
              </div>
            )}

            {/* Route Comparison Alternatives */}
            <RouteComparisonCards
              routes={routes}
              selectedRouteId={selectedRouteId}
              onSelectRoute={(id) => setSelectedRouteId(id)}
            />

            {/* Detailed Safety Score Card */}
            {selectedRoute && (
              <SafetyScoreCard
                evaluation={selectedRoute.safetyEvaluation}
                routeName={selectedRoute.name}
              />
            )}

            {/* Data Confidence Indicator */}
            {selectedRoute?.safetyEvaluation && (
              <ConfidenceIndicator
                evaluation={selectedRoute.safetyEvaluation.confidence}
              />
            )}
          </div>
        </div>

        {/* MapLibre Interactive Map Display */}
        <div className="flex-1 h-full w-full relative">
          <MapView
            routes={routes}
            selectedRouteId={selectedRouteId}
            onSelectRoute={(id) => setSelectedRouteId(id)}
            observations={observations}
          />
        </div>
      </div>

      {/* Modals */}
      <VillageRouteDemoModal
        isOpen={showVillageModal}
        onClose={() => setShowVillageModal(false)}
        onLoadVillageDemo={() => handleSelectPreset('village')}
      />

      <CommunityReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        defaultCoords={selectedRoute?.geometry?.coordinates?.[0] || [77.2240, 28.6380]}
        onReportSubmitted={() => void refreshSafetyData()}
      />

      <AdminVerificationPanel
        isOpen={showReviewerModal}
        onClose={() => setShowReviewerModal(false)}
        onReportVerified={() => void refreshSafetyData()}
      />

      <PrivacyNoticeModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />
    </div>
  );
};

export default App;
