import { CheckCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function BillingSuccessPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
        style={{ background: "#E6F7F5" }}
      >
        <CheckCircle className="w-8 h-8" style={{ color: "#00BDA5" }} />
      </div>
      <h1 className="text-2xl font-bold mb-2" style={{ color: "#33475B" }}>
        Payment Successful
      </h1>
      <p className="text-sm mb-8 max-w-sm" style={{ color: "#516F90" }}>
        Your purchase is confirmed. Credits and plan changes are applied to your account
        immediately — you&apos;re all set.
      </p>
      <Link href="/dashboard/billing">
        <Button style={{ background: "#33475B", color: "#fff", border: "none" }}>
          Back to Billing
        </Button>
      </Link>
    </div>
  );
}
