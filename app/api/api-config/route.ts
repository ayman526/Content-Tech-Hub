import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json([], { status: 401 });

  const configs = await prisma.apiConfiguration.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      provider: true,
      model: true,
      endpoint: true,
      lastUsed: true,
      createdAt: true,
    },
  });

  return NextResponse.json(configs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { provider, apiKey, model, endpoint } = body;

  if (!provider || !apiKey)
    return NextResponse.json(
      { error: "Provider and API key are required" },
      { status: 400 }
    );

  const normalizedProvider = provider.toUpperCase() as
    | "OPENAI"
    | "AZURE"
    | "DEEPL"
    | "MODERNMT"
    | "GOOGLE";

  const config = await prisma.apiConfiguration.upsert({
    where: {
      userId_provider: {
        userId: session.user.id,
        provider: normalizedProvider,
      },
    },
    update: {
      apiKeyEncrypted: apiKey,
      model: model ?? null,
      endpoint: endpoint ?? null,
    },
    create: {
      userId: session.user.id,
      provider: normalizedProvider,
      apiKeyEncrypted: apiKey,
      model: model ?? null,
      endpoint: endpoint ?? null,
    },
  });

  return NextResponse.json({
    id: config.id,
    provider: config.provider,
    model: config.model,
  });
}
