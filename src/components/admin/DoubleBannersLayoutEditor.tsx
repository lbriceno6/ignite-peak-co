import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  mergeDbLayout, buildDbCss,
  type DoubleBannersLayout, type DbWidth, type DbFit, type DbPosX,
} from "@/lib/doubleBannersLayout";

const WIDTH_OPTS: { value: DbWidth; label: string }[] = [
  { value: "container", label: "Normal (contenido)" },
  { value: "wide", label: "Ancho amplio (1440px)" },
  { value: "full", label: "Full width" },
  { value: "full-padded", label: "Full width con padding" },
  { value: "custom", label: "Personalizado" },
];
const FIT_OPTS: { value: DbFit; label: string }[] = [
  { value: "cover", label: "cover" }, { value: "contain", label: "contain" },
];
const POS_OPTS: { value: DbPosX; label: string }[] = [
  { value: "left", label: "Izquierda" }, { value: "center", label: "Centro" }, { value: "right", label: "Derecha" },
];

function Num({ label, value, onChange, min = 0, max = 4000 }: { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number; }) {
  return (
    <label className="text-xs flex flex-col gap-1 min-w-0">
      {label}
      <Input type="number" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} />
    </label>
  );
}
function Sel<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; }) {
  return (
    <label className="text-xs flex flex-col gap-1 min-w-0">
      {label}
      <select className="h-9 rounded-md border bg-background px-2 text-sm" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

type Props = {
  value?: Partial<DoubleBannersLayout> | null;
  onChange: (next: Partial<DoubleBannersLayout>) => void;
  previewImage?: string;
};

export function DoubleBannersLayoutEditor({ value, onChange, previewImage }: Props) {
  const L = useMemo(() => mergeDbLayout(value || {}), [value]);
  const set = (patch: Partial<DoubleBannersLayout>) => onChange({ ...(value || {}), ...patch });
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const previewW = device === "desktop" ? 1100 : device === "tablet" ? 760 : 380;
  const scopeId = "dbp-preview";
  const css = buildDbCss(scopeId, L);
  const img = previewImage || "/placeholder.svg";
  const isCustom = L.width === "custom";

  return (
    <div className="space-y-4 rounded-md border bg-background p-3 w-full max-w-full min-w-0 overflow-x-hidden">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tamaño y ancho</div>
      <Sel label="Ancho del contenedor" value={L.width} options={WIDTH_OPTS} onChange={(v) => set({ width: v })} />

      {isCustom && (
        <div className="grid gap-2 grid-cols-1 sm:[grid-template-columns:repeat(2,minmax(0,1fr))] lg:[grid-template-columns:repeat(3,minmax(0,1fr))] min-w-0">
          <Num label="Max-width desktop" value={L.maxWidthDesktop} onChange={(n) => set({ maxWidthDesktop: n })} />
          <Num label="Max-width tablet" value={L.maxWidthTablet} onChange={(n) => set({ maxWidthTablet: n })} />
          <Num label="Max-width mobile" value={L.maxWidthMobile} onChange={(n) => set({ maxWidthMobile: n })} />
        </div>
      )}
      <div className="grid gap-2 grid-cols-1 sm:[grid-template-columns:repeat(3,minmax(0,1fr))] min-w-0">
        <Num label="Padding lateral desktop" value={L.padDesktop} onChange={(n) => set({ padDesktop: n })} />
        <Num label="Padding lateral tablet" value={L.padTablet} onChange={(n) => set({ padTablet: n })} />
        <Num label="Padding lateral mobile" value={L.padMobile} onChange={(n) => set({ padMobile: n })} />
      </div>

      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-1">Imagen ampliable</div>
      <div className="grid gap-2 grid-cols-1 sm:[grid-template-columns:repeat(2,minmax(0,1fr))] lg:[grid-template-columns:repeat(4,minmax(0,1fr))] min-w-0">
        <Num label="Zoom de imagen (%)" min={50} max={200} value={L.imageZoom} onChange={(n) => set({ imageZoom: n })} />
        <Sel label="object-fit" value={L.imageFit} options={FIT_OPTS} onChange={(v) => set({ imageFit: v })} />
        <Sel label="Posición de imagen" value={L.imagePos} options={POS_OPTS} onChange={(v) => set({ imagePos: v })} />
        <div />
        <Num label="Altura mín. desktop" value={L.minHeightDesktop} onChange={(n) => set({ minHeightDesktop: n })} />
        <Num label="Altura mín. tablet" value={L.minHeightTablet} onChange={(n) => set({ minHeightTablet: n })} />
        <Num label="Altura mín. mobile" value={L.minHeightMobile} onChange={(n) => set({ minHeightMobile: n })} />
        <div />
        <Num label="Altura máx. desktop" value={L.maxHeightDesktop} onChange={(n) => set({ maxHeightDesktop: n })} />
        <Num label="Altura máx. tablet" value={L.maxHeightTablet} onChange={(n) => set({ maxHeightTablet: n })} />
        <Num label="Altura máx. mobile" value={L.maxHeightMobile} onChange={(n) => set({ maxHeightMobile: n })} />
      </div>

      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-1">Mobile centrado</div>
      <div className="grid gap-2 grid-cols-1 sm:[grid-template-columns:repeat(2,minmax(0,1fr))] min-w-0">
        <label className="flex items-center justify-between rounded border bg-background p-2 text-xs"><span>Centrar banners en mobile</span><Switch checked={L.centerBannersMobile} onCheckedChange={(v) => set({ centerBannersMobile: v })} /></label>
        <label className="flex items-center justify-between rounded border bg-background p-2 text-xs"><span>Centrar imagen en mobile</span><Switch checked={L.centerImageMobile} onCheckedChange={(v) => set({ centerImageMobile: v })} /></label>
        <label className="flex items-center justify-between rounded border bg-background p-2 text-xs"><span>Centrar contenido en mobile</span><Switch checked={L.centerContentMobile} onCheckedChange={(v) => set({ centerContentMobile: v })} /></label>
        <label className="flex items-center justify-between rounded border bg-background p-2 text-xs"><span>Apilar banners en mobile</span><Switch checked={L.stackOnMobile} onCheckedChange={(v) => set({ stackOnMobile: v })} /></label>
        <Num label="Separación entre banners en mobile (px)" value={L.mobileGap} onChange={(n) => set({ mobileGap: n })} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs">Vista previa</Label>
          <div className="flex gap-1">
            {(["desktop", "tablet", "mobile"] as const).map((d) => (
              <button key={d} type="button" onClick={() => setDevice(d)}
                className={`text-[11px] rounded px-2 py-1 border ${device === d ? "bg-primary text-primary-foreground" : "bg-background"}`}>{d}</button>
            ))}
          </div>
        </div>
        <div className="rounded border bg-muted/30 p-2 w-full max-w-full min-w-0 overflow-hidden">
          <style dangerouslySetInnerHTML={{ __html: css }} />
          <div className="w-full max-w-full min-w-0 overflow-hidden">
            <section id={scopeId} style={{ width: "100%", maxWidth: previewW, margin: "0 auto" }}>
              <div className="db-wrap">
                <div className="db-grid">
                  {[0, 1].map((i) => (
                    <div key={i} className="db-card">
                      <div className="db-img-wrap relative overflow-hidden rounded-xl aspect-[16/7] bg-muted">
                        <img src={img} alt="" className="db-img" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
