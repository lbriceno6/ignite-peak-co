import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchProducts from "./tools/search-products";
import listMyOrders from "./tools/list-my-orders";
import getMyOrder from "./tools/get-my-order";
import getMyProfile from "./tools/get-my-profile";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "nutribatidos-mcp",
  title: "Nutribatidos",
  version: "0.1.0",
  instructions:
    "Herramientas de la tienda Nutribatidos: buscar productos del catálogo y consultar los pedidos, envíos y perfil del usuario autenticado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchProducts, listMyOrders, getMyOrder, getMyProfile],
});
