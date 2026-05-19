import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Palette, Loader2, RotateCcw, Type } from "lucide-react";
import {
  THEME_KEYS,
  THEME_DEFAULTS,
  type ThemeKey,
  applyTheme,
  hexToHsl,
  hslToHex,
} from "@/lib/theme";

const COLOR_FIELDS: { key: ThemeKey; label: string; hint?: string }[] = [
  { key: "theme.background", label: "Fondo" },
  { key: "theme.foreground", label: "Texto principal" },
  { key: "theme.primary", label: "Primario" },
  { key: "theme.primary_foreground", label: "Texto sobre primario" },
  { key: "theme.secondary", label: "Secundario" },
  { key: "theme.accent", label: "Acento" },
  { key: "theme.accent_foreground", label: "Texto sobre acento" },
  { key: "theme.accent_glow", label: "Acento (brillo)" },
  { key: "theme.muted", label: "Apagado (fondo)" },
  { key: "theme.muted_foreground", label: "Apagado (texto)" },
  { key: "theme.border", label: "Bordes" },
  { key: "theme.ring", label: "Anillo de foco" },
];

const FONT_OPTIONS = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Nunito",
  "Work Sans",
  "DM Sans",
  "Manrope",
  "Plus Jakarta Sans",
  "Sora",
  "Outfit",
  "Figtree",
  "Space Grotesk",
  "Oswald",
  "Bebas Neue",
  "Anton",
  "Archivo Black",
  "Playfair Display",
  "Merriweather",
  "Lora",
  "Cormorant",
  "DM Serif Display",
  "Abril Fatface",
  "Instrument Serif",
  "Syne",
  "Urbanist",
];

const Section = ({ title, icon: Icon, children }: any) => (
  <section className="rounded-xl border bg-card p-5">
    <div className="mb-4 flex items-center gap-2">
      {Icon ? <Icon size={16} className="text-muted-foreground" /> : null}
      <h2 className="text-sm font-semibold uppercase tracking-wide">{title}</h2>
    </div>
    {children}
  </section>
);

const ColorRow = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => {
  const hex = hslToHex(value);
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
      <input
        type="color"
        value={hex}
        onChange={(e) => {
          const hsl = hexToHsl(e.target.value);
          if (hsl) onChange(hsl);
        }}
        className="h-10 w-12 cursor-pointer rounded border bg-transparent"
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
      <div
        className="h-10 w-10 shrink-0 rounded border"
        style={{ background: `hsl(${value})` }}
      />
    </div>
  );
};

export default function AdminTheme() {
  const [v, setV] = useState<Record<string, string>>(THEME_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_content")
        .select("key,value")
        .in("key", THEME_KEYS as unknown as string[]);
      const map: Record<string, string> = { ...THEME_DEFAULTS };
      (data ?? []).forEach((r: any) => {
        if (r.value) map[r.key] = r.value;
      });
      setV(map);
      setLoading(false);
    })();
  }, []);

  // Live preview as the user edits
  useEffect(() => {
    if (!loading) applyTheme(v as any);
  }, [v, loading]);

  const set = (k: string, val: string) => setV((p) => ({ ...p, [k]: val }));

  const save = async () => {
    setSaving(true);
    try {
      const rows = THEME_KEYS.map((k) => ({ key: k, value: v[k] ?? THEME_DEFAULTS[k] }));
      const { error } = await supabase
        .from("site_content")
        .upsert(rows, { onConflict: "key" });
      if (error) throw error;
      toast.success("Tema guardado. Los cambios se reflejan en toda la tienda.");
    } catch (e: any) {
      toast.error(e.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const resetAll = () => {
    setV({ ...THEME_DEFAULTS });
    toast.info("Valores restaurados a los predeterminados (no olvides guardar).");
  };

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
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
        Edita los colores con el selector o ingresa valores HSL directamente
        (formato: <code className="rounded bg-muted px-1">h s% l%</code>). Los cambios se previsualizan
        en vivo y se aplican a todo el sitio al guardar.
      </p>

      <Section title="Colores" icon={Palette}>
        <div className="grid gap-3 sm:grid-cols-2">
          {COLOR_FIELDS.map((f) => (
            <ColorRow
              key={f.key}
              label={f.label}
              value={v[f.key] || THEME_DEFAULTS[f.key]}
              onChange={(val) => set(f.key, val)}
            />
          ))}
        </div>
      </Section>

      <Section title="Tipografía" icon={Type}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs text-muted-foreground">Fuente de títulos (display)</Label>
            <Select
              value={v["theme.font_display"] || THEME_DEFAULTS["theme.font_display"]}
              onValueChange={(val) => set("theme.font_display", val)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {FONT_OPTIONS.map((f) => (
                  <SelectItem key={f} value={f} style={{ fontFamily: `'${f}', sans-serif` }}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p
              className="mt-3 text-3xl"
              style={{
                fontFamily: `'${v["theme.font_display"] || "Oswald"}', sans-serif`,
              }}
            >
              Títulos Nutribatidos
            </p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Fuente del cuerpo (body)</Label>
            <Select
              value={v["theme.font_body"] || THEME_DEFAULTS["theme.font_body"]}
              onValueChange={(val) => set("theme.font_body", val)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {FONT_OPTIONS.map((f) => (
                  <SelectItem key={f} value={f} style={{ fontFamily: `'${f}', sans-serif` }}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p
              className="mt-3 text-sm leading-relaxed"
              style={{
                fontFamily: `'${v["theme.font_body"] || "Inter"}', sans-serif`,
              }}
            >
              Este es el texto del cuerpo. Aquí verás cómo se leerán los párrafos, descripciones de
              producto y demás contenido del sitio.
            </p>
          </div>
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
