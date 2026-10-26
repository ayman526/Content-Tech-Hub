"use client";

import { Button } from "@/components/ui/button";
import { Zap, Plus, ExternalLink } from "lucide-react";

export function PlanUpgradeButton({
  planSlug,
  label,
  variant = "primary",
}: {
  planSlug: string;
  label: string;
  variant?: "primary" | "outline";
}) {
  return (
    <div className="flex flex-col gap-1">
      <Button
        size="sm"
        className="gap-2 opacity-60 cursor-not-allowed"
        disabled
        data-testid={`btn-upgrade-${planSlug}`}
        style={
          variant === "primary"
            ? { background: "#FF7A59", color: "#fff", border: "none" }
            : {}
        }
        variant={variant === "outline" ? "outline" : "default"}
      >
        <Zap className="w-4 h-4" />
        {label}
      </Button>
      <p className="text-xs" style={{ color: "#99ACC2" }}>
        Online checkout coming soon — <a href="/contact-sales" className="underline" style={{ color: "#0091AE" }}>contact us</a> to upgrade
      </p>
    </div>
  );
}

export function BuyCreditsButton({
  packageId,
  isPopular,
}: {
  packageId: string;
  isPopular: boolean;
}) {
  return (
    <Button
      className="w-full opacity-60 cursor-not-allowed"
      size="sm"
      disabled
      data-testid={`btn-buy-pkg-${packageId}`}
      style={{
        background: isPopular ? "#FF7A59" : "#33475B",
        color: "#fff",
        border: "none",
      }}
      title="Online checkout coming soon"
    >
      <Plus className="w-3.5 h-3.5 mr-1.5" />
      Coming soon
    </Button>
  );
}

export function ManageBillingButton() {
  return (
    <Button
      size="sm"
      variant="outline"
      disabled
      data-testid="btn-manage-billing"
      className="gap-2 opacity-60 cursor-not-allowed"
      title="Billing portal coming soon"
    >
      <ExternalLink className="w-4 h-4" />
      Manage Billing
    </Button>
  );
}
