-- Migration 03: Seed Data Sources and Sample Route Observations

-- 1. Insert Data Sources
INSERT INTO public.data_sources (id, name, category, provider, update_frequency, geographic_level, terms_url, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'OpenStreetMap Lighting & Highways', 'streetlights', 'OSM Community', 'daily', 'point', 'https://www.openstreetmap.org/copyright', true),
  ('22222222-2222-2222-2222-222222222222', 'State Police Stations & Help Desks Registry', 'facilities', 'Public Safety GIS', 'monthly', 'point', 'https://data.gov.in', true),
  ('33333333-3333-3333-3333-333333333333', 'Verified Community Safety Audits', 'community', 'Safe Route Reviewers', 'continuous', 'street_segment', NULL, true),
  ('44444444-4444-4444-4444-444444444444', 'District Annual Safety Digest (Historical)', 'district_stats', 'Regional Bureau', 'annual', 'district', NULL, true)
ON CONFLICT (id) DO NOTHING;

-- 2. Urban Corridor Seed Observations
INSERT INTO public.safety_observations (data_source_id, category, longitude, latitude, geographic_precision, source_name, reporting_period, verification_status, properties)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'streetlight', 77.2200, 28.6360, 'exact_point', 'osm_streetlights', '2026-Q3', 'verified', '{"operationalStatus": "working", "details": "LED street pole"}'::jsonb),
  ('11111111-1111-1111-1111-111111111111', 'streetlight', 77.2260, 28.6410, 'exact_point', 'osm_streetlights', '2026-Q3', 'verified', '{"operationalStatus": "working"}'::jsonb),
  ('33333333-3333-3333-3333-333333333333', 'streetlight', 77.2185, 28.6345, 'exact_point', 'verified_community_reviewer', '2026-Q4', 'verified', '{"operationalStatus": "broken", "details": "Dark spot near footbridge"}'::jsonb),
  ('22222222-2222-2222-2222-222222222222', 'public_facility', 77.2280, 28.6430, 'exact_point', 'state_police_registry', '2026-Q1', 'verified', '{"facilityType": "police_station", "details": "24/7 Police Help Desk"}'::jsonb),
  ('22222222-2222-2222-2222-222222222222', 'public_facility', 77.2240, 28.6390, 'exact_point', 'health_department_registry', '2026-Q2', 'verified', '{"facilityType": "hospital", "details": "Emergency Care Center"}'::jsonb);

-- 3. Village Sector Seed Observations
-- Note how the village sector intentionally lacks streetlight coverage and facility records,
-- correctly triggering "Insufficient safety data" and low data confidence.
INSERT INTO public.safety_observations (data_source_id, category, longitude, latitude, geographic_precision, source_name, reporting_period, verification_status, properties)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'road_type', 73.8850, 18.8470, 'street_segment', 'osm_highways', '2025-Q1', 'unverified', '{"roadClassification": "unpaved_rural", "details": "Unpaved dirt road with unmapped lighting"}'::jsonb);
