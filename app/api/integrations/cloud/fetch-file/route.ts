import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * POST /api/integrations/cloud/fetch-file
 *
 * Proxies a file download from a cloud storage URL (Google Drive, Dropbox, OneDrive)
 * and returns the raw binary so the wizard can feed it into the analyze flow.
 *
 * Body: { url: string; filename: string; accessToken?: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { url: string; filename: string; accessToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { url, filename, accessToken } = body;
  if (!url || !filename)
    return NextResponse.json({ error: "Missing url or filename" }, { status: 400 });

  const headers: Record<string, string> = {
    "User-Agent": "Contentech/1.0",
    "Accept": "*/*",
  };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  let fileRes: Response;
  try {
    fileRes = await fetch(url, { headers });
  } catch (e) {
    console.error("[cloud/fetch-file] Network error:", e);
    return NextResponse.json({ error: "Failed to reach cloud provider" }, { status: 502 });
  }

  if (!fileRes.ok) {
    let errorBody = "";
    try { errorBody = await fileRes.text(); } catch { /* ignore */ }
    console.error(
      `[cloud/fetch-file] Provider returned ${fileRes.status} for ${url}\nBody: ${errorBody.slice(0, 500)}`
    );
    return NextResponse.json(
      { error: `Cloud provider returned ${fileRes.status}`, detail: errorBody.slice(0, 200) },
      { status: 502 }
    );
  }

  const contentType = fileRes.headers.get("content-type") ?? "application/octet-stream";
  const data = await fileRes.arrayBuffer();

  const MAX_BYTES = 50 * 1024 * 1024; // 50 MB guard
  if (data.byteLength > MAX_BYTES)
    return NextResponse.json({ error: "File exceeds the 50 MB limit" }, { status: 413 });

  return new NextResponse(data, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      "Cache-Control": "no-store",
    },
  });
}
