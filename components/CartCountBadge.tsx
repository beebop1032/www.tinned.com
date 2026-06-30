"use client";

import { useEffect, useState } from "react";
import { CART_STORAGE_KEY, normalizeCartItems } from "@/lib/cart";

function readCount() {
  try {
    return normalizeCartItems(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]")).reduce(
      (sum, item) => sum + item.quantity,
      0
    );
  } catch {
    return 0;
  }
}

export function CartCountBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = () => setCount(readCount());
    update();
    window.addEventListener("tinned-cart-updated", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("tinned-cart-updated", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  if (count <= 0) return null;

  return (
    <span className="cart-count" aria-label={`${count} article${count > 1 ? "s" : ""} dans le panier`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}
