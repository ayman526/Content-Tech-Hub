import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { hasFeature } from "@/lib/plan-features";

const VALID_STATUSES = new Set([
  "NEEDS_VERIFICATION",
  "IN_REVIEW",
  "VERIFIED",
  "READY",
  "FAILED",
]);

/**
 * Load an OCR request and verify the caller's org + member-level ACL access
 * to it. Returns either the loaded record or a 403/404 NextResponse.
 */
async function loadAccessibleRequest(
  id: string,
  orgId: string,
  userId: string,
  role: string,
) {
  const r = await prisma.ocrRequest.findFirst({
    where: { id, organizationId: orgId },
    include: { clientAccount: { select: { id: true, name: true } } },
  });
  if (!r) return { response: NextResponse.json({ error: "Not found" }, { status: 404 }) };

  const isElevated = role === "ADMIN" || role === "OWNER" || role === "AGENCY_OWNER";
  if (!isElevated && r.clientAccountId) {
    const access = await prisma.memberClientAccountAccess.findFirst({
      where: { userId, organizationId: orgId, clientAccountId: r.clientAccountId },
    });
    if (!access) {
      return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
  }
  return { record: r };
}

async function requirePlanFeature(orgId: string): Promise<NextResponse | null> {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return NextResponse.json({ error: "Organisation not found" }, { status: 404 });
  const allowed = await hasFeature(org.plan, "ocr_requests");
  if (!allowed) {
    return NextResponse.json(
      { error: "Your plan does not include OCR Requests. Upgrade to Professional or higher." },
      { status: 403 }
    );
  }
  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.organizationId ?? null;
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const planError = await requirePlanFeature(orgId);
  if (planError) return planError;

  const { id } = await params;
  const role = (session.user as { role?: string }).role ?? "CLIENT";
  const result = await loadAccessibleRequest(id, orgId, session.user.id, role);
  if ("response" in result) return result.response;

  return NextResponse.json({ ...result.record, avgConfidence: Number(result.record.avgConfidence) });
}

/**
 * PATCH /api/ocr-requests/[id]
 * Update fields on an OCR request — typically used during human verification.
 * Status transitions are enforced: a VERIFIED request cannot move back.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.organizationId ?? null;
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const planError = await requirePlanFeature(orgId);
  if (planError) return planError;

  const { id } = await params;
  const role = (session.user as { role?: string }).role ?? "CLIENT";
  const result = await loadAccessibleRequest(id, orgId, session.user.id, role);
  if ("response" in result) return result.response;
  const existing = result.record;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const data: Prisma.OcrRequestUpdateInput = {};

  if (typeof body.notes === "string") data.notes = body.notes;
  if (typeof body.assignedLinguistId === "string" || body.assignedLinguistId === null) {
    data.assignedLinguistId = body.assignedLinguistId;
  }

  // When the caller submits edited pages we must (a) persist them, (b)
  // recompute wordCount from canonical text, and (c) refresh the joined
  // canonical text fields used by /download and downstream consumers so
  // edits aren't shadowed by stale extractedText/verifiedText.
  if (Array.isArray(body.pages)) {
    type EditedPage = { text?: unknown; pageNum?: unknown };
    const pagesIn = body.pages as EditedPage[];
    const texts = pagesIn.map((p) =>
      typeof p?.text === "string" ? p.text : ""
    );
    data.pages = body.pages as Prisma.InputJsonValue;
    data.wordCount = texts.reduce(
      (sum, t) => sum + t.trim().split(/\s+/).filter(Boolean).length,
      0
    );
    const joined = texts.join("\n\n").trim();
    // Always refresh extractedText with the latest cleaned content so
    // downloads (.txt/.docx) and project handoff use the user's edits.
    data.extractedText = joined;
    // If the caller is finalising (VERIFIED/READY), also stamp verifiedText
    // — that's the field /download prefers when present.
    if (body.status === "VERIFIED" || body.status === "READY") {
      data.verifiedText = joined;
    }
  } else if (typeof body.verifiedText === "string") {
    // Backwards-compatible direct-set path.
    data.verifiedText = body.verifiedText;
  }

  if (typeof body.status === "string") {
    if (!VALID_STATUSES.has(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    // VERIFIED is terminal — once signed off, no transitions back.
    if (existing.status === "VERIFIED" && body.status !== "VERIFIED") {
      return NextResponse.json(
        { error: "Verified OCR requests cannot change status" },
        { status: 409 }
      );
    }
    data.status = body.status as Prisma.OcrRequestUpdateInput["status"];
    if (body.status === "VERIFIED" && existing.status !== "VERIFIED") {
      data.verifiedAt = new Date();
      data.verifiedById = session.user.id;
    }
  }

  const updated = await prisma.ocrRequest.update({
    where: { id },
    data,
    include: { clientAccount: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ ...updated, avgConfidence: Number(updated.avgConfidence) });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.organizationId ?? null;
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const planError = await requirePlanFeature(orgId);
  if (planError) return planError;

  const { id } = await params;
  const role = (session.user as { role?: string }).role ?? "CLIENT";
  const result = await loadAccessibleRequest(id, orgId, session.user.id, role);
  if ("response" in result) return result.response;

  await prisma.ocrRequest.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
