// AI-powered complementary cart recommendations.
// Receives cart items + free-shipping gap + recent browse signals
// and asks Lovable AI to pick the best complementary products
// from a catalog snapshot the client provides. Returns slugs + short reasons.
//
// Falls back to a heuristic (category overlap + price-to-gap fit) if the AI
// call fails — the client also does its own ranking, so this is best-effort.

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

type CartLine = {
  slug: string;
  name: string;
  category?: string | null;
  quantity: number;
};

type Body = {
  cart: CartLine[];
  catalog: CatalogItem[];
  free_shipping_gap?: number | null;
  intent_slug?: string | null;
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

// Fetches a weighted-random active prompt variant from the DB.
async function getActivePrompt(
  name: string,
  fallback: string,
): Promise<{ prompt: string; prompt_id: string | null; variant_label: string | null }> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const fb = { prompt: fallback, prompt_id: null, variant_label: null };
  if (!url || !key) return fb;
  try {
    const r = await fetch(`${url}/rest/v1/rpc/get_active_ai_prompt_weighted`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ _function_name: name }),
    });
    if (!r.ok) return fb;
    const out = await r.json();
    const row = Array.isArray(out) ? out[0] : out;
    if (row && typeof row.system_prompt === "string" && row.system_prompt.trim()) {
      return {
        prompt: row.system_prompt,
        prompt_id: row.prompt_id ?? null,
        variant_label: row.variant_label ?? null,
      };
    }
    return fb;
  } catch {
    return fb;
  }
}

function heuristic(body: Body): Pick[] {
  const cartSlugs = new Set(body.cart.map((c) => c.slug));
  const cartCats = new Set(
    body.cart.map((c) => (c.category ?? "").toLowerCase()).filter(Boolean),
  );
  const gap = body.free_shipping_gap ?? 0;
  const scored = body.catalog
    .filter((p) => !cartSlugs.has(p.slug))
    .map((p) => {
      let score = 0;
      const cat = (p.category ?? "").toLowerCase();
      if (cat && cartCats.has(cat)) score += 5; // same category complement
      else if (cat) score += 1;
      // Price-to-gap bonus: prefer items near the gap so user reaches free shipping
      if (gap > 0 && p.price && p.price > 0) {
        const diff = Math.abs(p.price - gap);
        if (diff <= gap * 0.4) score += 6;
        else if (p.price <= gap) score += 3;
      }
      return { p, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, body.max ?? 4);
  return scored.map(({ p }) => ({
    slug: p.slug,
    reason:
      gap > 0 && p.price && p.price <= gap * 1.4
        ? "Te acerca al envío gratis"
        : "Complementa tu pedido",
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body?.cart?.length || !body?.catalog?.length) {
      return new Response(JSON.stringify({ picks: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const max = Math.max(1, Math.min(6, body.max ?? 4));
    const apiKey = Deno.env.get("LOVABLE_API_KEY");

    // Cap catalog to keep prompt small
    const cartSlugs = new Set(body.cart.map((c) => c.slug));
    const slimCatalog = body.catalog
      .filter((p) => !cartSlugs.has(p.slug))
      .slice(0, 80)
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

    const defaultSystem = `Eres un asistente de e-commerce de Nutribatidos (suplementos y nutrición).
Tu tarea: dado un carrito y un catálogo, elegir hasta ${max} productos COMPLEMENTARIOS que tengan sentido sumar.
Reglas estrictas:
- Solo puedes devolver "slug" que aparezcan en el catálogo provisto.
- No repitas productos que ya están en el carrito.
- Si hay "free_shipping_gap" > 0, prioriza productos cuyo precio acerque al envío gratis sin pasarse demasiado.
- "reason" debe ser una frase corta en español (máx 6 palabras), p.ej. "Combina con tu proteína", "Te acerca al envío gratis", "Para tu objetivo: energía".
Devuelve SOLO JSON válido con forma: {"picks":[{"slug":"...","reason":"..."}]}`;
    const system = await getActivePrompt("ai-cart-recommendations", defaultSystem);

    const user = JSON.stringify({
      cart: body.cart,
      free_shipping_gap: body.free_shipping_gap ?? 0,
      intent_slug: body.intent_slug ?? null,
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
          : "Complementa tu pedido",
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
