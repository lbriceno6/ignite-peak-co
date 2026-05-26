import productPlaceholder from "@/assets/product-protein.jpg";

export type Product = {
  id: string;
  slug: string;
  name: string;
  shortBenefit: string;
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  label?: "Best Seller" | "New" | "Offer";
  image: string;
  category: string;
  goal: string[];
  flavors?: string[];
  sizes?: string[];
  brand: string;
  subscriptionEnabled?: boolean;
  subscriptionDiscountPercent?: number;
  subscriptionIntervals?: number[]; // days
  supplier?: { slug: string; business_name: string; logo_url?: string | null } | null;
};

// Genérico placeholder (imagen genérica de polvo) usado solo si Supabase falla.
export const _placeholderImage = productPlaceholder;

export const products: Product[] = [];

export const categories = [
  { slug: "nb-superalimentos", name: "NB Superalimentos", icon: "🌿" },
  { slug: "sanacion-natural", name: "Sanación Natural", icon: "🌱" },
  { slug: "para-probar", name: "Para Probar", icon: "✨" },
  { slug: "familiares", name: "Familiares", icon: "🏠" },
];

export const goals = [
  { slug: "energia",   name: "Más energía",          desc: "Empieza el día sin café." },
  { slug: "digestion", name: "Mejor digestión",      desc: "Para sentirte ligera después de comer." },
  { slug: "defensas",  name: "Sube tus defensas",    desc: "Apoyo natural al sistema inmune." },
  { slug: "bienestar", name: "Bienestar diario",     desc: "Rutinas que se sienten en una semana." },
  { slug: "familia",   name: "Para toda la familia", desc: "Formatos que alcanzan todo el mes." },
];

export const reviews = [
  { name: "María, Arequipa", rating: 5, title: "Recuperé mi energía",
    text: "Lo tomo cada mañana en mi avena. En una semana sentí la diferencia.",
    verified: true },
  { name: "Carmen, Lima", rating: 5, title: "Mejor digestión",
    text: "Llevo 3 meses tomándolo y mi estómago dejó de incomodarme después de comer.",
    verified: true },
  { name: "Rocío, Trujillo", rating: 5, title: "Calidad real",
    text: "Se nota que es producto natural. No tiene ese sabor químico de otras marcas.",
    verified: true },
  { name: "Luisa, Cusco", rating: 5, title: "Toda mi familia lo toma",
    text: "Lo compro en formato familiar y rinde para mi esposo, mis hijos y yo.",
    verified: true },
];
