// Helpers for the Lucía AI chat assistant.

const WA_DEFAULT = "14155552671";

export type LuciaContext = {
  page: string;
  productSlug?: string | null;
  productName?: string | null;
  productId?: string | null;
  category?: string | null;
  landing?: { kind: string; field?: string | null; value?: string | null } | null;
};

export function buildWhatsAppMessage(ctx: LuciaContext): string {
  if (ctx.productName) {
    return `Hola, quiero información sobre ${ctx.productName}. Lo vi en la web de Nutribatidos y Lucía me lo recomendó.`;
  }
  return "Hola, Lucía me recomendó recibir asesoría para elegir un producto de Nutribatidos.";
}

export function whatsappUrl(number: string | undefined | null, message: string) {
  const n = (number || WA_DEFAULT).replace(/\D/g, "");
  return `https://wa.me/${n}?text=${encodeURIComponent(message)}`;
}

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem("lucia.sid");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("lucia.sid", id);
  }
  return id;
}

export function pageShowsLucia(
  pathname: string,
  s: { show_on_home?: boolean; show_on_product?: boolean; show_on_category?: boolean; show_on_landing?: boolean },
) {
  if (pathname === "/") return !!s.show_on_home;
  if (/^\/(producto|product|productos)\//.test(pathname)) return !!s.show_on_product;
  if (/^\/(categoria|category|categorias)\//.test(pathname)) return !!s.show_on_category;
  if (/^\/(beneficio|ingrediente|objetivo)\//.test(pathname)) return !!s.show_on_landing;
  return false;
}

export function detectLandingKind(pathname: string): "beneficio" | "ingrediente" | "objetivo" | null {
  const m = pathname.match(/^\/(beneficio|ingrediente|objetivo)\//);
  return (m?.[1] as any) ?? null;
}

export const PROVIDER_MODELS: Record<string, { value: string; label: string }[]> = {
  gemini: [
    { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (rápido)" },
    { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
  ],
  openai: [
    { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
    { value: "openai/gpt-5", label: "GPT-5" },
    { value: "openai/gpt-5-nano", label: "GPT-5 Nano" },
  ],
  deepseek: [
    { value: "deepseek-chat", label: "DeepSeek Chat" },
    { value: "deepseek-reasoner", label: "DeepSeek Reasoner" },
  ],
  claude: [
    { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
    { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
  ],
};

export const QUICK_HOME = [
  "Quiero más energía",
  "Busco colágeno",
  "Quiero algo para el desayuno",
  "Quiero productos naturales",
];

export const QUICK_PRODUCT = [
  "¿Para qué sirve?",
  "¿Cómo se toma?",
  "¿Tiene stock?",
  "Quiero comprar",
  "Recomiéndame similares",
];
