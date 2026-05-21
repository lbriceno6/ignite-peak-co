// Anonymous visitor + session identification.
const VISITOR_KEY = "nutribatidos_visitor_id";
const SESSION_KEY = "nutribatidos_session_id";
const SESSION_TS_KEY = "nutribatidos_session_ts";
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 min inactivity

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "v-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getVisitorId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = uuid();
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

export function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  const now = Date.now();
  const last = Number(sessionStorage.getItem(SESSION_TS_KEY) || 0);
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id || now - last > SESSION_TTL_MS) {
    id = uuid();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  sessionStorage.setItem(SESSION_TS_KEY, String(now));
  return id;
}
