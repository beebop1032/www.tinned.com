import type { StoreCartGroup } from "./cart";

export type AddressSuggestion = {
  id: string;
  label: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
};

export type CarrierOption = {
  id?: number;
  code: string;
  name: string;
  provider?: string;
  method?: string;
  mode?: string;
  countryCode?: string;
  description?: string | null;
  eta?: string;
  deliveryDaysMin?: number;
  deliveryDaysMax?: number;
  recommended?: boolean;
  prices?: Array<{ orderPriceCents: number; priceCents: number }>;
  priceCents?: number;
  freeFromCents?: number;
};

export type CarrierSelection = {
  storeSlug: string;
  carrierCode: string;
};

export const ADDRESS_SUGGESTIONS: AddressSuggestion[] = [
  {
    id: "brussels-commerce",
    label: "Rue du Commerce 12, 1000 Bruxelles",
    street: "Rue du Commerce 12",
    postalCode: "1000",
    city: "Bruxelles",
    country: "BE"
  },
  {
    id: "ixelles-louise",
    label: "Avenue Louise 221, 1050 Ixelles",
    street: "Avenue Louise 221",
    postalCode: "1050",
    city: "Ixelles",
    country: "BE"
  },
  {
    id: "paris-republique",
    label: "10 Place de la Republique, 75011 Paris",
    street: "10 Place de la Republique",
    postalCode: "75011",
    city: "Paris",
    country: "FR"
  }
];

export const CARRIER_OPTIONS: CarrierOption[] = [
  {
    code: "mondial-relay-pickup",
    name: "Mondial Relay",
    mode: "pickup",
    description: "Point relais proche de l'adresse",
    eta: "2 à 4 jours ouvrables",
    priceCents: 499,
    freeFromCents: 6900
  },
  {
    code: "dpd-home",
    name: "DPD domicile",
    mode: "home",
    description: "Livraison à domicile avec suivi",
    eta: "2 à 3 jours ouvrables",
    priceCents: 799,
    freeFromCents: 6900
  },
  {
    code: "bpost-locker",
    name: "Bpost distributeur",
    mode: "locker",
    description: "Distributeur de paquets disponible 24/7",
    eta: "2 à 3 jours ouvrables",
    priceCents: 799,
    freeFromCents: 6900
  }
];

export function carrierFor(code?: string) {
  return carrierForOptions(CARRIER_OPTIONS, code);
}

export function carrierForOptions(options: CarrierOption[], code?: string) {
  return options.find((carrier) => carrier.code === code) ?? options[0] ?? CARRIER_OPTIONS[0];
}

export function deliveryEta(carrier: CarrierOption) {
  if (carrier.eta) return carrier.eta;
  if (carrier.deliveryDaysMin === carrier.deliveryDaysMax) return `${carrier.deliveryDaysMin} jours ouvrables`;
  return `${carrier.deliveryDaysMin ?? 2} a ${carrier.deliveryDaysMax ?? 4} jours ouvrables`;
}

export function carrierPriceFor(group: Pick<StoreCartGroup, "subtotalCents">, code?: string, options: CarrierOption[] = CARRIER_OPTIONS) {
  const carrier = carrierForOptions(options, code);
  if (carrier.prices?.length) {
    return carrier.prices.reduce(
      (current, price) => group.subtotalCents >= price.orderPriceCents ? price.priceCents : current,
      carrier.prices[0].priceCents
    );
  }
  return carrier.freeFromCents && group.subtotalCents >= carrier.freeFromCents ? 0 : carrier.priceCents ?? 0;
}

export function shippingForCarrierSelections(groups: StoreCartGroup[], selections: CarrierSelection[], options: CarrierOption[] = CARRIER_OPTIONS) {
  return groups.reduce((total, group) => {
    const selected = selections.find((item) => item.storeSlug === group.storeSlug);
    return total + carrierPriceFor(group, selected?.carrierCode, options);
  }, 0);
}

export function defaultCarrierSelections(groups: StoreCartGroup[], options: CarrierOption[] = CARRIER_OPTIONS): CarrierSelection[] {
  const defaultCarrier = options.find((carrier) => carrier.recommended) ?? options[0] ?? CARRIER_OPTIONS[0];
  return groups.map((group) => ({ storeSlug: group.storeSlug, carrierCode: defaultCarrier.code }));
}
