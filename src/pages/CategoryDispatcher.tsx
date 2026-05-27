import Category from "./Category";

// Todas las rutas de categoría/subcategoría se renderizan con la página
// Category (incluye filtros, paginación, búsqueda, etc.). Category resuelve
// el alcance a partir de :slug, :catSlug y :subSlug.
export default function CategoryDispatcher() {
  return <Category />;
}
