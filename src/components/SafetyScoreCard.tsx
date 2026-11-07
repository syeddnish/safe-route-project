import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertCircle, 
  HelpCircle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  ShieldAlert 
} from 'lucide-react';
import { SafetyEvaluation } from '../types/safety';

interface SafetyScoreCardProps {
  evaluation?: SafetyEvaluation;
  routeName: string;
}

export const SafetyScoreCard: React.FC<SafetyScoreCardProps> = ({ evaluation, routeName }) => {
  const [showFormulaDetails, setShowFormulaDetails] = useState(false);

  if (!evaluation) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center text-xs text-slate-400">
        Select a route to view explainable safety and data-confidence breakdown.
      </div>
    );
  }

  const { safetyScore, status, isDefinitiveRankingAllowed, subScores, explanations, confidence, disclaimer, villageCoverageNotice } = evaluation;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-xl text-slate-100">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-800 pb-3">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
            Explainable Safety Evaluation
          </span>
          <h3 className="text-sm font-bold text-slate-100 truncate max-w-[260px]">{routeName}</h3>
        </div>

        {/* Safety Indicator Badge */}
        {(status === 'Insufficient safety data' || status === 'Data unavailable') ? (
          <div className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Insufficient Data</span>
          </div>
        ) : (
          <div
            className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center space-x-1.5 ${
              safetyScore! >= 70
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                : safetyScore! >= 45
                ? 'bg-amber-950/80 text-amber-300 border-amber-700'
                : 'bg-rose-950/80 text-rose-300 border-rose-700'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{safetyScore}/100</span>
          </div>
        )}
      </div>

      {/* Village Notice if applicable */}
      {villageCoverageNotice && (
        <div className="p-2.5 rounded-lg bg-amber-950/50 border border-amber-800/80 text-amber-200 text-xs space-y-1">
          <div className="font-semibold flex items-center space-x-1.5 text-amber-300">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Rural Route Telemetry Gap</span>
          </div>
          <p className="text-[11px] leading-relaxed text-amber-200/90">{villageCoverageNotice}</p>
        </div>
      )}

      {/* Status Description Banner */}
      <div className="p-2.5 rounded-lg bg-slate-800/70 border border-slate-700/60 text-xs">
        <div className="font-semibold text-slate-200 mb-0.5">Assessment: {status}</div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          {!isDefinitiveRankingAllowed
            ? 'Due to sparse coverage or missing municipal records along this corridor, definitive rankings are deliberately suppressed to prevent false reassurance.'
            : 'Heuristic synthesis of the available evidence listed below. Missing factors are excluded; this is not a verified assessment of personal safety.'}
        </p>
      </div>

      {/* Sub-Scores Breakdown */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
          <span>Observable Factor Indicators</span>
          <span className="text-[10px] text-slate-500">Documented Weights</span>
        </div>

        <div className="space-y-1.5 text-xs">
          {/* Lighting */}
          <div>
            <div className="flex justify-between text-[11px] mb-0.5">
              <span className="text-slate-300">Lighting Infrastructure (30%)</span>
              <span className="font-medium text-slate-200">
                {subScores.lightingIndicator !== null ? `${subScores.lightingIndicator}/100` : 'Unknown / Unmapped'}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 rounded-full transition-all"
                style={{ width: `${subScores.lightingIndicator ?? 0}%` }}
              />
            </div>
          </div>

          {/* Road Classification */}
          <div>
            <div className="flex justify-between text-[11px] mb-0.5">
              <span className="text-slate-300">Road Class & Circulation (25%)</span>
              <span className="font-medium text-slate-200">
                {subScores.roadClassificationIndicator !== null
                  ? `${subScores.roadClassificationIndicator}/100`
                  : 'Unclassified'}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${subScores.roadClassificationIndicator ?? 0}%` }}
              />
            </div>
          </div>

          {/* Public Facilities */}
          <div>
            <div className="flex justify-between text-[11px] mb-0.5">
              <span className="text-slate-300">Safe Havens / Public Facilities (20%)</span>
              <span className="font-medium text-slate-200">
                {subScores.facilityProximityIndicator !== null
                  ? `${subScores.facilityProximityIndicator}/100`
                  : 'Unavailable'}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${subScores.facilityProximityIndicator ?? 0}%` }}
              />
            </div>
          </div>

          {/* Verified Community Feedback */}
          <div>
            <div className="flex justify-between text-[11px] mb-0.5">
              <span className="text-slate-300">Verified Community Reports (15%)</span>
              <span className="font-medium text-slate-200">
                {subScores.verifiedCommunityIndicator !== null
                  ? `${subScores.verifiedCommunityIndicator}/100`
                  : 'Unavailable'}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all"
                style={{ width: `${subScores.verifiedCommunityIndicator ?? 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Explanations and Evidence Lists */}
      <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
        <div className="font-semibold text-slate-300">Ranking Factors & Evidence</div>

        {/* Positive / Explanatory Factors */}
        <div className="space-y-1">
          {explanations.map((exp, i) => (
            <div key={i} className="flex items-start space-x-1.5 text-[11px] text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
              <span>{exp}</span>
            </div>
          ))}
        </div>

        {confidence.knownSources.length > 0 && (
          <div className="pt-1.5">
            <div className="text-[11px] font-semibold text-slate-300 mb-1">Evidence Sources & Dates</div>
            <ul className="space-y-1">
              {confidence.knownSources.map((source) => (
                <li
                  key={`${source.name}-${source.category}`}
                  className="text-[10px] text-slate-400 bg-slate-950/60 rounded px-2 py-1"
                >
                  <span className="text-slate-300">{source.name}</span>
                  {' · '}{source.category}
                  {source.verificationStatus && ` · ${source.verificationStatus}`}
                  {source.lastUpdated && ` · Updated ${source.lastUpdated}`}
                  {source.precision && ` · ${source.precision}`}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Missing Evidence */}
        {confidence.missingDataItems.length > 0 && (
          <div className="pt-2">
            <div className="text-[11px] font-semibold text-amber-400 flex items-center space-x-1 mb-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Missing Evidence (Lowers Confidence)</span>
            </div>
            <ul className="space-y-0.5 pl-4 list-disc text-[11px] text-slate-400">
              {confidence.missingDataItems.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Stale Evidence */}
        {confidence.staleDataItems.length > 0 && (
          <div className="pt-1.5">
            <div className="text-[11px] font-semibold text-rose-400 flex items-center space-x-1 mb-1">
              <Clock className="w-3.5 h-3.5 text-rose-400" />
              <span>Stale / Expired Data</span>
            </div>
            <ul className="space-y-0.5 pl-4 list-disc text-[11px] text-slate-400">
              {confidence.staleDataItems.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Conflicting Evidence */}
        {confidence.conflictingItems.length > 0 && (
          <div className="pt-1.5">
            <div className="text-[11px] font-semibold text-orange-400 flex items-center space-x-1 mb-1">
              <ShieldAlert className="w-3.5 h-3.5 text-orange-400" />
              <span>Conflicting Observations</span>
            </div>
            <ul className="space-y-0.5 pl-4 list-disc text-[11px] text-slate-400">
              {confidence.conflictingItems.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Expandable Technical Engine Rationale */}
      <div className="pt-2 border-t border-slate-800">
        <button
          type="button"
          onClick={() => setShowFormulaDetails(!showFormulaDetails)}
          className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center justify-between w-full font-medium"
        >
          <span className="flex items-center space-x-1">
            <FileText className="w-3 h-3 text-cyan-400" />
            <span>Transparent Engine Methodology</span>
          </span>
          {showFormulaDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {showFormulaDetails && (
          <div className="mt-2 text-[10px] bg-slate-950 p-2.5 rounded border border-slate-800 text-slate-400 space-y-1.5 leading-relaxed">
            <p>
              <strong className="text-slate-200">Rule-based baseline:</strong> This calculation uses documented, deterministic linear weighting rather than machine learning or unvalidated predictive black-box algorithms.
            </p>
            <p>
              <strong className="text-slate-200">Data Confidence separation:</strong> Missing evidence lowers data confidence score rather than arbitrarily penalizing or rewarding estimated route danger.
            </p>
            <p>
              <strong className="text-slate-200">District Crime Stats Safeguard:</strong> Macro district crime statistics are not extrapolated to invent fake micro street-level incident rates.
            </p>
          </div>
        )}
      </div>

      {/* Mandatory Disclaimer */}
      <div className="text-[10px] text-slate-500 bg-slate-950/70 p-2 rounded border border-slate-800/80 leading-normal">
        {disclaimer}
      </div>
    </div>
  );
};
