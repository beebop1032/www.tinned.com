export function money(cents: number, currency = "EUR") {
  return new Intl.NumberFormat("fr-BE", {
    style: "currency",
    currency
  }).format(cents / 100);
}

export function formatReleaseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("fr-BE", { day: "numeric", month: "long", year: "numeric" }).format(date);
}
