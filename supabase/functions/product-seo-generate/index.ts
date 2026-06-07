// SEO Inteligente Masivo — generates full SEO payload for one product.
// Supports providers: openai, deepseek, lovable (via shared ai-provider helper).
import { createClient } from "npm:@supabase/supabase-js@2";
import { callAI, safeJsonParse, getProviderConfig, type AIProvider } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Level = "basico" | "equilibrado" | "avanzado";
type FieldKey =
  | "seo_title" | "seo_description" | "slug" | "canonical" | "og_image"
  | "keywords" | "tags" | "shopping_title" | "shopping_description"
  | "short_description" | "long_description" | "image_alts" | "noindex";

const ALL_FIELDS: FieldKey[] = [
  "seo_title","seo_description","slug","canonical","og_image",
  "keywords","tags","shopping_title","shopping_description",
  "short_description","long_description","image_alts","noindex",
];

const slugify = (s: string) =>
  (s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 75);

function buildPrompt(product: any, level: Level, fields: FieldKey[]) {
  const tone =
    level === "basico" ? "Genera contenido directo y corto."
    : level === "avanzado" ? "Optimiza para SEO avanzado, máxima cobertura semántica, intención comercial fuerte."
    : "Equilibra claridad comercial y optimización SEO.";
  return `Producto:
- nombre: ${product.name ?? "—"}
- marca: ${product.brand ?? "—"}
- categoría: ${product.category ?? "—"} / ${product.subcategory ?? "—"}
- ingrediente principal: ${product.main_ingredient ?? "—"}
- objetivo: ${product.goal ?? "—"}
- presentación: ${product.size ?? "—"} ${product.flavor ? `· ${product.flavor}` : ""}
- precio: ${product.price ?? "—"}
- descripción actual: ${(product.description ?? product.short_description ?? "").slice(0, 600)}
- tags actuales: ${(product.tags ?? []).join(", ") || "—"}

Tarea: ${tone}
Genera SOLO los campos solicitados: ${fields.join(", ")}.
Reglas duras (necesarias para llegar a SEO 100/100):
- seo_title: 45-60 caracteres EXACTOS, debe incluir el nombre del producto.
- seo_description: 130-160 caracteres EXACTOS, clara, comercial, natural, sin claims médicos.
- slug: kebab-case, minúsculas, sin tildes ni caracteres especiales, máx 60 chars, basado en el nombre.
- keywords: 5-8 palabras clave en español.
- tags: 3-8 etiquetas (categoría, ingrediente, objetivo, beneficio).
- shopping_title: máx 150 chars, incluye producto + marca + presentación.
- shopping_description: comercial, sin claims médicos prohibidos.
- short_description: menos de 100 caracteres.
- long_description: 2-4 párrafos, mínimo 120 caracteres, explica producto, beneficio general y forma de uso.
- image_alts: array por imagen {image_url, alt_text}; cada alt 80-125 chars, debe describir producto, marca, presentación e ingrediente principal.
No inventes datos que no existan; si falta marca/ingrediente, omite ese campo.
Responde JSON puro.`;
}

const SYSTEM = `Eres un experto SEO ecommerce en español (suplementos/batidos).
Optimizas para Google, Google Shopping y buscadores con IA.
Devuelve SOLO JSON válido con las claves pedidas. Sin texto extra.`;

function trimTo(s: string | undefined, n: number) {
  if (!s) return s;
  const t = String(s).trim();
  return t.length <= n ? t : t.slice(0, n - 1).trim() + "…";
}

const norm = (s: any) =>
  String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

function computeScore(
  merged: any, productName: string, imagesWithAlt: number, imagesTotal: number,
): { score: number; complete: boolean } {
  let s = 0;
  const title = String(merged.seo_title ?? "").trim();
  const firstName = norm(productName).split(" ")[0] ?? "";
  if (title && title.length >= 45 && title.length <= 60 && (!firstName || norm(title).includes(firstName))) s += 12;

  const desc = String(merged.seo_description ?? "").trim();
  if (desc && desc.length >= 130 && desc.length <= 160) s += 12;

  const slug = String(merged.slug ?? "").trim();
  if (slug && /^[a-z0-9-]+$/.test(slug) && slug.length <= 75) s += 8;

  const canonical = String(merged.canonical ?? "").trim();
  if (canonical && (canonical.startsWith("/") || /^https?:\/\//.test(canonical))) s += 7;

  if (merged.og_image) s += 7;

  const kws = (Array.isArray(merged.keywords) ? merged.keywords : []).filter((x: any) => !!x);
  if (kws.length >= 5 && kws.length <= 8) s += 8;

  const tgs = (Array.isArray(merged.tags) ? merged.tags : []).filter((x: any) => !!x);
  if (tgs.length >= 3) s += 8;

  const sht = String(merged.shopping_title ?? "").trim();
  if (sht && sht.length <= 150) s += 8;

  if (String(merged.shopping_description ?? "").trim()) s += 8;

  const sd = String(merged.short_description ?? "").trim();
  if (sd && sd.length < 100) s += 7;

  const ld = String(merged.long_description ?? "").trim();
  if (ld && ld.length >= 120) s += 8;

  if (imagesTotal === 0 || imagesWithAlt >= imagesTotal) s += 7;

  const score = Math.max(0, Math.min(100, s));
  return { score, complete: score >= 100 };
}

async function getOrigin(admin: any): Promise<string | null> {
  const { data } = await admin
    .from("seo_settings").select("*").maybeSingle();
  const url = (data as any)?.site_url || (data as any)?.canonical_base || null;
  if (url && /^https?:\/\//.test(url)) return url.replace(/\/+$/, "");
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (b: any, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ success: false, error: "No autenticado" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ success: false, error: "No autenticado" }, 401);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) return json({ success: false, error: "Acceso denegado" }, 403);

    const body = await req.json().catch(() => ({}));
    const product_id: string = body.product_id;
    const provider: AIProvider = (body.provider ?? "openai") as AIProvider;
    const level: Level = (body.level ?? "equilibrado") as Level;
    let overwrite: boolean = !!body.overwrite_existing;
    // fix_to_100 / fix_out_of_range: re-generate SEO fields that exist but
    // fail length/quality rules. Never touches main product content.
    const fix_to_100: boolean = !!body.fix_to_100;
    const fix_out_of_range: boolean = !!body.fix_out_of_range || fix_to_100;
    // improve_main: opt-in to also rewrite visible product copy
    // (short/long description). Off by default — SEO mass run protects them.
    const improve_main: boolean = !!body.improve_main;
    const protect_main: boolean =
      typeof body.protect_main === "boolean" ? body.protect_main : !improve_main;

    let requested: FieldKey[] = Array.isArray(body.fields_to_generate) && body.fields_to_generate.length
      ? body.fields_to_generate as FieldKey[]
      : ALL_FIELDS;

    if (protect_main) {
      requested = requested.filter((f) => f !== "short_description" && f !== "long_description");
    }

    if (!product_id) return json({ success: false, error: "Falta product_id" }, 400);

    const cfg = getProviderConfig(provider);
    if (!cfg.hasKey) return json({ success: false, error: `Falta configurar ${cfg.envVar} en Supabase Secrets` }, 400);

    // Load product + existing seo
    const [{ data: product, error: pErr }, { data: existingSeo }] = await Promise.all([
      admin.from("products").select("*").eq("id", product_id).maybeSingle(),
      admin.from("seo_meta").select("*").eq("entity_type", "product").eq("entity_id", product_id).maybeSingle(),
    ]);
    if (pErr) return json({ success: false, error: pErr.message }, 500);
    if (!product) return json({ success: false, error: "Producto no encontrado" }, 404);

    // Determine which fields to generate (skip filled unless overwrite)
    const seoExisting = (existingSeo ?? {}) as Record<string, any>;
    const fieldIsFilled = (f: FieldKey): boolean => {
      switch (f) {
        case "image_alts": return false; // handled separately
        case "noindex": return typeof seoExisting.noindex === "boolean";
        case "canonical": return !!seoExisting.canonical;
        case "og_image": return !!seoExisting.og_image;
        case "keywords": return Array.isArray(seoExisting.keywords) && seoExisting.keywords.length > 0;
        case "tags": return Array.isArray(seoExisting.tags) && seoExisting.tags.length > 0;
        default: return !!seoExisting[f];
      }
    };

    // fix_to_100: regenerate ONLY the SEO fields that currently fail length /
    // quality rules. Never touches main product content (name, description,
    // price, stock, image). Forces overwrite on broken SEO fields only.
    if (fix_to_100) {
      const firstName = norm(product.name ?? "").split(" ")[0] ?? "";
      const t = String(seoExisting.seo_title ?? "").trim();
      const d = String(seoExisting.seo_description ?? "").trim();
      const sl = String(seoExisting.slug ?? "").trim();
      const sht = String(seoExisting.shopping_title ?? "").trim();
      const shd = String(seoExisting.shopping_description ?? "").trim();
      const kws = Array.isArray(seoExisting.keywords) ? seoExisting.keywords : [];
      const tgs = Array.isArray(seoExisting.tags) ? seoExisting.tags : [];

      const broken: FieldKey[] = [];
      if (!t || t.length < 45 || t.length > 60 || (firstName && !norm(t).includes(firstName))) broken.push("seo_title");
      if (!d || d.length < 130 || d.length > 160) broken.push("seo_description");
      if (!sl || !/^[a-z0-9-]+$/.test(sl)) broken.push("slug");
      if (!sht || sht.length > 150) broken.push("shopping_title");
      if (!shd) broken.push("shopping_description");
      if (kws.length < 5 || kws.length > 8) broken.push("keywords");
      if (tgs.length < 3) broken.push("tags");
      if (!seoExisting.canonical) broken.push("canonical");
      if (!seoExisting.og_image) broken.push("og_image");
      broken.push("image_alts");
      broken.push("noindex");

      requested = broken;
      overwrite = true; // only the broken SEO fields are regenerated
    }

    const fieldsToAsk = requested.filter((f) =>
      f === "noindex" || f === "canonical" || f === "og_image"
        ? false // computed locally
        : overwrite || !fieldIsFilled(f),
    );

    // Build image list (product main + gallery)
    const images: string[] = [
      product.main_image,
      ...((product.gallery_images as string[]) ?? []),
    ].filter(Boolean);

    // Ask AI only if there are textual fields to fill (image_alts included)
    let aiPayload: any = {};
    let providerUsed = provider;
    let aiError: string | null = null;
    const aiFields = fieldsToAsk.filter((f) => f !== "image_alts");
    const wantAlts = requested.includes("image_alts") && images.length > 0 && (overwrite || true);

    if (aiFields.length > 0 || wantAlts) {
      const prompt = buildPrompt(
        { ...product, images_count: images.length, images_sample: images.slice(0, 5) },
        level,
        [...aiFields, ...(wantAlts ? (["image_alts"] as FieldKey[]) : [])],
      );
      try {
        const out = await callAI({
          provider,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: `${prompt}\n\nImágenes: ${JSON.stringify(images)}` },
          ],
          temperature: level === "avanzado" ? 0.5 : 0.4,
          maxTokens: 1400,
          jsonMode: true,
        });
        providerUsed = out.provider;
        aiPayload = safeJsonParse<any>(out.content) ?? {};
      } catch (e: any) {
        aiError = e?.message ?? String(e);
        return json({
          success: false,
          provider,
          error: aiError,
          status: 500,
        }, 200);
      }
    }

    // Merge into seoPatch respecting overwrite rules
    const seoPatch: Record<string, any> = {};
    const applyIfAllowed = (key: FieldKey, value: any) => {
      if (value === undefined || value === null || value === "") return;
      if (key === "image_alts") return; // separate handling
      if (!overwrite && fieldIsFilled(key)) return;
      seoPatch[key === "long_description" ? "long_description" : key] = value;
    };

    applyIfAllowed("seo_title", trimTo(aiPayload.seo_title, 60));
    applyIfAllowed("seo_description", trimTo(aiPayload.seo_description, 160));
    applyIfAllowed("short_description", trimTo(aiPayload.short_description, 100));
    applyIfAllowed("long_description", aiPayload.long_description);
    applyIfAllowed("shopping_title", trimTo(aiPayload.shopping_title, 150));
    applyIfAllowed("shopping_description", aiPayload.shopping_description);

    const slugCandidate = aiPayload.slug ? slugify(aiPayload.slug) : slugify(product.name ?? "");
    applyIfAllowed("slug", slugCandidate);

    if (Array.isArray(aiPayload.keywords)) {
      const kws = aiPayload.keywords.filter((x: any) => typeof x === "string").slice(0, 8);
      if (kws.length >= 1 && (overwrite || !fieldIsFilled("keywords"))) seoPatch.keywords = kws;
    }
    if (Array.isArray(aiPayload.tags)) {
      const tgs = aiPayload.tags.filter((x: any) => typeof x === "string").slice(0, 8);
      if (tgs.length >= 1 && (overwrite || !fieldIsFilled("tags"))) seoPatch.tags = tgs;
    }

    // canonical: computed locally
    if (requested.includes("canonical") && (overwrite || !fieldIsFilled("canonical"))) {
      const origin = await getOrigin(admin);
      const slugFinal = seoPatch.slug || product.slug || slugCandidate;
      if (slugFinal) {
        seoPatch.canonical = origin ? `${origin}/producto/${slugFinal}` : `/producto/${slugFinal}`;
      }
    }
    // og_image: computed locally
    if (requested.includes("og_image") && (overwrite || !fieldIsFilled("og_image"))) {
      if (product.main_image) seoPatch.og_image = product.main_image;
    }

    // Persist seo_meta
    const slugForUpsert = seoPatch.slug || existingSeo?.slug || product.slug || slugCandidate;
    if (Object.keys(seoPatch).length > 0) {
      const { error: upErr } = await admin.from("seo_meta").upsert(
        {
          entity_type: "product",
          entity_id: product_id,
          slug: slugForUpsert,
          ...seoPatch,
        } as any,
        { onConflict: "entity_type,entity_id" } as any,
      );
      if (upErr) return json({ success: false, error: `seo_meta: ${upErr.message}` }, 500);
    }

    // image alts
    let altsWritten = 0;
    if (wantAlts && Array.isArray(aiPayload.image_alts)) {
      for (const item of aiPayload.image_alts) {
        const url = item?.image_url; const alt = item?.alt_text;
        if (!url || !alt) continue;
        if (!images.includes(url)) continue;
        const { error: altErr } = await admin.from("seo_image_alts").upsert(
          { entity_type: "product", entity_id: product_id, image_url: url, alt_text: alt } as any,
          { onConflict: "entity_type,entity_id,image_url" } as any,
        );
        if (!altErr) altsWritten++;
      }
    }

    // Compute completeness + noindex
    const merged = { ...seoExisting, ...seoPatch };
    const { data: altsRows } = await admin
      .from("seo_image_alts")
      .select("image_url, alt_text")
      .eq("entity_type", "product").eq("entity_id", product_id);
    const altsByUrl = new Set(((altsRows as any[]) ?? []).filter((a) => !!a.alt_text).map((a) => a.image_url));
    const imagesWithAlt = images.filter((u) => altsByUrl.has(u)).length;

    if (!merged.slug && product.slug) (merged as any).slug = product.slug;
    const { score, complete: isComplete } = computeScore(merged, product.name ?? "", imagesWithAlt, images.length);

    if (requested.includes("noindex")) {
      const desired = !isComplete; // complete => false, else keep true
      if (overwrite || typeof seoExisting.noindex !== "boolean" || (!isComplete && !seoExisting.noindex) || (isComplete && seoExisting.noindex)) {
        await admin.from("seo_meta").upsert(
          { entity_type: "product", entity_id: product_id, slug: slugForUpsert, noindex: desired } as any,
          { onConflict: "entity_type,entity_id" } as any,
        );
        (merged as any).noindex = desired;
      }
    }

    await admin.from("seo_meta").update({ score, last_analyzed_at: new Date().toISOString() } as any)
      .eq("entity_type", "product").eq("entity_id", product_id);

    const completedFields = Object.keys(seoPatch).length + altsWritten;

    return json({
      success: true,
      provider: providerUsed,
      product_id,
      product_name: product.name,
      score,
      complete: isComplete,
      completed_fields: completedFields,
      seo_patch: seoPatch,
      alts_written: altsWritten,
      noindex: (merged as any).noindex ?? false,
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ success: false, error: e?.message ?? String(e) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
