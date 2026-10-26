import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCMAEnvironment } from "@/lib/contentful-client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as any).organizationId;

  const { searchParams } = req.nextUrl;
  const contentType = searchParams.get("contentType") ?? "";
  const search = searchParams.get("search") ?? "";
  const skip = parseInt(searchParams.get("skip") ?? "0", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "25", 10), 50);

  try {
    const { env, conn } = await getCMAEnvironment(orgId);

    const query: Record<string, any> = {
      limit,
      skip,
      order: "-sys.updatedAt",
    };
    if (contentType) query["content_type"] = contentType;
    if (search) query["query"] = search;

    const entries = await env.getEntries(query);
    const sourceLocale = conn.sourceLocale;

    const items = entries.items.map((entry: any) => {
      const fields = entry.fields ?? {};
      const title =
        fields.title?.[sourceLocale] ??
        fields.name?.[sourceLocale] ??
        fields.slug?.[sourceLocale] ??
        Object.values(fields)[0]?.[sourceLocale] ??
        entry.sys.id;

      const locales = Object.keys(
        Object.values(fields)[0] ?? {}
      );

      return {
        id: entry.sys.id,
        contentType: entry.sys.contentType?.sys?.id ?? "",
        title: typeof title === "string" ? title : entry.sys.id,
        updatedAt: entry.sys.updatedAt,
        publishedAt: entry.sys.publishedAt ?? null,
        locales,
      };
    });

    return NextResponse.json({ items, total: entries.total, skip, limit });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to fetch entries" }, { status: 500 });
  }
}
