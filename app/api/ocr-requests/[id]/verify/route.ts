import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFeature } from "@/lib/plan-features";

/**
 * POST /api/ocr-requests/[id]/verify
 * Linguist verification endpoint — accepts the corrected text from a human
 * reviewer, stores it on `verifiedText`, and transitions the OCR request to
 * VERIFIED. Once verified the request becomes the source-of-truth for any
 * downstream "Use in new translation project" CTA.
 *
 * Body: { verifiedText: string, pages?: OcrPage[] }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.organizationId ?? null;
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return NextResponse.json({ error: "Organisation not found" }, { status: 404 });
  if (!(await hasFeature(org.plan, "ocr_requests"))) {
    return NextResponse.json(
      { error: "Your plan does not include OCR Requests." },
      { status: 403 }
    );
  }

  const { id } = await params;
  const userId = session.user.id;
  const role = (session.user as { role?: string }).role ?? "CLIENT";

  const existing = await prisma.ocrRequest.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Member-level ACL: members must have access to the client account, OR be
  // the assigned linguist for this request, OR be elevated.
  const isElevated = role === "ADMIN" || role === "OWNER" || role === "AGENCY_OWNER";
  const isAssignee = existing.assignedLinguistId === userId;
  if (!isElevated && !isAssignee && existing.clientAccountId) {
    const access = await prisma.memberClientAccountAccess.findFirst({
      where: { userId, organizationId: orgId, clientAccountId: existing.clientAccountId },
    });
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (existing.status === "VERIFIED") {
    return NextResponse.json(
      { error: "This OCR request is already verified" },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.verifiedText !== "string") {
    return NextResponse.json(
      { error: "verifiedText is required" },
      { status: 400 }
    );
  }
  const verifiedText = body.verifiedText;

  const wordCount = verifiedText.trim().split(/\s+/).filter(Boolean).length;

  const updated = await prisma.ocrRequest.update({
    where: { id },
    data: {
      verifiedText,
      extractedText: verifiedText,
      ...(Array.isArray(body.pages) ? { pages: body.pages } : {}),
      wordCount,
      status: "VERIFIED",
      verifiedAt: new Date(),
      verifiedById: userId,
    },
  });

  return NextResponse.json({
    ...updated,
    avgConfidence: Number(updated.avgConfidence),
  });
}
