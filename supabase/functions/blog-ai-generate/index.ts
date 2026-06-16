// Edge Function: blog-ai-generate
// Generates a blog post (title, slug, excerpt, markdown content, category, read_time)
// using the shared AI provider helper. Admin-only. Optionally persists to blog_posts.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { callAI, safeJsonParse } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth: require admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const topic: string = (body?.topic ?? "").toString().trim();
    const category: string | undefined = body?.category?.toString();
    const keywords: string[] = Array.isArray(body?.keywords) ? body.keywords : [];
    const tone: string = body?.tone?.toString() ?? "informativo y cercano";
    const language: string = body?.language?.toString() ?? "es";
    const publish: boolean = Boolean(body?.publish);
    const provider = (body?.provider ?? "lovable") as
      | "lovable" | "openai" | "deepseek" | "gemini" | "anthropic";
    const model: string | undefined = body?.model;

    if (!topic) return json({ error: "topic is required" }, 400);

    const sys = `Eres un editor SEO experto. Devuelve SOLO JSON válido (sin texto extra) con este esquema:
{
  "title": string,            // <= 70 chars, atractivo, con keyword principal
  "slug": string,             // kebab-case, sin acentos, <= 70 chars
  "excerpt": string,          // <= 160 chars
  "category": string,         // 1-3 palabras
  "read_time": string,        // ej "5 min"
  "content_markdown": string  // Markdown completo: H2/H3, listas, 600-1200 palabras, sin H1
}
Idioma: ${language}. Tono: ${tone}.`;

    const user = `Tema: ${topic}
${category ? `Categoría sugerida: ${category}` : ""}
${keywords.length ? `Palabras clave: ${keywords.join(", ")}` : ""}
Reglas: incluye intro, 3-6 secciones con H2, conclusión con CTA. Sin promesas falsas.`;

    const ai = await callAI({
      provider,
      model,
      jsonMode: true,
      temperature: 0.6,
      maxTokens: 2400,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
    });

    const parsed = safeJsonParse<{
      title: string; slug?: string; excerpt: string; category?: string;
      read_time?: string; content_markdown: string;
    }>(ai.content);
    if (!parsed?.title || !parsed?.content_markdown) {
      return json({ error: "AI returned invalid JSON", raw: ai.content?.slice(0, 400) }, 502);
    }

    const slug = slugify(parsed.slug || parsed.title);
    const post = {
      title: parsed.title,
      slug,
      excerpt: parsed.excerpt ?? "",
      content: parsed.content_markdown,
      category: parsed.category ?? category ?? null,
      read_time: parsed.read_time ?? null,
    };

    let saved: unknown = null;
    if (publish) {
      const admin = createClient(SUPABASE_URL, SERVICE_KEY);
      const { data, error } = await admin
        .from("blog_posts")
        .upsert(
          { ...post, is_published: true, published_at: new Date().toISOString() },
          { onConflict: "slug" },
        )
        .select()
        .single();
      if (error) return json({ error: error.message, post }, 500);
      saved = data;
    }

    return json({
      ok: true,
      post,
      saved,
      meta: {
        provider: ai.provider,
        model: ai.model,
        tokens_in: ai.tokens_in,
        tokens_out: ai.tokens_out,
        latency_ms: ai.latency_ms,
      },
    });
  } catch (e) {
    return json({ error: (e as Error).message ?? "Unknown error" }, 500);
  }
});
