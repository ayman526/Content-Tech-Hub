import type { Metadata } from "next";
import { Inter, Cairo } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Providers } from "@/components/providers";
import { LANG_COOKIE, getDir } from "@/lib/i18n/translations";
import type { Lang } from "@/lib/i18n/translations";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-arabic",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Contentech — Enterprise Multilingual Content Solutions",
    template: "%s | Contentech",
  },
  description:
    "Contentech is the hybrid translation ecosystem combining AI automation with human linguistic expertise.",
  keywords: ["translation", "localization", "AI translation", "MTPE", "human translation", "multilingual", "contentech"],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://contentech.ai",
    siteName: "Contentech",
    title: "Contentech — Enterprise Multilingual Content Solutions",
    description: "The hybrid translation ecosystem combining AI automation with human linguistic expertise.",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const lang = (cookieStore.get(LANG_COOKIE)?.value ?? "en") as Lang;
  const dir = getDir(lang);

  return (
    <html lang={lang} dir={dir} className={`${inter.variable} ${cairo.variable}`}>
      <body
        className="min-h-screen bg-background antialiased"
        style={{ fontFamily: lang === "ar" ? "var(--font-arabic), sans-serif" : "var(--font-sans), sans-serif" }}
      >
        <Providers lang={lang}>{children}</Providers>
      </body>
    </html>
  );
}
