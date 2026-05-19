// Theme tokens managed from the admin panel.
// Stored in site_content as plain key/value rows.

export const THEME_KEYS = [
  "theme.background",
  "theme.foreground",
  "theme.primary",
  "theme.primary_foreground",
  "theme.secondary",
  "theme.accent",
  "theme.accent_foreground",
  "theme.accent_glow",
  "theme.muted",
  "theme.muted_foreground",
  "theme.border",
  "theme.ring",
  "theme.radius",
  "theme.font_display",
  "theme.font_body",
] as const;

export type ThemeKey = (typeof THEME_KEYS)[number];

// Defaults match src/index.css
export const THEME_DEFAULTS: Record<ThemeKey, string> = {
  "theme.background": "0 0% 100%",
  "theme.foreground": "0 0% 8%",
  "theme.primary": "0 0% 8%",
  "theme.primary_foreground": "0 0% 100%",
  "theme.secondary": "0 0% 96%",
  "theme.accent": "88 95% 50%",
  "theme.accent_foreground": "0 0% 8%",
  "theme.accent_glow": "88 100% 60%",
  "theme.muted": "0 0% 96%",
  "theme.muted_foreground": "0 0% 40%",
  "theme.border": "0 0% 90%",
  "theme.ring": "88 95% 50%",
  "theme.radius": "0.5rem",
  "theme.font_display": "Oswald",
  "theme.font_body": "Inter",
};

const CSS_VAR_MAP: Partial<Record<ThemeKey, string>> = {
  "theme.background": "--background",
  "theme.foreground": "--foreground",
  "theme.primary": "--primary",
  "theme.primary_foreground": "--primary-foreground",
  "theme.secondary": "--secondary",
  "theme.accent": "--accent",
  "theme.accent_foreground": "--accent-foreground",
  "theme.accent_glow": "--accent-glow",
  "theme.muted": "--muted",
  "theme.muted_foreground": "--muted-foreground",
  "theme.border": "--border",
  "theme.ring": "--ring",
  "theme.radius": "--radius",
};

// ---------- color conversion ----------
export const hexToHsl = (hex: string): string | null => {
  const m = hex.trim().replace("#", "");
  if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(m)) return null;
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
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

export const hslToHex = (hsl: string): string => {
  const m = hsl.trim().match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!m) return "#000000";
  const h = parseFloat(m[1]) / 360;
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// ---------- DOM application ----------
const STYLE_ID = "lovable-theme-overrides";
const FONT_LINK_ID = "lovable-theme-fonts";

const googleFontHref = (families: string[]) => {
  const unique = Array.from(new Set(families.filter(Boolean)));
  if (unique.length === 0) return "";
  const params = unique
    .map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700;800`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
};

export const applyTheme = (map: Partial<Record<ThemeKey, string>>) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  (Object.keys(CSS_VAR_MAP) as ThemeKey[]).forEach((k) => {
    const cssVar = CSS_VAR_MAP[k];
    const value = map[k] ?? THEME_DEFAULTS[k];
    if (cssVar && value) root.style.setProperty(cssVar, value);
  });

  const fontDisplay = map["theme.font_display"] || THEME_DEFAULTS["theme.font_display"];
  const fontBody = map["theme.font_body"] || THEME_DEFAULTS["theme.font_body"];

  // Inject Google Fonts link
  let link = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  link.href = googleFontHref([fontDisplay, fontBody]);

  // Override Tailwind font-family classes
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = `
    html, body, .font-sans { font-family: '${fontBody}', system-ui, sans-serif; }
    .font-display { font-family: '${fontDisplay}', Impact, sans-serif; }
  `;
};
