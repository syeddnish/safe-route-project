// Community Reports Service
// Enforces:
// 1. Unverified reports start in 'pending_review' and NEVER immediately affect official rankings.
// 2. Only authorized reviewers can mark reports as 'verified'.
// 3. Demo fallback storage when Supabase is not connected.

import { supabase, isSupabaseConfigured } from './client';
import { GeoCoordinate } from '../../types/route';

export interface CommunityReport {
  id: string;
  category: 'lighting_issue' | 'deserted_area' | 'safe_haven' | 'general_hazard';
  coordinates: GeoCoordinate;
  description: string;
  status: 'pending_review' | 'verified' | 'rejected' | 'outdated';
  moderatorNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export type ReportCategory = CommunityReport['category'];
export type ReportStatus = CommunityReport['status'];

export interface ReportInput {
  category: ReportCategory;
  coordinates: GeoCoordinate;
  description: string;
}

const reportCategories: ReportCategory[] = [
  'lighting_issue',
  'deserted_area',
  'safe_haven',
  'general_hazard',
];
const reportStatuses: ReportStatus[] = ['pending_review', 'verified', 'rejected', 'outdated'];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isReportCategory(value: unknown): value is ReportCategory {
  return typeof value === 'string' && reportCategories.includes(value as ReportCategory);
}

export function validateReportInput(report: unknown): ReportInput {
  if (typeof report !== 'object' || report === null) {
    throw new Error('Report details are required.');
  }
  const candidate = report as Record<string, unknown>;
  if (!isReportCategory(candidate.category)) {
    throw new Error('Select a valid report category.');
  }
  if (!Array.isArray(candidate.coordinates) || candidate.coordinates.length !== 2) {
    throw new Error('Enter valid longitude and latitude coordinates.');
  }
  const [longitude, latitude] = candidate.coordinates;
  if (
    typeof longitude !== 'number' || typeof latitude !== 'number' ||
    !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
    !Number.isFinite(latitude) || latitude < -90 || latitude > 90
  ) {
    throw new Error('Enter valid longitude and latitude coordinates.');
  }
  if (typeof candidate.description !== 'string') {
    throw new Error('Report details must be text.');
  }
  const description = candidate.description
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();

  if (description.length < 5 || description.length > 2000) {
    throw new Error('Report details must be between 5 and 2000 characters.');
  }

  return {
    category: candidate.category,
    coordinates: [longitude, latitude],
    description,
  };
}

function validateReportId(reportId: string, requireUuid: boolean): string {
  if (typeof reportId !== 'string' || reportId.trim().length === 0 || reportId.length > 100) {
    throw new Error('A valid report identifier is required.');
  }
  if (requireUuid && !uuidPattern.test(reportId)) {
    throw new Error('A valid report identifier is required.');
  }
  return reportId;
}

function validateModeratorNotes(notes?: string): string | null {
  if (notes === undefined) {
    return null;
  }
  if (typeof notes !== 'string' || notes.length > 2000) {
    throw new Error('Moderator notes must be 2000 characters or fewer.');
  }
  return notes.trim() || null;
}

function mapReportRow(row: {
  id: string;
  category: string;
  longitude: number;
  latitude: number;
  description: string;
  status: string;
  moderator_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}): CommunityReport {
  if (!reportCategories.includes(row.category as ReportCategory)) {
    throw new Error('The database returned a report with an unsupported category.');
  }
  if (!reportStatuses.includes(row.status as ReportStatus)) {
    throw new Error('The database returned a report with an unsupported status.');
  }
  return {
    id: row.id,
    category: row.category as ReportCategory,
    coordinates: [row.longitude, row.latitude],
    description: row.description,
    status: row.status as ReportStatus,
    moderatorNotes: row.moderator_notes ?? undefined,
    reviewedBy: row.reviewed_by ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    createdAt: row.created_at,
  };
}

// In-memory demo reports store for interactive testing without database setup
let demoReportsStore: CommunityReport[] = [
  {
    id: 'rep-demo-1',
    category: 'lighting_issue',
    coordinates: [77.2185, 28.6345],
    description: 'Streetlight pole #4 has been unlit for the past 4 nights. Dark shadow under footbridge.',
    status: 'verified',
    moderatorNotes: 'Confirmed by municipal field survey on Oct 2, 2026.',
    reviewedBy: 'Authorized Reviewer (Urban Audit)',
    reviewedAt: '2026-10-02T10:00:00Z',
    createdAt: '2026-10-01T19:30:00Z',
  },
  {
    id: 'rep-demo-2',
    category: 'deserted_area',
    coordinates: [77.2210, 28.6365],
    description: 'Pedestrian underpass gate closed after 8 PM, forced detour through unlit alley.',
    status: 'pending_review',
    createdAt: '2026-10-16T21:15:00Z',
  },
  {
    id: 'rep-demo-3-village',
    category: 'safe_haven',
    coordinates: [73.8900, 18.8520],
    description: 'Local Gram Panchayat solar emergency lamp installed at the canal intersection; active grocery store open until 10 PM.',
    status: 'pending_review',
    createdAt: '2026-10-15T08:00:00Z',
  },
];

export class ReportService {
  /**
   * Submit a new community report.
   * By default, status is strictly 'pending_review' to prevent unverified manipulation.
   */
  public static async submitReport(report: ReportInput): Promise<CommunityReport> {
    const validated = validateReportInput(report);

    if (isSupabaseConfigured && supabase) {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(`Could not verify the report submission session: ${sessionError.message}`);
      }

      const reportId = globalThis.crypto?.randomUUID?.();
      if (!reportId) {
        throw new Error('Secure report identifiers are unavailable in this browser.');
      }
      const createdAt = new Date().toISOString();
      const { error } = await supabase
        .from('community_reports')
        .insert({
          id: reportId,
          user_id: sessionData.session?.user.id ?? null,
          category: validated.category,
          longitude: validated.coordinates[0],
          latitude: validated.coordinates[1],
          description: validated.description,
          status: 'pending_review', // ALWAYS pending until verified
        });

      if (error) {
        throw new Error(`Failed to save report: ${error.message}`);
      }

      return {
        id: reportId,
        category: validated.category,
        coordinates: validated.coordinates,
        description: validated.description,
        status: 'pending_review',
        createdAt,
      };
    }

    // Demo Mode in-memory creation
    const newDemoReport: CommunityReport = {
      id: `rep-local-${Date.now()}`,
      category: validated.category,
      coordinates: validated.coordinates,
      description: validated.description,
      status: 'pending_review',
      createdAt: new Date().toISOString(),
    };

    demoReportsStore = [newDemoReport, ...demoReportsStore];
    return newDemoReport;
  }

  /**
   * Retrieve reports for moderation or display
   */
  public static async getReports(): Promise<CommunityReport[]> {
    if (isSupabaseConfigured && supabase) {
      const reviewer = await this.getAuthenticatedReviewer();
      if (!reviewer) {
        throw new Error('Sign in with an authorized reviewer account to view reports.');
      }

      const { data, error } = await supabase
        .from('community_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, 99);

      if (error) {
        throw new Error(`Failed to load reports: ${error.message}`);
      }

      return (data || []).map(mapReportRow);
    }

    return [...demoReportsStore];
  }

  /**
   * RLS determines whether the caller can see this report (verified reports,
   * the submitter's own report, or reports visible to a reviewer).
   */
  public static async getReport(reportId: string): Promise<CommunityReport> {
    if (isSupabaseConfigured && supabase) {
      const id = validateReportId(reportId, true);
      const { data, error } = await supabase
        .from('community_reports')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to load report: ${error.message}`);
      }
      if (!data) {
        throw new Error('Report was not found or is not available to this account.');
      }
      return mapReportRow(data);
    }

    const id = validateReportId(reportId, false);
    const report = demoReportsStore.find((item) => item.id === id);
    if (!report) {
      throw new Error('Report was not found in demo mode.');
    }
    return report;
  }

  /**
   * Only an authenticated reviewer can moderate a report. RLS remains the
   * authoritative authorization check on the database.
   */
  public static async reviewReport(
    reportId: string,
    newStatus: 'verified' | 'rejected' | 'outdated',
    notes?: string
  ): Promise<void> {
    const id = validateReportId(reportId, isSupabaseConfigured);
    if (!['verified', 'rejected', 'outdated'].includes(newStatus)) {
      throw new Error('Select a valid moderation status.');
    }
    const moderatorNotes = validateModeratorNotes(notes);

    if (isSupabaseConfigured && supabase) {
      const reviewer = await this.getAuthenticatedReviewer();
      if (!reviewer) {
        throw new Error('Sign in with an authorized reviewer account to moderate reports.');
      }

      const { data, error } = await supabase
        .from('community_reports')
        .update({
          status: newStatus,
          moderator_notes: moderatorNotes,
        })
        .eq('id', id)
        .in('status', newStatus === 'outdated' ? ['verified'] : ['pending_review'])
        .select('id')
        .maybeSingle();

      if (error) {
        throw new Error(`Review action failed: ${error.message}`);
      }
      if (!data) {
        throw new Error('Report was not found or is no longer eligible for this review action.');
      }
      return;
    }

    throw new Error('Report verification is unavailable in demo mode.');
  }

  public static async signInReviewer(email: string, password: string): Promise<void> {
    if (!supabase || !isSupabaseConfigured) {
      throw new Error('Configure Supabase to sign in as a reviewer.');
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(`Reviewer sign-in failed: ${error.message}`);
    }

    const reviewer = await this.getAuthenticatedReviewer();
    if (!reviewer) {
      await supabase.auth.signOut();
      throw new Error('This account is not authorized to review reports.');
    }
  }

  public static async signOutReviewer(): Promise<void> {
    if (!supabase || !isSupabaseConfigured) {
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(`Reviewer sign-out failed: ${error.message}`);
    }
  }

  public static async getAuthenticatedReviewer(): Promise<{ id: string } | null> {
    if (!supabase || !isSupabaseConfigured) {
      return null;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      throw new Error(`Could not verify reviewer session: ${userError.message}`);
    }
    if (!userData.user) {
      return null;
    }

    const { data: role, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .maybeSingle();
    if (roleError) {
      throw new Error(`Could not verify reviewer permissions: ${roleError.message}`);
    }

    return role?.role === 'reviewer' || role?.role === 'admin'
      ? { id: userData.user.id }
      : null;
  }
}
