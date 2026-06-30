"use client";

import { useEffect, useState } from "react";

type ToastState = { id: number; name: string } | null;

export function CartToast() {
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ name?: string }>).detail;
      setToast({ id: Date.now(), name: detail?.name?.trim() || "Article" });
    };
    window.addEventListener("tinned-cart-toast", handler);
    return () => window.removeEventListener("tinned-cart-toast", handler);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return (
    <div className="cart-toast" role="status" aria-live="polite">
      <span className="cart-toast-check" aria-hidden>✓</span>
      <span>{toast.name} ajouté au panier</span>
    </div>
  );
}
