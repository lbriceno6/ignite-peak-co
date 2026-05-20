// Runs before `vite dev` and `vite build` (predev/prebuild hooks).
// Writes public/sitemap.xml with public routes + dynamic product/blog/category entries.

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://ignite-peak-co.lovable.app";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://mphrhcuqzkbbnovmdbpc.supabase.co";
const SUPABASE_ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1waHJoY3VxemtiYm5vdm1kYnBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNTM1ODMsImV4cCI6MjA5MzYyOTU4M30.2ID3yuUo0K5oBRg7uX6-VkeZzC_74VEgm5WlcOWynsg";

interface Entry { path: string; lastmod?: string; changefreq?: string; priority?: string }

const staticEntries: Entry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/productos", changefreq: "daily", priority: "0.9" },
  { path: "/blog", changefreq: "weekly", priority: "0.7" },
  { path: "/nosotros", changefreq: "monthly", priority: "0.5" },
  { path: "/contacto", changefreq: "monthly", priority: "0.5" },
  { path: "/programa-revendedor", changefreq: "monthly", priority: "0.5" },
  { path: "/vende-con-nosotros", changefreq: "monthly", priority: "0.5" },
  { path: "/shipping-policies", changefreq: "yearly", priority: "0.3" },
  { path: "/returns-policies", changefreq: "yearly", priority: "0.3" },
  { path: "/terms-and-conditions", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
];

async function fetchDynamic(): Promise<Entry[]> {
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON);
    const [{ data: products }, { data: posts }, { data: cats }] = await Promise.all([
      sb.from("products").select("slug, updated_at").eq("is_active", true).eq("approval_status", "approved"),
      sb.from("blog_posts").select("slug, published_at").eq("is_published", true),
      sb.from("categories").select("slug, type"),
    ]);
    const out: Entry[] = [];
    (products ?? []).forEach((p: any) => out.push({ path: `/producto/${p.slug}`, lastmod: p.updated_at?.slice(0, 10), changefreq: "weekly", priority: "0.8" }));
    (posts ?? []).forEach((p: any) => out.push({ path: `/blog/${p.slug}`, lastmod: p.published_at?.slice(0, 10), changefreq: "monthly", priority: "0.6" }));
    (cats ?? []).filter((c: any) => c.type === "product").forEach((c: any) => out.push({ path: `/categoria/${c.slug}`, changefreq: "weekly", priority: "0.7" }));
    return out;
  } catch (e) {
    console.warn("sitemap: dynamic fetch failed, using static only:", (e as Error).message);
    return [];
  }
}

function build(entries: Entry[]) {
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

(async () => {
  const dyn = await fetchDynamic();
  const all = [...staticEntries, ...dyn];
  writeFileSync(resolve("public/sitemap.xml"), build(all));
  console.log(`sitemap.xml written (${all.length} entries)`);
})();
