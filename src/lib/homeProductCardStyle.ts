// Tipografía configurable para las tarjetas de producto del Home.
// Se guarda como JSON en site_content bajo la clave "home.product_card.style".

export type TextCfg = {
  font: string;
  sizeDesktop: number;
  sizeMobile: number;
  weight: number;
  color: string;
  lineHeight?: number;
  maxLines?: number;
  transform?: "none" | "uppercase" | "lowercase" | "capitalize";
  letterSpacing?: number; // em
  strikethrough?: boolean;
  show?: boolean;
  text?: string;
};

export type ButtonCfg = {
  font: string;
  sizeDesktop: number;
  sizeMobile: number;
  weight: number;
  textColor: string;
  bgColor: string;
  hoverColor: string;
  height: number;
  radius: number;
};

export type HomeProductCardStyle = {
  category: TextCfg;
  title: TextCfg;
  description: TextCfg;
  recommended: TextCfg;
  price: TextCfg;
  priceOld: TextCfg;
  button: ButtonCfg;
};

export const DEFAULT_STYLE: HomeProductCardStyle = {
  category: {
    font: "Inter", sizeDesktop: 12, sizeMobile: 12, weight: 500,
    color: "#666666", transform: "uppercase", letterSpacing: 0.04, maxLines: 1,
  },
  title: {
    font: "Inter", sizeDesktop: 18, sizeMobile: 16, weight: 600,
    color: "#151515", lineHeight: 1.3, maxLines: 2,
  },
  description: {
    font: "Inter", sizeDesktop: 14, sizeMobile: 13, weight: 400,
    color: "#666666", lineHeight: 1.45, maxLines: 2,
  },
  recommended: {
    font: "Inter", sizeDesktop: 13, sizeMobile: 13, weight: 400,
    color: "#666666", show: true, text: "Recomendado", maxLines: 1,
  },
  price: {
    font: "Inter", sizeDesktop: 24, sizeMobile: 22, weight: 700,
    color: "#151515",
  },
  priceOld: {
    font: "Inter", sizeDesktop: 13, sizeMobile: 13, weight: 400,
    color: "#888888", strikethrough: true,
  },
  button: {
    font: "Inter", sizeDesktop: 14, sizeMobile: 13, weight: 700,
    textColor: "#FFFFFF", bgColor: "#35A936", hoverColor: "#1F7A2E",
    height: 44, radius: 8,
  },
};

export const PRESETS: Record<string, Partial<HomeProductCardStyle>> = {
  "Ecommerce limpio": DEFAULT_STYLE,
  "Compacto": {
    ...DEFAULT_STYLE,
    title: { ...DEFAULT_STYLE.title, sizeDesktop: 16, sizeMobile: 15, weight: 600 },
    description: { ...DEFAULT_STYLE.description, sizeDesktop: 13, sizeMobile: 12 },
    price: { ...DEFAULT_STYLE.price, sizeDesktop: 22, sizeMobile: 20, weight: 700 },
  },
  "Premium": {
    ...DEFAULT_STYLE,
    title: { ...DEFAULT_STYLE.title, sizeDesktop: 19, sizeMobile: 17, weight: 600 },
    description: { ...DEFAULT_STYLE.description, sizeDesktop: 14, sizeMobile: 13 },
    price: { ...DEFAULT_STYLE.price, sizeDesktop: 26, sizeMobile: 23, weight: 700 },
  },
  "Mobile compacto": {
    ...DEFAULT_STYLE,
    title: { ...DEFAULT_STYLE.title, sizeDesktop: 15, sizeMobile: 14, weight: 600 },
    description: { ...DEFAULT_STYLE.description, sizeDesktop: 12, sizeMobile: 12 },
    price: { ...DEFAULT_STYLE.price, sizeDesktop: 20, sizeMobile: 18, weight: 700 },
  },
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

const textRule = (sel: string, c: TextCfg, scope: string) => {
  const lh = c.lineHeight ?? 1.3;
  const ml = c.maxLines && c.maxLines > 0 ? c.maxLines : null;
  const clampCss = ml
    ? `display:-webkit-box;-webkit-line-clamp:${ml};-webkit-box-orient:vertical;overflow:hidden;white-space:normal;`
    : "";
  const ts = c.transform && c.transform !== "none" ? `text-transform:${c.transform};` : "";
  const ls = c.letterSpacing ? `letter-spacing:${c.letterSpacing}em;` : "";
  const st = c.strikethrough ? `text-decoration:line-through;` : "";
  const base = `
${scope} [data-pc="${sel}"]{
  font-family:'${c.font}',system-ui,sans-serif !important;
  font-size:${clamp(c.sizeMobile,8,80)}px !important;
  font-weight:${c.weight} !important;
  color:${c.color} !important;
  line-height:${lh} !important;
  ${ts}${ls}${st}${clampCss}
  min-height:0 !important;
}
@media (min-width:640px){
${scope} [data-pc="${sel}"]{ font-size:${clamp(c.sizeDesktop,8,80)}px !important; }
}`;
  return base;
};

export const buildScopedCss = (style: HomeProductCardStyle, scope = ".hpc-scope") => {
  let css = "";
  css += textRule("category", style.category, scope);
  css += textRule("title", style.title, scope);
  css += textRule("description", style.description, scope);
  if (style.recommended.show !== false) {
    css += textRule("recommended", style.recommended, scope);
  } else {
    css += `${scope} [data-pc="recommended"]{display:none !important;}`;
  }
  css += textRule("price", style.price, scope);
  css += textRule("price-old", style.priceOld, scope);

  const b = style.button;
  css += `
${scope} [data-pc="button"]{
  font-family:'${b.font}',system-ui,sans-serif !important;
  font-size:${clamp(b.sizeMobile,8,40)}px !important;
  font-weight:${b.weight} !important;
  color:${b.textColor} !important;
  background-color:${b.bgColor} !important;
  height:${clamp(b.height,28,80)}px !important;
  border-radius:${clamp(b.radius,0,40)}px !important;
  transition:background-color .2s ease;
}
${scope} [data-pc="button"]:hover{ background-color:${b.hoverColor} !important; }
@media (min-width:640px){
${scope} [data-pc="button"]{ font-size:${clamp(b.sizeDesktop,8,40)}px !important; }
}`;
  return css;
};

export const STYLE_KEY = "home.product_card.style";

export const parseStyle = (raw?: string | null): HomeProductCardStyle => {
  if (!raw) return DEFAULT_STYLE;
  try {
    const parsed = JSON.parse(raw);
    return {
      category: { ...DEFAULT_STYLE.category, ...parsed.category },
      title: { ...DEFAULT_STYLE.title, ...parsed.title },
      description: { ...DEFAULT_STYLE.description, ...parsed.description },
      recommended: { ...DEFAULT_STYLE.recommended, ...parsed.recommended },
      price: { ...DEFAULT_STYLE.price, ...parsed.price },
      priceOld: { ...DEFAULT_STYLE.priceOld, ...parsed.priceOld },
      button: { ...DEFAULT_STYLE.button, ...parsed.button },
    };
  } catch {
    return DEFAULT_STYLE;
  }
};
