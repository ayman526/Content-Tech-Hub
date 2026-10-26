import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const OPENAI_BASE_URL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ?? "https://api.openai.com/v1";
const OPENAI_API_KEY = process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "";

/**
 * POST /api/style-guides/generate
 * Uses AI to write a professional style guide based on user-provided context.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    industry,
    country,
    servicesProducts,
    targetAudience,
    tone,
    formality,
    languages,
    additionalNotes,
  } = await req.json();

  if (!industry?.trim()) {
    return NextResponse.json({ error: "Industry is required" }, { status: 400 });
  }

  const systemPrompt = "You are an expert technical writer specializing in translation style guides for enterprise localization teams. Write structured, concise, and immediately actionable guides.";

  const userPrompt = `Write a professional translation style guide for the following organization.

Context:
- Industry: ${industry}
- Country / Primary Market: ${country || "Not specified"}
- Services or Products: ${servicesProducts || "Not specified"}
- Target Audience: ${targetAudience || "General public"}
- Tone: ${tone || "Professional"}
- Formality: ${formality || "Semi-formal"}
- Target Languages: ${languages || "Not specified"}
${additionalNotes ? `- Notes: ${additionalNotes}` : ""}

Write a concise but complete style guide covering these sections (2-4 sentences or bullet points each):

1. OVERVIEW
2. TONE AND VOICE
3. FORMALITY AND REGISTER
4. TERMINOLOGY
5. FORMATTING RULES
6. CULTURAL ADAPTATION
7. BRAND NAMES AND TRADEMARKS
8. CONSISTENCY RULES
9. QA CHECKLIST`;

  let rawBody: string | null = null;
  try {
    const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-5-nano",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_completion_tokens: 8000,
      }),
    });

    rawBody = await res.text();

    if (!res.ok) {
      console.error("[style-guide/generate] OpenAI HTTP error", res.status, rawBody);
      return NextResponse.json(
        { error: `AI service error (${res.status}). Please try again.` },
        { status: 500 }
      );
    }

    let data: any;
    try {
      data = JSON.parse(rawBody);
    } catch {
      console.error("[style-guide/generate] Failed to parse OpenAI response:", rawBody);
      return NextResponse.json({ error: "AI returned an invalid response. Please try again." }, { status: 500 });
    }

    console.log("[style-guide/generate] finish_reason:", data.choices?.[0]?.finish_reason, "usage:", JSON.stringify(data.usage));

    const content = data.choices?.[0]?.message?.content?.trim() ?? "";

    if (!content) {
      console.error("[style-guide/generate] Empty content from OpenAI. Full response:", JSON.stringify(data));
      return NextResponse.json(
        { error: "AI returned an empty response. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ content });
  } catch (err) {
    console.error("[style-guide/generate] Fetch error:", err, "rawBody:", rawBody);
    return NextResponse.json({ error: "Failed to reach AI service. Please try again." }, { status: 500 });
  }
}
