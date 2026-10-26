import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * GET /api/integrations/cloud-status
 *
 * Returns which cloud file-sharing providers are configured on this platform
 * (i.e. the admin has set the required env vars). The frontend uses this to
 * decide whether to show real pickers or a "not configured" prompt.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    dropbox: {
      configured: !!process.env.NEXT_PUBLIC_DROPBOX_APP_KEY,
      appKey: process.env.NEXT_PUBLIC_DROPBOX_APP_KEY ?? null,
    },
    google_drive: {
      configured: !!(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && process.env.NEXT_PUBLIC_GOOGLE_API_KEY),
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? null,
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? null,
    },
    onedrive: {
      configured: !!process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID,
      clientId: process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID ?? null,
    },
  });
}
