"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Briefcase, ArrowRight } from "lucide-react";
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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LANGUAGE_OPTIONS } from "@/lib/languages";

interface Job {
  id: string;
  title: string;
  sourceLanguage: string;
  targetLanguage: string;
  translationMethod: string;
  status: string;
  deadline?: string;
  wordCount?: number;
  createdAt: string;
  client?: { id: string; name: string };
}

interface Client {
  id: string;
  name: string;
  isArchived: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-500",
  PENDING: "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  REVIEW: "bg-yellow-50 text-yellow-700",
  DELIVERED: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-700",
  ARCHIVED: "bg-gray-50 text-gray-400",
};

const METHOD_LABELS: Record<string, string> = {
  AI_DRAFT_HUMAN_REVISION: "AI + Human",
  HUMAN_ONLY: "Human Only",
  FULLY_HUMAN: "Fully Human",
};

const STATUSES = ["ALL", "DRAFT", "IN_PROGRESS", "REVIEW", "DELIVERED", "CANCELLED"];

function CreateJobDialog({
  open,
  onClose,
  clients,
}: {
  open: boolean;
  onClose: () => void;
  clients: Client[];
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    sourceLanguage: "en",
    targetLanguage: "ar",
    translationMethod: "AI_DRAFT_HUMAN_REVISION",
    deadline: "",
    clientId: "",
    notes: "",
  });

  const mutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/studio/jobs", form),
    onSuccess: async (res) => {
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/studio/jobs"] });
      toast({ title: "Job created" });
      onClose();
      router.push(`/portal/studio/jobs/${data.id}`);
    },
    onError: () => toast({ title: "Error", description: "Could not create job.", variant: "destructive" }),
  });

  const disabled = !form.title.trim() || mutation.isPending;
  const activeClients = clients.filter((c) => !c.isArchived);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Job</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Job Name <span className="text-red-500">*</span></Label>
            <Input
              placeholder="e.g. Website homepage translation"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              data-testid="input-job-name"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Source Language</Label>
              <Select value={form.sourceLanguage} onValueChange={(v) => setForm({ ...form, sourceLanguage: v })}>
                <SelectTrigger data-testid="select-source-lang">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((l) => (
                    <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Target Language</Label>
              <Select value={form.targetLanguage} onValueChange={(v) => setForm({ ...form, targetLanguage: v })}>
                <SelectTrigger data-testid="select-target-lang">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((l) => (
                    <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Translation Method</Label>
              <Select value={form.translationMethod} onValueChange={(v) => setForm({ ...form, translationMethod: v })}>
                <SelectTrigger data-testid="select-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AI_DRAFT_HUMAN_REVISION">AI + Human Revision</SelectItem>
                  <SelectItem value="HUMAN_ONLY">Human Only</SelectItem>
                  <SelectItem value="FULLY_HUMAN">Fully Human</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Client (optional)</Label>
              <Select value={form.clientId || "none"} onValueChange={(v) => setForm({ ...form, clientId: v === "none" ? "" : v })}>
                <SelectTrigger data-testid="select-client">
                  <SelectValue placeholder="No client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No client</SelectItem>
                  {activeClients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Deadline (optional)</Label>
            <Input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              data-testid="input-job-deadline"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button
            className="text-white"
            style={{ background: "#FF7A59" }}
            onClick={() => mutation.mutate()}
            disabled={disabled}
            data-testid="btn-create-job"
          >
            {mutation.isPending ? "Creating..." : "Create Job"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function StudioJobsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data: jobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ["/api/studio/jobs"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/studio/clients"],
  });

  const filtered = statusFilter === "ALL" ? jobs : jobs.filter((j) => j.status === statusFilter);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#33475B]">Jobs</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage your translation jobs</p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 text-white"
          style={{ background: "#FF7A59" }}
          onClick={() => setDialogOpen(true)}
          data-testid="btn-new-job"
        >
          <Plus className="w-4 h-4" />
          New Job
        </Button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              statusFilter === s
                ? "text-white"
                : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
            style={statusFilter === s ? { background: "#0091AE" } : {}}
            data-testid={`filter-status-${s.toLowerCase()}`}
          >
            {s === "ALL" ? "All" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Briefcase className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 text-sm">
            {statusFilter === "ALL" ? "No jobs yet." : `No ${statusFilter.replace("_", " ")} jobs.`}
          </p>
          {statusFilter === "ALL" && (
            <Button
              className="mt-4 text-white"
              style={{ background: "#FF7A59" }}
              onClick={() => setDialogOpen(true)}
              data-testid="btn-new-job-empty"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Create your first job
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <ul className="divide-y divide-gray-50">
            {filtered.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/portal/studio/jobs/${job.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-[#F5F8FA] transition-colors group"
                  data-testid={`job-row-${job.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#FF7A5915" }}>
                      <Briefcase className="w-4 h-4" style={{ color: "#FF7A59" }} />
                    </div>
                    <div>
                      <p className="font-semibold text-[#33475B] text-sm">{job.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {job.sourceLanguage} → {job.targetLanguage}
                        {job.client ? ` · ${job.client.name}` : ""}
                        {job.deadline ? ` · Due ${new Date(job.deadline).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 hidden sm:block">{METHOD_LABELS[job.translationMethod] ?? job.translationMethod}</span>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_COLORS[job.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {job.status.replace("_", " ")}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <CreateJobDialog open={dialogOpen} onClose={() => setDialogOpen(false)} clients={clients} />
    </div>
  );
}
