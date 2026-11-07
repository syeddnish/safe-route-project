import React from 'react';
import { ShieldCheck, Zap, Scissors, Clock, AlertTriangle, HelpCircle, Navigation } from 'lucide-react';
import { RouteAlternative } from '../types/route';

interface RouteComparisonCardsProps {
  routes: RouteAlternative[];
  selectedRouteId: string | null;
  onSelectRoute: (id: string) => void;
}

export const RouteComparisonCards: React.FC<RouteComparisonCardsProps> = ({
  routes,
  selectedRouteId,
  onSelectRoute,
}) => {
  if (routes.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span className="font-medium text-slate-300">Route Alternatives</span>
        <span>{routes.length} options evaluated</span>
      </div>

      <div className="space-y-2">
        {routes.map((route) => {
          const isSelected = route.id === selectedRouteId;
          const evaluation = route.safetyEvaluation;
          const confidence = evaluation?.confidence;

          let badgeIcon = <ShieldCheck className="w-3.5 h-3.5" />;
          let badgeText = 'Safety-Aware';
          let borderAccent = 'border-cyan-500/50';

          if (route.preference === 'fastest') {
            badgeIcon = <Zap className="w-3.5 h-3.5" />;
            badgeText = 'Fastest';
            borderAccent = 'border-blue-500/50';
          } else if (route.preference === 'shortest') {
            badgeIcon = <Scissors className="w-3.5 h-3.5" />;
            badgeText = 'Shortest';
            borderAccent = 'border-purple-500/50';
          } else if (route.preference === 'fastest_shortest') {
            badgeIcon = <Zap className="w-3.5 h-3.5" />;
            badgeText = 'Fastest & Shortest';
            borderAccent = 'border-blue-500/50';
          } else if (route.preference === 'alternative') {
            badgeIcon = <Navigation className="w-3.5 h-3.5" />;
            badgeText = 'Alternative';
            borderAccent = 'border-purple-500/50';
          }

          return (
            <div
              key={route.id}
              onClick={() => onSelectRoute(route.id)}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? `bg-slate-800/95 ${borderAccent} ring-1 ring-cyan-500/80 shadow-lg`
                  : 'bg-slate-900/80 border-slate-800 hover:bg-slate-800/60 hover:border-slate-700'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center space-x-2">
                  <span
                    className={`inline-flex items-center space-x-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      route.preference === 'safety_aware'
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                        : route.preference === 'fastest' || route.preference === 'fastest_shortest'
                        ? 'bg-blue-950 text-blue-300 border border-blue-800'
                        : 'bg-purple-950 text-purple-300 border border-purple-800'
                    }`}
                  >
                    {badgeIcon}
                    <span>{badgeText}</span>
                  </span>
                  {route.isSampleIllustrative && (
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded border border-slate-700">
                      Illustrative
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold text-slate-100 flex items-center justify-end space-x-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400 inline" />
                    <span>{route.durationMinutes} min</span>
                  </div>
                  <div className="text-[11px] text-slate-400">{route.distanceKm} km</div>
                </div>
              </div>

              {/* Summary description */}
              <p className="text-xs text-slate-300 mb-2 line-clamp-1">{route.summary}</p>

              {/* Safety & Confidence Indicators Row */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                {/* Safety Score Status */}
                <div className="flex items-center space-x-1.5">
                  {(evaluation?.status === 'Insufficient safety data' || evaluation?.status === 'Data unavailable') ? (
                    <div className="flex items-center space-x-1 text-slate-400">
                      <HelpCircle className="w-3 h-3 text-slate-500" />
                      <span className="text-[10px]">Data Insufficient</span>
                    </div>
                  ) : evaluation?.safetyScore !== null ? (
                    <div className="flex items-center space-x-1">
                      <span className="text-slate-400">Safety Indicator:</span>
                      <span
                        className={`font-semibold px-1.5 py-0.2 rounded text-[10px] ${
                          evaluation!.safetyScore! >= 70
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : evaluation!.safetyScore! >= 45
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}
                      >
                        {evaluation!.safetyScore}/100
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400">Calculating...</span>
                  )}
                </div>

                {/* Data Confidence Indicator */}
                <div className="flex items-center space-x-1 text-[10px]">
                  <span className="text-slate-400">Confidence:</span>
                  <span
                    className={`font-medium ${
                      confidence?.level === 'High'
                        ? 'text-emerald-400'
                        : confidence?.level === 'Medium'
                        ? 'text-amber-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {confidence?.level || 'Unknown'}{confidence?.score !== null && confidence?.score !== undefined ? ` (${confidence.score}%)` : ''}
                  </span>
                </div>
              </div>

              {/* Rural Warning if village route */}
              {evaluation?.isVillageOrRuralRoute && (
                <div className="mt-2 text-[10px] bg-amber-950/40 border border-amber-800/60 rounded p-1.5 text-amber-300 flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="truncate">Rural route: Lighting unrecorded in public registry</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
