import { slugify } from "@/lib/slug";

export const goalHref = (slug: string) => `/category/goal-${slug}`;

export const isAutoGoalHref = (href?: string | null, slug?: string | null) => {
  if (!href) return true;
  if (!slug) return false;
  return href.trim() === goalHref(slug);
};

export const normalizeGoal = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

// Given a free-text goal value (slug or visible name), find the matching goal card slug.
export const resolveGoalSlug = (
  value: string | null | undefined,
  goalCards: { name: string; slug: string }[],
): string | null => {
  if (!value) return null;
  const norm = normalizeGoal(value);
  // direct slug match
  const bySlug = goalCards.find((g) => g.slug === value || g.slug === norm);
  if (bySlug) return bySlug.slug;
  // by normalized name
  const byName = goalCards.find((g) => normalizeGoal(g.name) === norm);
  if (byName) return byName.slug;
  return null;
};

export const suggestSpanishSlug = (name: string) => slugify(name);
