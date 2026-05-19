import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, Loader2, X } from "lucide-react";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const empty = {
  name: "", slug: "", short_description: "", description: "",
  price: 0, sale_price: null as number | null,
  category: "", stock: 0, main_image: "", gallery_images: "" as any,
  is_active: true, badge: "",
  usage_instructions: "", ingredients: "",
};

const BADGES = [
  { v: "__none__", l: "Sin etiqueta" }, { v: "new", l: "Nuevo" },
  { v: "best-seller", l: "Más vendido" }, { v: "sale", l: "Oferta" },
];

export default function SupplierProductForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const nav = useNavigate();
  const { supplierId } = useAuth();
  const [f, setF] = useState<any>(empty);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [cats, setCats] = useState<{ name: string; slug: string }[]>([]);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  useEffect(() => {
    supabase.from("categories").select("name,slug").eq("type", "product").order("sort_order")
      .then(({ data }) => setCats(data ?? []));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    supabase.from("products").select("*").eq("id", id!).maybeSingle().then(({ data }) => {
      if (data) {
        setF({
          ...data,
          gallery_images: ((data as any).gallery_images as any[] ?? []).join("\n"),
        });
      }
    });
  }, [id, isEdit]);

  const uploadFile = async (file: File, prefix: string) => {
    const ext = file.name.split(".").pop();
    const path = `${prefix}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("blog-images").upload(path, file);
    if (error) throw error;
    return supabase.storage.from("blog-images").getPublicUrl(path).data.publicUrl;
  };

  const onMain = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try { set("main_image", await uploadFile(file, "product")); toast.success("Imagen subida"); }
    catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  };

  const onGallery = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls = [];
      for (const file of Array.from(files)) urls.push(await uploadFile(file, "gallery"));
      const cur = typeof f.gallery_images === "string"
        ? f.gallery_images.split("\n").map((s: string) => s.trim()).filter(Boolean)
        : (f.gallery_images ?? []);
      set("gallery_images", [...cur, ...urls].join("\n"));
      toast.success(`${urls.length} imagen(es) subida(s)`);
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  };

  const save = async () => {
    if (!supplierId) return toast.error("Tu cuenta de proveedor no está activa");
    if (!f.name?.trim()) return toast.error("El nombre es obligatorio");
    if (Number(f.price) <= 0) return toast.error("El precio debe ser mayor a 0");
    setSaving(true);
    try {
      const payload: any = {
        ...f,
        supplier_id: supplierId,
        slug: f.slug || slugify(f.name),
        price: Number(f.price) || 0,
        sale_price: f.sale_price ? Number(f.sale_price) : null,
        stock: Number(f.stock) || 0,
        gallery_images: typeof f.gallery_images === "string"
          ? f.gallery_images.split("\n").map((s: string) => s.trim()).filter(Boolean)
          : f.gallery_images,
        badge: f.badge === "__none__" ? "" : f.badge,
      };
      delete payload.created_at; delete payload.updated_at; delete payload.id;
      const res = isEdit
        ? await supabase.from("products").update(payload).eq("id", id!)
        : await supabase.from("products").insert(payload);
      if (res.error) throw res.error;
      toast.success(isEdit ? "Producto actualizado" : "Producto creado");
      nav("/supplier/products");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  const galleryList: string[] = typeof f.gallery_images === "string"
    ? f.gallery_images.split("\n").map((s: string) => s.trim()).filter(Boolean)
    : (f.gallery_images ?? []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-3xl uppercase">{isEdit ? "Editar producto" : "Nuevo producto"}</h1>
      <div className="grid gap-4 rounded-lg border bg-background p-6">
        <Fld label="Nombre *"><Input value={f.name ?? ""} onChange={(e) => set("name", e.target.value)} maxLength={120}/></Fld>
        <Fld label="Slug (URL)"><Input placeholder="se genera del nombre" value={f.slug ?? ""} onChange={(e) => set("slug", slugify(e.target.value))}/></Fld>
        <Fld label="Descripción corta"><Input value={f.short_description ?? ""} onChange={(e) => set("short_description", e.target.value)} maxLength={200}/></Fld>
        <Fld label="Descripción larga"><Textarea rows={5} value={f.description ?? ""} onChange={(e) => set("description", e.target.value)} maxLength={4000}/></Fld>

        <div className="grid gap-4 sm:grid-cols-2">
          <Fld label="Precio *"><Input type="number" step="0.01" min={0} value={f.price} onChange={(e) => set("price", e.target.value)}/></Fld>
          <Fld label="Precio de oferta"><Input type="number" step="0.01" min={0} value={f.sale_price ?? ""} onChange={(e) => set("sale_price", e.target.value)}/></Fld>
          <Fld label="Categoría">
            <Input list="sp-cats" value={f.category ?? ""} onChange={(e) => set("category", e.target.value)}/>
            <datalist id="sp-cats">{cats.map((c) => <option key={c.slug} value={c.name}/>)}</datalist>
          </Fld>
          <Fld label="Stock"><Input type="number" min={0} value={f.stock} onChange={(e) => set("stock", e.target.value)}/></Fld>
          <Fld label="Etiqueta">
            <Select value={f.badge || "__none__"} onValueChange={(v) => set("badge", v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>{BADGES.map((b) => <SelectItem key={b.v} value={b.v}>{b.l}</SelectItem>)}</SelectContent>
            </Select>
          </Fld>
        </div>

        <Fld label="Imagen principal">
          <div className="space-y-2">
            {f.main_image && <img src={f.main_image} alt="" className="h-32 w-32 rounded border object-cover"/>}
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 size={14} className="animate-spin"/> : <Upload size={14}/>} Subir
              </Button>
              {f.main_image && <Button type="button" variant="ghost" size="sm" onClick={() => set("main_image", "")}>Quitar</Button>}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onMain(e.target.files?.[0])}/>
            </div>
            <Input placeholder="O pega URL" value={f.main_image ?? ""} onChange={(e) => set("main_image", e.target.value)}/>
          </div>
        </Fld>

        <Fld label="Galería de imágenes">
          <div className="space-y-2">
            {galleryList.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {galleryList.map((u, i) => (
                  <div key={i} className="relative">
                    <img src={u} alt="" className="h-20 w-20 rounded border object-cover"/>
                    <button type="button" className="absolute -right-1 -top-1 rounded-full bg-destructive p-1 text-destructive-foreground"
                      onClick={() => { const a = [...galleryList]; a.splice(i, 1); set("gallery_images", a.join("\n")); }}>
                      <X size={10}/>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => galleryRef.current?.click()} disabled={uploading}>
              <Upload size={14}/> Añadir imágenes
            </Button>
            <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onGallery(e.target.files)}/>
          </div>
        </Fld>

        <Fld label="Instrucciones de uso"><Textarea rows={3} value={f.usage_instructions ?? ""} onChange={(e) => set("usage_instructions", e.target.value)} maxLength={2000}/></Fld>
        <Fld label="Ingredientes"><Textarea rows={3} value={f.ingredients ?? ""} onChange={(e) => set("ingredients", e.target.value)} maxLength={2000}/></Fld>

        <div className="flex items-center gap-3">
          <Switch checked={!!f.is_active} onCheckedChange={(v) => set("is_active", v)}/>
          <Label>Publicado (visible para clientes)</Label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => nav("/supplier/products")}>Cancelar</Button>
          <Button variant="dark" onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
        </div>
      </div>
    </div>
  );
}

const Fld = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5"><Label>{label}</Label>{children}</div>
);
