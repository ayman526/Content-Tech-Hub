import { prisma } from "@/lib/prisma";

export type StudioWorkspaceFull = Awaited<ReturnType<typeof getOrCreateWorkspace>>;

/** Get or auto-create the workspace for a linguist */
export async function getOrCreateWorkspace(linguistId: string) {
  let ws = await prisma.studioWorkspace.findUnique({ where: { linguistId } });
  if (!ws) {
    ws = await prisma.studioWorkspace.create({
      data: { linguistId, subscriptionStatus: "INACTIVE" },
    });
  }
  return ws;
}

/** Returns true when workspace has an active subscription */
export function isSubscribed(ws: { subscriptionStatus: string; subscriptionExpiresAt: Date | null }) {
  if (ws.subscriptionStatus !== "ACTIVE") return false;
  if (ws.subscriptionExpiresAt && ws.subscriptionExpiresAt < new Date()) return false;
  return true;
}

export async function logActivity(workspaceId: string, action: string, details?: object) {
  await prisma.studioActivityLog.create({ data: { workspaceId, action, details } });
}
