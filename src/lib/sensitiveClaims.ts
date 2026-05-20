// Validate text against medical / unsupported claims and suggest replacements.
export type ClaimRule = { pattern: string; severity: "high" | "medium" | "low"; suggestion: string };
export type ClaimHit = { rule: ClaimRule; index: number; match: string };

const DEFAULTS: ClaimRule[] = [
  { pattern: "cura", severity: "high", suggestion: "ayuda a complementar" },
  { pattern: "curar", severity: "high", suggestion: "ayuda a complementar" },
  { pattern: "elimina enfermedades", severity: "high", suggestion: "contribuye al bienestar" },
  { pattern: "trata diabetes", severity: "high", suggestion: "producto alimenticio natural" },
  { pattern: "sana órganos", severity: "high", suggestion: "apoya una rutina saludable" },
  { pattern: "reemplaza medicamentos", severity: "high", suggestion: "no reemplaza tratamiento médico" },
];

export function scanSensitiveClaims(text: string, rules: ClaimRule[] = DEFAULTS): ClaimHit[] {
  if (!text) return [];
  const lc = text.toLowerCase();
  const hits: ClaimHit[] = [];
  for (const r of rules) {
    const pat = r.pattern.toLowerCase();
    let from = 0;
    while (true) {
      const i = lc.indexOf(pat, from);
      if (i === -1) break;
      hits.push({ rule: r, index: i, match: text.slice(i, i + pat.length) });
      from = i + pat.length;
    }
  }
  return hits;
}

export function highestSeverity(hits: ClaimHit[]): "none" | "low" | "medium" | "high" {
  if (!hits.length) return "none";
  if (hits.some((h) => h.rule.severity === "high")) return "high";
  if (hits.some((h) => h.rule.severity === "medium")) return "medium";
  return "low";
}
