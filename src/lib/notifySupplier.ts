import { supabase } from "@/integrations/supabase/client";

export type SupplierNotifyEvent = "new" | "resubmit" | "approved" | "rejected" | "suspended";

export const notifySupplierEvent = async (
  event: SupplierNotifyEvent,
  supplier_id: string,
  reason?: string,
) => {
  try {
    await supabase.functions.invoke("notify-supplier-event", {
      body: { event, supplier_id, reason },
    });
  } catch (e) {
    // Non-blocking: log only
    console.warn("notify-supplier-event failed", e);
  }
};
