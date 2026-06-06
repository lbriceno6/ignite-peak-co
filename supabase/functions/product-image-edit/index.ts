// Edge function: edit / enhance product images via Lovable AI (Gemini image)
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const BACKGROUND_PROMPTS: Record<string, string> = {
  white_ecommerce:
    "Place the product on a clean, pure white seamless ecommerce background (#FFFFFF). Even soft studio lighting, subtle natural contact shadow under the product, perfectly centered composition, crisp edges. No props, no added text, no extra objects.",
  transparent:
    "Place the product on a solid pure white background (#FFFFFF) so the background can be removed cleanly afterwards. No shadows touching the edges, crisp clean cutout edges. Do not add any objects or text.",
  premium_jar:
    "Place the product on an elegant dark premium background, professional studio lighting with soft rim light, realistic contact shadow and subtle reflection on a dark glossy surface, ideal for jars and bottles. Cinematic, luxury catalog look. Product perfectly centered. No added text or props.",
  premium_box:
    "Place the product on an elegant dark premium background, professional studio lighting, soft realistic shadow and gentle reflection on a dark surface, ideal for boxes and packaging. Cinematic, luxury catalog look. Product perfectly centered. No added text or props.",
};

const FRAMING = `
CATALOG FRAMING RULES (MANDATORY):
- Output is a SQUARE 1:1 image, ecommerce catalog ready.
- The BACKGROUND MUST FILL THE ENTIRE CANVAS edge-to-edge. No inner frame, no border, no inset box, no second background, no rounded corners, no vignette ring. The background color/scene must reach all four edges of the image.
- The product MUST be perfectly centered both horizontally and vertically on top of that full-bleed background.
- The product MUST occupy approximately 70% to 80% of the canvas area.
- Uniform safe margin around the product on all sides (do NOT crop, do NOT touch the edges).
- Consistent scale across variants: if a different background is applied later, the product must remain the same size and position.
- Do NOT zoom in, do NOT crop the label, do NOT cut the cap or base.
- Do NOT render the product as a small picture sitting inside a larger box; the background IS the canvas.
`;

const PROTECTION = `
CRITICAL RULES — do NOT change:
- the brand name, logos, label text or typography
- the main colors of the product
- the shape, proportion or geometry of the container/box
- the design or layout of the packaging
You CAN improve: framing, centering, edges, lighting, sharpness, contrast and shadow.
Final image must be square 1:1, e-commerce ready, clean and professional.
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { image_url, background = "white_ecommerce", extra_instructions = "", provider = "lovable", fallback } = await req.json();
    if (!image_url || typeof image_url !== "string") {
      return json({ success: false, error: "image_url requerido" }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    const bgPrompt = BACKGROUND_PROMPTS[background] ?? BACKGROUND_PROMPTS.white_ecommerce;
    const instruction = `${bgPrompt}\n${FRAMING}\n${PROTECTION}\n${extra_instructions || ""}`.trim();

    const callLovable = async (): Promise<string> => {
      if (!LOVABLE_API_KEY) throw new Error("Falta configurar LOVABLE_API_KEY en Supabase Secrets");
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{
            role: "user",
            content: [
              { type: "text", text: instruction },
              { type: "image_url", image_url: { url: image_url } },
            ],
          }],
          modalities: ["image", "text"],
        }),
      });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(`Lovable AI ${r.status}: ${t.slice(0, 240)}`);
      }
      const data = await r.json();
      const dataUrl = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!dataUrl) throw new Error("Lovable AI no devolvió imagen");
      return dataUrl as string;
    };

    const callOpenAI = async (): Promise<string> => {
      if (!OPENAI_API_KEY) throw new Error("Falta configurar OPENAI_API_KEY en Supabase Secrets");
      // Download source image
      const imgResp = await fetch(image_url);
      if (!imgResp.ok) throw new Error(`No se pudo descargar la imagen origen (${imgResp.status})`);
      const imgBlob = await imgResp.blob();
      const fileBlob = new Blob([await imgBlob.arrayBuffer()], { type: imgBlob.type || "image/png" });
      const form = new FormData();
      form.append("model", "gpt-image-1");
      form.append("prompt", instruction);
      form.append("size", "1024x1024");
      form.append("background", background === "transparent" ? "transparent" : "opaque");
      form.append("image", fileBlob, "product.png");
      const r = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: form,
      });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(`OpenAI ${r.status}: ${t.slice(0, 240)}`);
      }
      const data = await r.json();
      const b64 = data?.data?.[0]?.b64_json;
      if (!b64) throw new Error("OpenAI no devolvió imagen");
      return `data:image/png;base64,${b64}`;
    };

    const run = (prov: string) => prov === "openai" ? callOpenAI() : callLovable();
    let usedProvider = provider;
    let image: string;
    try { image = await run(provider); }
    catch (primaryErr) {
      if (fallback && fallback !== provider) {
        try { image = await run(fallback); usedProvider = fallback; }
        catch (fbErr) {
          return json({ success: false, provider, error: `${primaryErr instanceof Error ? primaryErr.message : primaryErr} | fallback ${fallback}: ${fbErr instanceof Error ? fbErr.message : fbErr}` }, 502);
        }
      } else {
        return json({ success: false, provider, error: primaryErr instanceof Error ? primaryErr.message : String(primaryErr) }, 502);
      }
    }

    return json({ success: true, image, background, provider: usedProvider });
  } catch (e) {
    console.error("product-image-edit error", e);
    return json({ success: false, error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
