// Design system for Home carousels.
// Applies only inside the .hcs-scope wrapper, so catalog/category/product/checkout pages are not affected.

export type CarouselLayoutCfg = {
  widthPreset: "container" | "wide" | "full" | "custom";
  maxWidthDesktop: number; // 0 = 100%
  maxWidthTablet: number;
  maxWidthMobile: number;
  padDesktop: number;
  padTablet: number;
  padMobile: number;
  itemsDesktop: number;
  itemsTablet: number;
  itemsMobile: number;
  gapDesktop: number;
  gapTablet: number;
  gapMobile: number;
  cardMinHeight: number; // px, 0 = auto
  cardMinWidth: number;
  equalHeight: boolean;
  buttonBottom: boolean;
  imageHeightDesktop: number;
  imageHeightTablet: number;
  imageHeightMobile: number;
  imageFit: "contain" | "cover";
  imagePosition: string; // e.g. "center", "top"
  showArrows: boolean;
  showDots: boolean;
  autoplay: boolean;
  autoplaySpeed: number; // seconds
  loop: boolean;
  freeScrollMobile: boolean;
};

export type CarouselBackgroundCfg = {
  type: "transparent" | "white" | "soft" | "solid" | "gradient";
  color1: string;
  color2: string;
  gradientDirection: number; // deg
  opacity: number; // 0..1
  radius: number; // px
  paddingInner: number; // px
  marginTop: number;
  marginBottom: number;
};

export type CarouselDesign = {
  layout: CarouselLayoutCfg;
  background: CarouselBackgroundCfg;
};

export type BlockCarouselOverrides = {
  useGlobalLayout?: boolean;
  useGlobalBackground?: boolean;
  layout?: Partial<CarouselLayoutCfg>;
  background?: Partial<CarouselBackgroundCfg>;
};

export const DEFAULT_LAYOUT: CarouselLayoutCfg = {
  widthPreset: "wide",
  maxWidthDesktop: 1440,
  maxWidthTablet: 0,
  maxWidthMobile: 0,
  padDesktop: 24,
  padTablet: 20,
  padMobile: 16,
  itemsDesktop: 5,
  itemsTablet: 3,
  itemsMobile: 1.2,
  gapDesktop: 16,
  gapTablet: 14,
  gapMobile: 12,
  cardMinHeight: 0,
  cardMinWidth: 0,
  equalHeight: true,
  buttonBottom: true,
  imageHeightDesktop: 220,
  imageHeightTablet: 200,
  imageHeightMobile: 180,
  imageFit: "contain",
  imagePosition: "center",
  showArrows: true,
  showDots: false,
  autoplay: false,
  autoplaySpeed: 5,
  loop: true,
  freeScrollMobile: true,
};

export const DEFAULT_BG: CarouselBackgroundCfg = {
  type: "transparent",
  color1: "#f5f5f5",
  color2: "#ffffff",
  gradientDirection: 135,
  opacity: 1,
  radius: 20,
  paddingInner: 24,
  marginTop: 24,
  marginBottom: 24,
};

export const DEFAULT_DESIGN: CarouselDesign = {
  layout: DEFAULT_LAYOUT,
  background: DEFAULT_BG,
};

export type PresetKey =
  | "compact"
  | "clean"
  | "premium"
  | "fullscreen"
  | "mobile"
  | "featured";

export const PRESETS: Record<PresetKey, { label: string; layout?: Partial<CarouselLayoutCfg>; background?: Partial<CarouselBackgroundCfg> }> = {
  compact: {
    label: "Compacto",
    layout: { widthPreset: "container", maxWidthDesktop: 1200, padDesktop: 16, itemsDesktop: 5, itemsTablet: 3, itemsMobile: 1.5, gapDesktop: 12, gapMobile: 10, imageHeightDesktop: 180, imageHeightMobile: 150 },
    background: { type: "transparent", paddingInner: 16, radius: 12 },
  },
  clean: {
    label: "Ecommerce limpio",
    layout: { widthPreset: "wide", maxWidthDesktop: 1320, padDesktop: 20, itemsDesktop: 4, itemsTablet: 3, itemsMobile: 1.2, gapDesktop: 16, imageHeightDesktop: 220, imageHeightMobile: 180 },
    background: { type: "transparent", paddingInner: 0, marginTop: 32, marginBottom: 32 },
  },
  premium: {
    label: "Amplio premium",
    layout: { widthPreset: "wide", maxWidthDesktop: 1440, padDesktop: 24, padMobile: 16, itemsDesktop: 5, itemsTablet: 3, itemsMobile: 1.2, gapDesktop: 16, gapMobile: 12, imageHeightDesktop: 220, imageHeightMobile: 180, equalHeight: true, buttonBottom: true },
    background: { type: "transparent", paddingInner: 24, radius: 20, marginTop: 24, marginBottom: 24 },
  },
  fullscreen: {
    label: "Pantalla completa",
    layout: { widthPreset: "full", maxWidthDesktop: 0, padDesktop: 32, itemsDesktop: 6, itemsTablet: 3, itemsMobile: 1.3, gapDesktop: 20 },
    background: { type: "soft", paddingInner: 32, radius: 0, marginTop: 0, marginBottom: 0 },
  },
  mobile: {
    label: "Mobile optimizado",
    layout: { itemsMobile: 1.3, gapMobile: 12, padMobile: 12, imageHeightMobile: 200, freeScrollMobile: true },
    background: {},
  },
  featured: {
    label: "Fondo destacado",
    layout: { widthPreset: "wide", maxWidthDesktop: 1440, padDesktop: 24 },
    background: { type: "soft", color1: "#f1f5f4", paddingInner: 24, radius: 20, marginTop: 24, marginBottom: 24 },
  },
};

const sanitizeLayout = (partial?: Partial<CarouselLayoutCfg> | null): Partial<CarouselLayoutCfg> => {
  if (!partial || typeof partial !== "object") return {};
  const out: any = {};
  for (const k of Object.keys(partial) as (keyof CarouselLayoutCfg)[]) {
    const v = (partial as any)[k];
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out;
};

const sanitizeBg = (partial?: Partial<CarouselBackgroundCfg> | null): Partial<CarouselBackgroundCfg> => {
  if (!partial || typeof partial !== "object") return {};
  const out: any = {};
  for (const k of Object.keys(partial) as (keyof CarouselBackgroundCfg)[]) {
    const v = (partial as any)[k];
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out;
};

export function resolveDesign(
  global: Partial<CarouselDesign> | null | undefined,
  overrides?: BlockCarouselOverrides | null,
): CarouselDesign {
  const gLayout = { ...DEFAULT_LAYOUT, ...sanitizeLayout(global?.layout as any) };
  const gBg = { ...DEFAULT_BG, ...sanitizeBg(global?.background as any) };
  const useGL = overrides?.useGlobalLayout !== false;
  const useGB = overrides?.useGlobalBackground !== false;
  const layout = useGL ? gLayout : { ...gLayout, ...sanitizeLayout(overrides?.layout) };
  const background = useGB ? gBg : { ...gBg, ...sanitizeBg(overrides?.background) };
  return { layout, background };
}

function bgCss(bg: CarouselBackgroundCfg): string {
  switch (bg.type) {
    case "transparent": return "transparent";
    case "white": return "#ffffff";
    case "soft": return "hsl(var(--muted))";
    case "solid": return bg.color1 || "#ffffff";
    case "gradient":
      return `linear-gradient(${bg.gradientDirection || 135}deg, ${bg.color1 || "#ffffff"}, ${bg.color2 || "#f0f0f0"})`;
    default: return "transparent";
  }
}

export function buildScopedCss(scopeId: string, design: CarouselDesign): string {
  const { layout: L, background: B } = design;
  const sel = `#${scopeId}`;
  const itemBasis = (n: number) => `calc(100% / ${Math.max(0.5, n)})`;
  const cardMinH = L.cardMinHeight > 0 ? `min-height:${L.cardMinHeight}px;` : "";
  const cardMinW = L.cardMinWidth > 0 ? `min-width:${L.cardMinWidth}px;` : "";

  return `
${sel}{
  margin-top:${B.marginTop}px;
  margin-bottom:${B.marginBottom}px;
}
${sel} .hcs-bg{
  background:${bgCss(B)};
  opacity:${B.opacity};
  border-radius:${B.radius}px;
  padding:${B.paddingInner}px;
}
${sel} .hcs-container{
  width:100%;
  margin-left:auto;margin-right:auto;
  max-width:${L.maxWidthMobile > 0 ? `${L.maxWidthMobile}px` : "100%"};
  padding-left:${L.padMobile}px;padding-right:${L.padMobile}px;
}
@media (min-width:768px){
  ${sel} .hcs-container{
    max-width:${L.maxWidthTablet > 0 ? `${L.maxWidthTablet}px` : "100%"};
    padding-left:${L.padTablet}px;padding-right:${L.padTablet}px;
  }
}
@media (min-width:1024px){
  ${sel} .hcs-container{
    max-width:${L.maxWidthDesktop > 0 ? `${L.maxWidthDesktop}px` : "100%"};
    padding-left:${L.padDesktop}px;padding-right:${L.padDesktop}px;
  }
}

${sel} .hcs-track{ margin-left:-${L.gapMobile / 2}px; margin-right:-${L.gapMobile / 2}px; }
${sel} .hcs-item{
  flex:0 0 ${itemBasis(L.itemsMobile)};
  padding-left:${L.gapMobile / 2}px;padding-right:${L.gapMobile / 2}px;
  ${L.equalHeight ? "height:auto;" : ""}
}
@media (min-width:768px){
  ${sel} .hcs-track{ margin-left:-${L.gapTablet / 2}px; margin-right:-${L.gapTablet / 2}px; }
  ${sel} .hcs-item{ flex-basis:${itemBasis(L.itemsTablet)}; padding-left:${L.gapTablet / 2}px;padding-right:${L.gapTablet / 2}px; }
}
@media (min-width:1024px){
  ${sel} .hcs-track{ margin-left:-${L.gapDesktop / 2}px; margin-right:-${L.gapDesktop / 2}px; }
  ${sel} .hcs-item{ flex-basis:${itemBasis(L.itemsDesktop)}; padding-left:${L.gapDesktop / 2}px;padding-right:${L.gapDesktop / 2}px; }
}

${sel} [data-pc="card"]{
  display:flex;flex-direction:column;
  ${L.equalHeight ? "height:100%;" : ""}
  ${cardMinH}${cardMinW}
}
${sel} [data-pc="content"]{display:flex;flex-direction:column;flex:1;}
${sel} [data-pc="button-wrap"]{${L.buttonBottom ? "margin-top:auto;" : ""}}
${sel} [data-pc="image-wrap"]{
  height:${L.imageHeightMobile}px !important;
  aspect-ratio:auto !important;
  background:hsl(var(--secondary));
}
@media (min-width:768px){ ${sel} [data-pc="image-wrap"]{height:${L.imageHeightTablet}px !important;} }
@media (min-width:1024px){ ${sel} [data-pc="image-wrap"]{height:${L.imageHeightDesktop}px !important;} }
${sel} [data-pc="image"]{
  width:100% !important;height:100% !important;
  object-fit:${L.imageFit} !important;
  object-position:${L.imagePosition} !important;
}
`.trim();
}
