// Design configuration for individual Home banner slides.
// All visual controls are stored in the `design` JSONB column.

export type HeroOverlayType = "dark" | "light" | "gradient-side" | "gradient-bottom" | "none";
export type HeroFit = "cover" | "contain";
export type HeroPosX = "left" | "center" | "right";
export type HeroPosY = "top" | "center" | "bottom";

export type HeroSlideDesign = {
  size: {
    heightDesktop: number;
    heightTablet: number;
    heightMobile: number;
    paddingY: number;
    paddingX: number;
  };
  overlay: {
    enabled: boolean;
    type: HeroOverlayType;
    color: string; // hex
    opacity: number; // 0-100
    imageOpacity: number; // 0-100
  };
  image: {
    fit: HeroFit;
    posX: HeroPosX;
    posY: HeroPosY;
    zoom: number; // 100 = no zoom
  };
  text: {
    color: string;
    titleDesktop: number; // px
    titleMobile: number;
    subtitleDesktop: number;
    subtitleMobile: number;
    maxWidth: number; // px
    maxLines: number; // 0 = unlimited
  };
  buttons: {
    primaryBg: string;
    primaryText: string;
    secondaryBg: string;
    secondaryText: string;
    secondaryStyle: "solid" | "outline" | "ghost";
    radius: number; // px
    hideSecondary: boolean;
  };
  align: {
    desktopX: HeroPosX;
    desktopY: HeroPosY;
    mobileX: HeroPosX;
    mobileY: HeroPosY;
  };
  content: {
    padLeftDesktop: number;
    padRightDesktop: number;
    padTopDesktop: number;
    padBottomDesktop: number;
    padLeftMobile: number;
    padRightMobile: number;
    padTopMobile: number;
    padBottomMobile: number;
    offsetXDesktop: number;
    offsetYDesktop: number;
    offsetXMobile: number;
    offsetYMobile: number;
    maxWidthDesktop: number;
    maxWidthMobile: number; // 0 = 100%
  };
};

export const defaultHeroSlideDesign: HeroSlideDesign = {
  size: { heightDesktop: 500, heightTablet: 420, heightMobile: 340, paddingY: 64, paddingX: 24 },
  overlay: { enabled: true, type: "gradient-side", color: "#0a0a0a", opacity: 45, imageOpacity: 100 },
  image: { fit: "cover", posX: "right", posY: "center", zoom: 100 },
  text: {
    color: "#ffffff",
    titleDesktop: 56,
    titleMobile: 32,
    subtitleDesktop: 18,
    subtitleMobile: 15,
    maxWidth: 560,
    maxLines: 0,
  },
  buttons: {
    primaryBg: "#16a34a",
    primaryText: "#ffffff",
    secondaryBg: "#ffffff",
    secondaryText: "#0a0a0a",
    secondaryStyle: "outline",
    radius: 8,
    hideSecondary: false,
  },
  align: { desktopX: "left", desktopY: "center", mobileX: "center", mobileY: "bottom" },
  content: {
    padLeftDesktop: 64, padRightDesktop: 64, padTopDesktop: 64, padBottomDesktop: 64,
    padLeftMobile: 20, padRightMobile: 20, padTopMobile: 32, padBottomMobile: 32,
    offsetXDesktop: 0, offsetYDesktop: 0, offsetXMobile: 0, offsetYMobile: 0,
    maxWidthDesktop: 560, maxWidthMobile: 0,
  },
};

export function mergeHeroSlideDesign(partial: any): HeroSlideDesign {
  const d = defaultHeroSlideDesign;
  const p = (partial || {}) as Partial<HeroSlideDesign>;
  return {
    size: { ...d.size, ...(p.size || {}) },
    overlay: { ...d.overlay, ...(p.overlay || {}) },
    image: { ...d.image, ...(p.image || {}) },
    text: { ...d.text, ...(p.text || {}) },
    buttons: { ...d.buttons, ...(p.buttons || {}) },
    align: { ...d.align, ...(p.align || {}) },
    content: { ...d.content, ...(p.content || {}) },
  };
}

export type HeroPresetKey = "impact" | "balanced" | "compact" | "mobile";

export const heroPresets: Record<HeroPresetKey, { label: string; design: HeroSlideDesign }> = {
  impact: {
    label: "Grande impacto",
    design: mergeHeroSlideDesign({
      size: { heightDesktop: 680, heightTablet: 540, heightMobile: 460, paddingY: 96, paddingX: 24 },
      overlay: { enabled: true, type: "dark", color: "#000000", opacity: 55, imageOpacity: 100 },
      text: { color: "#ffffff", titleDesktop: 72, titleMobile: 40, subtitleDesktop: 20, subtitleMobile: 16, maxWidth: 720, maxLines: 0 },
      align: { desktopX: "left", desktopY: "center", mobileX: "center", mobileY: "center" },
    }),
  },
  balanced: { label: "Ecommerce equilibrado", design: defaultHeroSlideDesign },
  compact: {
    label: "Compacto",
    design: mergeHeroSlideDesign({
      size: { heightDesktop: 360, heightTablet: 320, heightMobile: 260, paddingY: 40, paddingX: 24 },
      overlay: { enabled: true, type: "gradient-side", color: "#0a0a0a", opacity: 35, imageOpacity: 100 },
      text: { color: "#ffffff", titleDesktop: 40, titleMobile: 26, subtitleDesktop: 15, subtitleMobile: 14, maxWidth: 480, maxLines: 2 },
    }),
  },
  mobile: {
    label: "Mobile optimizado",
    design: mergeHeroSlideDesign({
      size: { heightDesktop: 460, heightTablet: 400, heightMobile: 420, paddingY: 48, paddingX: 20 },
      overlay: { enabled: true, type: "gradient-bottom", color: "#000000", opacity: 50, imageOpacity: 100 },
      align: { desktopX: "center", desktopY: "center", mobileX: "center", mobileY: "bottom" },
    }),
  },
};

function overlayCss(o: HeroSlideDesign["overlay"]): string {
  if (!o.enabled || o.type === "none") return "transparent";
  const a = Math.max(0, Math.min(100, o.opacity)) / 100;
  const hex = o.color.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const rgba = (alpha: number) => `rgba(${r}, ${g}, ${b}, ${alpha})`;
  switch (o.type) {
    case "dark":
    case "light":
      return rgba(a);
    case "gradient-side":
      return `linear-gradient(to right, ${rgba(a)} 0%, ${rgba(a * 0.6)} 45%, ${rgba(0)} 80%)`;
    case "gradient-bottom":
      return `linear-gradient(to top, ${rgba(a)} 0%, ${rgba(a * 0.5)} 50%, ${rgba(0)} 100%)`;
    default:
      return rgba(a);
  }
}

export type HeroSizeMode = "desktop" | "tablet" | "mobile";

export function getHeroStyles(d: HeroSlideDesign, mode: HeroSizeMode) {
  const height =
    mode === "desktop" ? d.size.heightDesktop : mode === "tablet" ? d.size.heightTablet : d.size.heightMobile;
  const titleSize = mode === "mobile" ? d.text.titleMobile : d.text.titleDesktop;
  const subtitleSize = mode === "mobile" ? d.text.subtitleMobile : d.text.subtitleDesktop;
  const alignX = mode === "mobile" ? d.align.mobileX : d.align.desktopX;
  const alignY = mode === "mobile" ? d.align.mobileY : d.align.desktopY;

  const itemsMap: Record<HeroPosY, string> = { top: "flex-start", center: "center", bottom: "flex-end" };
  const justifyMap: Record<HeroPosX, string> = { left: "flex-start", center: "center", right: "flex-end" };
  const textAlignMap: Record<HeroPosX, string> = { left: "left", center: "center", right: "right" };
  const objPosMap = (x: HeroPosX, y: HeroPosY) =>
    `${x === "left" ? "0%" : x === "right" ? "100%" : "50%"} ${y === "top" ? "0%" : y === "bottom" ? "100%" : "50%"}`;

  const isMobile = mode === "mobile";
  const padLeft = isMobile ? d.content.padLeftMobile : d.content.padLeftDesktop;
  const padRight = isMobile ? d.content.padRightMobile : d.content.padRightDesktop;
  const padTop = isMobile ? d.content.padTopMobile : d.content.padTopDesktop;
  const padBottom = isMobile ? d.content.padBottomMobile : d.content.padBottomDesktop;
  const offX = isMobile ? d.content.offsetXMobile : d.content.offsetXDesktop;
  const offY = isMobile ? d.content.offsetYMobile : d.content.offsetYDesktop;
  const maxW = isMobile ? d.content.maxWidthMobile : d.content.maxWidthDesktop;

  return {
    container: {
      position: "relative" as const,
      minHeight: `${height}px`,
      paddingTop: `${padTop}px`,
      paddingBottom: `${padBottom}px`,
      paddingLeft: `${padLeft}px`,
      paddingRight: `${padRight}px`,
      display: "flex",
      alignItems: itemsMap[alignY],
      justifyContent: justifyMap[alignX],
      overflow: "hidden",
    } as React.CSSProperties,
    image: {
      position: "absolute" as const,
      inset: 0,
      width: "100%",
      height: "100%",
      objectFit: d.image.fit,
      objectPosition: objPosMap(d.image.posX, d.image.posY),
      opacity: d.overlay.imageOpacity / 100,
      transform: `scale(${d.image.zoom / 100})`,
      transformOrigin: "center",
    } as React.CSSProperties,
    overlay: {
      position: "absolute" as const,
      inset: 0,
      background: overlayCss(d.overlay),
      pointerEvents: "none" as const,
    } as React.CSSProperties,
    content: {
      position: "relative" as const,
      zIndex: 1,
      maxWidth: maxW > 0 ? `${maxW}px` : "100%",
      width: maxW > 0 ? undefined : "100%",
      color: d.text.color,
      textAlign: textAlignMap[alignX] as any,
      transform: (offX || offY) ? `translate(${offX}px, ${offY}px)` : undefined,
    } as React.CSSProperties,
    title: {
      fontSize: `${titleSize}px`,
      lineHeight: 1.05,
      color: d.text.color,
      display: d.text.maxLines > 0 ? "-webkit-box" : undefined,
      WebkitLineClamp: d.text.maxLines > 0 ? d.text.maxLines : undefined,
      WebkitBoxOrient: d.text.maxLines > 0 ? ("vertical" as any) : undefined,
      overflow: d.text.maxLines > 0 ? "hidden" : undefined,
    } as React.CSSProperties,
    subtitle: {
      fontSize: `${subtitleSize}px`,
      color: d.text.color,
      opacity: 0.9,
    } as React.CSSProperties,
    primaryBtn: {
      backgroundColor: d.buttons.primaryBg,
      color: d.buttons.primaryText,
      borderRadius: `${d.buttons.radius}px`,
      border: "none",
    } as React.CSSProperties,
    secondaryBtn: ((): React.CSSProperties => {
      const base: React.CSSProperties = { borderRadius: `${d.buttons.radius}px` };
      if (d.buttons.secondaryStyle === "solid") {
        return { ...base, backgroundColor: d.buttons.secondaryBg, color: d.buttons.secondaryText, border: "none" };
      }
      if (d.buttons.secondaryStyle === "ghost") {
        return { ...base, backgroundColor: "transparent", color: d.buttons.secondaryText, border: "none" };
      }
      return { ...base, backgroundColor: "transparent", color: d.buttons.secondaryText, border: `1.5px solid ${d.buttons.secondaryBg}` };
    })(),
  };
}
