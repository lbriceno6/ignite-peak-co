// Google Merchant Center XML feed (RSS 2.0 with g: namespace).
// Public endpoint — no auth.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const SITE_URL = "https://ignite-peak-co.lovable.app";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const esc = (s: string) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const [{ data: products }, { data: metas }, { data: settings }] = await Promise.all([
      sb.from("products")
        .select("id, slug, name, description, short_description, price, sale_price, main_image, stock, brand, category")
        .eq("is_active", true).eq("approval_status", "approved").limit(5000),
      sb.from("seo_meta").select("entity_id, shopping_title, shopping_description, seo_description")
        .eq("entity_type", "product"),
      sb.from("seo_settings").select("brand, google_product_category, site_name").eq("id", 1).maybeSingle(),
    ]);
    const metaMap = new Map<string, any>();
    (metas ?? []).forEach((m: any) => metaMap.set(m.entity_id, m));
    const brandDefault = (settings as any)?.brand ?? "Nutribatidos";
    const googleCat = (settings as any)?.google_product_category ?? "";
    const siteName = (settings as any)?.site_name ?? "Nutribatidos";

    const items = (products ?? []).map((p: any) => {
      const m = metaMap.get(p.id) ?? {};
      const title = m.shopping_title ?? p.name;
      const desc = m.shopping_description ?? m.seo_description ?? p.short_description ?? p.description ?? p.name;
      const link = `${SITE_URL}/producto/${p.slug}`;
      const price = (p.sale_price ?? p.price ?? 0).toFixed(2);
      const availability = (p.stock ?? 0) > 0 ? "in stock" : "out of stock";
      const img = p.main_image || "";
      return `    <item>
      <g:id>${esc(p.id)}</g:id>
      <title>${esc(title)}</title>
      <description>${esc(desc)}</description>
      <link>${esc(link)}</link>
      <g:image_link>${esc(img)}</g:image_link>
      <g:availability>${availability}</g:availability>
      <g:price>${price} USD</g:price>
      <g:brand>${esc(p.brand || brandDefault)}</g:brand>
      <g:condition>new</g:condition>
      <g:identifier_exists>false</g:identifier_exists>
      ${googleCat ? `<g:google_product_category>${esc(googleCat)}</g:google_product_category>` : ""}
      ${p.category ? `<g:product_type>${esc(p.category)}</g:product_type>` : ""}
    </item>`;
    }).join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${esc(siteName)}</title>
    <link>${SITE_URL}</link>
    <description>Catálogo de productos</description>
${items}
  </channel>
</rss>`;

    return new Response(xml, {
      headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=1800" },
    });
  } catch (e) {
    return new Response(`<!-- error: ${(e as Error).message} -->`, {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/xml" },
    });
  }
});
