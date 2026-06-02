// AI-powered post-purchase insights.
// Given the items of a confirmed order plus a catalog snapshot and (optionally)
// the visitor's current intent, returns:
//   - thank_you: short personalized message (Spanish)
//   - picks: 3-4 complementary next-step products with reasons
//   - reorder_days: estimated days until consumables run out (or null)
// Falls back to a deterministic heuristic if the AI gateway is unavailable.

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
};

type OrderItem = {
  slug: string;
  name: string;
  category?: string | null;
  quantity: number;
};

type Body = {
  order_code?: string | null;
  items: OrderItem[];
  catalog: CatalogItem[];
  intent_slug?: string | null;
  intent_name?: string | null;
  max?: number;
};

type Pick = { slug: string; reason: string };

function parseJsonLoose(s: string): any | null {
  try { return JSON.parse(s); } catch {}
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

function heuristic(body: Body) {
  const purchasedSlugs = new Set(body.items.map((i) => i.slug));
  const purchasedCats = new Set(
    body.items.map((i) => (i.category ?? "").toLowerCase()).filter(Boolean),
  );
  const picks: Pick[] = body.catalog
    .filter((p) => !purchasedSlugs.has(p.slug))
    .map((p) => {
      const cat = (p.category ?? "").toLowerCase();
      let score = 0;
      if (cat && purchasedCats.has(cat)) score += 3;
      else if (cat) score += 1;
      return { p, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, body.max ?? 4)
    .map(({ p }) => ({
      slug: p.slug,
      reason: purchasedCats.has((p.category ?? "").toLowerCase())
        ? "Complementa tu compra"
        : "Próximo paso recomendado",
    }));

  return {
    thank_you: body.intent_name
      ? `Gracias por tu pedido. Estás un paso más cerca de tu objetivo: ${body.intent_name}.`
      : "Gracias por tu pedido. Lo estamos preparando con cuidado.",
    picks,
    reorder_days: 30,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body?.items?.length || !body?.catalog?.length) {
      return new Response(JSON.stringify({ thank_you: "", picks: [], reorder_days: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const max = Math.max(1, Math.min(6, body.max ?? 4));
    const apiKey = Deno.env.get("LOVABLE_API_KEY");

    const purchasedSlugs = new Set(body.items.map((i) => i.slug));
    const slimCatalog = body.catalog
      .filter((p) => !purchasedSlugs.has(p.slug))
      .slice(0, 100)
      .map((p) => ({
        slug: p.slug,
        name: p.name,
        category: p.category ?? null,
        price: p.price ?? null,
      }));

    if (!apiKey || !slimCatalog.length) {
      return new Response(JSON.stringify({ ...heuristic(body), source: "heuristic" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = `Eres el asistente post-compra de Nutribatidos (suplementos y nutrición).
Acaban de hacer un pedido. Devuelve un JSON con tres campos:
1) "thank_you": frase breve (máx 22 palabras), en español, cálida, personalizada según la intención si existe. Sin emojis.
2) "picks": hasta ${max} próximos productos del catálogo que complementen lo comprado.
   - Solo slugs que aparezcan en el catálogo.
   - No incluyas productos ya comprados.
   - "reason" en español, máx 6 palabras (p.ej. "Refuerza tu rutina", "Va con tu objetivo").
3) "reorder_days": número entero estimado de días hasta que se acaben los consumibles comprados (típicamente 25-45 según cantidad). Si no aplica, usa null.
Devuelve SOLO JSON: {"thank_you":"...","picks":[{"slug":"...","reason":"..."}],"reorder_days": 30}`;

    const user = JSON.stringify({
      order_code: body.order_code ?? null,
      intent_slug: body.intent_slug ?? null,
      intent_name: body.intent_name ?? null,
      items: body.items,
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
        temperature: 0.4,
      }),
    });

    if (!r.ok) {
      return new Response(
        JSON.stringify({ ...heuristic(body), source: "heuristic", ai_error: r.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await r.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    const parsed = parseJsonLoose(content) ?? {};
    const validSlugs = new Set(slimCatalog.map((p) => p.slug));
    const rawPicks: Pick[] = Array.isArray(parsed?.picks) ? parsed.picks : [];
    const picks = rawPicks
      .filter((p) => p && typeof p.slug === "string" && validSlugs.has(p.slug))
      .slice(0, max)
      .map((p) => ({
        slug: p.slug,
        reason: typeof p.reason === "string" && p.reason.trim()
          ? p.reason.trim().slice(0, 60)
          : "Próximo paso recomendado",
      }));

    const thank_you = typeof parsed?.thank_you === "string" && parsed.thank_you.trim()
      ? parsed.thank_you.trim().slice(0, 240)
      : heuristic(body).thank_you;

    const reorder_days = Number.isFinite(parsed?.reorder_days)
      ? Math.max(7, Math.min(120, Math.round(parsed.reorder_days)))
      : null;

    return new Response(
      JSON.stringify({ thank_you, picks, reorder_days, source: picks.length ? "ai" : "heuristic" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ thank_you: "", picks: [], reorder_days: null, error: String((err as Error).message ?? err) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
