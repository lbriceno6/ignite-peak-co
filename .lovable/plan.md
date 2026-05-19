## Editar tarjetas de Goals desde Admin

### Objetivo
Permitir que desde el panel de administración se puedan editar los títulos, subtítulos, CTAs y el orden de cada tarjeta del bloque "Shop by goal" (Build muscle, Lose fat, etc.).

### Cambios

**1. Base de datos**
- Crear tabla `goal_cards` con: `slug`, `name`, `description`, `cta_label`, `cta_href`, `sort_order`, `is_active`, `image_url`.
- Insertar las 5 tarjetas existentes como datos iniciales.
- RLS: cualquiera puede ver las activas, solo admins gestionan.

**2. Admin UI**
- Nuevo componente `src/pages/admin/AdminGoalCards.tsx` para listar, reordenar y editar cada tarjeta.
- Añadir ruta `/admin/goal-cards` en `App.tsx`.
- Añadir link "Goal cards" en el sidebar de `AdminLayout.tsx`.

**3. Frontend (Home)**
- En `src/pages/Index.tsx`, dentro del bloque `goals`, sustituir el uso del array hardcodeado `goals` por lectura de la tabla `goal_cards`.
- Mantener fallback con los datos originales si no hay registros.

### Estructura de datos
```text
goal_cards
├── slug (text, PK)
├── name (text)
├── description (text)
├── cta_label (text, nullable)
├── cta_href (text, nullable)
├── sort_order (integer)
├── is_active (boolean)
├── image_url (text, nullable)
├── created_at / updated_at
```