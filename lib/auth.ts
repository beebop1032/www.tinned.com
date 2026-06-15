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
    return normalizeSession(JSON.parse(window.localStorage.getItem(AUTH_STORAGE_KEY) ?? "null"));
  } catch {
    return null;
  }
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
