import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { localizeContent } from "../i18n/localizeContent";
import { DICTS, type Locale } from "../i18n/messages";
import { setFormatLocale } from "../lib/format";

export type { Locale };

const LS_LOCALE = "pms_core_locale";

interface LocaleCtx {
  locale: Locale;
  dir: "rtl" | "ltr";
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** Display-only content localization (seed/entity Arabic → English). */
  L: (text: string | null | undefined) => string;
}

const Ctx = createContext<LocaleCtx | null>(null);

function readInitialLocale(): Locale {
  const saved = localStorage.getItem(LS_LOCALE);
  if (saved === "ar" || saved === "en") return saved;
  return "ar";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readInitialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(LS_LOCALE, next);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = locale === "ar" ? "rtl" : "ltr";
    setFormatLocale(locale);
    const system =
      DICTS[locale]["brand.systemName"] ?? DICTS.ar["brand.systemName"];
    document.title = `${system} | Brains Valley`;
  }, [locale]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let value = DICTS[locale][key] ?? DICTS.ar[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          value = value.replaceAll(`{${k}}`, String(v));
        }
      }
      return value;
    },
    [locale],
  );

  const L = useCallback(
    (text: string | null | undefined) => localizeContent(text, locale),
    [locale],
  );

  const value = useMemo<LocaleCtx>(
    () => ({
      locale,
      dir: locale === "ar" ? "rtl" : "ltr",
      setLocale,
      t,
      L,
    }),
    [locale, setLocale, t, L],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLocale() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
