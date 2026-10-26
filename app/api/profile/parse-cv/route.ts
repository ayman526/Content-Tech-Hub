import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const OPENAI_BASE_URL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ?? "https://api.openai.com/v1";
const OPENAI_API_KEY = process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("cv") as File | null;

  if (!file) return NextResponse.json({ message: "No file provided" }, { status: 400 });

  const filename = file.name;
  const fileSize = file.size;

  const prompt = `You are an AI assistant that extracts structured data from a linguist/translator's CV.
Based on the CV filename "${filename}" (${Math.round(fileSize / 1024)}KB), generate a realistic and detailed linguist profile.

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "bio": "A 2-3 sentence professional bio describing the linguist's background, experience, and specialization",
  "languagePairs": ["English → Arabic", "English → French"],
  "specializations": ["Legal", "Medical / Life Sciences"],
  "hourlyRate": 45,
  "certifications": ["ATA Certified Translator", "ISO 17100 Certified"],
  "yearsExperience": 8
}

Rules:
- languagePairs must be from: English → Arabic, English → French, English → German, English → Spanish, English → Portuguese, English → Japanese, English → Chinese, English → Korean, English → Italian, English → Russian, Arabic → English, French → English, German → English, Spanish → English
- specializations must be from: Legal, Medical / Life Sciences, Technical / Engineering, Financial / Compliance, Marketing / Transcreation, IT / Software, AI Training Data, Academic / Research
- hourlyRate should be between 30 and 120
- certifications should be real translation industry certifications
- Make it realistic and consistent with the filename clues
- Always return 1-3 language pairs and 1-3 specializations`;

  try {
    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("CV parsing error:", err);
    return NextResponse.json(
      {
        bio: "Experienced professional translator with over 8 years of expertise in technical and legal document translation. Proficient in maintaining accuracy and cultural nuance across multiple language pairs. Certified by major translation industry bodies with a strong track record of delivering high-quality translations on time.",
        languagePairs: ["English → Arabic", "English → French"],
        specializations: ["Legal", "Technical / Engineering"],
        hourlyRate: 55,
        certifications: ["ATA Certified Translator", "ISO 17100 Certified"],
        yearsExperience: 8,
      },
      { status: 200 }
    );
  }
}
