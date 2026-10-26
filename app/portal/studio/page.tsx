import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { isSubscribed } from "@/lib/studio";
import StudioPromoClient from "./promo-client";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const ws = await prisma.studioWorkspace.findUnique({
    where: { linguistId: session.user.id! },
  });

  if (ws && isSubscribed(ws)) {
    redirect("/portal/studio/overview");
  }

  return <StudioPromoClient />;
}
