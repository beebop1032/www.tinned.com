export const AUTH_STORAGE_KEY = "tinned_session_v1";

export type TinnedSession = {
  id?: number;
  email: string;
  token: string;
  refreshToken?: string;
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
    refreshToken: typeof candidate.refreshToken === "string" ? candidate.refreshToken : undefined,
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

// One shared in-flight refresh so concurrent 401s trigger a single /token/refresh.
let refreshInFlight: Promise<TinnedSession | null> | null = null;

/**
 * Exchanges the stored refresh token for a fresh access token (and a rotated refresh
 * token), updating the stored session in place. Returns the new session, or null when
 * there is no refresh token or the server rejects it (in which case the session is
 * cleared). A network error returns null WITHOUT clearing, so a transient blip doesn't
 * log the user out.
 */
export function refreshAccessToken(): Promise<TinnedSession | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (refreshInFlight) return refreshInFlight;

  const current = readStoredSession();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!current?.refreshToken || !apiUrl) return Promise.resolve(null);

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${apiUrl.replace(/\/$/, "")}/api/token/refresh`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refresh_token: current.refreshToken }),
      });
      if (!res.ok) {
        clearStoredSession();
        return null;
      }
      const data = (await res.json()) as { token?: string; refresh_token?: string };
      if (!data.token) {
        clearStoredSession();
        return null;
      }
      const next: TinnedSession = { ...current, token: data.token, refreshToken: data.refresh_token ?? current.refreshToken };
      updateStoredSession(next);
      return next;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
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
