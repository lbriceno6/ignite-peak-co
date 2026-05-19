Voy a ampliar el panel de administración de tema (`/admin/theme`) con cuatro capacidades nuevas, manteniendo el mismo motor de tokens en `site_content` y aplicándose en vivo a toda la tienda vía `ThemeProvider`.

## 1. Subir fuentes personalizadas (WOFF/TTF/WOFF2/OTF)

- Crear bucket público `brand-fonts` (migración) con políticas: lectura pública, subida/borrado solo admins.
- En `AdminTheme.tsx`, nueva sección **"Fuentes personalizadas"**:
  - Input file (acepta .woff,.woff2,.ttf,.otf), nombre de familia, botón subir.
  - Lista de fuentes subidas con previsualización y botón eliminar.
  - Botones "Usar en títulos" / "Usar en cuerpo" que asignan la familia a `theme.font_display` / `theme.font_body`.
- Guardar metadatos en nueva clave `theme.custom_fonts` (JSON: `[{family, url, format}]`) en `site_content`.
- `src/lib/theme.ts`: `applyTheme` inyecta `@font-face` para cada fuente personalizada antes de aplicar la familia seleccionada. El `<Select>` de fuentes incluye las personalizadas al inicio del listado.

## 2. Presets de paleta y tipografía

- Definir en `src/lib/theme.ts` un array `THEME_PRESETS` con presets curados:
  - **Nutribatidos (default)** — verde lima sobre negro
  - **Premium Negro** — negro/dorado, fuentes serif elegantes (Cormorant + Inter)
  - **Deportivo Azul** — azul eléctrico/blanco, Oswald + Inter
  - **Energía Naranja** — naranja/carbón, Bebas Neue + Work Sans
  - **Wellness Verde** — sage/cream, Playfair + Lora
  - **Minimal Claro** — blanco/negro, Space Grotesk + DM Sans
- Cada preset incluye todos los tokens de color, fuentes y radius (y opcionalmente valores para modo oscuro).
- Nueva sección **"Presets"** al inicio del admin con tarjetas clicables que muestran swatches y nombre de fuentes. Al hacer clic, rellenan todos los valores (con preview en vivo; el usuario debe guardar).

## 3. Validación de contraste WCAG

- En `src/lib/theme.ts`, helpers `getContrastRatio(hsl1, hsl2)` y `wcagLevel(ratio)` → "AAA" | "AA" | "AA Large" | "Fail".
- En cada `ColorRow` afectado, mostrar badge de contraste cuando el token tiene un par conocido (mapa de pares: background↔foreground, primary↔primary_foreground, accent↔accent_foreground, muted↔muted_foreground, card↔card-foreground).
- Si el ratio es < 4.5, mostrar warning con icono y sugerencia: "Aumenta/reduce la luminosidad para alcanzar AA (4.5:1)". Botón "Sugerir color legible" que ajusta automáticamente la L del HSL hasta cumplir AA contra su par.

## 4. Modo oscuro/claro con tokens separados

- Duplicar todos los tokens de color como `theme.dark.*` en `THEME_KEYS` y `THEME_DEFAULTS` (los valores actuales de `.dark` en `index.css`).
- `applyTheme` aplica las vars normales a `:root` y las vars `dark` a `.dark` mediante un `<style>` inyectado (ya que CSS vars necesitan estar dentro de un selector).
- En el admin, **toggle de tabs "Claro / Oscuro"** que cambia qué set de tokens edita; live preview alterna la clase `dark` del root durante la edición.
- Selector global de tema (claro/oscuro/sistema) almacenado en `localStorage`. Añadir botón sol/luna en el header (`src/components/Header.tsx`) que alterna la clase `dark` en `document.documentElement`. `ThemeProvider` inicializa el modo al cargar.
- Los presets traen ambos sets (claro + oscuro) cuando aplica.

## Detalles técnicos

- **Migración**: solo crear bucket `brand-fonts` + políticas RLS. Sin cambios de schema (todo cabe en `site_content` como clave/valor JSON o string).
- **Realtime**: el `ThemeProvider` ya escucha cambios en `site_content`; se beneficiará automáticamente.
- **Tipos**: nuevos keys se añaden a la unión `ThemeKey`. Sin tocar `types.ts` (generado).
- **Compat**: defaults conservan look actual; cualquier instalación existente sigue funcionando.

## Archivos a tocar/crear

- `supabase/migrations/...` (nuevo) — bucket + RLS de `brand-fonts`
- `src/lib/theme.ts` — presets, contrast, custom fonts, dark tokens
- `src/components/ThemeProvider.tsx` — modo claro/oscuro, inicialización
- `src/pages/admin/AdminTheme.tsx` — UI de presets, fuentes, contraste, tabs claro/oscuro
- `src/components/Header.tsx` — toggle sol/luna
- `src/index.css` — nada que tocar (los overrides se hacen vía JS)
