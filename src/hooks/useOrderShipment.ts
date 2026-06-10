import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ShipmentStatus } from "@/lib/shalomStatus";

export type OrderShipment = {
  id: string;
  order_id: string;
  carrier_id: string | null;
  carrier_code: string;
  tracking_number: string | null;
  tracking_code: string | null;
  ose_id: string | null;
  status_internal: ShipmentStatus;
  status_external: string | null;
  origin_name: string | null;
  destination_name: string | null;
  registered_at: string | null;
  estimated_delivery_at: string | null;
  delivered_at: string | null;
  last_event_title: string | null;
  last_event_description: string | null;
  last_event_date: string | null;
  last_event_time: string | null;
  history_json: Array<{
    title?: string;
    description?: string;
    date?: string;
    time?: string;
    location?: string;
  }>;
  raw_response: any;
  last_checked_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export const useOrderShipment = (orderId: string | null | undefined) => {
  const [shipment, setShipment] = useState<OrderShipment | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!orderId) {
      setShipment(null);
      setLoading(false);
      return;
    }
    const { data } = await (supabase as any)
      .from("order_shipments")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle();
    setShipment((data as OrderShipment) ?? null);
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  return { shipment, loading, reload: load };
};

export const useOrderShipmentsMap = (orderIds: string[]) => {
  const [map, setMap] = useState<Record<string, OrderShipment>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (orderIds.length === 0) { setMap({}); setLoading(false); return; }
    (async () => {
      const { data } = await (supabase as any)
        .from("order_shipments")
        .select("*")
        .in("order_id", orderIds);
      if (!alive) return;
      const next: Record<string, OrderShipment> = {};
      (data ?? []).forEach((s: OrderShipment) => { next[s.order_id] = s; });
      setMap(next);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [orderIds.join("|")]);

  return { map, loading };
};
