# Safe Route AI 🛡️🗺️
### Safety-Aware Navigation & Explainable Data Confidence Auditing

Safe Route AI is a full-stack, safety-aware navigation web application designed especially for women, lone travellers, and residents navigating cities, rural corridors, and villages. It empowers users to compare **Fastest**, **Shortest**, and **Safety-Aware** route alternatives using verified evidence while maintaining rigorous ethical and scientific standards.

---

## 🌟 Key Capabilities & Ethical Safeguards

1. **Safety-Aware Route Comparison**:
   - Compare **Fastest** (travel-time optimized), **Shortest** (distance optimized), and **Safety-Aware** (prioritizes illuminated arterial roads and active emergency facilities) alternatives.
   - Calculates routes using configured live providers (OpenRouteService, OSRM) or a clearly labelled interactive Demo Mode.
   - **Never fabricates routes** or claims that any route is guaranteed safe.

2. **Explainable Baseline Scoring Engine**:
   - Rule-based, deterministic baseline heuristic with documented weights (Lighting: 30%, Road Classification: 25%, Facility Proximity: 20%, Verified Community Reports: 15%, Macro District Context: 10%).
   - Transparent factor breakdown: identifies exact supporting evidence, missing data gaps, stale/expired surveys, and conflicting observations.
   - **Not machine learning or black-box AI**: scores are never described as calibrated crime probabilities.

3. **Strict Separation of Data Confidence**:
   - Estimated route-safety indicators are decoupled from the Data Confidence Score.
   - Evaluates **5 Confidence Pillars**: Route Coverage, Freshness, Source Quality, Geographic Precision, and Consistency.
   - **Missing data strictly lowers confidence** rather than artificially making an unmapped area appear dangerous or safe.
   - If confidence is below 40%, the application displays **"Insufficient safety data"** and intentionally avoids definitive rankings.

4. **Dedicated Village & Rural Coverage**:
   - Fully supports rural roads and village routes where public lighting or municipal GIS is absent.
   - Dedicated **Village Route Demo Mode** demonstrates how rural dirt tracks behave with unknown lighting and missing crime statistics.
   - Authorized reviewer workflow allows timestamped local audits (e.g., verifying community solar lamps or rural safe havens).

5. **Privacy & Security Guarantees**:
   - Requests geolocation only with explicit permission; manual search entry is always available.
   - **Zero location history stored** on backend servers.
   - Crowdsourced reports are quarantined in `pending_review` to prevent unverified submissions from manipulating official safety rankings.
   - No fake emergency response claims or simulated dispatch numbers.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons
- **Mapping**: MapLibre GL JS, OpenStreetMap-compatible tiles (Carto Positron / OSM raster) with proper attribution (`© OpenStreetMap contributors`)
- **Routing**: Modular routing provider layer (`OpenRouteServiceProvider`, `OSRMProvider`, `DemoRoutingProvider`)
- **Backend**: Supabase PostgreSQL with PostGIS support, Row Level Security (RLS) policies, Edge Functions (Deno runtime)
- **Testing**: Vitest unit test suite covering scoring calculations, missing data handling, stale observations, and provider error boundaries.

---

## 💻 Windows Setup & Installation Guide

### Step 1: Install Node.js LTS (If not installed)
Safe Route AI requires Node.js (v18.0.0 or higher, LTS recommended).
1. Visit the official Node.js download page: [https://nodejs.org/en/download](https://nodejs.org/en/download)
2. Download the **Windows Installer (.msi)** for Node.js LTS (e.g., v20.x or v22.x x64).
3. Run the `.msi` installer and follow the setup wizard using the default settings.
4. Verify your installation by opening PowerShell or Command Prompt:
   ```powershell
   node -v
   npm -v
   ```

### Step 2: Clone or Open the Project
Navigate to the project root directory:
```powershell
cd c:\Users\mdawe\OneDrive\Desktop\SafeRouteAi
```

### Step 3: Install Node Dependencies
Install project packages using `npm`:
```powershell
npm install
```

### Step 4: Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```
Open `.env` in your text editor (such as VS Code or Notepad):
```env
# -----------------------------------------------------------------------------
# Supabase Configuration
# -----------------------------------------------------------------------------
# Leave empty to run in offline local demo mode, or add your project credentials:
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# -----------------------------------------------------------------------------
# Modular Routing Provider
# -----------------------------------------------------------------------------
# Options: 'demo' | 'openrouteservice' | 'osrm'
VITE_ROUTING_PROVIDER=demo

# Optional: Add your free OpenRouteService API key (from https://openrouteservice.org)
VITE_OPENROUTESERVICE_API_KEY=
```

> **Security Note**: Never place `SUPABASE_SERVICE_ROLE_KEY` in `.env` or frontend files.

---

## 🚀 Running the Application

### Start Development Server
```powershell
npm run dev
```
Open your browser to: [http://localhost:5173](http://localhost:5173)

### Run Unit Tests
Execute the Vitest test suite covering scoring engine logic, confidence degradation, stale observations, and routing providers:
```powershell
npm test
```

### Build for Production
To create an optimized production bundle:
```powershell
npm run build
```

---

## 🗄️ Supabase Backend & Database Setup

Safe Route AI includes complete SQL migrations in `supabase/migrations/`:

1. `20261017000001_initial_safety_schema.sql`:
   - Creates `data_sources`, `safety_observations`, `community_reports`, and `user_roles` tables with spatial coordinate indexing.
2. `20261017000002_rls_and_verification_policies.sql`:
   - Enforces PostgreSQL Row Level Security (RLS).
   - Public read permissions for active datasets.
   - Enforces `pending_review` status on all unauthenticated/user report submissions.
   - Restricts verification status changes and official observation edits exclusively to `reviewer` and `admin` roles.
3. `20261017000003_seed_demo_village_data.sql`:
   - Seeds illustrative sample municipal lighting, facilities, and rural corridor records. These are not live-verified public data.
4. `20261023000001_backend_hardening_and_location_coverage.sql`:
   - Adds location coverage metadata, report constraints, hardened RLS policies, and the controlled verified-report observation workflow.

### Applying Migrations Safely:
1. Log in to [https://supabase.com](https://supabase.com) and create or open your project.
2. Back up the database, inspect the existing migration history, and apply the migrations to a staging project first.
3. Apply only migrations that are not already recorded, in numerical order (01, 02, 03, then 04). Migration 04 assumes the initial tables and policies already exist and is not intended to be blindly re-run after partial application.
4. Before applying migration 04 to a database containing existing data, check for values that violate its coordinate, description-length, category, and status constraints.
5. Retrieve your **Project URL** and **anon (public) Key** from **Project Settings > API** and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your local `.env`. Never use a service-role key in the frontend.

Do not apply migrations automatically from the client. Confirm the target project and review the migration plan before production changes.

### Supabase Edge Functions:
Located in `supabase/functions/`:
- `calculate-safety-score/index.ts`: Server-side route scoring evaluation.
- `verify-report/index.ts`: Reviewer endpoint that validates the caller's JWT and delegates authorization to database roles and RLS; it does not require a service-role key.

Deploy via the Supabase CLI:
```bash
supabase functions deploy calculate-safety-score
supabase functions deploy verify-report
```

---

## 🔬 Safety Scoring & Confidence Engine Documentation

### 1. Safety Factor Weights (Total = 1.0)
- **Lighting Infrastructure (30%)**: Verified working streetlights score high; broken or flickering lamps trigger deductions. Unmapped lighting is marked `Unknown` rather than assumed working.
- **Road Classification (25%)**: Primary and secondary roads with regular vehicular circulation score higher than secluded pedestrian paths or isolated unclassified tracks.
- **Public Safe Havens / Facilities (20%)**: Proximity to 24/7 women police help desks, hospitals, and transit hubs.
- **Verified Community Reports (15%)**: Verified local submissions regarding hazards or positive community havens.
- **District Context (10%)**: Macro administrative regional statistics, explicitly labeled as macro context without fabricating micro-level crime rates.

### 2. Data Confidence Engine (5 Pillars)
- **Route Coverage (35%)**: Proportion of route segments with observable telemetry.
- **Freshness (25%)**: Observations older than 365 days or expired past their valid date are flagged as stale.
- **Source Quality (20%)**: Official municipal GIS & verified reviewers score higher than raw unverified submissions.
- **Geographic Precision (15%)**: Exact point coordinates (100%) > Street segments (80%) > Neighborhoods (50%) > Broad districts (25%).
- **Consistency (5%)**: Contradictory reports (e.g., conflicting reports on streetlight operation) lower consistency.

---

## 🗺️ Demonstration Scenarios

1. **City Corridor (Urban Scenario)**:
   - Click "City Corridor" in the search panel.
   - Compares **Fastest** (Expressway link), **Shortest** (Backstreet alleys with broken lighting), and **Safety-Aware** (Illuminated transit avenue).
   - High Data Confidence (80%+).

2. **Village Route (Rural Scenario with Missing Data)**:
   - Click "Village Route Demo" in the header or search panel.
   - Demonstrates a rural pathway through unpaved village tracks.
   - Explicitly displays:
     - **"Insufficient safety data"**
     - Low / Insufficient Data Confidence (~0-20%)
     - "Missing crime data does NOT prove the area is safe"
     - Lighting marked as "Unknown / Unmapped"

3. **Community Report & Reviewer Portal**:
   - Click **"Submit Observation"** to submit a hazard or safe haven. It enters `pending_review`.
   - Click **"Reviewer Portal"** to audit pending community observations and mark them verified or rejected.

---

## ⚖️ Legal & Ethical Disclaimer
> **DISCLAIMER**: Safe Route AI provides heuristic safety indicator estimations derived solely from available open municipal datasets and vetted community observations. No route is guaranteed safe. Conditions, illumination, and human activity change continuously. Always stay alert, trust personal intuition, and dial official national emergency numbers (e.g., 112) in case of distress.
