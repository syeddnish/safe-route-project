import React from 'react';
import { X, Trees, AlertTriangle, ShieldAlert, CheckCircle, Info, ArrowRight } from 'lucide-react';

interface VillageRouteDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadVillageDemo: () => void;
}

export const VillageRouteDemoModal: React.FC<VillageRouteDemoModalProps> = ({
  isOpen,
  onClose,
  onLoadVillageDemo,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 text-slate-100 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-950 border border-amber-700 flex items-center justify-center text-amber-400">
              <Trees className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">
                Village & Rural Navigation: Missing Data Handling
              </h3>
              <p className="text-xs text-slate-400">
                Transparent safety evaluation where public telemetry does not exist
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Core Principles */}
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <div className="p-3.5 bg-amber-950/40 border border-amber-800/80 rounded-xl space-y-2">
            <div className="font-semibold text-amber-300 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>The Village Data Dilemma</span>
            </div>
            <p>
              In rural villages, official municipal databases frequently have zero entries for streetlights, police telemetry, or emergency shelters.
            </p>
            <div className="bg-slate-950/70 p-2.5 rounded border border-amber-900/60 font-medium text-amber-200 text-[11px]">
              ⚠️ <strong className="text-white">Crucial Ethical Constraint:</strong> Missing crime data in a village does NOT prove that an unlit rural path is safe. Safe Route AI strictly refuses to award high safety rankings simply because an area has zero reported records.
            </div>
          </div>

          {/* How Safe Route AI Handles Rural Routes */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-200 text-sm">How Safe Route AI Handles Village Routes:</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px]">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <div className="font-semibold text-cyan-400 flex items-center space-x-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>"Insufficient Safety Data" Status</span>
                </div>
                <p className="text-slate-400">
                  When data confidence falls below 40%, numeric scores and definitive rankings are suppressed, preventing false reassurance.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <div className="font-semibold text-emerald-400 flex items-center space-x-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Verified Local Community Audits</span>
                </div>
                <p className="text-slate-400">
                  Local residents and authorized reviewers can timestamp and audit local features (e.g. solar village lamps, Gram Panchayat emergency desks).
                </p>
              </div>
            </div>
          </div>

          {/* What to observe in the demonstration */}
          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 space-y-1.5 text-[11px]">
            <div className="font-semibold text-slate-200 flex items-center space-x-1.5">
              <Info className="w-4 h-4 text-cyan-400" />
              <span>What You Will See in the Village Route Demo:</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-slate-300">
              <li>Navigation traverses unpaved rural tracks and village roads.</li>
              <li>Lighting status is explicitly marked <strong>"Unknown / Unmapped"</strong>.</li>
              <li>Data confidence indicator drops to <strong>"Insufficient"</strong>.</li>
              <li>Active advisory informs travellers of potential lack of night illumination.</li>
            </ul>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
          >
            Dismiss
          </button>

          <button
            onClick={() => {
              onLoadVillageDemo();
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-xs font-bold text-white flex items-center space-x-1.5 shadow-lg shadow-amber-950 transition-all"
          >
            <span>Load Village Demo Route Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
