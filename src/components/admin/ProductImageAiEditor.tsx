import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageIcon, Upload, Loader2, Wand2, Download, RefreshCw, Check } from "lucide-react";
import { toast } from "sonner";

type Background = {
  value: string;
  name: string;
  description: string;
  preview: string; // tailwind class for thumbnail
};

const BACKGROUNDS: Background[] = [
  {
    value: "white_ecommerce",
    name: "Fondo blanco ecommerce",
    description: "Fondo blanco limpio para catálogo.",
    preview: "bg-white border",
  },
  {
    value: "transparent",
    name: "Fondo transparente",
    description: "Producto recortado sin fondo (PNG).",
    preview:
      "bg-[conic-gradient(at_50%_50%,#e5e7eb_25%,white_0_50%,#e5e7eb_0_75%,white_0)] [background-size:12px_12px]",
  },
  {
    value: "premium_jar",
    name: "Fondo premium frasco",
    description: "Estudio oscuro elegante, sombra realista, ideal para frascos y botellas.",
    preview: "bg-gradient-to-br from-zinc-900 to-zinc-700",
  },
  {
    value: "premium_box",
    name: "Fondo premium caja",
    description: "Estudio oscuro elegante, sombra profesional, ideal para cajas y empaques.",
    preview: "bg-gradient-to-br from-slate-900 to-slate-600",
  },
];

type Props = {
  mainImage?: string | null;
  onApplyMain: (url: string) => void;
  onAppendGallery: (url: string) => void;
};

const BUCKET = "blog-images";

async function uploadDataUrl(dataUrl: string, prefix: string): Promise<string> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const ext = (blob.type.split("/")[1] || "png").split("+")[0];
  const path = `${prefix}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    upsert: false,
    contentType: blob.type || "image/png",
  });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export function ProductImageAiEditor({ mainImage, onApplyMain, onAppendGallery }: Props) {
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [background, setBackground] = useState<string>("white_ecommerce");
  const [generating, setGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [variantsForGallery, setVariantsForGallery] = useState(false);
  const [savingTo, setSavingTo] = useState<null | "main" | "gallery">(null);

  const openEditor = () => {
    setOpen(true);
    setResultUrl(null);
    if (mainImage && !sourceUrl) setSourceUrl(mainImage);
  };

  const onPickFile = async (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSourceUrl(reader.result as string);
      setResultUrl(null);
    };
    reader.readAsDataURL(file);
  };

  const generate = async () => {
    if (!sourceUrl) return toast.error("Sube o selecciona una imagen primero.");
    setGenerating(true);
    setResultUrl(null);
    try {
      const { data, error } = await supabase.functions.invoke("product-image-edit", {
        body: { image_url: sourceUrl, background },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const img = (data as any)?.image as string;
      if (!img) throw new Error("La IA no devolvió imagen.");
      setResultUrl(img);

      if (variantsForGallery) {
        const others = BACKGROUNDS.filter((b) => b.value !== background);
        for (const bg of others) {
          try {
            const r = await supabase.functions.invoke("product-image-edit", {
              body: { image_url: sourceUrl, background: bg.value },
            });
            const u = (r.data as any)?.image as string | undefined;
            if (u) {
              const stored = await uploadDataUrl(u, `product-ai-${bg.value}`);
              onAppendGallery(stored);
            }
          } catch (e) {
            console.error("variant error", bg.value, e);
          }
        }
        toast.success("Variantes agregadas a galería.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Error generando imagen");
    } finally {
      setGenerating(false);
    }
  };

  const saveAs = async (target: "main" | "gallery") => {
    if (!resultUrl) return;
    setSavingTo(target);
    try {
      const url = await uploadDataUrl(resultUrl, "product-ai");
      if (target === "main") {
        onApplyMain(url);
        toast.success("Guardada como imagen principal.");
      } else {
        onAppendGallery(url);
        toast.success("Agregada a la galería.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Error al guardar");
    } finally {
      setSavingTo(null);
    }
  };

  const download = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `producto-ia-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="space-y-3 rounded-lg border-2 border-primary/30 bg-primary/5 p-5">
      <div className="flex items-center gap-2">
        <ImageIcon className="text-primary" size={20} />
        <h3 className="font-semibold text-lg">Editor IA de imagen del producto</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Sube una foto, elige un fondo profesional y deja que la IA mejore la presentación sin alterar la marca, el envase
        ni los textos de la etiqueta.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="dark" onClick={openEditor}>
          <Wand2 size={16} /> Editar imagen con IA
        </Button>
        {mainImage && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSourceUrl(mainImage);
              setResultUrl(null);
              setOpen(true);
            }}
          >
            Usar la imagen principal actual
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editor IA de imagen</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Step 1: source */}
            <section className="space-y-2">
              <Label>1. Imagen original</Label>
              <div className="flex items-start gap-4">
                <div className="h-40 w-40 rounded-md border bg-muted/30 flex items-center justify-center overflow-hidden">
                  {sourceUrl ? (
                    <img src={sourceUrl} alt="Original" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin imagen</span>
                  )}
                </div>
                <div className="space-y-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                    <Upload size={16} /> Subir imagen
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onPickFile(e.target.files?.[0])}
                  />
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Usa una foto clara del producto. La IA centrará, mejorará iluminación y aplicará el fondo elegido.
                  </p>
                </div>
              </div>
            </section>

            {/* Step 2: backgrounds */}
            <section className="space-y-2">
              <Label>2. Elige un fondo</Label>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {BACKGROUNDS.map((b) => {
                  const active = background === b.value;
                  return (
                    <button
                      key={b.value}
                      type="button"
                      onClick={() => setBackground(b.value)}
                      className={`text-left rounded-lg border p-3 transition ${
                        active ? "border-primary ring-2 ring-primary/30" : "hover:border-primary/40"
                      }`}
                    >
                      <div className={`h-20 w-full rounded-md ${b.preview} mb-2`} />
                      <div className="text-sm font-medium">{b.name}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{b.description}</div>
                      <div className="mt-2">
                        <span
                          className={`inline-flex items-center gap-1 text-xs ${
                            active ? "text-primary font-medium" : "text-muted-foreground"
                          }`}
                        >
                          {active ? <Check size={12} /> : null} {active ? "Seleccionado" : "Seleccionar"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Step 3: options */}
            <section className="flex items-center gap-3">
              <Switch checked={variantsForGallery} onCheckedChange={setVariantsForGallery} />
              <Label>Generar variantes para galería (un fondo por cada estilo)</Label>
            </section>

            {/* Step 4: generate */}
            <section className="flex flex-wrap gap-2">
              <Button type="button" variant="dark" onClick={generate} disabled={generating || !sourceUrl}>
                {generating ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />}
                {generating ? "Generando…" : "Generar imagen"}
              </Button>
              {resultUrl && (
                <>
                  <Button type="button" variant="outline" onClick={generate} disabled={generating}>
                    <RefreshCw size={16} /> Regenerar
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setResultUrl(null)}>
                    Cambiar fondo
                  </Button>
                </>
              )}
            </section>

            {/* Step 5: result */}
            {resultUrl && (
              <section className="space-y-2">
                <Label>Vista previa final</Label>
                <div className="h-72 w-72 rounded-md border bg-muted/20 overflow-hidden">
                  <img src={resultUrl} alt="Resultado" className="h-full w-full object-contain" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="dark" onClick={() => saveAs("main")} disabled={savingTo !== null}>
                    {savingTo === "main" ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />} Usar como
                    imagen principal
                  </Button>
                  <Button type="button" variant="outline" onClick={() => saveAs("gallery")} disabled={savingTo !== null}>
                    {savingTo === "gallery" ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />} Usar
                    como imagen de galería
                  </Button>
                  <Button type="button" variant="outline" onClick={download}>
                    <Download size={16} /> Descargar
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </section>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
