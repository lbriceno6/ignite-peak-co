// Layout system for the AI Dynamic Banner block.
// Scoped to the banner's wrapper via a unique id, so it never leaks to the rest of the page.

export type AiBannerWidth = "container" | "wide" | "full" | "full-padded" | "custom";
export type AiBannerFit = "cover" | "contain";
export type AiBannerPosX = "left" | "center" | "right";

export type AiBannerLayout = {
  width: AiBannerWidth;
  // Desktop
  maxWidthDesktop: number; // 0 = 100%
  padDesktop: number;
  heightDesktop: number;
  imageFitDesktop: AiBannerFit;
  imagePosDesktop: AiBannerPosX;
  // Tablet
  maxWidthTablet: number;
  padTablet: number;
  heightTablet: number;
  imageFitTablet: AiBannerFit;
  imagePosTablet: AiBannerPosX;
  // Mobile
  maxWidthMobile: number;
  padMobile: number;
  heightMobile: number;
  imageFitMobile: AiBannerFit;
  imagePosMobile: AiBannerPosX;
  // Image adaptation
  imageZoom: number; // % 100 = none
  minHeight: number; // 0 = none
  maxHeight: number; // 0 = none
  // Mobile behavior
  hideImageOnMobile: boolean;
  centerImageOnMobile: boolean;
  reduceHeightOnMobile: boolean;
  rounded: boolean;
};

export const DEFAULT_AI_BANNER_LAYOUT: AiBannerLayout = {
  width: "container",
  maxWidthDesktop: 1200,
  padDesktop: 16,
  heightDesktop: 420,
  imageFitDesktop: "cover",
  imagePosDesktop: "center",
  maxWidthTablet: 0,
  padTablet: 16,
  heightTablet: 340,
  imageFitTablet: "cover",
  imagePosTablet: "center",
  maxWidthMobile: 0,
  padMobile: 16,
  heightMobile: 260,
  imageFitMobile: "cover",
  imagePosMobile: "center",
  imageZoom: 100,
  minHeight: 0,
  maxHeight: 0,
  hideImageOnMobile: false,
  centerImageOnMobile: true,
  reduceHeightOnMobile: false,
  rounded: true,
};

const PRESET_BASE: Record<Exclude<AiBannerWidth, "custom">, Partial<AiBannerLayout>> = {
  container: { maxWidthDesktop: 1200, padDesktop: 16, padTablet: 16, padMobile: 16 },
  wide: { maxWidthDesktop: 1440, padDesktop: 24, padTablet: 20, padMobile: 16 },
  full: { maxWidthDesktop: 0, padDesktop: 0, padTablet: 0, padMobile: 0 },
  "full-padded": { maxWidthDesktop: 0, padDesktop: 32, padTablet: 24, padMobile: 16 },
};

export function mergeAiBannerLayout(partial: any): AiBannerLayout {
  const base: AiBannerLayout = { ...DEFAULT_AI_BANNER_LAYOUT, ...(partial || {}) };
  if (base.width !== "custom") {
    const p = PRESET_BASE[base.width];
    return { ...base, ...p };
  }
  return base;
}

const posMap: Record<AiBannerPosX, string> = { left: "left center", center: "center center", right: "right center" };

export function buildAiBannerCss(scopeId: string, layout: AiBannerLayout): string {
  const L = layout;
  const sel = `#${scopeId}`;
  const maxW = (n: number) => (n > 0 ? `${n}px` : "100%");
  const minH = L.minHeight > 0 ? `min-height:${L.minHeight}px;` : "";
  const maxH = L.maxHeight > 0 ? `max-height:${L.maxHeight}px;` : "";

  return `
${sel} .aidb-wrap{
  width:100%;
  margin-left:auto;margin-right:auto;
  max-width:${maxW(L.maxWidthMobile)};
  padding-left:${L.padMobile}px;padding-right:${L.padMobile}px;
}
${sel} .aidb-inner{ min-height:${L.reduceHeightOnMobile ? Math.round(L.heightMobile * 0.8) : L.heightMobile}px; ${minH}${maxH} }
${sel} .aidb-img{
  object-fit:${L.imageFitMobile};
  object-position:${L.centerImageOnMobile ? "center center" : posMap[L.imagePosMobile]};
  transform:scale(${L.imageZoom / 100});
  ${L.hideImageOnMobile ? "display:none;" : ""}
}
@media (min-width:640px){
  ${sel} .aidb-wrap{
    max-width:${maxW(L.maxWidthTablet)};
    padding-left:${L.padTablet}px;padding-right:${L.padTablet}px;
  }
  ${sel} .aidb-inner{ min-height:${L.heightTablet}px; }
  ${sel} .aidb-img{
    object-fit:${L.imageFitTablet};
    object-position:${posMap[L.imagePosTablet]};
    display:block;
  }
}
@media (min-width:1024px){
  ${sel} .aidb-wrap{
    max-width:${maxW(L.maxWidthDesktop)};
    padding-left:${L.padDesktop}px;padding-right:${L.padDesktop}px;
  }
  ${sel} .aidb-inner{ min-height:${L.heightDesktop}px; }
  ${sel} .aidb-img{
    object-fit:${L.imageFitDesktop};
    object-position:${posMap[L.imagePosDesktop]};
  }
}
`.trim();
}
