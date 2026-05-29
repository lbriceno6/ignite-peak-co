import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Upload, Loader2, ArrowLeft } from "lucide-react";
import { slugify } from "@/lib/slug";
import { Link } from "react-router-dom";

const sb = supabase as any;

const empty = {
  name: "",
  slug: "",
  logo_url: "",
  banner_url: "",
  short_description: "",
  long_description: "",
  is_active: true,
  display_order: 0,
  seo_title: "",
  seo_description: "",
};

export default function AdminBrandForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const nav = useNavigate();
  const [f, setF] = useState<any>(empty);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const { data } = await sb.from("brands").select("*").eq("id", id).maybeSingle();
      if (data) { setF(data); setSlugTouched(true); }
    })();
  }, [id, isEdit]);

  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  const uploadToBucket = async (file: File, prefix: string) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowed.includes(file.type)) {
      throw new Error("Solo se permiten archivos JPG, PNG o WebP.");
    }
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${prefix}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("brand-assets").upload(path, file, { upsert: false });
    if (error) throw error;
    return supabase.storage.from("brand-assets").getPublicUrl(path).data.publicUrl;
  };

  const onUploadLogo = async (file?: File) => {
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadToBucket(file, "logo");
      set("logo_url", url);
      toast.success("Logo subido");
    } catch (e: any) { toast.error(e.message); } finally { setUploadingLogo(false); }
  };

  const onUploadBanner = async (file?: File) => {
    if (!file) return;
    setUploadingBanner(true);
    try {
      const url = await uploadToBucket(file, "banner");
      set("banner_url", url);
      toast.success("Banner subido");
    } catch (e: any) { toast.error(e.message); } finally { setUploadingBanner(false); }
  };

  const onNameChange = (v: string) => {
    setF((p: any) => ({
      ...p,
      name: v,
      slug: slugTouched ? p.slug : slugify(v),
    }));
  };

  const save = async () => {
    if (!f.name.trim()) return toast.error("Ingresa un nombre.");
    const slug = (f.slug || slugify(f.name)).trim();
    if (!slug) return toast.error("Slug inválido.");
    setSaving(true);
    try {
      const payload: any = {
        name: f.name.trim(),
        slug,
        logo_url: f.logo_url || null,
        banner_url: f.banner_url || null,
        short_description: f.short_description || null,
        long_description: f.long_description || null,
        is_active: !!f.is_active,
        display_order: Number(f.display_order) || 0,
        seo_title: f.seo_title || null,
        seo_description: f.seo_description || null,
      };
      const res = isEdit
        ? await sb.from("brands").update(payload).eq("id", id!)
        : await sb.from("brands").insert(payload);
      if (res.error) {
        if (res.error.code === "23505" || /duplicate|unique/i.test(res.error.message)) {
          throw new Error("Ya existe otra marca con ese slug.");
        }
        throw res.error;
      }
      toast.success(isEdit ? "Marca actualizada" : "Marca creada");
      nav("/admin/brands");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/admin/brands" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Volver a marcas
      </Link>
      <h1 className="font-display text-3xl">{isEdit ? "Editar marca" : "Crear marca"}</h1>

      <div className="grid gap-4 rounded-lg border bg-background p-6">
        <Field label="Nombre de la marca">
          <Input value={f.name} onChange={(e) => onNameChange(e.target.value)} />
        </Field>
        <Field label="Slug (URL)">
          <Input
            value={f.slug}
            onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }}
            placeholder="se genera automáticamente"
          />
          <p className="text-xs text-muted-foreground mt-1">URL pública: <code>/marca/{f.slug || "..."}</code></p>
        </Field>

        <Field label="Logo de la marca (JPG, PNG o WebP)">
          <div className="space-y-2">
            {f.logo_url && (
              <img src={f.logo_url} alt="Logo" className="h-24 w-24 rounded-md object-contain border bg-muted/30" />
            )}
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => logoRef.current?.click()} disabled={uploadingLogo}>
                {uploadingLogo ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                {uploadingLogo ? "Subiendo…" : "Subir logo"}
              </Button>
              {f.logo_url && (
                <Button type="button" variant="ghost" size="sm" onClick={() => set("logo_url", "")}>Quitar</Button>
              )}
              <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={(e) => onUploadLogo(e.target.files?.[0])} />
            </div>
            <Input placeholder="O pega URL del logo" value={f.logo_url ?? ""} onChange={(e) => set("logo_url", e.target.value)} />
          </div>
        </Field>

        <Field label="Banner de la marca (opcional)">
          <div className="space-y-2">
            {f.banner_url && (
              <img src={f.banner_url} alt="Banner" className="h-32 w-full rounded-md object-cover border" />
            )}
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => bannerRef.current?.click()} disabled={uploadingBanner}>
                {uploadingBanner ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                {uploadingBanner ? "Subiendo…" : "Subir banner"}
              </Button>
              {f.banner_url && (
                <Button type="button" variant="ghost" size="sm" onClick={() => set("banner_url", "")}>Quitar</Button>
              )}
              <input ref={bannerRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={(e) => onUploadBanner(e.target.files?.[0])} />
            </div>
            <Input placeholder="O pega URL del banner" value={f.banner_url ?? ""} onChange={(e) => set("banner_url", e.target.value)} />
          </div>
        </Field>

        <Field label="Descripción corta">
          <Input value={f.short_description ?? ""} onChange={(e) => set("short_description", e.target.value)} />
        </Field>

        <Field label="Descripción larga">
          <Textarea rows={5} value={f.long_description ?? ""} onChange={(e) => set("long_description", e.target.value)} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Orden de visualización">
            <Input type="number" value={f.display_order} onChange={(e) => set("display_order", e.target.value)} />
          </Field>
          <div className="flex items-end gap-3 pb-2">
            <Switch checked={f.is_active} onCheckedChange={(v) => set("is_active", v)} />
            <Label>Marca activa</Label>
          </div>
        </div>

        <div className="space-y-3 rounded-md border bg-secondary/30 p-4">
          <h3 className="font-semibold text-sm">SEO</h3>
          <Field label="SEO Title">
            <Input value={f.seo_title ?? ""} onChange={(e) => set("seo_title", e.target.value)} />
          </Field>
          <Field label="SEO Description">
            <Textarea rows={2} value={f.seo_description ?? ""} onChange={(e) => set("seo_description", e.target.value)} />
          </Field>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => nav("/admin/brands")}>Cancelar</Button>
          <Button variant="dark" onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar marca"}</Button>
        </div>
      </div>
    </div>
  );
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5"><Label>{label}</Label>{children}</div>
);
