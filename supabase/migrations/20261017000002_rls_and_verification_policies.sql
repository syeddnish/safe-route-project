-- Migration 02: Row Level Security (RLS) & Verification Policies

-- Enable RLS on all tables
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if current authenticated user has reviewer or admin role
CREATE OR REPLACE FUNCTION public.is_reviewer_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('reviewer', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------------------------------------------------------------
-- 1. DATA SOURCES POLICIES
-- -------------------------------------------------------------
-- Public read access to active data sources
CREATE POLICY "Public read access for active data sources"
ON public.data_sources
FOR SELECT
USING (is_active = true);

-- Only admins/reviewers can insert/update data sources
CREATE POLICY "Reviewer and Admin full access on data sources"
ON public.data_sources
FOR ALL
USING (public.is_reviewer_or_admin());

-- -------------------------------------------------------------
-- 2. SAFETY OBSERVATIONS POLICIES
-- -------------------------------------------------------------
-- Public can read verified safety observations (or pending observations with clear unverified flag)
CREATE POLICY "Public read access for safety observations"
ON public.safety_observations
FOR SELECT
USING (true);

-- Only verified reviewers or system service role can insert or modify safety observations
CREATE POLICY "Authorized reviewers can insert safety observations"
ON public.safety_observations
FOR INSERT
WITH CHECK (public.is_reviewer_or_admin());

CREATE POLICY "Authorized reviewers can update safety observations"
ON public.safety_observations
FOR UPDATE
USING (public.is_reviewer_or_admin());

-- -------------------------------------------------------------
-- 3. COMMUNITY REPORTS POLICIES
-- -------------------------------------------------------------
-- Public can read verified community reports
CREATE POLICY "Public read access for verified community reports"
ON public.community_reports
FOR SELECT
USING (status = 'verified' OR auth.uid() = user_id OR public.is_reviewer_or_admin());

-- Anyone can submit a community report, but status MUST be 'pending_review'
CREATE POLICY "Users can submit pending community reports"
ON public.community_reports
FOR INSERT
WITH CHECK (status = 'pending_review');

-- Only authorized reviewers can update status or add moderator notes
CREATE POLICY "Authorized reviewers can moderate community reports"
ON public.community_reports
FOR UPDATE
USING (public.is_reviewer_or_admin())
WITH CHECK (public.is_reviewer_or_admin());

-- -------------------------------------------------------------
-- 4. USER ROLES POLICIES
-- -------------------------------------------------------------
-- Users can see their own role
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id OR public.is_reviewer_or_admin());
