export function sanitizeShort(v: string | null | undefined, max: number): string | null {
  if (v === undefined || v === null) return null;
  const stripped = String(v).replace(/[\u0000-\u001F\u007F]/g, " ").trim();
  if (!stripped) return null;
  return stripped.length > max ? stripped.slice(0, max) : stripped;
}

export function sanitizeBio(v: string | null | undefined, max = 1500): string | null {
  if (v === undefined || v === null) return null;
  const stripped = String(v).replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, " ").trim();
  if (!stripped) return null;
  return stripped.length > max ? stripped.slice(0, max) : stripped;
}
