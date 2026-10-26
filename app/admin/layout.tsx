import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import DashboardSidebar from "@/components/dashboard/sidebar";
import DashboardTopBar from "@/components/dashboard/topbar";
import ImpersonationBanner from "@/components/admin/impersonation-banner";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as any).role !== "ADMIN") redirect("/dashboard");

  const cookieStore = await cookies();
  const locale = cookieStore.get("contentech_lang")?.value ?? "en";

  return (
    <div className="flex h-screen bg-[#F5F8FA] overflow-hidden">
      <DashboardSidebar user={session.user} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ImpersonationBanner />
        <DashboardTopBar locale={locale} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
