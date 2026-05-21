
-- Settings singleton
CREATE TABLE public.chat_ai_settings (
  id integer PRIMARY KEY DEFAULT 1,
  enabled boolean NOT NULL DEFAULT true,
  show_on_home boolean NOT NULL DEFAULT true,
  show_on_product boolean NOT NULL DEFAULT true,
  show_on_category boolean NOT NULL DEFAULT true,
  show_on_landing boolean NOT NULL DEFAULT true,
  hide_whatsapp_button boolean NOT NULL DEFAULT true,
  provider text NOT NULL DEFAULT 'gemini',
  model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  temperature numeric NOT NULL DEFAULT 0.7,
  max_tokens integer NOT NULL DEFAULT 800,
  history_size integer NOT NULL DEFAULT 10,
  save_conversations boolean NOT NULL DEFAULT true,
  whatsapp_number text NOT NULL DEFAULT '14155552671',
  proactive_bubble_enabled boolean NOT NULL DEFAULT true,
  proactive_bubble_delay_ms integer NOT NULL DEFAULT 8000,
  assistant_name text NOT NULL DEFAULT 'Lucía',
  assistant_tagline text NOT NULL DEFAULT 'Tu asesora Nutri',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_ai_settings_singleton CHECK (id = 1)
);

ALTER TABLE public.chat_ai_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads chat settings" ON public.chat_ai_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage chat settings" ON public.chat_ai_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

INSERT INTO public.chat_ai_settings (id) VALUES (1);

-- Prompts
CREATE TABLE public.chat_ai_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Lucía',
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT false,
  provider text,
  model text,
  system_prompt text NOT NULL DEFAULT '',
  business_rules text NOT NULL DEFAULT '',
  safety_rules text NOT NULL DEFAULT '',
  sales_rules text NOT NULL DEFAULT '',
  fallback_rules text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_ai_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active prompt" ON public.chat_ai_prompts FOR SELECT
  USING (is_active = true OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins manage prompts" ON public.chat_ai_prompts FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

INSERT INTO public.chat_ai_prompts (name, version, is_active, system_prompt, business_rules, safety_rules, sales_rules, fallback_rules)
VALUES (
  'Lucía', 1, true,
  'Eres Lucía, asesora Nutri IA de Nutribatidos. Tu personalidad: amable, cercana, humana, paciente y clara. No hablas como robot. Ayudas al cliente como una asesora real de tienda online. Tu objetivo: ayudar a elegir productos reales de Nutribatidos según objetivo, ingrediente o necesidad. Responde en español, tono cálido y natural, haz preguntas cortas si falta información, mantén respuestas breves.',
  'No inventes productos, precios ni stock. Usa solo productos reales enviados en el contexto. Recomienda máximo 3 productos. Si el usuario está viendo un producto, prioriza ese producto. Cuando recomiendes productos, incluye nombre, beneficio principal seguro, precio y stock si está disponible, y menciona que puede ver el producto o comprar por WhatsApp.',
  'No prometas curas médicas. No digas que cura enfermedades. No digas que elimina diabetes, artrosis, osteoporosis u otras enfermedades. Usa frases seguras como: "puede ayudar a complementar tu alimentación", "puede apoyar una rutina saludable", "contribuye al bienestar general", "ideal como parte de una alimentación balanceada".',
  'Flujo: 1) Saluda de forma natural si corresponde. 2) Identifica qué busca el cliente. 3) Si falta info, pregunta su objetivo. 4) Recomienda productos reales. 5) Explica brevemente por qué podrían ayudarle. 6) Invita a ver el producto o hablar por WhatsApp.',
  'Si no sabes algo, ofrece derivar a WhatsApp con un mensaje cálido como: "Para esa duda específica te recomiendo escribirnos por WhatsApp y te atendemos personalmente 😊".'
);

-- Sessions
CREATE TABLE public.chat_ai_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  user_id uuid,
  customer_name text,
  customer_phone text,
  customer_email text,
  source text NOT NULL DEFAULT 'website',
  first_page text,
  last_page text,
  current_product_id uuid,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_sessions_created ON public.chat_ai_sessions (created_at DESC);

ALTER TABLE public.chat_ai_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone creates session" ON public.chat_ai_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone updates own session" ON public.chat_ai_sessions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Admins view sessions" ON public.chat_ai_sessions FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR auth.uid() = user_id);

-- Messages
CREATE TABLE public.chat_ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  provider text,
  model text,
  intent text,
  current_page text,
  product_id uuid,
  matched_products jsonb NOT NULL DEFAULT '[]'::jsonb,
  prompt_version_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  tokens_input integer,
  tokens_output integer,
  latency_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_msg_session ON public.chat_ai_messages (session_id, created_at);

ALTER TABLE public.chat_ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone inserts messages" ON public.chat_ai_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view messages" ON public.chat_ai_messages FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

-- Feedback
CREATE TABLE public.chat_ai_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  message_id uuid,
  rating text NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_ai_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone inserts feedback" ON public.chat_ai_feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view feedback" ON public.chat_ai_feedback FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));
