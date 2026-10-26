"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Building2, MoreHorizontal, Pencil, Archive, Mail, User } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: string;
  name: string;
  contactName?: string;
  contactEmail?: string;
  companyName?: string;
  notes?: string;
  status: string;
  createdAt: string;
}

function ClientFormDialog({
  open,
  onClose,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  existing?: Client | null;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: existing?.name ?? "",
    contactName: existing?.contactName ?? "",
    contactEmail: existing?.contactEmail ?? "",
    companyName: existing?.companyName ?? "",
    notes: existing?.notes ?? "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      existing
        ? apiRequest("PATCH", `/api/studio/clients/${existing.id}`, form)
        : apiRequest("POST", "/api/studio/clients", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/studio/clients"] });
      toast({ title: existing ? "Client updated" : "Client created" });
      onClose();
    },
    onError: () => toast({ title: "Error", description: "Could not save client.", variant: "destructive" }),
  });

  const disabled = !form.name.trim() || mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Client" : "New Client"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {[
            { key: "name", label: "Client Name", required: true },
            { key: "companyName", label: "Company" },
            { key: "contactName", label: "Contact Person" },
            { key: "contactEmail", label: "Contact Email" },
          ].map(({ key, label, required }) => (
            <div key={key}>
              <Label className="text-xs font-semibold mb-1.5 block">
                {label} {required && <span className="text-red-500">*</span>}
              </Label>
              <Input
                value={(form as any)[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                data-testid={`input-client-${key}`}
              />
            </div>
          ))}
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Notes</Label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0091AE]"
              data-testid="input-client-notes"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            className="text-white"
            style={{ background: "#FF7A59" }}
            onClick={() => mutation.mutate()}
            disabled={disabled}
            data-testid="btn-save-client"
          >
            {mutation.isPending ? "Saving..." : "Save Client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function StudioClientsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/api/studio/clients"],
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("PATCH", `/api/studio/clients/${id}`, { status: "ARCHIVED" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/studio/clients"] });
      toast({ title: "Client archived" });
    },
  });

  const visible = clients.filter((c) =>
    showArchived ? c.status === "ARCHIVED" : c.status !== "ARCHIVED"
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#33475B]">Clients</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage your translation clients</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => setShowArchived(!showArchived)}
            data-testid="btn-toggle-archived"
          >
            {showArchived ? "Active clients" : "Archived"}
          </Button>
          <Button
            size="sm"
            className="gap-1.5 text-white"
            style={{ background: "#FF7A59" }}
            onClick={() => { setEditing(null); setDialogOpen(true); }}
            data-testid="btn-new-client"
          >
            <Plus className="w-4 h-4" />
            New Client
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Building2 className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 text-sm">
            {showArchived ? "No archived clients." : "No clients yet. Create your first client to get started."}
          </p>
          {!showArchived && (
            <Button
              className="mt-4 text-white"
              style={{ background: "#FF7A59" }}
              onClick={() => { setEditing(null); setDialogOpen(true); }}
              data-testid="btn-new-client-empty"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Client
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {visible.map((client) => (
            <div
              key={client.id}
              className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-shadow"
              data-testid={`client-card-${client.id}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white"
                    style={{ background: "#0091AE" }}>
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-[#33475B]">{client.name}</p>
                    {client.companyName && <p className="text-xs text-gray-400">{client.companyName}</p>}
                  </div>
                </div>
                {client.status !== "ARCHIVED" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="w-8 h-8" data-testid={`btn-client-menu-${client.id}`}>
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditing(client); setDialogOpen(true); }}>
                        <Pencil className="w-3.5 h-3.5 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-500"
                        onClick={() => archiveMutation.mutate(client.id)}
                      >
                        <Archive className="w-3.5 h-3.5 mr-2" />
                        Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <div className="mt-3 space-y-1">
                {client.contactName && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <User className="w-3.5 h-3.5 text-gray-300" />
                    {client.contactName}
                  </div>
                )}
                {client.contactEmail && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Mail className="w-3.5 h-3.5 text-gray-300" />
                    {client.contactEmail}
                  </div>
                )}
                {client.notes && (
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">{client.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ClientFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        existing={editing}
      />
    </div>
  );
}
