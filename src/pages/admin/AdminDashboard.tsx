import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  ShoppingCart,
  Clock,
  Package,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";

type Stats = {
  sales: number;
  orders: number;
  pending: number;
  activeProducts: number;
  salesChange: number;
  ordersChange: number;
};

const statusTone: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  preparing: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  shipped: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  delivered: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  cancelled: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    sales: 0,
    orders: 0,
    pending: 0,
    activeProducts: 0,
    salesChange: 0,
    ordersChange: 0,
  });
  const [recent, setRecent] = useState<any[]>([]);
  const [best, setBest] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: orders } = await supabase
        .from("orders")
        .select("id,total,status,order_code,created_at,shipping_name");
      const { count: activeProducts } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);
      const { data: items } = await supabase
        .from("order_items")
        .select("product_name,product_slug,quantity,product_image");

      const all = orders ?? [];
      const now = new Date();
      const monthAgo = new Date(now.getTime() - 30 * 86400000);
      const prevMonth = new Date(now.getTime() - 60 * 86400000);
      const thisPeriod = all.filter((o: any) => new Date(o.created_at) >= monthAgo);
      const prevPeriod = all.filter(
        (o: any) =>
          new Date(o.created_at) >= prevMonth && new Date(o.created_at) < monthAgo,
      );
      const sumT = thisPeriod.reduce((s, o: any) => s + Number(o.total || 0), 0);
      const sumP = prevPeriod.reduce((s, o: any) => s + Number(o.total || 0), 0);
      const pct = (a: number, b: number) =>
        b === 0 ? (a > 0 ? 100 : 0) : ((a - b) / b) * 100;

      const sales = all.reduce((s, o: any) => s + Number(o.total || 0), 0);
      const pending = all.filter((o: any) => o.status === "pending").length;
      setStats({
        sales,
        orders: all.length,
        pending,
        activeProducts: activeProducts ?? 0,
        salesChange: pct(sumT, sumP),
        ordersChange: pct(thisPeriod.length, prevPeriod.length),
      });
      setRecent(
        all
          .slice()
          .sort((a: any, b: any) => +new Date(b.created_at) - +new Date(a.created_at))
          .slice(0, 6),
      );

      const map = new Map<string, { name: string; slug: string; image: string; qty: number }>();
      (items ?? []).forEach((i: any) => {
        const cur =
          map.get(i.product_slug) ?? {
            name: i.product_name,
            slug: i.product_slug,
            image: i.product_image,
            qty: 0,
          };
        cur.qty += i.quantity;
        map.set(i.product_slug, cur);
      });
      setBest([...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 5));
    })();
  }, []);

  const cards = [
    {
      title: "Total revenue",
      value: `$${stats.sales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: stats.salesChange,
      icon: DollarSign,
      sub: "vs previous 30 days",
    },
    {
      title: "Total orders",
      value: stats.orders.toLocaleString(),
      change: stats.ordersChange,
      icon: ShoppingCart,
      sub: "vs previous 30 days",
    },
    {
      title: "Pending orders",
      value: stats.pending.toLocaleString(),
      change: 0,
      icon: Clock,
      sub: "awaiting confirmation",
      hideTrend: true,
    },
    {
      title: "Active products",
      value: stats.activeProducts.toLocaleString(),
      change: 0,
      icon: Package,
      sub: "currently published",
      hideTrend: true,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your store performance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const up = c.change >= 0;
          return (
            <Card key={c.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {c.title}
                </CardTitle>
                <c.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">{c.value}</div>
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  {!c.hideTrend &&
                    (up ? (
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-rose-500" />
                    ))}
                  {!c.hideTrend && (
                    <span className={up ? "text-emerald-600" : "text-rose-600"}>
                      {up ? "+" : ""}
                      {c.change.toFixed(1)}%
                    </span>
                  )}
                  <span>{c.sub}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent orders</CardTitle>
            <Link
              to="/admin/orders"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              View all <ArrowRight size={12} />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recent.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 font-medium">Order</th>
                      <th className="px-4 py-2 font-medium">Customer</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((o) => (
                      <tr key={o.id} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <Link
                            to={`/admin/orders/${o.id}`}
                            className="font-medium hover:underline"
                          >
                            {o.order_code}
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            {new Date(o.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-4 py-3">{o.shipping_name ?? "—"}</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="secondary"
                            className={`capitalize ${statusTone[o.status] ?? ""}`}
                          >
                            {o.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          ${Number(o.total).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Best sellers</CardTitle>
            <Link
              to="/admin/products"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              All products <ArrowRight size={12} />
            </Link>
          </CardHeader>
          <CardContent>
            {best.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales data yet.</p>
            ) : (
              <ul className="space-y-3">
                {best.map((p, idx) => (
                  <li key={p.slug} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                      {idx + 1}
                    </span>
                    {p.image && (
                      <img
                        src={p.image}
                        alt=""
                        className="h-10 w-10 rounded object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.qty} sold</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
