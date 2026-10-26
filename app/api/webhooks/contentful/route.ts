import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * Contentful webhook endpoint.
 * Receives entry.publish and entry.save events.
 * Marks existing ContentfulJobs as "out of date" if the source entry changed
 * after a delivery — unless the change was made by our system.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  let payload: any;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const topic = req.headers.get("x-contentful-topic") ?? "";
  const spaceId = payload?.sys?.space?.sys?.id ?? "";
  const entryId = payload?.sys?.id ?? "";

  if (!entryId || !spaceId) return NextResponse.json({ ok: true });

  // Find the org with this space connected
  const conn = await prisma.contentfulConnection.findFirst({ where: { spaceId } });
  if (!conn) return NextResponse.json({ ok: true });

  // Find delivered jobs for this entry
  const relatedJobs = await prisma.contentfulJob.findMany({
    where: {
      organizationId: conn.organizationId,
      entryId,
      status: "DELIVERED",
    },
    include: { locales: true },
  });

  if (relatedJobs.length === 0) return NextResponse.json({ ok: true });

  // Compute a hash of the source fields in the payload (basic change detection)
  const incomingHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(payload?.fields ?? {}))
    .digest("hex");

  for (const job of relatedJobs) {
    const storedHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(job.sourceSnapshot))
      .digest("hex");

    if (incomingHash !== storedHash) {
      await prisma.contentfulJob.update({
        where: { id: job.id },
        data: { status: "OUT_OF_DATE" },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
