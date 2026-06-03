// Fase 20 — Generate SEO landing pages by intent/keyword with AI.
// Admin-only. Creates/updates a row in seo_landing_pages with AI-generated
// title, meta, body HTML, FAQs and JSON-LD schema, and logs to ai_seo_landing_jobs.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const MODEL = "google/gemini-2.5-flash";
const LOVABLE_AI = "https://ai.gateway.lovable.dev/v1/chat/completions";

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

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
    const keyword: string = String(body.keyword ?? "").trim();
    const kind: string = String(body.kind ?? "objetivo");
    const customSlug: string | undefined = body.slug ? slugify(String(body.slug)) : undefined;
    const publish: boolean = Boolean(body.publish ?? false);
    if (!keyword) return json({ error: "keyword required" }, 400);
    if (!["objetivo", "ingrediente", "beneficio"].includes(kind)) return json({ error: "invalid kind" }, 400);

    const slug = customSlug ?? slugify(keyword);

    // Job log
    const { data: job } = await admin.from("ai_seo_landing_jobs").insert({
      keyword, kind, slug, status: "running", model: MODEL, created_by: u.user.id,
    }).select("id").single();
    const jobId = job?.id;

    // Sample products matching the keyword for context
    const field = kind === "objetivo" ? "goal" : kind === "ingrediente" ? "main_ingredient" : "category";
    const { data: matches } = await admin
      .from("products")
      .select("name, short_description, brand, price, slug, category, goal, main_ingredient")
      .eq("is_active", true).eq("approval_status", "approved")
      .ilike(field, `%${keyword}%`)
      .limit(12);

    const productLines = (matches ?? []).map((p: any) =>
      `- ${p.name} (${p.brand ?? "—"}) · ${p.short_description ?? ""} · S/${p.price}`
    ).join("\n");

    const sys = `Eres un experto en SEO e-commerce de nutrición y suplementos. Generas landings optimizadas para Google con español natural de Perú. Devuelves JSON estricto.`;
    const prompt = `Genera una landing SEO para la palabra clave "${keyword}" (tipo: ${kind}).
Contexto — productos del catálogo que coinciden:
${productLines || "(sin productos coincidentes; usar conocimiento general de suplementos)"}

Devuelve JSON EXACTO con este shape (sin markdown, sin texto extra):
{
  "title": "H1 atractivo (~60c)",
  "meta_title": "Title tag <60c con keyword",
  "meta_description": "Meta description 150-160c persuasiva con keyword y beneficio",
  "intro": "Párrafo intro 2-3 frases conectando intención con beneficio",
  "body_html": "<p>3-5 párrafos HTML válidos. Usa <h2> para subsecciones (beneficios, cómo elegir, recomendaciones). Sin <html>/<body>.</p>",
  "faqs": [{"q":"...","a":"..."}, ...] // 4-6 preguntas reales que un comprador peruano se haría,
  "long_description": "Texto resumen 1 párrafo para bloque inferior (~80 palabras)"
}`;

    const aiRes = await fetch(LOVABLE_AI, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "system", content: sys }, { role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      await admin.from("ai_seo_landing_jobs").update({ status: "error", error: `AI ${aiRes.status}: ${t.slice(0, 400)}` }).eq("id", jobId);
      return json({ error: "ai_error", detail: t }, aiRes.status === 402 ? 402 : 502);
    }
    const aiJson = await aiRes.json();
    const raw = aiJson?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }

    const schema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: (parsed.faqs ?? []).map((f: any) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    };

    const row = {
      kind, slug,
      keyword,
      title: parsed.title ?? keyword,
      intro: parsed.intro ?? null,
      long_description: parsed.long_description ?? null,
      body_html: parsed.body_html ?? null,
      meta_title: parsed.meta_title ?? null,
      meta_description: parsed.meta_description ?? null,
      faqs: parsed.faqs ?? [],
      schema_jsonld: schema,
      filter_field: field,
      filter_value: keyword,
      is_published: publish,
      ai_generated_at: new Date().toISOString(),
      ai_model: MODEL,
      source: "ai",
    };

    const { data: upserted, error: upErr } = await admin
      .from("seo_landing_pages")
      .upsert(row, { onConflict: "kind,slug" })
      .select("id, slug, kind, title, is_published")
      .single();
    if (upErr) {
      await admin.from("ai_seo_landing_jobs").update({ status: "error", error: upErr.message }).eq("id", jobId);
      return json({ error: upErr.message }, 500);
    }

    await admin.from("ai_seo_landing_jobs").update({
      status: "done", landing_id: upserted!.id, payload: parsed,
    }).eq("id", jobId);

    return json({ ok: true, landing: upserted, job_id: jobId });
  } catch (e: any) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
