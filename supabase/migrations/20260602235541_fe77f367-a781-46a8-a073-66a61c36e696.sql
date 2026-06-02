
CREATE TABLE public.customer_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.customer_segments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_segments TO authenticated;
GRANT ALL ON public.customer_segments TO service_role;
ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Segments readable by all" ON public.customer_segments FOR SELECT USING (is_active = true OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins manage segments insert" ON public.customer_segments FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins manage segments update" ON public.customer_segments FOR UPDATE USING (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins manage segments delete" ON public.customer_segments FOR DELETE USING (public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_segments_updated BEFORE UPDATE ON public.customer_segments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.dynamic_pricing_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  segment_id UUID REFERENCES public.customer_segments(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'global',
  target_value TEXT,
  discount_percent NUMERIC NOT NULL DEFAULT 0,
  message TEXT,
  priority INT NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.dynamic_pricing_rules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dynamic_pricing_rules TO authenticated;
GRANT ALL ON public.dynamic_pricing_rules TO service_role;
ALTER TABLE public.dynamic_pricing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rules readable by all" ON public.dynamic_pricing_rules FOR SELECT USING (is_active = true OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins manage rules insert" ON public.dynamic_pricing_rules FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins manage rules update" ON public.dynamic_pricing_rules FOR UPDATE USING (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins manage rules delete" ON public.dynamic_pricing_rules FOR DELETE USING (public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_rules_updated BEFORE UPDATE ON public.dynamic_pricing_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.dynamic_pricing_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  session_id TEXT,
  segment_code TEXT,
  rule_id UUID,
  discount_percent NUMERIC,
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.dynamic_pricing_logs TO anon;
GRANT SELECT, INSERT ON public.dynamic_pricing_logs TO authenticated;
GRANT ALL ON public.dynamic_pricing_logs TO service_role;
ALTER TABLE public.dynamic_pricing_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert logs" ON public.dynamic_pricing_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view logs" ON public.dynamic_pricing_logs FOR SELECT USING (public.has_role(auth.uid(),'admin'::app_role));

INSERT INTO public.customer_segments (code, name, description, rules, priority) VALUES
('new_visitor', 'Nuevo visitante', 'Usuarios sin compras previas o anónimos', '{"max_orders":0}'::jsonb, 10),
('recurring', 'Cliente recurrente', 'Entre 2 y 5 pedidos confirmados', '{"min_orders":2,"max_orders":5}'::jsonb, 20),
('vip', 'Cliente VIP', 'Más de 5 pedidos o ticket promedio alto', '{"min_orders":6}'::jsonb, 30),
('at_risk', 'En riesgo', 'No compra desde hace más de 60 días', '{"days_since_last_order":60}'::jsonb, 25);

INSERT INTO public.dynamic_pricing_rules (segment_id, scope, discount_percent, message, priority) VALUES
((SELECT id FROM public.customer_segments WHERE code='new_visitor'), 'global', 5, '¡Bienvenida! Llévate 5% en tu primer pedido.', 10),
((SELECT id FROM public.customer_segments WHERE code='recurring'), 'global', 7, 'Gracias por volver: 7% de descuento por ser cliente recurrente.', 20),
((SELECT id FROM public.customer_segments WHERE code='vip'), 'global', 12, 'VIP Nutribatidos: 12% adicional en toda tu compra.', 30),
((SELECT id FROM public.customer_segments WHERE code='at_risk'), 'global', 15, 'Te extrañamos: 15% para reencender tu rutina.', 25);
