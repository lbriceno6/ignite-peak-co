import { supabase } from "@/integrations/supabase/client";

const sb: any = supabase;

export type ComboLocation = "product" | "cart" | "checkout" | "search" | "home" | "category";

export type Combo = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  price_normal: number;
  price_combo: number;
  discount_value: number;
  discount_type: "amount" | "percent";
  priority: "high" | "medium" | "low";
  need_tag: string | null;
  category_id: string | null;
  display_locations: string[];
};

export type ComboProduct = {
  combo_id: string;
  product_id: string;
  quantity: number;
  product?: {
    id: string;
    slug: string;
    name: string;
    main_image: string | null;
    price: number;
    sale_price: number | null;
    stock: number;
  };
};

export type ComboRule = {
  id: string;
  combo_id: string;
  rule_type:
    | "view_product"
    | "cart_has_product"
    | "cart_min_total"
    | "free_shipping_gap"
    | "need_search"
    | "cart_has_category";
  product_id: string | null;
  category_id: string | null;
  need_tag: string | null;
  min_cart_total: number | null;
  max_cart_total: number | null;
  priority: "high" | "medium" | "low";
};

export type ComboConfig = {
  ai_enabled: boolean;
  ai_provider: "gemini" | "openai" | "deepseek" | "claude" | null;
  ai_prompt: string;
  max_recommendations: number;
  show_in_product: boolean;
  show_in_cart: boolean;
  show_in_checkout: boolean;
  show_in_search: boolean;
  show_in_home: boolean;
  show_in_category: boolean;
};

export type RecommendationContext = {
  location: ComboLocation;
  productId?: string;
  productSlug?: string;
  productCategoryId?: string;
  cartProductIds?: string[];
  cartCategoryIds?: string[];
  cartSubtotal?: number;
  freeShippingThreshold?: number;
  needTag?: string;
};

export type ComboRecommendation = {
  combo: Combo;
  products: ComboProduct[];
  reason: string;
  message: string;
  savings: number;
  score: number;
};

const BLOCKED_MEDICAL = /\b(cura|curar|trata|tratamiento|enferm|diagn)\w*/i;

function sanitizeCopy(s: string, fallback: string) {
  if (!s) return fallback;
  if (BLOCKED_MEDICAL.test(s)) return fallback;
  return s;
}

const PRIORITY_SCORE: Record<Combo["priority"], number> = { high: 30, medium: 20, low: 10 };

export async function loadComboConfig(): Promise<ComboConfig | null> {
  const { data } = await sb.from("combo_config").select("*").limit(1).maybeSingle();
  return data ?? null;
}

export async function smartComboRecommendation(
  ctx: RecommendationContext,
): Promise<ComboRecommendation[]> {
  const config = await loadComboConfig();
  if (!config) return [];

  const allowedByLocation: Record<ComboLocation, boolean> = {
    product: config.show_in_product,
    cart: config.show_in_cart,
    checkout: config.show_in_checkout,
    search: config.show_in_search,
    home: config.show_in_home,
    category: config.show_in_category,
  };
  if (!allowedByLocation[ctx.location]) return [];

  const now = new Date().toISOString();
  const { data: combos } = await sb
    .from("combos")
    .select("*")
    .eq("is_active", true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`);

  const activeCombos: Combo[] = (combos ?? []).filter((c: Combo) =>
    (c.display_locations || []).includes(ctx.location),
  );
  if (activeCombos.length === 0) return [];

  const ids = activeCombos.map((c) => c.id);
  const [{ data: cps }, { data: rules }] = await Promise.all([
    sb
      .from("combo_products")
      .select("combo_id, product_id, quantity, product:products(id, slug, name, main_image, price, sale_price, stock)")
      .in("combo_id", ids),
    sb.from("combo_rules").select("*").in("combo_id", ids).eq("is_active", true),
  ]);

  const productsByCombo = new Map<string, ComboProduct[]>();
  (cps ?? []).forEach((cp: any) => {
    const arr = productsByCombo.get(cp.combo_id) ?? [];
    arr.push(cp);
    productsByCombo.set(cp.combo_id, arr);
  });

  const rulesByCombo = new Map<string, ComboRule[]>();
  (rules ?? []).forEach((r: ComboRule) => {
    const arr = rulesByCombo.get(r.combo_id) ?? [];
    arr.push(r);
    rulesByCombo.set(r.combo_id, arr);
  });

  const cartProductSet = new Set(ctx.cartProductIds ?? []);
  const cartCategorySet = new Set(ctx.cartCategoryIds ?? []);

  const candidates: ComboRecommendation[] = [];
  for (const combo of activeCombos) {
    const products = productsByCombo.get(combo.id) ?? [];
    if (products.length === 0) continue;

    // stock check
    const outOfStock = products.some((p) => (p.product?.stock ?? 0) < p.quantity);
    if (outOfStock) continue;

    // skip if every product already in cart
    const allInCart = products.every((p) => cartProductSet.has(p.product_id));
    if (allInCart) continue;

    let score = PRIORITY_SCORE[combo.priority] || 10;
    let matched = false;

    const ruleSet = rulesByCombo.get(combo.id) ?? [];
    for (const r of ruleSet) {
      let ok = false;
      switch (r.rule_type) {
        case "view_product":
          ok = !!ctx.productId && r.product_id === ctx.productId;
          break;
        case "cart_has_product":
          ok = !!r.product_id && cartProductSet.has(r.product_id);
          break;
        case "cart_has_category":
          ok = !!r.category_id && cartCategorySet.has(r.category_id);
          break;
        case "cart_min_total": {
          const total = ctx.cartSubtotal ?? 0;
          ok =
            (r.min_cart_total == null || total >= r.min_cart_total) &&
            (r.max_cart_total == null || total <= r.max_cart_total);
          break;
        }
        case "free_shipping_gap": {
          const total = ctx.cartSubtotal ?? 0;
          const threshold = ctx.freeShippingThreshold ?? 0;
          ok = threshold > 0 && total > 0 && total < threshold;
          break;
        }
        case "need_search":
          ok = !!ctx.needTag && r.need_tag?.toLowerCase() === ctx.needTag.toLowerCase();
          break;
      }
      if (ok) {
        matched = true;
        score += PRIORITY_SCORE[r.priority] || 10;
      }
    }

    // implicit matches when no rules: category match or need match
    if (ruleSet.length === 0) {
      if (ctx.productCategoryId && combo.category_id === ctx.productCategoryId) {
        matched = true;
        score += 15;
      }
      if (ctx.needTag && combo.need_tag === ctx.needTag) {
        matched = true;
        score += 15;
      }
      // home/checkout: allow without explicit match, just by priority
      if (ctx.location === "home" || ctx.location === "checkout") matched = true;
    }

    if (!matched) continue;

    const savings = Math.max(0, Number(combo.price_normal) - Number(combo.price_combo));
    candidates.push({
      combo,
      products,
      reason: "",
      message: sanitizeCopy(
        combo.description ?? "Combina bien con tu compra.",
        "Combina bien con tu compra como complemento nutricional.",
      ),
      savings,
      score,
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  const limited = candidates.slice(0, config.max_recommendations);

  if (config.ai_enabled && limited.length > 0) {
    try {
      const { data, error } = await sb.functions.invoke("combo-ai-recommend", {
        body: {
          context: ctx,
          candidates: limited.map((r) => ({
            combo_id: r.combo.id,
            name: r.combo.name,
            description: r.combo.description,
            price_normal: r.combo.price_normal,
            price_combo: r.combo.price_combo,
            need_tag: r.combo.need_tag,
            products: r.products.map((p) => p.product?.name).filter(Boolean),
          })),
        },
      });
      if (!error && data?.recommendations?.length) {
        const byId = new Map(limited.map((r) => [r.combo.id, r]));
        const reordered: ComboRecommendation[] = [];
        for (const ai of data.recommendations) {
          const base = byId.get(ai.combo_id);
          if (!base) continue;
          reordered.push({
            ...base,
            reason: sanitizeCopy(ai.reason || "", base.message),
            message: sanitizeCopy(ai.message || base.message, base.message),
          });
        }
        if (reordered.length > 0) return reordered;
      }
    } catch {
      // fallback to local
    }
  }

  return limited;
}

export async function trackComboEvent(
  comboId: string,
  eventType: "view" | "cart_add" | "purchase",
  opts?: { sourceLocation?: string; amount?: number; orderId?: string; userId?: string },
) {
  try {
    await sb.from("combo_events").insert({
      combo_id: comboId,
      event_type: eventType,
      source_location: opts?.sourceLocation,
      amount: opts?.amount,
      order_id: opts?.orderId,
      user_id: opts?.userId,
    });
  } catch {
    /* noop */
  }
}

export async function loadComboWithProducts(comboId: string): Promise<{
  combo: Combo | null;
  products: ComboProduct[];
}> {
  const [{ data: combo }, { data: cps }] = await Promise.all([
    sb.from("combos").select("*").eq("id", comboId).maybeSingle(),
    sb
      .from("combo_products")
      .select("combo_id, product_id, quantity, product:products(id, slug, name, main_image, price, sale_price, stock)")
      .eq("combo_id", comboId),
  ]);
  return { combo: combo ?? null, products: (cps ?? []) as ComboProduct[] };
}
