// Layout & responsive sizing for the "Nuestras Categorías" home section.
// Generates scoped CSS so each block instance can have its own width, padding,
// gap and card sizing without touching the rest of the page.

export type CsWidthMode =
  | "container"
  | "wide"
  | "full"
  | "full-padded"
  | "custom";

export type CsMobileLayout = "carousel" | "grid";

export type CategoryShowcaseLayout = {
  widthMode: CsWidthMode;
  maxWidthDesktop: number; // px
  maxWidthTablet: number; // px
  maxWidthMobile: number; // px (0 = none)

  paddingDesktop: number; // px (lateral)
  paddingTablet: number;
  paddingMobile: number;

  gapDesktop: number;
  gapTablet: number;
  gapMobile: number;

  // Card sizing
  cardMinWidth: number; // px
  cardHeightDesktop: number; // px
  cardHeightTablet: number;
  cardHeightMobile: number;

  // Card content
  cardImageSize: number; // % (max-height of image inside card)
  cardInnerPadding: number; // px
  cardTextMaxWidth: number; // px (0 = none)
  centerContent: boolean;

  // Responsive
  mobileLayout: CsMobileLayout;
  mobileVisibleCards: number; // for carousel (e.g. 1.15)
  mobileColumns: number; // for grid (1..3)
};

export const DEFAULT_CS_LAYOUT: CategoryShowcaseLayout = {
  widthMode: "wide",
  maxWidthDesktop: 1440,
  maxWidthTablet: 1024,
  maxWidthMobile: 0,

  paddingDesktop: 24,
  paddingTablet: 20,
  paddingMobile: 16,

  gapDesktop: 24,
  gapTablet: 20,
  gapMobile: 16,

  cardMinWidth: 220,
  cardHeightDesktop: 440,
  cardHeightTablet: 380,
  cardHeightMobile: 320,

  cardImageSize: 70,
  cardInnerPadding: 24,
  cardTextMaxWidth: 0,
  centerContent: true,

  mobileLayout: "carousel",
  mobileVisibleCards: 1.15,
  mobileColumns: 1,
};

export const resolveCsLayout = (
  input: Partial<CategoryShowcaseLayout> | undefined | null,
): CategoryShowcaseLayout => ({
  ...DEFAULT_CS_LAYOUT,
  ...(input ?? {}),
});

const widthCss = (l: CategoryShowcaseLayout) => {
  switch (l.widthMode) {
    case "container":
      return { maxW: "1200px", inner: true };
    case "wide":
      return { maxW: `${l.maxWidthDesktop}px`, inner: true };
    case "full":
      return { maxW: "100%", inner: false };
    case "full-padded":
      return { maxW: "100%", inner: true };
    case "custom":
      return { maxW: `${l.maxWidthDesktop}px`, inner: true };
  }
};

export const buildCsScopedCss = (
  layout: CategoryShowcaseLayout,
  scopeId: string,
): string => {
  const l = layout;
  const w = widthCss(l);
  const usePad = w.inner;

  const carouselBasisDesktop = `calc((100% - (var(--cs-gap) * (${l.mobileVisibleCards} - 1))) / ${l.mobileVisibleCards})`;

  return `
#${scopeId} { --cs-gap: ${l.gapDesktop}px; }
#${scopeId} .cs-wrap {
  width: 100%;
  max-width: ${w.maxW};
  margin-left: auto;
  margin-right: auto;
  ${usePad ? `padding-left: ${l.paddingDesktop}px; padding-right: ${l.paddingDesktop}px;` : ""}
  box-sizing: border-box;
}
#${scopeId} .cs-grid {
  display: grid;
  gap: var(--cs-gap);
}
#${scopeId} .cs-tile {
  min-width: ${l.cardMinWidth}px;
  min-height: ${l.cardHeightDesktop}px;
  padding: ${l.cardInnerPadding}px;
  display: flex;
  flex-direction: column;
  ${l.centerContent ? "align-items: center; text-align: center;" : "align-items: flex-start; text-align: left;"}
}
#${scopeId} .cs-tile .cs-img-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}
#${scopeId} .cs-tile img {
  max-height: ${l.cardImageSize}%;
  max-width: 100%;
  object-fit: contain;
}
#${scopeId} .cs-tile .cs-text {
  width: 100%;
  ${l.cardTextMaxWidth > 0 ? `max-width: ${l.cardTextMaxWidth}px;` : ""}
  ${l.centerContent ? "margin-left: auto; margin-right: auto;" : ""}
}
#${scopeId} .cs-carousel {
  display: flex;
  gap: var(--cs-gap);
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
#${scopeId} .cs-carousel::-webkit-scrollbar { display: none; }
#${scopeId} .cs-carousel > * {
  flex: 0 0 auto;
  scroll-snap-align: ${l.mobileVisibleCards < 1.05 ? "center" : "start"};
}

/* Tablet */
@media (max-width: 1024px) {
  #${scopeId} { --cs-gap: ${l.gapTablet}px; }
  #${scopeId} .cs-wrap {
    max-width: ${l.widthMode === "full" ? "100%" : `${l.maxWidthTablet}px`};
    ${usePad ? `padding-left: ${l.paddingTablet}px; padding-right: ${l.paddingTablet}px;` : ""}
  }
  #${scopeId} .cs-tile { min-height: ${l.cardHeightTablet}px; }
}

/* Mobile */
@media (max-width: 640px) {
  #${scopeId} { --cs-gap: ${l.gapMobile}px; }
  #${scopeId} .cs-wrap {
    max-width: ${l.maxWidthMobile > 0 ? `${l.maxWidthMobile}px` : "100%"};
    ${usePad ? `padding-left: ${l.paddingMobile}px; padding-right: ${l.paddingMobile}px;` : ""}
  }
  #${scopeId} .cs-tile { min-height: ${l.cardHeightMobile}px; }
  #${scopeId} .cs-carousel > * {
    width: ${carouselBasisDesktop};
    scroll-snap-align: ${l.mobileVisibleCards < 1.05 ? "center" : "start"};
  }
  #${scopeId} .cs-grid.cs-grid-mobile {
    grid-template-columns: repeat(${Math.max(1, Math.min(3, l.mobileColumns))}, minmax(0, 1fr));
  }
}
`;
};
