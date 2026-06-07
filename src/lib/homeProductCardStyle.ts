// Tipografía + estructura de las tarjetas de producto del Home.
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

export type LayoutCfg = {
  imageHeightDesktop: number;     // px
  imageHeightMobile: number;      // px
  imageFit: "cover" | "contain";
  imageBg: string;                // background fill for image area
  paddingInner: number;           // px
  gap: number;                    // px
  priceBlockHeight: number;       // px min height for the price line
  buttonBottom: boolean;          // pin button to bottom
  equalizeHeights: boolean;       // h-full so cards match row height
};

export type HomeProductCardStyle = {
  category: TextCfg;
  title: TextCfg;
  description: TextCfg;
  recommended: TextCfg;
  price: TextCfg;
  priceOld: TextCfg;
  button: ButtonCfg;
  layout: LayoutCfg;
};

export const DEFAULT_LAYOUT: LayoutCfg = {
  imageHeightDesktop: 220,
  imageHeightMobile: 180,
  imageFit: "contain",
  imageBg: "#FFFFFF",
  paddingInner: 14,
  gap: 8,
  priceBlockHeight: 32,
  buttonBottom: true,
  equalizeHeights: true,
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
  layout: DEFAULT_LAYOUT,
};

export const PRESETS: Record<string, Partial<HomeProductCardStyle>> = {
  "Ecommerce limpio": DEFAULT_STYLE,
  "Compacto": {
    ...DEFAULT_STYLE,
    title: { ...DEFAULT_STYLE.title, sizeDesktop: 16, sizeMobile: 15, weight: 600, maxLines: 2 },
    description: { ...DEFAULT_STYLE.description, sizeDesktop: 13, sizeMobile: 12, maxLines: 2 },
    price: { ...DEFAULT_STYLE.price, sizeDesktop: 22, sizeMobile: 20, weight: 700 },
    layout: { ...DEFAULT_LAYOUT, imageHeightDesktop: 180, imageHeightMobile: 150, paddingInner: 12, gap: 6, priceBlockHeight: 28 },
  },
  "Premium": {
    ...DEFAULT_STYLE,
    title: { ...DEFAULT_STYLE.title, sizeDesktop: 19, sizeMobile: 17, weight: 600, maxLines: 2 },
    description: { ...DEFAULT_STYLE.description, sizeDesktop: 14, sizeMobile: 13, maxLines: 2 },
    price: { ...DEFAULT_STYLE.price, sizeDesktop: 26, sizeMobile: 23, weight: 700 },
    layout: { ...DEFAULT_LAYOUT, imageHeightDesktop: 260, imageHeightMobile: 200, paddingInner: 16, gap: 10, priceBlockHeight: 36 },
  },
  "Mobile compacto": {
    ...DEFAULT_STYLE,
    title: { ...DEFAULT_STYLE.title, sizeDesktop: 15, sizeMobile: 14, weight: 600, maxLines: 2 },
    description: { ...DEFAULT_STYLE.description, sizeDesktop: 12, sizeMobile: 12, maxLines: 2 },
    price: { ...DEFAULT_STYLE.price, sizeDesktop: 20, sizeMobile: 18, weight: 700 },
    layout: { ...DEFAULT_LAYOUT, imageHeightDesktop: 170, imageHeightMobile: 140, paddingInner: 10, gap: 6, priceBlockHeight: 26 },
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

  // --- Layout / structure rules (only inside scope) ---
  const L = { ...DEFAULT_LAYOUT, ...(style.layout || {}) };
  const equalize = L.equalizeHeights !== false;
  const bottom = L.buttonBottom !== false;

  css += `
${scope} [data-pc="card"]{
  ${equalize ? "height:100% !important;" : ""}
  display:flex !important;
  flex-direction:column !important;
}
${scope} [data-pc="image-wrap"]{
  aspect-ratio:auto !important;
  height:${clamp(L.imageHeightMobile,80,600)}px !important;
  background:${L.imageBg} !important;
  display:flex; align-items:center; justify-content:center;
  overflow:hidden;
}
@media (min-width:640px){
${scope} [data-pc="image-wrap"]{ height:${clamp(L.imageHeightDesktop,80,800)}px !important; }
}
${scope} [data-pc="image"]{
  width:100% !important;
  height:100% !important;
  object-fit:${L.imageFit} !important;
  object-position:center !important;
}
${scope} [data-pc="content"]{
  padding:${clamp(L.paddingInner,0,40)}px !important;
  gap:${clamp(L.gap,0,40)}px !important;
  display:flex !important;
  flex-direction:column !important;
  flex:1 1 auto !important;
  min-width:0;
}
${scope} [data-pc="price-block"]{
  min-height:${clamp(L.priceBlockHeight,16,80)}px !important;
  display:flex; align-items:baseline; flex-wrap:wrap; gap:.5rem;
}
${scope} [data-pc="button-wrap"]{
  ${bottom ? "margin-top:auto !important;" : ""}
}
${scope} [data-pc="button"]{ width:100% !important; }
`;

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
      layout: { ...DEFAULT_LAYOUT, ...(parsed.layout || {}) },
    };
  } catch {
    return DEFAULT_STYLE;
  }
};
