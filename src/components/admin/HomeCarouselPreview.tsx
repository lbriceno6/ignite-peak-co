import { useMemo } from "react";
import { buildScopedCss, type CarouselDesign } from "@/lib/homeCarouselDesign";

const MOCK = [
  { name: "Maca Andina", price: "S/ 49.90", old: null as string | null, img: "https://images.unsplash.com/photo-1622484212850-eb596d769edc?w=400&h=400&fit=crop" },
  { name: "Proteína vegana premium de quinoa, maca y cañihua", price: "S/ 129.00", old: "S/ 159.00", img: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400&h=400&fit=crop" },
  { name: "Cápsulas de espirulina", price: "Consultar precio", old: null, img: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400&h=400&fit=crop" },
];

const WIDTHS: Record<string, number> = { desktop: 1100, tablet: 760, mobile: 380 };

export function HomeCarouselPreview({ design, device }: { design: CarouselDesign; device: "desktop" | "tablet" | "mobile" }) {
  const scopeId = "hcs-preview";
  const css = useMemo(() => buildScopedCss(scopeId, design), [design]);
  const w = WIDTHS[device];

  return (
    <div className="rounded-md border bg-background p-2 overflow-auto">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div style={{ width: w, maxWidth: "100%", margin: "0 auto" }}>
        <section id={scopeId} className="hcs-scope">
          <div className="hcs-bg">
            <div className="hcs-container">
              <div className="hcs-track flex">
                {MOCK.map((p, i) => (
                  <div key={i} className="hcs-item">
                    <article data-pc="card" className="rounded-lg border bg-card overflow-hidden">
                      <div data-pc="image-wrap" className="relative">
                        <img data-pc="image" src={p.img} alt="" />
                      </div>
                      <div data-pc="content" className="p-3">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Categoría</div>
                        <div className="font-display text-sm leading-snug line-clamp-2 min-h-[2.25rem]">{p.name}</div>
                        <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">Beneficio del producto, presentación natural.</p>
                        <div data-pc="button-wrap" className="pt-2">
                          <div data-pc="price-block" className="min-h-[1.5rem] flex items-baseline gap-2">
                            <span className="font-display text-base font-bold text-destructive">{p.price}</span>
                            {p.old && <span className="text-xs text-muted-foreground line-through">{p.old}</span>}
                          </div>
                          <button data-pc="button" className="mt-2 w-full rounded bg-accent text-accent-foreground text-xs py-1.5">Agregar al carrito</button>
                        </div>
                      </div>
                    </article>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
