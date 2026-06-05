// Web Product Importer — extracts products from external URLs.
// SAFETY: blocks localhost/private IPs, 15s timeout, 3MB cap, max 30 products.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_BYTES = 3 * 1024 * 1024;
const TIMEOUT_MS = 15_000;
const MAX_PRODUCTS = 30;

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h === "::1" || h === "0.0.0.0") return true;
  if (/^127\./.test(h)) return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  const m = h.match(/^172\.(\d+)\./);
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return true;
  if (h.startsWith("fc") || h.startsWith("fd") || h === "::" ) return true;
  return false;
}

function validateUrl(raw: string): URL {
  let u: URL;
  try { u = new URL(raw); } catch { throw new Error("URL inválida"); }
  if (!/^https?:$/.test(u.protocol)) throw new Error("Solo http/https");
  if (isPrivateHost(u.hostname)) throw new Error("Host bloqueado");
  return u;
}

async function fetchHtml(url: string): Promise<string> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ac.signal,
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; NutribatidosImporter/1.0)",
        "accept": "text/html,application/xhtml+xml",
      },
    });
    const ct = res.headers.get("content-type") || "";
    if (!/text\/html|application\/xhtml/i.test(ct)) throw new Error("La URL no devuelve HTML");
    const reader = res.body?.getReader();
    if (!reader) throw new Error("Sin cuerpo de respuesta");
    let received = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_BYTES) { try { await reader.cancel(); } catch {} ; throw new Error("HTML supera 3 MB"); }
      chunks.push(value);
    }
    const buf = new Uint8Array(received);
    let off = 0; for (const c of chunks) { buf.set(c, off); off += c.byteLength; }
    return new TextDecoder("utf-8").decode(buf);
  } finally {
    clearTimeout(t);
  }
}

type Extracted = {
  title?: string;
  description?: string;
  price?: number;
  sale_price?: number;
  currency?: string;
  image?: string;
  gallery?: string[];
  brand?: string;
  category?: string;
  stock?: string;
  url?: string;
};

function abs(url: string | undefined, base: string): string | undefined {
  if (!url) return undefined;
  try { return new URL(url, base).toString(); } catch { return undefined; }
}

function num(v: unknown): number | undefined {
  if (v == null) return undefined;
  if (typeof v === "number") return isFinite(v) ? v : undefined;
  const s = String(v).replace(/[^\d.,-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = parseFloat(s);
  return isFinite(n) ? n : undefined;
}

function extractJsonLd(html: string, base: string): Extracted[] {
  const out: Extracted[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const raw = m[1].trim().replace(/^\uFEFF/, "");
      const data = JSON.parse(raw);
      const items: unknown[] = Array.isArray(data) ? data : [data];
      for (const it of items) {
        if (!it || typeof it !== "object") continue;
        const node = it as Record<string, unknown>;
        const graph = (node["@graph"] as unknown[]) || [node];
        for (const g of graph) {
          if (!g || typeof g !== "object") continue;
          const gn = g as Record<string, unknown>;
          const t = gn["@type"];
          const types = Array.isArray(t) ? t : [t];
          if (!types.some((x) => String(x).toLowerCase() === "product")) continue;
          const offers = (gn.offers as Record<string, unknown>) || {};
          const offersArr: Record<string, unknown>[] = Array.isArray(offers) ? offers as Record<string, unknown>[] : [offers];
          const offer = offersArr[0] || {};
          const price = num(offer.price ?? offer.lowPrice);
          const sale = num(offer.salePrice);
          const currency = (offer.priceCurrency as string) || undefined;
          const imageRaw = gn.image;
          const images: string[] = Array.isArray(imageRaw)
            ? (imageRaw as unknown[]).map((x) => typeof x === "string" ? x : (x as Record<string,unknown>)?.url as string).filter(Boolean) as string[]
            : typeof imageRaw === "string" ? [imageRaw]
            : imageRaw && typeof imageRaw === "object" ? [((imageRaw as Record<string,unknown>).url as string)].filter(Boolean) : [];
          const brand = typeof gn.brand === "string" ? gn.brand : (gn.brand as Record<string,unknown>)?.name as string | undefined;
          out.push({
            title: gn.name as string | undefined,
            description: gn.description as string | undefined,
            price, sale_price: sale, currency,
            image: abs(images[0], base),
            gallery: images.slice(1).map((u) => abs(u, base)).filter(Boolean) as string[],
            brand,
            category: gn.category as string | undefined,
            stock: (offer.availability as string)?.split("/").pop(),
            url: abs(gn.url as string | undefined, base) || base,
          });
        }
      }
    } catch { /* ignore */ }
  }
  return out;
}

function metaContent(html: string, prop: string): string | undefined {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`, "i");
  const m = html.match(re);
  return m?.[1];
}

function extractOg(html: string, base: string): Extracted | null {
  const title = metaContent(html, "og:title") || metaContent(html, "twitter:title");
  if (!title) return null;
  const image = abs(metaContent(html, "og:image"), base);
  const desc = metaContent(html, "og:description") || metaContent(html, "description");
  const price = num(metaContent(html, "product:price:amount") || metaContent(html, "og:price:amount"));
  const currency = metaContent(html, "product:price:currency") || metaContent(html, "og:price:currency");
  return { title, description: desc, image, price, currency, url: base };
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractCardsHeuristic(html: string, base: string): Extracted[] {
  const out: Extracted[] = [];
  // Find anchors that look like product links with an image inside
  const cardRe = /<(?:article|li|div)[^>]*class=["'][^"']*(?:product[-_ ]?(?:card|item|tile|grid-item)|card)[^"']*["'][^>]*>([\s\S]*?)<\/(?:article|li|div)>/gi;
  let m: RegExpExecArray | null;
  while ((m = cardRe.exec(html)) && out.length < MAX_PRODUCTS) {
    const block = m[1];
    const imgMatch = block.match(/<img[^>]+(?:data-src|src)=["']([^"']+)["']/i);
    const linkMatch = block.match(/<a[^>]+href=["']([^"']+)["']/i);
    const titleMatch = block.match(/<(?:h2|h3|h4|a)[^>]*>([\s\S]*?)<\/(?:h2|h3|h4|a)>/i);
    const priceMatch = block.match(/(?:\$|S\/|€|USD|PEN)\s?([\d.,]+)/i);
    if (!titleMatch && !imgMatch) continue;
    out.push({
      title: titleMatch ? stripTags(titleMatch[1]).slice(0, 200) : undefined,
      image: abs(imgMatch?.[1], base),
      url: abs(linkMatch?.[1], base) || base,
      price: priceMatch ? num(priceMatch[1]) : undefined,
    });
  }
  return out;
}

async function aiFallback(html: string, base: string): Promise<Extracted[]> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return [];
  const trimmed = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").slice(0, 60_000);
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Extrae productos de una página HTML. Devuelve SOLO JSON con la forma {\"products\":[{title,price,sale_price,currency,image,description,brand,url}]}. Máx 30." },
          { role: "user", content: `URL base: ${base}\nHTML:\n${trimmed}` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    const items: Extracted[] = (parsed.products || []).slice(0, MAX_PRODUCTS).map((p: Record<string, unknown>) => ({
      title: p.title as string,
      description: p.description as string,
      price: num(p.price),
      sale_price: num(p.sale_price),
      currency: p.currency as string,
      image: abs(p.image as string, base),
      brand: p.brand as string,
      url: abs(p.url as string, base) || base,
    }));
    return items;
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await supabase.auth.getClaims(token);
    if (cErr || !claims?.claims?.sub) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userId = claims.claims.sub as string;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const rawUrl = String(body?.url || "").trim();
    const mode = ["auto", "category", "product"].includes(body?.mode) ? body.mode : "auto";
    if (!rawUrl) return new Response(JSON.stringify({ error: "url requerido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let u: URL;
    try { u = validateUrl(rawUrl); } catch (e) {
      return new Response(JSON.stringify({ error: String((e as Error).message) }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: job, error: jobErr } = await supabase.from("web_import_jobs").insert({
      source_url: u.toString(), source_domain: u.hostname, mode, status: "running", created_by: userId,
    }).select("id").single();
    if (jobErr) throw jobErr;

    let products: Extracted[] = [];
    let errorMsg: string | null = null;
    try {
      const html = await fetchHtml(u.toString());
      const base = u.toString();

      const jsonLd = extractJsonLd(html, base);
      const og = extractOg(html, base);
      const heur = (mode !== "product") ? extractCardsHeuristic(html, base) : [];

      if (mode === "product") {
        products = jsonLd.slice(0, 1);
        if (products.length === 0 && og) products = [og];
      } else {
        products = [...jsonLd, ...heur];
      }

      if (products.length === 0) {
        products = await aiFallback(html, base);
      }

      // Dedupe by url+title
      const seen = new Set<string>();
      products = products.filter((p) => {
        const k = `${p.url || ""}|${(p.title || "").toLowerCase()}`;
        if (seen.has(k)) return false;
        seen.add(k); return true;
      }).slice(0, MAX_PRODUCTS);
    } catch (e) {
      errorMsg = String((e as Error).message);
    }

    if (products.length > 0) {
      const rows = products.map((p) => ({
        job_id: job.id,
        source_url: p.url || u.toString(),
        source_domain: u.hostname,
        original_title: p.title?.slice(0, 500) || null,
        original_description: p.description?.slice(0, 5000) || null,
        original_price: p.price ?? null,
        original_sale_price: p.sale_price ?? null,
        original_currency: p.currency || null,
        original_image_url: p.image || null,
        original_gallery_urls: p.gallery || [],
        detected_brand: p.brand || null,
        detected_category: p.category || null,
        detected_stock: p.stock || null,
        imported_data: p as unknown as Record<string, unknown>,
        status: "pending" as const,
        created_by: userId,
      }));
      await supabase.from("imported_products").insert(rows);
    }

    await supabase.from("web_import_jobs").update({
      products_found: products.length,
      status: errorMsg && products.length === 0 ? "error" : "done",
      error_message: errorMsg,
    }).eq("id", job.id);

    return new Response(JSON.stringify({ job_id: job.id, products_found: products.length, error: errorMsg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
