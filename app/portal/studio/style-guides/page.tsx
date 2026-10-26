"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, FileText, Trash2, Pencil, Save } from "lucide-react";
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
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface StyleGuide {
  id: string;
  name: string;
  content: string;
  createdAt: string;
}

function CreateGuideDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", content: "" });

  const mutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/studio/style-guides", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/studio/style-guides"] });
      toast({ title: "Style guide created" });
      onClose();
      setForm({ name: "", content: "" });
    },
    onError: () => toast({ title: "Error", description: "Could not create style guide.", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Style Guide</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Name <span className="text-red-500">*</span></Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Marketing copy style guide"
              data-testid="input-guide-name"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Content</Label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={8}
              placeholder="Write your style guide rules here — tone, formatting, avoid/prefer lists..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0091AE] font-mono"
              data-testid="textarea-guide-content"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button
            className="text-white"
            style={{ background: "#FF7A59" }}
            onClick={() => mutation.mutate()}
            disabled={!form.name.trim() || mutation.isPending}
            data-testid="btn-create-guide"
          >
            {mutation.isPending ? "Creating..." : "Create Style Guide"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StyleGuideCard({ guide }: { guide: StyleGuide }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(guide.content);

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/studio/style-guides/${guide.id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/studio/style-guides"] });
      toast({ title: "Style guide deleted" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/studio/style-guides/${guide.id}`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/studio/style-guides"] });
      setEditing(false);
      toast({ title: "Style guide updated" });
    },
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5" data-testid={`guide-card-${guide.id}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#33475B15" }}>
            <FileText className="w-4 h-4" style={{ color: "#33475B" }} />
          </div>
          <p className="font-semibold text-[#33475B]">{guide.name}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {editing ? (
            <Button
              size="sm"
              className="h-7 text-xs gap-1 text-white"
              style={{ background: "#0091AE" }}
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              data-testid={`btn-save-guide-${guide.id}`}
            >
              <Save className="w-3 h-3" />
              Save
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1"
              onClick={() => setEditing(true)}
              data-testid={`btn-edit-guide-${guide.id}`}
            >
              <Pencil className="w-3 h-3" />
              Edit
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-red-400 hover:text-red-600"
            onClick={() => deleteMutation.mutate()}
            data-testid={`btn-delete-guide-${guide.id}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      {editing ? (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          className="w-full border border-[#0091AE] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none font-mono"
          data-testid={`textarea-edit-guide-${guide.id}`}
        />
      ) : (
        <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans leading-relaxed max-h-48 overflow-y-auto">
          {guide.content || <span className="text-gray-300 italic">No content yet. Click Edit to add.</span>}
        </pre>
      )}
    </div>
  );
}

export default function StudioStyleGuidesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: guides = [], isLoading } = useQuery<StyleGuide[]>({
    queryKey: ["/api/studio/style-guides"],
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#33475B]">Style Guides</h1>
          <p className="text-sm text-gray-400 mt-0.5">Tone, formatting, and writing rules for your jobs</p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 text-white"
          style={{ background: "#FF7A59" }}
          onClick={() => setDialogOpen(true)}
          data-testid="btn-new-guide"
        >
          <Plus className="w-4 h-4" />
          New Style Guide
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
        </div>
      ) : guides.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <FileText className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 text-sm">No style guides yet.</p>
          <Button
            className="mt-4 text-white"
            style={{ background: "#FF7A59" }}
            onClick={() => setDialogOpen(true)}
            data-testid="btn-new-guide-empty"
          >
            Create your first style guide
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {guides.map((g) => <StyleGuideCard key={g.id} guide={g} />)}
        </div>
      )}

      <CreateGuideDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
