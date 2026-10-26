import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCMAEnvironment } from "@/lib/contentful-client";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as any).organizationId;

  try {
    const { env } = await getCMAEnvironment(orgId);
    const cts = await env.getContentTypes({ limit: 200 });
    return NextResponse.json(
      cts.items.map((ct: any) => ({
        id: ct.sys.id,
        name: ct.name,
        fields: ct.fields
          .filter((f: any) => ["Symbol", "Text", "RichText"].includes(f.type))
          .map((f: any) => ({ id: f.id, name: f.name, type: f.type, required: f.required })),
      }))
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to fetch content types" }, { status: 500 });
  }
}
