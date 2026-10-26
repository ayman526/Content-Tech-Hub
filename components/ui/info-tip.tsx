"use client";

import { Info } from "lucide-react";

export function Tooltip({ text }: { text: string }) {
  return (
    <span className="relative group inline-flex items-center ml-1 align-middle">
      <Info className="w-3.5 h-3.5 text-gray-400 cursor-help group-hover:text-[#0091AE] transition-colors" />
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 bg-[#33475B] text-white text-[11px] leading-relaxed rounded-xl px-3 py-2.5 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl font-normal">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#33475B]" />
      </span>
    </span>
  );
}

export function InfoNote({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-start gap-3 p-4 bg-[#0091AE]/5 border border-[#0091AE]/20 rounded-xl text-sm text-[#33475B] leading-relaxed ${className ?? ""}`}>
      <Info className="w-4 h-4 text-[#0091AE] flex-shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}
