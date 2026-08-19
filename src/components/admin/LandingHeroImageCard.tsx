// Bloque "Hero" del editor de landings SEO: imagen generada con IA, subida
// manual, ALT editable y vista previa real.
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageIcon, Loader2, RefreshCw, Sparkles, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

type Props = {
  row: any;
  set: (patch: Record<string, any>) => void;
};

const SOURCE_LABEL: Record<string, string> = { ai: "Generada con IA", manual: "Subida manual", fallback: "Fallback" };

export default function LandingHeroImageCard({ row, set }: Props) {
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [broken, setBroken] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const hasImage = !!(row.hero_image && String(row.hero_image).trim());

  const persist = async (patch: Record<string, any>) => {
    set(patch);
    const { error } = await (supabase as any).from("seo_landing_pages").update(patch).eq("id", row.id);
    if (error) toast.error(error.message);
  };

  const generate = async () => {
    setGenerating(true);
    setBroken(false);
    try {
      const { data, error } = await supabase.functions.invoke("seo-landing-hero-image", {
        body: { landing_id: row.id, force: true, keep_alt: false },
      });
      if (error) throw new Error(error.message);
      if (!data?.ok) throw new Error(data?.error === "manual_image_exists" ? "La imagen actual es manual" : (data?.error ?? "No se pudo generar"));
      set({
        hero_image: data.hero_image,
        hero_image_alt: data.hero_image_alt ?? row.hero_image_alt,
        hero_image_source: "ai",
        hero_image_status: "generated",
        hero_image_prompt: data.prompt,
        hero_image_generated_at: new Date().toISOString(),
      });
      toast.success("Imagen Hero generada");
    } catch (e: any) {
      set({ hero_image_status: "failed" });
      toast.error(`No se pudo generar la imagen: ${e?.message ?? e}`);
    } finally {
      setGenerating(false);
    }
  };

  const upload = async (file: File) => {
    setUploading(true);
    setBroken(false);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `landings/manual-${row.slug || row.id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("blog-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const url = supabase.storage.from("blog-images").getPublicUrl(path).data.publicUrl;
      await persist({ hero_image: url, hero_image_source: "manual", hero_image_status: "generated" });
      toast.success("Imagen subida");
    } catch (e: any) {
      toast.error(e?.message ?? "Error al subir");
    } finally {
      setUploading(false);
    }
  };

  const remove = () => persist({ hero_image: null, hero_image_source: null, hero_image_status: null });
  const useFallback = () => persist({ hero_image: null, hero_image_source: "fallback", hero_image_status: null });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">Hero</CardTitle>
          {row.hero_image_source && <Badge variant="secondary">{SOURCE_LABEL[row.hero_image_source] ?? row.hero_image_source}</Badge>}
          {row.hero_image_status === "failed" && <Badge variant="destructive">Falló la generación</Badge>}
        </div>
        <CardDescription>Imagen principal, categoría, H1 y descripción corta que se muestran en la cabecera de la landing.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[220px,1fr]">
        <div className="space-y-2">
          <div className="aspect-[4/5] w-full overflow-hidden rounded-2xl border border-border bg-muted/40">
            {hasImage && !broken ? (
              <img
                src={row.hero_image}
                alt={row.hero_image_alt || row.title || ""}
                className="h-full w-full object-cover"
                onError={() => setBroken(true)}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                {generating ? <Loader2 className="animate-spin" /> : <ImageIcon />}
                <span className="text-xs">{generating ? "Generando imagen…" : "Sin imagen (fallback)"}</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={generate} disabled={generating}>
              {generating ? <Loader2 className="animate-spin" size={14} /> : hasImage ? <RefreshCw size={14} /> : <Sparkles size={14} />}
              {hasImage ? "Regenerar" : "Generar con IA"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />} Subir
            </Button>
            {hasImage && (
              <Button size="sm" variant="ghost" onClick={remove}><Trash2 size={14} /> Eliminar</Button>
            )}
            {hasImage && (
              <Button size="sm" variant="ghost" onClick={useFallback}>Usar fallback</Button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
          />
        </div>

        <div className="space-y-3">
          <div><Label>Categoría / etiqueta</Label><Input value={row.category_name ?? ""} onChange={(e) => set({ category_name: e.target.value })} /></div>
          <div><Label>H1</Label><Input value={row.title ?? ""} onChange={(e) => set({ title: e.target.value })} /></div>
          <div><Label>Descripción corta</Label><Textarea rows={3} value={row.intro ?? ""} onChange={(e) => set({ intro: e.target.value })} /></div>
          <div><Label>Imagen Hero (URL)</Label><Input value={row.hero_image ?? ""} onChange={(e) => set({ hero_image: e.target.value, hero_image_source: "manual" })} /></div>
          <div>
            <Label>ALT de la imagen</Label>
            <Input value={row.hero_image_alt ?? ""} placeholder="Alimentación saludable con frutas y verduras" onChange={(e) => set({ hero_image_alt: e.target.value })} />
          </div>
          {row.hero_image_prompt && (
            <details className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
              <summary className="cursor-pointer text-foreground">Prompt usado</summary>
              <p className="mt-2 whitespace-pre-wrap">{row.hero_image_prompt}</p>
            </details>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
