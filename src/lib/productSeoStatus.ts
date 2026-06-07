import { computeProductSeoScore, type ProductSeoInput, type ProductSeoBreakdown } from "./seoScore";

export type ProductSeoStatus = "complete" | "incomplete" | "missing" | "errors" | "noindex";

export type ProductSeoStatusInfo = {
  status: ProductSeoStatus;
  label: string;
  score: number;
  badgeClass: string;
  missing: ProductSeoBreakdown[];
  hasAny: boolean;
};

export type RawSeoMeta = {
  seo_title?: string | null;
  seo_description?: string | null;
  slug?: string | null;
  canonical?: string | null;
  og_image?: string | null;
  keywords?: string[] | null;
  tags?: string[] | null;
  shopping_title?: string | null;
  shopping_description?: string | null;
  short_description?: string | null;
  long_description?: string | null;
  noindex?: boolean | null;
  score?: number | null;
};

export const buildProductSeoInput = (
  product: { name?: string | null; slug?: string | null; short_description?: string | null; description?: string | null; main_image?: string | null },
  meta?: RawSeoMeta | null,
  imagesTotal = 1,
  imagesWithAlt = 0,
): ProductSeoInput => ({
  productName: product.name,
  seoTitle: meta?.seo_title,
  seoDescription: meta?.seo_description,
  slug: meta?.slug ?? product.slug,
  canonical: meta?.canonical,
  ogImage: meta?.og_image ?? product.main_image,
  keywords: meta?.keywords ?? [],
  tags: meta?.tags ?? [],
  shoppingTitle: meta?.shopping_title,
  shoppingDescription: meta?.shopping_description,
  shortDescription: meta?.short_description ?? product.short_description,
  longDescription: meta?.long_description ?? product.description,
  imagesTotal,
  imagesWithAlt,
});

export const getProductSeoStatus = (
  product: any,
  meta?: RawSeoMeta | null,
  imagesTotal = 1,
  imagesWithAlt = 0,
): ProductSeoStatusInfo => {
  const input = buildProductSeoInput(product, meta, imagesTotal, imagesWithAlt);
  const { score, breakdown, missing } = computeProductSeoScore(input);
  const missingBreakdown = breakdown.filter((b) => !b.ok);

  const hasTitle = !!(meta?.seo_title?.trim());
  const hasDesc = !!(meta?.seo_description?.trim());
  const hasAny = !!meta && (hasTitle || hasDesc || (meta.keywords?.length ?? 0) > 0 || (meta.tags?.length ?? 0) > 0);

  let status: ProductSeoStatus;
  let label: string;
  let badgeClass: string;

  if (meta?.noindex) {
    status = "noindex";
    label = "No index activo";
    badgeClass = "bg-muted text-muted-foreground border";
  } else if (!hasTitle && !hasDesc) {
    status = "missing";
    label = "Sin SEO";
    badgeClass = "bg-destructive/10 text-destructive border border-destructive/30";
  } else if (score >= 95 && missing.length === 0) {
    status = "complete";
    label = "SEO completo";
    badgeClass = "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300";
  } else {
    // Title/desc filled but out of ideal range -> "con errores"
    const titleLen = (meta?.seo_title ?? "").length;
    const descLen = (meta?.seo_description ?? "").length;
    const titleErr = hasTitle && (titleLen < 45 || titleLen > 60);
    const descErr = hasDesc && (descLen < 130 || descLen > 160);
    if (titleErr || descErr) {
      status = "errors";
      label = "SEO con errores";
      badgeClass = "bg-orange-100 text-orange-800 border border-orange-300 dark:bg-orange-950/40 dark:text-orange-300";
    } else {
      status = "incomplete";
      label = "SEO incompleto";
      badgeClass = "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300";
    }
  }

  return { status, label, score, badgeClass, missing: missingBreakdown, hasAny };
};
