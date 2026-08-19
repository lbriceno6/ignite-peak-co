// Genera / regenera la imagen Hero de una landing SEO con IA (solo admin).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { buildHeroPrompt, generateLandingHeroImage } from "../_shared/landing-hero-image.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "unauthorized" }, 401);
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const landingId = String(body.landing_id ?? "");
    if (!landingId) return json({ error: "landing_id required" }, 400);

    const { data: landing } = await admin.from("seo_landing_pages").select("*").eq("id", landingId).maybeSingle();
    if (!landing) return json({ error: "landing not found" }, 404);

    if (String(body.action ?? "") === "preview_prompt") {
      return json({ ok: true, prompt: buildHeroPrompt(landing) });
    }

    // No sobrescribir una imagen manual salvo que se pida explícitamente.
    if (landing.hero_image && landing.hero_image_source === "manual" && !body.force) {
      return json({ ok: false, error: "manual_image_exists" }, 409);
    }

    await admin.from("seo_landing_pages").update({ hero_image_status: "pending" }).eq("id", landingId);
    const result = await generateLandingHeroImage(admin, landing, LOVABLE_API_KEY, {
      customPrompt: body.prompt ?? null,
      keepAlt: Boolean(body.keep_alt),
    });
    if (!result.ok) return json({ ok: false, error: result.error }, 502);
    return json({ ok: true, hero_image: result.url, hero_image_alt: result.alt, prompt: result.prompt });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
