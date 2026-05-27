import { Truck, ShieldCheck, Award, Lock, CreditCard, MessageCircle, Package, Star } from "lucide-react";

export const renderBenefitIcon = (icon: string, size = 16, className = "text-primary") => {
  const props = { size, className } as const;
  switch ((icon ?? "").toLowerCase()) {
    case "truck": return <Truck {...props} />;
    case "shield": return <ShieldCheck {...props} />;
    case "medal": return <Award {...props} />;
    case "lock": return <Lock {...props} />;
    case "card": return <CreditCard {...props} />;
    case "whatsapp": return <MessageCircle {...props} />;
    case "box": return <Package {...props} />;
    case "star": return <Star {...props} />;
    default: return <Truck {...props} />;
  }
};
