// Generación de imagen Hero para landings SEO (compartido por la generación de
// landing con IA y el botón de "Generar/Regenerar imagen" del administrador).

const GATEWAY = "https://ai.gateway.lovable.dev/v1/images/generations";
const CHAT = "https://ai.gateway.lovable.dev/v1/chat/completions";
export const HERO_IMAGE_MODEL = "openai/gpt-image-2";
export const HERO_BUCKET = "blog-images";

const BASE = `Imagen editorial realista y luminosa para el Hero de una landing de Nutribatidos (tienda online de nutrición y bienestar en Perú).
Escena limpia, moderna y natural que transmita bienestar, nutrición y estilo de vida saludable.
Estilo fotográfico editorial premium, luz natural suave, encuadre vertical moderno, colores cálidos y frescos que combinen con un fondo azul pastel suave.
PROHIBIDO: texto incrustado, letras, marcas de agua, logos, collages, estética de stock barata, manos deformes o anatomía extraña, imágenes clínicas u hospitalarias, sangre, dramatismo o contenido alarmista.`;

type Kind = "objetivo" | "ingrediente" | "beneficio" | "problema" | string;

function kindPrompt(kind: Kind, topic: string, ctx: string) {
  switch (kind) {
    case "ingrediente":
      return `${BASE}
Tema: el ingrediente "${topic}" como protagonista de la escena.
Muestra el ingrediente de forma apetecible y natural sobre una mesa o cocina limpia y luminosa, con elementos de alimentación saludable alrededor.
${ctx}`;
    case "objetivo":
      return `${BASE}
Tema: el objetivo de bienestar "${topic}".
Muestra a una persona activa y saludable en una rutina equilibrada (desayuno saludable, actividad ligera o hábito diario), con sensación de energía y vitalidad.
${ctx}`;
    case "problema":
      return `${BASE}
Tema: "${topic}" desde un enfoque de autocuidado y bienestar, NUNCA médico ni alarmista.
Muestra a una persona adulta en un entorno limpio y luminoso sugiriendo cuidado del cuerpo, movilidad, descanso o alimentación equilibrada. Estética tranquila, humana y profesional, sin dolor extremo, sin hospital, sin instrumentos médicos.
${ctx}`;
    default:
      return `${BASE}
Tema: "${topic}" dentro del universo de la alimentación saludable.
Muestra una escena de alimentación equilibrada y bienestar diario: frutas, verduras o alimentos naturales, y una persona sana en un entorno luminoso y limpio.
${ctx}`;
  }
}

export function buildHeroPrompt(landing: Record<string, any>) {
  const topic = String(landing.keyword || landing.title || "bienestar").trim();
  const ctx = [
    landing.category_name ? `Categoría: ${landing.category_name}.` : "",
    landing.title ? `Título de la página: ${landing.title}.` : "",
    landing.intro ? `Contexto: ${String(landing.intro).slice(0, 300)}` : "",
    "Composición vertical 4:5, sujeto descentrado para que el Hero respire, mucho aire y profundidad de campo suave.",
  ].filter(Boolean).join("\n");
  return kindPrompt(String(landing.kind ?? "beneficio"), topic, ctx);
}

async function buildAlt(apiKey: string, landing: Record<string, any>): Promise<string | null> {
  try {
    const r = await fetch(CHAT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Devuelves solo un texto ALT en español (máx. 120 caracteres), descriptivo y útil para SEO y accesibilidad. Sin comillas, sin la palabra 'imagen de'." },
          { role: "user", content: `Landing de Nutribatidos sobre "${landing.keyword || landing.title}" (tipo ${landing.kind}). Describe una foto editorial de bienestar y alimentación saludable relacionada.` },
        ],
      }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const t = String(j?.choices?.[0]?.message?.content ?? "").trim().replace(/^["']|["']$/g, "");
    return t ? t.slice(0, 160) : null;
  } catch {
    return null;
  }
}

export type HeroImageResult =
  | { ok: true; url: string; alt: string | null; prompt: string }
  | { ok: false; error: string; prompt: string };

/** Genera la imagen Hero, la sube a Storage y actualiza la landing. */
export async function generateLandingHeroImage(
  admin: any,
  landing: Record<string, any>,
  apiKey: string,
  opts: { customPrompt?: string | null; keepAlt?: boolean } = {},
): Promise<HeroImageResult> {
  const prompt = (opts.customPrompt && opts.customPrompt.trim()) || buildHeroPrompt(landing);

  const fail = async (error: string): Promise<HeroImageResult> => {
    await admin.from("seo_landing_pages").update({
      hero_image_status: "failed",
      hero_image_prompt: prompt,
    }).eq("id", landing.id);
    return { ok: false, error, prompt };
  };

  let b64: string | undefined;
  try {
    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: HERO_IMAGE_MODEL,
        prompt,
        size: "1024x1536",
        quality: "low",
        n: 1,
      }),
    });
    if (!res.ok) return await fail(`AI ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const j = await res.json();
    b64 = j?.data?.[0]?.b64_json;
  } catch (e) {
    return await fail(String((e as Error)?.message ?? e));
  }
  if (!b64) return await fail("La IA no devolvió imagen");

  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const path = `landings/${landing.kind}-${landing.slug}-${Date.now()}.png`;
  const { error: upErr } = await admin.storage.from(HERO_BUCKET).upload(path, bytes, {
    contentType: "image/png",
    upsert: true,
  });
  if (upErr) return await fail(`Storage: ${upErr.message}`);
  const url = admin.storage.from(HERO_BUCKET).getPublicUrl(path).data.publicUrl as string;

  const alt = opts.keepAlt && landing.hero_image_alt ? String(landing.hero_image_alt) : await buildAlt(apiKey, landing);

  const patch: Record<string, unknown> = {
    hero_image: url,
    hero_image_source: "ai",
    hero_image_status: "generated",
    hero_image_prompt: prompt,
    hero_image_generated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (alt) patch.hero_image_alt = alt;
  const { error: dbErr } = await admin.from("seo_landing_pages").update(patch).eq("id", landing.id);
  if (dbErr) return await fail(dbErr.message);

  return { ok: true, url, alt: alt ?? (landing.hero_image_alt ?? null), prompt };
}
