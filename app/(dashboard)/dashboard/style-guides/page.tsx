"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FileText, Plus, Upload, Trash2, Eye, Sparkles, Loader2, X, ChevronDown } from "lucide-react";
import { Tooltip, InfoNote } from "@/components/ui/info-tip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

type ClientAccount = { id: string; name: string };

type StyleGuide = {
  id: string;
  name: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
  clientAccountId: string | null;
  clientAccount: ClientAccount | null;
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function mimeLabel(mime: string, fileName: string) {
  const ext = fileName.split(".").pop()?.toUpperCase() ?? "";
  if (["MD", "MARKDOWN"].includes(ext)) return "Markdown";
  if (ext === "HTML") return "HTML";
  if (ext === "JSON") return "JSON";
  if (ext === "DOCX") return "Word";
  if (ext === "PDF") return "PDF";
  return ext || "Text";
}

const TONE_OPTIONS = ["Professional", "Conversational", "Technical", "Friendly", "Authoritative", "Neutral"];
const FORMALITY_OPTIONS = ["Formal", "Semi-formal", "Informal"];

export default function StyleGuidesPage() {
  const [guides, setGuides] = useState<StyleGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientAccounts, setClientAccounts] = useState<ClientAccount[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [customName, setCustomName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedClientAccountId, setSelectedClientAccountId] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // AI generator state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<string>("");
  const [aiSaving, setAiSaving] = useState(false);
  const [aiSaved, setAiSaved] = useState(false);
  const [aiClientAccountId, setAiClientAccountId] = useState("");
  const [aiForm, setAiForm] = useState({
    industry: "",
    country: "",
    servicesProducts: "",
    targetAudience: "",
    tone: "Professional",
    formality: "Semi-formal",
    languages: "",
    additionalNotes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [guidesRes, acctRes] = await Promise.all([
      fetch("/api/style-guides"),
      fetch("/api/client-accounts"),
    ]);
    if (guidesRes.ok) setGuides(await guidesRes.json());
    if (acctRes.ok) setClientAccounts(await acctRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    setUploadResult(null);
    const fd = new FormData();
    fd.append("file", selectedFile);
    if (customName.trim()) fd.append("name", customName.trim());
    if (selectedClientAccountId) fd.append("clientAccountId", selectedClientAccountId);
    const res = await fetch("/api/style-guides", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) {
      setUploadResult({ ok: true, msg: `"${data.name}" uploaded successfully.` });
      setSelectedFile(null);
      setCustomName("");
      setSelectedClientAccountId("");
      await load();
    } else {
      setUploadResult({ ok: false, msg: data.error ?? "Upload failed." });
    }
    setUploading(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch(`/api/style-guides/${id}`, { method: "DELETE" });
    await load();
    setDeletingId(null);
  }

  async function openPreview(id: string) {
    setPreviewId(id);
    setPreviewLoading(true);
    setPreviewContent("");
    const res = await fetch(`/api/style-guides/${id}`);
    if (res.ok) {
      const data = await res.json();
      setPreviewContent(data.content ?? "");
    }
    setPreviewLoading(false);
  }

  function openAiModal() {
    setAiOpen(true);
    setAiResult("");
    setAiSaved(false);
    setAiForm({
      industry: "",
      country: "",
      servicesProducts: "",
      targetAudience: "",
      tone: "Professional",
      formality: "Semi-formal",
      languages: "",
      additionalNotes: "",
    });
  }

  async function handleGenerate() {
    if (!aiForm.industry.trim()) return;
    setAiGenerating(true);
    setAiResult("");
    const res = await fetch("/api/style-guides/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(aiForm),
    });
    const data = await res.json();
    if (res.ok) {
      setAiResult(data.content ?? "");
    } else {
      setAiResult(`Error: ${data.error ?? "Generation failed"}`);
    }
    setAiGenerating(false);
  }

  async function handleSaveGenerated() {
    if (!aiResult || aiResult.startsWith("Error:")) return;
    const name = aiForm.industry.trim()
      ? `${aiForm.industry} Style Guide`
      : "AI Style Guide";
    setAiSaving(true);
    const fd = new FormData();
    fd.append("content", aiResult);
    fd.append("name", name);
    if (aiClientAccountId) fd.append("clientAccountId", aiClientAccountId);
    const res = await fetch("/api/style-guides", { method: "POST", body: fd });
    if (res.ok) {
      setAiSaved(true);
      setAiClientAccountId("");
      await load();
    }
    setAiSaving(false);
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#33475B" }}>Style Guides</h1>
          <p className="text-sm mt-0.5" style={{ color: "#516F90" }}>
            Upload writing conventions, tone guidelines, and brand voice documents that AI will follow during translation
          </p>
        </div>
        <Button
          data-testid="btn-ai-style-guide"
          onClick={openAiModal}
          className="gap-2 shrink-0"
          style={{ background: "#0091AE" }}
        >
          <Sparkles className="w-4 h-4" />
          Help me write Style Guide
        </Button>
      </div>

      {/* Upload zone */}
      <div className="bg-white rounded-2xl border border-[#CBD6E2] p-6 mb-6">
        <h2 className="text-sm font-semibold mb-4" style={{ color: "#33475B" }}>Upload Style Guide</h2>
        <div className="space-y-4">
          <div
            className="border-2 border-dashed border-[#CBD6E2] rounded-xl p-8 text-center cursor-pointer hover:border-[#0091AE] transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: "#99ACC2" }} />
            {selectedFile ? (
              <>
                <p className="text-sm font-medium" style={{ color: "#33475B" }}>{selectedFile.name}</p>
                <p className="text-xs mt-1" style={{ color: "#99ACC2" }}>
                  {(selectedFile.size / 1024).toFixed(1)} KB — click to change
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium" style={{ color: "#33475B" }}>Click to select file</p>
                <p className="text-xs mt-1" style={{ color: "#99ACC2" }}>
                  Supported: .txt, .md, .html, .json, .docx, .pdf — max 10MB
                </p>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.markdown,.html,.json,.docx,.pdf"
              className="hidden"
              data-testid="input-style-guide-file"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setSelectedFile(f);
                  setUploadResult(null);
                  if (!customName) setCustomName(f.name.replace(/\.[^.]+$/, ""));
                }
              }}
            />
          </div>

          {selectedFile && (
            <div className="space-y-3">
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">Display Name (optional)</Label>
                  <Input
                    data-testid="input-style-guide-name"
                    placeholder={selectedFile.name}
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                </div>
                <Button
                  data-testid="btn-upload-style-guide"
                  onClick={handleUpload}
                  disabled={uploading}
                  style={{ background: "#FF7A59" }}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? "Uploading…" : "Upload"}
                </Button>
              </div>
              {clientAccounts.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Client Account <span className="font-normal" style={{ color: "#99ACC2" }}>(optional)</span></Label>
                  <div className="relative">
                    <select
                      data-testid="select-upload-client"
                      className="w-full px-3 py-2 text-sm border border-[#CBD6E2] rounded-lg focus:outline-none appearance-none bg-white"
                      value={selectedClientAccountId}
                      onChange={(e) => setSelectedClientAccountId(e.target.value)}
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
          )}

          {uploadResult && (
            <p className={`text-sm font-medium text-center ${uploadResult.ok ? "text-teal-600" : "text-red-500"}`}>
              {uploadResult.msg}
            </p>
          )}
        </div>
      </div>

      {/* Guidelines note */}
      <div className="rounded-xl border border-[#CBD6E2] bg-[#F5F8FA] px-5 py-4 mb-6 flex gap-3">
        <FileText className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#0091AE" }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: "#33475B" }}>What to include in a style guide</p>
          <ul className="text-sm mt-1 space-y-0.5 list-disc list-inside" style={{ color: "#516F90" }}>
            <li>Tone and voice guidelines (formal, casual, technical)</li>
            <li>Formatting rules (date formats, units, capitalization)</li>
            <li>Brand-specific terms or phrases to preserve or avoid</li>
            <li>Cultural adaptation notes for specific target languages</li>
          </ul>
        </div>
      </div>

      {/* Guides list */}
      {loading ? (
        <div className="text-center py-10 text-sm" style={{ color: "#99ACC2" }}>Loading…</div>
      ) : guides.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#CBD6E2] p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: "#CBD6E2" }} />
          <h3 className="font-semibold mb-1" style={{ color: "#33475B" }}>No style guides yet</h3>
          <p className="text-sm mb-4" style={{ color: "#516F90" }}>Upload a file or let AI write one for you.</p>
          <Button onClick={openAiModal} className="gap-2" style={{ background: "#0091AE" }}>
            <Sparkles className="w-4 h-4" /> Help me write Style Guide
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#CBD6E2] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F5F8FA]" style={{ background: "#F5F8FA" }}>
                <th className="text-left py-3 px-5 text-xs font-semibold" style={{ color: "#516F90" }}>Name</th>
                <th className="text-left py-3 px-5 text-xs font-semibold" style={{ color: "#516F90" }}>Client</th>
                <th className="text-left py-3 px-5 text-xs font-semibold" style={{ color: "#516F90" }}>File</th>
                <th className="text-left py-3 px-5 text-xs font-semibold" style={{ color: "#516F90" }}>Type</th>
                <th className="text-left py-3 px-5 text-xs font-semibold" style={{ color: "#516F90" }}>Uploaded</th>
                <th className="text-left py-3 px-5 text-xs font-semibold" style={{ color: "#516F90" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {guides.map((g) => (
                <tr key={g.id} className="border-b border-[#F5F8FA] hover:bg-[#F5F8FA] transition-colors" data-testid={`style-guide-${g.id}`}>
                  <td className="py-3.5 px-5 font-medium" style={{ color: "#33475B" }}>{g.name}</td>
                  <td className="py-3.5 px-5">
                    {g.clientAccount ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E8F5F8] text-[#0091AE]">
                        {g.clientAccount.name}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F5F8FA] text-[#99ACC2]">
                        Shared
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-xs font-mono" style={{ color: "#99ACC2" }}>{g.fileName}</td>
                  <td className="py-3.5 px-5">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E8F5F8] text-[#0091AE]">
                      {mimeLabel(g.mimeType, g.fileName)}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-xs" style={{ color: "#99ACC2" }}>{formatDate(g.createdAt)}</td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" data-testid={`btn-preview-guide-${g.id}`} onClick={() => openPreview(g.id)}>
                        <Eye className="w-3 h-3" /> Preview
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 h-7 w-7 p-0"
                        data-testid={`btn-delete-guide-${g.id}`}
                        onClick={() => handleDelete(g.id)}
                        disabled={deletingId === g.id}
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

      {/* Preview dialog */}
      <Dialog open={!!previewId} onOpenChange={(o) => { if (!o) setPreviewId(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Style Guide Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0">
            {previewLoading ? (
              <p className="text-sm text-center py-8" style={{ color: "#99ACC2" }}>Loading…</p>
            ) : (
              <pre className="whitespace-pre-wrap text-xs leading-relaxed font-mono bg-[#F5F8FA] rounded-xl p-4" style={{ color: "#33475B" }}>
                {previewContent || "No content"}
              </pre>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewId(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Style Guide Generator dialog */}
      <Dialog open={aiOpen} onOpenChange={(o) => { if (!o && !aiGenerating && !aiSaving) setAiOpen(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" style={{ color: "#0091AE" }} />
              AI Style Guide Generator
            </DialogTitle>
            <p className="text-sm" style={{ color: "#516F90" }}>
              Fill in a few details about your organization and Cento will write a complete, professional style guide.
            </p>
            <InfoNote className="mt-2">
              The generated style guide will be attached to jobs you assign it to, guiding every linguist and the AI on how to match your brand voice, formatting conventions, and cultural expectations in each target language.
            </InfoNote>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1">
            {!aiResult ? (
              <>
                {/* Row 1 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold" style={{ color: "#33475B" }}>
                      Industry <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      data-testid="input-ai-industry"
                      placeholder="e.g. Legal, Healthcare, SaaS, E-commerce"
                      value={aiForm.industry}
                      onChange={(e) => setAiForm((p) => ({ ...p, industry: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold" style={{ color: "#33475B" }}>Country / Primary Market</Label>
                    <Input
                      data-testid="input-ai-country"
                      placeholder="e.g. Saudi Arabia, USA, France"
                      value={aiForm.country}
                      onChange={(e) => setAiForm((p) => ({ ...p, country: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Row 2 */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold" style={{ color: "#33475B" }}>Services or Products</Label>
                  <Input
                    data-testid="input-ai-services"
                    placeholder="e.g. Contract management software, Medical devices, Online fashion retail"
                    value={aiForm.servicesProducts}
                    onChange={(e) => setAiForm((p) => ({ ...p, servicesProducts: e.target.value }))}
                  />
                </div>

                {/* Row 3 */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold" style={{ color: "#33475B" }}>Target Audience</Label>
                  <Input
                    data-testid="input-ai-audience"
                    placeholder="e.g. Corporate lawyers, Hospital procurement teams, Fashion-conscious millennials"
                    value={aiForm.targetAudience}
                    onChange={(e) => setAiForm((p) => ({ ...p, targetAudience: e.target.value }))}
                  />
                </div>

                {/* Row 4 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold flex items-center gap-1" style={{ color: "#33475B" }}>
                      Tone / Voice
                      <Tooltip text="Sets the overall personality of your translated content. 'Professional' suits corporate or B2B audiences. 'Conversational' works well for consumer-facing products. 'Technical' is best for developer docs or engineering manuals." />
                    </Label>
                    <div className="relative">
                      <select
                        data-testid="select-ai-tone"
                        className="w-full px-3 py-2 text-sm border border-[#CBD6E2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0091AE]/30 appearance-none bg-white"
                        value={aiForm.tone}
                        onChange={(e) => setAiForm((p) => ({ ...p, tone: e.target.value }))}
                      >
                        {TONE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "#99ACC2" }} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold flex items-center gap-1" style={{ color: "#33475B" }}>
                      Formality Level
                      <Tooltip text="Controls sentence structure and vocabulary register. 'Formal' uses polite forms and avoids contractions. 'Semi-formal' is natural and professional. 'Informal' is casual — ideal for social media or youth-facing brands." />
                    </Label>
                    <div className="relative">
                      <select
                        data-testid="select-ai-formality"
                        className="w-full px-3 py-2 text-sm border border-[#CBD6E2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0091AE]/30 appearance-none bg-white"
                        value={aiForm.formality}
                        onChange={(e) => setAiForm((p) => ({ ...p, formality: e.target.value }))}
                      >
                        {FORMALITY_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "#99ACC2" }} />
                    </div>
                  </div>
                </div>

                {/* Row 5 */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold" style={{ color: "#33475B" }}>Target Languages</Label>
                  <Input
                    data-testid="input-ai-languages"
                    placeholder="e.g. Arabic, French, Spanish, Japanese"
                    value={aiForm.languages}
                    onChange={(e) => setAiForm((p) => ({ ...p, languages: e.target.value }))}
                  />
                </div>

                {/* Row 6 */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold" style={{ color: "#33475B" }}>Additional Notes</Label>
                  <textarea
                    data-testid="input-ai-notes"
                    className="w-full px-3 py-2 text-sm border border-[#CBD6E2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0091AE]/30 resize-none"
                    rows={3}
                    placeholder="Any specific requirements, sensitivities, or brand guidelines to include…"
                    value={aiForm.additionalNotes}
                    onChange={(e) => setAiForm((p) => ({ ...p, additionalNotes: e.target.value }))}
                  />
                </div>
              </>
            ) : (
              /* Generated result */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold" style={{ color: "#33475B" }}>Generated Style Guide</p>
                  <button
                    className="text-xs underline"
                    style={{ color: "#0091AE" }}
                    onClick={() => { setAiResult(""); setAiSaved(false); }}
                  >
                    Edit inputs
                  </button>
                </div>
                <textarea
                  className="w-full px-4 py-3 text-xs font-mono border border-[#CBD6E2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0091AE]/30 resize-none leading-relaxed"
                  style={{ color: "#33475B", background: "#F5F8FA", minHeight: 380 }}
                  value={aiResult}
                  onChange={(e) => setAiResult(e.target.value)}
                />
                <p className="text-[11px]" style={{ color: "#99ACC2" }}>
                  You can edit the text above before saving.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 gap-2 pt-2 flex-wrap">
            {!aiResult ? (
              <>
                <Button variant="outline" onClick={() => setAiOpen(false)} disabled={aiGenerating}>Cancel</Button>
                <Button
                  data-testid="btn-ai-generate"
                  onClick={handleGenerate}
                  disabled={aiGenerating || !aiForm.industry.trim()}
                  style={{ background: "#0091AE" }}
                  className="gap-2"
                >
                  {aiGenerating
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                    : <><Sparkles className="w-4 h-4" /> Generate Style Guide</>
                  }
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setAiOpen(false)} disabled={aiSaving}>Close</Button>
                {clientAccounts.length > 0 && !aiSaved && (
                  <div className="relative">
                    <select
                      data-testid="select-ai-client"
                      className="px-3 py-2 text-sm border border-[#CBD6E2] rounded-lg focus:outline-none appearance-none bg-white pr-8"
                      value={aiClientAccountId}
                      onChange={(e) => setAiClientAccountId(e.target.value)}
                    >
                      <option value="">Shared (all clients)</option>
                      {clientAccounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "#99ACC2" }} />
                  </div>
                )}
                {aiSaved ? (
                  <div className="flex items-center gap-2 text-sm font-medium text-teal-600">
                    Saved to Style Guides
                  </div>
                ) : (
                  <Button
                    data-testid="btn-ai-save"
                    onClick={handleSaveGenerated}
                    disabled={aiSaving || aiResult.startsWith("Error:")}
                    style={{ background: "#FF7A59" }}
                    className="gap-2"
                  >
                    {aiSaving
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                      : <><Plus className="w-4 h-4" /> Save to Style Guides</>
                    }
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
