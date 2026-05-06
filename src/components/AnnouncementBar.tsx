import { Truck, ShieldCheck, MessageCircle, Tag } from "lucide-react";

const items = [
  { icon: Truck, text: "Free shipping on orders over €50" },
  { icon: ShieldCheck, text: "Secure payment · 100% protected" },
  { icon: MessageCircle, text: "WhatsApp support 7 days a week" },
  { icon: Tag, text: "Code FUEL10 — 10% off your first order" },
];

export const AnnouncementBar = () => (
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
