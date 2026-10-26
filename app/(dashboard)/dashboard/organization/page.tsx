import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Building2, Users, CreditCard, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";
import BusinessContextCard from "./BusinessContextCard";

export const dynamic = "force-dynamic";

// Role enum: { CLIENT, LINGUIST, ADMIN }. CLIENT = the org's owner/customer; ADMIN = platform admin.
const ORG_EDIT_ROLES = new Set(["CLIENT", "ADMIN"]);

const PLAN_LABEL: Record<string, string> = {
  STARTER: "Starter",
  PROFESSIONAL: "Professional",
  ENTERPRISE: "Enterprise",
};

const PLAN_COLOR: Record<string, string> = {
  STARTER: "bg-gray-100 text-gray-600",
  PROFESSIONAL: "bg-teal/10 text-teal",
  ENTERPRISE: "bg-gold/10 text-gold",
};

export default async function OrganizationGeneralPage() {
  const session = await auth();
  const orgId = (session!.user as any).organizationId;
  const userRole = (session!.user as any).role as string;
  if (!orgId) redirect("/dashboard");

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      _count: { select: { users: true, projects: true, departments: true } },
    },
  });
  if (!org) redirect("/dashboard");

  const canEditBizContext = ORG_EDIT_ROLES.has(userRole);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">Organization</h1>
        <p className="text-sm text-gray-500 mt-1">General information about your organization.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-navy/10 flex items-center justify-center">
              <Building2 className="w-7 h-7 text-navy" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-navy">{org.name}</h2>
              <p className="text-sm text-gray-400 font-mono mt-0.5">{org.slug}</p>
            </div>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-semibold ${PLAN_COLOR[org.plan]}`}>
            {PLAN_LABEL[org.plan]}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            icon={<Users className="w-4 h-4 text-teal" />}
            label="Members"
            value={org._count.users}
          />
          <StatCard
            icon={<Building2 className="w-4 h-4 text-navy" />}
            label="Departments"
            value={org._count.departments}
          />
          <StatCard
            icon={<CreditCard className="w-4 h-4 text-gold" />}
            label="Credits"
            value={org.creditBalance.toLocaleString()}
          />
          <StatCard
            icon={<Calendar className="w-4 h-4 text-gray-400" />}
            label="Since"
            value={formatDate(org.createdAt)}
            small
          />
        </div>
      </div>

      <BusinessContextCard
        canEdit={canEditBizContext}
        initial={{
          websiteUrl: org.websiteUrl ?? "",
          industry: org.industry ?? "",
          companyBio: org.companyBio ?? "",
        }}
      />

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">Details</h3>
        <div className="space-y-3 text-sm">
          <Row label="Organization Name" value={org.name} />
          <Row label="Slug / Identifier" value={org.slug} mono />
          <Row label="Plan" value={PLAN_LABEL[org.plan]} />
          <Row label="Credit Balance" value={`${org.creditBalance.toLocaleString()} credits`} />
          <Row label="Total Members" value={`${org._count.users} users`} />
          <Row label="Total Projects" value={`${org._count.projects} projects`} />
          <Row label="Created" value={formatDate(org.createdAt)} />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  small,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  small?: boolean;
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        {icon}
        {label}
      </div>
      <p className={`font-bold text-navy ${small ? "text-sm" : "text-xl"}`}>{value}</p>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium text-navy ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}
