"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { BookOpen, Plus, Upload, Trash2, Database, X, ChevronDown, ChevronRight } from "lucide-react";
import { Tooltip } from "@/components/ui/info-tip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

type ClientAccount = { id: string; name: string };

type TM = {
  id: string;
  name: string;
  sourceLanguage: string;
  targetLanguage: string;
  entryCount: number;
  updatedAt: string;
  clientAccountId: string | null;
  clientAccount: ClientAccount | null;
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function ClientBadge({ clientAccount }: { clientAccount: ClientAccount | null }) {
  if (clientAccount) {
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E8F5F8] text-[#0091AE]">
        {clientAccount.name}
      </span>
    );
  }
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F5F8FA] text-[#99ACC2]">
      Shared
    </span>
  );
}

export default function MemoryPage() {
  const [memories, setMemories] = useState<TM[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientAccounts, setClientAccounts] = useState<ClientAccount[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", sourceLanguage: "", targetLanguage: "", clientAccountId: "" });
  const [creating, setCreating] = useState(false);

  const [importTarget, setImportTarget] = useState<TM | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [memRes, acctRes] = await Promise.all([
      fetch("/api/tm"),
      fetch("/api/client-accounts"),
    ]);
    if (memRes.ok) setMemories(await memRes.json());
    if (acctRes.ok) setClientAccounts(await acctRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!createForm.name || !createForm.sourceLanguage || !createForm.targetLanguage) return;
    setCreating(true);
    const res = await fetch("/api/tm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: createForm.name,
        sourceLanguage: createForm.sourceLanguage,
        targetLanguage: createForm.targetLanguage,
        ...(createForm.clientAccountId ? { clientAccountId: createForm.clientAccountId } : {}),
      }),
    });
    if (res.ok) {
      setShowCreate(false);
      setCreateForm({ name: "", sourceLanguage: "", targetLanguage: "", clientAccountId: "" });
      await load();
    }
    setCreating(false);
  }

  async function handleImport(file: File) {
    if (!importTarget) return;
    setImporting(true);
    setImportResult(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/tm/${importTarget.id}/import`, { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) {
      setImportResult(`Successfully imported ${data.imported} entries.`);
      await load();
    } else {
      setImportResult(`Error: ${data.error}`);
    }
    setImporting(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch(`/api/tm/${id}`, { method: "DELETE" });
    await load();
    setDeletingId(null);
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#33475B" }}>Translation Memory</h1>
          <p className="text-sm mt-0.5" style={{ color: "#516F90" }}>
            Reuse previously approved translations to ensure consistency and reduce costs
          </p>
        </div>
        <Button
          data-testid="btn-create-tm"
          className="gap-2"
          style={{ background: "#FF7A59" }}
          onClick={() => setShowCreate(true)}
        >
          <Plus className="w-4 h-4" /> New TM
        </Button>
      </div>

      <div className="rounded-xl border border-[#CBD6E2] bg-[#F5F8FA] px-5 py-4 mb-6 flex gap-3">
        <Database className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#0091AE" }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: "#33475B" }}>How Translation Memory Works</p>
          <p className="text-sm mt-0.5" style={{ color: "#516F90" }}>
            When AI translates your content, it first checks your TM for matching segments — reusing approved translations verbatim. Import existing TM files in <strong>TMX</strong> or <strong>CSV</strong> format. Tag a TM to a specific client to keep assets organized.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-sm" style={{ color: "#99ACC2" }}>Loading…</div>
      ) : memories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#CBD6E2] p-16 text-center">
          <BookOpen className="w-14 h-14 mx-auto mb-4" style={{ color: "#CBD6E2" }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: "#33475B" }}>No Translation Memories yet</h3>
          <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: "#516F90" }}>
            Create a TM and import a TMX or CSV file to start leveraging your existing translations.
          </p>
          <Button variant="outline" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" /> Create First TM
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#CBD6E2] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F5F8FA]" style={{ background: "#F5F8FA" }}>
                <th className="text-left py-3 px-5 text-xs font-semibold" style={{ color: "#516F90" }}>Name</th>
                <th className="text-left py-3 px-5 text-xs font-semibold" style={{ color: "#516F90" }}>Client</th>
                <th className="text-left py-3 px-5 text-xs font-semibold" style={{ color: "#516F90" }}>Language Pair</th>
                <th className="text-left py-3 px-5 text-xs font-semibold" style={{ color: "#516F90" }}>Entries</th>
                <th className="text-left py-3 px-5 text-xs font-semibold" style={{ color: "#516F90" }}>Updated</th>
                <th className="text-left py-3 px-5 text-xs font-semibold" style={{ color: "#516F90" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {memories.map((tm) => (
                <tr key={tm.id} className="border-b border-[#F5F8FA] hover:bg-[#F5F8FA] transition-colors" data-testid={`tm-${tm.id}`}>
                  <td className="py-3.5 px-5 font-medium" style={{ color: "#33475B" }}>{tm.name}</td>
                  <td className="py-3.5 px-5">
                    <ClientBadge clientAccount={tm.clientAccount} />
                  </td>
                  <td className="py-3.5 px-5" style={{ color: "#516F90" }}>{tm.sourceLanguage} → {tm.targetLanguage}</td>
                  <td className="py-3.5 px-5 font-semibold" style={{ color: "#0091AE" }}>{tm.entryCount.toLocaleString()}</td>
                  <td className="py-3.5 px-5 text-xs" style={{ color: "#99ACC2" }}>{formatDate(tm.updatedAt)}</td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs h-7"
                        data-testid={`btn-import-tm-${tm.id}`}
                        onClick={() => { setImportTarget(tm); setImportResult(null); }}
                      >
                        <Upload className="w-3 h-3" /> Import
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 h-7 w-7 p-0"
                        data-testid={`btn-delete-tm-${tm.id}`}
                        onClick={() => handleDelete(tm.id)}
                        disabled={deletingId === tm.id}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create TM Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Translation Memory</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                data-testid="input-tm-name"
                placeholder="e.g. Product Docs EN→AR"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  Source Language
                  <Tooltip text="The language of the original content. Use a consistent name across all your TMs, e.g. 'English', 'French'. The AI will match jobs with the same source language against this TM." />
                </Label>
                <Input
                  data-testid="input-tm-source"
                  placeholder="e.g. English"
                  value={createForm.sourceLanguage}
                  onChange={(e) => setCreateForm((f) => ({ ...f, sourceLanguage: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  Target Language
                  <Tooltip text="The language of the translated segments stored in this TM. A TM is always language-pair specific — create separate TMs for each pair you translate into." />
                </Label>
                <Input
                  data-testid="input-tm-target"
                  placeholder="e.g. Arabic"
                  value={createForm.targetLanguage}
                  onChange={(e) => setCreateForm((f) => ({ ...f, targetLanguage: e.target.value }))}
                />
              </div>
            </div>
            {clientAccounts.length > 0 && (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  Client Account <span className="text-[#99ACC2] font-normal">(optional)</span>
                  <Tooltip text="Scopes this TM to a single client. When assigned, the AI will only use these translations for jobs belonging to that client. Leave blank to share across all clients." />
                </Label>
                <div className="relative">
                  <select
                    data-testid="select-tm-client"
                    className="w-full px-3 py-2 text-sm border border-[#CBD6E2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0091AE]/30 appearance-none bg-white"
                    value={createForm.clientAccountId}
                    onChange={(e) => setCreateForm((f) => ({ ...f, clientAccountId: e.target.value }))}
                  >
                    <option value="">Shared (all clients)</option>
                    {clientAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "#99ACC2" }} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              data-testid="btn-confirm-create-tm"
              onClick={handleCreate}
              disabled={creating || !createForm.name || !createForm.sourceLanguage || !createForm.targetLanguage}
              style={{ background: "#FF7A59" }}
            >
              {creating ? "Creating…" : "Create TM"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={!!importTarget} onOpenChange={(o) => { if (!o) setImportTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import into "{importTarget?.name}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm" style={{ color: "#516F90" }}>
              Upload a <strong>TMX</strong>, <strong>CSV</strong>, or <strong>Excel (.xlsx)</strong> file.
              For CSV/Excel: two columns — <em>source text</em> and <em>target text</em>.
            </p>
            <div
              className="border-2 border-dashed border-[#CBD6E2] rounded-xl p-8 text-center cursor-pointer hover:border-[#0091AE] transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: "#99ACC2" }} />
              <p className="text-sm font-medium" style={{ color: "#33475B" }}>Click to select file</p>
              <p className="text-xs mt-1" style={{ color: "#99ACC2" }}>Supported: .tmx, .csv, .xlsx — up to 10MB</p>
              <input
                ref={fileRef}
                type="file"
                accept=".tmx,.csv,.txt,.tsv,.xlsx,.xls"
                className="hidden"
                data-testid="input-tm-file"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); }}
              />
            </div>
            {importing && <p className="text-sm text-center" style={{ color: "#0091AE" }}>Importing…</p>}
            {importResult && (
              <div className="flex flex-col items-center gap-3">
                <p className={`text-sm text-center font-medium ${importResult.startsWith("Error") ? "text-red-500" : "text-teal-600"}`}>
                  {importResult}
                </p>
                {!importResult.startsWith("Error") && (
                  <Button onClick={() => setImportTarget(null)}>Finish</Button>
                )}
              </div>
            )}
          </div>
          {(!importResult || importResult.startsWith("Error")) && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setImportTarget(null)}>Close</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
