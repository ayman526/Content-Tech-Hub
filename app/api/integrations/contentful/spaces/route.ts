import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCMAEnvironment } from "@/lib/contentful-client";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as any).organizationId;

  try {
    const { space } = await getCMAEnvironment(orgId);
    const locales = await (await space.getEnvironment("master")).getLocales();
    return NextResponse.json({
      spaceId: space.sys.id,
      spaceName: space.name,
      locales: locales.items.map((l: any) => ({ code: l.code, name: l.name, default: l.default })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to fetch space info" }, { status: 500 });
  }
}
