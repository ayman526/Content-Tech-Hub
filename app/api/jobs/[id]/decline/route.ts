import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const user = session.user as { id: string; role?: string };
  if (user.role !== "LINGUIST" && user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) return NextResponse.json({ message: "Job not found" }, { status: 404 });

  if (job.status === "ACCEPTED" && job.linguistId === user.id) {
    await prisma.job.update({
      where: { id },
      data: {
        status: "AVAILABLE",
        linguistId: null,
        acceptedAt: null,
      },
    });
    return NextResponse.json({ message: "Job un-accepted and returned to the pool." });
  }

  return NextResponse.json({ message: "Job declined — it will remain in the pool." });
}
