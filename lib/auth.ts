export const AUTH_STORAGE_KEY = "tinned_session_v1";

export type TinnedSession = {
  id?: number;
  email: string;
  token: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  marketingConsent?: boolean;
};

export function normalizeSession(value: unknown): TinnedSession | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<TinnedSession>;
  if (typeof candidate.email !== "string" || !candidate.email.includes("@")) return null;
  if (typeof candidate.token !== "string" || candidate.token.length < 20) return null;
  return {
    id: typeof candidate.id === "number" ? candidate.id : undefined,
    email: candidate.email,
    token: candidate.token,
    firstName: typeof candidate.firstName === "string" ? candidate.firstName : undefined,
    lastName: typeof candidate.lastName === "string" ? candidate.lastName : undefined,
    phone: typeof candidate.phone === "string" ? candidate.phone : undefined,
    marketingConsent: typeof candidate.marketingConsent === "boolean" ? candidate.marketingConsent : undefined
  };
}

export function readStoredSession(): TinnedSession | null {
  if (typeof window === "undefined") return null;
  try {
    // sessionStorage (this-browser-session only) takes precedence over localStorage
    // (persistent). Reading both means "Rester connecté" unchecked still works.
    const raw = window.sessionStorage.getItem(AUTH_STORAGE_KEY) ?? window.localStorage.getItem(AUTH_STORAGE_KEY);
    return normalizeSession(JSON.parse(raw ?? "null"));
  } catch {
    return null;
  }
}

/**
 * Persists the session. When `remember` is true it goes to localStorage (survives
 * browser restarts); otherwise to sessionStorage (cleared when the browser closes).
 * Always clears the other store so there is a single source of truth.
 */
export function writeStoredSession(session: TinnedSession, remember: boolean) {
  if (typeof window === "undefined") return;
  const value = JSON.stringify(session);
  if (remember) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, value);
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
  } else {
    window.sessionStorage.setItem(AUTH_STORAGE_KEY, value);
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
  window.dispatchEvent(new Event("tinned-auth-updated"));
}

/** Updates the stored session in place, keeping its current persistence (session vs local). */
export function updateStoredSession(session: TinnedSession) {
  if (typeof window === "undefined") return;
  const inSessionStore = window.sessionStorage.getItem(AUTH_STORAGE_KEY) !== null;
  writeStoredSession(session, !inSessionStore);
}

/** Clears the session from both stores. */
export function clearStoredSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
  window.dispatchEvent(new Event("tinned-auth-updated"));
}

export function sessionHasRole(session: TinnedSession | null, role: string) {
  if (!session?.token || typeof window === "undefined") return false;
  try {
    const payload = session.token.split(".")[1];
    if (!payload) return false;
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const json = JSON.parse(window.atob(normalizedPayload)) as { roles?: string[] };
    return Array.isArray(json.roles) && json.roles.includes(role);
  } catch {
    return false;
  }
}
