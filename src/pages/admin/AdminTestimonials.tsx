import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Upload, Instagram, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

type T = {
  id: string;
  author_name: string;
  author_handle: string | null;
  media_type: "image" | "video";
  media_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  instagram_url: string | null;
  rating: number | null;
  sort_order: number;
  is_active: boolean;
};

const empty: Omit<T, "id"> = {
  author_name: "",
  author_handle: "",
  media_type: "image",
  media_url: "",
  thumbnail_url: "",
  caption: "",
  instagram_url: "",
  rating: 5,
  sort_order: 0,
  is_active: true,
};

const AdminTestimonials = () => {
  const [list, setList] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>({ ...empty });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("testimonials").select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    setList((data ?? []) as T[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const startEdit = (t: T) => { setEditingId(t.id); setForm({ ...t }); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const reset = () => { setEditingId(null); setForm({ ...empty }); };

  const upload = async (file: File, kind: "media" | "thumb") => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${kind}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("testimonials").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("testimonials").getPublicUrl(path);
      const url = data.publicUrl;
      if (kind === "media") {
        const isVideo = file.type.startsWith("video/");
        setForm((f: any) => ({ ...f, media_url: url, media_type: isVideo ? "video" : "image" }));
      } else {
        setForm((f: any) => ({ ...f, thumbnail_url: url }));
      }
      toast.success("Archivo subido");
    } catch (e: any) {
      toast.error(e?.message ?? "Error al subir");
    } finally { setUploading(false); }
  };

  const save = async () => {
    if (!form.author_name?.trim()) return toast.error("Nombre del autor requerido");
    if (!form.media_url?.trim()) return toast.error("Sube un archivo o pega la URL");
    setSaving(true);
    const payload = {
      author_name: form.author_name.trim(),
      author_handle: form.author_handle?.trim() || null,
      media_type: form.media_type,
      media_url: form.media_url.trim(),
      thumbnail_url: form.thumbnail_url?.trim() || null,
      caption: form.caption?.trim() || null,
      instagram_url: form.instagram_url?.trim() || null,
      rating: Number(form.rating) || 5,
      sort_order: Number(form.sort_order) || 0,
      is_active: !!form.is_active,
    };
    const { error } = editingId
      ? await supabase.from("testimonials").update(payload).eq("id", editingId)
      : await supabase.from("testimonials").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editingId ? "Testimonio actualizado" : "Testimonio creado");
    reset();
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar este testimonio?")) return;
    const { error } = await supabase.from("testimonials").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Eliminado");
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase flex items-center gap-2"><Instagram size={22} /> Testimonios de Instagram</h1>
        <p className="text-sm text-muted-foreground">Sube imágenes o videos cortos de clientes para mostrar en el home.</p>
      </div>

      {/* Form */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg uppercase">{editingId ? "Editar testimonio" : "Nuevo testimonio"}</h2>
          {editingId && <Button variant="ghost" size="sm" onClick={reset}><X size={14} /> Cancelar</Button>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Nombre del autor *</Label><Input value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} className="mt-1.5" /></div>
          <div><Label>Usuario de Instagram (sin @)</Label><Input value={form.author_handle ?? ""} onChange={(e) => setForm({ ...form, author_handle: e.target.value })} placeholder="username" className="mt-1.5" /></div>

          <div>
            <Label>Tipo de medio</Label>
            <Select value={form.media_type} onValueChange={(v) => setForm({ ...form, media_type: v })}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="image">Imagen</SelectItem>
                <SelectItem value="video">Video</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Calificación (1–5)</Label>
            <Input type="number" min={1} max={5} value={form.rating ?? 5} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} className="mt-1.5" />
          </div>

          <div className="sm:col-span-2">
            <Label>Archivo (imagen o video MP4)</Label>
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-secondary">
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Subir archivo
                <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "media")} />
              </label>
              <Input value={form.media_url} onChange={(e) => setForm({ ...form, media_url: e.target.value })} placeholder="o pega una URL pública" className="flex-1 min-w-[260px]" />
            </div>
            {form.media_url && (
              <div className="mt-3 max-w-[200px] overflow-hidden rounded-md border">
                {form.media_type === "video" ? (
                  <video src={form.media_url} controls className="w-full" />
                ) : (
                  <img src={form.media_url} alt="preview" className="w-full" />
                )}
              </div>
            )}
          </div>

          {form.media_type === "video" && (
            <div className="sm:col-span-2">
              <Label>Miniatura del video (opcional)</Label>
              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-secondary">
                  <Upload size={14} /> Subir miniatura
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "thumb")} />
                </label>
                <Input value={form.thumbnail_url ?? ""} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} placeholder="URL de imagen" className="flex-1 min-w-[260px]" />
              </div>
            </div>
          )}

          <div className="sm:col-span-2">
            <Label>Texto / leyenda</Label>
            <Textarea value={form.caption ?? ""} onChange={(e) => setForm({ ...form, caption: e.target.value })} rows={3} className="mt-1.5" maxLength={300} />
          </div>

          <div className="sm:col-span-2"><Label>Enlace a la publicación de Instagram</Label><Input value={form.instagram_url ?? ""} onChange={(e) => setForm({ ...form, instagram_url: e.target.value })} placeholder="https://instagram.com/p/..." className="mt-1.5" /></div>

          <div><Label>Orden</Label><Input type="number" value={form.sort_order ?? 0} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} className="mt-1.5" /></div>
          <div className="flex items-center gap-3 sm:mt-7">
            <Switch checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            <Label>Activo</Label>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={save} disabled={saving || uploading} variant="accent">
            {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando…</> : <><Save size={14} /> {editingId ? "Guardar cambios" : "Crear testimonio"}</>}
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg uppercase">Testimonios ({list.length})</h2>
          <Button size="sm" variant="outline" onClick={reset}><Plus size={14} /> Nuevo</Button>
        </div>
        {loading ? (
          <div className="py-10 text-center text-muted-foreground"><Loader2 className="mx-auto animate-spin" /></div>
        ) : list.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Aún no hay testimonios. Crea el primero arriba.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((t) => (
              <li key={t.id} className="overflow-hidden rounded-lg border bg-background">
                <div className="aspect-[4/5] bg-muted">
                  {t.media_type === "video" ? (
                    <video src={t.media_url} poster={t.thumbnail_url ?? undefined} muted className="h-full w-full object-cover" />
                  ) : (
                    <img src={t.media_url} alt={t.author_name} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold truncate">{t.author_name}</p>
                    {!t.is_active && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Inactivo</span>}
                  </div>
                  {t.author_handle && <p className="text-xs text-muted-foreground truncate">@{t.author_handle}</p>}
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => startEdit(t)}>Editar</Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(t.id)}><Trash2 size={14} /></Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AdminTestimonials;
