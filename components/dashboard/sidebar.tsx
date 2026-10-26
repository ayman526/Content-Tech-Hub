"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FolderOpen,
  MessageSquarePlus,
  Users,
  BookOpen,
  Library,
  CreditCard,
  Bell,
  Settings,
  LogOut,
  ChevronRight,
  ChevronDown,
  Briefcase,
  BarChart3,
  ShieldCheck,
  UserCheck,
  Building2,
  Users2,
  Package,
  FileText,
  Gauge,
  Banknote,
  Plug,
  Code2,
  Layers,
  Cpu,
  Wand2,
  Lock,
  BarChart2,
  GlobeIcon,
  ScanText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/client";

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
    studioSubscribed?: boolean;
  };
  orgPlan?: string;
  featureFlags?: Record<string, boolean>;
}

type NavItem = {
  href: string;
  icon: any;
  label: string;
  accent?: boolean;
  exact?: boolean;
  locked?: boolean;
};

type NavSection = {
  sectionLabel?: string;
  items: NavItem[];
};

export default function DashboardSidebar({ user, orgPlan = "STARTER", featureFlags = {} }: SidebarProps) {
  const pathname = usePathname();
  const role = (user as any)?.role ?? "CLIENT";
  const { t } = useTranslation();
  // Feature flag check — falls back to legacy plan-based logic if flags not loaded yet
  const canAccessClients = featureFlags["clients_tab"] ??
    (orgPlan === "AGENCY" || orgPlan === "ENTERPRISE");
  const canAccessOcr = featureFlags["ocr_requests"] ??
    (orgPlan !== "STARTER");

  const CLIENT_NAV_SECTIONS: NavSection[] = [
    {
      sectionLabel: "Workspace",
      items: [
        { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", exact: true },
        { href: "/dashboard/wizard", icon: MessageSquarePlus, label: "New Order", accent: true },
        { href: "/dashboard/projects", icon: FolderOpen, label: "Projects" },
      ],
    },
    {
      sectionLabel: "Organization",
      items: [
        { href: "/dashboard/organization", icon: Building2, label: "General", exact: true },
        { href: "/dashboard/clients", icon: Layers, label: "Clients", locked: !canAccessClients },
        { href: "/dashboard/organization/members", icon: Users, label: "Members" },
        { href: "/dashboard/organization/teams", icon: Users2, label: "Teams" },
        { href: "/dashboard/organization/linguists", icon: Users, label: "Linguists" },
      ],
    },
    {
      sectionLabel: "Brand Assets",
      items: [
        { href: "/dashboard/memory", icon: BookOpen, label: "Translation Memory" },
        { href: "/dashboard/glossary", icon: Library, label: "Glossaries" },
        { href: "/dashboard/style-guides", icon: FileText, label: "Style Guides" },
        { href: "/dashboard/ocr-requests", icon: ScanText, label: "OCR Requests", locked: !canAccessOcr },
      ],
    },
    {
      sectionLabel: "Integrations & API",
      items: [
        { href: "/dashboard/integrations", icon: Plug, label: "All Integrations", exact: true },
        { href: "/dashboard/developer", icon: Code2, label: "Developer SDK" },
      ],
    },
    {
      sectionLabel: "Account",
      items: [
        { href: "/dashboard/billing", icon: CreditCard, label: "Billing" },
        { href: "/dashboard/notifications", icon: Bell, label: "Notifications" },
        { href: "/dashboard/settings", icon: Settings, label: "Settings" },
      ],
    },
  ];

  function sectionContainsActive(section: NavSection): boolean {
    return section.items.some((item) =>
      item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/")
    );
  }

  const initialOpen = (): Set<string> => {
    const open = new Set<string>(["Workspace"]);
    for (const section of CLIENT_NAV_SECTIONS) {
      if (section.sectionLabel && sectionContainsActive(section)) {
        open.add(section.sectionLabel);
      }
    }
    return open;
  };

  const [openSections, setOpenSections] = useState<Set<string>>(initialOpen);

  useEffect(() => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      for (const section of CLIENT_NAV_SECTIONS) {
        if (section.sectionLabel && sectionContainsActive(section)) {
          next.add(section.sectionLabel);
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function toggleSection(label: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }

  const LINGUIST_NAV: NavItem[] = [
    { href: "/portal", icon: LayoutDashboard, label: t("portal.sidebar.dashboard"), exact: true },
    { href: "/portal/jobs", icon: Briefcase, label: t("portal.sidebar.jobFeed") },
    { href: "/portal/assignments", icon: FolderOpen, label: t("portal.sidebar.assignments") },
    { href: "/portal/earnings", icon: CreditCard, label: t("portal.sidebar.earnings") },
    { href: "/portal/profile", icon: UserCheck, label: t("portal.sidebar.profile") },
    { href: "/portal/notifications", icon: Bell, label: t("portal.sidebar.notifications") },
  ];

  const studioSubscribed = !!(user as any).studioSubscribed;

  const STUDIO_SUB_ITEMS: { href: string; icon: any; label: string }[] = [
    { href: "/portal/studio/overview", icon: LayoutDashboard, label: "Overview" },
    { href: "/portal/studio/clients", icon: Building2, label: "Clients" },
    { href: "/portal/studio/jobs", icon: Briefcase, label: "Jobs" },
    { href: "/portal/studio/assets", icon: Library, label: "Assets" },
    { href: "/portal/studio/tm", icon: BookOpen, label: "Content Memory" },
    { href: "/portal/studio/glossaries", icon: Layers, label: "Glossaries" },
    { href: "/portal/studio/style-guides", icon: FileText, label: "Style Guides" },
  ];

  const ADMIN_NAV: NavItem[] = [
    { href: "/admin", icon: BarChart3, label: "Analytics", exact: true },
    { href: "/admin/users", icon: Users, label: "Users" },
    { href: "/admin/linguists", icon: UserCheck, label: "Linguists" },
    { href: "/admin/routing", icon: ShieldCheck, label: "Routing Monitor" },
    { href: "/admin/ai-config", icon: Cpu, label: "AI Configuration" },
    { href: "/admin/notifications", icon: Bell, label: "Notifications" },
    { href: "/admin/finance", icon: CreditCard, label: "Finance" },
    { href: "/admin/plans", icon: Package, label: "Plans" },
    { href: "/admin/credit-packages", icon: Gauge, label: "Credit Packages" },
    { href: "/admin/credit-rates", icon: BarChart3, label: "Credit Rates" },
    { href: "/admin/linguist-rates", icon: Banknote, label: "Reviewer Rates" },
    { href: "/admin/llm-usage", icon: BarChart2, label: "LLM Usage" },
    { href: "/admin/content", icon: FileText, label: "Site Content" },
    { href: "/admin/resources", icon: BookOpen, label: "Resources CMS" },
    { href: "/admin/settings", icon: Settings, label: "Settings" },
  ];

  const portalLabel =
    role === "ADMIN"
      ? "Admin Panel"
      : role === "LINGUIST"
      ? t("portal.sidebar.linguistPortal")
      : "Client Portal";

  function isActive(item: NavItem): boolean {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  function renderItem(item: NavItem) {
    const active = isActive(item);

    if (item.locked) {
      return (
        <li key={item.href}>
          <Link
            href={item.href}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-gray-300 cursor-pointer hover:bg-gray-50 transition-all"
            data-testid={`nav-${item.href.split("/").pop()}-locked`}
          >
            <item.icon className="w-4 h-4 flex-shrink-0 text-gray-300" />
            <span>{item.label}</span>
            <Lock className="w-3 h-3 ms-auto text-gray-300" />
          </Link>
        </li>
      );
    }

    return (
      <li key={item.href}>
        <Link
          href={item.href}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all group",
            active
              ? "bg-navy text-white"
              : item.accent
              ? "bg-teal/10 text-teal hover:bg-teal/20"
              : "text-gray-600 hover:bg-gray-100 hover:text-navy"
          )}
          data-testid={`nav-${item.href.split("/").pop()}`}
        >
          <item.icon
            className={cn(
              "w-4 h-4 flex-shrink-0",
              active && "text-white",
              item.accent && !active && "text-teal"
            )}
          />
          <span>{item.label}</span>
          {item.accent && !active && (
            <ChevronRight className="w-3 h-3 ms-auto text-teal" />
          )}
        </Link>
      </li>
    );
  }

  function renderFlatItems(items: NavItem[]) {
    return (
      <ul className="space-y-0.5">
        {items.map(renderItem)}
      </ul>
    );
  }

  const studioOpen = pathname.startsWith("/portal/studio");

  if (role === "LINGUIST") {
    return (
      <SidebarShell user={user} portalLabel={portalLabel}>
        <div className="space-y-1">
          {renderFlatItems(LINGUIST_NAV)}

          {/* ── Creator Studio section ── */}
          <div className="pt-3">
            <div className="px-3 py-1.5 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#99ACC2" }}>
                Creator Studio
              </span>
            </div>

            {/* Main Studio entry — always clickable */}
            <Link
              href="/portal/studio"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                pathname === "/portal/studio" || studioOpen
                  ? "bg-navy text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-navy"
              )}
              data-testid="nav-studio"
            >
              <Wand2 className={cn("w-4 h-4 flex-shrink-0", (pathname === "/portal/studio" || studioOpen) ? "text-white" : "text-orange-500")} />
              <span className="font-semibold">Studio</span>
              {!studioSubscribed && (
                <span className="ms-auto text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: "#FF7A5920", color: "#FF7A59" }}>
                  PRO
                </span>
              )}
            </Link>

            {/* Sub-items */}
            <ul className="mt-1 space-y-0.5 ms-2">
              {STUDIO_SUB_ITEMS.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                if (studioSubscribed) {
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                          active ? "bg-navy text-white" : "text-gray-500 hover:bg-gray-100 hover:text-navy"
                        )}
                        data-testid={`nav-${item.href.split("/").pop()}`}
                      >
                        <item.icon className={cn("w-3.5 h-3.5 flex-shrink-0", active && "text-white")} />
                        {item.label}
                      </Link>
                    </li>
                  );
                }
                return (
                  <li key={item.href}>
                    <Link
                      href="/portal/studio"
                      className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 cursor-pointer hover:bg-gray-50 transition-all"
                      data-testid={`nav-studio-locked-${item.href.split("/").pop()}`}
                    >
                      <Lock className="w-3 h-3 flex-shrink-0 text-gray-300" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </SidebarShell>
    );
  }

  if (role === "ADMIN") {
    return (
      <SidebarShell user={user} portalLabel={portalLabel}>
        {renderFlatItems(ADMIN_NAV)}
      </SidebarShell>
    );
  }

  return (
    <SidebarShell user={user} portalLabel={portalLabel}>
      <div className="space-y-1">
        {CLIENT_NAV_SECTIONS.map((section) => {
          const label = section.sectionLabel ?? "";
          const isOpen = openSections.has(label);

          return (
            <div key={label}>
              {label && (
                <button
                  onClick={() => toggleSection(label)}
                  className="w-full flex items-center justify-between px-3 py-1.5 mb-0.5 rounded-lg hover:bg-gray-50 transition-colors group"
                  data-testid={`section-toggle-${label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <span
                    className="text-[10px] font-semibold uppercase tracking-widest transition-colors group-hover:text-navy"
                    style={{ color: "#99ACC2" }}
                  >
                    {label}
                  </span>
                  <ChevronDown
                    className="w-3 h-3 transition-transform duration-200 flex-shrink-0"
                    style={{ color: "#99ACC2", transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)" }}
                  />
                </button>
              )}

              <div
                className="grid transition-[grid-template-rows] duration-200 ease-in-out"
                style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <ul className="space-y-0.5 pb-1">
                    {section.items.map(renderItem)}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </SidebarShell>
  );
}

function SidebarShell({
  user,
  portalLabel,
  children,
}: {
  user: SidebarProps["user"];
  portalLabel: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <aside className="w-60 flex flex-col bg-white border-e border-gray-200 h-screen flex-shrink-0">
      <div className="px-5 py-4 border-b border-gray-100">
        <Link href="/" className="group block">
          <span className="block text-xl font-bold tracking-tight group-hover:opacity-80 transition-opacity" style={{ color: "#33475B" }}>
            Contentech
          </span>
          <p className="text-[10px] font-medium mt-0.5" style={{ color: "#99ACC2" }}>{portalLabel}</p>
        </Link>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto">
        {children}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-navy to-teal flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user.name
              ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
              : user.email?.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-navy truncate">{user.name ?? "User"}</p>
            <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-gray-400 hover:text-red-500 transition-colors"
            title={t("portal.sidebar.signOut")}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
