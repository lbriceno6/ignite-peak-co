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
- The product MUST be perfectly centered both horizontally and vertically.
- The product MUST occupy approximately 70% to 80% of the canvas area.
- Uniform safe margin around the product on all sides (do NOT crop, do NOT touch the edges).
- Consistent scale across variants: if a different background is applied later, the product must remain the same size and position.
- Do NOT zoom in, do NOT crop the label, do NOT cut the cap or base.
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
    const { image_url, background = "white_ecommerce", extra_instructions = "" } = await req.json();
    if (!image_url || typeof image_url !== "string") {
      return json({ error: "image_url requerido" }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY no configurada" }, 500);

    const bgPrompt = BACKGROUND_PROMPTS[background] ?? BACKGROUND_PROMPTS.white_ecommerce;
    const instruction = `${bgPrompt}\n${FRAMING}\n${PROTECTION}\n${extra_instructions || ""}`.trim();

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: instruction },
              { type: "image_url", image_url: { url: image_url } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      if (resp.status === 429) return json({ error: "Demasiadas solicitudes, intenta más tarde." }, 429);
      if (resp.status === 402) return json({ error: "Sin créditos de IA. Agrega créditos en Lovable AI." }, 402);
      console.error("image edit error", resp.status, t);
      return json({ error: "Error generando imagen" }, 500);
    }

    const data = await resp.json();
    const dataUrl = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!dataUrl) return json({ error: "La IA no devolvió imagen" }, 500);

    return json({ image: dataUrl, background });
  } catch (e) {
    console.error("product-image-edit error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
