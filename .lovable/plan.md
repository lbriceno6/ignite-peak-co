# Plan: Lucía — Asesora Virtual IA de Nutribatidos

## Resumen

Reemplazar el botón flotante de WhatsApp por **Lucía**, una asesora IA humana, contextual (Home/Producto/Categoría/Landing), con multi-proveedor (DeepSeek, OpenAI, Gemini, Claude), panel admin completo, gestión de prompts versionados y registro de conversaciones.

---

## 1. Base de datos (migración)

**Tablas nuevas:**
- `chat_ai_settings` (singleton id=1): provider, model, temperature, max_tokens, history_size, enabled flags por contexto (home/product/category/landing), proactive bubble + delay, whatsapp_number, save_conversations, hide_whatsapp_button.
- `chat_ai_sessions`: session_id, user_id, customer_name/phone/email, source, first_page, last_page, current_product_id, status.
- `chat_ai_messages`: session_id, role, content, provider, model, intent, current_page, product_id, matched_products (jsonb), prompt_version_id, metadata, tokens_input/output, latency_ms.
- `chat_ai_feedback`: session_id, message_id, rating, comment.
- `chat_ai_prompts`: name, version, is_active, provider, model, system_prompt, business_rules, safety_rules, sales_rules, fallback_rules.

**RLS:** Admins gestionan todo. `sessions/messages/feedback` permiten INSERT público (sesiones anónimas). `settings` y prompts activos legibles públicamente (frontend necesita config). Prompts completos solo admin.

**Seed:** settings default + 1 prompt activo de Lucía (el texto base proporcionado).

## 2. Secrets

Solicitar al usuario: `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `CLAUDE_API_KEY`. `LOVABLE_API_KEY` ya existe (sirve como fallback para Gemini/OpenAI vía gateway). Solo pediré las claves cuando el admin seleccione un proveedor que no esté disponible.

## 3. Edge Function `ai-chat`

- Recibe: `{ session_id, message, context: { page, product?, category?, landing? }, history[] }`.
- Carga settings + prompt activo + datos reales del producto/categoría/landing desde DB.
- Construye system prompt + contexto productos (top 6 relevantes con nombre/precio/stock/slug/imagen/beneficio).
- Llama al proveedor configurado (DeepSeek/OpenAI/Gemini/Claude) con la API correspondiente.
- Detecta intención básica + extrae `matched_products` (slugs mencionados).
- Persiste user + assistant messages, devuelve `{ reply, products: [...], intent }`.

## 4. Componente `LuciaChat` (frontend)

- Botón flotante (reemplaza `WhatsAppButton`): avatar circular, punto verde "en línea", animación pulse suave, burbuja proactiva tras N segundos, badge "Lucía / Tu asesora Nutri".
- Drawer/panel inferior derecho con header "Lucía 😊 En línea", mensajes con markdown, botones rápidos contextuales, input, botón "Hablar por WhatsApp" siempre visible al final.
- Tarjetas de producto inline cuando el assistant devuelve `products[]` (imagen, nombre, precio, stock, "Ver producto" + "Comprar por WhatsApp" con mensaje personalizado).
- Hook `useLuciaContext()` detecta ruta actual y carga producto/categoría/landing por slug.
- Settings: si `enabled=false` o página no incluida → no renderiza. Si activo → oculta `WhatsAppButton`.
- Analytics: dispara los 8 eventos vía `track()`.

## 5. Integración Layout

- `Layout.tsx`: render condicional — si `lucia.enabled` y página incluida → `<LuciaChat />` (oculta WhatsApp); sino → `<WhatsAppButton />`.

## 6. Panel admin `/admin/chat-ia`

Página con 3 tabs:

### Tab 1: Conversaciones
Lista de sesiones con filtros (fecha, producto, intención, proveedor, página). Click → diálogo con thread completo, productos recomendados, indicador de clic WhatsApp.

### Tab 2: Configuración
Form con todos los toggles + selects (proveedor, modelo dinámico según proveedor), sliders (temperature, tokens, history), inputs WhatsApp y delay burbuja, toggles por contexto, toggle ocultar WhatsApp.

### Tab 3: Prompts
Lista de versiones, editor con tabs (system/business/safety/sales/fallback), botones: guardar nueva versión, duplicar, activar, restaurar, **Probar** (llama `ai-chat` en modo test y muestra respuesta + tokens + productos usados).

Ruta agregada a `App.tsx` bajo `AdminRoute`. Link en `AdminLayout` sidebar.

## 7. WhatsApp dinámico

Función `buildWhatsAppMessage(context)`:
- Home: "Hola, Lucía me recomendó recibir asesoría para elegir un producto de Nutribatidos."
- Producto: `Hola, quiero información sobre ${product.name}. Lo vi en la web de Nutribatidos y Lucía me lo recomendó.`
- Número desde settings.

## 8. Páginas con Lucía

`Index`, `ProductDetail`, `Category`, `SeoLanding` ya están en Layout → render automático. El hook lee la ruta y entidad.

---

## Notas técnicas

- Usaré `LOVABLE_API_KEY` (Lovable AI Gateway) para OpenAI/Gemini sin pedir secrets — más rápido para el usuario. DeepSeek y Claude requieren sus propias API keys que pediré al admin **solo cuando seleccione ese proveedor** en el panel (no upfront).
- Mensajes guardados con `session_id` en localStorage (anónimo) — sin requerir login.
- Tarjetas de producto: query lateral por slugs devueltos para asegurar precio/stock fresco.
- Prompt de seguridad incluye reglas anti-claims médicos (reutiliza `sensitiveClaims`).

## Archivos clave

**Nuevos:**
- `supabase/migrations/<ts>_lucia.sql`
- `supabase/functions/ai-chat/index.ts`
- `src/components/LuciaChat.tsx` + `LuciaButton.tsx` + `LuciaMessage.tsx` + `LuciaProductCard.tsx`
- `src/hooks/useLuciaContext.ts` + `useLuciaSettings.ts`
- `src/pages/admin/AdminChatAI.tsx` + tabs (`ConversationsTab`, `SettingsTab`, `PromptsTab`)
- `src/lib/lucia.ts` (helpers)

**Editados:**
- `src/components/Layout.tsx` (swap WhatsApp ↔ Lucía)
- `src/App.tsx` (ruta `/admin/chat-ia`)
- `src/components/admin/AdminLayout.tsx` (link nav)

¿Procedo con la implementación? Empezaré por la migración y luego pediré la API key de DeepSeek/Claude solo si el admin las necesita después.