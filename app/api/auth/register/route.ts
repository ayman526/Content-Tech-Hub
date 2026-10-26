import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { notifyAsync } from "@/lib/notifications";

const SIGNUP_CREDITS = 1000;

export async function POST(req: NextRequest) {
  try {
    const { name, email, orgName, password, joinOrgId } = await req.json();

    if (!name || !email || !orgName || !password) {
      return NextResponse.json(
        { message: "All fields are required." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { message: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const baseUrl = process.env.NEXTAUTH_URL ?? req.nextUrl.origin;

    // ── Path A: Request to join an existing organization ─────────────────────
    if (joinOrgId) {
      const org = await prisma.organization.findUnique({ where: { id: joinOrgId } });
      if (!org) {
        return NextResponse.json({ message: "Organization not found." }, { status: 404 });
      }

      const user = await prisma.user.create({
        data: { name, email, password: hashedPassword, role: "CLIENT" },
      });

      await prisma.organizationJoinRequest.create({
        data: { userId: user.id, organizationId: org.id },
      });

      notifyAsync({
        eventKey: "user.welcome",
        recipients: [{ userId: user.id, email, name }],
        vars: {
          user_name: name,
          dashboard_url: `${baseUrl}/dashboard`,
        },
        triggeredBy: user.id,
      });

      notifyAsync({
        eventKey: "user.email_verification",
        recipients: [{ userId: user.id, email, name }],
        vars: {
          user_name: name,
          verification_url: `${baseUrl}/verify-email?token=pending`,
          expiry_hours: "48",
        },
        triggeredBy: user.id,
      });

      return NextResponse.json(
        {
          message: `Account created. Your request to join ${org.name} has been sent to the workspace admin.`,
          joinRequest: true,
          orgName: org.name,
        },
        { status: 201 }
      );
    }

    // ── Path B: Create a brand-new organization ───────────────────────────────
    const slugBase = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "org";
    let slug = slugBase;
    let counter = 1;
    while (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${slugBase}-${counter++}`;
    }

    const nextReset = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const [org, user] = await prisma.$transaction(async (tx) => {
      const newOrg = await tx.organization.create({
        data: {
          name: orgName,
          slug,
          plan: "STARTER",
          creditBalance: SIGNUP_CREDITS,
          creditsResetAt: nextReset,
        },
      });

      await tx.creditTransaction.create({
        data: {
          organizationId: newOrg.id,
          type: "BONUS",
          amount: SIGNUP_CREDITS,
          description: "Welcome bonus — 100 free credits on sign-up",
          breakdownJSON: { kind: "signup_bonus" },
        },
      });

      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: "CLIENT",
          organizationId: newOrg.id,
        },
      });

      return [newOrg, newUser];
    });

    notifyAsync({
      eventKey: "user.welcome",
      recipients: [{ userId: user.id, email, name }],
      vars: {
        user_name: name,
        dashboard_url: `${baseUrl}/dashboard`,
      },
      triggeredBy: user.id,
    });

    notifyAsync({
      eventKey: "user.email_verification",
      recipients: [{ userId: user.id, email, name }],
      vars: {
        user_name: name,
        verification_url: `${baseUrl}/verify-email?token=pending`,
        expiry_hours: "48",
      },
      triggeredBy: user.id,
    });

    return NextResponse.json(
      { message: "Account created successfully." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
