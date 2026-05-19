// Theme engine: tokens stored in site_content as plain key/value rows.
// Supports light + dark token sets, custom uploaded fonts, presets and
// WCAG contrast helpers.

// ---------- token keys ----------
const COLOR_BASES = [
  "background",
  "foreground",
  "primary",
  "primary_foreground",
  "secondary",
  "accent",
  "accent_foreground",
  "accent_glow",
  "muted",
  "muted_foreground",
  "border",
  "ring",
] as const;
type ColorBase = (typeof COLOR_BASES)[number];

const lightKey = (b: ColorBase) => `theme.${b}` as const;
const darkKey = (b: ColorBase) => `theme.dark.${b}` as const;

export const THEME_KEYS = [
  ...COLOR_BASES.map(lightKey),
  ...COLOR_BASES.map(darkKey),
  "theme.radius",
  "theme.font_display",
  "theme.font_body",
  "theme.custom_fonts", // JSON array
] as const;
export type ThemeKey = (typeof THEME_KEYS)[number];

// Defaults mirror src/index.css :root and .dark
const LIGHT_DEFAULTS: Record<ColorBase, string> = {
  background: "0 0% 100%",
  foreground: "0 0% 8%",
  primary: "0 0% 8%",
  primary_foreground: "0 0% 100%",
  secondary: "0 0% 96%",
  accent: "88 95% 50%",
  accent_foreground: "0 0% 8%",
  accent_glow: "88 100% 60%",
  muted: "0 0% 96%",
  muted_foreground: "0 0% 40%",
  border: "0 0% 90%",
  ring: "88 95% 50%",
};
const DARK_DEFAULTS: Record<ColorBase, string> = {
  background: "0 0% 6%",
  foreground: "0 0% 98%",
  primary: "0 0% 98%",
  primary_foreground: "0 0% 8%",
  secondary: "0 0% 14%",
  accent: "88 95% 50%",
  accent_foreground: "0 0% 8%",
  accent_glow: "88 100% 60%",
  muted: "0 0% 14%",
  muted_foreground: "0 0% 65%",
  border: "0 0% 18%",
  ring: "88 95% 50%",
};

export const THEME_DEFAULTS: Record<ThemeKey, string> = {
  ...(Object.fromEntries(COLOR_BASES.map((b) => [lightKey(b), LIGHT_DEFAULTS[b]])) as Record<string, string>),
  ...(Object.fromEntries(COLOR_BASES.map((b) => [darkKey(b), DARK_DEFAULTS[b]])) as Record<string, string>),
  "theme.radius": "0.5rem",
  "theme.font_display": "Oswald",
  "theme.font_body": "Inter",
  "theme.custom_fonts": "[]",
} as Record<ThemeKey, string>;

const CSS_VAR_MAP: Record<ColorBase, string> = {
  background: "--background",
  foreground: "--foreground",
  primary: "--primary",
  primary_foreground: "--primary-foreground",
  secondary: "--secondary",
  accent: "--accent",
  accent_foreground: "--accent-foreground",
  accent_glow: "--accent-glow",
  muted: "--muted",
  muted_foreground: "--muted-foreground",
  border: "--border",
  ring: "--ring",
};

export const COLOR_BASE_LIST = COLOR_BASES;
export const colorKey = (mode: "light" | "dark", b: ColorBase) =>
  (mode === "dark" ? darkKey(b) : lightKey(b));

// ---------- color conversions ----------
export const hexToHsl = (hex: string): string | null => {
  const m = hex.trim().replace("#", "");
  if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(m)) return null;
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const parseHsl = (hsl: string): { h: number; s: number; l: number } | null => {
  const m = hsl.trim().match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!m) return null;
  return { h: parseFloat(m[1]), s: parseFloat(m[2]), l: parseFloat(m[3]) };
};

const hslToRgb = (h: number, s: number, l: number) => {
  s /= 100; l /= 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const hh = h / 360;
  if (s === 0) return { r: l, g: l, b: l };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: hue2rgb(p, q, hh + 1 / 3),
    g: hue2rgb(p, q, hh),
    b: hue2rgb(p, q, hh - 1 / 3),
  };
};

export const hslToHex = (hsl: string): string => {
  const p = parseHsl(hsl);
  if (!p) return "#000000";
  const { r, g, b } = hslToRgb(p.h, p.s, p.l);
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// ---------- WCAG contrast ----------
const relLum = (hsl: string) => {
  const p = parseHsl(hsl); if (!p) return 0;
  const { r, g, b } = hslToRgb(p.h, p.s, p.l);
  const ch = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
};

export const getContrastRatio = (a: string, b: string) => {
  const la = relLum(a), lb = relLum(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
};

export type WcagLevel = "AAA" | "AA" | "AA Large" | "Fail";
export const wcagLevel = (ratio: number): WcagLevel => {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA Large";
  return "Fail";
};

// Adjust the lightness of `target` until it reaches AA against `against`.
export const suggestAccessible = (target: string, against: string, minRatio = 4.5): string => {
  const p = parseHsl(target); if (!p) return target;
  const againstLum = relLum(against);
  // Try darkening, then lightening — pick whichever reaches minRatio first.
  const tryDir = (step: number) => {
    let { l } = p; const limit = step > 0 ? 100 : 0;
    while ((step > 0 ? l < limit : l > limit)) {
      l = Math.max(0, Math.min(100, l + step));
      const candidate = `${Math.round(p.h)} ${Math.round(p.s)}% ${Math.round(l)}%`;
      if (getContrastRatio(candidate, against) >= minRatio) return candidate;
    }
    return null;
  };
  const goDark = againstLum > 0.5;
  return tryDir(goDark ? -2 : 2) ?? tryDir(goDark ? 2 : -2) ?? target;
};

export const CONTRAST_PAIRS: [ColorBase, ColorBase][] = [
  ["foreground", "background"],
  ["primary_foreground", "primary"],
  ["accent_foreground", "accent"],
  ["muted_foreground", "muted"],
];

// ---------- custom fonts ----------
export type CustomFont = { family: string; url: string; format?: string; path?: string };
export const parseCustomFonts = (raw?: string): CustomFont[] => {
  if (!raw) return [];
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v : []; } catch { return []; }
};

// ---------- DOM application ----------
const STYLE_ID = "lovable-theme-overrides";
const FONT_LINK_ID = "lovable-theme-google-fonts";
const FONT_FACE_ID = "lovable-theme-custom-fonts";

const GOOGLE_FONTS_AVAILABLE = new Set([
  "Inter","Roboto","Open Sans","Lato","Montserrat","Poppins","Nunito","Work Sans",
  "DM Sans","Manrope","Plus Jakarta Sans","Sora","Outfit","Figtree","Space Grotesk",
  "Oswald","Bebas Neue","Anton","Archivo Black","Playfair Display","Merriweather",
  "Lora","Cormorant","DM Serif Display","Abril Fatface","Instrument Serif","Syne","Urbanist",
]);

const googleFontHref = (families: string[]) => {
  const unique = Array.from(new Set(families.filter((f) => GOOGLE_FONTS_AVAILABLE.has(f))));
  if (unique.length === 0) return "";
  const params = unique
    .map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700;800`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
};

export const applyTheme = (map: Partial<Record<ThemeKey, string>>) => {
  if (typeof document === "undefined") return;

  // Build :root + .dark CSS using vars from map (or defaults)
  const get = (k: ThemeKey) => map[k] ?? THEME_DEFAULTS[k];
  const lightDecls = COLOR_BASES
    .map((b) => `${CSS_VAR_MAP[b]}: ${get(lightKey(b))};`)
    .join("\n");
  const darkDecls = COLOR_BASES
    .map((b) => `${CSS_VAR_MAP[b]}: ${get(darkKey(b))};`)
    .join("\n");
  const radius = get("theme.radius");
  const fontDisplay = get("theme.font_display");
  const fontBody = get("theme.font_body");

  // Custom @font-face block
  const customs = parseCustomFonts(get("theme.custom_fonts"));
  const fontFaces = customs
    .map(
      (f) =>
        `@font-face{font-family:'${f.family}';src:url('${f.url}')${
          f.format ? ` format('${f.format}')` : ""
        };font-display:swap;}`,
    )
    .join("\n");

  // Google Fonts link
  let link = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  link.href = googleFontHref([fontDisplay, fontBody]);

  // Custom @font-face style
  let face = document.getElementById(FONT_FACE_ID) as HTMLStyleElement | null;
  if (!face) {
    face = document.createElement("style");
    face.id = FONT_FACE_ID;
    document.head.appendChild(face);
  }
  face.textContent = fontFaces;

  // Variable overrides + font-family overrides
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = `
:root{
${lightDecls}
--radius: ${radius};
}
.dark{
${darkDecls}
}
html, body, .font-sans { font-family: '${fontBody}', system-ui, sans-serif; }
.font-display { font-family: '${fontDisplay}', Impact, sans-serif; }
`;
};

// ---------- light/dark mode preference ----------
const MODE_KEY = "lovable-theme-mode";
export type Mode = "light" | "dark" | "system";

export const getStoredMode = (): Mode => {
  if (typeof window === "undefined") return "light";
  return (localStorage.getItem(MODE_KEY) as Mode) || "light";
};
export const setStoredMode = (m: Mode) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(MODE_KEY, m);
};

export const applyMode = (mode: Mode) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const resolved =
    mode === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : mode;
  root.classList.toggle("dark", resolved === "dark");
};

// ---------- presets ----------
export type ThemePreset = {
  id: string;
  name: string;
  description?: string;
  swatch: string[]; // hex preview swatches
  fontDisplay: string;
  fontBody: string;
  radius?: string;
  light: Record<ColorBase, string>;
  dark: Record<ColorBase, string>;
};

const mkPreset = (
  id: string,
  name: string,
  description: string,
  swatch: string[],
  fontDisplay: string,
  fontBody: string,
  light: Partial<Record<ColorBase, string>>,
  dark?: Partial<Record<ColorBase, string>>,
  radius = "0.5rem",
): ThemePreset => ({
  id,
  name,
  description,
  swatch,
  fontDisplay,
  fontBody,
  radius,
  light: { ...LIGHT_DEFAULTS, ...light },
  dark: { ...DARK_DEFAULTS, ...(dark ?? {}) },
});

export const THEME_PRESETS: ThemePreset[] = [
  mkPreset(
    "nutribatidos",
    "Nutribatidos",
    "Verde lima sobre negro — el look por defecto.",
    ["#0a0a0a", "#c4f51e", "#ffffff", "#f5f5f5"],
    "Oswald",
    "Inter",
    {},
    {},
  ),
  mkPreset(
    "premium-noir",
    "Premium Negro",
    "Negro elegante con acento dorado, tipografía editorial.",
    ["#0d0d0d", "#1a1a1a", "#c9a84c", "#f0d78c"],
    "Cormorant",
    "Inter",
    {
      background: "0 0% 98%",
      foreground: "0 0% 8%",
      primary: "0 0% 8%",
      primary_foreground: "0 0% 100%",
      secondary: "40 30% 96%",
      accent: "42 55% 54%",
      accent_foreground: "0 0% 10%",
      accent_glow: "42 70% 65%",
      muted: "40 20% 95%",
      muted_foreground: "0 0% 38%",
      border: "40 15% 88%",
      ring: "42 55% 54%",
    },
    {
      background: "0 0% 5%",
      foreground: "40 20% 96%",
      primary: "40 20% 96%",
      primary_foreground: "0 0% 8%",
      secondary: "0 0% 12%",
      accent: "42 55% 54%",
      accent_foreground: "0 0% 10%",
      muted: "0 0% 12%",
      muted_foreground: "40 10% 70%",
      border: "0 0% 18%",
      ring: "42 55% 54%",
    },
  ),
  mkPreset(
    "deportivo-azul",
    "Deportivo Azul",
    "Azul eléctrico sobre blanco para marcas atléticas.",
    ["#0c2340", "#1a4a6e", "#2d8a9e", "#f5f7fa"],
    "Oswald",
    "Inter",
    {
      background: "0 0% 100%",
      foreground: "215 60% 12%",
      primary: "215 60% 18%",
      primary_foreground: "0 0% 100%",
      secondary: "210 30% 96%",
      accent: "210 95% 50%",
      accent_foreground: "0 0% 100%",
      accent_glow: "210 100% 62%",
      muted: "210 25% 95%",
      muted_foreground: "215 20% 40%",
      border: "210 20% 88%",
      ring: "210 95% 50%",
    },
    {
      background: "215 50% 8%",
      foreground: "210 30% 96%",
      primary: "210 30% 96%",
      primary_foreground: "215 60% 12%",
      secondary: "215 40% 14%",
      accent: "210 95% 55%",
      accent_foreground: "0 0% 100%",
      muted: "215 40% 14%",
      muted_foreground: "210 20% 70%",
      border: "215 30% 22%",
      ring: "210 95% 55%",
    },
  ),
  mkPreset(
    "energia-naranja",
    "Energía Naranja",
    "Naranja vibrante sobre carbón, alto impacto.",
    ["#1a1a1a", "#ff6b1a", "#ffb347", "#fff5e0"],
    "Bebas Neue",
    "Work Sans",
    {
      background: "30 40% 99%",
      foreground: "20 20% 10%",
      primary: "20 20% 12%",
      primary_foreground: "0 0% 100%",
      secondary: "30 40% 96%",
      accent: "22 100% 55%",
      accent_foreground: "0 0% 100%",
      accent_glow: "30 100% 62%",
      muted: "30 30% 95%",
      muted_foreground: "20 15% 38%",
      border: "30 25% 88%",
      ring: "22 100% 55%",
    },
    {
      background: "20 15% 8%",
      foreground: "30 30% 96%",
      primary: "30 30% 96%",
      primary_foreground: "20 15% 8%",
      secondary: "20 15% 14%",
      accent: "22 100% 58%",
      accent_foreground: "0 0% 100%",
      muted: "20 15% 14%",
      muted_foreground: "30 15% 70%",
      border: "20 15% 22%",
      ring: "22 100% 58%",
    },
  ),
  mkPreset(
    "wellness-verde",
    "Wellness Verde",
    "Sage y crema, sereno y orgánico.",
    ["#f5f0e8", "#dce5d4", "#a8c0a0", "#4a6741"],
    "Playfair Display",
    "Lora",
    {
      background: "40 30% 97%",
      foreground: "100 15% 12%",
      primary: "100 20% 22%",
      primary_foreground: "40 30% 97%",
      secondary: "90 20% 92%",
      accent: "100 25% 45%",
      accent_foreground: "40 30% 97%",
      accent_glow: "100 30% 58%",
      muted: "90 15% 92%",
      muted_foreground: "100 10% 38%",
      border: "90 15% 85%",
      ring: "100 25% 45%",
    },
    {
      background: "100 15% 8%",
      foreground: "90 20% 94%",
      primary: "90 20% 94%",
      primary_foreground: "100 15% 8%",
      secondary: "100 15% 14%",
      accent: "100 35% 55%",
      accent_foreground: "100 15% 8%",
      muted: "100 15% 14%",
      muted_foreground: "90 15% 70%",
      border: "100 15% 22%",
      ring: "100 35% 55%",
    },
  ),
  mkPreset(
    "minimal-claro",
    "Minimal Claro",
    "Blanco y negro puro, tipografía geométrica.",
    ["#ffffff", "#0a0a0a", "#737373", "#f5f5f5"],
    "Space Grotesk",
    "DM Sans",
    {
      background: "0 0% 100%",
      foreground: "0 0% 6%",
      primary: "0 0% 6%",
      primary_foreground: "0 0% 100%",
      secondary: "0 0% 96%",
      accent: "0 0% 10%",
      accent_foreground: "0 0% 100%",
      accent_glow: "0 0% 20%",
      muted: "0 0% 96%",
      muted_foreground: "0 0% 40%",
      border: "0 0% 90%",
      ring: "0 0% 20%",
    },
    {
      background: "0 0% 4%",
      foreground: "0 0% 98%",
      primary: "0 0% 98%",
      primary_foreground: "0 0% 6%",
      secondary: "0 0% 12%",
      accent: "0 0% 90%",
      accent_foreground: "0 0% 6%",
      muted: "0 0% 12%",
      muted_foreground: "0 0% 65%",
      border: "0 0% 18%",
      ring: "0 0% 80%",
    },
    "0.25rem",
  ),
];

export const presetToValues = (p: ThemePreset): Record<ThemeKey, string> => {
  const out: Record<string, string> = { ...THEME_DEFAULTS };
  COLOR_BASES.forEach((b) => {
    out[lightKey(b)] = p.light[b];
    out[darkKey(b)] = p.dark[b];
  });
  out["theme.font_display"] = p.fontDisplay;
  out["theme.font_body"] = p.fontBody;
  out["theme.radius"] = p.radius ?? "0.5rem";
  return out as Record<ThemeKey, string>;
};
