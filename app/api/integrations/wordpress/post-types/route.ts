import { hasFeature } from "@/lib/plan-features";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWPClient } from "@/lib/wordpress-client";

const EXCLUDED_TYPES = new Set([
  "attachment", "revision", "nav_menu_item", "custom_css", "customize_changeset",
  "oembed_cache", "user_request", "wp_block", "wp_template", "wp_template_part",
  "wp_global_styles", "wp_navigation",
]);

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as any).organizationId;

  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { plan: true } });
  if (!(await hasFeature(org?.plan ?? "STARTER", "wordpress_integration"))) {
    return NextResponse.json({ error: "WordPress integration requires an Agency or Enterprise plan" }, { status: 403 });
  }

  try {
    const { adapter } = await getWPClient(orgId);
    const types = await adapter.listPostTypes();
    return NextResponse.json(types.filter((t) => !EXCLUDED_TYPES.has(t.slug)));
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to fetch post types" }, { status: 500 });
  }
}
