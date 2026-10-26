import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function EditorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role;
  if (role !== "LINGUIST" && role !== "ADMIN") redirect("/dashboard");
  return <div className="h-screen overflow-hidden bg-[#FAFBFC]">{children}</div>;
}
