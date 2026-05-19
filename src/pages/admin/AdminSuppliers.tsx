import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Package } from "lucide-react";

type Supplier = {
  id: string;
  business_name: string;
  commercial_name: string | null;
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
};

const empty: Omit<Supplier, "id"> = {
  business_name: "", commercial_name: "", tax_id: "", contact_name: "",
  email: "", phone: "", website: "", address: "", city: "", country: "",
  payment_terms: "", notes: "", is_active: true,
};

export default function AdminSuppliers() {
  const [items, setItems] = useState<Supplier[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [f, setF] = useState<any>(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("suppliers").select("*").order("business_name");
    setItems((data as Supplier[]) ?? []);
    const { data: prods } = await supabase.from("products").select("supplier_id");
    const c: Record<string, number> = {};
    (prods ?? []).forEach((p: any) => { if (p.supplier_id) c[p.supplier_id] = (c[p.supplier_id] || 0) + 1; });
    setCounts(c);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setF(empty); setOpen(true); };
  const openEdit = (s: Supplier) => { setEditing(s); setF(s); setOpen(true); };
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!f.business_name?.trim()) { toast.error("Business name is required"); return; }
    setSaving(true);
    const payload = { ...f };
    delete payload.id;
    const res = editing
      ? await supabase.from("suppliers").update(payload).eq("id", editing.id)
      : await supabase.from("suppliers").insert(payload);
    setSaving(false);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(editing ? "Supplier updated" : "Supplier created");
    setOpen(false);
    load();
  };

  const remove = async (s: Supplier) => {
    if (!confirm(`Delete supplier "${s.business_name}"? Linked products will be unlinked.`)) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Supplier deleted");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">Suppliers</h1>
          <p className="text-sm text-muted-foreground">Manage providers and link them to products.</p>
        </div>
        <Button variant="dark" onClick={openNew}><Plus size={16} /> New supplier</Button>
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business</TableHead>
              <TableHead>Tax ID</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>City / Country</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Loading…</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No suppliers yet.</TableCell></TableRow>
            ) : items.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="font-medium">{s.business_name}</div>
                  {s.commercial_name && <div className="text-xs text-muted-foreground">{s.commercial_name}</div>}
                </TableCell>
                <TableCell className="font-mono text-xs">{s.tax_id || "—"}</TableCell>
                <TableCell>
                  <div>{s.contact_name || "—"}</div>
                  {s.email && <div className="text-xs text-muted-foreground">{s.email}</div>}
                </TableCell>
                <TableCell>{s.phone || "—"}</TableCell>
                <TableCell>{[s.city, s.country].filter(Boolean).join(", ") || "—"}</TableCell>
                <TableCell><Badge variant="secondary"><Package size={12} className="mr-1" />{counts[s.id] || 0}</Badge></TableCell>
                <TableCell>
                  <Badge variant={s.is_active ? "default" : "outline"}>{s.is_active ? "Active" : "Inactive"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil size={14} /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(s)}><Trash2 size={14} /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit supplier" : "New supplier"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Fld label="Business name *"><Input value={f.business_name ?? ""} onChange={(e) => set("business_name", e.target.value)} /></Fld>
              <Fld label="Commercial name"><Input value={f.commercial_name ?? ""} onChange={(e) => set("commercial_name", e.target.value)} /></Fld>
              <Fld label="RUC / Tax ID"><Input value={f.tax_id ?? ""} onChange={(e) => set("tax_id", e.target.value)} /></Fld>
              <Fld label="Contact name"><Input value={f.contact_name ?? ""} onChange={(e) => set("contact_name", e.target.value)} /></Fld>
              <Fld label="Email"><Input type="email" value={f.email ?? ""} onChange={(e) => set("email", e.target.value)} /></Fld>
              <Fld label="Phone"><Input value={f.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></Fld>
              <Fld label="Website"><Input value={f.website ?? ""} onChange={(e) => set("website", e.target.value)} /></Fld>
              <Fld label="Payment terms"><Input placeholder="e.g. Net 30" value={f.payment_terms ?? ""} onChange={(e) => set("payment_terms", e.target.value)} /></Fld>
            </div>
            <Fld label="Address"><Input value={f.address ?? ""} onChange={(e) => set("address", e.target.value)} /></Fld>
            <div className="grid gap-4 sm:grid-cols-2">
              <Fld label="City"><Input value={f.city ?? ""} onChange={(e) => set("city", e.target.value)} /></Fld>
              <Fld label="Country"><Input value={f.country ?? ""} onChange={(e) => set("country", e.target.value)} /></Fld>
            </div>
            <Fld label="Notes"><Textarea rows={3} value={f.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></Fld>
            <div className="flex items-center gap-3">
              <Switch checked={!!f.is_active} onCheckedChange={(v) => set("is_active", v)} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="dark" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const Fld = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5"><Label>{label}</Label>{children}</div>
);
