import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { promoLabel, type Promotion } from "@/lib/promotions";
import { cn } from "@/lib/utils";

export const PromoBadge = ({
  promotion,
  className,
}: {
  promotion: Pick<Promotion, "benefit_type" | "discount_percent"> & Partial<Pick<Promotion, "variant" | "discount_amount" | "badge_label">>;
  className?: string;
}) => (
  <Badge
    className={cn(
      "gap-1 bg-accent text-accent-foreground text-[10px] font-bold uppercase tracking-wider",
      className,
    )}
  >
    <Sparkles size={10} />
    {promoLabel(promotion)}
  </Badge>
);
