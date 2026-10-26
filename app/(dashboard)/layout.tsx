import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardSidebar from "@/components/dashboard/sidebar";
import DashboardTopBar from "@/components/dashboard/topbar";
import ImpersonationBanner from "@/components/admin/impersonation-banner";
import { getOrgFeatureFlags } from "@/lib/plan-features";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const locale = cookieStore.get("contentech_lang")?.value ?? "en";

  const orgId = (session.user as any).organizationId;
  const org = orgId
    ? await prisma.organization.findUnique({ where: { id: orgId }, select: { plan: true } })
    : null;
  const orgPlan = org?.plan ?? "STARTER";
  const featureFlags = await getOrgFeatureFlags(orgPlan);

  return (
    <div className="flex h-screen bg-[#F5F8FA] overflow-hidden">
      <DashboardSidebar user={session.user} orgPlan={orgPlan} featureFlags={featureFlags} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ImpersonationBanner />
        <DashboardTopBar locale={locale} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
