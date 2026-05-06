import { Star } from "lucide-react";

export const Stars = ({ rating, size = 14 }: { rating: number; size?: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star
        key={i}
        size={size}
        className={i <= Math.round(rating) ? "fill-accent text-accent" : "text-muted-foreground/40"}
      />
    ))}
  </div>
);
