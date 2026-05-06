import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Stats = { sales: number; orders: number; pending: number; activeProducts: number };

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ sales: 0, orders: 0, pending: 0, activeProducts: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [best, setBest] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: orders } = await supabase.from("orders").select("id,total,status,order_code,created_at,shipping_name");
      const { count: activeProducts } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true);
      const { data: items } = await supabase.from("order_items").select("product_name,product_slug,quantity,product_image");

      const sales = (orders ?? []).reduce((s, o: any) => s + Number(o.total || 0), 0);
      const pending = (orders ?? []).filter((o: any) => o.status === "pending").length;
      setStats({ sales, orders: orders?.length ?? 0, pending, activeProducts: activeProducts ?? 0 });
      setRecent((orders ?? []).sort((a: any, b: any) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 5));

      const map = new Map<string, { name: string; slug: string; image: string; qty: number }>();
      (items ?? []).forEach((i: any) => {
        const cur = map.get(i.product_slug) ?? { name: i.product_name, slug: i.product_slug, image: i.product_image, qty: 0 };
        cur.qty += i.quantity;
        map.set(i.product_slug, cur);
      });
      setBest([...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 5));
    })();
  }, []);

  const cards = [
    { label: "Total sales", value: `$${stats.sales.toFixed(2)}` },
    { label: "Orders", value: stats.orders },
    { label: "Pending orders", value: stats.pending },
    { label: "Active products", value: stats.activeProducts },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your store performance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{c.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Recent orders</CardTitle></CardHeader>
          <CardContent>
            {recent.length === 0 && <p className="text-sm text-muted-foreground">No orders yet.</p>}
            <ul className="divide-y">
              {recent.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-3 text-sm">
                  <Link to={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.order_code}</Link>
                  <span className="text-muted-foreground">{o.shipping_name}</span>
                  <span className="capitalize">{o.status}</span>
                  <span className="font-semibold">${Number(o.total).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Best sellers</CardTitle></CardHeader>
          <CardContent>
            {best.length === 0 && <p className="text-sm text-muted-foreground">No sales data yet.</p>}
            <ul className="divide-y">
              {best.map((p) => (
                <li key={p.slug} className="flex items-center gap-3 py-3 text-sm">
                  {p.image && <img src={p.image} alt="" className="h-10 w-10 rounded object-cover" />}
                  <span className="flex-1 font-medium">{p.name}</span>
                  <span className="text-muted-foreground">{p.qty} sold</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
