import path from "path";

const STORAGE_ROOT = path.join(process.cwd(), "storage");

/** Convert an absolute filesystem path under ./storage to a web-served URL
 *  like /storage/pdfs/<file>. Returns the original value if it does not look
 *  like a storage path. */
export function toStorageUrl(absPath: string | null | undefined): string | null {
  if (!absPath) return null;
  const base = absPath.split("/").pop()!;
  if (absPath.includes("/storage/images/")) return `/storage/images/${base}`;
  if (absPath.includes("/storage/pdfs/")) return `/storage/pdfs/${base}`;
  if (absPath.includes("/storage/pptx/")) return `/storage/pptx/${base}`;
  return absPath;
}

/** Reverse of toStorageUrl: resolve a /storage/... web URL (or relative
 *  storage path) back to an absolute filesystem path so it can be passed to
 *  fs.existsSync / Python tooling / pdf libraries. Absolute paths or
 *  external URLs are returned unchanged. */
export function toAbsoluteStoragePath(input: string | null | undefined): string | null {
  if (!input) return null;
  const value = input.trim();
  if (!value) return null;
  if (value === "#") return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/storage/")) return path.join(STORAGE_ROOT, value.slice("/storage/".length));
  if (value.startsWith("storage/")) return path.join(process.cwd(), value);
  return value;
}
