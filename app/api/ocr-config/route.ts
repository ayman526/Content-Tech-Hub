import { NextResponse } from "next/server";
import { getOcrConfidenceThreshold, getOcrProvider } from "@/lib/ocr-pipeline";

/**
 * Lightweight public endpoint that exposes OCR configuration so the client UI
 * can reflect the same values used server-side.  No auth required — none of
 * these values are sensitive.
 */
export async function GET() {
  const provider = getOcrProvider();
  return NextResponse.json({
    confidenceThreshold: getOcrConfidenceThreshold(),
    activeProvider: provider.name,
    mistralConfigured: provider.name === "mistral",
  });
}
