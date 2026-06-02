import { Sparkles } from "lucide-react";
import { useDynamicPricing } from "@/hooks/useDynamicPricing";

type Props = { scope?: "global" | "category" | "brand" | "product"; targetValue?: string; className?: string };

export const DynamicPricingBanner = ({ scope = "global", targetValue, className = "" }: Props) => {
  const { data, loading } = useDynamicPricing({ scope, target_value: targetValue });
  if (loading || !data?.message || data.discount_percent <= 0) return null;
  return (
    <div className={`flex items-center gap-3 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm ${className}`}>
      <Sparkles className="h-4 w-4 shrink-0 text-accent" />
      <div className="flex-1">
        <p className="font-semibold">{data.message}</p>
        <p className="text-xs text-muted-foreground">Segmento: {data.segment_name ?? data.segment_code} · {data.discount_percent}% adicional al pagar</p>
      </div>
    </div>
  );
};
