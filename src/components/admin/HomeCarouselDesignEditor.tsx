import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  type CarouselBackgroundCfg,
  type CarouselLayoutCfg,
  PRESETS,
  type PresetKey,
} from "@/lib/homeCarouselDesign";
import { HomeCarouselPreview } from "./HomeCarouselPreview";

type Device = "desktop" | "tablet" | "mobile";

function Num({ label, value, onChange, step = 1, min = 0 }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        step={step}
        min={min}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  );
}

export function HomeCarouselDesignEditor({
  scope,
  layout,
  background,
  onLayoutChange,
  onBackgroundChange,
  useGlobalLayout,
  useGlobalBackground,
  onToggleUseGlobalLayout,
  onToggleUseGlobalBackground,
}: {
  scope: "global" | "block";
  layout: CarouselLayoutCfg;
  background: CarouselBackgroundCfg;
  onLayoutChange: (next: CarouselLayoutCfg) => void;
  onBackgroundChange: (next: CarouselBackgroundCfg) => void;
  useGlobalLayout?: boolean;
  useGlobalBackground?: boolean;
  onToggleUseGlobalLayout?: (v: boolean) => void;
  onToggleUseGlobalBackground?: (v: boolean) => void;
}) {
  const [device, setDevice] = useState<Device>("desktop");
  const setL = (patch: Partial<CarouselLayoutCfg>) => onLayoutChange({ ...layout, ...patch });
  const setB = (patch: Partial<CarouselBackgroundCfg>) => onBackgroundChange({ ...background, ...patch });

  const applyPreset = (key: PresetKey) => {
    const p = PRESETS[key];
    if (p.layout) onLayoutChange({ ...layout, ...p.layout });
    if (p.background) onBackgroundChange({ ...background, ...p.background });
  };

  const layoutDisabled = scope === "block" && useGlobalLayout !== false;
  const bgDisabled = scope === "block" && useGlobalBackground !== false;

  const previewDesign = useMemo(() => ({ layout, background }), [layout, background]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Presets</span>
        {(Object.keys(PRESETS) as PresetKey[]).map((k) => (
          <Button key={k} type="button" variant="outline" size="sm" onClick={() => applyPreset(k)}>
            {PRESETS[k].label}
          </Button>
        ))}
      </div>

      {scope === "block" && (
        <div className="grid gap-2 sm:grid-cols-2 rounded-md border bg-muted/30 p-3">
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>Usar configuración global (layout)</span>
            <Switch checked={useGlobalLayout !== false} onCheckedChange={(v) => onToggleUseGlobalLayout?.(v)} />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>Usar fondo global</span>
            <Switch checked={useGlobalBackground !== false} onCheckedChange={(v) => onToggleUseGlobalBackground?.(v)} />
          </label>
        </div>
      )}

      <Accordion type="multiple" defaultValue={["size", "items", "card", "image", "controls", "bg", "preview"]}>
        <AccordionItem value="size">
          <AccordionTrigger className="text-sm" disabled={layoutDisabled}>1. Tamaño y ancho</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Ancho de sección</Label>
                <Select value={layout.widthPreset} onValueChange={(v: any) => setL({ widthPreset: v })} disabled={layoutDisabled}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="container">Contenedor normal</SelectItem>
                    <SelectItem value="wide">Ancho amplio</SelectItem>
                    <SelectItem value="full">Pantalla completa</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Num label="Max-width desktop (px, 0=100%)" value={layout.maxWidthDesktop} onChange={(v) => setL({ maxWidthDesktop: v })} />
              <Num label="Max-width tablet (px, 0=100%)" value={layout.maxWidthTablet} onChange={(v) => setL({ maxWidthTablet: v })} />
              <Num label="Max-width mobile (px, 0=100%)" value={layout.maxWidthMobile} onChange={(v) => setL({ maxWidthMobile: v })} />
              <Num label="Padding lateral desktop" value={layout.padDesktop} onChange={(v) => setL({ padDesktop: v })} />
              <Num label="Padding lateral tablet" value={layout.padTablet} onChange={(v) => setL({ padTablet: v })} />
              <Num label="Padding lateral mobile" value={layout.padMobile} onChange={(v) => setL({ padMobile: v })} />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="items">
          <AccordionTrigger className="text-sm" disabled={layoutDisabled}>2. Productos visibles y separación</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-3 sm:grid-cols-3">
              <Num label="Productos desktop" value={layout.itemsDesktop} step={0.1} onChange={(v) => setL({ itemsDesktop: v })} />
              <Num label="Productos tablet" value={layout.itemsTablet} step={0.1} onChange={(v) => setL({ itemsTablet: v })} />
              <Num label="Productos mobile" value={layout.itemsMobile} step={0.1} onChange={(v) => setL({ itemsMobile: v })} />
              <Num label="Gap desktop (px)" value={layout.gapDesktop} onChange={(v) => setL({ gapDesktop: v })} />
              <Num label="Gap tablet (px)" value={layout.gapTablet} onChange={(v) => setL({ gapTablet: v })} />
              <Num label="Gap mobile (px)" value={layout.gapMobile} onChange={(v) => setL({ gapMobile: v })} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 border-t pt-4">
              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold">Alineación mobile del carrusel</Label>
                <Select value={layout.mobileAlign} onValueChange={(v: any) => setL({ mobileAlign: v })} disabled={layoutDisabled}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left-preview">Izquierda con preview del siguiente producto</SelectItem>
                    <SelectItem value="center">Centrado</SelectItem>
                    <SelectItem value="full">Pantalla completa</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Controla cómo se ve la primera card en mobile: con preview lateral, centrada o sin padding lateral.
                </p>
              </div>
              <label className="sm:col-span-2 flex items-center justify-between gap-3 text-sm rounded-md border bg-muted/30 p-3">
                <span>
                  Centrar card principal en mobile
                  <span className="block text-[11px] text-muted-foreground">Aplica snap-align center y centra la card horizontalmente.</span>
                </span>
                <Switch checked={layout.centerMobileCard} onCheckedChange={(v) => setL({ centerMobileCard: v })} disabled={layoutDisabled} />
              </label>
            </div>
          </AccordionContent>
        </AccordionItem>


        <AccordionItem value="card">
          <AccordionTrigger className="text-sm" disabled={layoutDisabled}>3. Tamaño de cards</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <Num label="Alto mínimo card (px, 0=auto)" value={layout.cardMinHeight} onChange={(v) => setL({ cardMinHeight: v })} />
              <Num label="Ancho mínimo card (px, 0=auto)" value={layout.cardMinWidth} onChange={(v) => setL({ cardMinWidth: v })} />
              <label className="flex items-center justify-between gap-3 text-sm rounded-md border bg-muted/30 p-3">
                <span>Igualar altura de cards</span>
                <Switch checked={layout.equalHeight} onCheckedChange={(v) => setL({ equalHeight: v })} disabled={layoutDisabled} />
              </label>
              <label className="flex items-center justify-between gap-3 text-sm rounded-md border bg-muted/30 p-3">
                <span>Botón siempre abajo</span>
                <Switch checked={layout.buttonBottom} onCheckedChange={(v) => setL({ buttonBottom: v })} disabled={layoutDisabled} />
              </label>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="image">
          <AccordionTrigger className="text-sm" disabled={layoutDisabled}>4. Imagen</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-3 sm:grid-cols-3">
              <Num label="Alto imagen desktop (px)" value={layout.imageHeightDesktop} onChange={(v) => setL({ imageHeightDesktop: v })} />
              <Num label="Alto imagen tablet (px)" value={layout.imageHeightTablet} onChange={(v) => setL({ imageHeightTablet: v })} />
              <Num label="Alto imagen mobile (px)" value={layout.imageHeightMobile} onChange={(v) => setL({ imageHeightMobile: v })} />
              <div>
                <Label className="text-xs">Object-fit</Label>
                <Select value={layout.imageFit} onValueChange={(v: any) => setL({ imageFit: v })} disabled={layoutDisabled}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contain">Contain</SelectItem>
                    <SelectItem value="cover">Cover</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Object-position</Label>
                <Input value={layout.imagePosition} onChange={(e) => setL({ imagePosition: e.target.value })} disabled={layoutDisabled} />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="controls">
          <AccordionTrigger className="text-sm" disabled={layoutDisabled}>5. Controles del carrusel</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center justify-between gap-3 text-sm rounded-md border bg-muted/30 p-3">
                <span>Mostrar flechas</span>
                <Switch checked={layout.showArrows} onCheckedChange={(v) => setL({ showArrows: v })} disabled={layoutDisabled} />
              </label>
              <label className="flex items-center justify-between gap-3 text-sm rounded-md border bg-muted/30 p-3">
                <span>Mostrar dots</span>
                <Switch checked={layout.showDots} onCheckedChange={(v) => setL({ showDots: v })} disabled={layoutDisabled} />
              </label>
              <label className="flex items-center justify-between gap-3 text-sm rounded-md border bg-muted/30 p-3">
                <span>Autoplay</span>
                <Switch checked={layout.autoplay} onCheckedChange={(v) => setL({ autoplay: v })} disabled={layoutDisabled} />
              </label>
              <Num label="Velocidad autoplay (s)" value={layout.autoplaySpeed} onChange={(v) => setL({ autoplaySpeed: v })} />
              <label className="flex items-center justify-between gap-3 text-sm rounded-md border bg-muted/30 p-3">
                <span>Loop infinito</span>
                <Switch checked={layout.loop} onCheckedChange={(v) => setL({ loop: v })} disabled={layoutDisabled} />
              </label>
              <label className="flex items-center justify-between gap-3 text-sm rounded-md border bg-muted/30 p-3">
                <span>Scroll libre en mobile</span>
                <Switch checked={layout.freeScrollMobile} onCheckedChange={(v) => setL({ freeScrollMobile: v })} disabled={layoutDisabled} />
              </label>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="bg">
          <AccordionTrigger className="text-sm" disabled={bgDisabled}>6. Fondo del carrusel</AccordionTrigger>
          <AccordionContent>
            {(() => {
              const t = background.type;
              const color1Enabled = !bgDisabled && (t === "white" || t === "soft" || t === "solid" || t === "gradient");
              const color2Enabled = !bgDisabled && t === "gradient";
              const dirEnabled = !bgDisabled && t === "gradient";
              return (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs">Tipo de fondo</Label>
                    <Select value={background.type} onValueChange={(v: any) => setB({ type: v })} disabled={bgDisabled}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="transparent">Transparente</SelectItem>
                        <SelectItem value="white">Blanco</SelectItem>
                        <SelectItem value="soft">Gris suave</SelectItem>
                        <SelectItem value="solid">Color sólido</SelectItem>
                        <SelectItem value="gradient">Degradado</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {t === "transparent" && "Sin fondo. Colores desactivados."}
                      {t === "white" && "Blanco por defecto (#ffffff). Color principal opcional."}
                      {t === "soft" && "Gris suave por defecto (#f5f5f5). Color principal opcional."}
                      {t === "solid" && "Usa el color principal."}
                      {t === "gradient" && "Degradado entre color principal y secundario."}
                    </p>
                  </div>
                  <div className={color1Enabled ? "" : "opacity-50"}>
                    <Label className="text-xs">Color principal {(t === "white" || t === "soft") && "(opcional)"}</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={background.color1 || "#ffffff"} onChange={(e) => setB({ color1: e.target.value })} className="h-9 w-16 p-1" disabled={!color1Enabled} />
                      <Input value={background.color1} onChange={(e) => setB({ color1: e.target.value })} disabled={!color1Enabled} placeholder="#ffffff" />
                    </div>
                  </div>
                  <div className={color2Enabled ? "" : "opacity-50"}>
                    <Label className="text-xs">Color secundario (degradado)</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={background.color2 || "#ffffff"} onChange={(e) => setB({ color2: e.target.value })} className="h-9 w-16 p-1" disabled={!color2Enabled} />
                      <Input value={background.color2} onChange={(e) => setB({ color2: e.target.value })} disabled={!color2Enabled} />
                    </div>
                  </div>
                  <div className={dirEnabled ? "" : "opacity-50"}>
                    <Label className="text-xs">Dirección degradado (deg)</Label>
                    <Input type="number" value={background.gradientDirection} onChange={(e) => setB({ gradientDirection: Number(e.target.value) || 0 })} disabled={!dirEnabled} />
                  </div>
                  <Num label="Opacidad (0-1)" value={background.opacity} step={0.05} onChange={(v) => setB({ opacity: Math.max(0, Math.min(1, v)) })} />
                  <Num label="Border radius (px)" value={background.radius} onChange={(v) => setB({ radius: v })} />
                  <Num label="Padding interno (px)" value={background.paddingInner} onChange={(v) => setB({ paddingInner: v })} />
                  <Num label="Margen superior (px)" value={background.marginTop} onChange={(v) => setB({ marginTop: v })} />
                  <Num label="Margen inferior (px)" value={background.marginBottom} onChange={(v) => setB({ marginBottom: v })} />
                </div>
              );
            })()}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="preview">
          <AccordionTrigger className="text-sm">7. Vista previa en vivo</AccordionTrigger>
          <AccordionContent>
            <div className="flex gap-2 mb-3">
              {(["desktop", "tablet", "mobile"] as Device[]).map((d) => (
                <Button key={d} type="button" size="sm" variant={device === d ? "dark" : "outline"} onClick={() => setDevice(d)}>
                  {d === "desktop" ? "Desktop" : d === "tablet" ? "Tablet" : "Mobile"}
                </Button>
              ))}
            </div>
            <HomeCarouselPreview design={previewDesign} device={device} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
