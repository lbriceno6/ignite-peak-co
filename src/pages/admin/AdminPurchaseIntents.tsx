import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, Save, Target, Sparkles, Wand2, AlertTriangle } from "lucide-react";

const CTA_SUGGESTIONS: Record<string, string> = {
  energia: "/objetivo/energia",
  colageno: "/categoria/colagenos",
  fitness: "/objetivo/fitness",
  digestion: "/objetivo/digestion",
  articulaciones: "/objetivo/articulaciones",
  bienestar: "/productos",
  "masa-muscular": "/objetivo/masa-muscular",
  "control-peso": "/objetivo/control-peso",
  defensas: "/objetivo/defensas",
  belleza: "/objetivo/belleza",
};

const PRIORITY_SLUGS = ["energia", "colageno", "fitness", "digestion", "articulaciones", "bienestar"];

type Intent = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  keywords: string[];
  product_ids: string[];
  category_slugs: string[];
  pack_ids: string[];
  banner_image: string | null;
  title: string | null;
  subtitle: string | null;
  cta_text: string | null;
  cta_url: string | null;
  priority: number;
  is_active: boolean;
};

const empty = (): Partial<Intent> => ({
  name: "",
  slug: "",
  description: "",
  keywords: [],
  product_ids: [],
  category_slugs: [],
  pack_ids: [],
  banner_image: "",
  title: "",
  subtitle: "",
  cta_text: "",
  cta_url: "",
  priority: 100,
  is_active: true,
});

const slugify = (s: string) =>
  s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export default function AdminPurchaseIntents() {
  const [list, setList] = useState<Intent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Intent> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("purchase_intents" as any)
      .select("*")
      .order("priority");
    setList(((data as any) ?? []) as Intent[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.name || !editing?.slug) {
      toast.error("Nombre y slug son obligatorios");
      return;
    }
    setSaving(true);
    const payload: any = { ...editing };
    if (typeof payload.keywords === "string") {
      payload.keywords = payload.keywords.split(",").map((s: string) => s.trim()).filter(Boolean);
    }
    const { error } = editing.id
      ? await supabase.from("purchase_intents" as any).update(payload).eq("id", editing.id)
      : await supabase.from("purchase_intents" as any).insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Intención guardada");
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar esta intención?")) return;
    const { error } = await supabase.from("purchase_intents" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Eliminada");
    load();
  };

  const toggleActive = async (it: Intent) => {
    await supabase
      .from("purchase_intents" as any)
      .update({ is_active: !it.is_active })
      .eq("id", it.id);
    load();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="text-primary" />
          <h1 className="font-display text-3xl">Intenciones de compra</h1>
        </div>
        <Button onClick={() => setEditing(empty())}>
          <Plus className="mr-2 h-4 w-4" /> Nueva intención
        </Button>
      </div>
      <p className="text-muted-foreground">
        Las intenciones permiten a la IA y al buscador inteligente mapear lo que busca el cliente
        ("energía", "colágeno", "fitness"…) a productos, categorías y mensajes reales del catálogo.
      </p>

      {loading ? (
        <div className="text-muted-foreground">Cargando…</div>
      ) : (
        <div className="grid gap-3">
          {list.map((it) => (
            <Card key={it.id} className="p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{it.name}</span>
                  <span className="text-xs text-muted-foreground">/{it.slug}</span>
                  <span className="text-xs rounded bg-muted px-1.5 py-0.5">
                    prioridad {it.priority}
                  </span>
                </div>
                {it.keywords?.length > 0 && (
                  <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    Palabras clave: {it.keywords.join(", ")}
                  </div>
                )}
                {it.title && (
                  <div className="mt-1 text-sm">{it.title}</div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch checked={it.is_active} onCheckedChange={() => toggleActive(it)} />
                <Button variant="outline" size="sm" onClick={() => setEditing(it)}>Editar</Button>
                <Button variant="ghost" size="sm" onClick={() => remove(it.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
          {list.length === 0 && (
            <div className="text-muted-foreground text-sm">No hay intenciones todavía.</div>
          )}
        </div>
      )}

      {editing && (
        <Card className="p-6 space-y-4 border-primary/40">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">
              {editing.id ? "Editar intención" : "Nueva intención"}
            </h2>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input
                value={editing.name ?? ""}
                onChange={(e) => setEditing((p) => ({
                  ...p!,
                  name: e.target.value,
                  slug: p?.slug || slugify(e.target.value),
                }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input
                value={editing.slug ?? ""}
                onChange={(e) => setEditing((p) => ({ ...p!, slug: slugify(e.target.value) }))}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Palabras clave (separadas por coma)</Label>
              <Input
                value={Array.isArray(editing.keywords) ? editing.keywords.join(", ") : (editing.keywords as any) ?? ""}
                onChange={(e) => setEditing((p) => ({ ...p!, keywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))}
                placeholder="maca, energia, vitalidad"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Título del banner</Label>
              <Input
                value={editing.title ?? ""}
                onChange={(e) => setEditing((p) => ({ ...p!, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Subtítulo</Label>
              <Input
                value={editing.subtitle ?? ""}
                onChange={(e) => setEditing((p) => ({ ...p!, subtitle: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Imagen del banner (URL)</Label>
              <Input
                value={editing.banner_image ?? ""}
                onChange={(e) => setEditing((p) => ({ ...p!, banner_image: e.target.value }))}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Texto del CTA</Label>
              <Input
                value={editing.cta_text ?? ""}
                onChange={(e) => setEditing((p) => ({ ...p!, cta_text: e.target.value }))}
                placeholder="Ver productos para energía"
              />
            </div>
            <div className="space-y-1.5">
              <Label>URL del CTA</Label>
              <Input
                value={editing.cta_url ?? ""}
                onChange={(e) => setEditing((p) => ({ ...p!, cta_url: e.target.value }))}
                placeholder="/buscar?necesidad=energia"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Categorías relacionadas (slugs, coma)</Label>
              <Input
                value={(editing.category_slugs ?? []).join(", ")}
                onChange={(e) => setEditing((p) => ({ ...p!, category_slugs: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))}
                placeholder="superalimentos, energia"
              />
            </div>
            <div className="space-y-1.5">
              <Label>IDs de productos asociados (coma)</Label>
              <Input
                value={(editing.product_ids ?? []).join(", ")}
                onChange={(e) => setEditing((p) => ({ ...p!, product_ids: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))}
                placeholder="uuid1, uuid2"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Prioridad</Label>
              <Input
                type="number"
                value={editing.priority ?? 100}
                onChange={(e) => setEditing((p) => ({ ...p!, priority: Number(e.target.value) || 100 }))}
              />
            </div>
            <div className="flex items-center justify-between sm:col-span-2 rounded-md border p-3">
              <Label>Activa</Label>
              <Switch
                checked={!!editing.is_active}
                onCheckedChange={(v) => setEditing((p) => ({ ...p!, is_active: v }))}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Descripción interna</Label>
              <Textarea
                rows={3}
                value={editing.description ?? ""}
                onChange={(e) => setEditing((p) => ({ ...p!, description: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Guardando…" : "Guardar intención"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
