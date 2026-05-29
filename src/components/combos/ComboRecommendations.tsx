import { useComboRecommendations } from "@/hooks/useComboRecommendations";
import { ComboCard } from "./ComboCard";
import type { ComboLocation } from "@/lib/smartCombos";

type Props = {
  location: ComboLocation;
  productId?: string;
  productSlug?: string;
  productCategoryId?: string;
  cartProductIds?: string[];
  cartCategoryIds?: string[];
  cartSubtotal?: number;
  freeShippingThreshold?: number;
  needTag?: string;
  title?: string;
  subtitle?: string;
  maxItems?: number;
  className?: string;
  compact?: boolean;
};

export function ComboRecommendations({
  title = "Completa tu rutina saludable",
  subtitle = "Este producto combina bien con estos complementos.",
  maxItems,
  className,
  compact,
  ...ctx
}: Props) {
  const { recs, loading } = useComboRecommendations(ctx, [
    ctx.location,
    ctx.productId,
    ctx.cartSubtotal,
    (ctx.cartProductIds ?? []).join(","),
    ctx.needTag,
  ]);

  if (loading || recs.length === 0) return null;
  const list = maxItems ? recs.slice(0, maxItems) : recs;

  return (
    <section className={className ?? "mt-8 space-y-3"}>
      <header>
        <h3 className="font-display text-lg">{title}</h3>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </header>
      <div className={compact ? "space-y-3" : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"}>
        {list.map((r) => (
          <ComboCard key={r.combo.id} recommendation={r} location={ctx.location} compact={compact} />
        ))}
      </div>
    </section>
  );
}

export default ComboRecommendations;
