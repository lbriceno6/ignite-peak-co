import { Truck, ShieldCheck, MessageCircle, Tag } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";

export const AnnouncementBar = () => {
  const { format } = useCurrency();
  const items = [
    { icon: Truck, text: `Envío gratis en pedidos sobre ${format(50)}` },
    { icon: ShieldCheck, text: "Pago seguro · 100% protegido" },
    { icon: MessageCircle, text: "Soporte por WhatsApp los 7 días" },
    { icon: Tag, text: "Código FUEL10 — 10% en tu primer pedido" },
  ];
  return (
    <div className="bg-foreground text-background overflow-hidden">
      <div className="flex animate-ticker whitespace-nowrap py-2 text-xs">
        {[...items, ...items, ...items].map((item, i) => (
          <span key={i} className="mx-8 inline-flex items-center gap-2">
            <item.icon size={14} className="text-accent" />
            {item.text}
          </span>
        ))}
      </div>
    </div>
  );
};
