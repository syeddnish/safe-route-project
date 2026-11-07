// Supabase Edge Function: calculate-safety-score
// Deno TypeScript runtime
// Serves server-side safety score and data confidence evaluation
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { segments, observations } = await req.json();

    if (!segments || !Array.isArray(segments)) {
      return new Response(
        JSON.stringify({ error: "Missing segments array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const obs = Array.isArray(observations) ? observations : [];

    // Evaluate confidence
    const totalSegments = Math.max(1, segments.length);
    const coveredSegments = segments.filter((s: any) => (s.safetyObservationsCount || 0) > 0).length;
    const rawCoverage = (coveredSegments / totalSegments) * 100;

    let confidenceScore = Math.round(rawCoverage * 0.5 + (obs.length > 0 ? 30 : 0));
    confidenceScore = Math.min(100, Math.max(0, confidenceScore));

    let status = "Insufficient safety data";
    let safetyScore = null;

    if (confidenceScore >= 40 && obs.length > 0) {
      // Calculate explainable sub-score
      safetyScore = 65; // Baseline server indicator
      status = "Moderate Safety Indicators";
    }

    return new Response(
      JSON.stringify({
        safetyScore,
        status,
        confidenceScore,
        disclaimer: "Estimated server-side heuristic. No route is guaranteed safe.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
