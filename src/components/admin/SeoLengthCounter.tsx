// Contador visual de caracteres para SEO title / meta description.
import { descriptionState, stateClass, stateIcon, stateLabel, titleState, TITLE_MAX, DESC_MAX } from "@/lib/landingSeoRules";

export default function SeoLengthCounter({ value, kind }: { value?: string | null; kind: "title" | "description" }) {
  const len = (value ?? "").trim().length;
  const state = kind === "title" ? titleState(value) : descriptionState(value);
  const max = kind === "title" ? TITLE_MAX : DESC_MAX;
  return (
    <p className={`mt-1 text-xs ${stateClass(state)}`}>
      {stateIcon(state)} {len} / {max} caracteres — {stateLabel(state)}
    </p>
  );
}
