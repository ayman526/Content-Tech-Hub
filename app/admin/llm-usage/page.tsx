import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import LlmUsagePage from "@/components/admin/LlmUsagePage";

export const metadata = { title: "LLM Cost & Token Usage | Contentech Admin" };
export const dynamic = "force-dynamic";

export default async function AdminLlmUsagePage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") redirect("/dashboard");
  return <LlmUsagePage />;
}
