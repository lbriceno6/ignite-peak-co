// AI-powered related products for a product detail page.
// Receives the current product, recent browse signals and optionally the active intent,
// then asks Lovable AI to pick the best cross-sell products from a catalog snapshot
// provided by the client. Falls back to a heuristic (same category + intent overlap).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CatalogItem = {
  slug: string;
  name: string;
  category?: string | null;
  price?: number | null;
  short_description?: string | null;
};

type CurrentProduct = {
  slug: string;
  name: string;
  category?: string | null;
  short_description?: string | null;
};

type Body = {
  product: CurrentProduct;
  catalog: CatalogItem[];
  intent_slug?: string | null;
  intent_name?: string | null;
  recent_signals?: Array<{
    type: string;
    slug?: string | null;
    query?: string | null;
    category?: string | null;
  }>;
  max?: number;
};

type Pick = { slug: string; reason: string };

function parseJsonLoose(s: string): any | null {
  try { return JSON.parse(s); } catch {}
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

function heuristic(body: Body): Pick[] {
  const currentCat = (body.product.category ?? "").toLowerCase();
  const seenCats = new Set(
    (body.recent_signals ?? []).map((s) => (s.category ?? "").toLowerCase()).filter(Boolean),
  );
  const scored = body.catalog
    .filter((p) => p.slug !== body.product.slug)
    .map((p) => {
      let score = 0;
      const cat = (p.category ?? "").toLowerCase();
      if (cat && cat === currentCat) score += 4;
      else if (cat && seenCats.has(cat)) score += 3;
      else if (cat) score += 1;
      return { p, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, body.max ?? 4);
  return scored.map(({ p }) => ({
    slug: p.slug,
    reason:
      (p.category ?? "").toLowerCase() === currentCat
        ? "Combina con este producto"
        : "Va con tu objetivo",
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body?.product?.slug || !body?.catalog?.length) {
      return new Response(JSON.stringify({ picks: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const max = Math.max(1, Math.min(8, body.max ?? 4));
    const apiKey = Deno.env.get("LOVABLE_API_KEY");

    const slimCatalog = body.catalog
      .filter((p) => p.slug !== body.product.slug)
      .slice(0, 100)
      .map((p) => ({
        slug: p.slug,
        name: p.name,
        category: p.category ?? null,
        price: p.price ?? null,
      }));

    if (!apiKey) {
      return new Response(JSON.stringify({ picks: heuristic(body), source: "heuristic" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = `Eres un asistente de e-commerce de Nutribatidos (suplementos y nutrición).
Tarea: dado un producto actual que un cliente está viendo, su intención de compra y su historial reciente,
elegir hasta ${max} productos RELACIONADOS o complementarios del catálogo.
Reglas estrictas:
- Solo puedes devolver "slug" que aparezcan en el catálogo provisto.
- No incluyas el producto actual.
- Prioriza productos que combinen con el producto actual (mismo objetivo, mismo momento del día, complemento natural).
- Si hay intención clara (intent_name), refuerza esa intención.
- "reason" debe ser una frase corta en español (máx 6 palabras), p.ej. "Combina con tu pre-entreno", "Para tu objetivo: energía", "Lo más comprado junto".
Devuelve SOLO JSON válido con forma: {"picks":[{"slug":"...","reason":"..."}]}`;

    const user = JSON.stringify({
      product: body.product,
      intent_slug: body.intent_slug ?? null,
      intent_name: body.intent_name ?? null,
      recent_signals: (body.recent_signals ?? []).slice(0, 10),
      catalog: slimCatalog,
      max,
    });

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });

    if (!r.ok) {
      return new Response(
        JSON.stringify({ picks: heuristic(body), source: "heuristic", ai_error: r.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await r.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    const parsed = parseJsonLoose(content);
    const validSlugs = new Set(slimCatalog.map((p) => p.slug));
    const rawPicks: Pick[] = Array.isArray(parsed?.picks) ? parsed.picks : [];
    const picks = rawPicks
      .filter((p) => p && typeof p.slug === "string" && validSlugs.has(p.slug))
      .slice(0, max)
      .map((p) => ({
        slug: p.slug,
        reason: typeof p.reason === "string" && p.reason.trim()
          ? p.reason.trim().slice(0, 60)
          : "Lo más comprado junto",
      }));

    if (!picks.length) {
      return new Response(
        JSON.stringify({ picks: heuristic(body), source: "heuristic" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ picks, source: "ai" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ picks: [], error: String((err as Error).message ?? err) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
