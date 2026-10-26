"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Library, Plus, Upload, Trash2, ChevronDown, ChevronRight, PenLine, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tooltip, InfoNote } from "@/components/ui/info-tip";

type ClientAccount = { id: string; name: string };

type GlossaryTerm = {
  id: string;
  term: string;
  translations: Record<string, string>;
  definition: string | null;
  doNotTranslate: boolean;
  keepUppercase: boolean;
};

type Glossary = {
  id: string;
  name: string;
  languages: string[];
  termCount: number;
  updatedAt: string;
  terms: GlossaryTerm[];
  clientAccountId: string | null;
  clientAccount: ClientAccount | null;
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const EMPTY_TERM = {
  term: "",
  translation: "",
  definition: "",
  notes: "",
  doNotTranslate: false,
  keepUppercase: false,
};

function Toggle({
  checked,
  onChange,
  label,
  description,
  testId,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
  testId?: string;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${
        checked ? "border-[#0091AE] bg-[#E8F5F8]" : "border-[#CBD6E2] bg-white hover:bg-[#F5F8FA]"
      }`}
      onClick={() => onChange(!checked)}
      data-testid={testId}
    >
      <div className={`mt-0.5 w-9 h-5 rounded-full flex-shrink-0 relative transition-colors ${checked ? "bg-[#0091AE]" : "bg-[#CBD6E2]"}`}>
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : ""}`}
        />
      </div>
      <div>
        <p className="text-sm font-semibold leading-none" style={{ color: "#33475B" }}>{label}</p>
        <p className="text-xs mt-1" style={{ color: "#516F90" }}>{description}</p>
      </div>
    </div>
  );
}

export default function GlossaryPage() {
  const [glossaries, setGlossaries] = useState<Glossary[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientAccounts, setClientAccounts] = useState<ClientAccount[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createClientAccountId, setCreateClientAccountId] = useState("");
  const [creating, setCreating] = useState(false);

  const [importTarget, setImportTarget] = useState<Glossary | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [addTermTarget, setAddTermTarget] = useState<Glossary | null>(null);
  const [termForm, setTermForm] = useState(EMPTY_TERM);
  const [addingTerm, setAddingTerm] = useState(false);
  const [addTermError, setAddTermError] = useState<string | null>(null);
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingTermId, setDeletingTermId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [glossRes, acctRes] = await Promise.all([
      fetch("/api/glossary"),
      fetch("/api/client-accounts"),
    ]);
    if (glossRes.ok) setGlossaries(await glossRes.json());
    if (acctRes.ok) setClientAccounts(await acctRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!createName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/glossary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: createName,
        ...(createClientAccountId ? { clientAccountId: createClientAccountId } : {}),
      }),
    });
    if (res.ok) {
      setShowCreate(false);
      setCreateName("");
      setCreateClientAccountId("");
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
    const res = await fetch(`/api/glossary/${importTarget.id}/import`, { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) {
      setImportResult(`Successfully imported ${data.imported} terms.`);
      await load();
    } else {
      setImportResult(`Error: ${data.error}`);
    }
    setImporting(false);
  }

  async function handleAddTerm() {
    if (!addTermTarget) return;
    if (!termForm.term.trim()) return;
    if (!termForm.doNotTranslate && !termForm.translation.trim()) return;
    setAddingTerm(true);
    setAddTermError(null);
    setLastAdded(null);
    const res = await fetch(`/api/glossary/${addTermTarget.id}/terms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(termForm),
    });
    const data = await res.json();
    if (res.ok) {
      setLastAdded(termForm.term);
      setTermForm(EMPTY_TERM);
      await load();
    } else {
      setAddTermError(data.error ?? "Failed to add term");
    }
    setAddingTerm(false);
  }

  async function handleDeleteTerm(glossaryId: string, termId: string) {
    setDeletingTermId(termId);
    await fetch(`/api/glossary/${glossaryId}/terms?termId=${termId}`, { method: "DELETE" });
    await load();
    setDeletingTermId(null);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch(`/api/glossary/${id}`, { method: "DELETE" });
    await load();
    setDeletingId(null);
  }

  function toggleExpand(id: string) {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
  }

  function openImport(g: Glossary) {
    setImportTarget(g);
    setImportResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function openAddTerm(g: Glossary) {
    setAddTermTarget(g);
    setTermForm(EMPTY_TERM);
    setAddTermError(null);
    setLastAdded(null);
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#33475B" }}>Glossaries</h1>
          <p className="text-sm mt-0.5" style={{ color: "#516F90" }}>
            Define key terms to ensure consistent, correct terminology across all translations
          </p>
        </div>
        <Button
          data-testid="btn-create-glossary"
          className="gap-2"
          style={{ background: "#FF7A59" }}
          onClick={() => setShowCreate(true)}
        >
          <Plus className="w-4 h-4" /> New Glossary
        </Button>
      </div>

      <InfoNote className="mb-6">
        <strong>How Glossaries Work:</strong> Terms you add here are injected directly into the AI translator's instructions for every matching job. You can require a specific translation, mark a term as <strong>Do Not Translate (DNT)</strong> so it is kept verbatim in every language, or force the output into <strong>UPPERCASE</strong>. Import an existing CSV or Excel file (two columns: source term, translation) to load hundreds of terms at once. Assign a glossary to a specific client account to scope it to their jobs, or leave it shared to apply it across all clients.
      </InfoNote>

      {loading ? (
        <div className="text-center py-16 text-sm" style={{ color: "#99ACC2" }}>Loading…</div>
      ) : glossaries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#CBD6E2] p-16 text-center">
          <Library className="w-14 h-14 mx-auto mb-4" style={{ color: "#CBD6E2" }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: "#33475B" }}>No glossaries yet</h3>
          <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: "#516F90" }}>
            Create a glossary to define product names, technical terms, and brand language that must never be mistranslated.
          </p>
          <Button variant="outline" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" /> Create First Glossary
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {glossaries.map((g) => (
            <div key={g.id} className="bg-white rounded-2xl border border-[#CBD6E2] overflow-hidden" data-testid={`glossary-${g.id}`}>
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 text-left" onClick={() => toggleExpand(g.id)}>
                    {expanded[g.id]
                      ? <ChevronDown className="w-4 h-4" style={{ color: "#99ACC2" }} />
                      : <ChevronRight className="w-4 h-4" style={{ color: "#99ACC2" }} />
                    }
                    <div>
                      <div className="font-semibold text-sm" style={{ color: "#33475B" }}>{g.name}</div>
                      <div className="text-xs" style={{ color: "#99ACC2" }}>
                        {g.termCount} {g.termCount === 1 ? "term" : "terms"} · Updated {formatDate(g.updatedAt)}
                      </div>
                    </div>
                  </button>
                  {g.clientAccount ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E8F5F8] text-[#0091AE]">
                      {g.clientAccount.name}
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F5F8FA] text-[#99ACC2]">
                      Shared
                    </span>
                  )}
                  {g.languages.map((l) => (
                    <Badge key={l} variant="outline" className="text-[10px]">{l}</Badge>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" data-testid={`btn-add-term-${g.id}`} onClick={() => openAddTerm(g)}>
                    <PenLine className="w-3 h-3" /> Add Term
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" data-testid={`btn-import-glossary-${g.id}`} onClick={() => openImport(g)}>
                    <Upload className="w-3 h-3" /> Import
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 h-7 w-7 p-0"
                    data-testid={`btn-delete-glossary-${g.id}`}
                    onClick={() => handleDelete(g.id)}
                    disabled={deletingId === g.id}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {expanded[g.id] && (
                <div className="border-t border-[#F5F8FA] overflow-x-auto">
                  {g.terms.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-xs mb-3" style={{ color: "#99ACC2" }}>No terms yet</p>
                      <div className="flex items-center justify-center gap-2">
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" onClick={() => openAddTerm(g)}>
                          <PenLine className="w-3 h-3" /> Add Term
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" onClick={() => openImport(g)}>
                          <Upload className="w-3 h-3" /> Import CSV / Excel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <table className="w-full text-xs">
                        <thead>
                          <tr style={{ background: "#F5F8FA" }}>
                            <th className="text-left px-5 py-2.5 font-semibold" style={{ color: "#516F90" }}>Source Term</th>
                            <th className="text-left px-5 py-2.5 font-semibold" style={{ color: "#516F90" }}>Translation</th>
                            <th className="text-left px-5 py-2.5 font-semibold" style={{ color: "#516F90" }}>Definition</th>
                            <th className="text-left px-5 py-2.5 font-semibold" style={{ color: "#516F90" }}>Flags</th>
                            <th className="px-5 py-2.5 w-8" />
                          </tr>
                        </thead>
                        <tbody>
                          {g.terms.slice(0, 50).map((t) => (
                            <tr key={t.id} className="border-t border-[#F5F8FA] hover:bg-[#F5F8FA]" data-testid={`term-${t.id}`}>
                              <td className="px-5 py-2.5 font-medium" style={{ color: "#33475B" }}>{t.term}</td>
                              <td className="px-5 py-2.5" style={{ color: "#516F90" }}>
                                {t.doNotTranslate
                                  ? <span style={{ color: "#99ACC2" }}>—</span>
                                  : Object.values(t.translations).join(", ")
                                }
                              </td>
                              <td className="px-5 py-2.5" style={{ color: "#99ACC2" }}>{t.definition ?? "—"}</td>
                              <td className="px-5 py-2.5">
                                <div className="flex flex-wrap gap-1">
                                  {t.doNotTranslate && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">DNT</span>
                                  )}
                                  {t.keepUppercase && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">UPPER</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                <button
                                  className="opacity-40 hover:opacity-100 transition-opacity"
                                  data-testid={`btn-delete-term-${t.id}`}
                                  onClick={() => handleDeleteTerm(g.id, t.id)}
                                  disabled={deletingTermId === t.id}
                                >
                                  {deletingTermId === t.id
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#99ACC2" }} />
                                    : <X className="w-3.5 h-3.5 text-red-400" />
                                  }
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {g.terms.length > 50 && (
                        <p className="text-xs text-center py-2" style={{ color: "#99ACC2" }}>
                          Showing 50 of {g.termCount} terms
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Create Glossary Dialog ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Glossary</DialogTitle></DialogHeader>
          <div className="py-2 space-y-3">
            <div className="space-y-1.5">
              <Label>Glossary Name</Label>
              <Input
                data-testid="input-glossary-name"
                placeholder="e.g. Legal Terminology, Product Names"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            {clientAccounts.length > 0 && (
              <div className="space-y-1.5">
                <Label>
                  Client Account <span className="text-[#99ACC2] font-normal">(optional)</span>
                  <Tooltip text="Assigning a glossary to a client account restricts it to jobs for that client only. Leave blank to share this glossary across all clients." />
                </Label>
                <div className="relative">
                  <select
                    data-testid="select-glossary-client"
                    className="w-full px-3 py-2 text-sm border border-[#CBD6E2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0091AE]/30 appearance-none bg-white"
                    value={createClientAccountId}
                    onChange={(e) => setCreateClientAccountId(e.target.value)}
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
              data-testid="btn-confirm-create-glossary"
              onClick={handleCreate}
              disabled={creating || !createName.trim()}
              style={{ background: "#FF7A59" }}
            >
              {creating ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Manual Add Term Dialog ── */}
      <Dialog open={!!addTermTarget} onOpenChange={(o) => { if (!o) setAddTermTarget(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Term to "{addTermTarget?.name}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">

            {/* Source + Translation */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold" style={{ color: "#33475B" }}>
                  Source Term <span className="text-red-400">*</span>
                </Label>
                <Input
                  data-testid="input-term-source"
                  placeholder="e.g. Force Majeure"
                  value={termForm.term}
                  onChange={(e) => setTermForm((p) => ({ ...p, term: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold" style={{ color: "#33475B" }}>
                  Translation
                  {!termForm.doNotTranslate && <span className="text-red-400 ml-0.5">*</span>}
                  {termForm.doNotTranslate && <span className="ml-1 font-normal text-[#99ACC2]">(not required)</span>}
                </Label>
                <Input
                  data-testid="input-term-translation"
                  placeholder={termForm.doNotTranslate ? "N/A — kept as-is" : "e.g. القوة القاهرة"}
                  value={termForm.translation}
                  disabled={termForm.doNotTranslate}
                  onChange={(e) => setTermForm((p) => ({ ...p, translation: e.target.value }))}
                  className={termForm.doNotTranslate ? "opacity-50 cursor-not-allowed" : ""}
                />
              </div>
            </div>

            {/* Behaviour toggles */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-1" style={{ color: "#33475B" }}>
                Behaviour
                <Tooltip text="Flags control how the AI handles this term. DNT tells the AI to leave the word unchanged in every language. UPPER forces the translated output to ALL CAPS — useful for product codes, acronyms, and legal identifiers." />
              </Label>
              <Toggle
                checked={termForm.doNotTranslate}
                onChange={(v) => setTermForm((p) => ({ ...p, doNotTranslate: v, translation: v ? "" : p.translation }))}
                label="Do Not Translate"
                description="Keep this term exactly as written — never translate it."
                testId="toggle-do-not-translate"
              />
              <Toggle
                checked={termForm.keepUppercase}
                onChange={(v) => setTermForm((p) => ({ ...p, keepUppercase: v }))}
                label="Keep in Uppercase"
                description="Always render the translated term in UPPERCASE letters."
                testId="toggle-keep-uppercase"
              />
            </div>

            {/* Optional fields */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold" style={{ color: "#33475B" }}>
                Definition <span className="text-[#99ACC2] font-normal">(optional)</span>
              </Label>
              <Input
                data-testid="input-term-definition"
                placeholder="Brief explanation of the term"
                value={termForm.definition}
                onChange={(e) => setTermForm((p) => ({ ...p, definition: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold" style={{ color: "#33475B" }}>
                Notes <span className="text-[#99ACC2] font-normal">(optional)</span>
              </Label>
              <Input
                data-testid="input-term-notes"
                placeholder="Usage notes or context"
                value={termForm.notes}
                onChange={(e) => setTermForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>

            {lastAdded && (
              <p className="text-sm font-medium text-center text-teal-600">
                "{lastAdded}" added — enter another or click Done.
              </p>
            )}
            {addTermError && (
              <p className="text-sm text-red-500 font-medium">{addTermError}</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddTermTarget(null)}>Done</Button>
            <Button
              data-testid="btn-confirm-add-term"
              onClick={handleAddTerm}
              disabled={
                addingTerm ||
                !termForm.term.trim() ||
                (!termForm.doNotTranslate && !termForm.translation.trim())
              }
              style={{ background: "#FF7A59" }}
              className="gap-2"
            >
              {addingTerm
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding…</>
                : <><Plus className="w-4 h-4" /> Add Term</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Import CSV / Excel Dialog ── */}
      <Dialog open={!!importTarget} onOpenChange={(o) => { if (!o) setImportTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Terms into "{importTarget?.name}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm" style={{ color: "#516F90" }}>
              Upload a <strong>CSV</strong> or <strong>Excel (.xlsx)</strong> file with columns:
              <code className="bg-gray-100 px-1 rounded text-xs ml-1">term, translation, definition, notes</code>.
              Only <em>term</em> and <em>translation</em> are required.
            </p>
            <div
              className="border-2 border-dashed border-[#CBD6E2] rounded-xl p-8 text-center cursor-pointer hover:border-[#FF7A59] transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: "#99ACC2" }} />
              <p className="text-sm font-medium" style={{ color: "#33475B" }}>Click to select file</p>
              <p className="text-xs mt-1" style={{ color: "#99ACC2" }}>Supported: .csv, .xlsx — up to 5MB</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.tsv,.txt,.xlsx,.xls"
                className="hidden"
                data-testid="input-glossary-file"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); }}
              />
            </div>
            {importing && (
              <p className="text-sm text-center flex items-center justify-center gap-2" style={{ color: "#0091AE" }}>
                <Loader2 className="w-4 h-4 animate-spin" /> Importing…
              </p>
            )}
            {importResult && (
              <div className="flex flex-col items-center gap-3">
                <p className={`text-sm text-center font-medium ${importResult.startsWith("Error") ? "text-red-500" : "text-teal-600"}`}>
                  {importResult}
                </p>
                {!importResult.startsWith("Error") && (
                  <Button onClick={() => setImportTarget(null)}>Done</Button>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportTarget(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
