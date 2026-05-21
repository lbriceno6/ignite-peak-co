import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Palette, Loader2, RotateCcw, Type, Upload, Trash2, Sparkles, ShieldCheck, AlertTriangle, Wand2, Sun, Moon,
} from "lucide-react";
import {
  THEME_KEYS, THEME_DEFAULTS, type ThemeKey, applyTheme, applyMode, getStoredMode,
  hexToHsl, hslToHex, getContrastRatio, wcagLevel, suggestAccessible,
  COLOR_BASE_LIST, colorKey, CONTRAST_PAIRS,
  parseCustomFonts, type CustomFont,
  THEME_PRESETS, presetToValues,
} from "@/lib/theme";

const COLOR_LABELS: Record<string, string> = {
  background: "Fondo",
  foreground: "Texto principal",
  primary: "Primario",
  primary_foreground: "Texto sobre primario",
  secondary: "Secundario",
  accent: "Acento",
  accent_foreground: "Texto sobre acento",
  accent_glow: "Acento (brillo)",
  muted: "Apagado (fondo)",
  muted_foreground: "Apagado (texto)",
  border: "Bordes",
  ring: "Anillo de foco",
};

const BUILTIN_FONTS = [
  "Inter","Roboto","Open Sans","Lato","Montserrat","Poppins","Nunito","Work Sans",
  "DM Sans","Manrope","Plus Jakarta Sans","Sora","Outfit","Figtree","Space Grotesk",
  "Oswald","Bebas Neue","Anton","Archivo Black","Playfair Display","Merriweather",
  "Lora","Cormorant","DM Serif Display","Abril Fatface","Instrument Serif","Syne","Urbanist",
];

const Section = ({ title, icon: Icon, children, action }: any) => (
  <section className="rounded-xl border bg-card p-5">
    <div className="mb-4 flex items-center gap-2">
      {Icon ? <Icon size={16} className="text-muted-foreground" /> : null}
      <h2 className="text-sm font-semibold uppercase tracking-wide">{title}</h2>
      {action ? <div className="ml-auto">{action}</div> : null}
    </div>
    {children}
  </section>
);

const ContrastBadge = ({ ratio }: { ratio: number }) => {
  const level = wcagLevel(ratio);
  const isFail = level === "Fail";
  const isLarge = level === "AA Large";
  const cls = isFail
    ? "bg-destructive/10 text-destructive border-destructive/30"
    : isLarge
      ? "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400"
      : "bg-success/10 text-success border-success/30";
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>
      {isFail ? <AlertTriangle size={10} /> : <ShieldCheck size={10} />}
      {ratio.toFixed(2)}:1 · {level}
    </span>
  );
};

const ColorRow = ({
  label, value, onChange, contrast,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  contrast?: { against: string; pairLabel: string; onAutoFix: () => void };
}) => {
  const hex = hslToHex(value);
  const ratio = contrast ? getContrastRatio(value, contrast.against) : null;
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={hex}
          onChange={(e) => {
            const hsl = hexToHsl(e.target.value);
            if (hsl) onChange(hsl);
          }}
          className="h-10 w-12 cursor-pointer rounded border bg-transparent"
          aria-label={`Selector de color para ${label}`}
        />
        <div className="min-w-0 flex-1">
          <Label className="text-xs text-muted-foreground">{label}</Label>
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="mt-1 h-8 font-mono text-xs"
            placeholder="0 0% 50%"
          />
        </div>
        <div className="h-10 w-10 shrink-0 rounded border" style={{ background: `hsl(${value})` }} />
      </div>
      {contrast && ratio !== null && (
        <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>vs {contrast.pairLabel}:</span>
          <ContrastBadge ratio={ratio} />
          {ratio < 4.5 && (
            <Button
              size="sm" variant="ghost"
              className="ml-auto h-6 gap-1 px-2 text-[11px]"
              onClick={contrast.onAutoFix}
            >
              <Wand2 size={11} /> Corregir
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default function AdminTheme() {
  const [v, setV] = useState<Record<string, string>>({ ...THEME_DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState<"light" | "dark">("light");
  const [uploadingFont, setUploadingFont] = useState(false);
  const [newFontFamily, setNewFontFamily] = useState("");

  // Load current values
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_content")
        .select("key,value")
        .in("key", THEME_KEYS as unknown as string[]);
      const map: Record<string, string> = { ...THEME_DEFAULTS };
      (data ?? []).forEach((r: any) => {
        if (r.value !== null && r.value !== undefined) map[r.key] = r.value;
      });
      setV(map);
      setLoading(false);
    })();
  }, []);

  // Live preview
  useEffect(() => {
    if (!loading) applyTheme(v as any);
  }, [v, loading]);

  // Toggle dark class on root while editing dark tokens; restore on unmount.
  useEffect(() => {
    if (loading) return;
    applyMode(editMode);
  }, [editMode, loading]);
  useEffect(() => {
    return () => { applyMode(getStoredMode()); };
  }, []);

  const set = (k: string, val: string) => setV((p) => ({ ...p, [k]: val }));

  const customFonts: CustomFont[] = useMemo(
    () => parseCustomFonts(v["theme.custom_fonts"]),
    [v["theme.custom_fonts"]],
  );

  const allFontOptions = useMemo(
    () => [
      ...customFonts.map((f) => ({ name: f.family, isCustom: true })),
      ...BUILTIN_FONTS.map((f) => ({ name: f, isCustom: false })),
    ],
    [customFonts],
  );

  const save = async () => {
    setSaving(true);
    try {
      const rows = THEME_KEYS.map((k) => ({ key: k, value: v[k] ?? THEME_DEFAULTS[k] }));
      const { error } = await supabase
        .from("site_content")
        .upsert(rows, { onConflict: "key" });
      if (error) throw error;
      toast.success("Tema guardado. Los cambios se reflejan en todo el sitio.");
    } catch (e: any) {
      toast.error(e.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const resetAll = () => {
    setV({ ...THEME_DEFAULTS });
    toast.info("Valores restaurados (no olvides guardar).");
  };

  const applyPresetById = (id: string) => {
    const p = THEME_PRESETS.find((x) => x.id === id);
    if (!p) return;
    const next = presetToValues(p);
    // Preserve uploaded custom fonts
    next["theme.custom_fonts"] = v["theme.custom_fonts"] ?? "[]";
    setV(next as Record<string, string>);
    toast.success(`Preset "${p.name}" aplicado (no olvides guardar).`);
  };

  // ----- Custom fonts -----
  const uploadFont = async (file: File) => {
    const family = newFontFamily.trim();
    if (!family) {
      toast.error("Ingresa el nombre de la familia (ej: Brand Sans)");
      return;
    }
    setUploadingFont(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "woff2";
      const formatMap: Record<string, string> = {
        woff2: "woff2", woff: "woff", ttf: "truetype", otf: "opentype",
      };
      const format = formatMap[ext] || "woff2";
      const path = `${Date.now()}-${family.replace(/\s+/g, "-")}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("brand-fonts")
        .upload(path, file, { contentType: file.type || `font/${ext}` });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("brand-fonts").getPublicUrl(path);
      const next: CustomFont[] = [
        ...customFonts,
        { family, url: pub.publicUrl, format, path },
      ];
      set("theme.custom_fonts", JSON.stringify(next));
      setNewFontFamily("");
      toast.success(`Fuente "${family}" subida.`);
    } catch (e: any) {
      toast.error(e.message || "No se pudo subir la fuente");
    } finally {
      setUploadingFont(false);
    }
  };

  const removeFont = async (f: CustomFont) => {
    if (f.path) {
      await supabase.storage.from("brand-fonts").remove([f.path]).catch(() => {});
    }
    const next = customFonts.filter((x) => x.family !== f.family || x.url !== f.url);
    set("theme.custom_fonts", JSON.stringify(next));
    toast.info(`Fuente "${f.family}" eliminada.`);
  };

  if (loading) {
    return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;
  }

  // Build contrast pair map for current mode
  const colorFields = COLOR_BASE_LIST.map((b) => {
    const key = colorKey(editMode, b);
    return { key, base: b, label: COLOR_LABELS[b] || b };
  });

  const pairFor = (base: string) => {
    const pair = CONTRAST_PAIRS.find(([a, b]) => a === base || b === base);
    if (!pair) return null;
    const [a, b] = pair;
    const other = a === base ? b : a;
    return { other, label: COLOR_LABELS[other] || other };
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Palette size={22} />
          <h1 className="font-display text-3xl">Paleta y tipografía</h1>
        </div>
        <Button variant="outline" size="sm" onClick={resetAll} className="gap-1.5">
          <RotateCcw size={14} /> Restaurar
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Aplica un preset, edita los colores con el selector o ingresa HSL
        (<code className="rounded bg-muted px-1">h s% l%</code>). Los cambios se previsualizan en vivo
        y se aplican a todo el sitio al guardar.
      </p>

      {/* Presets */}
      <Section title="Presets rápidos" icon={Sparkles}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {THEME_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPresetById(p.id)}
              className="group rounded-lg border bg-background p-3 text-left transition-smooth hover:border-accent hover:shadow-product"
            >
              <div className="mb-2 flex gap-1">
                {p.swatch.map((c, i) => (
                  <span key={i} className="h-8 flex-1 rounded" style={{ background: c }} />
                ))}
              </div>
              <div className="font-semibold">{p.name}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{p.description}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {p.fontDisplay} · {p.fontBody}
              </div>
            </button>
          ))}
        </div>
      </Section>

      {/* Colors with light/dark tabs */}
      <Section
        title="Colores"
        icon={Palette}
        action={
          <Tabs value={editMode} onValueChange={(x) => setEditMode(x as "light" | "dark")}>
            <TabsList className="h-8">
              <TabsTrigger value="light" className="gap-1 text-xs"><Sun size={12}/> Claro</TabsTrigger>
              <TabsTrigger value="dark" className="gap-1 text-xs"><Moon size={12}/> Oscuro</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {colorFields.map((f) => {
            const pair = pairFor(f.base);
            const contrast = pair
              ? {
                  against: v[colorKey(editMode, pair.other as any)] ?? THEME_DEFAULTS[colorKey(editMode, pair.other as any)],
                  pairLabel: pair.label,
                  onAutoFix: () => {
                    const fixed = suggestAccessible(
                      v[f.key] ?? THEME_DEFAULTS[f.key as ThemeKey],
                      v[colorKey(editMode, pair.other as any)] ?? THEME_DEFAULTS[colorKey(editMode, pair.other as any)],
                    );
                    set(f.key, fixed);
                    toast.success("Color ajustado para cumplir AA (4.5:1).");
                  },
                }
              : undefined;
            return (
              <ColorRow
                key={f.key}
                label={f.label}
                value={v[f.key] || THEME_DEFAULTS[f.key as ThemeKey]}
                onChange={(val) => set(f.key, val)}
                contrast={contrast}
              />
            );
          })}
        </div>
      </Section>

      {/* Typography */}
      <Section title="Tipografía" icon={Type}>
        <div className="grid gap-4 sm:grid-cols-2">
          {(["theme.font_display", "theme.font_body"] as const).map((k) => {
            const isDisplay = k === "theme.font_display";
            const current = v[k] || THEME_DEFAULTS[k];
            return (
              <div key={k}>
                <Label className="text-xs text-muted-foreground">
                  {isDisplay ? "Fuente de títulos (display)" : "Fuente del cuerpo (body)"}
                </Label>
                <Select value={current} onValueChange={(val) => set(k, val)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {allFontOptions.map((f) => (
                      <SelectItem key={f.name} value={f.name} style={{ fontFamily: `'${f.name}', sans-serif` }}>
                        {f.name}{f.isCustom ? " (personalizada)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p
                  className={isDisplay ? "mt-3 text-3xl" : "mt-3 text-sm leading-relaxed"}
                  style={{ fontFamily: `'${current}', sans-serif` }}
                >
                  {isDisplay
                    ? "Títulos de tu marca"
                    : "Este es el texto del cuerpo. Aquí verás cómo se leerán los párrafos y descripciones del sitio."}
                </p>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Custom fonts */}
      <Section title="Fuentes personalizadas" icon={Upload}>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <Label className="text-xs text-muted-foreground">Nombre de la familia</Label>
            <Input
              value={newFontFamily}
              onChange={(e) => setNewFontFamily(e.target.value)}
              placeholder="Ej: Marca Sans"
              className="mt-1"
            />
          </div>
          <div className="flex items-end">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".woff,.woff2,.ttf,.otf,font/*"
                className="sr-only"
                disabled={uploadingFont}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadFont(file);
                  e.target.value = "";
                }}
              />
              <span className="inline-flex h-10 items-center gap-2 rounded-md border bg-background px-4 text-sm font-medium hover:bg-secondary">
                {uploadingFont ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Subir fuente
              </span>
            </label>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Acepta WOFF2, WOFF, TTF u OTF. Tras subir, asígnala a títulos o cuerpo desde la lista.
        </p>

        {customFonts.length > 0 ? (
          <ul className="mt-4 divide-y rounded-lg border">
            {customFonts.map((f) => (
              <li key={f.url} className="flex flex-wrap items-center gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{f.family}</div>
                  <div
                    className="truncate text-base text-muted-foreground"
                    style={{ fontFamily: `'${f.family}', sans-serif` }}
                  >
                    The quick brown fox jumps over the lazy dog
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => set("theme.font_display", f.family)}>
                  Usar en títulos
                </Button>
                <Button size="sm" variant="outline" onClick={() => set("theme.font_body", f.family)}>
                  Usar en cuerpo
                </Button>
                <Button size="sm" variant="ghost" onClick={() => removeFont(f)} aria-label="Eliminar fuente">
                  <Trash2 size={14} />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-xs text-muted-foreground">No hay fuentes personalizadas.</p>
        )}
      </Section>

      {/* Font sizes */}
      <Section title="Tamaños de letra" icon={Type}>
        <p className="mb-3 text-xs text-muted-foreground">
          Define el tamaño base del cuerpo y de cada encabezado. Acepta unidades CSS
          (<code className="rounded bg-muted px-1">px</code>, <code className="rounded bg-muted px-1">rem</code>,
          <code className="rounded bg-muted px-1">em</code>, <code className="rounded bg-muted px-1">clamp()</code>).
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {([
            ["theme.font_size_base", "Texto base", "16px"],
            ["theme.font_size_h1", "Título H1", "3rem"],
            ["theme.font_size_h2", "Título H2", "2.25rem"],
            ["theme.font_size_h3", "Título H3", "1.75rem"],
            ["theme.font_size_h4", "Título H4", "1.375rem"],
            ["theme.font_size_h5", "Título H5", "1.125rem"],
            ["theme.font_size_h6", "Título H6", "1rem"],
            ["theme.line_height_base", "Interlineado cuerpo", "1.6"],
            ["theme.line_height_heading", "Interlineado títulos", "1.2"],
          ] as const).map(([k, label, ph]) => (
            <div key={k}>
              <Label className="text-xs text-muted-foreground">{label}</Label>
              <Input
                value={v[k] || THEME_DEFAULTS[k as ThemeKey]}
                onChange={(e) => set(k, e.target.value)}
                placeholder={ph}
                className="mt-1 font-mono text-xs"
              />
              {k.startsWith("theme.font_size_") && (
                <div
                  className="mt-2 truncate rounded border bg-background px-2 py-1"
                  style={{
                    fontSize: v[k] || THEME_DEFAULTS[k as ThemeKey],
                    fontFamily: k === "theme.font_size_base"
                      ? `'${v["theme.font_body"] || THEME_DEFAULTS["theme.font_body"]}', sans-serif`
                      : `'${v["theme.font_display"] || THEME_DEFAULTS["theme.font_display"]}', sans-serif`,
                    lineHeight: 1.1,
                  }}
                >
                  Aa
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Otros" icon={Palette}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs text-muted-foreground">Radio de bordes</Label>
            <Input
              value={v["theme.radius"] || THEME_DEFAULTS["theme.radius"]}
              onChange={(e) => set("theme.radius", e.target.value)}
              placeholder="0.5rem"
              className="mt-1"
            />
          </div>
        </div>
      </Section>

      <div className="sticky bottom-4 flex justify-end">
        <Button variant="dark" onClick={save} disabled={saving} className="shadow-elevated">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {saving ? "Guardando…" : "Guardar tema"}
        </Button>
      </div>
    </div>
  );
}
