"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { CART_STORAGE_KEY, normalizeCartItems, upsertCartItem, type CartProduct } from "@/lib/cart";
import { money } from "@/lib/format";
import type { ProductAttributeValue, ProductVariant } from "@/lib/types";

function valueFor(variant: ProductVariant, code: string) {
  return variant.attributeValues.find((value) => value.attribute?.code === code);
}

function uniqueValues(product: CartProduct, code: string) {
  const values = new Map<string, ProductAttributeValue>();
  product.variants.forEach((variant) => {
    const value = valueFor(variant, code);
    if (value) values.set(value.value, value);
  });
  return [...values.values()];
}

function variantMatches(variant: ProductVariant, color?: string, size?: string) {
  return (!color || valueFor(variant, "color")?.value === color) && (!size || valueFor(variant, "size")?.value === size);
}

function readStoredCart() {
  try {
    return normalizeCartItems(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

export function VariantSelector({ product, initialSku }: { product: CartProduct; initialSku?: string }) {
  const initial = product.variants.find((variant) => variant.sku.toLowerCase() === initialSku?.toLowerCase())
    ?? product.variants.find((variant) => variant.stock > 0)
    ?? product.variants[0];
  const [color, setColor] = useState(valueFor(initial, "color")?.value);
  const [size, setSize] = useState(valueFor(initial, "size")?.value);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const colors = useMemo(() => uniqueValues(product, "color"), [product]);
  const sizes = useMemo(() => uniqueValues(product, "size"), [product]);
  const selected = product.variants.find((variant) => variantMatches(variant, color, size))
    ?? product.variants.find((variant) => variantMatches(variant, color) && variant.stock > 0)
    ?? initial;
  const maxQuantity = Math.max(1, Math.min(99, selected.stock));
  const hasOptions = product.variants.length > 1;

  useEffect(() => {
    setQuantity((current) => Math.min(Math.max(1, current), maxQuantity));
  }, [maxQuantity, selected.sku]);

  const changeColor = (value: string) => {
    const exact = product.variants.find((variant) => variantMatches(variant, value, size) && variant.stock > 0);
    const fallback = product.variants.find((variant) => variantMatches(variant, value) && variant.stock > 0)
      ?? product.variants.find((variant) => variantMatches(variant, value));
    setColor(value);
    if (!exact && fallback) {
      setSize(valueFor(fallback, "size")?.value);
    }
    setQuantity(1);
    setAdded(false);
  };

  const changeSize = (value: string) => {
    const exact = product.variants.find((variant) => variantMatches(variant, color, value) && variant.stock > 0);
    const fallback = product.variants.find((variant) => variantMatches(variant, undefined, value) && variant.stock > 0)
      ?? product.variants.find((variant) => variantMatches(variant, undefined, value));
    setSize(value);
    if (!exact && fallback) {
      setColor(valueFor(fallback, "color")?.value);
    }
    setQuantity(1);
    setAdded(false);
  };

  const addToCart = () => {
    const next = upsertCartItem(readStoredCart(), {
      productSlug: product.slug,
      variantSku: selected.sku,
      quantity
    });
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("tinned-cart-updated"));
    setAdded(true);
  };

  return (
    <section aria-label={hasOptions ? "Options produit" : "Achat produit"}>
      {hasOptions && colors.length ? <div className="variant-row">
        <strong>Couleur</strong>
        <div className="swatches">
          {colors.map((item) => {
            const disabled = !product.variants.some((variant) => variantMatches(variant, item.value) && variant.stock > 0);
            return (
              <button
                key={item.value}
                className={`swatch ${item.value === color ? "is-active" : ""}`}
                aria-label={item.label}
                title={item.label}
                style={{ backgroundColor: item.hexColor ?? item.value }}
                onClick={() => changeColor(item.value)}
                type="button"
                disabled={disabled}
              />
            );
          })}
        </div>
      </div> : null}

      {hasOptions && sizes.length ? <div className="variant-row">
        <strong>Taille</strong>
        <div className="sizes">
          {sizes.map((item) => {
            const disabled = !product.variants.some((variant) => variantMatches(variant, color, item.value) && variant.stock > 0);
            return (
              <button
                key={item.value}
                className={`size-button ${item.value === size ? "is-active" : ""}`}
                onClick={() => changeSize(item.value)}
                type="button"
                disabled={disabled}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div> : null}

      <p className="price">{money(selected.priceCents, product.currency)}</p>
      <p className="muted variant-stock">{selected.stock > 0 ? `${selected.stock} pièce${selected.stock > 1 ? "s" : ""} disponible${selected.stock > 1 ? "s" : ""}` : hasOptions ? "Indisponible pour cette option" : "Indisponible"} / Réf. {selected.sku}</p>
      <div className="purchase-row">
        <div className="quantity-stepper product-quantity" aria-label={`Quantité ${product.name}`}>
          <button type="button" onClick={() => setQuantity((current) => Math.max(1, current - 1))} aria-label="Retirer une unité">
            <Minus size={14} aria-hidden />
          </button>
          <span>{quantity}</span>
          <button type="button" onClick={() => setQuantity((current) => Math.min(maxQuantity, current + 1))} aria-label="Ajouter une unité" disabled={selected.stock < 1}>
            <Plus size={14} aria-hidden />
          </button>
        </div>
        <button className="button" type="button" disabled={selected.stock < 1} onClick={addToCart}>
          <ShoppingCart size={18} aria-hidden />
          Ajouter au panier
        </button>
      </div>
      {added ? (
        <div className="cart-feedback" role="status">
          <strong>Produit ajouté au panier.</strong>
          <Link href="/cart">Voir le panier</Link>
        </div>
      ) : null}
    </section>
  );
}
