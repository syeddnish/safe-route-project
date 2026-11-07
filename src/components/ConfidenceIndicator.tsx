import React from 'react';
import { DataConfidenceEvaluation } from '../types/safety';
import { Database, Activity, MapPin, Shield } from 'lucide-react';

interface ConfidenceIndicatorProps {
  evaluation?: DataConfidenceEvaluation;
}

export const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({ evaluation }) => {
  if (!evaluation) return null;

  const { score, level, breakdown, summaryText } = evaluation;

  let levelColor = 'text-slate-400 border-slate-700 bg-slate-800';
  let barColor = 'bg-slate-500';

  if (level === 'High') {
    levelColor = 'text-emerald-400 border-emerald-800 bg-emerald-950/70';
    barColor = 'bg-emerald-500';
  } else if (level === 'Medium') {
    levelColor = 'text-amber-400 border-amber-800 bg-amber-950/70';
    barColor = 'bg-amber-500';
  } else if (level === 'Low') {
    levelColor = 'text-orange-400 border-orange-800 bg-orange-950/70';
    barColor = 'bg-orange-500';
  } else {
    levelColor = 'text-slate-400 border-slate-700 bg-slate-800';
    barColor = 'bg-slate-600';
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl text-slate-100 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
            Data Quality Audit
          </span>
          <h4 className="text-xs font-bold text-slate-200">Data Confidence Indicator</h4>
        </div>

        <div className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${levelColor}`}>
          {level} Confidence{score !== null ? ` (${score}%)` : ''}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${score ?? 0}%` }}
        />
      </div>

      <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
        {summaryText}
      </p>

      {/* 5 Confidence Pillars */}
      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
        <div className="p-2 bg-slate-800/60 rounded border border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-slate-300">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Route Coverage</span>
          </div>
          <span className="font-semibold text-slate-200">{breakdown.coverageScore}%</span>
        </div>

        <div className="p-2 bg-slate-800/60 rounded border border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-slate-300">
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>Freshness</span>
          </div>
          <span className="font-semibold text-slate-200">{breakdown.freshnessScore}%</span>
        </div>

        <div className="p-2 bg-slate-800/60 rounded border border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-slate-300">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Source Quality</span>
          </div>
          <span className="font-semibold text-slate-200">{breakdown.sourceQualityScore}%</span>
        </div>

        <div className="p-2 bg-slate-800/60 rounded border border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span>Geo Precision</span>
          </div>
          <span className="font-semibold text-slate-200">{breakdown.geographicPrecisionScore}%</span>
        </div>
      </div>
    </div>
  );
};
