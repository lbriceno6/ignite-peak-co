import { Truck, ShieldCheck, MessageCircle, Tag } from "lucide-react";

export const AnnouncementBar = () => {
  const items = [
    { icon: Truck, text: "Envío gratis en compras desde S/ 99 · Todo el Perú" },
    { icon: ShieldCheck, text: "Pago seguro · Yape, Plin, tarjeta o contraentrega" },
    { icon: MessageCircle, text: "Atención por WhatsApp los 7 días" },
    { icon: Tag, text: "Código NATURAL10 — 10% en tu primer pedido" },
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
