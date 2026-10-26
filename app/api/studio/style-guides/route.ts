import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateWorkspace, isSubscribed } from "@/lib/studio";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "LINGUIST" && session.user.role !== "ADMIN"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ws = await getOrCreateWorkspace(session.user.id!);
  if (!isSubscribed(ws)) return NextResponse.json({ error: "Studio subscription required" }, { status: 403 });

  const guides = await prisma.studioStyleGuide.findMany({
    where: { workspaceId: ws.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(guides);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "LINGUIST" && session.user.role !== "ADMIN"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ws = await getOrCreateWorkspace(session.user.id!);
  if (!isSubscribed(ws)) return NextResponse.json({ error: "Studio subscription required" }, { status: 403 });

  const body = await req.json();
  const { name, content } = body;
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const guide = await prisma.studioStyleGuide.create({
    data: { workspaceId: ws.id, name: name.trim(), content: content ?? "" },
  });
  return NextResponse.json(guide, { status: 201 });
}
