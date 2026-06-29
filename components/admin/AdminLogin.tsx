"use client";

import { FormEvent, useState } from "react";
import { BadgeCheck, Loader2, LockKeyhole } from "lucide-react";
import { AUTH_STORAGE_KEY, sessionHasRole, type TinnedSession } from "@/lib/auth";
import { loginCustomer } from "@/lib/customer-api";

export function AdminLogin({ onLogin }: { onLogin: (session: TinnedSession) => void }) {
  const [email, setEmail] = useState("admin@tinned.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const session = await loginCustomer({ email, password });
      if (!sessionHasRole(session, "ROLE_ADMIN")) {
        throw new Error("Ce compte n'a pas les droits admin.");
      }
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      window.dispatchEvent(new Event("tinned-auth-updated"));
      onLogin(session);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Connexion impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="admin-login-shell">
      <form className="admin-login" onSubmit={submit}>
        <span className="admin-login-icon"><LockKeyhole size={20} aria-hidden /></span>
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Connexion back-office</h1>
        </div>
        <label className="field">
          <span>Email</span>
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required />
        </label>
        <label className="field">
          <span>Mot de passe</span>
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="button admin-submit" type="submit" disabled={submitting}>
          {submitting ? <Loader2 size={18} aria-hidden className="spin" /> : <BadgeCheck size={18} aria-hidden />}
          Entrer dans le dashboard
        </button>
      </form>
    </section>
  );
}
