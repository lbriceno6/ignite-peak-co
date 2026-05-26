import { useParams } from "react-router-dom";
import Category from "./Category";
import CategoryTaxonomy from "./CategoryTaxonomy";
import { mainBySlug } from "@/lib/productCategories";

// Despacha entre la página de taxonomía nueva (Productos / Para tu salud / Promociones)
// y la página de Category legacy para slugs antiguos.
export default function CategoryDispatcher() {
  const { slug = "" } = useParams();
  if (mainBySlug[slug]) return <CategoryTaxonomy />;
  return <Category />;
}
