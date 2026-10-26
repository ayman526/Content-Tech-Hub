import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardSidebar from "@/components/dashboard/sidebar";
import DashboardTopBar from "@/components/dashboard/topbar";
import ImpersonationBanner from "@/components/admin/impersonation-banner";
import { isSubscribed } from "@/lib/studio";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) redirect("/login");

  const role = (session.user as any).role;
  if (role !== "LINGUIST" && role !== "ADMIN") redirect("/dashboard");

  const cookieStore = await cookies();
  const locale = cookieStore.get("contentech_lang")?.value ?? "en";

  let studioSubscribed = false;
  try {
    const ws = await prisma.studioWorkspace.findUnique({
      where: { linguistId: session.user.id! },
    });
    studioSubscribed = ws ? isSubscribed(ws) : false;
  } catch { /* workspace not yet created */ }

  return (
    <div className="flex h-screen bg-[#F5F8FA] overflow-hidden">
      <DashboardSidebar user={{ ...session.user, studioSubscribed }} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ImpersonationBanner />
        <DashboardTopBar locale={locale} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
