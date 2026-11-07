// Supabase Edge Function: verify-report
// Uses the caller's JWT so database RLS remains the authorization boundary.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const authorization = req.headers.get("Authorization");

    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse({ error: "Edge function backend configuration is missing." }, 500);
    }
    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Authentication is required." }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userResult, error: userError } = await supabase.auth.getUser();
    if (userError || !userResult.user) {
      return jsonResponse({ error: "A valid authenticated session is required." }, 401);
    }

    const { data: role, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userResult.user.id)
      .maybeSingle();
    if (roleError) {
      throw new Error(`Could not verify reviewer permissions: ${roleError.message}`);
    }
    if (!role || !["reviewer", "admin"].includes(role.role)) {
      return jsonResponse({ error: "Reviewer authorization is required." }, 403);
    }

    const body: unknown = await req.json();
    if (!isReviewRequest(body)) {
      return jsonResponse({ error: "Invalid report review request." }, 400);
    }

    const eligibleStatuses = body.status === "outdated" ? ["verified"] : ["pending_review"];
    const { data, error } = await supabase
      .from("community_reports")
      .update({
        status: body.status,
        reviewed_at: new Date().toISOString(),
        moderator_notes: body.moderatorNotes?.trim() || null,
        reviewed_by: userResult.user.id,
      })
      .eq("id", body.reportId)
      .in("status", eligibleStatuses)
      .select()
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      return jsonResponse({ error: "Report was not found or is no longer eligible for review." }, 404);
    }

    return jsonResponse({ success: true, updatedReport: data }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected verification error.";
    return jsonResponse({ error: message }, 500);
  }
});

function isReviewRequest(
  value: unknown
): value is { reportId: string; status: "verified" | "rejected" | "outdated"; moderatorNotes?: string } {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.reportId === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate.reportId)
    && ["verified", "rejected", "outdated"].includes(String(candidate.status))
    && (candidate.moderatorNotes === undefined
      || (typeof candidate.moderatorNotes === "string" && candidate.moderatorNotes.length <= 2000));
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
