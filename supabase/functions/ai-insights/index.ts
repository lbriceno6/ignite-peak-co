// Ola 10 — Analítica IA conversacional
// Admin-only. Recibe una pregunta libre, ejecuta queries pre-validadas
// (NO SQL libre) sobre tablas operativas, y pide a Lovable AI un resumen
// accionable. Devuelve { summary, recommendation, data_used, datasets, sources }.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { callAI, safeJsonParse, normalizeAIError } from "../_shared/ai-provider.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type DatasetKey =
  | "sales_summary"
  | "top_products"
  | "lucia_events_summary"
  | "top_searches"
  | "intents_performance"
  | "ai_block_status";

const ALL_DATASETS: DatasetKey[] = [
  "sales_summary",
  "top_products",
  "lucia_events_summary",
  "top_searches",
  "intents_performance",
  "ai_block_status",
];

function pickDatasets(question: string): DatasetKey[] {
  const q = question.toLowerCase();
  const picks = new Set<DatasetKey>();
  if (/(vent|ingres|revenue|order|pedido|conver)/.test(q)) picks.add("sales_summary");
  if (/(producto|sku|top|más vend|catalogo)/.test(q)) picks.add("top_products");
  if (/(busca|search|query|término|sin resultado)/.test(q)) picks.add("top_searches");
  if (/(intenci|intent|banner|home)/.test(q)) {
    picks.add("intents_performance");
    picks.add("ai_block_status");
  }
  if (/(lucia|chat|ia|evento|click|visit|vist)/.test(q)) picks.add("lucia_events_summary");
  if (picks.size === 0) {
    picks.add("sales_summary");
    picks.add("lucia_events_summary");
    picks.add("top_products");
  }
  return [...picks];
}

async function runDatasets(sb: any, keys: DatasetKey[], windowDays: number) {
  const since = new Date(Date.now() - windowDays * 86400000).toISOString();
  const out: Record<string, unknown> = {};

  if (keys.includes("sales_summary")) {
    const { data } = await sb
      .from("orders")
      .select("id,total,status,created_at")
      .gte("created_at", since)
      .limit(5000);
    const rows = (data ?? []) as any[];
    const paid = rows.filter((o) => ["confirmed", "preparing", "shipped", "delivered"].includes(o.status));
    out.sales_summary = {
      total_orders: rows.length,
      paid_orders: paid.length,
      revenue: +paid.reduce((s, o) => s + Number(o.total ?? 0), 0).toFixed(2),
      aov: paid.length ? +(paid.reduce((s, o) => s + Number(o.total ?? 0), 0) / paid.length).toFixed(2) : 0,
      window_days: windowDays,
    };
  }

  if (keys.includes("top_products")) {
    const { data } = await sb
      .from("order_items")
      .select("product_slug,quantity,unit_price,created_at")
      .gte("created_at", since)
      .limit(10000);
    const map = new Map<string, { qty: number; revenue: number }>();
    for (const r of (data ?? []) as any[]) {
      const cur = map.get(r.product_slug) ?? { qty: 0, revenue: 0 };
      cur.qty += Number(r.quantity ?? 0);
      cur.revenue += Number(r.quantity ?? 0) * Number(r.unit_price ?? 0);
      map.set(r.product_slug, cur);
    }
    out.top_products = [...map.entries()]
      .map(([slug, v]) => ({ slug, units: v.qty, revenue: +v.revenue.toFixed(2) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15);
  }

  if (keys.includes("lucia_events_summary")) {
    const { data } = await sb
      .from("lucia_events")
      .select("event_type")
      .gte("created_at", since)
      .limit(20000);
    const counts: Record<string, number> = {};
    for (const e of (data ?? []) as any[]) counts[e.event_type] = (counts[e.event_type] ?? 0) + 1;
    out.lucia_events_summary = { counts, window_days: windowDays };
  }

  if (keys.includes("top_searches")) {
    const { data } = await sb
      .from("lucia_events")
      .select("metadata,product_slug,category_slug,created_at")
      .eq("event_type", "browse_search")
      .gte("created_at", since)
      .limit(5000);
    const counts = new Map<string, { count: number; with_result: number }>();
    for (const e of (data ?? []) as any[]) {
      const q = String(e?.metadata?.search_query ?? e?.search_query ?? "").trim().toLowerCase();
      if (!q) continue;
      const cur = counts.get(q) ?? { count: 0, with_result: 0 };
      cur.count += 1;
      if (e.category_slug || e?.metadata?.intent_slug) cur.with_result += 1;
      counts.set(q, cur);
    }
    out.top_searches = [...counts.entries()]
      .map(([q, v]) => ({ query: q, count: v.count, with_result: v.with_result, no_result: v.count - v.with_result }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }

  if (keys.includes("intents_performance")) {
    const [{ data: intents }, { data: evs }] = await Promise.all([
      sb.from("purchase_intents").select("slug,name,is_active,banner_image,priority"),
      sb.from("lucia_events")
        .select("metadata,event_type,created_at")
        .gte("created_at", since)
        .limit(20000),
    ]);
    const usage = new Map<string, number>();
    for (const e of (evs ?? []) as any[]) {
      const slug = e?.metadata?.intent_slug;
      if (slug) usage.set(slug, (usage.get(slug) ?? 0) + 1);
    }
    out.intents_performance = (intents ?? []).map((i: any) => ({
      slug: i.slug,
      name: i.name,
      is_active: i.is_active,
      has_banner: !!i.banner_image,
      events: usage.get(i.slug) ?? 0,
    }));
  }

  if (keys.includes("ai_block_status")) {
    const { data } = await sb.from("ai_block_toggles").select("block_key,enabled");
    out.ai_block_status = data ?? [];
  }

  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "unauthorized" }, 401);
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const question: string = String(body?.question ?? "").trim().slice(0, 600);
    const windowDays: number = Math.min(Math.max(Number(body?.window_days ?? 30), 1), 180);
    const datasetsOverride: DatasetKey[] | undefined = Array.isArray(body?.datasets)
      ? body.datasets.filter((d: string) => ALL_DATASETS.includes(d as DatasetKey))
      : undefined;
    if (!question) return json({ error: "question required" }, 400);

    const keys = datasetsOverride?.length ? datasetsOverride : pickDatasets(question);
    const data = await runDatasets(admin, keys, windowDays);

    const sys = `Eres un analista de e-commerce de Nutribatidos. Solo razonas con los DATOS provistos.
Si los datos están vacíos o no son suficientes, dilo claramente y sugiere qué activar/medir.
No inventes métricas. Devuelves JSON estricto en español neutro.`;
    const userMsg = `Pregunta del admin:
"${question}"

Ventana: últimos ${windowDays} días.
DATOS (JSON):
${JSON.stringify(data).slice(0, 60000)}

Devuelve exactamente este JSON:
{
  "summary": "2-4 frases resumiendo la respuesta basada SOLO en los datos",
  "key_findings": ["bullet 1", "bullet 2", "..."],
  "recommendation": "acción concreta y priorizada que el admin puede ejecutar hoy",
  "missing_data": "qué datos faltan o están débiles (puede ser '' si todo OK)"
}`;

    let parsed: any = null;
    try {
      const out = await callAI({
        provider: "lovable",
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: userMsg },
        ],
        jsonMode: true,
        temperature: 0.3,
        maxTokens: 1200,
      });
      parsed = safeJsonParse<any>(out.content);
    } catch (e: any) {
      return json({ error: e?.message ?? String(e) }, 502);
    }

    return json({
      question,
      window_days: windowDays,
      datasets_used: keys,
      data_used: data,
      summary: parsed?.summary ?? "Sin respuesta del modelo.",
      key_findings: parsed?.key_findings ?? [],
      recommendation: parsed?.recommendation ?? "",
      missing_data: parsed?.missing_data ?? "",
    });
  } catch (e: any) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
