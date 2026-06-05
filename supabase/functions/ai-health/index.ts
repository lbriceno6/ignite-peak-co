// Lightweight admin-only health endpoint.
// Returns which AI provider secrets are configured (boolean only — never the value)
// plus simple counts of Lucia activity. Used by /admin/ia-control diagnostics.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { listProviderStatus } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );

    // Admin check via JWT.
    const { data: u } = await supa.auth.getUser();
    if (!u?.user) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const providers = listProviderStatus().map((p) => ({
      provider: p.provider,
      env_var: p.envVar,
      configured: p.hasKey,
      default_model: p.defaultModel,
    }));

    const [{ count: luciaSessions }, { count: luciaMessages }, { count: intents }, { count: events7d }] =
      await Promise.all([
        admin.from("chat_ai_sessions").select("id", { count: "exact", head: true }),
        admin.from("chat_ai_messages").select("id", { count: "exact", head: true }),
        admin.from("purchase_intents").select("id", { count: "exact", head: true }).eq("is_active", true),
        admin
          .from("lucia_events")
          .select("id", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 7 * 86400_000).toISOString()),
      ]);

    return new Response(
      JSON.stringify({
        providers,
        lucia: {
          sessions: luciaSessions ?? 0,
          messages: luciaMessages ?? 0,
        },
        intents_active: intents ?? 0,
        events_last_7d: events7d ?? 0,
        checked_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
