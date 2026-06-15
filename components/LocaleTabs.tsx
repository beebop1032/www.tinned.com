"use client";
import { useState } from "react";
import { locales, type Locale } from "@/i18n";

export type LocaleContent = Partial<Record<Locale, string>>;

type Props = {
  values: LocaleContent;
  onChange: (values: LocaleContent) => void;
  label: string;
  multiline?: boolean;
  required?: boolean;
};

export function LocaleTabs({ values, onChange, label, multiline = false, required = false }: Props) {
  const [active, setActive] = useState<Locale>("fr");

  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex gap-1 mb-1 flex-wrap">
        {locales.map((locale) => (
          <button
            key={locale}
            type="button"
            onClick={() => setActive(locale)}
            className={`px-2 py-0.5 text-xs rounded border transition-colors ${
              active === locale
                ? "bg-black text-white border-black"
                : "border-gray-200 hover:bg-gray-50 text-gray-600"
            }`}
          >
            {locale.toUpperCase()}
            {values[locale] && <span className="ml-1 text-green-400">•</span>}
          </button>
        ))}
      </div>
      {multiline ? (
        <textarea
          value={values[active] ?? ""}
          onChange={(e) => onChange({ ...values, [active]: e.target.value })}
          className="w-full border rounded px-3 py-2 text-sm h-32 resize-vertical"
          placeholder={`Contenu en ${active.toUpperCase()}…`}
        />
      ) : (
        <input
          value={values[active] ?? ""}
          onChange={(e) => onChange({ ...values, [active]: e.target.value })}
          className="w-full border rounded px-3 py-2 text-sm"
          placeholder={`Titre en ${active.toUpperCase()}…`}
        />
      )}
    </div>
  );
}
