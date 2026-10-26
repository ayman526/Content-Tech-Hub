import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrCreateWorkspace, isSubscribed } from "@/lib/studio";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "LINGUIST" && session.user.role !== "ADMIN"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ws = await getOrCreateWorkspace(session.user.id!);
  return NextResponse.json({ ...ws, subscribed: isSubscribed(ws) });
}
