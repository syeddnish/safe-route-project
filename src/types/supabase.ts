// Supabase Database Schema TypeScript Types
// Matches SQL migrations: 20261017000001_initial_safety_schema.sql and 20261017000002_rls_and_verification_policies.sql

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      data_sources: {
        Row: {
          id: string;
          name: string;
          category: string;
          provider: string;
          update_frequency: string;
          geographic_level: string;
          terms_url: string | null;
          is_active: boolean;
          created_at: string;
          last_synced_at: string | null;
          reliability_score: number | null;
          coverage_description: string | null;
          attribution: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          category: string;
          provider: string;
          update_frequency?: string;
          geographic_level?: string;
          terms_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          last_synced_at?: string | null;
          reliability_score?: number | null;
          coverage_description?: string | null;
          attribution?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string;
          provider?: string;
          update_frequency?: string;
          geographic_level?: string;
          terms_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          last_synced_at?: string | null;
          reliability_score?: number | null;
          coverage_description?: string | null;
          attribution?: string | null;
        };
        Relationships: [];
      };
      locations: {
        Row: {
          id: string;
          name: string;
          location_type: 'village' | 'town' | 'city' | 'district' | 'other';
          longitude: number;
          latitude: number;
          village: string | null;
          town: string | null;
          district: string | null;
          state: string | null;
          coverage_completeness: number | null;
          coverage_metadata: Json;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          location_type: 'village' | 'town' | 'city' | 'district' | 'other';
          longitude: number;
          latitude: number;
          village?: string | null;
          town?: string | null;
          district?: string | null;
          state?: string | null;
          coverage_completeness?: number | null;
          coverage_metadata?: Json;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          location_type?: 'village' | 'town' | 'city' | 'district' | 'other';
          longitude?: number;
          latitude?: number;
          village?: string | null;
          town?: string | null;
          district?: string | null;
          state?: string | null;
          coverage_completeness?: number | null;
          coverage_metadata?: Json;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      safety_observations: {
        Row: {
          id: string;
          data_source_id: string | null;
          community_report_id: string | null;
          category: string;
          longitude: number;
          latitude: number;
          geographic_precision: string;
          source_name: string;
          reporting_period: string | null;
          verification_status: 'verified' | 'unverified' | 'rejected' | 'pending_review';
          verified_by: string | null;
          verified_at: string | null;
          expires_at: string | null;
          properties: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          data_source_id?: string | null;
          community_report_id?: string | null;
          category: string;
          longitude: number;
          latitude: number;
          geographic_precision?: string;
          source_name: string;
          reporting_period?: string | null;
          verification_status?: 'verified' | 'unverified' | 'rejected' | 'pending_review';
          verified_by?: string | null;
          verified_at?: string | null;
          expires_at?: string | null;
          properties?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          data_source_id?: string | null;
          community_report_id?: string | null;
          category?: string;
          longitude?: number;
          latitude?: number;
          geographic_precision?: string;
          source_name?: string;
          reporting_period?: string | null;
          verification_status?: 'verified' | 'unverified' | 'rejected' | 'pending_review';
          verified_by?: string | null;
          verified_at?: string | null;
          expires_at?: string | null;
          properties?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "safety_observations_data_source_id_fkey";
            columns: ["data_source_id"];
            isOneToOne: false;
            referencedRelation: "data_sources";
            referencedColumns: ["id"];
          }
        ];
      };
      community_reports: {
        Row: {
          id: string;
          user_id: string | null;
          category: string;
          longitude: number;
          latitude: number;
          description: string;
          status: 'pending_review' | 'verified' | 'rejected' | 'outdated';
          moderator_notes: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
          source: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          category: string;
          longitude: number;
          latitude: number;
          description: string;
          status?: 'pending_review' | 'verified' | 'rejected' | 'outdated';
          moderator_notes?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          source?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          category?: string;
          longitude?: number;
          latitude?: number;
          description?: string;
          status?: 'pending_review' | 'verified' | 'rejected' | 'outdated';
          moderator_notes?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          source?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: 'user' | 'reviewer' | 'admin';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role?: 'user' | 'reviewer' | 'admin';
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: 'user' | 'reviewer' | 'admin';
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_reviewer_or_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
