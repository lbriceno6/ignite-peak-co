import { useMemo } from "react";
import { buildScopedCss, type HomeProductCardStyle } from "@/lib/homeProductCardStyle";

type Props = { style: HomeProductCardStyle; scope?: string };

export const HomeProductCardStyles = ({ style, scope = ".hpc-scope" }: Props) => {
  const css = useMemo(() => buildScopedCss(style, scope), [style, scope]);
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
};
