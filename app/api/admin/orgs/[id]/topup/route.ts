import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || role !== "ADMIN") return null;
  return session;
}

const TopUpSchema = z.object({
  amount: z.number().int().refine((n) => n !== 0, "Amount must be non-zero"),
  type: z.enum(["BONUS", "REFUND"]).default("BONUS"),
  note: z.string().trim().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: orgId } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = TopUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { amount, type, note } = parsed.data;

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, creditBalance: true },
  });
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  // Negative amounts are allowed (admin "claw-back") but must not push the
  // balance below zero. Use the same gte-guarded updateMany pattern used by
  // the OCR/project debits so the operation stays atomic and consistent.
  const isDebit = amount < 0;
  const adminLabel =
    session.user.email ?? session.user.name ?? session.user.id ?? "admin";
  const description =
    note?.trim() ||
    (isDebit
      ? `Admin adjustment (${type.toLowerCase()}) by ${adminLabel}`
      : `Admin top-up (${type.toLowerCase()}) by ${adminLabel}`);

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (isDebit) {
        const required = -amount;
        const dec = await tx.organization.updateMany({
          where: { id: orgId, creditBalance: { gte: required } },
          data: { creditBalance: { decrement: required } },
        });
        if (dec.count !== 1) throw new Error("INSUFFICIENT_CREDITS");
      } else {
        await tx.organization.update({
          where: { id: orgId },
          data: { creditBalance: { increment: amount } },
        });
      }

      const ledger = await tx.creditTransaction.create({
        data: {
          organizationId: orgId,
          type,
          amount,
          description,
          breakdownJSON: {
            kind: "admin_topup",
            adminUserId: session.user.id ?? null,
            adminEmail: session.user.email ?? null,
          },
        },
      });

      const updated = await tx.organization.findUnique({
        where: { id: orgId },
        select: { creditBalance: true },
      });

      return { ledger, balance: updated?.creditBalance ?? 0 };
    });

    return NextResponse.json({
      ok: true,
      orgId,
      newBalance: result.balance,
      transactionId: result.ledger.id,
    });
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : String(e);
    if (errMsg === "INSUFFICIENT_CREDITS") {
      return NextResponse.json(
        {
          error: `Cannot debit ${-amount} — current balance is ${org.creditBalance}.`,
        },
        { status: 409 },
      );
    }
    console.error("[admin/orgs/topup] failed:", errMsg);
    return NextResponse.json({ error: "Top-up failed" }, { status: 500 });
  }
}
