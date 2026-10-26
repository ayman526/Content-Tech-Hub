import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import LlmConfigPage from "@/components/admin/ai-config/LlmConfigPage";

export const metadata = { title: "LLM Routing & AI Configuration | Contentech Admin" };
export const dynamic = "force-dynamic";

export default async function AiConfigPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") redirect("/dashboard");
  return <LlmConfigPage />;
}
