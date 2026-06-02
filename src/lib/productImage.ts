import productProtein from "@/assets/product-protein.jpg";
import productVitamins from "@/assets/product-vitamins.jpg";
import productSnack from "@/assets/product-snack.jpg";

const bundled: Record<string, string> = {
  "product-protein.jpg": productProtein,
  "product-vitamins.jpg": productVitamins,
  "product-snack.jpg": productSnack,
};

export const resolveProductImage = (src?: string | null, fallback?: string): string => {
  const fb = fallback || productProtein;
  if (!src || typeof src !== "string" || !src.trim()) {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.warn("[resolveProductImage] missing image src, using fallback", { src });
    }
    return fb;
  }
  const clean = src.trim();
  // Map legacy /src/assets/foo.jpg paths to bundled URLs (Vite-hashed)
  const match = clean.match(/([^/\\]+\.(jpg|jpeg|png|webp|gif|svg))$/i);
  if (match && bundled[match[1]]) return bundled[match[1]];
  // Absolute URL, public path, data: or blob:
  if (
    /^(https?:)?\/\//.test(clean) ||
    clean.startsWith("/") ||
    clean.startsWith("data:") ||
    clean.startsWith("blob:")
  ) {
    if (clean.startsWith("/src/")) {
      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-console
        console.warn("[resolveProductImage] broken /src/ path, using fallback", { src: clean });
      }
      return fb;
    }
    return clean;
  }
  return clean;
};
