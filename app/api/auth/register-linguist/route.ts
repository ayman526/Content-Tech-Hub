import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, languages, specializations } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ message: "Name, email and password are required." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ message: "An account with this email already exists." }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "LINGUIST",
        linguistProfile: {
          create: {
            languagePairs: languages ?? [],
            specializations: specializations ?? [],
          },
        },
      },
    });

    return NextResponse.json({ message: "Linguist account created successfully." }, { status: 201 });
  } catch (error) {
    console.error("Linguist registration error:", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
