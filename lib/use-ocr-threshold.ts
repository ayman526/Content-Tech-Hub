"use client";

import { useEffect, useState } from "react";

/** Default fallback while the API call is in flight. Mirrors the
 *  server default in `lib/ocr-pipeline.ts` (`getOcrConfidenceThreshold`). */
export const OCR_THRESHOLD_FALLBACK = 0.95;

/**
 * Client hook that fetches the configured OCR confidence threshold
 * from `/api/ocr-config` so all UI uses the same value the server
 * uses for the quality gate. Returns the fallback (0.95) until the
 * fetch resolves.
 */
export function useOcrThreshold(): number {
  const [threshold, setThreshold] = useState(OCR_THRESHOLD_FALLBACK);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ocr-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const t = data?.confidenceThreshold;
        if (typeof t === "number" && Number.isFinite(t) && t >= 0 && t <= 1) {
          setThreshold(t);
        }
      })
      .catch(() => {
        /* keep fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return threshold;
}
