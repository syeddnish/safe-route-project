import React, { useState } from 'react';
import { X, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { ReportService } from '../services/supabase/reportService';
import { GeoCoordinate } from '../types/route';

interface CommunityReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCoords: GeoCoordinate;
  onReportSubmitted: () => void;
}

export const CommunityReportModal: React.FC<CommunityReportModalProps> = ({
  isOpen,
  onClose,
  defaultCoords,
  onReportSubmitted,
}) => {
  const [category, setCategory] = useState<'lighting_issue' | 'deserted_area' | 'safe_haven' | 'general_hazard'>('lighting_issue');
  const [description, setDescription] = useState('');
  const [lon, setLon] = useState(defaultCoords[0]);
  const [lat, setLat] = useState(defaultCoords[1]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await ReportService.submitReport({
        category,
        coordinates: [lon, lat],
        description,
      });

      setSuccessMessage(
        'Your report has been successfully recorded as "Pending Review". To safeguard routing integrity, unverified reports do not alter official safety rankings until audited by an authorized reviewer.'
      );
      setDescription('');
      setTimeout(() => {
        onReportSubmitted();
        setIsSubmitting(false);
        setSuccessMessage(null);
        onClose();
      }, 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit report.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 text-slate-100 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-950 border border-orange-700 flex items-center justify-center text-orange-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">Submit Community Observation</h3>
              <p className="text-[11px] text-slate-400">Crowdsourced local safety intelligence</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success / Error Messages */}
        {successMessage ? (
          <div className="p-3.5 bg-emerald-950/70 border border-emerald-800 rounded-xl space-y-2 text-xs text-emerald-200">
            <div className="flex items-center space-x-2 font-semibold text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
              <span>Report Submitted for Moderation</span>
            </div>
            <p className="leading-relaxed">{successMessage}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {/* Integrity Notice */}
            <div className="p-2.5 bg-blue-950/40 border border-blue-800/60 rounded-lg text-slate-300 space-y-1 text-[11px] leading-relaxed">
              <strong className="text-cyan-300">Data Integrity Policy:</strong> Submitted reports are marked{' '}
              <span className="font-mono text-cyan-200">pending_review</span>. Unverified submissions will NOT alter official safety rankings until validated.
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="font-medium text-slate-300">Report Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="lighting_issue">💡 Non-functional / Broken Streetlight</option>
                <option value="deserted_area">🌑 Dark or Deserted Stretch</option>
                <option value="safe_haven">🏥 Verified Safe Haven (Open Shop / Help Desk)</option>
                <option value="general_hazard">⚠️ General Pedestrian Hazard or Obstruction</option>
              </select>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="font-medium text-slate-300">Observation Details</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe exact conditions (e.g. Broken lamp at corner, dark lane behind store, active vendor stall until midnight)"
                rows={3}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 placeholder-slate-500"
              />
            </div>

            {/* Coordinates */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <label className="text-slate-400">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lon}
                  onChange={(e) => setLon(parseFloat(e.target.value))}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded p-1.5 text-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="text-slate-400">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={(e) => setLat(parseFloat(e.target.value))}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded p-1.5 text-slate-200 text-xs"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="p-2 rounded bg-rose-950/70 border border-rose-800 text-rose-300 text-xs">
                {errorMessage}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs flex items-center space-x-1.5 shadow-md disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit for Verification</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
