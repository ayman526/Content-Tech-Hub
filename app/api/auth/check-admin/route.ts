import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export const GET = auth(function handler(req) {
  const session = req.auth;
  if (!session?.user) return NextResponse.json({ role: null }, { status: 401 });
  const role = (session.user as any).role ?? null;
  return NextResponse.json({ role });
});
