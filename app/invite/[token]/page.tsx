import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Building2, CheckCircle2, XCircle, Clock } from "lucide-react";
import InviteAcceptButton from "./accept-button";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await auth();

  const invitation = await prisma.departmentInvitation.findUnique({
    where: { token },
    include: {
      department: { select: { id: true, name: true } },
      organization: { select: { id: true, name: true } },
      invitedBy: { select: { name: true, email: true } },
    },
  });

  if (!invitation) {
    return (
      <InvitePage_Shell>
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-navy mb-2">Invalid Invitation</h1>
        <p className="text-sm text-gray-500">This invitation link is invalid or has already been used.</p>
        <Link href="/" className="mt-6 inline-block text-sm text-teal font-medium hover:underline">
          Go to Contentech
        </Link>
      </InvitePage_Shell>
    );
  }

  if (invitation.status === "ACCEPTED") {
    return (
      <InvitePage_Shell>
        <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-navy mb-2">Already Accepted</h1>
        <p className="text-sm text-gray-500">This invitation has already been accepted.</p>
        <Link href="/dashboard" className="mt-6 inline-block text-sm text-teal font-medium hover:underline">
          Go to Dashboard
        </Link>
      </InvitePage_Shell>
    );
  }

  if (invitation.status === "CANCELLED" || new Date() > invitation.expiresAt) {
    await prisma.departmentInvitation.update({
      where: { token },
      data: { status: "EXPIRED" },
    });
    return (
      <InvitePage_Shell>
        <Clock className="w-12 h-12 text-gold mx-auto mb-4" />
        <h1 className="text-xl font-bold text-navy mb-2">Invitation Expired</h1>
        <p className="text-sm text-gray-500">This invitation link has expired. Please ask for a new one.</p>
        <Link href="/" className="mt-6 inline-block text-sm text-teal font-medium hover:underline">
          Go to Contentech
        </Link>
      </InvitePage_Shell>
    );
  }

  const inviterName = invitation.invitedBy.name ?? invitation.invitedBy.email;
  const isLoggedIn = !!session?.user;
  const isEmailMatch = session?.user?.email?.toLowerCase() === invitation.email.toLowerCase();

  return (
    <InvitePage_Shell>
      <div className="w-14 h-14 rounded-2xl bg-navy/10 flex items-center justify-center mx-auto mb-4">
        <Building2 className="w-7 h-7 text-navy" />
      </div>

      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
        You&apos;re invited
      </p>
      <h1 className="text-xl font-bold text-navy mb-1">
        Join {invitation.department.name}
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        <strong>{inviterName}</strong> invited you to join the{" "}
        <strong>{invitation.department.name}</strong> department at{" "}
        <strong>{invitation.organization.name}</strong>.
      </p>

      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-6 text-sm space-y-2 text-left">
        <Row label="Organization" value={invitation.organization.name} />
        <Row label="Department" value={invitation.department.name} />
        <Row label="Your Role" value={invitation.role === "MANAGER" ? "Manager" : "Member"} />
        <Row label="Invited email" value={invitation.email} />
        {(invitation.canAccessTM || invitation.canAccessGlossary) && (
          <div className="flex justify-between pt-1">
            <span className="text-gray-500">Access</span>
            <div className="flex gap-1.5">
              {invitation.canAccessTM && (
                <span className="text-[10px] bg-teal/10 text-teal px-2 py-0.5 rounded-full font-semibold">TM</span>
              )}
              {invitation.canAccessGlossary && (
                <span className="text-[10px] bg-gold/10 text-gold px-2 py-0.5 rounded-full font-semibold">Glossary</span>
              )}
            </div>
          </div>
        )}
      </div>

      {isLoggedIn ? (
        isEmailMatch ? (
          <InviteAcceptButton token={token} />
        ) : (
          <div className="space-y-3">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-700">
              This invitation was sent to <strong>{invitation.email}</strong> but you are logged in as{" "}
              <strong>{session.user.email}</strong>. Please log in with the correct account.
            </div>
            <Link
              href={`/login?callbackUrl=/invite/${token}`}
              className="block text-center text-sm bg-navy text-white font-semibold py-2.5 rounded-xl hover:bg-navy/90 transition-colors"
            >
              Switch Account
            </Link>
          </div>
        )
      ) : (
        <div className="space-y-3">
          <Link
            href={`/login?callbackUrl=/invite/${token}`}
            className="block text-center text-sm bg-[#FF7A59] text-white font-semibold py-2.5 rounded-xl hover:opacity-90 transition-opacity"
          >
            Log in to Accept
          </Link>
          <Link
            href={`/register?email=${encodeURIComponent(invitation.email)}&callbackUrl=/invite/${token}`}
            className="block text-center text-sm border border-gray-200 text-navy font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Create Account &amp; Accept
          </Link>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-5">
        Expires {invitation.expiresAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
      </p>
    </InvitePage_Shell>
  );
}

function InvitePage_Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F5F8FA] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
        <Link href="/" className="inline-block mb-6">
          <span className="block text-2xl font-bold tracking-tight mx-auto" style={{ color: "#33475B" }}>Contentech</span>
        </Link>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium text-navy">{value}</span>
    </div>
  );
}
