import productBcaa from "@/assets/product-bcaa.jpg";
import productCreatine from "@/assets/product-creatine.jpg";
import productPreworkout from "@/assets/product-preworkout.jpg";
import productProtein from "@/assets/product-protein.jpg";
import productShaker from "@/assets/product-shaker.jpg";
import productSnack from "@/assets/product-snack.jpg";
import productVitamins from "@/assets/product-vitamins.jpg";

const bundled: Record<string, string> = {
  "product-bcaa.jpg": productBcaa,
  "product-creatine.jpg": productCreatine,
  "product-preworkout.jpg": productPreworkout,
  "product-protein.jpg": productProtein,
  "product-shaker.jpg": productShaker,
  "product-snack.jpg": productSnack,
  "product-vitamins.jpg": productVitamins,
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
