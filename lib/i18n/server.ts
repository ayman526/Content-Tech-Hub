import { cookies } from "next/headers";
import { t, Lang, TranslationKey, LANG_COOKIE, getDir } from "./translations";

export async function getServerLang(): Promise<Lang> {
  const cookieStore = await cookies();
  const val = cookieStore.get(LANG_COOKIE)?.value;
  return val === "ar" ? "ar" : "en";
}

export async function getServerTranslation() {
  const lang = await getServerLang();
  return {
    lang,
    dir: getDir(lang),
    t: (key: TranslationKey) => t(key, lang),
  };
}
