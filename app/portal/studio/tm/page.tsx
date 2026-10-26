"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, BookOpen, Trash2, ChevronDown, ChevronUp } from "lucide-react";
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

interface TmEntry {
  source: string;
  target: string;
}

interface Tm {
  id: string;
  name: string;
  sourceLang: string;
  targetLang: string;
  entries: TmEntry[];
  createdAt: string;
}

function CreateTmDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", sourceLang: "en", targetLang: "ar" });

  const mutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/studio/tm", { ...form, entries: [] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/studio/tm"] });
      toast({ title: "Translation memory created" });
      onClose();
      setForm({ name: "", sourceLang: "en", targetLang: "ar" });
    },
    onError: () => toast({ title: "Error", description: "Could not create TM.", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>New Translation Memory</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Name <span className="text-red-500">*</span></Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Marketing TM EN-AR"
              data-testid="input-tm-name"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(["sourceLang", "targetLang"] as const).map((key) => (
              <div key={key}>
                <Label className="text-xs font-semibold mb-1.5 block">
                  {key === "sourceLang" ? "Source" : "Target"}
                </Label>
                <Select value={form[key]} onValueChange={(v) => setForm({ ...form, [key]: v })}>
                  <SelectTrigger data-testid={`select-tm-${key}`}>
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
            data-testid="btn-create-tm"
          >
            {mutation.isPending ? "Creating..." : "Create TM"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TmCard({ tm }: { tm: Tm }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [newEntry, setNewEntry] = useState({ source: "", target: "" });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/studio/tm/${tm.id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/studio/tm"] });
      toast({ title: "TM deleted" });
    },
  });

  const addEntryMutation = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", `/api/studio/tm/${tm.id}`, {
        entries: [...tm.entries, newEntry],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/studio/tm"] });
      setNewEntry({ source: "", target: "" });
      toast({ title: "Entry added" });
    },
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100" data-testid={`tm-card-${tm.id}`}>
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="font-semibold text-[#33475B]">{tm.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {tm.sourceLang} → {tm.targetLang} · {tm.entries.length} entries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            onClick={() => setExpanded(!expanded)}
            data-testid={`btn-tm-expand-${tm.id}`}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-red-400 hover:text-red-600"
            onClick={() => deleteMutation.mutate()}
            data-testid={`btn-tm-delete-${tm.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-50 px-5 py-4 space-y-3">
          {tm.entries.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {tm.entries.map((e, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-50 rounded-lg px-3 py-2 text-gray-600">{e.source}</div>
                  <div className="bg-[#F0FAFB] rounded-lg px-3 py-2 text-[#33475B]">{e.target}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">No entries yet.</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder={`Source (${tm.sourceLang})`}
              value={newEntry.source}
              onChange={(e) => setNewEntry({ ...newEntry, source: e.target.value })}
              className="text-xs h-8"
              data-testid={`input-tm-source-${tm.id}`}
            />
            <Input
              placeholder={`Target (${tm.targetLang})`}
              value={newEntry.target}
              onChange={(e) => setNewEntry({ ...newEntry, target: e.target.value })}
              className="text-xs h-8"
              data-testid={`input-tm-target-${tm.id}`}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7"
            onClick={() => addEntryMutation.mutate()}
            disabled={!newEntry.source.trim() || !newEntry.target.trim() || addEntryMutation.isPending}
            data-testid={`btn-tm-add-entry-${tm.id}`}
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Entry
          </Button>
        </div>
      )}
    </div>
  );
}

export default function StudioTmPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: tms = [], isLoading } = useQuery<Tm[]>({
    queryKey: ["/api/studio/tm"],
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#33475B]">Translation Memory</h1>
          <p className="text-sm text-gray-400 mt-0.5">Reuse previously approved translations</p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 text-white"
          style={{ background: "#FF7A59" }}
          onClick={() => setDialogOpen(true)}
          data-testid="btn-new-tm"
        >
          <Plus className="w-4 h-4" />
          New TM
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
        </div>
      ) : tms.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 text-sm">No translation memories yet.</p>
          <Button
            className="mt-4 text-white"
            style={{ background: "#FF7A59" }}
            onClick={() => setDialogOpen(true)}
            data-testid="btn-new-tm-empty"
          >
            Create your first TM
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {tms.map((tm) => <TmCard key={tm.id} tm={tm} />)}
        </div>
      )}

      <CreateTmDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
