"use client";

import { CheckCircle2, LockKeyhole, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AUTH_STORAGE_KEY, type TinnedSession } from "@/lib/auth";
import { loginCustomer, registerCustomer, requestPasswordReset, resetPassword } from "@/lib/customer-api";

type AuthMode = "login" | "register" | "forgot" | "reset";

function redirectTarget() {
  if (typeof window === "undefined") return "/cart";
  const params = new URLSearchParams(window.location.search);
  return params.get("redirect") || "/cart";
}

export function AuthClient() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const target = useMemo(redirectTarget, []);
  const [resetToken, setResetToken] = useState("");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("reset");
    if (token) {
      setResetToken(token);
      setMode("reset");
    }
  }, []);

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setNotice(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const phone = String(formData.get("phone") ?? "");
    const firstName = String(formData.get("firstName") ?? "");
    const lastName = String(formData.get("lastName") ?? "");
    const acceptedTerms = formData.get("acceptedTerms") === "on";
    const marketingConsent = formData.get("marketingConsent") === "on";

    setError(null);
    setNotice(null);
    setSubmitting(true);

    try {
      if (mode === "forgot") {
        await requestPasswordReset(email);
        setNotice("Si un compte correspond à cet email, vous recevrez un lien de réinitialisation.");
        setSubmitting(false);
        return;
      }

      if (mode === "reset") {
        const confirmation = String(formData.get("passwordConfirmation") ?? "");
        if (password !== confirmation) {
          throw new Error("Les deux mots de passe ne correspondent pas.");
        }

        await resetPassword({ token: resetToken, password });
        setNotice("Votre mot de passe a été modifié. Vous pouvez maintenant vous connecter.");
        setMode("login");
        window.history.replaceState({}, "", `/auth?redirect=${encodeURIComponent(target)}`);
        setSubmitting(false);
        return;
      }

      if (mode === "register" && password !== String(formData.get("passwordConfirmation") ?? "")) {
        throw new Error("Les deux mots de passe ne correspondent pas.");
      }

      const session: TinnedSession = mode === "register"
        ? await registerCustomer({ email, password, firstName, lastName, phone, acceptedTerms, marketingConsent })
        : await loginCustomer({ email, password });
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      window.dispatchEvent(new Event("tinned-auth-updated"));
      window.location.href = target;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Connexion impossible pour le moment.");
      setSubmitting(false);
    }
  };

  return (
    <section className="container section">
      <div className="funnel-heading">
        <div>
          <span className="eyebrow">Espace client</span>
          <h1 className="page-title">Vos envies vous attendent.</h1>
          <p className="lead">Connectez-vous pour retrouver vos achats et commander en toute simplicité.</p>
        </div>
      </div>

      <div className="auth-layout">
        <form className="checkout-panel auth-panel" onSubmit={submit}>
          <header className="auth-panel-header">
            <span className="auth-lock"><LockKeyhole size={20} aria-hidden /></span>
            <div>
              <h2>
                {mode === "login" && "Ravi de vous revoir"}
                {mode === "register" && "Bienvenue chez Tinned"}
                {mode === "forgot" && "Retrouver votre accès"}
                {mode === "reset" && "Choisir un nouveau mot de passe"}
              </h2>
              <p>
                {mode === "login" && "Retrouvez vos commandes et votre panier."}
                {mode === "register" && "Quelques informations pour préparer vos prochaines commandes."}
                {mode === "forgot" && "Recevez un lien sécurisé par email."}
                {mode === "reset" && "Sécurisez à nouveau votre compte."}
              </p>
            </div>
          </header>

          {mode !== "reset" ? (
            <div className="segmented-control" role="tablist" aria-label="Mode d'authentification">
              <button className={mode === "login" ? "is-active" : ""} type="button" onClick={() => changeMode("login")}>Se connecter</button>
              <button className={mode === "register" ? "is-active" : ""} type="button" onClick={() => changeMode("register")}>Créer un compte</button>
            </div>
          ) : null}

          {mode === "register" ? (
            <div className="auth-registration-fields">
              <label className="field"><span>Prénom</span><input type="text" name="firstName" required placeholder="Votre prénom" autoComplete="given-name" /></label>
              <label className="field"><span>Nom</span><input type="text" name="lastName" required placeholder="Votre nom" autoComplete="family-name" /></label>
            </div>
          ) : null}
          {mode !== "reset" ? <label className="field"><span>Email</span><input type="email" name="email" required placeholder="vous@email.com" autoComplete="email" /></label> : null}
          {mode === "register" ? <label className="field"><span>Numéro de téléphone</span><input type="tel" name="phone" required placeholder="+32 4XX XX XX XX" autoComplete="tel" /></label> : null}
          {mode !== "forgot" ? <label className="field"><span>Mot de passe</span><input type="password" name="password" required minLength={8} placeholder="Minimum 8 caractères" autoComplete={mode === "login" ? "current-password" : "new-password"} /></label> : null}
          {mode === "register" ? <label className="field"><span>Confirmer le mot de passe</span><input type="password" name="passwordConfirmation" required minLength={8} placeholder="Répétez votre mot de passe" autoComplete="new-password" /></label> : null}
          {mode === "reset" ? <label className="field"><span>Confirmer le mot de passe</span><input type="password" name="passwordConfirmation" required minLength={8} placeholder="Répétez votre mot de passe" autoComplete="new-password" /></label> : null}
          {mode === "register" ? (
            <div className="auth-consents">
              <label className="terms-row">
                <input type="checkbox" name="acceptedTerms" required />
                <span>J'accepte les conditions générales et la politique de traitement des données de Tinned.</span>
              </label>
              <label className="terms-row">
                <input type="checkbox" name="marketingConsent" />
                <span>Je souhaite recevoir les actualités et offres de Tinned par email. <small>Optionnel</small></span>
              </label>
            </div>
          ) : null}

          {mode === "login" ? <button className="auth-forgot-link" type="button" onClick={() => changeMode("forgot")}>Mot de passe oublié ?</button> : null}
          {error ? <p className="summary-note" role="alert">{error}</p> : null}
          {notice ? <p className="auth-notice" role="status">{notice}</p> : null}
          <button className="button checkout-submit" type="submit" disabled={submitting}>
            {submitting && "Validation..."}
            {!submitting && mode === "login" && "Se connecter"}
            {!submitting && mode === "register" && "Créer mon compte"}
            {!submitting && mode === "forgot" && "Recevoir le lien"}
            {!submitting && mode === "reset" && "Enregistrer mon mot de passe"}
          </button>
          {mode === "forgot" || mode === "reset" ? <button className="auth-back-link" type="button" onClick={() => changeMode("login")}>Retour à la connexion</button> : null}

          <div className="auth-reassurance" aria-label="Garanties du compte client">
            <span><ShieldCheck size={16} aria-hidden /> Compte protégé</span>
            <span><PackageCheck size={16} aria-hidden /> Panier conservé</span>
          </div>
        </form>

        <aside className="order-summary auth-summary">
          <span className="eyebrow">Vos avantages</span>
          <h2>Commandez l'esprit léger</h2>
          <div className="auth-benefit"><CheckCircle2 size={18} aria-hidden /><span>Retrouvez facilement vos coups de coeur et vos achats.</span></div>
          <div className="auth-benefit"><Truck size={18} aria-hidden /><span>Choisissez la livraison qui vous convient pour chaque commande.</span></div>
          <div className="auth-benefit"><PackageCheck size={18} aria-hidden /><span>Suivez toutes vos commandes depuis votre espace personnel.</span></div>
        </aside>
      </div>
    </section>
  );
}
