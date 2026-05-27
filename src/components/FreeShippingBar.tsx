import { Truck, Gift, Check } from "lucide-react";
import { useFreeShippingBar, pickMessage, formatMoney } from "@/hooks/useFreeShippingBar";

type Props = {
  subtotal: number;
  variant?: "full" | "compact";
  surface?: "cart" | "minicart" | "pdp";
};

export const FreeShippingBar = ({ subtotal, variant = "full", surface = "cart" }: Props) => {
  const s = useFreeShippingBar();
  if (!s.enabled || !s.showBar || s.threshold <= 0) return null;
  if (surface === "cart" && !s.showCart) return null;
  if (surface === "minicart" && !s.showMinicart) return null;
  if (surface === "pdp" && !s.showPdp) return null;

  const { message, progress, achieved } = pickMessage(s, subtotal);
  const Icon = achieved ? Check : variant === "compact" ? Gift : Truck;

  if (variant === "compact") {
    return (
      <div
        className="rounded-md p-2.5 text-xs"
        style={{ backgroundColor: s.blockBg, color: "#151515" }}
      >
        <div className="flex items-center gap-2">
          <Icon size={14} style={{ color: s.barColor }} />
          <span className="font-medium">{message}</span>
        </div>
        <div
          className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full"
          style={{ backgroundColor: s.barBg }}
        >
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%`, backgroundColor: s.barColor }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg p-4"
      style={{ backgroundColor: s.blockBg, color: "#151515" }}
    >
      <div className="flex items-start gap-3">
        <div
          className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full"
          style={{ backgroundColor: "#fff", color: s.barColor }}
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#666" }}>
            Envío gratis
          </p>
          <p className="text-sm font-semibold leading-snug">{message}</p>
        </div>
      </div>
      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: s.barBg }}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%`, backgroundColor: s.barColor }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px]" style={{ color: "#666" }}>
        <span>{formatMoney(subtotal)} de {formatMoney(s.threshold)}</span>
        <span className="font-semibold">{Math.round(progress)}%</span>
      </div>
    </div>
  );
};
