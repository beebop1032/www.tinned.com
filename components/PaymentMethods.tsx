"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from "react";
import { fetchPaymentMethods, type PaymentMethodOption } from "@/lib/customer-api";

// Minimal shape of the mollie.js global we rely on.
type MollieComponent = { mount: (selector: string | HTMLElement) => void; unmount: () => void };
type MollieInstance = {
  createComponent: (type: string, options?: unknown) => MollieComponent;
  createToken: () => Promise<{ token?: string; error?: { message?: string } }>;
};
declare global {
  interface Window {
    Mollie?: (profileId: string, options: { locale?: string; testmode?: boolean }) => MollieInstance;
  }
}

// Handle the checkout form calls at submit time. Returns a token only for a card paid
// on-page; other methods (and the hosted fallback) need none.
export type PaymentMethodsHandle = {
  createToken: () => Promise<{ token?: string; error?: string }>;
};

const MOLLIE_JS = "https://js.mollie.com/v1/mollie.js";
// Optional override; normally the profile id comes from the /payment-methods response so the
// front needs no Mollie config at all.
const ENV_PROFILE_ID = process.env.NEXT_PUBLIC_MOLLIE_PROFILE_ID;
// "true" | "false" | undefined — undefined means "let the API decide".
const ENV_TESTMODE = process.env.NEXT_PUBLIC_MOLLIE_TESTMODE;
const CARD_METHOD = "creditcard";

// The single option shown when Mollie returns nothing (unreachable, or mock mode): the
// order still goes through, on Mollie's hosted page which lists every enabled method.
const HOSTED_FALLBACK: PaymentMethodOption = {
  id: "mollie",
  description: "Carte, Bancontact, iDEAL…",
  image: { size1x: "", size2x: "" }
};

let mollieScriptPromise: Promise<void> | null = null;

// Load mollie.js once per page and resolve when window.Mollie is available.
function loadMollieScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Mollie) return Promise.resolve();
  if (mollieScriptPromise) return mollieScriptPromise;

  mollieScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${MOLLIE_JS}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("mollie.js load error")));
      return;
    }
    const script = document.createElement("script");
    script.src = MOLLIE_JS;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("mollie.js load error"));
    document.head.appendChild(script);
  });
  return mollieScriptPromise;
}

const CARD_FIELDS: Array<{ type: string; label: string; full?: boolean }> = [
  { type: "cardHolder", label: "Titulaire de la carte", full: true },
  { type: "cardNumber", label: "Numéro de carte", full: true },
  { type: "expiryDate", label: "Expiration" },
  { type: "verificationCode", label: "CVC" }
];

// mollie.js styles the text INSIDE its iframes (our CSS can't reach in). Keep it legible
// and close to the app's inputs.
const COMPONENT_STYLES = {
  styles: {
    base: { color: "#1f2937", fontSize: "15px", "::placeholder": { color: "#9ca3af" } },
    valid: { color: "#15803d" },
    invalid: { color: "#dc2626" }
  }
};

type Props = {
  amountCents: number;
  currency: string;
  country: string;
  locale: string;
  value: string;
  onChange: (methodId: string) => void;
};

export const PaymentMethods = forwardRef<PaymentMethodsHandle, Props>(function PaymentMethods(
  { amountCents, currency, country, locale, value, onChange },
  ref
) {
  const [methods, setMethods] = useState<PaymentMethodOption[] | null>(null);
  const [profileId, setProfileId] = useState<string | null>(ENV_PROFILE_ID ?? null);
  const [testmode, setTestmode] = useState<boolean>(ENV_TESTMODE === "true");
  const [cardError, setCardError] = useState<string | null>(null);
  const mollieRef = useRef<MollieInstance | null>(null);
  const mountedComponents = useRef<MollieComponent[]>([]);
  // Card fields can be embedded only once we have a public profile id (env override or served
  // by the API); otherwise a card selection just redirects to Mollie's hosted card page.
  const canEmbedCard = Boolean(profileId);

  useImperativeHandle(ref, () => ({
    async createToken() {
      // Only an on-page card needs a token. Every other method (and the hosted fallback)
      // authorises on redirect, so return nothing and let the order proceed.
      if (value !== CARD_METHOD || !canEmbedCard || !mollieRef.current) {
        return {};
      }
      setCardError(null);
      const { token, error } = await mollieRef.current.createToken();
      if (error) {
        const message = error.message || "Carte invalide. Vérifiez les champs.";
        setCardError(message);
        return { error: message };
      }
      return { token };
    }
  }), [value, canEmbedCard]);

  // Fetch the methods Mollie has enabled for this amount/country. Preserve the buyer's
  // current selection when it survives; otherwise select the first method.
  useEffect(() => {
    let active = true;
    fetchPaymentMethods(amountCents, country, locale)
      .then((result) => {
        if (!active) return;
        const resolved = result.methods.length ? result.methods : [HOSTED_FALLBACK];
        setMethods(resolved);
        // Adopt the profile id / testmode served by the API unless an env override is set.
        if (!ENV_PROFILE_ID && result.profileId) setProfileId(result.profileId);
        if (ENV_TESTMODE === undefined) setTestmode(result.testmode);
        if (!resolved.some((method) => method.id === value)) {
          onChange(resolved[0].id);
        }
      })
      .catch(() => {
        if (!active) return;
        setMethods([HOSTED_FALLBACK]);
        onChange(HOSTED_FALLBACK.id);
      });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amountCents, country, locale]);

  // Mount / unmount the embedded card fields as the card method is selected / deselected.
  useEffect(() => {
    if (value !== CARD_METHOD || !canEmbedCard) {
      mountedComponents.current.forEach((component) => component.unmount());
      mountedComponents.current = [];
      return;
    }

    let cancelled = false;
    loadMollieScript()
      .then(() => {
        if (cancelled || !window.Mollie || !profileId) return;
        if (!mollieRef.current) {
          mollieRef.current = window.Mollie(profileId, { locale, testmode });
        }
        mountedComponents.current.forEach((component) => component.unmount());
        mountedComponents.current = CARD_FIELDS.map((field) => {
          const component = mollieRef.current!.createComponent(field.type, COMPONENT_STYLES);
          component.mount(`#mollie-${field.type}`);
          return component;
        });
      })
      .catch(() => {
        if (!cancelled) setCardError("Le module de paiement carte n'a pas pu se charger.");
      });

    return () => {
      cancelled = true;
      mountedComponents.current.forEach((component) => component.unmount());
      mountedComponents.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, canEmbedCard, locale, profileId, testmode]);

  if (methods === null) {
    return <p className="field-help">Chargement des moyens de paiement…</p>;
  }

  return (
    <div className="payment-section">
      <div className="payment-methods">
        {methods.map((method) => (
          <label key={method.id} className={value === method.id ? "is-selected" : ""}>
            <input
              type="radio"
              name="paymentMethod"
              checked={value === method.id}
              onChange={() => onChange(method.id)}
            />
            {method.image.size1x ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={method.image.size1x}
                srcSet={method.image.size2x ? `${method.image.size2x} 2x` : undefined}
                alt=""
                width={32}
                height={24}
              />
            ) : null}
            <span>{method.description}</span>
          </label>
        ))}
      </div>

      {value === CARD_METHOD && canEmbedCard ? (
        <div className="mollie-card-fields">
          {CARD_FIELDS.map((field) => (
            <div key={field.type} className={`mollie-field ${field.full ? "mollie-field-full" : ""}`}>
              <span className="mollie-field-label">{field.label}</span>
              <div id={`mollie-${field.type}`} className="mollie-field-input" />
            </div>
          ))}
          {cardError ? <p className="summary-note" role="alert">{cardError}</p> : null}
        </div>
      ) : null}

      {value === CARD_METHOD && canEmbedCard ? (
        <p className="field-help">Une vérification 3-D Secure de votre banque peut s'afficher pour valider le paiement.</p>
      ) : value === CARD_METHOD ? (
        <p className="field-help">Vous saisirez votre carte sur la page sécurisée Mollie.</p>
      ) : value !== "mollie" ? (
        <p className="field-help">Vous serez redirigé vers {methodLabel(methods, value)} pour valider le paiement.</p>
      ) : (
        <p className="field-help">Paiement sécurisé via Mollie (carte, Bancontact…).</p>
      )}
    </div>
  );
});

function methodLabel(methods: PaymentMethodOption[], id: string): string {
  return methods.find((method) => method.id === id)?.description ?? "le paiement sécurisé";
}
