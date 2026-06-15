// next-intl middleware is disabled until pages are restructured under app/[locale]/
// The i18n infrastructure (messages, LocaleSwitcher, LocaleTabs) is ready.
// To activate: move app/* pages to app/[locale]/* and uncomment below.
//
// import createMiddleware from "next-intl/middleware";
// import { locales, defaultLocale } from "./i18n";
// export default createMiddleware({ locales, defaultLocale, localePrefix: "as-needed" });
// export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };

export function middleware() {}
export const config = { matcher: [] };
