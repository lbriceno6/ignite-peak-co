import { useEffect, useState } from "react";
import { PolicyPage } from "./PolicyPage";
import { useSiteContent } from "@/hooks/useSiteContent";
import { supabase } from "@/integrations/supabase/client";

const KEYS = [
  "shipping_policy_intro",
  "shipping_policy_times_title",
  "shipping_policy_times",
  "shipping_policy_responsibility_title",
  "shipping_policy_responsibility",
  "shipping_policy_confirmation_title",
  "shipping_policy_confirmation",
  "shipping_providers_title",
];

const defaults = {
  shipping_policy_intro: "Hacemos entregas en Lima y provincias, trabajando con transportistas de confianza para mantener tus suplementos frescos y protegidos.",
  shipping_policy_times_title: "Tiempos de entrega",
  shipping_policy_times: "Lima Metropolitana: 1–3 días hábiles.\nProvincias: 3–7 días hábiles según la ciudad.",
  shipping_policy_responsibility_title: "Responsabilidad del cliente",
  shipping_policy_responsibility: "El cliente debe ingresar información de envío precisa al pagar. Voltra no se responsabiliza por retrasos causados por direcciones incorrectas o datos de contacto inaccesibles.",
  shipping_policy_confirmation_title: "Confirmación",
  shipping_policy_confirmation: "La confirmación del pedido y las actualizaciones de seguimiento se envían por WhatsApp o correo.",
  shipping_providers_title: "Transportistas con los que trabajamos",
};

type Provider = { id: string; name: string; cost: number; estimated_days: string | null; zones: string | null };

export default function Shipping() {
  const { content } = useSiteContent(KEYS, defaults);
  const [providers, setProviders] = useState<Provider[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("shipping_providers")
        .select("id,name,cost,estimated_days,zones")
        .eq("is_active", true)
        .order("sort_order");
      setProviders((data as Provider[]) ?? []);
    })();
  }, []);

  const times = (content.shipping_policy_times ?? "").split("\n").filter(Boolean);

  return (
    <PolicyPage title="Política de envío">
      <p>{content.shipping_policy_intro}</p>

      <h2>{content.shipping_policy_times_title}</h2>
      <ul>
        {times.map((t, i) => <li key={i}>{t}</li>)}
      </ul>

      <h2>{content.shipping_policy_responsibility_title}</h2>
      <p>{content.shipping_policy_responsibility}</p>

      <h2>{content.shipping_policy_confirmation_title}</h2>
      <p>{content.shipping_policy_confirmation}</p>

      {providers.length > 0 && (
        <>
          <h2>{content.shipping_providers_title}</h2>
          <ul>
            {providers.map((p) => (
              <li key={p.id}>
                <strong className="text-foreground">{p.name}</strong>
                {p.estimated_days ? ` · ${p.estimated_days}` : ""}
                {p.zones ? ` · ${p.zones}` : ""}
                {Number(p.cost) > 0 ? ` · desde S/ ${Number(p.cost).toFixed(2)}` : ""}
              </li>
            ))}
          </ul>
        </>
      )}
    </PolicyPage>
  );
}
