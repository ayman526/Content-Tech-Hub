import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateWorkspace, isSubscribed, logActivity } from "@/lib/studio";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "LINGUIST" && session.user.role !== "ADMIN"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ws = await getOrCreateWorkspace(session.user.id!);
  if (!isSubscribed(ws)) return NextResponse.json({ error: "Studio subscription required" }, { status: 403 });

  const clients = await prisma.studioClient.findMany({
    where: { workspaceId: ws.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { jobs: true } } },
  });
  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "LINGUIST" && session.user.role !== "ADMIN"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ws = await getOrCreateWorkspace(session.user.id!);
  if (!isSubscribed(ws)) return NextResponse.json({ error: "Studio subscription required" }, { status: 403 });

  const body = await req.json();
  const { name, contactName, contactEmail, companyName, notes, preferredLanguages } = body;
  if (!name?.trim()) return NextResponse.json({ error: "Client name is required" }, { status: 400 });

  const client = await prisma.studioClient.create({
    data: {
      workspaceId: ws.id,
      name: name.trim(),
      contactName: contactName || null,
      contactEmail: contactEmail || null,
      companyName: companyName || null,
      notes: notes || null,
      preferredLanguages: preferredLanguages ?? [],
    },
  });
  await logActivity(ws.id, "client.created", { clientId: client.id, name: client.name });
  return NextResponse.json(client, { status: 201 });
}
