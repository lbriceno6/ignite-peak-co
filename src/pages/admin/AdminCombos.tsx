import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Save, Upload } from "lucide-react";

const sb: any = supabase;

const NEED_TAGS = ["energia", "fitness", "digestion", "colageno", "sin-azucar", "bienestar", "promocion"];
const LOCATIONS = [
  { key: "product", label: "Página de producto" },
  { key: "cart", label: "Carrito" },
  { key: "checkout", label: "Checkout" },
  { key: "search", label: "Búsqueda" },
  { key: "home", label: "Home" },
  { key: "category", label: "Categorías" },
];

type Combo = any;
type Product = { id: string; name: string; slug: string; price: number; sale_price: number | null };

export default function AdminCombos() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Combos Inteligentes</h1>
        <p className="text-sm text-muted-foreground">
          Crea combos, define reglas automáticas y configura la IA que recomienda combos al cliente.
        </p>
      </div>

      <Tabs defaultValue="combos">
        <TabsList>
          <TabsTrigger value="combos">Combos</TabsTrigger>
          <TabsTrigger value="rules">Reglas</TabsTrigger>
          <TabsTrigger value="config">Configuración IA</TabsTrigger>
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
        </TabsList>
        <TabsContent value="combos" className="mt-4"><CombosTab /></TabsContent>
        <TabsContent value="rules" className="mt-4"><RulesTab /></TabsContent>
        <TabsContent value="config" className="mt-4"><ConfigTab /></TabsContent>
        <TabsContent value="metrics" className="mt-4"><MetricsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ============ COMBOS ============ */
function CombosTab() {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Combo | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await sb.from("combos").select("*").order("created_at", { ascending: false });
    setCombos(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex h-32 items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <Button onClick={() => setEditing({
        name: "", slug: "", description: "", image_url: "",
        price_normal: 0, price_combo: 0, discount_value: 0, discount_type: "amount",
        is_active: true, priority: "medium", need_tag: null, category_id: null,
        display_locations: ["product", "cart"],
      })}><Plus size={14} /> Nuevo combo</Button>

      <div className="grid gap-3">
        {combos.map((c) => (
          <Card key={c.id}>
            <CardContent className="flex items-center justify-between gap-3 p-3">
              <div className="flex items-center gap-3">
                {c.image_url && <img src={c.image_url} alt="" className="h-12 w-12 rounded object-cover" />}
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.is_active ? "Activo" : "Inactivo"} · Prioridad {c.priority} · {c.need_tag ?? "sin necesidad"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right text-sm">
                  <div className="line-through text-muted-foreground">S/{Number(c.price_normal).toFixed(2)}</div>
                  <div className="font-medium">S/{Number(c.price_combo).toFixed(2)}</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setEditing(c)}>Editar</Button>
                <Button variant="ghost" size="icon" onClick={async () => {
                  if (!confirm("¿Eliminar combo?")) return;
                  const { error } = await sb.from("combos").delete().eq("id", c.id);
                  if (error) return toast.error(error.message);
                  load();
                }}><Trash2 size={14} /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {combos.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay combos.</p>}
      </div>

      {editing && (
        <ComboForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function ComboForm({ initial, onClose, onSaved }: { initial: Combo; onClose: () => void; onSaved: () => void }) {
  const [c, setC] = useState<Combo>(initial);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<Array<{ product_id: string; quantity: number }>>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    sb.from("products").select("id,name,slug,price,sale_price").order("name").then(({ data }: any) => setProducts(data ?? []));
    if (initial.id) {
      sb.from("combo_products").select("product_id, quantity").eq("combo_id", initial.id).then(({ data }: any) => {
        setItems(data ?? []);
      });
    }
  }, [initial.id]);

  const computedNormal = useMemo(() => {
    return items.reduce((sum, it) => {
      const p = products.find((pp) => pp.id === it.product_id);
      if (!p) return sum;
      return sum + Number(p.sale_price ?? p.price) * it.quantity;
    }, 0);
  }, [items, products]);

  useEffect(() => {
    setC((x: Combo) => ({ ...x, price_normal: Number(computedNormal.toFixed(2)) }));
  }, [computedNormal]);

  const uploadImage = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `combo-${Date.now()}.${ext}`;
    const { error } = await sb.storage.from("combo-images").upload(path, file, { upsert: true });
    setUploading(false);
    if (error) return toast.error(error.message);
    const { data } = sb.storage.from("combo-images").getPublicUrl(path);
    setC((x: Combo) => ({ ...x, image_url: data.publicUrl }));
  };

  const save = async () => {
    if (!c.name || !c.slug) return toast.error("Nombre y slug son obligatorios");
    if (items.length === 0) return toast.error("Agrega al menos un producto");
    setSaving(true);
    const payload = {
      name: c.name, slug: c.slug, description: c.description, image_url: c.image_url,
      price_normal: c.price_normal, price_combo: c.price_combo,
      discount_value: c.discount_value, discount_type: c.discount_type,
      is_active: c.is_active, starts_at: c.starts_at || null, ends_at: c.ends_at || null,
      priority: c.priority, need_tag: c.need_tag, category_id: c.category_id,
      display_locations: c.display_locations,
    };
    let comboId = c.id as string | undefined;
    if (comboId) {
      const { error } = await sb.from("combos").update(payload).eq("id", comboId);
      if (error) { setSaving(false); return toast.error(error.message); }
    } else {
      const { data, error } = await sb.from("combos").insert(payload).select().single();
      if (error) { setSaving(false); return toast.error(error.message); }
      comboId = data.id;
    }
    // sync products
    await sb.from("combo_products").delete().eq("combo_id", comboId);
    if (items.length > 0) {
      await sb.from("combo_products").insert(items.map((i) => ({ ...i, combo_id: comboId })));
    }
    setSaving(false);
    toast.success("Combo guardado");
    onSaved();
  };

  return (
    <Card className="border-accent">
      <CardHeader>
        <CardTitle className="text-base">{initial.id ? "Editar combo" : "Nuevo combo"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>Nombre</Label><Input value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} /></div>
          <div><Label>Slug</Label><Input value={c.slug} onChange={(e) => setC({ ...c, slug: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Descripción corta</Label>
            <Textarea value={c.description ?? ""} onChange={(e) => setC({ ...c, description: e.target.value })} rows={2} />
          </div>
          <div>
            <Label>Imagen</Label>
            <div className="flex items-center gap-2">
              <Input value={c.image_url ?? ""} onChange={(e) => setC({ ...c, image_url: e.target.value })} placeholder="URL" />
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
                <Button asChild variant="outline" size="sm"><span>{uploading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}</span></Button>
              </label>
            </div>
          </div>
          <div>
            <Label>Necesidad</Label>
            <Select value={c.need_tag ?? "none"} onValueChange={(v) => setC({ ...c, need_tag: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin necesidad</SelectItem>
                {NEED_TAGS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Productos */}
        <div className="space-y-2 rounded-md border p-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Productos del combo</h4>
            <Button size="sm" variant="outline" onClick={() => setItems([...items, { product_id: products[0]?.id ?? "", quantity: 1 }])}>
              <Plus size={14} /> Agregar
            </Button>
          </div>
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-[1fr,80px,40px] items-end gap-2">
              <Select value={it.product_id} onValueChange={(v) => {
                const copy = [...items]; copy[idx] = { ...copy[idx], product_id: v }; setItems(copy);
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="number" min={1} value={it.quantity} onChange={(e) => {
                const copy = [...items]; copy[idx] = { ...copy[idx], quantity: parseInt(e.target.value || "1", 10) }; setItems(copy);
              }} />
              <Button variant="ghost" size="icon" onClick={() => setItems(items.filter((_, i) => i !== idx))}><Trash2 size={14} /></Button>
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-muted-foreground">Aún sin productos.</p>}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div><Label>Precio normal (auto)</Label><Input value={c.price_normal} readOnly /></div>
          <div><Label>Precio combo</Label><Input type="number" value={c.price_combo} onChange={(e) => setC({ ...c, price_combo: parseFloat(e.target.value || "0") })} /></div>
          <div><Label>Ahorro</Label><Input value={(Number(c.price_normal) - Number(c.price_combo)).toFixed(2)} readOnly /></div>
          <div>
            <Label>Tipo descuento</Label>
            <Select value={c.discount_type} onValueChange={(v: any) => setC({ ...c, discount_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="amount">S/ (monto)</SelectItem>
                <SelectItem value="percent">%</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Valor descuento</Label><Input type="number" value={c.discount_value} onChange={(e) => setC({ ...c, discount_value: parseFloat(e.target.value || "0") })} /></div>
          <div>
            <Label>Prioridad</Label>
            <Select value={c.priority} onValueChange={(v: any) => setC({ ...c, priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="low">Baja</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>Inicio</Label><Input type="datetime-local" value={c.starts_at ?? ""} onChange={(e) => setC({ ...c, starts_at: e.target.value })} /></div>
          <div><Label>Fin</Label><Input type="datetime-local" value={c.ends_at ?? ""} onChange={(e) => setC({ ...c, ends_at: e.target.value })} /></div>
        </div>

        <div>
          <Label>Mostrar en</Label>
          <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
            {LOCATIONS.map((l) => (
              <label key={l.key} className="flex items-center gap-2 text-sm">
                <Switch
                  checked={(c.display_locations ?? []).includes(l.key)}
                  onCheckedChange={(v) => {
                    const cur = new Set(c.display_locations ?? []);
                    v ? cur.add(l.key) : cur.delete(l.key);
                    setC({ ...c, display_locations: Array.from(cur) });
                  }}
                /> {l.label}
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <Switch checked={c.is_active} onCheckedChange={(v) => setC({ ...c, is_active: v })} /> Activo
        </label>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Guardar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============ RULES ============ */
function RulesTab() {
  const [rules, setRules] = useState<any[]>([]);
  const [combos, setCombos] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [r, c, p] = await Promise.all([
      sb.from("combo_rules").select("*").order("created_at", { ascending: false }),
      sb.from("combos").select("id,name"),
      sb.from("products").select("id,name"),
    ]);
    setRules(r.data ?? []); setCombos(c.data ?? []); setProducts(p.data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    const { error } = await sb.from("combo_rules").insert({
      combo_id: combos[0]?.id, rule_type: "view_product", is_active: true, priority: "medium",
    });
    if (error) return toast.error(error.message);
    load();
  };

  if (loading) return <div className="flex h-32 items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-3">
      <Button onClick={add} disabled={combos.length === 0}><Plus size={14} /> Nueva regla</Button>
      {rules.map((r) => (
        <Card key={r.id}>
          <CardContent className="grid gap-2 p-3 md:grid-cols-[1fr,1fr,1fr,1fr,auto]">
            <Select value={r.combo_id} onValueChange={async (v) => {
              await sb.from("combo_rules").update({ combo_id: v }).eq("id", r.id); load();
            }}>
              <SelectTrigger><SelectValue placeholder="Combo" /></SelectTrigger>
              <SelectContent>{combos.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={r.rule_type} onValueChange={async (v) => {
              await sb.from("combo_rules").update({ rule_type: v }).eq("id", r.id); load();
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="view_product">Si ve producto</SelectItem>
                <SelectItem value="cart_has_product">Si carrito tiene producto</SelectItem>
                <SelectItem value="cart_has_category">Si carrito tiene categoría</SelectItem>
                <SelectItem value="cart_min_total">Carrito en rango monto</SelectItem>
                <SelectItem value="free_shipping_gap">Falta para envío gratis</SelectItem>
                <SelectItem value="need_search">Búsqueda por necesidad</SelectItem>
              </SelectContent>
            </Select>
            {(r.rule_type === "view_product" || r.rule_type === "cart_has_product") ? (
              <Select value={r.product_id ?? ""} onValueChange={async (v) => {
                await sb.from("combo_rules").update({ product_id: v }).eq("id", r.id); load();
              }}>
                <SelectTrigger><SelectValue placeholder="Producto" /></SelectTrigger>
                <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            ) : r.rule_type === "need_search" ? (
              <Select value={r.need_tag ?? ""} onValueChange={async (v) => {
                await sb.from("combo_rules").update({ need_tag: v }).eq("id", r.id); load();
              }}>
                <SelectTrigger><SelectValue placeholder="Necesidad" /></SelectTrigger>
                <SelectContent>{NEED_TAGS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            ) : r.rule_type === "cart_min_total" ? (
              <div className="flex gap-1">
                <Input type="number" placeholder="Min" value={r.min_cart_total ?? ""} onChange={async (e) => {
                  await sb.from("combo_rules").update({ min_cart_total: e.target.value ? parseFloat(e.target.value) : null }).eq("id", r.id); load();
                }} />
                <Input type="number" placeholder="Max" value={r.max_cart_total ?? ""} onChange={async (e) => {
                  await sb.from("combo_rules").update({ max_cart_total: e.target.value ? parseFloat(e.target.value) : null }).eq("id", r.id); load();
                }} />
              </div>
            ) : <div />}
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={r.is_active} onCheckedChange={async (v) => {
                await sb.from("combo_rules").update({ is_active: v }).eq("id", r.id); load();
              }} /> Activa
            </label>
            <Button variant="ghost" size="icon" onClick={async () => {
              await sb.from("combo_rules").delete().eq("id", r.id); load();
            }}><Trash2 size={14} /></Button>
          </CardContent>
        </Card>
      ))}
      {rules.length === 0 && <p className="text-sm text-muted-foreground">Sin reglas. Las recomendaciones usarán prioridad y categoría.</p>}
    </div>
  );
}

/* ============ CONFIG ============ */
function ConfigTab() {
  const [cfg, setCfg] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    sb.from("combo_config").select("*").limit(1).maybeSingle().then(({ data }: any) => setCfg(data));
  }, []);

  if (!cfg) return <Loader2 className="animate-spin" />;

  const save = async () => {
    setSaving(true);
    const { id, ...rest } = cfg;
    const { error } = await sb.from("combo_config").update(rest).eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Configuración guardada");
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <label className="flex items-center gap-2"><Switch checked={cfg.ai_enabled} onCheckedChange={(v) => setCfg({ ...cfg, ai_enabled: v })} /> IA activada</label>
        <div>
          <Label>Proveedor IA</Label>
          <Select value={cfg.ai_provider ?? "gemini"} onValueChange={(v) => setCfg({ ...cfg, ai_provider: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gemini">Gemini (vía Lovable AI)</SelectItem>
              <SelectItem value="openai">OpenAI (vía Lovable AI)</SelectItem>
              <SelectItem value="claude">Claude (fallback Gemini)</SelectItem>
              <SelectItem value="deepseek">DeepSeek</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Prompt IA</Label>
          <Textarea rows={6} value={cfg.ai_prompt} onChange={(e) => setCfg({ ...cfg, ai_prompt: e.target.value })} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>Máx recomendaciones</Label><Input type="number" min={1} max={6} value={cfg.max_recommendations} onChange={(e) => setCfg({ ...cfg, max_recommendations: parseInt(e.target.value || "3", 10) })} /></div>
        </div>
        <div>
          <Label className="mb-2 block">Mostrar combos en</Label>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {LOCATIONS.map((l) => {
              const k = `show_in_${l.key}` as const;
              return (
                <label key={l.key} className="flex items-center gap-2 text-sm">
                  <Switch checked={!!cfg[k]} onCheckedChange={(v) => setCfg({ ...cfg, [k]: v })} /> {l.label}
                </label>
              );
            })}
          </div>
        </div>
        <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Guardar</Button>
      </CardContent>
    </Card>
  );
}

/* ============ METRICS ============ */
function MetricsTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: combos } = await sb.from("combos").select("id,name,stat_views,stat_cart_adds,stat_purchases,stat_revenue");
      const { data: events } = await sb.from("combo_events").select("combo_id, event_type, amount");
      const byCombo = new Map<string, any>();
      (combos ?? []).forEach((c: any) => byCombo.set(c.id, { ...c, views: 0, adds: 0, purchases: 0, revenue: 0 }));
      (events ?? []).forEach((e: any) => {
        const row = byCombo.get(e.combo_id);
        if (!row) return;
        if (e.event_type === "view") row.views += 1;
        if (e.event_type === "cart_add") row.adds += 1;
        if (e.event_type === "purchase") {
          row.purchases += 1;
          row.revenue += Number(e.amount ?? 0);
        }
      });
      setData(Array.from(byCombo.values()).sort((a, b) => b.views - a.views));
      setLoading(false);
    })();
  }, []);

  if (loading) return <Loader2 className="animate-spin" />;

  return (
    <Card>
      <CardContent className="p-4">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-xs text-muted-foreground">
            <th className="py-2">Combo</th><th>Vistas</th><th>Agregados</th><th>Comprados</th><th>Ingresos</th>
          </tr></thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="py-2">{r.name}</td>
                <td>{r.views}</td>
                <td>{r.adds}</td>
                <td>{r.purchases}</td>
                <td>S/{r.revenue.toFixed(2)}</td>
              </tr>
            ))}
            {data.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">Sin datos aún.</td></tr>}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
