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

    // ---- Acción: optimizar SEO de una landing existente (no guarda, devuelve sugerencia) ----
    if (String(body.action ?? "") === "optimize_seo") {
      const landingId = String(body.landing_id ?? "");
      if (!landingId) return json({ error: "landing_id required" }, 400);
      const { data: landing } = await admin.from("seo_landing_pages").select("*").eq("id", landingId).maybeSingle();
      if (!landing) return json({ error: "landing not found" }, 404);

      const ctx = [
        `Palabra clave: ${landing.keyword ?? landing.title}`,
        `Tipo: ${landing.kind}`,
        `H1 actual: ${landing.title ?? ""}`,
        `Meta title actual: ${landing.meta_title ?? "(vacío)"}`,
        `Meta description actual: ${landing.meta_description ?? "(vacío)"}`,
        `Intro: ${(landing.intro ?? "").slice(0, 400)}`,
        `Contenido: ${String(landing.body_html ?? "").replace(/<[^>]+>/g, " ").slice(0, 1200)}`,
        `FAQs actuales: ${(Array.isArray(landing.faqs) ? landing.faqs : []).map((f: any) => f.q).join(" | ") || "(ninguna)"}`,
      ].join("\n");

      const optRes = await fetch(LOVABLE_AI, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}` },
        body: JSON.stringify({
          model: MODEL,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                `Eres experto SEO e-commerce de nutrición (Nutribatidos, Perú). Español natural de Perú. JSON estricto sin markdown.
Nunca afirmes que un producto cura, trata o previene enfermedades.`,
            },
            {
              role: "user",
              content: `Optimiza el SEO de esta landing:
${ctx}

Devuelve JSON EXACTO:
{
 "meta_title":"50-60 caracteres con la palabra clave al inicio",
 "meta_description":"150-160 caracteres, con llamada a la acción",
 "og_title":"",
 "og_description":"",
 "keywords":["6-10 palabras clave"],
 "h1":"H1 mejorado (~60c)",
 "intro":"introducción de 2-3 líneas optimizada",
 "faqs":[{"q":"","a":""}],
 "score":0-100,
 "issues":["problemas detectados"],
 "recommendations":["acciones concretas para mejorar el posicionamiento"]
}`,
            },
          ],
        }),
      });
      if (!optRes.ok) {
        const t = await optRes.text();
        return json({ error: "ai_error", detail: t }, optRes.status === 402 ? 402 : 502);
      }
      const optJson = await optRes.json();
      let sug: any = {};
      try { sug = JSON.parse(optJson?.choices?.[0]?.message?.content ?? "{}"); } catch { sug = {}; }

      // Aplicar automáticamente (usado por la optimización masiva del admin)
      if (body.apply) {
        const s = (v: any) => (typeof v === "string" && v.trim() ? v.trim() : null);
        const newFaqs = Array.isArray(sug.faqs) ? sug.faqs.filter((f: any) => f?.q && f?.a) : [];
        const patch: Record<string, unknown> = {
          meta_title: s(sug.meta_title) ?? landing.meta_title,
          meta_description: s(sug.meta_description) ?? landing.meta_description,
          og_title: s(sug.og_title) ?? landing.og_title,
          og_description: s(sug.og_description) ?? landing.og_description,
          intro: s(sug.intro) ?? landing.intro,
          updated_at: new Date().toISOString(),
        };
        if (newFaqs.length) {
          patch.faqs = newFaqs;
          patch.schema_jsonld = {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: newFaqs.map((f: any) => ({
              "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          };
        }
        const { error: upErr } = await admin.from("seo_landing_pages").update(patch).eq("id", landingId);
        if (upErr) return json({ error: upErr.message }, 500);
        return json({ ok: true, applied: true, suggestion: sug });
      }

      return json({ ok: true, suggestion: sug });
    }


    const keyword: string = String(body.keyword ?? "").trim();

    const kind: string = String(body.kind ?? "objetivo");
    const categoryName: string | null = body.category ? String(body.category) : null;
    const customSlug: string | undefined = body.slug ? slugify(String(body.slug)) : undefined;
    const publish: boolean = Boolean(body.publish ?? false);
    if (!keyword) return json({ error: "keyword required" }, 400);
    if (!["objetivo", "ingrediente", "beneficio", "problema"].includes(kind)) return json({ error: "invalid kind" }, 400);

    const slug = customSlug ?? slugify(keyword);
    const isHealth = kind === "problema";

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
      .ilike(field, `%${isHealth ? (categoryName ?? keyword) : keyword}%`)
      .limit(12);

    const { data: cats } = await admin.from("categories").select("name, slug").eq("is_active", true).limit(60);
    const { data: ings } = await admin
      .from("products").select("main_ingredient")
      .eq("is_active", true).not("main_ingredient", "is", null).limit(200);
    const ingredientList = [...new Set((ings ?? []).map((i: any) => String(i.main_ingredient).trim()).filter(Boolean))].slice(0, 40);

    const productLines = (matches ?? []).map((p: any) =>
      `- ${p.name} (${p.brand ?? "—"}) · ${p.short_description ?? ""} · S/${p.price}`
    ).join("\n");

    const safety = `REGLAS OBLIGATORIAS DE SALUD:
- Nunca afirmes que un producto cura, trata, elimina o previene enfermedades.
- Prohibido: "cura la artritis", "elimina el dolor", "trata la hernia", "reduce la diabetes", "reemplaza medicamentos".
- Usa lenguaje educativo y nutricional: "contribuye al mantenimiento normal de...", "forma parte de una alimentación equilibrada...", "es un nutriente relacionado con...", "puede encontrarse en...".
- No diagnostiques ni indiques dosis médicas. Recomienda consultar a un profesional de la salud.`;

    const sys = `Eres un experto en SEO e-commerce de nutrición y suplementos de la marca Nutribatidos (Perú). Escribes en español natural de Perú. Devuelves JSON estricto, sin markdown.
${safety}`;

    const healthShape = `{
  "seo": {"meta_title":"<60c","meta_description":"150-160c","og_title":"","og_description":""},
  "hero": {"title":"H1 tipo '<Tema>: causas, cuidados y nutrientes relacionados'","short_description":"2-3 líneas","cta_label":"Ver productos relacionados"},
  "introduction": "párrafo introductorio",
  "what_is": {"title":"¿Qué es ...?","content":"2-4 párrafos educativos separados por saltos de línea"},
  "causes": [{"title":"","description":""}],           // 4-6
  "symptoms": [{"name":"","description":""}],           // 4-8
  "what_to_do": "contenido educativo prudente",
  "nutrition": "alimentación y cuidado, conectando con nutrición equilibrada",
  "nutrients": [{"name":"Magnesio","description":"","slug":"magnesio"}],   // 3-6
  "ingredients": [{"name":"Chía","description":"","slug":"chia"}],          // 3-6 de la lista del catálogo
  "related_topics": [{"name":"Dolor cervical","slug":"dolor-cervical","description":""}], // 3-6
  "faqs": [{"q":"","a":""}],                            // 4-6
  "professional_help": "texto prudente sobre cuándo consultar a un profesional",
  "long_description": "~80 palabras de cierre"
}`;

    const genericShape = `{
  "seo": {"meta_title":"<60c","meta_description":"150-160c","og_title":"","og_description":""},
  "hero": {"title":"H1 atractivo (~60c)","short_description":"2-3 líneas"},
  "introduction": "párrafo intro",
  "body_html": "<p>3-5 párrafos HTML válidos con <h2> para subsecciones. Sin <html>/<body>.</p>",
  "nutrients": [{"name":"","description":""}],
  "ingredients": [{"name":"","description":""}],
  "faqs": [{"q":"","a":""}],
  "long_description": "~80 palabras de cierre"
}`;

    const prompt = `Genera una landing SEO para la palabra clave "${keyword}" (tipo: ${kind}${categoryName ? `, categoría: ${categoryName}` : ""}).
Marca: Nutribatidos. País: Perú.
Categorías existentes: ${(cats ?? []).map((c: any) => c.name).join(", ") || "(sin datos)"}
Ingredientes del catálogo: ${ingredientList.join(", ") || "(sin datos)"}
Productos del catálogo que coinciden:
${productLines || "(sin productos coincidentes; usar conocimiento general de nutrición)"}

Devuelve JSON EXACTO con este shape (sin markdown, sin texto extra):
${isHealth ? healthShape : genericShape}`;

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

    const arr = (v: any) => (Array.isArray(v) ? v.filter((x) => x && typeof x === "object") : []);
    const str = (v: any) => (typeof v === "string" && v.trim() ? v : null);
    const seo = parsed.seo && typeof parsed.seo === "object" ? parsed.seo : {};
    const hero = parsed.hero && typeof parsed.hero === "object" ? parsed.hero : {};
    const faqs = arr(parsed.faqs);

    const schema = faqs.length
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f: any) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

    const sections = {
      what_is: parsed.what_is && typeof parsed.what_is === "object" ? parsed.what_is : undefined,
      causes: arr(parsed.causes),
      symptoms: arr(parsed.symptoms),
      what_to_do: str(parsed.what_to_do) ?? undefined,
      nutrition: str(parsed.nutrition) ?? undefined,
      nutrients: arr(parsed.nutrients),
      ingredients: arr(parsed.ingredients),
      related_topics: arr(parsed.related_topics),
      professional_help: str(parsed.professional_help) ?? undefined,
    };

    const row = {
      kind, slug,
      keyword,
      category_name: categoryName,
      title: str(hero.title) ?? str(parsed.title) ?? keyword,
      intro: str(hero.short_description) ?? str(parsed.introduction),
      long_description: str(parsed.long_description),
      body_html: str(parsed.body_html),
      meta_title: str(seo.meta_title) ?? str(parsed.meta_title),
      meta_description: str(seo.meta_description) ?? str(parsed.meta_description),
      og_title: str(seo.og_title),
      og_description: str(seo.og_description),
      hero_cta_label: str(hero.cta_label),
      faqs,
      sections,
      schema_jsonld: schema,
      filter_field: isHealth && categoryName ? "category" : field,
      filter_value: isHealth ? (categoryName ?? keyword) : keyword,
      products_mode: "auto",
      is_published: publish,
      status: publish ? "published" : "draft",
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
