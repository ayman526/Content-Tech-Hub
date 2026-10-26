"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HandCoins } from "lucide-react";

type Props = {
  orgId: string;
  orgName: string;
  currentBalance: number;
};

export default function TopUpButton({ orgId, orgName, currentBalance }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [type, setType] = useState<"BONUS" | "REFUND">("BONUS");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const reset = () => {
    setAmount("");
    setType("BONUS");
    setNote("");
    setError(null);
    setSuccessMsg(null);
  };

  const close = () => {
    if (submitting) return;
    setOpen(false);
    reset();
  };

  async function handleSubmit() {
    setError(null);
    setSuccessMsg(null);
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed === 0) {
      setError("Enter a non-zero amount.");
      return;
    }
    if (!Number.isInteger(parsed)) {
      setError("Amount must be a whole number of credits.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/orgs/${orgId}/topup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsed, type, note: note.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Top-up failed");
        return;
      }
      setSuccessMsg(
        `New balance: ${Number(data.newBalance ?? 0).toLocaleString()} credits.`,
      );
      router.refresh();
      setTimeout(() => {
        setOpen(false);
        reset();
      }, 900);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border border-[#CBD6E2] hover:bg-[#F5F8FA] transition-colors"
        style={{ color: "#0091AE" }}
        data-testid={`button-topup-${orgId}`}
      >
        <HandCoins className="w-3 h-3" />
        Top up
      </button>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Top up credits — {orgName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-sm" style={{ color: "#516F90" }}>
              Current balance:{" "}
              <span className="font-semibold" style={{ color: "#33475B" }}>
                {currentBalance.toLocaleString()} credits
              </span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="topup-amount">Amount (credits)</Label>
              <Input
                id="topup-amount"
                type="number"
                inputMode="numeric"
                step={1}
                placeholder="e.g. 1000 (use a negative number to debit)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                data-testid="input-topup-amount"
              />
              <p className="text-[11px]" style={{ color: "#99ACC2" }}>
                Positive numbers add credits; negative numbers debit (cannot
                push the balance below zero).
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="topup-type">Ledger type</Label>
              <select
                id="topup-type"
                value={type}
                onChange={(e) => setType(e.target.value as "BONUS" | "REFUND")}
                className="w-full h-9 px-3 rounded-md border border-[#CBD6E2] text-sm bg-white"
                data-testid="select-topup-type"
              >
                <option value="BONUS">Bonus / Manual grant</option>
                <option value="REFUND">Refund</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="topup-note">Note (optional)</Label>
              <Input
                id="topup-note"
                placeholder="Reason or reference"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                data-testid="input-topup-note"
              />
            </div>
            {error && (
              <p
                className="text-xs px-3 py-2 rounded-md bg-red-50 border border-red-200 text-red-700"
                data-testid="text-topup-error"
              >
                {error}
              </p>
            )}
            {successMsg && (
              <p
                className="text-xs px-3 py-2 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700"
                data-testid="text-topup-success"
              >
                {successMsg}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={close}
              disabled={submitting}
              data-testid="button-topup-cancel"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !amount}
              data-testid="button-topup-submit"
              style={{ background: "#FF7A59" }}
            >
              {submitting ? "Applying…" : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
