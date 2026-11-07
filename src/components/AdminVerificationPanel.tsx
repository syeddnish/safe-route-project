import React, { useState, useEffect } from 'react';
import { X, Check, XCircle, Clock, MapPin, UserCheck, RefreshCw } from 'lucide-react';
import { ReportService, CommunityReport } from '../services/supabase/reportService';
import { isSupabaseConfigured } from '../services/supabase/client';

interface AdminVerificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onReportVerified: () => void;
}

export const AdminVerificationPanel: React.FC<AdminVerificationPanelProps> = ({
  isOpen,
  onClose,
  onReportVerified,
}) => {
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadReports = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      if (isSupabaseConfigured) {
        const reviewer = await ReportService.getAuthenticatedReviewer();
        setIsAuthorized(Boolean(reviewer));
        if (!reviewer) {
          setReports([]);
          return;
        }
      }
      const data = await ReportService.getReports();
      setReports(data);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Failed to load reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadReports();
    }
  }, [isOpen]);

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    try {
      await ReportService.signInReviewer(email, password);
      setPassword('');
      await loadReports();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Reviewer sign-in failed.');
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await ReportService.signOutReviewer();
      setIsAuthorized(false);
      setReports([]);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Reviewer sign-out failed.');
    }
  };

  const handleReviewAction = async (reportId: string, action: 'verified' | 'rejected' | 'outdated') => {
    try {
      await ReportService.reviewReport(
        reportId,
        action,
        action === 'verified'
          ? 'Audited and verified against field audit criteria.'
          : action === 'rejected'
            ? 'Rejected due to incomplete or conflicting field evidence.'
            : 'Marked outdated after review.'
      );
      setActionMessage(`Report successfully marked as ${action.toUpperCase()}.`);
      await loadReports();
      onReportVerified();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (e: any) {
      setErrorMessage(e instanceof Error ? e.message : 'Report review failed.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 text-slate-100 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-700 flex items-center justify-center text-cyan-400">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">Reviewer Verification Portal</h3>
              <p className="text-[11px] text-slate-400">
                Authorized moderation for community safety observations & village surveys
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!isSupabaseConfigured ? (
          <div className="p-3 rounded-lg bg-amber-950/50 border border-amber-800 text-amber-200 text-xs">
            Demo reports are illustrative only. Configure Supabase and sign in with an authorized reviewer account to moderate real submissions.
          </div>
        ) : isAuthorized ? (
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs shrink-0">
            <span className="text-emerald-300">Authenticated reviewer</span>
            <div className="flex items-center space-x-3">
              <button
                onClick={loadReports}
                className="text-slate-400 hover:text-cyan-400 flex items-center space-x-1 text-[11px]"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button onClick={handleSignOut} className="text-slate-400 hover:text-rose-300 text-[11px]">
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSignIn} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              placeholder="Reviewer email"
              required
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Password"
              required
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-2 rounded-lg bg-cyan-800 hover:bg-cyan-700 disabled:opacity-50 text-xs"
            >
              Sign in
            </button>
          </form>
        )}

        {errorMessage && (
          <div role="alert" className="p-2 rounded bg-rose-950/70 border border-rose-800 text-rose-300 text-xs">
            {errorMessage}
          </div>
        )}

        {actionMessage && (
          <div className="p-2 rounded bg-cyan-950/70 border border-cyan-800 text-cyan-200 text-xs font-medium">
            {actionMessage}
          </div>
        )}

        {/* Reports List */}
        <div className="overflow-y-auto space-y-3 flex-1 pr-1">
          {reports.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No reports registered yet.
            </div>
          ) : (
            reports.map((rep) => (
              <div
                key={rep.id}
                className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-200 capitalize">
                        {rep.category.replace('_', ' ')}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.2 rounded-full font-medium ${
                          rep.status === 'verified'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : rep.status === 'rejected'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : rep.status === 'outdated'
                              ? 'bg-slate-800 text-slate-300 border border-slate-700'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {rep.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center space-x-2">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(rep.createdAt).toLocaleString()}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3" />
                        <span>[{rep.coordinates[0].toFixed(4)}, {rep.coordinates[1].toFixed(4)}]</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  {rep.status === 'pending_review' && (
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleReviewAction(rep.id, 'verified')}
                        className="px-2.5 py-1 bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 rounded font-medium text-[11px] flex items-center space-x-1 transition-colors border border-emerald-700"
                      >
                        <Check className="w-3 h-3" />
                        <span>Verify</span>
                      </button>
                      <button
                        onClick={() => handleReviewAction(rep.id, 'rejected')}
                        className="px-2.5 py-1 bg-rose-900/80 hover:bg-rose-800 text-rose-200 rounded font-medium text-[11px] flex items-center space-x-1 transition-colors border border-rose-700"
                      >
                        <XCircle className="w-3 h-3" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                  {rep.status === 'verified' && isAuthorized && (
                    <button
                      onClick={() => handleReviewAction(rep.id, 'outdated')}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium text-[11px] border border-slate-700"
                    >
                      Mark outdated
                    </button>
                  )}
                </div>

                <p className="text-slate-300 bg-slate-900/60 p-2 rounded border border-slate-800/80 text-[11px]">
                  {rep.description}
                </p>

                {rep.reviewedBy && (
                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">
                    <span>Reviewed by: <strong className="text-slate-300">{rep.reviewedBy}</strong></span>
                    {rep.reviewedAt && <span>{new Date(rep.reviewedAt).toLocaleDateString()}</span>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 text-right shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
          >
            Close Portal
          </button>
        </div>
      </div>
    </div>
  );
};
