"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
] as const;

type Locale = (typeof LANGUAGES)[number]["code"];

function swapLocaleInPath(pathname: string, newLocale: Locale): string {
  const match = pathname.match(/^\/([a-z]{2})(\/.*)?$/);
  const codes = LANGUAGES.map((l) => l.code);
  if (match && codes.includes(match[1] as Locale)) {
    return `/${newLocale}${match[2] ?? ""}`;
  }
  return `/${newLocale}`;
}

export function LanguageSwitcher({
  compact = false,
  locale: localeProp,
}: {
  compact?: boolean;
  locale?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentCode = (localeProp ?? pathname.match(/^\/([a-z]{2})(\/|$)/)?.[1] ?? "en") as Locale;
  const currentLang = LANGUAGES.find((l) => l.code === currentCode) ?? LANGUAGES[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleSelect(code: Locale) {
    setOpen(false);
    if (code === currentCode) return;
    document.cookie = `contentech_lang=${code}; path=/; max-age=31536000; SameSite=Lax`;
    router.push(swapLocaleInPath(pathname, code));
  }

  return (
    <div ref={ref} className="relative" data-testid="language-switcher">
      {/* Trigger button — HubSpot style: globe + label + chevron */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 rounded-md transition-colors select-none",
          compact
            ? "text-[#516F90] hover:text-[#33475B] hover:bg-[#F5F8FA] px-2 py-1.5 text-sm font-medium"
            : "text-[#33475B] hover:bg-[#F5F8FA] px-3 py-2 text-sm font-medium"
        )}
        data-testid="btn-language-switcher"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Globe className="w-4 h-4 flex-shrink-0 text-[#516F90]" />
        <span>{currentLang.label}</span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-[#516F90] transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          role="listbox"
          aria-label="Select language"
          className={cn(
            "absolute z-50 mt-1 min-w-[148px] bg-white rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-[#CBD6E2]/60 py-1 overflow-hidden",
            compact ? "right-0" : "left-0"
          )}
        >
          {LANGUAGES.map((lang) => {
            const isActive = lang.code === currentCode;
            return (
              <button
                key={lang.code}
                role="option"
                aria-selected={isActive}
                type="button"
                onClick={() => handleSelect(lang.code)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors",
                  isActive
                    ? "text-[#0091AE] font-semibold bg-[#F0F8FA]"
                    : "text-[#33475B] font-normal hover:bg-[#F5F8FA]"
                )}
                data-testid={`lang-option-${lang.code}`}
              >
                <span>{lang.label}</span>
                {isActive && <Check className="w-3.5 h-3.5 text-[#0091AE]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
