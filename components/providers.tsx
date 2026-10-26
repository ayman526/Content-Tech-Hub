"use client";

import { useState } from "react";
import { SessionProvider } from "next-auth/react";
import { LanguageProvider } from "@/lib/i18n/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function Providers({ children, lang = "en" }: { children: React.ReactNode; lang?: "en" | "ar" }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            queryFn: async ({ queryKey }) => {
              const url = Array.isArray(queryKey) ? queryKey[0] : queryKey;
              const res = await fetch(url as string, { credentials: "include" });
              if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
              return res.json();
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <LanguageProvider initialLang={lang}>{children}</LanguageProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
