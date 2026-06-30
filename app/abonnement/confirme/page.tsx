"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { confirmSubscription } from "@/lib/customer-api";

function ConfirmInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    if (!token) {
      setState("error");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const result = await confirmSubscription(token);
        if (!cancelled) setState(result.confirmed ? "ok" : "error");
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <section className="container section" style={{ textAlign: "center", minHeight: "40vh" }}>
      {state === "loading" && (
        <p style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <Loader2 className="spin" size={18} aria-hidden /> Confirmation en cours…
        </p>
      )}
      {state === "ok" && (
        <div>
          <h1>Abonnement confirmé ✓</h1>
          <p>Merci ! Nous vous tiendrons informé.</p>
          <Link className="pill" href="/">Retour à l&apos;accueil</Link>
        </div>
      )}
      {state === "error" && (
        <div>
          <h1>Lien invalide ou expiré</h1>
          <p>Ce lien de confirmation n&apos;est plus valable.</p>
          <Link className="pill" href="/">Retour à l&apos;accueil</Link>
        </div>
      )}
    </section>
  );
}

export default function ConfirmSubscriptionPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmInner />
    </Suspense>
  );
}
