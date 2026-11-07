import React, { useState } from 'react';
import { Key, ExternalLink, X } from 'lucide-react';
import { isSupabaseConfigured } from '../services/supabase/client';

interface DemoModeBannerProps {
  isRoutingDemo: boolean;
  isSafetyDataDemo: boolean;
  routingProviderName: string;
}

export const DemoModeBanner: React.FC<DemoModeBannerProps> = ({
  isRoutingDemo,
  isSafetyDataDemo,
  routingProviderName,
}) => {
  const [showConfigModal, setShowConfigModal] = useState(false);

  return (
    <>
      {/* Top Banner */}
      <div className="bg-amber-950/90 border-b border-amber-800 text-amber-200 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 z-50">
        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 rounded bg-amber-900 border border-amber-700 text-amber-200 font-bold uppercase tracking-wider text-[10px]">
            {isRoutingDemo ? 'DEMO / ILLUSTRATIVE' : 'SAFETY DATA DEMO'}
          </span>
          <span className="font-medium text-amber-100">
            {isRoutingDemo && isSafetyDataDemo
              ? 'ROUTES AND SAFETY DATA ARE ILLUSTRATIVE'
              : isRoutingDemo
                ? 'ROUTES ARE ILLUSTRATIVE'
                : 'SAFETY OBSERVATIONS ARE ILLUSTRATIVE'}
          </span>
          <span className="hidden sm:inline text-amber-300/80">
            {isRoutingDemo && isSafetyDataDemo
              ? '— Sample routes and observations are not verified real-world data.'
              : isRoutingDemo
                ? '— Route geometry and travel estimates are sample data.'
                : '— Live routes; safety scores/confidence use sample observations.'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[11px] text-amber-300">
            Routing: <strong className="text-amber-100">{routingProviderName}</strong>
          </span>
          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="px-2.5 py-1 rounded bg-amber-900/80 hover:bg-amber-900 border border-amber-700 text-amber-100 font-medium text-[11px] flex items-center space-x-1 transition-colors"
          >
            <Key className="w-3 h-3 text-amber-300" />
            <span>API & Setup Config</span>
          </button>
        </div>
      </div>

      {/* Configuration Guide Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-5 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Key className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-sm">Provider & Backend Setup</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5">
                <div className="font-semibold text-slate-200 flex items-center justify-between">
                  <span>1. Live Routing Provider (OpenRouteService)</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${isRoutingDemo ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'}`}>
                    {isRoutingDemo ? 'Using Demo Routes' : 'Live Provider Selected'}
                  </span>
                </div>
                <p className="text-slate-400">
                  To calculate real-world walking paths, obtain a free API key from{' '}
                  <a href="https://openrouteservice.org" target="_blank" rel="noreferrer" className="text-cyan-400 underline inline-flex items-center">
                    openrouteservice.org <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                  </a>{' '}
                  and add it to your <code className="text-cyan-300 bg-slate-900 px-1 rounded">.env</code>:
                </p>
                <div className="bg-slate-900 p-2 rounded text-[11px] font-mono text-cyan-300">
                  VITE_ROUTING_PROVIDER=openrouteservice<br />
                  VITE_OPENROUTESERVICE_API_KEY=your_key_here
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5">
                <div className="font-semibold text-slate-200 flex items-center justify-between">
                  <span>2. Supabase Backend & Database</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${isSupabaseConfigured ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}`}>
                    {isSupabaseConfigured ? 'Credentials Configured' : 'Demo Mode Fallback'}
                  </span>
                </div>
                <p className="text-slate-400">
                  Configure your Supabase project URL and Anon key in <code className="text-cyan-300 bg-slate-900 px-1 rounded">.env</code>:
                </p>
                <div className="bg-slate-900 p-2 rounded text-[11px] font-mono text-cyan-300">
                  VITE_SUPABASE_URL=https://your-project.supabase.co<br />
                  VITE_SUPABASE_ANON_KEY=your_anon_key
                </div>
                <p className="text-[10px] text-slate-500">
                  Run SQL migrations from <code className="text-slate-400">supabase/migrations/</code> in your Supabase SQL Editor.
                </p>
              </div>

              <div className="p-2.5 bg-blue-950/40 rounded-lg border border-blue-900/60 text-[11px] text-blue-200">
                <strong>Safety Data Limits:</strong> No real crime data or emergency services are fabricated. When safety data is in demo mode, observations and derived confidence values are illustrative examples, not verified facts.
              </div>
            </div>

            <div className="text-right pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
