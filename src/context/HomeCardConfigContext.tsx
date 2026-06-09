import { createContext, useContext } from "react";
import type { HomeProductCardStyle } from "@/lib/homeProductCardStyle";

export const HomeCardConfigContext = createContext<HomeProductCardStyle | null>(null);

export const useHomeCardConfig = () => useContext(HomeCardConfigContext);
