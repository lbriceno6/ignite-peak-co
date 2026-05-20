// Runs before `vite dev` and `vite build` (predev/prebuild hooks).
// Writes public/sitemap.xml (index) + public/sitemap-products.xml +
// public/sitemap-categories.xml + public/sitemap-blog.xml +
// public/sitemap-landings.xml + public/llms.txt
// Each URL carries a real lastmod from updated_at when available.

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://ignite-peak-co.lovable.app";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://mphrhcuqzkbbnovmdbpc.supabase.co";
const SUPABASE_ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1waHJoY3VxemtiYm5vdm1kYnBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNTM1ODMsImV4cCI6MjA5MzYyOTU4M30.2ID3yuUo0K5oBRg7uX6-VkeZzC_74VEgm5WlcOWynsg";

interface Entry { path: string; lastmod?: string; changefreq?: string; priority?: string; title?: string }

const staticEntries: Entry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0", title: "Inicio" },
  { path: "/productos", changefreq: "daily", priority: "0.9", title: "Productos" },
  { path: "/blog", changefreq: "weekly", priority: "0.7", title: "Blog" },
  { path: "/nosotros", changefreq: "monthly", priority: "0.5", title: "Sobre nosotros" },
  { path: "/contacto", changefreq: "monthly", priority: "0.5", title: "Contacto" },
  { path: "/programa-revendedor", changefreq: "monthly", priority: "0.5", title: "Programa revendedor" },
  { path: "/vende-con-nosotros", changefreq: "monthly", priority: "0.5", title: "Vende con nosotros" },
  { path: "/shipping-policies", changefreq: "yearly", priority: "0.3" },
  { path: "/returns-policies", changefreq: "yearly", priority: "0.3" },
  { path: "/terms-and-conditions", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
];

interface Dyn { products: Entry[]; posts: Entry[]; cats: Entry[]; landings: Entry[] }

async function fetchDynamic(): Promise<Dyn> {
  const out: Dyn = { products: [], posts: [], cats: [], landings: [] };
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON);
    const [{ data: products }, { data: posts }, { data: cats }, { data: landings }] = await Promise.all([
      sb.from("products").select("slug, name, updated_at").eq("is_active", true).eq("approval_status", "approved"),
      sb.from("blog_posts").select("slug, title, published_at, updated_at").eq("is_published", true),
      sb.from("categories").select("slug, name, type, updated_at"),
      sb.from("seo_landing_pages").select("kind, slug, title, updated_at").eq("is_published", true),
    ]);
    (products ?? []).forEach((p: any) => out.products.push({ path: `/producto/${p.slug}`, title: p.name, lastmod: (p.updated_at || "").slice(0, 10) || undefined, changefreq: "weekly", priority: "0.8" }));
    (posts ?? []).forEach((p: any) => out.posts.push({ path: `/blog/${p.slug}`, title: p.title, lastmod: ((p.updated_at || p.published_at) || "").slice(0, 10) || undefined, changefreq: "monthly", priority: "0.6" }));
    (cats ?? []).filter((c: any) => c.type === "product").forEach((c: any) => out.cats.push({ path: `/categoria/${c.slug}`, title: c.name, lastmod: (c.updated_at || "").slice(0, 10) || undefined, changefreq: "weekly", priority: "0.7" }));
    (landings ?? []).forEach((l: any) => out.landings.push({ path: `/${l.kind}/${l.slug}`, title: l.title, lastmod: (l.updated_at || "").slice(0, 10) || undefined, changefreq: "weekly", priority: "0.6" }));
  } catch (e) {
    console.warn("sitemap: dynamic fetch failed, using static only:", (e as Error).message);
  }
  return out;
}

function buildUrlset(entries: Entry[]) {
  const urls = entries.map((e) => [
    `  <url>`,
    `    <loc>${BASE_URL}${e.path}</loc>`,
    e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
    e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
    e.priority ? `    <priority>${e.priority}</priority>` : null,
    `  </url>`,
  ].filter(Boolean).join("\n"));
  return [`<?xml version="1.0" encoding="UTF-8"?>`, `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`, ...urls, `</urlset>`].join("\n");
}

function buildIndex(files: { loc: string; lastmod?: string }[]) {
  const items = files.map((f) => [
    `  <sitemap>`,
    `    <loc>${f.loc}</loc>`,
    f.lastmod ? `    <lastmod>${f.lastmod}</lastmod>` : null,
    `  </sitemap>`,
  ].filter(Boolean).join("\n"));
  return [`<?xml version="1.0" encoding="UTF-8"?>`, `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`, ...items, `</sitemapindex>`].join("\n");
}

function buildLlms(dyn: Dyn) {
  const section = (title: string, items: Entry[]) =>
    items.length ? `\n## ${title}\n\n${items.map((e) => `- [${e.title ?? e.path}](${BASE_URL}${e.path})`).join("\n")}\n` : "";
  return [
    `# Nutribatidos`, ``,
    `> Tienda online de suplementos nutricionales, batidos y productos de bienestar.`, ``,
    `## Principales`, ``,
    ...staticEntries.filter((e) => e.title).map((e) => `- [${e.title}](${BASE_URL}${e.path})`),
    section("Categorías", dyn.cats),
    section("Páginas SEO", dyn.landings),
    section("Productos", dyn.products.slice(0, 200)),
    section("Blog", dyn.posts.slice(0, 100)),
  ].join("\n");
}

function maxLastmod(entries: Entry[]): string | undefined {
  const sorted = entries.map((e) => e.lastmod).filter(Boolean).sort();
  return sorted.length ? sorted[sorted.length - 1] : undefined;
}

(async () => {
  const dyn = await fetchDynamic();
  const today = new Date().toISOString().slice(0, 10);

  writeFileSync(resolve("public/sitemap-products.xml"), buildUrlset(dyn.products));
  writeFileSync(resolve("public/sitemap-categories.xml"), buildUrlset(dyn.cats));
  writeFileSync(resolve("public/sitemap-blog.xml"), buildUrlset(dyn.posts));
  writeFileSync(resolve("public/sitemap-landings.xml"), buildUrlset(dyn.landings));
  writeFileSync(resolve("public/sitemap-static.xml"), buildUrlset(staticEntries));

  const index = buildIndex([
    { loc: `${BASE_URL}/sitemap-static.xml`, lastmod: today },
    { loc: `${BASE_URL}/sitemap-products.xml`, lastmod: maxLastmod(dyn.products) ?? today },
    { loc: `${BASE_URL}/sitemap-categories.xml`, lastmod: maxLastmod(dyn.cats) ?? today },
    { loc: `${BASE_URL}/sitemap-blog.xml`, lastmod: maxLastmod(dyn.posts) ?? today },
    { loc: `${BASE_URL}/sitemap-landings.xml`, lastmod: maxLastmod(dyn.landings) ?? today },
  ]);
  writeFileSync(resolve("public/sitemap.xml"), index);
  writeFileSync(resolve("public/llms.txt"), buildLlms(dyn));

  const totals = `static=${staticEntries.length} products=${dyn.products.length} cats=${dyn.cats.length} blog=${dyn.posts.length} landings=${dyn.landings.length}`;
  console.log(`sitemap index + 5 sub-sitemaps + llms.txt written (${totals})`);
})();
