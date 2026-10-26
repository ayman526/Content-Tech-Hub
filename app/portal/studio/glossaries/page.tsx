"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Layers, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LANGUAGE_OPTIONS } from "@/lib/languages";

interface GlossaryTerm {
  source: string;
  target: string;
  note?: string;
}

interface Glossary {
  id: string;
  name: string;
  sourceLang: string;
  targetLang: string;
  terms: GlossaryTerm[];
  createdAt: string;
}

function CreateGlossaryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", sourceLang: "en", targetLang: "ar" });

  const mutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/studio/glossaries", { ...form, terms: [] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/studio/glossaries"] });
      toast({ title: "Glossary created" });
      onClose();
      setForm({ name: "", sourceLang: "en", targetLang: "ar" });
    },
    onError: () => toast({ title: "Error", description: "Could not create glossary.", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>New Glossary</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Name <span className="text-red-500">*</span></Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Legal Terms EN-AR"
              data-testid="input-glossary-name"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(["sourceLang", "targetLang"] as const).map((key) => (
              <div key={key}>
                <Label className="text-xs font-semibold mb-1.5 block">
                  {key === "sourceLang" ? "Source" : "Target"}
                </Label>
                <Select value={form[key]} onValueChange={(v) => setForm({ ...form, [key]: v })}>
                  <SelectTrigger data-testid={`select-glossary-${key}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((l) => (
                      <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button
            className="text-white"
            style={{ background: "#FF7A59" }}
            onClick={() => mutation.mutate()}
            disabled={!form.name.trim() || mutation.isPending}
            data-testid="btn-create-glossary"
          >
            {mutation.isPending ? "Creating..." : "Create Glossary"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GlossaryCard({ glossary }: { glossary: Glossary }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [newTerm, setNewTerm] = useState({ source: "", target: "", note: "" });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/studio/glossaries/${glossary.id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/studio/glossaries"] });
      toast({ title: "Glossary deleted" });
    },
  });

  const addTermMutation = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", `/api/studio/glossaries/${glossary.id}`, {
        terms: [...glossary.terms, { source: newTerm.source, target: newTerm.target, note: newTerm.note || undefined }],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/studio/glossaries"] });
      setNewTerm({ source: "", target: "", note: "" });
      toast({ title: "Term added" });
    },
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100" data-testid={`glossary-card-${glossary.id}`}>
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="font-semibold text-[#33475B]">{glossary.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {glossary.sourceLang} → {glossary.targetLang} · {glossary.terms.length} terms
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            onClick={() => setExpanded(!expanded)}
            data-testid={`btn-glossary-expand-${glossary.id}`}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-red-400 hover:text-red-600"
            onClick={() => deleteMutation.mutate()}
            data-testid={`btn-glossary-delete-${glossary.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-50 px-5 py-4 space-y-3">
          {glossary.terms.length > 0 ? (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              <div className="grid grid-cols-[1fr_1fr_1.5fr] gap-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 px-1">
                <span>Source</span><span>Target</span><span>Note</span>
              </div>
              {glossary.terms.map((t, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1.5fr] gap-2 text-xs">
                  <div className="bg-gray-50 rounded-lg px-2 py-1.5 text-gray-600">{t.source}</div>
                  <div className="bg-[#F0FAFB] rounded-lg px-2 py-1.5 text-[#33475B]">{t.target}</div>
                  <div className="bg-gray-50 rounded-lg px-2 py-1.5 text-gray-400">{t.note ?? "—"}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">No terms yet.</p>
          )}
          <div className="grid grid-cols-[1fr_1fr_1.5fr] gap-2">
            <Input
              placeholder="Source term"
              value={newTerm.source}
              onChange={(e) => setNewTerm({ ...newTerm, source: e.target.value })}
              className="text-xs h-8"
              data-testid={`input-glossary-source-${glossary.id}`}
            />
            <Input
              placeholder="Translation"
              value={newTerm.target}
              onChange={(e) => setNewTerm({ ...newTerm, target: e.target.value })}
              className="text-xs h-8"
              data-testid={`input-glossary-target-${glossary.id}`}
            />
            <Input
              placeholder="Note (optional)"
              value={newTerm.note}
              onChange={(e) => setNewTerm({ ...newTerm, note: e.target.value })}
              className="text-xs h-8"
              data-testid={`input-glossary-note-${glossary.id}`}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7"
            onClick={() => addTermMutation.mutate()}
            disabled={!newTerm.source.trim() || !newTerm.target.trim() || addTermMutation.isPending}
            data-testid={`btn-glossary-add-term-${glossary.id}`}
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Term
          </Button>
        </div>
      )}
    </div>
  );
}

export default function StudioGlossariesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: glossaries = [], isLoading } = useQuery<Glossary[]>({
    queryKey: ["/api/studio/glossaries"],
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#33475B]">Glossaries</h1>
          <p className="text-sm text-gray-400 mt-0.5">Define and enforce terminology across all jobs</p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 text-white"
          style={{ background: "#FF7A59" }}
          onClick={() => setDialogOpen(true)}
          data-testid="btn-new-glossary"
        >
          <Plus className="w-4 h-4" />
          New Glossary
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
        </div>
      ) : glossaries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Layers className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 text-sm">No glossaries yet.</p>
          <Button
            className="mt-4 text-white"
            style={{ background: "#FF7A59" }}
            onClick={() => setDialogOpen(true)}
            data-testid="btn-new-glossary-empty"
          >
            Create your first glossary
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {glossaries.map((g) => <GlossaryCard key={g.id} glossary={g} />)}
        </div>
      )}

      <CreateGlossaryDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
