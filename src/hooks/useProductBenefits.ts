import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type BenefitIcon =
  | "truck"
  | "shield"
  | "medal"
  | "lock"
  | "card"
  | "whatsapp"
  | "box"
  | "star";

export type ProductBenefit = {
  id: string;
  icon: BenefitIcon | string;
  title: string;
  subtitle: string | null;
  is_active: boolean;
  sort_order: number;
};

export const ICON_OPTIONS: { value: BenefitIcon; label: string }[] = [
  { value: "truck", label: "Camión / Envío" },
  { value: "shield", label: "Escudo / Garantía" },
  { value: "medal", label: "Medalla / Certificado" },
  { value: "lock", label: "Candado / Pago seguro" },
  { value: "card", label: "Tarjeta / Medios de pago" },
  { value: "whatsapp", label: "WhatsApp / Atención" },
  { value: "box", label: "Caja / Producto" },
  { value: "star", label: "Estrella / Recomendado" },
];

export const DEFAULT_BENEFITS: Omit<ProductBenefit, "id">[] = [
  { icon: "truck", title: "Envío gratis sobre S/ 50.00", subtitle: "Entrega 1–3 días", is_active: true, sort_order: 1 },
  { icon: "shield", title: "Garantía de devolución", subtitle: "30 días", is_active: true, sort_order: 2 },
  { icon: "medal", title: "Producto certificado", subtitle: "Probado en laboratorio · Certificado GMP", is_active: true, sort_order: 3 },
  { icon: "whatsapp", title: "Atención por WhatsApp", subtitle: "Te ayudamos antes de comprar", is_active: true, sort_order: 4 },
];

export const useProductBenefits = (activeOnly = true) => {
  const [benefits, setBenefits] = useState<ProductBenefit[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("product_benefits" as any).select("*").order("sort_order");
    if (activeOnly) q = q.eq("is_active", true);
    const { data } = await q;
    setBenefits((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [activeOnly]);

  return { benefits, loading, reload: load };
};
