import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, X, Loader2, MessageCircle, Heart, ShoppingCart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { runLiveSearch, type LiveProduct, type LiveSearchResult } from "@/lib/liveSearch";
import { useCart } from "@/store/cart";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Settings = {
  live_suggestions_enabled: boolean;
  visible_products_limit: number;
  manual_suggestions: string[];
  show_whatsapp_fallback: boolean;
};

const DEFAULT_SETTINGS: Settings = {
  live_suggestions_enabled: true,
  visible_products_limit: 4,
  manual_suggestions: ["omega 3", "vitaminas", "bienestar", "omegas", "colágeno", "energía", "digestión"],
  show_whatsapp_fallback: true,
};

const PLACEHOLDER = "Buscar por necesidad: cansancio, digestión, colágeno...";

type Props = {
  className?: string;
  autoFocus?: boolean;
  onClose?: () => void;
};

export function LiveSearchBar({ className, autoFocus, onClose }: Props) {
  const navigate = useNavigate();
  const { add, toggleWish, wishlist } = useCart();
  const { format: formatPrice } = useCurrency();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LiveSearchResult | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [waNumber, setWaNumber] = useState("14155552671");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);

  // Load settings once
  useEffect(() => {
    (async () => {
      const [chatRes] = await Promise.all([
        (supabase.from as any)("chat_ai_settings").select("whatsapp_number").eq("id", 1).maybeSingle(),
      ]);
      if (chatRes?.data?.whatsapp_number) setWaNumber(chatRes.data.whatsapp_number);
    })();
  }, []);

  // Debounced live search
  useEffect(() => {
    if (!settings.live_suggestions_enabled) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResult(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const r = await runLiveSearch(q, settings.visible_products_limit);
        setResult(r);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, settings.live_suggestions_enabled, settings.visible_products_limit]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    onClose?.();
    navigate(`/buscar?q=${encodeURIComponent(q)}`);
  };

  const handleClear = () => {
    setQuery("");
    setResult(null);
    setOpen(false);
    onClose?.();
    inputRef.current?.focus();
  };

  const handleSuggestion = (term: string) => {
    setQuery(term);
    setOpen(true);
    inputRef.current?.focus();
  };

  const handleAddToCart = (p: LiveProduct) => {
    if (p.stock <= 0) return;
    add(p, { quantity: 1 });
    toast.success("Producto agregado al carrito");
  };

  const waUrl = `https://wa.me/${waNumber.replace(/\D/g, "")}?text=${encodeURIComponent(
    `Hola, busqué "${query}" en Nutribatidos y me gustaría asesoría.`,
  )}`;

  const showPanel = open && query.trim().length >= 2;
  const hasProducts = (result?.products.length ?? 0) > 0;
  const hasCategory = !!result?.matchedCategorySlug;
  const hasDynamicSuggestions = (result?.suggestions.length ?? 0) > 0;
  const hasBrands = (result?.brands?.length ?? 0) > 0;
  const hasAnything = hasProducts || hasCategory || hasDynamicSuggestions || hasBrands;
  const hasNoResults = showPanel && !loading && result !== null && !hasAnything;

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const dynamic = result?.suggestions ?? [];
    const manual = settings.manual_suggestions.filter((s) =>
      q ? s.toLowerCase().includes(q) || q.includes(s.toLowerCase()) : true,
    );
    // Merge & dedupe
    const seen = new Set<string>();
    const out: string[] = [];
    for (const t of [...dynamic, ...manual, ...settings.manual_suggestions]) {
      const k = t.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        out.push(t);
      }
      if (out.length >= 8) break;
    }
    return out;
  }, [query, result, settings.manual_suggestions]);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <form onSubmit={submit} className="relative">
        <Input
          ref={inputRef}
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={PLACEHOLDER}
          className="h-11 pr-20 bg-secondary border-transparent focus-visible:bg-background"
          aria-label="Buscar productos"
        />
        {/* Right side: clear + search icon */}
        <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center">
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:text-foreground"
              aria-label="Limpiar búsqueda"
            >
              <X size={16} />
            </button>
          )}
          <button
            type="submit"
            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:text-foreground"
            aria-label="Buscar"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={18} />}
          </button>
        </div>
      </form>

      {showPanel && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 top-14 z-40 bg-background/80 backdrop-blur-sm md:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-label="Resultados de búsqueda"
            className={cn(
              "absolute left-0 right-0 top-full z-50 mt-2",
              "rounded-xl border border-border bg-popover shadow-xl",
              "max-h-[80vh] overflow-y-auto",
              "md:max-h-[70vh]",
            )}
          >
            {hasNoResults ? (
              <div className="p-6 text-center">
                <p className="text-sm font-medium">
                  No encontramos productos exactos, pero podemos ayudarte por necesidad.
                </p>
                {settings.show_whatsapp_fallback && (
                  <Button asChild className="mt-4" variant="dark">
                    <a href={waUrl} target="_blank" rel="noopener noreferrer">
                      <MessageCircle size={16} className="mr-1.5" /> Hablar con asesor por WhatsApp
                    </a>
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-0 md:grid-cols-[220px_1fr]">
                {/* LEFT: Suggestions */}
                <div className="border-b border-border p-4 md:border-b-0 md:border-r">
                  <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Sugerencias
                  </h4>
                  <ul className="flex flex-col gap-1">
                    {suggestions.length === 0 && (
                      <li className="text-xs text-muted-foreground">Sin sugerencias</li>
                    )}
                    {suggestions.map((s) => (
                      <li key={s}>
                        <button
                          type="button"
                          onClick={() => handleSuggestion(s)}
                          className="block w-full rounded-md px-2 py-1.5 text-left text-sm capitalize hover:bg-secondary"
                        >
                          {s}
                        </button>
                      </li>
                    ))}
                  </ul>
                  {hasBrands && (
                    <div className="mt-4">
                      <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Marcas</h4>
                      <ul className="flex flex-col gap-1">
                        {result!.brands.map((b) => (
                          <li key={b.id}>
                            <Link
                              to={`/marca/${b.slug}`}
                              onClick={() => setOpen(false)}
                              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary"
                            >
                              {b.logo_url ? (
                                <img src={b.logo_url} alt={b.name} className="h-5 w-5 rounded object-contain bg-muted/30" />
                              ) : (
                                <span className="h-5 w-5 rounded bg-muted" />
                              )}
                              <span className="truncate">{b.name}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* RIGHT: Products */}
                <div className="p-4">
                  {(() => {
                    const intentLabel =
                      result?.intentTitle ||
                      result?.matchedNeedName ||
                      null;
                    const headerLabel = intentLabel
                      ? `Productos recomendados para ${intentLabel}`
                      : `Productos para ${query}`;
                    return (
                      <h4 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        <span className="text-foreground">{headerLabel}</span>
                      </h4>
                    );
                  })()}
                  {loading && !result ? (
                    <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                      <Loader2 size={16} className="animate-spin" /> Buscando…
                    </div>
                  ) : hasProducts ? (
                    <ul className="flex flex-col divide-y divide-border">
                      {(result?.products ?? []).slice(0, settings.visible_products_limit).map((p) => {
                        const inStock = p.stock > 0;
                        const isWished = wishlist.includes(p.id);
                        return (
                          <li key={p.id} className="flex gap-3 py-3">
                            <Link
                              to={`/producto/${p.slug}`}
                              onClick={() => setOpen(false)}
                              className="shrink-0"
                            >
                              <img
                                src={p.image}
                                alt={p.name}
                                loading="lazy"
                                className="h-16 w-16 rounded-md border border-border bg-background object-cover"
                              />
                            </Link>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                                {p.brand}
                              </p>
                              <Link
                                to={`/producto/${p.slug}`}
                                onClick={() => setOpen(false)}
                                className="line-clamp-2 text-sm font-medium hover:text-accent"
                              >
                                {p.name}
                              </Link>
                              <div className="mt-1 flex items-center gap-2">
                                <span className="text-sm font-semibold">{formatPrice(p.price)}</span>
                                {p.oldPrice && (
                                  <span className="text-xs text-muted-foreground line-through">
                                    {formatPrice(p.oldPrice)}
                                  </span>
                                )}
                                <span
                                  className={cn(
                                    "ml-auto text-[10px] font-semibold uppercase",
                                    inStock ? "text-success" : "text-muted-foreground",
                                  )}
                                >
                                  {inStock ? "En stock" : "Agotado"}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end justify-between gap-1">
                              <button
                                type="button"
                                onClick={() => toggleWish(p.id)}
                                aria-label="Favorito"
                                className={cn(
                                  "grid h-7 w-7 place-items-center rounded-full hover:bg-secondary",
                                  isWished ? "text-accent" : "text-muted-foreground",
                                )}
                              >
                                <Heart size={14} fill={isWished ? "currentColor" : "none"} />
                              </button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleAddToCart(p)}
                                disabled={!inStock}
                                className={cn(
                                  "h-8 gap-1 text-xs",
                                  inStock
                                    ? "bg-success text-success-foreground hover:bg-success/90"
                                    : "bg-muted text-muted-foreground",
                                )}
                              >
                                <ShoppingCart size={12} />
                                {inStock ? "Añadir" : "No disp."}
                              </Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : result?.intentSlug && result?.intentHasProductIds ? (
                    <div className="rounded-md border border-dashed border-border p-4 text-sm">
                      <p className="text-muted-foreground">
                        Detectamos que buscas productos para{" "}
                        <span className="font-medium text-foreground">
                          {result.matchedNeedName || result.intentSlug}
                        </span>
                        , pero aún no hay productos activos asignados a esta intención.
                      </p>
                    </div>
                  ) : hasCategory ? (
                    <div className="rounded-md border border-dashed border-border p-4 text-sm">
                      <p className="text-muted-foreground">
                        No hay productos exactos, pero encontramos una categoría relacionada:
                      </p>
                      <Link
                        to={`/buscar?q=${encodeURIComponent(query.trim())}&categoria=${encodeURIComponent(result!.matchedCategorySlug!)}`}
                        onClick={() => setOpen(false)}
                        className="mt-2 inline-block font-medium text-accent hover:underline"
                      >
                        Ver productos de esta categoría →
                      </Link>
                    </div>
                  ) : (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Prueba con otra palabra o elige una sugerencia.
                    </p>
                  )}

                  {result && result.products.length > 0 && (
                    <div className="mt-3 border-t border-border pt-3 space-y-2">
                      {result.intentSlug && (result.intentCtaUrl || result.intentSlug) && (
                        <Link
                          to={result.intentCtaUrl || `/objetivo/${result.intentSlug}`}
                          onClick={() => setOpen(false)}
                          className="block text-center text-sm font-medium text-accent hover:underline"
                        >
                          {result.intentCtaText || `Ver más productos de ${result.matchedNeedName || result.intentSlug}`} →
                        </Link>
                      )}
                      <Link
                        to={`/buscar?q=${encodeURIComponent(query.trim())}`}
                        onClick={() => setOpen(false)}
                        className="block text-center text-sm font-medium text-accent hover:underline"
                      >
                        Ver todos los {result.totalEstimated} productos →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default LiveSearchBar;
