import productProtein from "@/assets/product-protein.jpg";
import productVitamins from "@/assets/product-vitamins.jpg";
import productSnack from "@/assets/product-snack.jpg";

const bundled: Record<string, string> = {
  "product-protein.jpg": productProtein,
  "product-vitamins.jpg": productVitamins,
  "product-snack.jpg": productSnack,
};

export const resolveProductImage = (src?: string | null, fallback?: string): string => {
  if (!src) return fallback || productProtein;
  // Map legacy /src/assets/foo.jpg paths to bundled URLs (Vite-hashed)
  const match = src.match(/([^/\\]+\.(jpg|jpeg|png|webp|gif|svg))$/i);
  if (match && bundled[match[1]]) return bundled[match[1]];
  // Already an absolute URL or public path
  if (/^(https?:)?\/\//.test(src) || src.startsWith("/")) {
    // Block broken /src/... paths that won't resolve in production
    if (src.startsWith("/src/")) return fallback || productProtein;
    return src;
  }
  return src;
};
