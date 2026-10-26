import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Users, Star, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JoinRequestPanel } from "./join-request-panel";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const session = await auth();
  const userId = session!.user.id!;
  const orgId = (session!.user as any).organizationId;

  const [favorites, joinRequests] = await Promise.all([
    orgId
      ? prisma.favoriteLinguist.findMany({
          where: { customerId: userId, organizationId: orgId },
          include: {
            linguist: { include: { linguistProfile: true } },
          },
        })
      : Promise.resolve([]),
    orgId
      ? prisma.organizationJoinRequest.findMany({
          where: { organizationId: orgId, status: "PENDING" },
          include: {
            user: { select: { id: true, name: true, email: true, createdAt: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const serializedRequests = joinRequests.map((r) => ({
    id: r.id,
    message: r.message,
    createdAt: r.createdAt.toISOString(),
    user: {
      id: r.user.id,
      name: r.user.name,
      email: r.user.email,
      createdAt: r.user.createdAt.toISOString(),
    },
  }));

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-navy">My Linguist Team</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Your preferred linguists get first access to your jobs
          </p>
        </div>
      </div>

      {/* Join request management panel */}
      {serializedRequests.length > 0 && (
        <JoinRequestPanel requests={serializedRequests} />
      )}

      {/* Explainer */}
      <div className="bg-gold/5 border border-gold/20 rounded-2xl p-5 mb-6 flex gap-4">
        <Star className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-navy mb-1">How Preferred Linguists Work</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            Linguists you add to your team get a 60-minute exclusive window when a matching job is posted — before it&apos;s opened to the general pool. Build relationships with specialists you trust.
          </p>
        </div>
      </div>

      {favorites.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <Users className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-navy mb-2">No preferred linguists yet</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            After completing your first project, you can add high-performing linguists to your team for priority routing.
          </p>
          <Button variant="outline">Browse Linguists</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map(({ linguist, notes }: any) => (
            <div
              key={linguist.id}
              className="bg-white rounded-2xl border border-gray-200 p-5"
              data-testid={`linguist-${linguist.id}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-navy to-teal flex items-center justify-center text-white font-bold text-sm">
                  {linguist.name
                    ? linguist.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)
                    : "?"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy">{linguist.name}</p>
                  <div className="flex items-center gap-1 text-xs text-gold">
                    <Star className="w-3 h-3 fill-gold" />
                    <span>{linguist.linguistProfile?.rating?.toString() ?? "New"}</span>
                  </div>
                </div>
              </div>

              {linguist.linguistProfile?.specializations?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {linguist.linguistProfile.specializations.slice(0, 3).map((s: string) => (
                    <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {notes && <p className="text-xs text-gray-400 italic mb-3">&quot;{notes}&quot;</p>}

              <div className="text-xs text-gray-400 flex items-center gap-1">
                <Star className="w-3 h-3 text-gold fill-gold" />
                <span>{linguist.linguistProfile?.completedJobs ?? 0} jobs completed</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
