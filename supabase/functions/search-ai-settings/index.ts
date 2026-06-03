import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
};

const DEFAULT_SETTINGS = {
  id: 1,
  enabled: false,
  provider: "deepseek",
  model: "deepseek-chat",
  result_mode: "all",
  confidence_threshold: 0.4,
  temperature: 0.4,
  max_tokens: 600,
  search_prompt:
    "Eres un asistente de búsqueda para el ecommerce Nutribatidos. Entiende la necesidad del cliente y recomienda productos existentes del catálogo. No inventes productos. No prometas curaciones. Devuelve siempre JSON con intent, need_category, products y message.",
  helper_text: "Busca por necesidad, ejemplo: cansancio, digestión, colágeno o energía",
  show_whatsapp_fallback: true,
  live_suggestions_enabled: true,
  visible_products_limit: 4,
  manual_suggestions: "omega 3, vitaminas, bienestar, colágeno, energía",
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const toNumber = (value: unknown, fallback: number, min: number, max: number) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

const normalizeSettings = (raw: Record<string, unknown> | null | undefined) => {
  const source = { ...DEFAULT_SETTINGS, ...(raw ?? {}) } as Record<string, unknown>;
  return {
    id: 1,
    enabled: Boolean(source.enabled),
    provider: String(source.provider || DEFAULT_SETTINGS.provider).slice(0, 40),
    model: String(source.model || DEFAULT_SETTINGS.model).slice(0, 120),
    result_mode: String(source.result_mode || DEFAULT_SETTINGS.result_mode).slice(0, 40),
    confidence_threshold: toNumber(source.confidence_threshold, DEFAULT_SETTINGS.confidence_threshold, 0, 1),
    temperature: toNumber(source.temperature, DEFAULT_SETTINGS.temperature, 0, 2),
    max_tokens: Math.round(toNumber(source.max_tokens, DEFAULT_SETTINGS.max_tokens, 100, 4000)),
    search_prompt: String(source.search_prompt || DEFAULT_SETTINGS.search_prompt).slice(0, 8000),
    helper_text: String(source.helper_text || DEFAULT_SETTINGS.helper_text).slice(0, 300),
    show_whatsapp_fallback: Boolean(source.show_whatsapp_fallback),
    live_suggestions_enabled: Boolean(source.live_suggestions_enabled),
    visible_products_limit: Math.round(toNumber(source.visible_products_limit, DEFAULT_SETTINGS.visible_products_limit, 2, 12)),
    manual_suggestions: Array.isArray(source.manual_suggestions)
      ? source.manual_suggestions.map((s) => String(s).trim()).filter(Boolean).join(", ").slice(0, 500)
      : String(source.manual_suggestions || DEFAULT_SETTINGS.manual_suggestions).slice(0, 500),
  };
};

const publicSettings = (row: Record<string, unknown> | null | undefined) => {
  const s = normalizeSettings(row);
  return {
    enabled: s.enabled,
    provider: s.provider,
    model: s.model,
    result_mode: s.result_mode,
    confidence_threshold: s.confidence_threshold,
    temperature: s.temperature,
    max_tokens: s.max_tokens,
    search_prompt: s.search_prompt,
    helper_text: s.helper_text,
    show_whatsapp_fallback: s.show_whatsapp_fallback,
    live_suggestions_enabled: s.live_suggestions_enabled,
    visible_products_limit: s.visible_products_limit,
    manual_suggestions: s.manual_suggestions,
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!["GET", "POST", "PUT"].includes(req.method)) return json({ success: false, error: "Método no permitido" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization") ?? "";

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json({ success: false, error: "Configuración del servidor incompleta." }, 500);
    }
    if (!authHeader.startsWith("Bearer ")) {
      return json({ success: false, error: "No tienes permisos de administrador para modificar esta configuración." }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    const user = userData?.user;
    if (userError || !user) {
      return json({ success: false, error: "No tienes permisos de administrador para modificar esta configuración." }, 401);
    }

    const { data: roleRow, error: roleError } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleRow) {
      return json({ success: false, error: "No tienes permisos de administrador para modificar esta configuración." }, 403);
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    if (req.method === "GET") {
      const { data, error } = await adminClient
        .from("search_ai_settings")
        .select("enabled,provider,model,result_mode,confidence_threshold,temperature,max_tokens,search_prompt,helper_text,show_whatsapp_fallback,live_suggestions_enabled,visible_products_limit,manual_suggestions")
        .eq("id", 1)
        .maybeSingle();

      if (error) return json({ success: false, error: "No se pudo cargar la configuración del Buscador IA." }, 500);
      if (!data) {
        const safe = normalizeSettings(null);
        const { data: inserted, error: insertError } = await adminClient
          .from("search_ai_settings")
          .upsert(safe, { onConflict: "id" })
          .select("enabled,provider,model,result_mode,confidence_threshold,temperature,max_tokens,search_prompt,helper_text,show_whatsapp_fallback,live_suggestions_enabled,visible_products_limit,manual_suggestions")
          .single();
        if (insertError) return json({ success: false, error: "No se pudo inicializar la configuración del Buscador IA." }, 500);
        return json({ success: true, settings: publicSettings(inserted) });
      }
      return json({ success: true, settings: publicSettings(data) });
    }

    const body = await req.json().catch(() => ({}));
    const incoming = (body?.settings ?? body ?? {}) as Record<string, unknown>;
    const safe = normalizeSettings(incoming);

    const { data, error } = await adminClient
      .from("search_ai_settings")
      .upsert(safe, { onConflict: "id" })
      .select("enabled,provider,model,result_mode,confidence_threshold,temperature,max_tokens,search_prompt,helper_text,show_whatsapp_fallback,live_suggestions_enabled,visible_products_limit,manual_suggestions")
      .single();

    if (error) {
      return json({ success: false, error: "No se pudo guardar la configuración del Buscador IA." }, 500);
    }

    return json({ success: true, settings: publicSettings(data) });
  } catch (err) {
    return json({ success: false, error: String((err as Error).message ?? err) }, 500);
  }
});
