-- Additive backend hardening and village/location coverage support.

ALTER TABLE public.data_sources
  ADD COLUMN reliability_score SMALLINT CHECK (reliability_score BETWEEN 0 AND 100),
  ADD COLUMN coverage_description TEXT,
  ADD COLUMN attribution TEXT;

ALTER TABLE public.safety_observations
  ADD COLUMN community_report_id UUID UNIQUE REFERENCES public.community_reports(id) ON DELETE SET NULL,
  ADD CONSTRAINT safety_observations_longitude_range CHECK (longitude BETWEEN -180 AND 180),
  ADD CONSTRAINT safety_observations_latitude_range CHECK (latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT safety_observations_verification_status_check
    CHECK (verification_status IN ('verified', 'unverified', 'rejected', 'pending_review'));

ALTER TABLE public.community_reports
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN source TEXT NOT NULL DEFAULT 'community_submission',
  ADD CONSTRAINT community_reports_longitude_range CHECK (longitude BETWEEN -180 AND 180),
  ADD CONSTRAINT community_reports_latitude_range CHECK (latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT community_reports_description_length CHECK (char_length(description) BETWEEN 5 AND 2000),
  ADD CONSTRAINT community_reports_category_check
    CHECK (category IN ('lighting_issue', 'deserted_area', 'safe_haven', 'general_hazard')),
  ADD CONSTRAINT community_reports_status_check
    CHECK (status IN ('pending_review', 'verified', 'rejected', 'outdated')),
  ADD CONSTRAINT community_reports_moderator_notes_length
    CHECK (moderator_notes IS NULL OR char_length(moderator_notes) <= 2000);

CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  location_type TEXT NOT NULL CHECK (location_type IN ('village', 'town', 'city', 'district', 'other')),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  village TEXT,
  town TEXT,
  district TEXT,
  state TEXT,
  coverage_completeness SMALLINT CHECK (coverage_completeness BETWEEN 0 AND 100),
  coverage_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX locations_name_idx ON public.locations (name);
CREATE INDEX locations_district_state_idx ON public.locations (district, state);
CREATE INDEX safety_observations_verified_coords_idx
  ON public.safety_observations (verification_status, longitude, latitude);
CREATE INDEX community_reports_pending_created_idx
  ON public.community_reports (created_at DESC) WHERE status = 'pending_review';

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Replace permissive policies from the initial migrations with explicit least-privilege rules.
DROP POLICY IF EXISTS "Public read access for active data sources" ON public.data_sources;
DROP POLICY IF EXISTS "Reviewer and Admin full access on data sources" ON public.data_sources;
CREATE POLICY "Public can read active data sources"
  ON public.data_sources FOR SELECT USING (is_active = true);
CREATE POLICY "Reviewers can manage data sources"
  ON public.data_sources FOR ALL
  USING (public.is_reviewer_or_admin())
  WITH CHECK (public.is_reviewer_or_admin());

DROP POLICY IF EXISTS "Public read access for safety observations" ON public.safety_observations;
DROP POLICY IF EXISTS "Authorized reviewers can insert safety observations" ON public.safety_observations;
DROP POLICY IF EXISTS "Authorized reviewers can update safety observations" ON public.safety_observations;
CREATE POLICY "Public can read verified safety observations"
  ON public.safety_observations FOR SELECT USING (verification_status = 'verified');
CREATE POLICY "Reviewers can insert safety observations"
  ON public.safety_observations FOR INSERT
  WITH CHECK (public.is_reviewer_or_admin());
CREATE POLICY "Reviewers can update safety observations"
  ON public.safety_observations FOR UPDATE
  USING (public.is_reviewer_or_admin())
  WITH CHECK (public.is_reviewer_or_admin());

DROP POLICY IF EXISTS "Public read access for verified community reports" ON public.community_reports;
DROP POLICY IF EXISTS "Users can submit pending community reports" ON public.community_reports;
DROP POLICY IF EXISTS "Authorized reviewers can moderate community reports" ON public.community_reports;
CREATE POLICY "Submitters and reviewers can read reports"
  ON public.community_reports FOR SELECT
  USING (status = 'verified' OR (user_id IS NOT NULL AND auth.uid() = user_id) OR public.is_reviewer_or_admin());
CREATE POLICY "Anyone can submit pending reports"
  ON public.community_reports FOR INSERT
  WITH CHECK (
    status = 'pending_review'
    AND (user_id IS NULL OR user_id = auth.uid())
    AND moderator_notes IS NULL
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
  );
CREATE POLICY "Reviewers can moderate reports"
  ON public.community_reports FOR UPDATE
  USING (public.is_reviewer_or_admin())
  WITH CHECK (public.is_reviewer_or_admin());

DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
CREATE POLICY "Users can read their own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.is_reviewer_or_admin());

CREATE POLICY "Public can read published locations"
  ON public.locations FOR SELECT USING (is_public = true);
CREATE POLICY "Reviewers can insert locations"
  ON public.locations FOR INSERT WITH CHECK (public.is_reviewer_or_admin());
CREATE POLICY "Reviewers can update locations"
  ON public.locations FOR UPDATE
  USING (public.is_reviewer_or_admin())
  WITH CHECK (public.is_reviewer_or_admin());

-- A reviewer may change only the moderation fields and only from pending review.
CREATE OR REPLACE FUNCTION public.guard_community_report_moderation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_reviewer_or_admin() THEN
    RAISE EXCEPTION 'Reviewer authorization required';
  END IF;

  IF (NEW.user_id, NEW.category, NEW.longitude, NEW.latitude, NEW.description, NEW.created_at, NEW.source)
     IS DISTINCT FROM
     (OLD.user_id, OLD.category, OLD.longitude, OLD.latitude, OLD.description, OLD.created_at, OLD.source) THEN
    RAISE EXCEPTION 'Report content cannot be changed during moderation';
  END IF;

  IF OLD.status NOT IN ('pending_review', 'verified')
     OR NEW.status NOT IN ('verified', 'rejected', 'outdated')
     OR (OLD.status = 'pending_review' AND NEW.status = 'outdated')
     OR (OLD.status = 'verified' AND NEW.status <> 'outdated') THEN
    RAISE EXCEPTION 'Invalid report moderation transition';
  END IF;

  NEW.reviewed_by := auth.uid()::TEXT;
  NEW.reviewed_at := NOW();
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER community_report_moderation_guard
  BEFORE UPDATE ON public.community_reports
  FOR EACH ROW EXECUTE FUNCTION public.guard_community_report_moderation();

CREATE OR REPLACE FUNCTION public.publish_verified_community_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  observation_properties JSONB := jsonb_build_object('details', NEW.description);
BEGIN
  IF NEW.status = 'verified' AND OLD.status = 'pending_review' THEN
    IF NEW.category = 'lighting_issue' THEN
      observation_properties := observation_properties || jsonb_build_object(
        'operationalStatus', 'broken',
        'hazardType', 'poor_lighting'
      );
    ELSIF NEW.category = 'deserted_area' THEN
      observation_properties := observation_properties || jsonb_build_object('hazardType', 'deserted_stretch');
    ELSIF NEW.category = 'general_hazard' THEN
      observation_properties := observation_properties || jsonb_build_object('hazardType', 'construction');
    ELSIF NEW.category = 'safe_haven' THEN
      observation_properties := observation_properties || jsonb_build_object('operationalStatus', 'working');
    END IF;

    INSERT INTO public.safety_observations (
      community_report_id, category, longitude, latitude, geographic_precision,
      source_name, verification_status, verified_by, verified_at, expires_at, properties
    ) VALUES (
      NEW.id, 'community_report', NEW.longitude, NEW.latitude, 'exact_point',
      'verified_community_report', 'verified', NEW.reviewed_by, NEW.reviewed_at,
      NOW() + INTERVAL '90 days', observation_properties
    );
  ELSIF NEW.status = 'outdated' AND OLD.status = 'verified' THEN
    UPDATE public.safety_observations
    SET expires_at = NOW()
    WHERE community_report_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER community_report_publish_observation
  AFTER UPDATE OF status ON public.community_reports
  FOR EACH ROW EXECUTE FUNCTION public.publish_verified_community_report();

-- Role membership must be provisioned by a trusted administrator, never by API clients.
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;
REVOKE DELETE ON public.locations, public.data_sources, public.safety_observations, public.community_reports
  FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_reviewer_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('reviewer', 'admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_reviewer_or_admin() TO anon, authenticated;
