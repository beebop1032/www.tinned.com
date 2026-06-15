export function money(cents: number, currency = "EUR") {
  return new Intl.NumberFormat("fr-BE", {
    style: "currency",
    currency
  }).format(cents / 100);
}
