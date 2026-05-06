import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

export default function AdminCustomers() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      const { data: orders } = await supabase.from("orders").select("user_id");
      const counts: Record<string, number> = {};
      (orders ?? []).forEach((o: any) => { counts[o.user_id] = (counts[o.user_id] ?? 0) + 1; });
      setRows((profiles ?? []).map((p: any) => ({ ...p, orders: counts[p.id] ?? 0 })));
    })();
  }, []);

  const filtered = rows.filter((r) =>
    !q || (r.full_name ?? "").toLowerCase().includes(q.toLowerCase()) || (r.email ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Customers</h1>
      <Input placeholder="Search by name or email…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Phone</th><th className="p-3">Orders</th><th className="p-3">Registered</th></tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3 font-medium">{c.full_name || "—"}</td>
                <td className="p-3">{c.email}</td>
                <td className="p-3">{c.phone || "—"}</td>
                <td className="p-3">{c.orders}</td>
                <td className="p-3">{new Date(c.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No customers</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
