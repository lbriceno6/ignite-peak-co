# Buscador Inteligente con IA para Nutribatidos

Mejora el buscador actual (`/buscar`) sin eliminarlo, agregando una capa de IA configurable desde el admin, y un sistema de "necesidades" mapeadas a categorías y productos para entender frases naturales como "me siento cansado" o "quiero algo para el gimnasio".

## Alcance

- No se elimina ni rompe el buscador actual (`src/pages/Search.tsx`, RPC `search_products`).
- La IA es opcional y configurable: si está apagada o falla, se usa siempre la búsqueda tradicional como fallback.
- Sin promesas médicas. Frases neutras tipo "puede ayudarte como complemento nutricional".

## 1. Base de datos (migración)

Tabla `search_ai_settings` (singleton, id=1):
- enabled (bool), provider (gemini/openai/deepseek/claude/off), model
- api_key (texto, opcional)
- prompt_template (texto, editable)
- result_mode (productos | categorias | combos | todos)
- min_confidence, temperature, max_tokens
- fallback_whatsapp_enabled, helper_text

Tabla `search_needs`:
- id, slug, name (ej "Energía")
- keywords (text[]) — palabras clave normalizadas
- intent (texto)
- related_category (slug)
- related_products (uuid[])
- priority (int), is_active (bool)
- message (texto humano para mostrar)
- created_at, updated_at

GRANTs estándar (anon select para `search_needs` activas y `search_ai_settings` lectura pública sin api_key; admin via service_role). RLS: lectura pública del catálogo de necesidades; escritura solo admin.

Seed inicial con las necesidades del brief: Energía, Digestión, Colágeno, Fitness, Sin azúcar, Nutrición diaria, Combos.

## 2. Edge function `intelligent-search`

`supabase/functions/intelligent-search/index.ts`:
- Input: `{ query }`
- Flujo:
  1. Normaliza texto (minúsculas, sin tildes).
  2. Lee `search_ai_settings`.
  3. Match exacto en productos (RPC existente) y categorías.
  4. Match en `search_needs.keywords`.
  5. Si no hay match y IA activa, llama al proveedor (default Lovable AI Gateway con Gemini) con `prompt_template` + lista resumida de necesidades/categorías disponibles, esperando JSON:
     ```
     { intent, need, category, products, message }
     ```
  6. Devuelve `{ source: "exact"|"need"|"ai"|"none", need, category_slug, product_ids, message }`.
- Si IA falla → devuelve `source: "none"` y deja que el frontend caiga al buscador tradicional.

## 3. Admin: `Configuración del Buscador IA`

Nueva ruta `/admin/buscador-ia` (`src/pages/admin/AdminSearchAi.tsx`) con dos tabs:

**Tab "Configuración"**
- Switch activar/desactivar
- Select proveedor (Gemini / OpenAI / DeepSeek / Claude / Desactivada)
- Input API Key (oculta, opcional — Gemini funciona con Lovable AI sin key)
- Textarea prompt editable (con reset a default)
- Select modo de resultado (productos/categorías/combos/todos)
- Sliders: confianza mínima, temperatura, max tokens
- Toggle "Mostrar botón WhatsApp si no hay resultados"
- Input texto helper bajo el buscador

**Tab "Necesidades"**
- Tabla CRUD de `search_needs`
- Form: nombre, slug, keywords (chips), intención, categoría relacionada (select de categorías existentes), productos relacionados (multi-select), prioridad, mensaje humano, activo
- Botón "Sembrar necesidades base" para insertar el set inicial si la tabla está vacía

Agregar entrada en sidebar admin (`AdminLayout`).

## 4. Frontend del buscador

**`src/lib/intelligentSearch.ts`**
- `normalize(text)` (sin tildes, minúsculas).
- `intelligentSearch(query)`: llama edge function, maneja errores con fallback.
- Helper para construir URL destino según resultado: `/categoria/<slug>` si hay categoría, `/buscar?q=...` si hay productos sueltos.

**`src/components/Header.tsx` (input de búsqueda)**
- Al submit: llamar `intelligentSearch`, redirigir según resultado.
- Mostrar sugerencias automáticas (derivadas de `search_needs` activas) al escribir.
- Helper text editable bajo el input.

**`src/pages/Search.tsx`**
- Aceptar `?q=`, `?necesidad=`, `?categoria=`.
- Si `necesidad` o `categoria` presentes: header tipo "Productos recomendados para Energía" + mensaje humano de la necesidad + botones (Ver categoría completa / WhatsApp Lucía).
- Si `q=` se mantiene el flujo actual (RPC `search_products`) — sin tocar la lógica existente.
- Si 0 resultados y IA permite WhatsApp: mostrar bloque "No encontramos un producto exacto…" con botón a Lucía/WhatsApp.

## 5. Reglas de seguridad y rendimiento

- Edge function valida `query` (1–200 chars).
- Rate limit simple en memoria por IP (5 req/seg).
- Nunca prometer cura; el prompt incluye prohibiciones explícitas.
- Priorizar productos activos y con stock (filtro en query final).
- Si IA falla / 429 / 402: log y caer a búsqueda tradicional silenciosamente.

## Archivos a crear / modificar

Crear:
- `supabase/migrations/<ts>_search_ai.sql`
- `supabase/functions/intelligent-search/index.ts`
- `src/lib/intelligentSearch.ts`
- `src/pages/admin/AdminSearchAi.tsx`

Modificar:
- `src/App.tsx` — ruta admin
- `src/components/admin/AdminLayout.tsx` — link sidebar
- `src/components/Header.tsx` — submit del buscador + sugerencias + helper text
- `src/pages/Search.tsx` — soporte `?necesidad=` / `?categoria=` + bloque "sin resultados"

No tocar: productos, carrito, checkout, promociones, mega menú, tema.

## Detalles técnicos (resumen)

- Proveedor IA default = Lovable AI Gateway (`LOVABLE_API_KEY`), modelo `google/gemini-2.5-flash`.
- Respuesta IA forzada a JSON via system prompt; parse seguro con try/catch.
- `search_needs.keywords` se busca con array overlap normalizado.
- Sugerencias del header: top 5 `search_needs` ordenadas por prioridad, filtradas por substring del input.
