import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  mergeAiBannerLayout,
  buildAiBannerCss,
  type AiBannerLayout,
  type AiBannerWidth,
  type AiBannerFit,
  type AiBannerPosX,
} from "@/lib/aiBannerLayout";

const WIDTH_OPTS: { value: AiBannerWidth; label: string }[] = [
  { value: "container", label: "Contenedor (1200px)" },
  { value: "wide", label: "Contenedor amplio (1440px)" },
  { value: "full", label: "Full width" },
  { value: "full-padded", label: "Full width con padding" },
  { value: "custom", label: "Personalizado" },
];

const FIT_OPTS: AiBannerFit[] = ["cover", "contain"];
const POS_OPTS: { value: AiBannerPosX; label: string }[] = [
  { value: "left", label: "Izquierda" },
  { value: "center", label: "Centro" },
  { value: "right", label: "Derecha" },
];

type Props = {
  value?: Partial<AiBannerLayout> | null;
  onChange: (next: Partial<AiBannerLayout>) => void;
  previewImage?: string;
};

function NumberField({ label, value, onChange, min = 0, max = 4000 }: { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number; }) {
  return (
    <label className="text-xs flex flex-col gap-1">
      {label}
      <Input type="number" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)} />
    </label>
  );
}

function SelectField<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; }) {
  return (
    <label className="text-xs flex flex-col gap-1">
      {label}
      <select className="h-9 rounded-md border bg-background px-2 text-sm"
        value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function AiBannerLayoutEditor({ value, onChange, previewImage }: Props) {
  const L = useMemo(() => mergeAiBannerLayout(value || {}), [value]);
  const set = (patch: Partial<AiBannerLayout>) => onChange({ ...(value || {}), ...patch });
  const isCustom = L.width === "custom";
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  const previewW = device === "desktop" ? 1100 : device === "tablet" ? 760 : 380;
  const scopeId = "aidb-preview";
  const css = buildAiBannerCss(scopeId, L);

  return (
    <div className="space-y-4 rounded-md border bg-background p-3 w-full max-w-full min-w-0 overflow-x-hidden">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Ancho y adaptación responsive
      </div>

      <SelectField label="Ancho" value={L.width} options={WIDTH_OPTS} onChange={(v) => set({ width: v })} />

      {isCustom && (
        <div className="space-y-3 rounded border bg-muted/30 p-3 min-w-0">
          {(["desktop", "tablet", "mobile"] as const).map((d) => {
            const k = (s: string) => `${s}${d[0].toUpperCase()}${d.slice(1)}` as keyof AiBannerLayout;
            return (
              <div key={d} className="space-y-2 min-w-0">
                <div className="text-[11px] font-semibold uppercase text-muted-foreground">{d}</div>
                <div className="grid gap-2 grid-cols-1 sm:[grid-template-columns:repeat(2,minmax(0,1fr))] lg:[grid-template-columns:repeat(3,minmax(0,1fr))] min-w-0">
                  <NumberField label="max-width (0 = 100%)" value={L[k("maxWidth")] as number} onChange={(n) => set({ [k("maxWidth")]: n } as any)} />
                  <NumberField label="padding lateral" value={L[k("pad")] as number} onChange={(n) => set({ [k("pad")]: n } as any)} />
                  <NumberField label="altura" value={L[k("height")] as number} onChange={(n) => set({ [k("height")]: n } as any)} />
                  <SelectField label="object-fit" value={L[k("imageFit")] as AiBannerFit}
                    options={FIT_OPTS.map((f) => ({ value: f, label: f }))}
                    onChange={(v) => set({ [k("imageFit")]: v } as any)} />
                  <SelectField label="posición imagen" value={L[k("imagePos")] as AiBannerPosX}
                    options={POS_OPTS} onChange={(v) => set({ [k("imagePos")]: v } as any)} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase text-muted-foreground">Imagen adaptable</div>
        <div className="grid gap-2 grid-cols-1 sm:[grid-template-columns:repeat(2,minmax(0,1fr))] lg:[grid-template-columns:repeat(4,minmax(0,1fr))] min-w-0">
          <NumberField label="Zoom imagen (%)" min={50} max={200} value={L.imageZoom} onChange={(n) => set({ imageZoom: n })} />
          <NumberField label="Altura mínima" value={L.minHeight} onChange={(n) => set({ minHeight: n })} />
          <NumberField label="Altura máxima" value={L.maxHeight} onChange={(n) => set({ maxHeight: n })} />
          <label className="flex items-center justify-between rounded border bg-background p-2 text-xs min-w-0">
            <span>Esquinas redondeadas</span>
            <Switch checked={L.rounded} onCheckedChange={(v) => set({ rounded: v })} />
          </label>
        </div>
      </div>

      <div className="space-y-2 min-w-0">
        <div className="text-[11px] font-semibold uppercase text-muted-foreground">Mobile</div>
        <div className="grid gap-2 grid-cols-1 sm:[grid-template-columns:repeat(2,minmax(0,1fr))] lg:[grid-template-columns:repeat(3,minmax(0,1fr))] min-w-0">
          <label className="flex items-center justify-between rounded border bg-background p-2 text-xs">
            <span>Centrar imagen en mobile</span>
            <Switch checked={L.centerImageOnMobile} onCheckedChange={(v) => set({ centerImageOnMobile: v })} />
          </label>
          <label className="flex items-center justify-between rounded border bg-background p-2 text-xs">
            <span>Ocultar imagen en mobile</span>
            <Switch checked={L.hideImageOnMobile} onCheckedChange={(v) => set({ hideImageOnMobile: v })} />
          </label>
          <label className="flex items-center justify-between rounded border bg-background p-2 text-xs">
            <span>Reducir altura en mobile</span>
            <Switch checked={L.reduceHeightOnMobile} onCheckedChange={(v) => set({ reduceHeightOnMobile: v })} />
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs">Vista previa</Label>
          <div className="flex gap-1">
            {(["desktop", "tablet", "mobile"] as const).map((d) => (
              <button key={d} type="button"
                onClick={() => setDevice(d)}
                className={`text-[11px] rounded px-2 py-1 border ${device === d ? "bg-primary text-primary-foreground" : "bg-background"}`}>
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded border bg-muted/30 p-2 w-full max-w-full min-w-0 overflow-hidden">
          <style dangerouslySetInnerHTML={{ __html: css }} />
          <div className="w-full max-w-full min-w-0 overflow-hidden">
            <section id={scopeId} style={{ width: "100%", maxWidth: previewW, margin: "0 auto" }}>
              <div className="aidb-wrap">
                <div className={`relative overflow-hidden ${L.rounded ? "rounded-2xl" : ""} bg-surface-darker text-background`}>
                  {previewImage && (
                    <img src={previewImage} alt="" className="aidb-img absolute inset-0 h-full w-full max-w-full" />
                  )}
                  <div className="absolute inset-0 bg-black/40" aria-hidden />
                  <div className="aidb-inner relative grid items-center p-6 sm:p-10">
                    <div className="max-w-xl text-white">
                      <div className="text-xs opacity-80">Vista previa</div>
                      <div className="font-display text-2xl">Banner dinámico IA</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
