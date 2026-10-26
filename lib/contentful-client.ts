import * as contentfulManagement from "contentful-management";
import { decrypt } from "./encrypt";
import { prisma } from "./prisma";

/**
 * Returns an authenticated Contentful Management API environment client for the given org.
 */
export async function getCMAEnvironment(orgId: string) {
  const conn = await prisma.contentfulConnection.findUnique({ where: { organizationId: orgId } });
  if (!conn) throw new Error("Contentful not connected for this organization");

  const token = decrypt(conn.encryptedToken);
  const client = contentfulManagement.createClient({ accessToken: token });
  const space = await client.getSpace(conn.spaceId);
  const env = await space.getEnvironment(conn.environmentId);
  return { env, conn, space };
}

/**
 * Returns a bare CMA client (to list spaces etc.) from a raw PAT token.
 */
export function getCMAClient(token: string) {
  return contentfulManagement.createClient({ accessToken: token });
}

// ─── RichText Utilities ──────────────────────────────────────────────────────

export interface RichTextNode {
  nodeType: string;
  value?: string;
  marks?: { type: string }[];
  content?: RichTextNode[];
  data?: Record<string, any>;
}

/**
 * Extract all text values from a Contentful RichText document.
 * Returns a flat list of { path, value } so we can translate and put them back.
 */
export function extractRichTextSegments(
  node: RichTextNode,
  path: (string | number)[] = []
): { path: (string | number)[]; value: string }[] {
  const results: { path: (string | number)[]; value: string }[] = [];
  if (node.nodeType === "text" && node.value && node.value.trim()) {
    results.push({ path, value: node.value });
  }
  if (Array.isArray(node.content)) {
    node.content.forEach((child, i) => {
      results.push(...extractRichTextSegments(child, [...path, "content", i]));
    });
  }
  return results;
}

/**
 * Deep-clone a RichText node and replace text values at the given paths.
 */
export function applyRichTextTranslations(
  node: RichTextNode,
  translations: Map<string, string>,
  path: (string | number)[] = []
): RichTextNode {
  const key = path.join(".");
  if (node.nodeType === "text") {
    const translated = translations.get(key);
    return { ...node, value: translated !== undefined ? translated : node.value };
  }
  return {
    ...node,
    content: node.content?.map((child, i) =>
      applyRichTextTranslations(child, translations, [...path, "content", i])
    ),
  };
}

/**
 * Count approximate words in text extracted from a field value.
 */
export function countWords(value: any, fieldType: string): number {
  if (!value) return 0;
  if (fieldType === "RichText") {
    const segs = extractRichTextSegments(value as RichTextNode);
    return segs.reduce((sum, s) => sum + s.value.split(/\s+/).filter(Boolean).length, 0);
  }
  return String(value).split(/\s+/).filter(Boolean).length;
}

/**
 * Extract plain-text segments from any supported field type.
 * Returns array of { key, text } where key uniquely identifies the segment.
 */
export function extractFieldSegments(
  fieldId: string,
  value: any,
  fieldType: string
): { key: string; text: string }[] {
  if (!value) return [];

  if (fieldType === "RichText") {
    return extractRichTextSegments(value as RichTextNode).map((s) => ({
      key: `${fieldId}::rt::${s.path.join(".")}`,
      text: s.value,
    }));
  }

  // Symbol or Text
  const text = String(value).trim();
  if (!text) return [];
  return [{ key: `${fieldId}::plain`, text }];
}

/**
 * Rebuild a translated field value from a map of { key → translated text }.
 */
export function rebuildFieldValue(
  fieldId: string,
  originalValue: any,
  fieldType: string,
  translationMap: Map<string, string>
): any {
  if (fieldType === "RichText") {
    const pathMap = new Map<string, string>();
    translationMap.forEach((translated, key) => {
      // key format: `${fieldId}::rt::${path}`
      const pathStr = key.replace(`${fieldId}::rt::`, "");
      pathMap.set(pathStr, translated);
    });
    return applyRichTextTranslations(originalValue as RichTextNode, pathMap);
  }
  return translationMap.get(`${fieldId}::plain`) ?? originalValue;
}
