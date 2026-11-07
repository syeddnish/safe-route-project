import React from 'react';
import { X, Lock, ShieldCheck, EyeOff, PhoneOff } from 'lucide-react';

interface PrivacyNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyNoticeModal: React.FC<PrivacyNoticeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 text-slate-100 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-700 flex items-center justify-center text-cyan-400">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">Privacy & Safety Guarantees</h3>
              <p className="text-[11px] text-slate-400">Ethical design and user protection policies</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Policies */}
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
            <div className="font-semibold text-cyan-300 flex items-center space-x-2">
              <EyeOff className="w-4 h-4 text-cyan-400" />
              <span>1. Zero Location History Storage</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              We request your current GPS position solely when you explicitly tap "Use My Location". Your location coordinates are processed only in client-side memory for routing and are never persisted in a user history database or sold to third parties.
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
            <div className="font-semibold text-emerald-300 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>2. Moderated Integrity Workflow</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Community-submitted reports are strictly isolated in a pending status. No unverified submission can directly modify safety scores, preventing spam or malicious tampering with community routes.
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
            <div className="font-semibold text-amber-300 flex items-center space-x-2">
              <PhoneOff className="w-4 h-4 text-amber-400" />
              <span>3. No Fabricated Emergency Services</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Safe Route AI does not claim to directly dispatch emergency personnel or substitute for national emergency telephone services (such as 112). In emergencies, always dial official local emergency hotlines directly.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
