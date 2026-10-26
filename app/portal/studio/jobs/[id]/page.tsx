"use client";

import { useState, useRef } from "react";
import { use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Upload, Wand2, Pencil, FileText, ArrowLeft, Loader2, MoreHorizontal, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface Segment {
  id: string;
  segmentIndex: number;
  sourceText: string;
  translatedText?: string;
  isDraft: boolean;
}

interface JobFile {
  id: string;
  originalFilename: string;
  wordCount: number;
  aiDraftGenerated: boolean;
  translations: Segment[];
}

interface Job {
  id: string;
  title: string;
  sourceLanguage: string;
  targetLanguage: string;
  translationMethod: string;
  status: string;
  deadline?: string;
  notes?: string;
  createdAt: string;
  client?: { id: string; name: string };
  files: JobFile[];
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-500",
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

const STATUSES = ["DRAFT", "IN_PROGRESS", "REVIEW", "DELIVERED", "CANCELLED"];

export default function StudioJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [generatingDraft, setGeneratingDraft] = useState(false);

  const { data: job, isLoading } = useQuery<Job>({
    queryKey: ["/api/studio/jobs", id],
    queryFn: () => fetch(`/api/studio/jobs/${id}`).then((r) => r.json()),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      apiRequest("PATCH", `/api/studio/jobs/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/studio/jobs", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/studio/jobs"] });
      toast({ title: "Status updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/studio/jobs/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/studio/jobs"] });
      router.push("/portal/studio/jobs");
      toast({ title: "Job archived" });
    },
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/studio/jobs/${id}/upload`, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/studio/jobs", id] });
      toast({ title: "File uploaded", description: "Segments extracted successfully." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleGenerateDraft() {
    setGeneratingDraft(true);
    try {
      const res = await fetch(`/api/studio/jobs/${id}/draft`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Draft generation failed");
      queryClient.invalidateQueries({ queryKey: ["/api/studio/jobs", id] });
      toast({ title: "AI draft generated", description: `${data.segmentsGenerated} segments translated.` });
    } catch (err: any) {
      toast({ title: "Draft failed", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingDraft(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-6 text-center text-gray-400">
        <p>Job not found.</p>
        <Link href="/portal/studio/jobs" className="text-sm underline mt-2 block" style={{ color: "#0091AE" }}>
          Back to Jobs
        </Link>
      </div>
    );
  }

  const totalSegments = job.files.reduce((s, f) => s + f.translations.length, 0);
  const translatedSegments = job.files.reduce(
    (s, f) => s + f.translations.filter((t) => t.translatedText).length,
    0
  );
  const progress = totalSegments > 0 ? Math.round((translatedSegments / totalSegments) * 100) : 0;
  const canAiDraft = job.translationMethod !== "FULLY_HUMAN" && job.translationMethod !== "HUMAN_ONLY" && job.files.length > 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/portal/studio/jobs" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[#33475B]">{job.title}</h1>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_COLORS[job.status] ?? "bg-gray-100"}`}>
              {job.status.replace("_", " ")}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-0.5">
            {job.sourceLanguage} → {job.targetLanguage}
            {job.client ? ` · ${job.client.name}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={job.status} onValueChange={(v) => statusMutation.mutate(v)}>
            <SelectTrigger className="w-36 h-8 text-xs" data-testid="select-job-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="btn-job-menu">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-red-500"
                onClick={() => deleteMutation.mutate()}
                data-testid="btn-delete-job"
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" />
                Archive job
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Progress bar */}
      {totalSegments > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#33475B]">Translation Progress</span>
            <span className="text-sm font-bold" style={{ color: "#0091AE" }}>{progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="h-2 rounded-full transition-all" style={{ width: `${progress}%`, background: "#0091AE" }} />
          </div>
          <p className="text-xs text-gray-400 mt-2">{translatedSegments} / {totalSegments} segments translated</p>
        </div>
      )}

      {/* Files */}
      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-[#33475B]">Source Files</h2>
          <div className="flex gap-2">
            {canAiDraft && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={handleGenerateDraft}
                disabled={generatingDraft}
                data-testid="btn-generate-draft"
              >
                {generatingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" style={{ color: "#FF7A59" }} />}
                {generatingDraft ? "Generating..." : "Generate AI Draft"}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              data-testid="btn-upload-file"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {uploading ? "Uploading..." : "Upload File"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.docx,.pdf,.xliff,.xlf,.tmx,.po"
              className="hidden"
              onChange={handleUpload}
            />
          </div>
        </div>

        {job.files.length === 0 ? (
          <div className="p-10 text-center">
            <FileText className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p className="text-gray-400 text-sm">No files uploaded yet.</p>
            <Button
              className="mt-4 gap-1.5 text-white text-sm"
              style={{ background: "#0091AE" }}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              data-testid="btn-upload-first-file"
            >
              <Upload className="w-4 h-4" />
              Upload a file
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {job.files.map((file) => {
              const fileTranslated = file.translations.filter((t) => t.translatedText).length;
              const segCount = file.translations.length;
              const filePct = segCount > 0 ? Math.round((fileTranslated / segCount) * 100) : 0;
              return (
                <li key={file.id} className="flex items-center justify-between px-6 py-4" data-testid={`file-row-${file.id}`}>
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-[#33475B]">{file.originalFilename}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {segCount} segments · {file.wordCount} words · {filePct}% translated
                        {file.aiDraftGenerated && (
                          <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                            style={{ background: "#FF7A5920", color: "#FF7A59" }}>
                            AI Draft
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/portal/studio/jobs/${id}/edit?fileId=${file.id}`}
                    className="text-xs font-semibold flex items-center gap-1 hover:underline"
                    style={{ color: "#0091AE" }}
                    data-testid={`btn-edit-file-${file.id}`}
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Job details */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-[#33475B] mb-4">Job Details</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {[
            { label: "Method", value: METHOD_LABELS[job.translationMethod] ?? job.translationMethod },
            { label: "Deadline", value: job.deadline ? new Date(job.deadline).toLocaleDateString() : "—" },
            { label: "Created", value: new Date(job.createdAt).toLocaleDateString() },
            { label: "Client", value: job.client?.name ?? "—" },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs text-gray-400 font-medium">{label}</dt>
              <dd className="text-[#33475B] font-medium mt-0.5">{value}</dd>
            </div>
          ))}
        </dl>
        {job.notes && (
          <div className="mt-4 pt-4 border-t border-gray-50">
            <p className="text-xs text-gray-400 font-medium mb-1">Notes</p>
            <p className="text-sm text-gray-600">{job.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
