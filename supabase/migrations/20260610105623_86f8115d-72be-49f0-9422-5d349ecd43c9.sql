-- =====================================================================
-- CRM Nutribatidos — Fase 1: capa de datos
-- =====================================================================

-- 1) crm_customer_notes
CREATE TABLE IF NOT EXISTS public.crm_customer_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body        text NOT NULL,
  created_by  uuid DEFAULT auth.uid(),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_notes_user ON public.crm_customer_notes(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_customer_notes TO authenticated;
GRANT ALL ON public.crm_customer_notes TO service_role;
ALTER TABLE public.crm_customer_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm admin notes" ON public.crm_customer_notes;
CREATE POLICY "crm admin notes" ON public.crm_customer_notes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- 2) crm_tasks
CREATE TABLE IF NOT EXISTS public.crm_tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        text NOT NULL DEFAULT 'otro'
              CHECK (type IN ('llamar','whatsapp','confirmar_pago','verificar_entrega','recompra','otro')),
  title       text NOT NULL,
  due_date    timestamptz,
  assignee    text,
  status      text NOT NULL DEFAULT 'pendiente'
              CHECK (status IN ('pendiente','en_progreso','hecha','cancelada')),
  created_by  uuid DEFAULT auth.uid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_user ON public.crm_tasks(user_id, status, due_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_tasks TO authenticated;
GRANT ALL ON public.crm_tasks TO service_role;
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm admin tasks" ON public.crm_tasks;
CREATE POLICY "crm admin tasks" ON public.crm_tasks
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS crm_tasks_updated_at ON public.crm_tasks;
CREATE TRIGGER crm_tasks_updated_at BEFORE UPDATE ON public.crm_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) crm_customer_tags
CREATE TABLE IF NOT EXISTS public.crm_customer_tags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tag        text NOT NULL,
  color      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tag)
);
CREATE INDEX IF NOT EXISTS idx_crm_tags_user ON public.crm_customer_tags(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_customer_tags TO authenticated;
GRANT ALL ON public.crm_customer_tags TO service_role;
ALTER TABLE public.crm_customer_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm admin tags" ON public.crm_customer_tags;
CREATE POLICY "crm admin tags" ON public.crm_customer_tags
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- 4) crm_message_templates
CREATE TABLE IF NOT EXISTS public.crm_message_templates (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel    text NOT NULL DEFAULT 'whatsapp',
  name       text NOT NULL,
  category   text,
  body       text NOT NULL,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_message_templates TO authenticated;
GRANT ALL ON public.crm_message_templates TO service_role;
ALTER TABLE public.crm_message_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm admin templates" ON public.crm_message_templates;
CREATE POLICY "crm admin templates" ON public.crm_message_templates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS crm_templates_updated_at ON public.crm_message_templates;
CREATE TRIGGER crm_templates_updated_at BEFORE UPDATE ON public.crm_message_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5) crm_whatsapp_log
CREATE TABLE IF NOT EXISTS public.crm_whatsapp_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  direction   text NOT NULL DEFAULT 'out' CHECK (direction IN ('out','in')),
  template_id uuid REFERENCES public.crm_message_templates(id) ON DELETE SET NULL,
  phone       text,
  body        text,
  status      text NOT NULL DEFAULT 'queued'
              CHECK (status IN ('queued','sent','delivered','read','failed')),
  external_id text,
  created_by  uuid DEFAULT auth.uid(),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_wa_user ON public.crm_whatsapp_log(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_whatsapp_log TO authenticated;
GRANT ALL ON public.crm_whatsapp_log TO service_role;
ALTER TABLE public.crm_whatsapp_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm admin wa" ON public.crm_whatsapp_log;
CREATE POLICY "crm admin wa" ON public.crm_whatsapp_log
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- 6) crm_interest_keywords
CREATE TABLE IF NOT EXISTS public.crm_interest_keywords (
  interest_code text NOT NULL,
  keyword       text NOT NULL,
  weight        numeric NOT NULL DEFAULT 1,
  PRIMARY KEY (interest_code, keyword)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_interest_keywords TO authenticated;
GRANT ALL ON public.crm_interest_keywords TO service_role;
ALTER TABLE public.crm_interest_keywords ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm admin interest kw" ON public.crm_interest_keywords;
CREATE POLICY "crm admin interest kw" ON public.crm_interest_keywords
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- 7) crm_customer_interests
CREATE TABLE IF NOT EXISTS public.crm_customer_interests (
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  interest_code text NOT NULL,
  score         numeric NOT NULL DEFAULT 0,
  is_primary    boolean NOT NULL DEFAULT false,
  computed_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, interest_code)
);
CREATE INDEX IF NOT EXISTS idx_crm_cust_interest_primary ON public.crm_customer_interests(user_id) WHERE is_primary;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_customer_interests TO authenticated;
GRANT ALL ON public.crm_customer_interests TO service_role;
ALTER TABLE public.crm_customer_interests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm admin cust interest" ON public.crm_customer_interests;
CREATE POLICY "crm admin cust interest" ON public.crm_customer_interests
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- 8) crm_abandoned_cart_status
CREATE TABLE IF NOT EXISTS public.crm_abandoned_cart_status (
  user_id              uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  status               text NOT NULL DEFAULT 'nuevo'
                       CHECK (status IN ('nuevo','contactado','recuperado','perdido')),
  contacted_at         timestamptz,
  recovered_order_id   uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  updated_at           timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_abandoned_cart_status TO authenticated;
GRANT ALL ON public.crm_abandoned_cart_status TO service_role;
ALTER TABLE public.crm_abandoned_cart_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm admin cart status" ON public.crm_abandoned_cart_status;
CREATE POLICY "crm admin cart status" ON public.crm_abandoned_cart_status
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS crm_cart_status_updated_at ON public.crm_abandoned_cart_status;
CREATE TRIGGER crm_cart_status_updated_at BEFORE UPDATE ON public.crm_abandoned_cart_status
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- Función: crm_recompute_interests()
-- =====================================================================
CREATE OR REPLACE FUNCTION public.crm_recompute_interests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(),'admin') AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  DELETE FROM public.crm_customer_interests;

  WITH signals AS (
    -- Compras (peso 2)
    SELECT o.user_id, lower(coalesce(oi.product_name,'') || ' ' || coalesce(oi.product_slug,'')) AS text, 2::numeric AS w
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE o.status <> 'cancelled'
    UNION ALL
    -- Navegación (peso 1)
    SELECT pe.user_id, lower(coalesce(pe.product_slug,'')), 1::numeric
    FROM public.product_events pe
    WHERE pe.user_id IS NOT NULL
    UNION ALL
    -- Búsquedas (peso 1)
    SELECT sl.user_id, lower(coalesce(sl.query,'')), 1::numeric
    FROM public.search_logs sl
    WHERE sl.user_id IS NOT NULL
  ),
  matches AS (
    SELECT s.user_id, k.interest_code, SUM(s.w * k.weight)::numeric AS score
    FROM signals s
    JOIN public.crm_interest_keywords k ON s.text LIKE '%' || lower(k.keyword) || '%'
    WHERE s.user_id IS NOT NULL AND s.text <> ''
    GROUP BY s.user_id, k.interest_code
  )
  INSERT INTO public.crm_customer_interests (user_id, interest_code, score, is_primary, computed_at)
  SELECT m.user_id, m.interest_code, m.score,
         m.score = MAX(m.score) OVER (PARTITION BY m.user_id),
         now()
  FROM matches m;
END $$;
GRANT EXECUTE ON FUNCTION public.crm_recompute_interests() TO authenticated;

-- =====================================================================
-- Vista: crm_abandoned_carts_v
-- =====================================================================
DROP VIEW IF EXISTS public.crm_abandoned_carts_v;
CREATE VIEW public.crm_abandoned_carts_v
WITH (security_invoker = true) AS
WITH cart_agg AS (
  SELECT ci.user_id,
         MAX(ci.created_at) AS last_activity,
         COUNT(*)::int AS items,
         SUM(ci.quantity * COALESCE(p.sale_price, p.price, 0))::numeric AS monto,
         jsonb_agg(jsonb_build_object(
           'product_id', ci.product_id,
           'name', p.name,
           'slug', p.slug,
           'quantity', ci.quantity,
           'price', COALESCE(p.sale_price, p.price, 0)
         ) ORDER BY ci.created_at DESC) AS items_json
  FROM public.cart_items ci
  LEFT JOIN public.products p ON p.id = ci.product_id
  GROUP BY ci.user_id
)
SELECT
  ca.user_id,
  pr.full_name,
  pr.phone,
  pr.email,
  ca.items,
  ca.monto,
  ca.items_json,
  ca.last_activity,
  COALESCE(s.status, 'nuevo') AS status,
  s.contacted_at
FROM cart_agg ca
JOIN public.profiles pr ON pr.id = ca.user_id
LEFT JOIN public.crm_abandoned_cart_status s ON s.user_id = ca.user_id
WHERE ca.last_activity < now() - interval '2 hours'
  AND COALESCE(s.status,'nuevo') NOT IN ('recuperado','perdido')
  AND NOT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.user_id = ca.user_id
      AND o.created_at > ca.last_activity
      AND o.status <> 'cancelled'
  );
GRANT SELECT ON public.crm_abandoned_carts_v TO authenticated;
GRANT SELECT ON public.crm_abandoned_carts_v TO service_role;

-- =====================================================================
-- Vista: crm_customers
-- =====================================================================
DROP VIEW IF EXISTS public.crm_customers;
CREATE VIEW public.crm_customers
WITH (security_invoker = true) AS
WITH order_stats AS (
  SELECT user_id,
         COUNT(*)::int                                     AS total_orders,
         SUM(total)::numeric                               AS total_spent,
         AVG(total)::numeric                               AS avg_ticket,
         MIN(created_at)                                   AS first_order_at,
         MAX(created_at)                                   AS last_order_at,
         BOOL_OR(status = 'pending')                       AS has_pending,
         BOOL_OR(status IN ('confirmed','preparing'))      AS has_pending_ship
  FROM public.orders
  WHERE status <> 'cancelled'
  GROUP BY user_id
),
primary_interest AS (
  SELECT DISTINCT ON (user_id) user_id, interest_code
  FROM public.crm_customer_interests
  ORDER BY user_id, is_primary DESC, score DESC
),
abandoned AS (
  SELECT DISTINCT user_id FROM public.crm_abandoned_carts_v
)
SELECT
  pr.id                                                 AS user_id,
  pr.full_name,
  pr.email,
  pr.phone,
  pr.city,
  pr.address,
  pr.country,
  pr.postal_code,
  pr.created_at                                         AS registered_at,
  COALESCE(os.total_orders, 0)                          AS total_orders,
  COALESCE(os.total_spent, 0)                           AS total_spent,
  COALESCE(os.avg_ticket, 0)                            AS avg_ticket,
  os.first_order_at,
  os.last_order_at,
  CASE WHEN os.last_order_at IS NULL THEN NULL
       ELSE EXTRACT(day FROM (now() - os.last_order_at))::int END AS days_since_last,
  CASE WHEN os.total_orders > 1
       THEN EXTRACT(day FROM (os.last_order_at - os.first_order_at))::numeric / NULLIF(os.total_orders - 1, 0)
       ELSE NULL END                                    AS frequency_days,
  pi.interest_code                                      AS primary_interest,
  (ab.user_id IS NOT NULL)                              AS has_abandoned_cart,
  CASE
    WHEN COALESCE(os.has_pending,false)                                                    THEN 'pendiente_pago'
    WHEN COALESCE(os.has_pending_ship,false)                                               THEN 'pendiente_envio'
    WHEN ab.user_id IS NOT NULL                                                            THEN 'carrito_abandonado'
    WHEN COALESCE(os.total_spent,0) >= 1000 OR COALESCE(os.total_orders,0) >= 5            THEN 'vip'
    WHEN COALESCE(os.total_orders,0) >= 2                                                  THEN 'recurrente'
    WHEN os.last_order_at IS NOT NULL AND os.last_order_at >= now() - interval '60 days'  THEN 'activo'
    WHEN os.last_order_at IS NOT NULL AND os.last_order_at <  now() - interval '90 days'  THEN 'inactivo'
    WHEN COALESCE(os.total_orders,0) = 0                                                   THEN 'nuevo'
    ELSE 'activo'
  END                                                   AS estado
FROM public.profiles pr
LEFT JOIN order_stats os    ON os.user_id = pr.id
LEFT JOIN primary_interest pi ON pi.user_id = pr.id
LEFT JOIN abandoned ab      ON ab.user_id = pr.id;
GRANT SELECT ON public.crm_customers TO authenticated;
GRANT SELECT ON public.crm_customers TO service_role;