// Edge function: blog-ai-generate — genera un artículo de blog con IA a partir
// de un producto (solo admin). Devuelve título, extracto, contenido markdown,
// categoría, tiempo de lectura y una imagen de portada generada (texto→imagen)
// que se persiste en Storage. El frontend lo guarda como borrador para revisar.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { callAI, getProviderConfig, safeJsonParse, type AIProvider } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const IMAGE_BUCKET = "blog-images";

const TONE_GUIDE: Record<string, string> = {
  basico: "Claro y directo, conciso.",
  equilibrado: "Profesional con un toque comercial moderado, natural.",
  vendedor: "Emocional y persuasivo, con beneficios claros y llamados a la acción suaves.",
  premium: "Sofisticado, aspiracional, con storytelling breve.",
};

function pickTextProvider(): AIProvider | null {
  for (const p of ["openai", "deepseek", "lovable"] as AIProvider[]) {
    if (getProviderConfig(p).hasKey) return p;
  }
  return null;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

/** Genera una imagen (texto→imagen) y devuelve un data-URL base64, o null. */
async function generateImage(prompt: string): Promise<string | null> {
  const LOVABLE = Deno.env.get("LOVABLE_API_KEY");
  const OPENAI = Deno.env.get("OPENAI_API_KEY");
  const fullPrompt = `${prompt}\nEditorial blog cover, photorealistic or clean illustration, no text, no watermark, no logos. Square 1:1, high quality.`;

  if (LOVABLE) {
    try {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: fullPrompt }],
          modalities: ["image", "text"],
        }),
      });
      if (r.ok) {
        const d = await r.json();
        const url = d?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (url) return url;
      } else {
        console.error("[blog-ai-generate] lovable image", r.status, (await r.text()).slice(0, 200));
      }
    } catch (e) {
      console.error("[blog-ai-generate] lovable image error", e);
    }
  }

  if (OPENAI) {
    try {
      const r = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-image-1", prompt: fullPrompt, size: "1024x1024", n: 1 }),
      });
      if (r.ok) {
        const d = await r.json();
        const b64 = d?.data?.[0]?.b64_json;
        if (b64) return `data:image/png;base64,${b64}`;
      } else {
        console.error("[blog-ai-generate] openai image", r.status, (await r.text()).slice(0, 200));
      }
    } catch (e) {
      console.error("[blog-ai-generate] openai image error", e);
    }
  }
  return null;
}

async function uploadDataUrl(service: SupabaseClient, dataUrl: string): Promise<string | null> {
  const m = dataUrl.match(/^data:(.*?);base64,(.*)$/s);
  if (!m) return /^https?:\/\//.test(dataUrl) ? dataUrl : null;
  const contentType = m[1] || "image/png";
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const ext = (contentType.split("/")[1] || "png").split(";")[0].replace("jpeg", "jpg");
  const path = `blog-ai-${crypto.randomUUID()}.${ext}`;
  const { error } = await service.storage.from(IMAGE_BUCKET).upload(path, bytes, { contentType, upsert: false });
  if (error) {
    console.error("[blog-ai-generate] storage", error.message);
    return null;
  }
  return service.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "no auth" }, 401);

    const supabase = createClient(supabaseUrl, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "invalid token" }, 401);
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "admin required" }, 403);

    const body = await req.json().catch(() => ({}));
    const { product_id, product_name, tone = "equilibrado", generate_image = true } = body || {};
    if (!product_id && !product_name) return json({ error: "Indica product_id o product_name." }, 400);

    // Resolver producto.
    let q = supabase
      .from("products")
      .select("id, name, slug, short_description, description, ingredients, main_ingredient, goal, category, price")
      .limit(1);
    q = product_id ? q.eq("id", product_id) : q.ilike("name", `%${product_name}%`);
    const { data: product, error: prodErr } = await q.maybeSingle();
    if (prodErr) return json({ error: prodErr.message }, 500);
    if (!product)
      return json({ error: `No encontré un producto que coincida con "${product_name ?? product_id}".` }, 404);

    const textProvider = pickTextProvider();
    if (!textProvider)
      return json(
        { error: "No hay clave de IA para texto (OPENAI_API_KEY / DEEPSEEK_API_KEY / LOVABLE_API_KEY)." },
        400,
      );

    const toneGuide = TONE_GUIDE[tone] ?? TONE_GUIDE.equilibrado;
    const system = `Eres un redactor de blog para Nutribatidos (tienda peruana de suplementos naturales).
Escribe SIEMPRE en español, con un tono cercano, humano y conversacional (como un amigo experto que recomienda algo), tono base: ${toneGuide}

Estilo del artículo:
- Natural y fluido: habla de "tú", haz preguntas al lector, usa ejemplos cotidianos con los que la gente se identifique (ej. "ese bajón de las 3pm", "después de entrenar").
- ATRACTIVO y escaneable con EMOJIS, pero con moderación (1 emoji por título de sección y, ocasionalmente, al inicio de un punto de lista). Nunca pongas filas de emojis ni más de uno seguido.
- Referencias divulgativas: apóyate en ideas conocidas de nutrición/bienestar ("muchos nutricionistas suelen recomendar…", "suele asociarse con…"), SIN inventar estudios concretos ni citar fuentes falsas.

FORMATO DEL CONTENIDO (MUY IMPORTANTE — el blog NO renderiza Markdown, es texto plano):
- NO uses sintaxis Markdown: nada de "##", "**", "__", ni "#". Se verían como caracteres feos.
- Títulos de sección: una línea propia que empiece con un emoji y el título en texto normal. Ej: "💪 Energía para tu día".
- Separa párrafos y secciones con UNA línea en blanco.
- Listas: cada ítem en su línea empezando con "• " (puedes anteponer un emoji al ítem). Ej: "• 🦴 Apoya tus huesos".
- Para resaltar, NO uses asteriscos; simplemente redacta con énfasis natural.

Reglas:
- Construye el artículo en torno al producto indicado, mencionándolo de forma natural (no como anuncio agresivo).
- SIN afirmaciones médicas ni promesas de curación; usa lenguaje suave ("puede ayudar a complementar", "suele asociarse con").
- Moneda S/ (PEN) si mencionas precio.
- Devuelve SIEMPRE un JSON válido, sin texto fuera del JSON.`;

    const userPrompt = `Producto: ${JSON.stringify(product)}

Genera un artículo de blog atractivo, natural y con emojis, en TEXTO PLANO (sin Markdown). Responde ÚNICAMENTE con un JSON con este schema exacto:
{
  "title": "string atractivo, máx 70 caracteres; puede incluir 1 emoji al inicio o final",
  "slug": "string en kebab-case (sin emojis)",
  "excerpt": "string gancho de máx 160 caracteres; puede incluir 1 emoji",
  "category": "string (ej. Nutrición, Suplementos, Bienestar)",
  "read_time": "string (ej. '5 min')",
  "content": "string en TEXTO PLANO (sin ##, sin **), 600-900 palabras: gancho inicial + 3-5 secciones (cada título en su línea empezando con un emoji), al menos una lista con viñetas '• ', líneas en blanco entre párrafos, tono cercano con ejemplos cotidianos, y un cierre invitando a probar el producto. Menciona el producto con naturalidad.",
  "image_prompt": "string EN INGLÉS describiendo una imagen de portada editorial para este artículo (sin texto ni logos)"
}`;

    const ai = await callAI({
      provider: textProvider,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.6,
      maxTokens: 2200,
      jsonMode: true,
    });

    const draft = safeJsonParse<any>(ai.content);
    if (!draft || !draft.title)
      return json({ error: "La IA no devolvió un artículo válido.", raw: ai.content?.slice(0, 300) }, 502);

    // Imagen de portada (texto→imagen) → persistir en Storage.
    let cover_image: string | null = null;
    if (generate_image && draft.image_prompt) {
      const service = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const generated = await generateImage(String(draft.image_prompt));
      if (generated) cover_image = await uploadDataUrl(service, generated);
    }

    return json({
      ok: true,
      provider: textProvider,
      model: ai.model,
      product: { id: product.id, name: product.name },
      post: {
        title: String(draft.title).slice(0, 200),
        slug: slugify(draft.slug || draft.title),
        excerpt: draft.excerpt ?? "",
        category: draft.category ?? "Nutrición",
        read_time: draft.read_time ?? "5 min",
        content: draft.content ?? "",
        cover_image,
        image_prompt: draft.image_prompt ?? "",
      },
    });
  } catch (e: any) {
    console.error("[blog-ai-generate] fatal:", e);
    return json({ error: String(e?.message || e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
