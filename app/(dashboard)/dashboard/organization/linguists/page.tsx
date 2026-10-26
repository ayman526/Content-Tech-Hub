"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users, Star, Plus, Search, Globe, X, Check, Loader2,
  UserCheck, UserX, Settings2, Trash2, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { code: "en", name: "English" }, { code: "ar", name: "Arabic" },
  { code: "zh", name: "Chinese (Simplified)" }, { code: "zh-tw", name: "Chinese (Traditional)" },
  { code: "fr", name: "French" }, { code: "de", name: "German" },
  { code: "es", name: "Spanish" }, { code: "pt", name: "Portuguese" },
  { code: "ja", name: "Japanese" }, { code: "ko", name: "Korean" },
  { code: "it", name: "Italian" }, { code: "ru", name: "Russian" },
  { code: "tr", name: "Turkish" }, { code: "nl", name: "Dutch" },
  { code: "pl", name: "Polish" }, { code: "sv", name: "Swedish" },
  { code: "da", name: "Danish" }, { code: "he", name: "Hebrew" },
  { code: "hi", name: "Hindi" }, { code: "id", name: "Indonesian" },
  { code: "th", name: "Thai" },
];

type LinguistType = "INTERNAL" | "PREFERRED" | "SYSTEM";
type TabId = "all" | "internal" | "preferred" | "pool";

interface Linguist {
  id: string;
  name: string | null;
  email: string;
  type: LinguistType;
  isActive: boolean;
  languagePairs: { sourceLang: string; targetLang: string }[];
  rating: number;
  completedJobs: number;
  specializations: string[];
}

interface PendingInvite {
  id: string;
  email: string;
  languagePairs: { sourceLang: string; targetLang: string }[];
  createdAt: string;
  expiresAt: string;
}

interface LinguistData {
  internal: Linguist[];
  preferred: Linguist[];
  pool: Linguist[];
  invitations: PendingInvite[];
}

function typeBadge(type: LinguistType) {
  if (type === "INTERNAL") return "bg-blue-100 text-blue-700";
  if (type === "PREFERRED") return "bg-gold/20 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

function typeLabel(type: LinguistType) {
  if (type === "INTERNAL") return "Internal Reviewer";
  if (type === "PREFERRED") return "Preferred Linguist";
  return "Linguist Network";
}

export default function LinguistsPage() {
  const [data, setData] = useState<LinguistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("all");
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterTarget, setFilterTarget] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePairs, setInvitePairs] = useState<{ sourceLang: string; targetLang: string }[]>([]);
  const [inviteSource, setInviteSource] = useState("en");
  const [inviteTarget, setInviteTarget] = useState("ar");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const [editLinguist, setEditLinguist] = useState<Linguist | null>(null);
  const [editPairs, setEditPairs] = useState<{ sourceLang: string; targetLang: string }[]>([]);
  const [editSource, setEditSource] = useState("en");
  const [editTarget, setEditTarget] = useState("ar");
  const [editSaving, setEditSaving] = useState(false);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (tab !== "all") params.set("type", tab === "internal" ? "internal" : tab === "preferred" ? "preferred" : "pool");
    if (filterSource) params.set("sourceLang", filterSource);
    if (filterTarget) params.set("targetLang", filterTarget);
    if (filterStatus !== "all") params.set("status", filterStatus);
    const res = await fetch(`/api/organization/linguists?${params}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [search, tab, filterSource, filterTarget, filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleInvite() {
    setInviteError(null);
    if (!inviteEmail.trim()) { setInviteError("Email is required."); return; }
    setInviting(true);
    const res = await fetch("/api/organization/linguists/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim(), languagePairs: invitePairs }),
    });
    setInviting(false);
    if (res.ok) {
      setInviteSuccess(true);
      setTimeout(() => {
        setShowInviteModal(false);
        setInviteSuccess(false);
        setInviteEmail("");
        setInvitePairs([]);
        fetchData();
      }, 1500);
    } else {
      const d = await res.json();
      setInviteError(d.error ?? "Failed to send invitation.");
    }
  }

  async function handleTogglePrefer(linguist: Linguist) {
    const isPreferred = linguist.type === "PREFERRED";
    await fetch(`/api/linguists/${linguist.id}/favorite`, { method: "POST" });
    showToast(isPreferred ? "Removed from Preferred" : "Added to Preferred");
    fetchData();
  }

  async function handleDeactivate(linguist: Linguist) {
    await fetch(`/api/organization/linguists/${linguist.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !linguist.isActive }),
    });
    showToast(linguist.isActive ? "Linguist deactivated" : "Linguist reactivated");
    fetchData();
  }

  async function handleSaveEdit() {
    if (!editLinguist) return;
    setEditSaving(true);
    await fetch(`/api/organization/linguists/${editLinguist.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ languagePairs: editPairs }),
    });
    setEditSaving(false);
    setEditLinguist(null);
    showToast("Language pairs updated");
    fetchData();
  }

  const allLinguists: Linguist[] = data
    ? [...data.internal, ...data.preferred, ...data.pool]
    : [];

  const displayed =
    tab === "internal" ? data?.internal ?? [] :
    tab === "preferred" ? data?.preferred ?? [] :
    tab === "pool" ? data?.pool ?? [] :
    allLinguists;

  const counts = {
    all: allLinguists.length,
    internal: data?.internal.length ?? 0,
    preferred: data?.preferred.length ?? 0,
    pool: data?.pool.length ?? 0,
  };

  const TABS: { id: TabId; label: string }[] = [
    { id: "all", label: `All (${counts.all})` },
    { id: "internal", label: `Internal Reviewers (${counts.internal})` },
    { id: "preferred", label: `Preferred Linguists (${counts.preferred})` },
    { id: "pool", label: `Linguist Network (${counts.pool})` },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Linguists</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage your internal reviewers, preferred linguists, and linguist network members.
          </p>
        </div>
        <Button onClick={() => setShowInviteModal(true)} data-testid="btn-invite-linguist">
          <Plus className="w-4 h-4 mr-1.5" /> Invite Reviewer
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.id
                ? "border-orange text-orange"
                : "border-transparent text-gray-500 hover:text-navy"
            )}
            data-testid={`tab-linguists-${t.id}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal w-56"
            data-testid="input-linguist-search"
          />
        </div>

        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal/30 bg-white"
          data-testid="select-source-lang"
        >
          <option value="">Any source language</option>
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.name}</option>
          ))}
        </select>

        <select
          value={filterTarget}
          onChange={(e) => setFilterTarget(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal/30 bg-white"
          data-testid="select-target-lang"
        >
          <option value="">Any target language</option>
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.name}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal/30 bg-white"
          data-testid="select-status-filter"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Pending invitations */}
      {tab === "internal" && data?.invitations && data.invitations.length > 0 && (
        <div className="mb-5 bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3">
            Pending Invitations ({data.invitations.length})
          </p>
          <div className="space-y-2">
            {data.invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between text-sm">
                <span className="font-medium text-navy">{inv.email}</span>
                <div className="flex items-center gap-3">
                  {inv.languagePairs.slice(0, 2).map((p, i) => (
                    <span key={i} className="text-[10px] bg-teal/10 text-teal px-2 py-0.5 rounded-full font-medium">
                      {p.sourceLang.toUpperCase()} → {p.targetLang.toUpperCase()}
                    </span>
                  ))}
                  <span className="text-xs text-gray-400">
                    Expires {new Date(inv.expiresAt).toLocaleDateString()}
                  </span>
                  <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                    Invited
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-teal animate-spin" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No linguists found</p>
          <p className="text-xs text-gray-400 mt-1">
            {tab === "internal"
              ? "Invite internal reviewers using the button above."
              : tab === "preferred"
              ? "Add preferred linguists from the Linguist Network tab."
              : "No linguists match your filters."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Linguist</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Language pairs</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rating</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {displayed.map((ling) => (
                <tr
                  key={ling.id}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                  data-testid={`row-linguist-${ling.id}`}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-navy to-teal flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(ling.name ?? ling.email).slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-navy">{ling.name ?? ling.email}</p>
                        {ling.name && <p className="text-xs text-gray-400">{ling.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", typeBadge(ling.type))}>
                      {typeLabel(ling.type)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {ling.languagePairs.slice(0, 3).map((p, i) => (
                        <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                          {p.sourceLang.toUpperCase()} → {p.targetLang.toUpperCase()}
                        </span>
                      ))}
                      {ling.languagePairs.length > 3 && (
                        <span className="text-[10px] text-gray-400">+{ling.languagePairs.length - 3}</span>
                      )}
                      {ling.languagePairs.length === 0 && (
                        <span className="text-[10px] text-gray-400">None set</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {ling.rating > 0 ? (
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-gold fill-gold" />
                        <span className="text-sm font-medium">{ling.rating.toFixed(1)}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                      ling.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    )}>
                      {ling.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 justify-end">
                      {ling.type === "INTERNAL" && (
                        <>
                          <button
                            onClick={() => {
                              setEditLinguist(ling);
                              setEditPairs(ling.languagePairs);
                            }}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-navy transition-colors"
                            title="Edit language pairs"
                            data-testid={`btn-edit-linguist-${ling.id}`}
                          >
                            <Settings2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeactivate(ling)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-red-500 transition-colors"
                            title={ling.isActive ? "Deactivate" : "Reactivate"}
                            data-testid={`btn-toggle-active-${ling.id}`}
                          >
                            {ling.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </button>
                        </>
                      )}
                      {ling.type === "PREFERRED" && (
                        <button
                          onClick={() => handleTogglePrefer(ling)}
                          className="text-xs font-medium text-red-500 hover:text-red-700 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors"
                          data-testid={`btn-remove-preferred-${ling.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5 inline mr-1" />Remove
                        </button>
                      )}
                      {ling.type === "SYSTEM" && (
                        <button
                          onClick={() => handleTogglePrefer(ling)}
                          className="text-xs font-medium text-teal hover:text-teal/80 px-2.5 py-1 rounded-lg hover:bg-teal/5 transition-colors"
                          data-testid={`btn-add-preferred-${ling.id}`}
                        >
                          <Star className="w-3.5 h-3.5 inline mr-1" />Add to Preferred
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-navy">Invite Internal Reviewer</h2>
              <button
                onClick={() => { setShowInviteModal(false); setInviteError(null); setInviteSuccess(false); setInviteEmail(""); setInvitePairs([]); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                data-testid="btn-close-invite-modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {inviteSuccess ? (
              <div className="text-center py-6">
                <Check className="w-10 h-10 text-green-400 mx-auto mb-3" />
                <p className="font-semibold text-navy">Invitation sent!</p>
                <p className="text-sm text-gray-500 mt-1">
                  An invitation email has been sent to {inviteEmail}.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                    Email address
                  </label>
                  <input
                    type="email"
                    placeholder="reviewer@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                    data-testid="input-invite-email"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                    Language pairs
                  </label>
                  <div className="flex gap-2 mb-2">
                    <select
                      value={inviteSource}
                      onChange={(e) => setInviteSource(e.target.value)}
                      className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none bg-white"
                      data-testid="select-invite-source"
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l.code} value={l.code}>{l.name}</option>
                      ))}
                    </select>
                    <span className="self-center text-gray-400 text-sm">→</span>
                    <select
                      value={inviteTarget}
                      onChange={(e) => setInviteTarget(e.target.value)}
                      className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none bg-white"
                      data-testid="select-invite-target"
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l.code} value={l.code}>{l.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (inviteSource === inviteTarget) return;
                        const already = invitePairs.some(
                          (p) => p.sourceLang === inviteSource && p.targetLang === inviteTarget
                        );
                        if (!already) setInvitePairs([...invitePairs, { sourceLang: inviteSource, targetLang: inviteTarget }]);
                      }}
                      className="px-3 py-2 bg-teal text-white text-sm rounded-xl hover:bg-teal/90 transition-colors"
                      data-testid="btn-add-lang-pair"
                    >
                      Add
                    </button>
                  </div>
                  {invitePairs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {invitePairs.map((p, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 text-xs bg-teal/10 text-teal px-2.5 py-1 rounded-full font-medium"
                        >
                          <Globe className="w-3 h-3" />
                          {p.sourceLang.toUpperCase()} → {p.targetLang.toUpperCase()}
                          <button
                            type="button"
                            onClick={() => setInvitePairs(invitePairs.filter((_, j) => j !== i))}
                            className="hover:text-teal/60"
                            data-testid={`btn-remove-pair-${i}`}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {inviteError && (
                  <p className="text-xs text-red-500" data-testid="text-invite-modal-error">{inviteError}</p>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setShowInviteModal(false); setInviteError(null); setInviteEmail(""); setInvitePairs([]); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={inviting}
                    onClick={handleInvite}
                    data-testid="btn-send-invitation"
                  >
                    {inviting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending...</> : "Send Invitation"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Language Pairs Modal */}
      {editLinguist && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-navy">Edit Language Pairs</h2>
              <button onClick={() => setEditLinguist(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" data-testid="btn-close-edit-modal">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Editing language pairs for <strong>{editLinguist.name ?? editLinguist.email}</strong>
            </p>
            <div className="flex gap-2 mb-3">
              <select value={editSource} onChange={(e) => setEditSource(e.target.value)} className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none bg-white" data-testid="select-edit-source">
                {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
              <span className="self-center text-gray-400 text-sm">→</span>
              <select value={editTarget} onChange={(e) => setEditTarget(e.target.value)} className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none bg-white" data-testid="select-edit-target">
                {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
              <button
                type="button"
                onClick={() => {
                  if (editSource === editTarget) return;
                  const already = editPairs.some((p) => p.sourceLang === editSource && p.targetLang === editTarget);
                  if (!already) setEditPairs([...editPairs, { sourceLang: editSource, targetLang: editTarget }]);
                }}
                className="px-3 py-2 bg-teal text-white text-sm rounded-xl hover:bg-teal/90 transition-colors"
                data-testid="btn-add-edit-pair"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-4 min-h-[32px]">
              {editPairs.map((p, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 text-xs bg-teal/10 text-teal px-2.5 py-1 rounded-full font-medium">
                  {p.sourceLang.toUpperCase()} → {p.targetLang.toUpperCase()}
                  <button type="button" onClick={() => setEditPairs(editPairs.filter((_, j) => j !== i))} className="hover:text-teal/60">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
              {editPairs.length === 0 && <span className="text-xs text-gray-400">No language pairs set</span>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditLinguist(null)}>Cancel</Button>
              <Button className="flex-1" disabled={editSaving} onClick={handleSaveEdit} data-testid="btn-save-edit-pairs">
                {editSaving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 bg-navy text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-50 flex items-center gap-2 animate-in slide-in-from-bottom-4" data-testid="toast-message">
          <Check className="w-4 h-4 text-green-300" />
          {toastMsg}
        </div>
      )}
    </div>
  );
}
