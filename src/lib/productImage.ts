import productProtein from "@/assets/product-protein.jpg";
import productVitamins from "@/assets/product-vitamins.jpg";
import productSnack from "@/assets/product-snack.jpg";
import productShaker from "@/assets/product-shaker.jpg";
import productBcaa from "@/assets/product-bcaa.jpg";
import productCreatine from "@/assets/product-creatine.jpg";
import productPreworkout from "@/assets/product-preworkout.jpg";

const bundled: Record<string, string> = {
  "product-protein.jpg": productProtein,
  "product-vitamins.jpg": productVitamins,
  "product-snack.jpg": productSnack,
  "product-shaker.jpg": productShaker,
  "product-bcaa.jpg": productBcaa,
  "product-creatine.jpg": productCreatine,
  "product-preworkout.jpg": productPreworkout,
};

type ProductLike = {
  image?: string | null;
  image_url?: string | null;
  main_image?: string | null;
  gallery_images?: Array<string | { url?: string | null }> | null;
};

const firstString = (arr?: any): string | null => {
  if (!Array.isArray(arr)) return null;
  for (const item of arr) {
    if (typeof item === "string" && item.trim()) return item.trim();
    if (item && typeof item === "object" && typeof item.url === "string" && item.url.trim()) return item.url.trim();
  }
  return null;
};

export const resolveProductImage = (
  src?: string | null | ProductLike,
  fallback?: string,
): string => {
  const fb = fallback || productProtein;
  if (src && typeof src === "object") {
    const candidate =
      (typeof src.main_image === "string" && src.main_image.trim() ? src.main_image.trim() : null) ||
      (typeof src.image_url === "string" && src.image_url.trim() ? src.image_url.trim() : null) ||
      (typeof src.image === "string" && src.image.trim() ? src.image.trim() : null) ||
      firstString(src.gallery_images);
    return resolveProductImage(candidate, fallback);
  }
  if (!src || typeof src !== "string" || !src.trim()) return fb;
  const clean = src.trim();
  if (clean === "null" || clean === "undefined") return fb;


  // Map legacy /src/assets/foo.jpg paths to bundled URLs (Vite-hashed)
  const match = clean.match(/([^/\\]+\.(jpg|jpeg|png|webp|gif|svg|avif))$/i);
  if (match && bundled[match[1]]) return bundled[match[1]];

  // Absolute URL, data:, blob:, or public path
  if (
    /^(https?:)?\/\//.test(clean) ||
    clean.startsWith("data:") ||
    clean.startsWith("blob:")
  ) {
    return clean;
  }
  if (clean.startsWith("/")) {
    // Broken vite source paths cannot resolve at runtime
    if (clean.startsWith("/src/")) return fb;
    return clean;
  }
  return clean;
};

/**
 * Resolve the best image for a promotion's product, trying multiple fields
 * in priority order. Always returns a valid URL (never empty).
 */
export const getPromotionImage = (
  product?: {
    image_url?: string | null;
    main_image?: string | null;
    images?: Array<{ url?: string | null } | string> | null;
    product_images?: Array<{ url?: string | null } | string> | null;
    gallery_images?: Array<string | { url?: string | null }> | null;
  } | null,
  promotionImage?: string | null,
  fallback?: string,
): string => {
  const pick = (v: unknown): string | null => {
    if (!v) return null;
    if (typeof v === "string") return v.trim() || null;
    if (typeof v === "object" && v && "url" in (v as any)) {
      const u = (v as any).url;
      return typeof u === "string" && u.trim() ? u.trim() : null;
    }
    return null;
  };

  const firstOf = (arr?: any[] | null): string | null => {
    if (!Array.isArray(arr)) return null;
    for (const item of arr) {
      const v = pick(item);
      if (v) return v;
    }
    return null;
  };

  const candidate =
    pick(promotionImage) ||
    pick(product?.image_url) ||
    pick(product?.main_image) ||
    firstOf(product?.images as any[]) ||
    firstOf(product?.product_images as any[]) ||
    firstOf(product?.gallery_images as any[]);

  return resolveProductImage(candidate, fallback);
};
