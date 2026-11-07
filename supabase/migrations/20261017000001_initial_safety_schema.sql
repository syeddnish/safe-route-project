-- Migration 01: Initial Safety Schema for Safe Route AI
-- Enable PostGIS extension if available, or use standard float coordinates
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Data Sources Metadata Table
CREATE TABLE IF NOT EXISTS public.data_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'streetlights', 'facilities', 'community', 'district_stats'
    provider VARCHAR(255) NOT NULL, -- e.g. 'OpenStreetMap', 'Municipal GIS', 'Community Reviewers'
    update_frequency VARCHAR(100) NOT NULL DEFAULT 'monthly',
    geographic_level VARCHAR(100) NOT NULL DEFAULT 'point', -- 'point', 'street_segment', 'district'
    terms_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_synced_at TIMESTAMPTZ
);

-- 2. Safety Observations Table
CREATE TABLE IF NOT EXISTS public.safety_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_source_id UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
    category VARCHAR(100) NOT NULL, -- 'streetlight', 'public_facility', 'road_type', 'community_report', 'district_crime_stat'
    longitude DOUBLE PRECISION NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    geographic_precision VARCHAR(50) NOT NULL DEFAULT 'exact_point', -- 'exact_point', 'street_segment', 'neighborhood', 'district', 'unknown'
    source_name VARCHAR(255) NOT NULL,
    reporting_period VARCHAR(100),
    verification_status VARCHAR(50) NOT NULL DEFAULT 'unverified', -- 'verified', 'unverified', 'rejected', 'pending_review'
    verified_by VARCHAR(255),
    verified_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    properties JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for spatial/bounding box queries
CREATE INDEX IF NOT EXISTS idx_safety_observations_coords 
ON public.safety_observations (longitude, latitude);

CREATE INDEX IF NOT EXISTS idx_safety_observations_category 
ON public.safety_observations (category);

CREATE INDEX IF NOT EXISTS idx_safety_observations_status 
ON public.safety_observations (verification_status);

-- 3. Community Reports Table
CREATE TABLE IF NOT EXISTS public.community_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    category VARCHAR(100) NOT NULL, -- 'lighting_issue', 'deserted_area', 'safe_haven', 'general_hazard'
    longitude DOUBLE PRECISION NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending_review', -- 'pending_review', 'verified', 'rejected'
    moderator_notes TEXT,
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_reports_coords 
ON public.community_reports (longitude, latitude);

CREATE INDEX IF NOT EXISTS idx_community_reports_status 
ON public.community_reports (status);

-- 4. User Roles Table (to distinguish public users, reviewers, and admins)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    role VARCHAR(50) NOT NULL DEFAULT 'user', -- 'user', 'reviewer', 'admin'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
