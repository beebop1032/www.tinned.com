"use client";
import { useRouter } from "next/navigation";
import { locales, type Locale } from "@/i18n";

const FLAGS: Record<Locale, string> = {
  fr: "🇫🇷", nl: "🇧🇪", en: "🇬🇧", it: "🇮🇹", es: "🇪🇸", de: "🇩🇪",
};

type Props = { currentLocale?: Locale };

export function LocaleSwitcher({ currentLocale = "fr" }: Props) {
  const router = useRouter();

  function switchLocale(locale: Locale) {
    // Store locale preference in localStorage for future navigation
    if (typeof window !== "undefined") {
      window.localStorage.setItem("tinned_locale", locale);
    }
    // Simple cookie-based locale switch — works with next-intl
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000`;
    router.refresh();
  }

  return (
    <div className="flex gap-1">
      {locales.map((locale) => (
        <button
          key={locale}
          onClick={() => switchLocale(locale)}
          className={`px-2 py-1 rounded text-sm transition-colors ${
            locale === currentLocale
              ? "bg-gray-900 text-white"
              : "hover:bg-gray-100 text-gray-600"
          }`}
          title={locale.toUpperCase()}
          aria-label={`Changer la langue en ${locale}`}
        >
          {FLAGS[locale]}
        </button>
      ))}
    </div>
  );
}
