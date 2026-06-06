// @ts-nocheck
// Edge function: detect brand from a product image using Lovable AI (Gemini vision).
// Receives image_url + list of known brands.
// Returns { brand_name, matched_brand_id?, confidence (0..1), create_suggested }.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const TOOL = {
  type: "function",
  function: {
    name: "report_brand",
    description: "Report the brand visible on the product packaging.",
    parameters: {
      type: "object",
      properties: {
        brand_name: { type: "string", description: "Brand name as written on the package. Empty if no brand visible." },
        matched_known_brand: { type: "string", description: "If the brand matches one of the known brands (exact or near match), return its name. Empty otherwise." },
        confidence: { type: "number", description: "0..1 confidence that the brand_name is correct and clearly visible on the package." },
        notes: { type: "string" },
      },
      required: ["brand_name", "confidence"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    const uid = claims?.claims?.sub;
    if (!uid) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: uid, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY no configurada" }, 500);

    const { image_url } = await req.json();
    if (!image_url) return json({ error: "image_url requerido" }, 400);

    const { data: brandsRows } = await admin.from("brands").select("id, name, slug").eq("is_active", true);
    const brands = (brandsRows ?? []) as { id: string; name: string; slug: string }[];
    const brandsList = brands.map((b) => `- ${b.name}`).join("\n") || "(no hay marcas registradas todavía)";

    const system = `Eres un asistente que identifica la MARCA de un producto a partir de la foto del empaque. Devuelve el nombre tal cual aparece en el envase. Si la marca corresponde (exacta o muy parecida) a una de las marcas conocidas listadas, repítela exactamente en "matched_known_brand". Sé honesto con la confianza: si el logo/nombre no es claro, baja la confianza.`;
    const user = `Marcas ya registradas en la tienda:\n${brandsList}\n\nIdentifica la marca visible en la imagen del producto y reporta usando la función report_brand.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              { type: "text", text: user },
              { type: "image_url", image_url: { url: image_url } },
            ],
          },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "report_brand" } },
      }),
    });
    if (!resp.ok) {
      const t = await resp.text();
      if (resp.status === 429) return json({ error: "Rate limit" }, 429);
      if (resp.status === 402) return json({ error: "Sin créditos" }, 402);
      return json({ error: `AI ${resp.status}: ${t}` }, 500);
    }
    const data = await resp.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments ? JSON.parse(call.function.arguments) : {};
    const brandName: string = (args.brand_name || "").trim();
    const matchedName: string = (args.matched_known_brand || "").trim();
    const confidence: number = Math.max(0, Math.min(1, Number(args.confidence) || 0));

    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    let matched = matchedName
      ? brands.find((b) => norm(b.name) === norm(matchedName))
      : undefined;
    if (!matched && brandName) {
      matched = brands.find((b) => norm(b.name) === norm(brandName));
    }

    return json({
      brand_name: brandName,
      confidence,
      matched_brand: matched ? { id: matched.id, name: matched.name, slug: matched.slug } : null,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
