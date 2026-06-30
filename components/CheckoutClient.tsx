"use client";

import Image from "next/image";
import Link from "next/link";
import { CreditCard, LockKeyhole, MapPin, Truck, UserRound } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { readStoredSession, type TinnedSession } from "@/lib/auth";
import {
  buildStoreCartGroups,
  cartItemKey,
  cartSubtotal,
  CART_STORAGE_KEY,
  CHECKOUT_STORAGE_KEY,
  normalizeCartItems,
  normalizeCheckoutSelection,
  ORDER_STORAGE_KEY,
  variantSummary,
  type CartItem,
  type CartProduct,
  type StoredOrder
} from "@/lib/cart";
import { createCheckoutOrder, fetchDeliveryMethods, validateCoupon } from "@/lib/customer-api";
import {
  ADDRESS_SUGGESTIONS,
  CARRIER_OPTIONS,
  carrierForOptions,
  carrierPriceFor,
  deliveryEta,
  defaultCarrierSelections,
  shippingForCarrierSelections,
  type AddressSuggestion,
  type CarrierSelection
} from "@/lib/delivery";
import { money } from "@/lib/format";

function readCart() {
  try {
    return normalizeCartItems(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

function readSelection() {
  try {
    return normalizeCheckoutSelection(JSON.parse(window.localStorage.getItem(CHECKOUT_STORAGE_KEY) ?? "null"));
  } catch {
    return null;
  }
}

export function CheckoutClient({ products }: { products: CartProduct[] }) {
  const [items, setItems] = useState<CartItem[] | null>(null);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [session, setSession] = useState<TinnedSession | null>(null);
  const [carrierSelections, setCarrierSelections] = useState<CarrierSelection[]>([]);
  const [carrierOptions, setCarrierOptions] = useState(CARRIER_OPTIONS);
  const [addressSearch, setAddressSearch] = useState("");
  const [address, setAddress] = useState<AddressSuggestion>({
    id: "manual",
    label: "",
    street: "",
    postalCode: "",
    city: "",
    country: "BE"
  });
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountCents: number } | null>(null);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);

  useEffect(() => {
    const cart = readCart();
    setItems(cart);
    setSelectedStores(readSelection()?.selectedStoreSlugs ?? []);
    setSession(readStoredSession());
  }, []);

  const groups = useMemo(() => buildStoreCartGroups(products, items ?? []), [items, products]);
  const effectiveSelectedStores = selectedStores.length ? selectedStores : groups.map((group) => group.storeSlug);
  const selectedGroups = groups.filter((group) => effectiveSelectedStores.includes(group.storeSlug));
  const subtotalCents = cartSubtotal(selectedGroups);
  const effectiveCarrierSelections = carrierSelections.length ? carrierSelections : defaultCarrierSelections(selectedGroups, carrierOptions);
  const shippingCents = shippingForCarrierSelections(selectedGroups, effectiveCarrierSelections, carrierOptions);
  const discountCents = appliedCoupon ? Math.min(appliedCoupon.discountCents, subtotalCents) : 0;
  const totalCents = Math.max(0, subtotalCents - discountCents) + shippingCents;
  const currency = selectedGroups[0]?.currency ?? "EUR";
  const addressMatches = addressSearch.trim().length < 2 || addressSearch === address.label
    ? []
    : ADDRESS_SUGGESTIONS.filter((suggestion) => suggestion.label.toLowerCase().includes(addressSearch.toLowerCase())).slice(0, 4);

  useEffect(() => {
    let active = true;
    fetchDeliveryMethods(address.country)
      .then((methods) => {
        if (active && methods.length) setCarrierOptions(methods);
      })
      .catch(() => {
        if (active) setCarrierOptions(CARRIER_OPTIONS);
      });
    return () => { active = false; };
  }, [address.country]);

  useEffect(() => {
    if (!selectedGroups.length) return;
    setCarrierSelections((current) => {
      const defaultCode = (carrierOptions.find((carrier) => carrier.recommended) ?? carrierOptions[0]).code;
      const next = selectedGroups.map((group) => ({
        storeSlug: group.storeSlug,
        carrierCode: carrierOptions.some((carrier) => carrier.code === current.find((item) => item.storeSlug === group.storeSlug)?.carrierCode)
          ? current.find((item) => item.storeSlug === group.storeSlug)!.carrierCode
          : defaultCode
      }));
      return JSON.stringify(next) === JSON.stringify(current) ? current : next;
    });
  }, [selectedGroups.map((group) => group.storeSlug).join("|"), carrierOptions.map((carrier) => carrier.code).join("|")]);

  const updateCarrier = (storeSlug: string, carrierCode: string) => {
    setCarrierSelections((current) => {
      const without = current.filter((item) => item.storeSlug !== storeSlug);
      return [...without, { storeSlug, carrierCode }];
    });
  };

  const selectAddress = (suggestion: AddressSuggestion) => {
    setAddress(suggestion);
    setAddressSearch(suggestion.label);
  };

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponBusy(true);
    setCouponMessage(null);
    try {
      const result = await validateCoupon(code, subtotalCents);
      if (result.valid) {
        setAppliedCoupon({ code, discountCents: result.discountCents });
        setCouponMessage(result.message);
      } else {
        setAppliedCoupon(null);
        setCouponMessage(result.message);
      }
    } catch (caught) {
      setAppliedCoupon(null);
      setCouponMessage(caught instanceof Error ? caught.message : "Code promo invalide.");
    } finally {
      setCouponBusy(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponMessage(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!items || !selectedGroups.length || !session?.token) return;

    const formData = new FormData(event.currentTarget);
    const selectedLineKeys = new Set(
      selectedGroups.flatMap((group) => group.lines.map((line) => cartItemKey({ productSlug: line.product.slug, variantSku: line.variant.sku })))
    );
    const checkoutAddress: AddressSuggestion = {
      id: address.id || "manual",
      street: String(formData.get("street") ?? ""),
      postalCode: String(formData.get("postalCode") ?? ""),
      city: String(formData.get("city") ?? ""),
      country: String(formData.get("country") ?? "BE"),
      label: address.label || `${String(formData.get("street") ?? "")}, ${String(formData.get("postalCode") ?? "")} ${String(formData.get("city") ?? "")}`
    };
    const orderItems = items.filter((item) => selectedLineKeys.has(cartItemKey(item)));
    const remainingItems = items.filter((item) => !selectedLineKeys.has(cartItemKey(item)));

    setError(null);
    setSubmitting(true);

    try {
      const order: StoredOrder = await createCheckoutOrder({
        email: String(formData.get("email") ?? ""),
        firstName: String(formData.get("firstName") ?? ""),
        lastName: String(formData.get("lastName") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        address: checkoutAddress,
        items: orderItems,
        selectedStoreSlugs: selectedGroups.map((group) => group.storeSlug),
        carrierSelections: effectiveCarrierSelections,
        paymentMethod,
        couponCode: appliedCoupon?.code
      }, session.token);

      window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order));
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(remainingItems));
      window.localStorage.removeItem(CHECKOUT_STORAGE_KEY);
      window.dispatchEvent(new Event("tinned-cart-updated"));
      if (order.checkoutUrl) {
        window.location.href = order.checkoutUrl;
        return;
      }
      window.location.href = `/checkout/confirmation?order=${order.id}`;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "La commande n'a pas pu être créée.");
      setSubmitting(false);
    }
  };

  if (items === null) {
    return (
      <section className="container section">
        <h1 className="page-title">Commande</h1>
        <p className="lead">Chargement du checkout.</p>
      </section>
    );
  }

  if (!session) {
    return (
      <section className="container section cart-empty">
        <span className="eyebrow">Compte requis</span>
        <h1 className="page-title">Connectez-vous pour finaliser.</h1>
        <p className="lead">Votre panier est conservé. La connexion permet de sauvegarder l'adresse, choisir la livraison et suivre chaque panier boutique.</p>
        <Link className="button" href="/auth?redirect=/checkout">Se connecter</Link>
      </section>
    );
  }

  if (!selectedGroups.length) {
    return (
      <section className="container section cart-empty">
        <span className="eyebrow">Checkout</span>
        <h1 className="page-title">Aucun panier sélectionné.</h1>
        <p className="lead">Retournez au panier pour choisir les boutiques à commander.</p>
        <Link className="button" href="/cart">Retour au panier</Link>
      </section>
    );
  }

  return (
    <section className="container section">
      <div className="funnel-heading">
        <div>
          <span className="eyebrow">Checkout</span>
          <h1 className="page-title">Finaliser la commande.</h1>
          <p className="lead">Complétez l'adresse, choisissez le transporteur et validez la méthode de paiement.</p>
        </div>
        <div className="checkout-steps" aria-label="Étapes de commande">
          <span>Panier</span>
          <span>Compte</span>
          <span className="is-active">Livraison</span>
          <span className="is-active">Paiement</span>
          <span>Confirmation</span>
        </div>
      </div>

      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={submit}>
          <section className="checkout-panel">
            <header className="panel-title">
              <UserRound size={19} aria-hidden />
              <h2>Compte client</h2>
            </header>
            <div className="form-grid">
              <label className="field"><span>Email</span><input name="email" type="email" required defaultValue={session.email} /></label>
              <label className="field"><span>Téléphone</span><input name="phone" type="tel" required placeholder="+32" defaultValue={session.phone} /></label>
              <label className="field"><span>Prénom</span><input name="firstName" required defaultValue={session.firstName} /></label>
              <label className="field"><span>Nom</span><input name="lastName" required defaultValue={session.lastName} /></label>
            </div>
          </section>

          <section className="checkout-panel">
            <header className="panel-title">
              <MapPin size={19} aria-hidden />
              <h2>Adresse de livraison</h2>
            </header>
            <label className="field address-search">
              <span>Rechercher une adresse</span>
              <input
                value={addressSearch}
                onChange={(event) => setAddressSearch(event.target.value)}
                placeholder="Rue, code postal, ville..."
                autoComplete="street-address"
              />
              <small className="field-help">Choisissez une suggestion pour remplir les champs automatiquement, ou encodez l'adresse manuellement.</small>
              {addressMatches.length ? (
                <div className="address-suggestions">
                  {addressMatches.map((suggestion) => (
                    <button type="button" key={suggestion.id} onClick={() => selectAddress(suggestion)}>
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </label>
            <div className="form-grid">
              <label className="field field-full"><span>Adresse</span><input name="street" required value={address.street} onChange={(event) => setAddress({ ...address, street: event.target.value })} /></label>
              <label className="field"><span>Code postal</span><input name="postalCode" required value={address.postalCode} onChange={(event) => setAddress({ ...address, postalCode: event.target.value })} /></label>
              <label className="field"><span>Ville</span><input name="city" required value={address.city} onChange={(event) => setAddress({ ...address, city: event.target.value })} /></label>
              <label className="field"><span>Pays</span><select name="country" value={address.country} onChange={(event) => setAddress({ ...address, country: event.target.value })}><option value="BE">Belgique</option><option value="FR">France</option></select></label>
            </div>
          </section>

          <section className="checkout-panel">
            <header className="panel-title">
              <Truck size={19} aria-hidden />
              <h2>Transporteur</h2>
            </header>
            <div className="carrier-groups">
              {selectedGroups.map((group) => (
                <section className="carrier-group" key={group.storeSlug}>
                  <h3>Panier {group.storeName}</h3>
                  <div className="carrier-options">
                    {carrierOptions.map((carrier) => {
                      const selected = carrierForOptions(carrierOptions, effectiveCarrierSelections.find((item) => item.storeSlug === group.storeSlug)?.carrierCode).code === carrier.code;
                      const price = carrierPriceFor(group, carrier.code, carrierOptions);
                      return (
                        <label className={selected ? "is-selected" : ""} key={carrier.code}>
                          <input type="radio" name={`carrier-${group.storeSlug}`} checked={selected} onChange={() => updateCarrier(group.storeSlug, carrier.code)} />
                          <span>
                            <strong>{carrier.name}</strong>
                            <small>{carrier.description} / {deliveryEta(carrier)}</small>
                          </span>
                          <b>{price ? money(price, group.currency) : "Offert"}</b>
                        </label>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </section>

          <section className="checkout-panel">
            <header className="panel-title">
              <CreditCard size={19} aria-hidden />
              <h2>Méthode de paiement</h2>
            </header>
            <div className="payment-methods" role="radiogroup" aria-label="Méthode de paiement">
              {[
                ["card", "Carte"],
                ["bancontact", "Bancontact"],
                ["paypal", "PayPal"]
              ].map(([value, label]) => (
                <label className={paymentMethod === value ? "is-selected" : ""} key={value}>
                  <input type="radio" name="payment" value={value} checked={paymentMethod === value} onChange={() => setPaymentMethod(value)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <label className="terms-row">
              <input type="checkbox" required defaultChecked />
              <span>J'accepte les conditions de vente et le traitement de la commande.</span>
            </label>
          </section>

          {error ? <p className="summary-note" role="alert">{error}</p> : null}

          <button className="button checkout-submit" type="submit" disabled={submitting}>
            <LockKeyhole size={18} aria-hidden />
            {submitting ? "Commande en cours..." : "Confirmer la commande"}
          </button>
        </form>

        <aside className="order-summary checkout-summary">
          <h2>Votre commande</h2>
          <div className="checkout-store-list">
            {selectedGroups.map((group) => (
              <section className="checkout-store" key={group.storeSlug}>
                <h3>Panier {group.storeName}</h3>
                <p className="carrier-summary">{carrierForOptions(carrierOptions, effectiveCarrierSelections.find((item) => item.storeSlug === group.storeSlug)?.carrierCode).name}</p>
                {group.lines.map((line) => (
                  <div className="checkout-line" key={cartItemKey({ productSlug: line.product.slug, variantSku: line.variant.sku })}>
                    <Image src={line.product.images[0] ?? "/tinned-assets/box-store.svg"} alt="" width={44} height={44} />
                    <div>
                      <strong>{line.product.name}</strong>
                      <span>{line.quantity} x {variantSummary(line.variant)}</span>
                    </div>
                    <b>{money(line.lineTotalCents, line.currency)}</b>
                  </div>
                ))}
              </section>
            ))}
          </div>
          <div className="checkout-coupon">
            {appliedCoupon ? (
              <div className="summary-row">
                <span>Code « {appliedCoupon.code} »</span>
                <button type="button" className="text-button" onClick={removeCoupon}>Retirer</button>
              </div>
            ) : (
              <div className="coupon-input-row">
                <input
                  value={couponInput}
                  onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                  placeholder="Code promo"
                  aria-label="Code promo"
                />
                <button type="button" className="button secondary" onClick={() => void applyCoupon()} disabled={couponBusy || !couponInput.trim()}>
                  {couponBusy ? "…" : "Appliquer"}
                </button>
              </div>
            )}
            {couponMessage ? <small className="field-help">{couponMessage}</small> : null}
          </div>
          <div className="summary-row"><span>Sous-total</span><strong>{money(subtotalCents, currency)}</strong></div>
          {discountCents ? <div className="summary-row"><span>Remise</span><strong>−{money(discountCents, currency)}</strong></div> : null}
          <div className="summary-row"><span>Livraison estimée</span><strong>{shippingCents ? money(shippingCents, currency) : "Offerte"}</strong></div>
          <div className="summary-row summary-total"><span>Total</span><strong>{money(totalCents, currency)}</strong></div>
        </aside>
      </div>
    </section>
  );
}
