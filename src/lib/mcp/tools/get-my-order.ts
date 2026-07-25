import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supa(ctx: ToolContext) {
  return createClient((globalThis as any).Deno.env.get("SUPABASE_URL"), (globalThis as any).Deno.env.get("SUPABASE_PUBLISHABLE_KEY"), {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_my_order",
  title: "Get order details",
  description: "Get details, items, and shipment tracking for one of the signed-in user's orders.",
  inputSchema: {
    order_id: z.string().uuid().describe("Order UUID from list_my_orders."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ order_id }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const s = supa(ctx);
    const [{ data: order, error: e1 }, { data: items, error: e2 }, { data: shipment }] = await Promise.all([
      s.from("orders").select("*").eq("id", order_id).maybeSingle(),
      s.from("order_items").select("*").eq("order_id", order_id),
      s.from("order_shipments").select("*").eq("order_id", order_id).maybeSingle(),
    ]);
    if (e1 || e2) return { content: [{ type: "text", text: (e1 ?? e2)!.message }], isError: true };
    if (!order) return { content: [{ type: "text", text: "Order not found" }], isError: true };
    const payload = { order, items: items ?? [], shipment: shipment ?? null };
    return { content: [{ type: "text", text: JSON.stringify(payload) }], structuredContent: payload };
  },
});
