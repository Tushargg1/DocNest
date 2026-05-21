import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import en from "../locales/en.json";
import hi from "../locales/hi.json";

const LanguageContext = createContext(null);

const translations = { en, hi };

/**
 * Resolves a dot-notated key from a nested object.
 * e.g. "nav.signIn" -> translations.en.nav.signIn
 */
function resolveKey(obj, key) {
  return key.split(".").reduce((acc, part) => acc?.[part], obj);
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const stored = localStorage.getItem("clinic-language");
    return stored === "hi" ? "hi" : "en";
  });

  useEffect(() => {
    localStorage.setItem("clinic-language", language);
    document.documentElement.setAttribute("lang", language);
  }, [language]);

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => (prev === "en" ? "hi" : "en"));
  }, []);

  /**
   * Translate function — takes a dot-notated key and returns the translated string.
   * Falls back to English if key is missing in current language, then to the key itself.
   */
  const t = useCallback(
    (key) => {
      const translated = resolveKey(translations[language], key);
      if (translated !== undefined) return translated;
      // Fallback to English
      const fallback = resolveKey(translations.en, key);
      if (fallback !== undefined) return fallback;
      // Return key as last resort
      return key;
    },
    [language]
  );

  const value = useMemo(
    () => ({ language, setLanguage, toggleLanguage, t }),
    [language, toggleLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return context;
}
