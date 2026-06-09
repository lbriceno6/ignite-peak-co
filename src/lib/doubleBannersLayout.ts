// Layout system for the "Banners dobles promocionales" home block.
// Scoped via a unique id selector so styles never leak.

export type DbWidth = "container" | "wide" | "full" | "full-padded" | "custom";
export type DbFit = "cover" | "contain";
export type DbPosX = "left" | "center" | "right";

export type DoubleBannersLayout = {
  width: DbWidth;
  // Container
  maxWidthDesktop: number; // 0 = 100%
  maxWidthTablet: number;
  maxWidthMobile: number;
  padDesktop: number;
  padTablet: number;
  padMobile: number;
  // Image sizing
  imageZoom: number; // %
  minHeightDesktop: number; minHeightTablet: number; minHeightMobile: number;
  maxHeightDesktop: number; maxHeightTablet: number; maxHeightMobile: number;
  imageFit: DbFit;
  imagePos: DbPosX;
  // Mobile centering
  centerBannersMobile: boolean;
  centerImageMobile: boolean;
  centerContentMobile: boolean;
  stackOnMobile: boolean;
  mobileGap: number;
};

export const DEFAULT_DB_LAYOUT: DoubleBannersLayout = {
  width: "wide",
  maxWidthDesktop: 1440,
  maxWidthTablet: 0,
  maxWidthMobile: 0,
  padDesktop: 24,
  padTablet: 20,
  padMobile: 16,
  imageZoom: 110,
  minHeightDesktop: 0, minHeightTablet: 0, minHeightMobile: 0,
  maxHeightDesktop: 0, maxHeightTablet: 0, maxHeightMobile: 0,
  imageFit: "cover",
  imagePos: "center",
  centerBannersMobile: true,
  centerImageMobile: true,
  centerContentMobile: false,
  stackOnMobile: true,
  mobileGap: 16,
};

const PRESETS: Record<Exclude<DbWidth, "custom">, Partial<DoubleBannersLayout>> = {
  container: { maxWidthDesktop: 1200, padDesktop: 16, padTablet: 16, padMobile: 16 },
  wide: { maxWidthDesktop: 1440, padDesktop: 24, padTablet: 20, padMobile: 16 },
  full: { maxWidthDesktop: 0, padDesktop: 0, padTablet: 0, padMobile: 0 },
  "full-padded": { maxWidthDesktop: 0, padDesktop: 32, padTablet: 24, padMobile: 16 },
};

export function mergeDbLayout(partial: any): DoubleBannersLayout {
  const base: DoubleBannersLayout = { ...DEFAULT_DB_LAYOUT, ...(partial || {}) };
  if (base.width !== "custom") return { ...base, ...PRESETS[base.width] };
  return base;
}

const posMap: Record<DbPosX, string> = { left: "left center", center: "center center", right: "right center" };

export function buildDbCss(scopeId: string, L: DoubleBannersLayout): string {
  const sel = `#${scopeId}`;
  const maxW = (n: number) => (n > 0 ? `${n}px` : "100%");
  const minH = (n: number) => (n > 0 ? `min-height:${n}px;` : "");
  const maxH = (n: number) => (n > 0 ? `max-height:${n}px;` : "");
  const pos = L.centerImageMobile ? "center center" : posMap[L.imagePos];

  return `
${sel} .db-wrap{ width:100%; margin:0 auto; max-width:${maxW(L.maxWidthMobile)}; padding-left:${L.padMobile}px; padding-right:${L.padMobile}px; }
${sel} .db-grid{ display:grid; grid-template-columns:${L.stackOnMobile ? "1fr" : "repeat(2,minmax(0,1fr))"}; gap:${L.mobileGap}px; ${L.centerBannersMobile ? "justify-items:center;" : ""} }
${sel} .db-card{ width:100%; ${L.centerBannersMobile ? "max-width:560px;" : ""} ${L.centerContentMobile ? "text-align:center;" : ""} }
${sel} .db-card .db-img-wrap{ ${minH(L.minHeightMobile)} ${maxH(L.maxHeightMobile)} }
${sel} .db-img{ width:100%; height:100%; object-fit:${L.imageFit}; object-position:${pos}; transform:scale(${L.imageZoom/100}); transition:transform .4s ease; }
@media (min-width:640px){
  ${sel} .db-wrap{ max-width:${maxW(L.maxWidthTablet)}; padding-left:${L.padTablet}px; padding-right:${L.padTablet}px; }
  ${sel} .db-grid{ grid-template-columns:repeat(2,minmax(0,1fr)); gap:24px; justify-items:stretch; }
  ${sel} .db-card{ max-width:none; text-align:initial; }
  ${sel} .db-card .db-img-wrap{ ${minH(L.minHeightTablet)} ${maxH(L.maxHeightTablet)} }
  ${sel} .db-img{ object-position:${posMap[L.imagePos]}; }
}
@media (min-width:1024px){
  ${sel} .db-wrap{ max-width:${maxW(L.maxWidthDesktop)}; padding-left:${L.padDesktop}px; padding-right:${L.padDesktop}px; }
  ${sel} .db-card .db-img-wrap{ ${minH(L.minHeightDesktop)} ${maxH(L.maxHeightDesktop)} }
}
`.trim();
}
