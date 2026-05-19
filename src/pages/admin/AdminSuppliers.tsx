import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Package, CheckCircle2, XCircle, Clock, Ban } from "lucide-react";

type Supplier = {
  id: string;
  user_id: string | null;
  business_name: string;
  commercial_name: string | null;
  slug: string | null;
  tax_id: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  payment_terms: string | null;
  notes: string | null;
  is_active: boolean;
  status: string;
  publish_mode: string;
  commission_percent: number;
  description: string | null;
};

const empty: any = {
  business_name: "", commercial_name: "", tax_id: "", contact_name: "",
  email: "", phone: "", website: "", address: "", city: "", country: "",
  payment_terms: "", notes: "", is_active: true,
  status: "approved", publish_mode: "direct", commission_percent: 15, description: "",
};

const STATUS_BADGE: Record<string, { label: string; cls: string; Icon: any }> = {
  pending:   { label: "Pendiente",  cls: "bg-amber-100 text-amber-900",     Icon: Clock },
  approved:  { label: "Aprobado",   cls: "bg-emerald-100 text-emerald-900", Icon: CheckCircle2 },
  suspended: { label: "Suspendido", cls: "bg-rose-100 text-rose-900",       Icon: Ban },
  rejected:  { label: "Rechazado",  cls: "bg-rose-100 text-rose-900",       Icon: XCircle },
};

type PendingProduct = {
  id: string; name: string; slug: string; price: number;
  main_image: string | null; supplier_id: string;
  created_at: string; approval_status: string;
};

export default function AdminSuppliers() {
  const [items, setItems] = useState<Supplier[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [pending, setPending] = useState<PendingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [f, setF] = useState<any>(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [sRes, pRes, pendRes] = await Promise.all([
      supabase.from("suppliers").select("*").order("status").order("business_name"),
      supabase.from("products").select("supplier_id"),
      supabase.from("products")
        .select("id,name,slug,price,main_image,supplier_id,created_at,approval_status")
        .eq("approval_status", "pending")
        .order("created_at", { ascending: false }),
    ]);
    setItems((sRes.data as Supplier[]) ?? []);
    const c: Record<string, number> = {};
    (pRes.data ?? []).forEach((p: any) => { if (p.supplier_id) c[p.supplier_id] = (c[p.supplier_id] || 0) + 1; });
    setCounts(c);
    setPending((pendRes.data as PendingProduct[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setF(empty); setOpen(true); };
  const openEdit = (s: Supplier) => { setEditing(s); setF(s); setOpen(true); };
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!f.business_name?.trim()) { toast.error("El nombre comercial es obligatorio"); return; }
    setSaving(true);
    const payload = { ...f };
    delete payload.id;
    const res = editing
      ? await supabase.from("suppliers").update(payload).eq("id", editing.id)
      : await supabase.from("suppliers").insert(payload);
    setSaving(false);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(editing ? "Proveedor actualizado" : "Proveedor creado");
    setOpen(false);
    load();
  };

  const setStatus = async (s: Supplier, status: string) => {
    const { error } = await supabase.from("suppliers").update({ status }).eq("id", s.id);
    if (error) return toast.error(error.message);
    if (status === "approved" && s.user_id) {
      await supabase.from("user_roles").upsert(
        { user_id: s.user_id, role: "supplier" as any },
        { onConflict: "user_id,role" } as any,
      );
    }
    toast.success(`Proveedor ${status === "approved" ? "aprobado" : status === "suspended" ? "suspendido" : "actualizado"}`);
    load();
  };

  const setPublishMode = async (s: Supplier, mode: string) => {
    const { error } = await supabase.from("suppliers").update({ publish_mode: mode }).eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success(`Modo: ${mode === "direct" ? "publicación directa" : "revisión por admin"}`);
    load();
  };

  const setCommission = async (s: Supplier, pct: number) => {
    const { error } = await supabase.from("suppliers").update({ commission_percent: pct }).eq("id", s.id);
    if (error) return toast.error(error.message);
    load();
  };

  const reviewProduct = async (id: string, decision: "approved" | "rejected", reason?: string) => {
    const { error } = await supabase.from("products")
      .update({ approval_status: decision, rejection_reason: reason ?? null })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(decision === "approved" ? "Producto aprobado" : "Producto rechazado");
    load();
  };

  const remove = async (s: Supplier) => {
    if (!confirm(`¿Eliminar proveedor "${s.business_name}"? Sus productos quedarán sin proveedor.`)) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Proveedor eliminado");
    load();
  };

  const supplierName = (id: string) => items.find((s) => s.id === id)?.business_name ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">Proveedores</h1>
          <p className="text-sm text-muted-foreground">Aprueba marcas, fija comisiones y decide quién publica directo.</p>
        </div>
        <Button variant="dark" onClick={openNew}><Plus size={16} /> Nuevo proveedor</Button>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Proveedores ({items.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Productos pendientes {pending.length > 0 && <Badge variant="destructive" className="ml-2">{pending.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <div className="rounded-lg border bg-background overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Modo de publicación</TableHead>
                  <TableHead>Comisión %</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Cargando…</TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Sin proveedores.</TableCell></TableRow>
                ) : items.map((s) => {
                  const st = STATUS_BADGE[s.status] ?? STATUS_BADGE.pending;
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="font-medium">{s.business_name}</div>
                        <div className="text-xs text-muted-foreground">{s.email || s.contact_name || "—"}</div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${st.cls}`}>
                          <st.Icon size={12} /> {st.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Select value={s.publish_mode} onValueChange={(v) => setPublishMode(s, v)}>
                          <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="direct">Publica directo</SelectItem>
                            <SelectItem value="review">Requiere revisión</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number" min={0} max={100} step="0.5"
                          className="h-8 w-20"
                          defaultValue={s.commission_percent}
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (v !== s.commission_percent) setCommission(s, v);
                          }}
                        />
                      </TableCell>
                      <TableCell><Badge variant="secondary"><Package size={12} className="mr-1" />{counts[s.id] || 0}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {s.status !== "approved" && (
                            <Button variant="ghost" size="sm" onClick={() => setStatus(s, "approved")} title="Aprobar">
                              <CheckCircle2 size={14} className="text-emerald-600" />
                            </Button>
                          )}
                          {s.status === "approved" && (
                            <Button variant="ghost" size="sm" onClick={() => setStatus(s, "suspended")} title="Suspender">
                              <Ban size={14} className="text-rose-600" />
                            </Button>
                          )}
                          {s.status === "pending" && (
                            <Button variant="ghost" size="sm" onClick={() => setStatus(s, "rejected")} title="Rechazar">
                              <XCircle size={14} className="text-rose-600" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil size={14} /></Button>
                          <Button variant="ghost" size="icon" onClick={() => remove(s)}><Trash2 size={14} /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <div className="rounded-lg border bg-background">
            {pending.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No hay productos pendientes de aprobación.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Enviado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {p.main_image && <img src={p.main_image} alt="" className="h-10 w-10 rounded object-cover" />}
                          <div>
                            <div className="font-medium">{p.name}</div>
                            <div className="text-xs text-muted-foreground">/{p.slug}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{supplierName(p.supplier_id)}</TableCell>
                      <TableCell>${p.price}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-emerald-600" onClick={() => reviewProduct(p.id, "approved")}>
                          <CheckCircle2 size={14} /> Aprobar
                        </Button>
                        <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => {
                          const reason = prompt("Motivo de rechazo (opcional):") ?? undefined;
                          reviewProduct(p.id, "rejected", reason);
                        }}>
                          <XCircle size={14} /> Rechazar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Fld label="Nombre comercial *"><Input value={f.business_name ?? ""} onChange={(e) => set("business_name", e.target.value)} /></Fld>
              <Fld label="Slug público"><Input value={f.slug ?? ""} onChange={(e) => set("slug", e.target.value)} /></Fld>
              <Fld label="Contacto"><Input value={f.contact_name ?? ""} onChange={(e) => set("contact_name", e.target.value)} /></Fld>
              <Fld label="Email"><Input type="email" value={f.email ?? ""} onChange={(e) => set("email", e.target.value)} /></Fld>
              <Fld label="Teléfono"><Input value={f.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></Fld>
              <Fld label="RUC / NIF"><Input value={f.tax_id ?? ""} onChange={(e) => set("tax_id", e.target.value)} /></Fld>
              <Fld label="Estado">
                <Select value={f.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="approved">Aprobado</SelectItem>
                    <SelectItem value="suspended">Suspendido</SelectItem>
                    <SelectItem value="rejected">Rechazado</SelectItem>
                  </SelectContent>
                </Select>
              </Fld>
              <Fld label="Modo de publicación">
                <Select value={f.publish_mode} onValueChange={(v) => set("publish_mode", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct">Publica directo</SelectItem>
                    <SelectItem value="review">Requiere revisión</SelectItem>
                  </SelectContent>
                </Select>
              </Fld>
              <Fld label="Comisión %"><Input type="number" min={0} max={100} step="0.5" value={f.commission_percent ?? 15} onChange={(e) => set("commission_percent", Number(e.target.value))} /></Fld>
            </div>
            <Fld label="Descripción"><Textarea rows={3} value={f.description ?? ""} onChange={(e) => set("description", e.target.value)} /></Fld>
            <div className="flex items-center gap-3">
              <Switch checked={!!f.is_active} onCheckedChange={(v) => set("is_active", v)} />
              <Label>Activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="dark" onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const Fld = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5"><Label>{label}</Label>{children}</div>
);
