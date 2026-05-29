import { useMemo } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCatalogFilters, type CatalogFilter, type PageKey } from "@/hooks/useCatalogFilters";
import {
  applyCatalogFilters,
  computeOptions,
  computePriceRange,
  countActive,
  type SelectedFilters,
} from "@/lib/catalogFilterEngine";

type Props = {
  page: PageKey;
  products: any[];                 // raw products (pre-filter)
  selected: SelectedFilters;
  onChange: (next: SelectedFilters) => void;
  className?: string;
};

const FilterBody = ({
  filter,
  selected,
  onChange,
  products,
  priceRange,
}: {
  filter: CatalogFilter;
  selected: SelectedFilters;
  onChange: (next: SelectedFilters) => void;
  products: any[];
  priceRange: [number, number];
}) => {
  const set = (val: SelectedFilters[string]) => onChange({ ...selected, [filter.slug]: val });
  const sel = selected[filter.slug];

  if (filter.filter_type === "price") {
    const [min, max] = priceRange;
    const cur = (sel as [number, number]) ?? [min, max];
    return (
      <div className="px-1">
        <Slider
          value={cur}
          min={min}
          max={max}
          step={Math.max(1, Math.round((max - min) / 100))}
          onValueChange={(v) => set([v[0], v[1]] as [number, number])}
        />
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>S/ {cur[0]}</span><span>S/ {cur[1]}</span>
        </div>
      </div>
    );
  }

  if (filter.ui_widget === "toggle") {
    return (
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <Checkbox checked={!!sel} onCheckedChange={(v) => set(!!v)} />
        <span>Activar</span>
      </label>
    );
  }

  if (filter.ui_widget === "chips" || filter.filter_type === "rating") {
    const cur = Number(sel ?? 0);
    return (
      <div className="space-y-2">
        {[4, 3, 2, 1].map((r) => (
          <label key={r} className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={cur === r} onCheckedChange={(v) => set(v ? r : 0)} />
            <span>★ {r}+</span>
          </label>
        ))}
      </div>
    );
  }

  const options = computeOptions(products, filter);
  const arr = (sel as string[]) ?? [];
  const toggle = (v: string) => {
    if (filter.selection_type === "single") {
      set(arr.includes(v) ? [] : [v]);
    } else {
      set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
    }
  };

  if (!options.length) {
    return <p className="py-1 text-xs text-muted-foreground">Sin opciones disponibles</p>;
  }

  return (
    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
      {options.map((o) => (
        <label key={o.value} className="flex cursor-pointer items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-2">
            <Checkbox checked={arr.includes(o.value)} onCheckedChange={() => toggle(o.value)} />
            <span>{o.label}</span>
          </span>
          <span className="text-xs text-muted-foreground">({o.count})</span>
        </label>
      ))}
    </div>
  );
};

const PanelBody = ({
  filters, selected, onChange, products, priceRange, onClear, activeCount,
}: {
  filters: CatalogFilter[];
  selected: SelectedFilters;
  onChange: (n: SelectedFilters) => void;
  products: any[];
  priceRange: [number, number];
  onClear: () => void;
  activeCount: number;
}) => (
  <div>
    <div className="mb-3 flex items-center justify-between">
      <h3 className="font-display text-base uppercase">Filtros</h3>
      {activeCount > 0 && (
        <button onClick={onClear} className="text-xs uppercase tracking-wider text-muted-foreground hover:text-accent">
          Limpiar
        </button>
      )}
    </div>
    <Accordion
      type="multiple"
      defaultValue={filters.filter((f) => f.default_open).map((f) => f.slug)}
    >
      {filters.map((f) => (
        <AccordionItem key={f.id} value={f.slug}>
          <AccordionTrigger className="text-sm font-bold uppercase tracking-wider">
            {f.name}
          </AccordionTrigger>
          <AccordionContent>
            <FilterBody
              filter={f}
              selected={selected}
              onChange={onChange}
              products={products}
              priceRange={priceRange}
            />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  </div>
);

export const CatalogFiltersPanel = ({ page, products, selected, onChange, className }: Props) => {
  const { filters } = useCatalogFilters(page);
  const isMobile = useIsMobile();

  const visible = useMemo(
    () => filters.filter((f) => (isMobile ? f.show_mobile : f.show_desktop)),
    [filters, isMobile],
  );
  const priceRange = useMemo(() => computePriceRange(products), [products]);
  const activeCount = countActive(selected, visible);
  const onClear = () => onChange({});

  if (!visible.length) return null;

  if (isMobile) {
    return (
      <div className={className}>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">
              <SlidersHorizontal size={16} /> Filtrar
              {activeCount > 0 && <Badge className="ml-1 bg-accent text-accent-foreground">{activeCount}</Badge>}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 overflow-y-auto">
            <SheetHeader><SheetTitle>Filtros</SheetTitle></SheetHeader>
            <div className="mt-4">
              <PanelBody
                filters={visible}
                selected={selected}
                onChange={onChange}
                products={products}
                priceRange={priceRange}
                onClear={onClear}
                activeCount={activeCount}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <aside className={className}>
      <PanelBody
        filters={visible}
        selected={selected}
        onChange={onChange}
        products={products}
        priceRange={priceRange}
        onClear={onClear}
        activeCount={activeCount}
      />
    </aside>
  );
};

// Re-export helpers for pages.
export { applyCatalogFilters };
