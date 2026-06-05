// Downloads the original image and stores it in the `imported-images` bucket.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_IMG = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims } = await supabase.auth.getClaims(token);
    const userId = claims?.claims?.sub as string | undefined;
    if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { imported_product_id } = await req.json();
    if (!imported_product_id) return new Response(JSON.stringify({ error: "imported_product_id requerido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: ip } = await supabase.from("imported_products").select("id, original_image_url").eq("id", imported_product_id).single();
    if (!ip?.original_image_url) return new Response(JSON.stringify({ error: "Sin imagen original" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 15_000);
    const r = await fetch(ip.original_image_url, { signal: ac.signal });
    clearTimeout(t);
    const ct = r.headers.get("content-type") || "image/jpeg";
    if (!ALLOWED.some((a) => ct.startsWith(a))) return new Response(JSON.stringify({ error: `Tipo no permitido: ${ct}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const buf = new Uint8Array(await r.arrayBuffer());
    if (buf.byteLength > MAX_IMG) return new Response(JSON.stringify({ error: "Imagen supera 5 MB" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const ext = ct.split("/")[1].split(";")[0].replace("jpeg", "jpg");
    const path = `${imported_product_id}.${ext}`;
    const { error: upErr } = await admin.storage.from("imported-images").upload(path, buf, { contentType: ct, upsert: true });
    if (upErr) return new Response(JSON.stringify({ error: upErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: pub } = admin.storage.from("imported-images").getPublicUrl(path);
    const stored_image_url = pub.publicUrl;
    await admin.from("imported_products").update({ stored_image_url }).eq("id", imported_product_id);
    return new Response(JSON.stringify({ ok: true, stored_image_url }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
