"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { t as translate, Lang, TranslationKey, LANG_COOKIE, getDir } from "./translations";

type I18nContextType = {
  lang: Lang;
  t: (key: TranslationKey) => string;
  toggleLang: () => void;
  setLang: (lang: Lang) => void;
};

const I18nContext = createContext<I18nContextType>({
  lang: "en",
  t: (key) => key,
  toggleLang: () => {},
  setLang: () => {},
});

export function LanguageProvider({
  children,
  initialLang = "en",
}: {
  children: ReactNode;
  initialLang?: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    const stored = document.cookie
      .split("; ")
      .find((r) => r.startsWith(`${LANG_COOKIE}=`))
      ?.split("=")[1] as Lang | undefined;
    if (stored === "ar" || stored === "en") {
      setLangState(stored);
      document.documentElement.lang = stored;
      document.documentElement.dir = getDir(stored);
    }
  }, []);

  const setLang = useCallback((newLang: Lang) => {
    document.cookie = `${LANG_COOKIE}=${newLang}; path=/; max-age=31536000; SameSite=Lax`;
    setLangState(newLang);
    document.documentElement.lang = newLang;
    document.documentElement.dir = getDir(newLang);
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === "en" ? "ar" : "en");
  }, [lang, setLang]);

  const tFn = useCallback(
    (key: TranslationKey) => translate(key, lang),
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, t: tFn, toggleLang, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}
