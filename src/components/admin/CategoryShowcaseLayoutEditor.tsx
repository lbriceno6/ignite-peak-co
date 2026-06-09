import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildCsScopedCss,
  resolveCsLayout,
  type CategoryShowcaseLayout,
  type CsMobileLayout,
  type CsWidthMode,
} from "@/lib/categoryShowcaseLayout";

type Props = {
  value: Partial<CategoryShowcaseLayout> | undefined;
  onChange: (next: Partial<CategoryShowcaseLayout>) => void;
};

const WIDTH_OPTIONS: { value: CsWidthMode; label: string }[] = [
  { value: "container", label: "Contenedor" },
  { value: "wide", label: "Ancho amplio" },
  { value: "full", label: "Full width" },
  { value: "full-padded", label: "Full width con padding" },
  { value: "custom", label: "Personalizado" },
];

const PREVIEW_SIZES = {
  desktop: 1200,
  tablet: 800,
  mobile: 390,
} as const;

export function CategoryShowcaseLayoutEditor({ value, onChange }: Props) {
  const layout = useMemo(() => resolveCsLayout(value), [value]);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  const update = (patch: Partial<CategoryShowcaseLayout>) =>
    onChange({ ...layout, ...patch });

  const num = (
    key: keyof CategoryShowcaseLayout,
    min = 0,
    max = 4000,
    step = 1,
  ) => (
    <Input
      type="number"
      min={min}
      max={max}
      step={step}
      className="min-w-0"
      value={Number(layout[key] as number)}
      onChange={(e) =>
        update({
          [key]: Math.max(min, Math.min(max, Number(e.target.value) || 0)),
        } as any)
      }
    />
  );

  // Preview CSS
  const previewId = "cs-preview-scope";
  const previewCss = useMemo(
    () => buildCsScopedCss(layout, previewId),
    [layout],
  );

  const tilesCount = 4;
  const tiles = Array.from({ length: tilesCount });
  const isMobilePreview = device === "mobile";
  const useCarousel = isMobilePreview && layout.mobileLayout === "carousel";
  const gridCols =
    isMobilePreview
      ? layout.mobileLayout === "grid"
        ? Math.max(1, Math.min(3, layout.mobileColumns))
        : 1
      : device === "tablet"
        ? 2
        : 4;

  return (
    <div className="w-full max-w-full min-w-0 space-y-4 rounded-md border bg-muted/30 p-3 overflow-hidden">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tamaño y ancho de la sección
        </p>
      </div>

      {/* Width */}
      <div className="grid gap-3 sm:[grid-template-columns:repeat(2,minmax(0,1fr))]">
        <div className="min-w-0">
          <Label className="text-xs">Ancho de sección</Label>
          <Select
            value={layout.widthMode}
            onValueChange={(v) => update({ widthMode: v as CsWidthMode })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WIDTH_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0">
          <Label className="text-xs">Layout móvil</Label>
          <Select
            value={layout.mobileLayout}
            onValueChange={(v) =>
              update({ mobileLayout: v as CsMobileLayout })
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="carousel">Carrusel</SelectItem>
              <SelectItem value="grid">Grilla</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Max width */}
      <div>
        <p className="text-xs font-semibold mb-1">Max-width</p>
        <div className="grid gap-2 sm:[grid-template-columns:repeat(3,minmax(0,1fr))]">
          <div className="min-w-0">
            <Label className="text-xs text-muted-foreground">Desktop (px)</Label>
            {num("maxWidthDesktop", 320, 2400)}
          </div>
          <div className="min-w-0">
            <Label className="text-xs text-muted-foreground">Tablet (px)</Label>
            {num("maxWidthTablet", 320, 2000)}
          </div>
          <div className="min-w-0">
            <Label className="text-xs text-muted-foreground">Mobile (px, 0 = auto)</Label>
            {num("maxWidthMobile", 0, 1200)}
          </div>
        </div>
      </div>

      {/* Padding */}
      <div>
        <p className="text-xs font-semibold mb-1">Padding lateral</p>
        <div className="grid gap-2 sm:[grid-template-columns:repeat(3,minmax(0,1fr))]">
          <div className="min-w-0">
            <Label className="text-xs text-muted-foreground">Desktop (px)</Label>
            {num("paddingDesktop", 0, 200)}
          </div>
          <div className="min-w-0">
            <Label className="text-xs text-muted-foreground">Tablet (px)</Label>
            {num("paddingTablet", 0, 200)}
          </div>
          <div className="min-w-0">
            <Label className="text-xs text-muted-foreground">Mobile (px)</Label>
            {num("paddingMobile", 0, 100)}
          </div>
        </div>
      </div>

      {/* Gap */}
      <div>
        <p className="text-xs font-semibold mb-1">Espaciado entre tarjetas</p>
        <div className="grid gap-2 sm:[grid-template-columns:repeat(3,minmax(0,1fr))]">
          <div className="min-w-0">
            <Label className="text-xs text-muted-foreground">Desktop (px)</Label>
            {num("gapDesktop", 0, 100)}
          </div>
          <div className="min-w-0">
            <Label className="text-xs text-muted-foreground">Tablet (px)</Label>
            {num("gapTablet", 0, 100)}
          </div>
          <div className="min-w-0">
            <Label className="text-xs text-muted-foreground">Mobile (px)</Label>
            {num("gapMobile", 0, 100)}
          </div>
        </div>
      </div>

      {/* Card size */}
      <div>
        <p className="text-xs font-semibold mb-1">Tamaño de tarjetas</p>
        <div className="grid gap-2 sm:[grid-template-columns:repeat(2,minmax(0,1fr))] lg:[grid-template-columns:repeat(4,minmax(0,1fr))]">
          <div className="min-w-0">
            <Label className="text-xs text-muted-foreground">Ancho mín. (px)</Label>
            {num("cardMinWidth", 120, 600)}
          </div>
          <div className="min-w-0">
            <Label className="text-xs text-muted-foreground">Alto desktop (px)</Label>
            {num("cardHeightDesktop", 200, 900)}
          </div>
          <div className="min-w-0">
            <Label className="text-xs text-muted-foreground">Alto tablet (px)</Label>
            {num("cardHeightTablet", 180, 800)}
          </div>
          <div className="min-w-0">
            <Label className="text-xs text-muted-foreground">Alto mobile (px)</Label>
            {num("cardHeightMobile", 160, 700)}
          </div>
        </div>
      </div>

      {/* Card content */}
      <div>
        <p className="text-xs font-semibold mb-1">Contenido de la tarjeta</p>
        <div className="grid gap-2 sm:[grid-template-columns:repeat(2,minmax(0,1fr))] lg:[grid-template-columns:repeat(4,minmax(0,1fr))]">
          <div className="min-w-0">
            <Label className="text-xs text-muted-foreground">Tamaño imagen (%)</Label>
            {num("cardImageSize", 20, 100)}
          </div>
          <div className="min-w-0">
            <Label className="text-xs text-muted-foreground">Padding interno (px)</Label>
            {num("cardInnerPadding", 0, 80)}
          </div>
          <div className="min-w-0">
            <Label className="text-xs text-muted-foreground">Ancho máx. texto (px, 0=auto)</Label>
            {num("cardTextMaxWidth", 0, 600)}
          </div>
          <div className="flex items-end gap-2 min-w-0">
            <Switch
              checked={layout.centerContent}
              onCheckedChange={(v) => update({ centerContent: v })}
            />
            <span className="text-sm">Centrar contenido</span>
          </div>
        </div>
      </div>

      {/* Mobile responsive */}
      <div>
        <p className="text-xs font-semibold mb-1">Responsive móvil</p>
        <div className="grid gap-2 sm:[grid-template-columns:repeat(2,minmax(0,1fr))]">
          {layout.mobileLayout === "carousel" ? (
            <div className="min-w-0">
              <Label className="text-xs text-muted-foreground">
                Tarjetas visibles (ej. 1.15)
              </Label>
              <Input
                type="number"
                min={1}
                max={3}
                step={0.05}
                className="min-w-0"
                value={layout.mobileVisibleCards}
                onChange={(e) =>
                  update({
                    mobileVisibleCards: Math.max(
                      1,
                      Math.min(3, Number(e.target.value) || 1),
                    ),
                  })
                }
              />
            </div>
          ) : (
            <div className="min-w-0">
              <Label className="text-xs text-muted-foreground">Columnas mobile</Label>
              <Select
                value={String(layout.mobileColumns)}
                onValueChange={(v) =>
                  update({ mobileColumns: Math.max(1, Math.min(3, Number(v))) })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-md border bg-background p-3 w-full max-w-full min-w-0 overflow-hidden">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <p className="text-xs font-semibold uppercase tracking-wide">Vista previa</p>
          <div className="flex gap-1">
            {(["desktop", "tablet", "mobile"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDevice(d)}
                className={`h-7 rounded-md border px-2 text-xs transition ${device === d ? "border-accent bg-accent text-accent-foreground" : "bg-background hover:border-foreground/40"}`}
              >
                {d === "desktop" ? "Desktop" : d === "tablet" ? "Tablet" : "Mobile"}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full max-w-full min-w-0 overflow-hidden">
          <style dangerouslySetInnerHTML={{ __html: previewCss }} />
          <div
            className="mx-auto rounded border bg-muted/20 transition-all"
            style={{
              width: "100%",
              maxWidth: PREVIEW_SIZES[device],
            }}
          >
            <div id={previewId}>
              <div className="cs-wrap py-4">
                {useCarousel ? (
                  <div className="cs-carousel">
                    {tiles.map((_, i) => (
                      <div
                        key={i}
                        className="cs-tile rounded-2xl text-white"
                        style={{
                          background:
                            "linear-gradient(160deg,#8F87F1,#746AE8)",
                        }}
                      >
                        <div className="cs-img-wrap">
                          <div className="rounded bg-white/20 w-1/2 h-full" />
                        </div>
                        <div className="cs-text font-bold text-sm">
                          Categoría {i + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className="cs-grid cs-grid-mobile"
                    style={{
                      gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
                    }}
                  >
                    {tiles.map((_, i) => (
                      <div
                        key={i}
                        className="cs-tile rounded-2xl text-white"
                        style={{
                          background:
                            "linear-gradient(160deg,#8F87F1,#746AE8)",
                        }}
                      >
                        <div className="cs-img-wrap">
                          <div className="rounded bg-white/20 w-1/2 h-full" />
                        </div>
                        <div className="cs-text font-bold text-sm">
                          Categoría {i + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
