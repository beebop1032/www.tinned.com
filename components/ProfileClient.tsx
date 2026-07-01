"use client";

import Link from "next/link";
import { LayoutDashboard, LogOut, MapPin, PackageCheck, Repeat2, UserRound } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AUTH_STORAGE_KEY, readStoredSession, sessionHasRole, updateStoredSession, type TinnedSession } from "@/lib/auth";
import { buildStoreCartGroups, type CartProduct, type StoredOrder } from "@/lib/cart";
import {
  createMyAddress,
  fetchCustomerProfile,
  fetchMyAddresses,
  fetchMyOrders,
  updateCustomerProfile,
  updateMyAddress,
  type CustomerAddress
} from "@/lib/customer-api";
import { money } from "@/lib/format";

type ProfileForm = {
  firstName: string;
  lastName: string;
  phone: string;
  marketingConsent: boolean;
};

const emptyProfile: ProfileForm = {
  firstName: "",
  lastName: "",
  phone: "",
  marketingConsent: false
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("fr-BE", { dateStyle: "long" }).format(new Date(value));
}

export function ProfileClient({ products }: { products: CartProduct[] }) {
  const [session, setSession] = useState<TinnedSession | null>(null);
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile);
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const current = readStoredSession();
    if (!current) {
      window.location.replace("/auth?redirect=/profile");
      return;
    }

    setSession(current);
    setProfile({
      firstName: current.firstName ?? "",
      lastName: current.lastName ?? "",
      phone: current.phone ?? "",
      marketingConsent: current.marketingConsent ?? false
    });
    setCheckingSession(false);

    Promise.all([
      fetchCustomerProfile(current.token),
      fetchMyOrders(current.token),
      fetchMyAddresses(current.token)
    ])
      .then(([customer, nextOrders, nextAddresses]) => {
        const nextSession = { ...current, ...customer };
        updateStoredSession(nextSession);
        setSession(nextSession);
        setProfile({
          firstName: customer.firstName ?? "",
          lastName: customer.lastName ?? "",
          phone: customer.phone ?? "",
          marketingConsent: customer.marketingConsent ?? false
        });
        setOrders(nextOrders);
        setAddresses(nextAddresses);
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Impossible de charger votre espace membre.");
      })
      .finally(() => setLoadingDashboard(false));
  }, []);

  const latestOrder = orders[0];
  const latestGroups = useMemo(
    () => (latestOrder ? buildStoreCartGroups(products, latestOrder.items) : []),
    [latestOrder, products]
  );
  const frequentPurchases = useMemo(() => {
    const quantities = new Map<string, number>();
    orders.forEach((order) => order.items.forEach((item) => {
      const key = `${item.productSlug}:${item.variantSku}`;
      quantities.set(key, (quantities.get(key) ?? 0) + item.quantity);
    }));

    return [...quantities.entries()]
      .map(([key, quantity]) => {
        const [productSlug, variantSku] = key.split(":");
        const product = products.find((candidate) => candidate.slug === productSlug);
        const variant = product?.variants.find((candidate) => candidate.sku === variantSku);
        return product && variant ? { product, variant, quantity } : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((first, second) => second.quantity - first.quantity)
      .slice(0, 3);
  }, [orders, products]);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) return;
    setSavingProfile(true);
    setError("");
    setNotice("");

    try {
      const customer = await updateCustomerProfile(session.token, profile);
      const nextSession = { ...session, ...customer };
      updateStoredSession(nextSession);
      setSession(nextSession);
      setNotice("Vos coordonnées ont été mises à jour.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible d'enregistrer vos coordonnées.");
    } finally {
      setSavingProfile(false);
    }
  };

  const saveAddress = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session || !editingAddress) return;
    setSavingAddress(true);
    setError("");
    setNotice("");

    try {
      const saved = editingAddress.id
        ? await updateMyAddress(session.token, editingAddress)
        : await createMyAddress(session.token, editingAddress);
      setAddresses((current) => editingAddress.id
        ? current.map((address) => (address.id === saved.id ? saved : address))
        : [saved, ...current]);
      setEditingAddress(null);
      setNotice(editingAddress.id ? "Votre adresse a été mise à jour." : "Votre adresse a été ajoutée.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible d'enregistrer cette adresse.");
    } finally {
      setSavingAddress(false);
    }
  };

  const signOut = () => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    window.location.replace("/auth");
  };

  if (checkingSession || !session) return null;

  const isAdmin = sessionHasRole(session, "ROLE_ADMIN");

  return (
    <section className="container section member-space">
      <div className="funnel-heading member-heading">
        <div>
          <span className="eyebrow">Espace membre</span>
          <h1 className="page-title">Bonjour {profile.firstName || session.email.split("@")[0]}</h1>
          <p className="lead">Retrouvez vos commandes, vos adresses et les produits que vous aimez racheter.</p>
        </div>
        <div className="member-heading-actions">
          {isAdmin && (
            <Link className="button member-admin-link" href="/admin">
              <LayoutDashboard size={17} aria-hidden />
              Ouvrir le back-office
            </Link>
          )}
          <Link className="button secondary-on-light" href="/store-box">Continuer mes achats</Link>
          <button className="member-signout" type="button" onClick={signOut}>
            <LogOut size={17} aria-hidden />
            Se déconnecter
          </button>
        </div>
      </div>

      {error && <p className="member-message is-error">{error}</p>}
      {notice && <p className="member-message">{notice}</p>}

      <div className="member-stats">
        <article><PackageCheck size={22} /><strong>{orders.length}</strong><span>Commande{orders.length > 1 ? "s" : ""}</span></article>
        <article><MapPin size={22} /><strong>{addresses.length}</strong><span>Adresse{addresses.length > 1 ? "s" : ""}</span></article>
        <article><Repeat2 size={22} /><strong>{frequentPurchases.length}</strong><span>Favori{frequentPurchases.length > 1 ? "s" : ""} à retrouver</span></article>
      </div>

      <div className="member-dashboard">
        <div className="member-column">
          <article className="member-card">
            <header className="member-card-title">
              <div><span className="eyebrow">Commande</span><h2>Ma dernière commande</h2></div>
              <Link href="/orders">Toutes mes commandes</Link>
            </header>
            {loadingDashboard ? (
              <p className="member-empty">Chargement de vos commandes...</p>
            ) : latestOrder ? (
              <div className="member-last-order">
                <div className="member-order-summary">
                  <strong>{latestOrder.reference ?? latestOrder.id}</strong>
                  <span>{dateLabel(latestOrder.createdAt)} / {money(latestOrder.totalCents, latestOrder.currency ?? "EUR")}</span>
                  <b>{latestOrder.paymentStatus === "paid" ? "Paiement confirmé" : "Paiement en attente"}</b>
                </div>
                {latestGroups.map((group) => (
                  <div className="member-order-store" key={group.storeSlug}>
                    <strong>{group.storeName}</strong>
                    <span>{group.lines.map((line) => `${line.product.name} x${line.quantity}`).join(", ")}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="member-empty">
                <strong>Vous n'avez pas encore commandé.</strong>
                <span>Découvrez les boutiques et retrouvez ici le suivi de votre première commande.</span>
                <Link className="button secondary-on-light" href="/store-box">Découvrir les boutiques</Link>
              </div>
            )}
          </article>

          <article className="member-card">
            <header className="member-card-title">
              <div><span className="eyebrow">Rachat facile</span><h2>Mes achats fréquents</h2></div>
            </header>
            {loadingDashboard ? (
              <p className="member-empty">Analyse de vos achats...</p>
            ) : frequentPurchases.length ? (
              <div className="member-frequent-list">
                {frequentPurchases.map(({ product, variant, quantity }) => (
                  <div key={`${product.slug}:${variant.sku}`}>
                    <div>
                      <strong>{product.name}</strong>
                      <span>{product.storeBox?.name ?? "Boutique"} / {quantity} unité{quantity > 1 ? "s" : ""} commandée{quantity > 1 ? "s" : ""}</span>
                    </div>
                    <b>{money(variant.priceCents, product.currency)}</b>
                  </div>
                ))}
              </div>
            ) : (
              <p className="member-empty">Vos produits les plus commandés s'afficheront ici dès votre premier achat.</p>
            )}
          </article>
        </div>

        <div className="member-column">
          <form className="member-card" onSubmit={saveProfile}>
            <header className="member-card-title">
              <div><span className="eyebrow">Mon compte</span><h2>Mes coordonnées</h2></div>
              <UserRound size={22} />
            </header>
            <div className="form-grid">
              <label className="field"><span>Prénom</span><input required value={profile.firstName} onChange={(event) => setProfile({ ...profile, firstName: event.target.value })} autoComplete="given-name" /></label>
              <label className="field"><span>Nom</span><input required value={profile.lastName} onChange={(event) => setProfile({ ...profile, lastName: event.target.value })} autoComplete="family-name" /></label>
              <label className="field"><span>Email</span><input type="email" value={session.email} disabled /></label>
              <label className="field"><span>Téléphone</span><input required type="tel" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} autoComplete="tel" /></label>
            </div>
            <label className="member-consent">
              <input type="checkbox" checked={profile.marketingConsent} onChange={(event) => setProfile({ ...profile, marketingConsent: event.target.checked })} />
              <span>Je souhaite recevoir les offres et nouveautés Tinned.</span>
            </label>
            <button className="button" type="submit" disabled={savingProfile}>{savingProfile ? "Enregistrement..." : "Enregistrer mes coordonnées"}</button>
          </form>

          <article className="member-card">
            <header className="member-card-title">
              <div><span className="eyebrow">Livraison</span><h2>Mes adresses</h2></div>
              {!editingAddress && (
                <button
                  className="text-button"
                  type="button"
                  onClick={() => setEditingAddress({
                    id: 0,
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    street: "",
                    postalCode: "",
                    city: "",
                    countryCode: "BE",
                    phone: profile.phone
                  })}
                >
                  Ajouter
                </button>
              )}
            </header>
            {editingAddress?.id === 0 ? (
              <div className="member-addresses">
                <div className="member-address">
                  <AddressForm address={editingAddress} onChange={setEditingAddress} onSubmit={saveAddress} onCancel={() => setEditingAddress(null)} saving={savingAddress} />
                </div>
              </div>
            ) : loadingDashboard ? (
              <p className="member-empty">Chargement de vos adresses...</p>
            ) : addresses.length ? (
              <div className="member-addresses">
                {addresses.map((address) => (
                  <div className="member-address" key={address.id}>
                    {editingAddress?.id === address.id ? (
                      <AddressForm address={editingAddress} onChange={setEditingAddress} onSubmit={saveAddress} onCancel={() => setEditingAddress(null)} saving={savingAddress} />
                    ) : (
                      <>
                        <div>
                          <strong>{address.firstName} {address.lastName}</strong>
                          <span>{address.street}<br />{address.postalCode} {address.city}, {address.countryCode}</span>
                        </div>
                        <button className="text-button" type="button" onClick={() => setEditingAddress({ ...address })}>Modifier</button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="member-empty">Ajoutez une adresse pour accélérer votre prochaine livraison.</p>
            )}
          </article>
        </div>
      </div>
    </section>
  );
}

function AddressForm({
  address,
  onChange,
  onSubmit,
  onCancel,
  saving
}: {
  address: CustomerAddress;
  onChange: (address: CustomerAddress) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <form onSubmit={onSubmit}>
      <div className="form-grid">
        <label className="field"><span>Prénom</span><input required value={address.firstName} onChange={(event) => onChange({ ...address, firstName: event.target.value })} /></label>
        <label className="field"><span>Nom</span><input required value={address.lastName} onChange={(event) => onChange({ ...address, lastName: event.target.value })} /></label>
        <label className="field field-full"><span>Rue et numéro</span><input required value={address.street} onChange={(event) => onChange({ ...address, street: event.target.value })} /></label>
        <label className="field"><span>Code postal</span><input required value={address.postalCode} onChange={(event) => onChange({ ...address, postalCode: event.target.value })} /></label>
        <label className="field"><span>Ville</span><input required value={address.city} onChange={(event) => onChange({ ...address, city: event.target.value })} /></label>
        <label className="field"><span>Pays</span><input required maxLength={2} value={address.countryCode} onChange={(event) => onChange({ ...address, countryCode: event.target.value.toUpperCase() })} /></label>
        <label className="field"><span>Téléphone</span><input type="tel" value={address.phone ?? ""} onChange={(event) => onChange({ ...address, phone: event.target.value })} /></label>
      </div>
      <div className="member-form-actions">
        <button className="button" type="submit" disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer"}</button>
        <button className="text-button" type="button" onClick={onCancel}>Annuler</button>
      </div>
    </form>
  );
}
