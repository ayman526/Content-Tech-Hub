"use client";

import { useState } from "react";
import {
  Users2,
  Plus,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  UserPlus,
  X,
  ShieldCheck,
  BookOpen,
  Library,
  AlertCircle,
  Mail,
  Link2,
  Clock,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type OrgUser = { id: string; name: string | null; email: string; role: string };

type Member = {
  id: string;
  userId: string;
  role: string;
  canAccessTM: boolean;
  canAccessGlossary: boolean;
  requiresApproval: boolean;
  joinedAt: string;
  jobCount: number;
  user: OrgUser;
};

type Department = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  members: Member[];
};

type Props = {
  initialDepartments: Department[];
  orgUsers: OrgUser[];
};

const USER_TYPE_LABEL: Record<string, string> = {
  CLIENT: "Client",
  LINGUIST: "Linguist",
  ADMIN: "Admin",
};

const USER_TYPE_COLOR: Record<string, string> = {
  CLIENT: "bg-teal/10 text-teal",
  LINGUIST: "bg-gold/10 text-gold",
  ADMIN: "bg-navy/10 text-navy",
};

export default function TeamsClient({ initialDepartments, orgUsers }: Props) {
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function createDepartment() {
    if (!newName.trim()) return;
    setSaving(true);
    const res = await fetch("/api/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || undefined }),
    });
    if (res.ok) {
      const dept = await res.json();
      setDepartments((prev) => [...prev, { ...dept, members: [] }]);
      setNewName("");
      setNewDesc("");
      setCreating(false);
      setExpandedId(dept.id);
    }
    setSaving(false);
  }

  function updateDeptLocally(id: string, updater: (d: Department) => Department) {
    setDepartments((prev) => prev.map((d) => (d.id === id ? updater(d) : d)));
  }

  function removeDeptLocally(id: string) {
    setDepartments((prev) => prev.filter((d) => d.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-navy">Teams &amp; Departments</h1>
          <p className="text-sm text-gray-500 mt-1">
            Organize members into departments and control their access and submission policies.
          </p>
        </div>
        <Button onClick={() => setCreating(true)} className="gap-2" data-testid="btn-new-department">
          <Plus className="w-4 h-4" />
          New Department
        </Button>
      </div>

      {creating && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
          <h3 className="text-sm font-semibold text-navy mb-4">New Department</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Marketing, Legal, R&D"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal/30"
                data-testid="input-dept-name"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Description (optional)</label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Brief description of this department"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal/30"
                data-testid="input-dept-desc"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              onClick={createDepartment}
              disabled={saving || !newName.trim()}
              className="gap-1.5"
              data-testid="btn-save-department"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Create
            </Button>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {departments.length === 0 && !creating ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
          <Users2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No departments yet</p>
          <p className="text-xs text-gray-400 mt-1">Create a department to start organizing your team.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {departments.map((dept) => (
            <DepartmentCard
              key={dept.id}
              dept={dept}
              orgUsers={orgUsers}
              expanded={expandedId === dept.id}
              onToggle={() => setExpandedId(expandedId === dept.id ? null : dept.id)}
              onUpdate={(updater) => updateDeptLocally(dept.id, updater)}
              onDelete={() => removeDeptLocally(dept.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DepartmentCard({
  dept,
  orgUsers,
  expanded,
  onToggle,
  onUpdate,
  onDelete,
}: {
  dept: Department;
  orgUsers: OrgUser[];
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (updater: (d: Department) => Department) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(dept.name);
  const [editDesc, setEditDesc] = useState(dept.description ?? "");
  const [editSaving, setEditSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [addMode, setAddMode] = useState<"existing" | "invite">("existing");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [memberRole, setMemberRole] = useState("MEMBER");
  const [canTM, setCanTM] = useState(false);
  const [canGlossary, setCanGlossary] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [addPending, setAddPending] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviteCanTM, setInviteCanTM] = useState(false);
  const [inviteCanGlossary, setInviteCanGlossary] = useState(false);
  const [inviteRequiresApproval, setInviteRequiresApproval] = useState(true);
  const [invitePending, setInvitePending] = useState(false);
  const [inviteResult, setInviteResult] = useState<{
    inviteUrl: string;
    emailSent: boolean;
    emailReason?: string;
    email: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const existingUserIds = new Set(dept.members.map((m) => m.userId));
  const availableUsers = orgUsers.filter((u) => !existingUserIds.has(u.id));

  async function saveEdit() {
    if (!editName.trim()) return;
    setEditSaving(true);
    const res = await fetch(`/api/departments/${dept.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName.trim(),
        description: editDesc.trim() || null,
      }),
    });
    if (res.ok) {
      onUpdate((d) => ({ ...d, name: editName.trim(), description: editDesc.trim() || null }));
      setEditing(false);
    }
    setEditSaving(false);
  }

  async function deleteDept() {
    setDeleting(true);
    const res = await fetch(`/api/departments/${dept.id}`, { method: "DELETE" });
    if (res.ok) onDelete();
    setDeleting(false);
  }

  async function addMember() {
    if (!selectedUserId) return;
    setAddPending(true);
    const res = await fetch(`/api/departments/${dept.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: selectedUserId,
        role: memberRole,
        canAccessTM: canTM,
        canAccessGlossary: canGlossary,
        requiresApproval,
      }),
    });
    if (res.ok) {
      const member = await res.json();
      const orgUser = orgUsers.find((u) => u.id === selectedUserId);
      onUpdate((d) => ({
        ...d,
        members: [...d.members, { ...member, jobCount: 0, user: orgUser ?? member.user }],
      }));
      setSelectedUserId("");
      setCanTM(false);
      setCanGlossary(false);
      setRequiresApproval(true);
      setMemberRole("MEMBER");
      setAddingMember(false);
    }
    setAddPending(false);
  }

  async function removeMember(userId: string) {
    await fetch(`/api/departments/${dept.id}/members/${userId}`, { method: "DELETE" });
    onUpdate((d) => ({ ...d, members: d.members.filter((m) => m.userId !== userId) }));
  }

  function resetAddPanel() {
    setAddingMember(false);
    setAddMode("existing");
    setSelectedUserId("");
    setCanTM(false);
    setCanGlossary(false);
    setRequiresApproval(true);
    setMemberRole("MEMBER");
    setInviteEmail("");
    setInviteRole("MEMBER");
    setInviteCanTM(false);
    setInviteCanGlossary(false);
    setInviteRequiresApproval(true);
    setInviteResult(null);
    setCopied(false);
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) return;
    setInvitePending(true);
    const res = await fetch(`/api/departments/${dept.id}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        canAccessTM: inviteCanTM,
        canAccessGlossary: inviteCanGlossary,
        requiresApproval: inviteRequiresApproval,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      if (data.type === "added_directly") {
        onUpdate((d) => ({
          ...d,
          members: [...d.members, { ...data.member, jobCount: 0 }],
        }));
        resetAddPanel();
      } else {
        setInviteResult({
          inviteUrl: data.inviteUrl,
          emailSent: data.emailSent,
          emailReason: data.emailReason,
          email: inviteEmail.trim(),
        });
      }
    }
    setInvitePending(false);
  }

  function copyLink(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function updateMember(userId: string, patch: Partial<Member>) {
    const res = await fetch(`/api/departments/${dept.id}/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const updated = await res.json();
      onUpdate((d) => ({
        ...d,
        members: d.members.map((m) => (m.userId === userId ? { ...m, ...updated } : m)),
      }));
      setEditingMemberId(null);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      {/* Row header */}
      {editing ? (
        <div className="p-4 flex items-center gap-3 border-b border-gray-100">
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="text-sm font-semibold border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal/30 flex-1"
            placeholder="Department name"
            autoFocus
            data-testid="input-edit-dept-name"
          />
          <input
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal/30 flex-1"
            placeholder="Description (optional)"
            data-testid="input-edit-dept-desc"
          />
          <button
            onClick={saveEdit}
            disabled={editSaving || !editName.trim()}
            className="p-1.5 rounded-lg bg-teal/10 hover:bg-teal/20 text-teal transition-colors disabled:opacity-50"
            title="Save"
            data-testid="btn-save-dept-edit"
          >
            {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          </button>
          <button
            onClick={() => { setEditing(false); setEditName(dept.name); setEditDesc(dept.description ?? ""); }}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={onToggle}
          data-testid={`dept-card-${dept.id}`}
        >
          {/* Left: name + description */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-navy">{dept.name}</p>
            {dept.description && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">{dept.description}</p>
            )}
          </div>

          {/* Right: member count + actions + chevron */}
          <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-navy/8 text-navy" style={{ background: "rgba(45,62,80,0.08)" }}>
              {dept.members.length} {dept.members.length === 1 ? "member" : "members"}
            </span>

            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded-lg hover:bg-teal/10 text-gray-400 hover:text-teal transition-colors"
              title="Edit department"
              data-testid={`btn-edit-dept-${dept.id}`}
            >
              <Pencil className="w-4 h-4" />
            </button>

            {confirmDelete ? (
              <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                <span className="text-xs text-red-600 font-medium whitespace-nowrap">Delete?</span>
                <button
                  onClick={deleteDept}
                  disabled={deleting}
                  className="text-xs text-red-600 font-bold hover:text-red-800 transition-colors"
                  data-testid={`btn-confirm-delete-dept-${dept.id}`}
                >
                  {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Yes"}
                </button>
                <span className="text-red-300">·</span>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                title="Delete department"
                data-testid={`btn-delete-dept-${dept.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div onClick={onToggle} className="cursor-pointer">
            {expanded
              ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
              : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
          </div>
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100">
          {/* Members data table */}
          {dept.members.length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-400">
              No members yet. Add one below.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">Member</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">User Type</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Role</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Jobs</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Permissions</th>
                    <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dept.members.map((m) => (
                    <MemberTableRow
                      key={m.userId}
                      member={m}
                      editing={editingMemberId === m.userId}
                      onEdit={() => setEditingMemberId(m.userId)}
                      onCancelEdit={() => setEditingMemberId(null)}
                      onSave={(patch) => updateMember(m.userId, patch)}
                      onRemove={() => removeMember(m.userId)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add / Invite member */}
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            {addingMember ? (
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
                {/* Mode tabs */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
                  <button
                    onClick={() => { setAddMode("existing"); setInviteResult(null); }}
                    className={cn(
                      "text-xs font-semibold px-3 py-1.5 rounded-md transition-all",
                      addMode === "existing" ? "bg-white text-navy shadow-sm" : "text-gray-500 hover:text-navy"
                    )}
                    data-testid="tab-add-existing"
                  >
                    <span className="flex items-center gap-1.5"><UserPlus className="w-3.5 h-3.5" />Existing Member</span>
                  </button>
                  <button
                    onClick={() => { setAddMode("invite"); setInviteResult(null); }}
                    className={cn(
                      "text-xs font-semibold px-3 py-1.5 rounded-md transition-all",
                      addMode === "invite" ? "bg-white text-navy shadow-sm" : "text-gray-500 hover:text-navy"
                    )}
                    data-testid="tab-invite-email"
                  >
                    <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />Invite by Email</span>
                  </button>
                </div>

                {addMode === "existing" ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Person</label>
                        <select
                          value={selectedUserId}
                          onChange={(e) => setSelectedUserId(e.target.value)}
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal/30"
                          data-testid="select-member-user"
                        >
                          <option value="">— Choose —</option>
                          {availableUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name ? `${u.name} (${u.email})` : u.email}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Role</label>
                        <select
                          value={memberRole}
                          onChange={(e) => setMemberRole(e.target.value)}
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal/30"
                        >
                          <option value="MEMBER">Member</option>
                          <option value="MANAGER">Manager</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Access &amp; Permissions</p>
                      <div className="flex flex-wrap gap-2">
                        <ToggleChip label="Translation Memory" icon={<BookOpen className="w-3.5 h-3.5" />} value={canTM} onChange={setCanTM} />
                        <ToggleChip label="Glossary" icon={<Library className="w-3.5 h-3.5" />} value={canGlossary} onChange={setCanGlossary} />
                        <ToggleChip label="Requires Approval" icon={<ShieldCheck className="w-3.5 h-3.5" />} value={requiresApproval} onChange={setRequiresApproval} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={addMember} disabled={addPending || !selectedUserId} className="gap-1.5" data-testid="btn-confirm-add-member">
                        {addPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Add Member
                      </Button>
                      <Button size="sm" variant="outline" onClick={resetAddPanel}>Cancel</Button>
                    </div>
                  </>
                ) : inviteResult ? (
                  /* After invite — show invite link */
                  <div className="space-y-4">
                    {inviteResult.emailSent ? (
                      <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                        <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>Invitation email sent to <strong>{inviteResult.email}</strong>.</span>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                        <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>
                          {inviteResult.emailReason === "SMTP_NOT_CONFIGURED"
                            ? "Email delivery is not configured. Share the invite link below directly with the invitee."
                            : "Email could not be sent. Share the invite link below directly with the invitee."}
                        </span>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-semibold text-gray-500 block mb-1.5">Invite Link</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 truncate font-mono">
                          {inviteResult.inviteUrl}
                        </div>
                        <button
                          onClick={() => copyLink(inviteResult.inviteUrl)}
                          className={cn(
                            "flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-all flex-shrink-0",
                            copied
                              ? "bg-green-50 border-green-200 text-green-600"
                              : "bg-white border-gray-200 text-gray-600 hover:border-teal/40 hover:text-teal"
                          )}
                          data-testid="btn-copy-invite-link"
                        >
                          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copied ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => { setInviteResult(null); setInviteEmail(""); }}
                        className="text-xs font-semibold text-teal hover:underline"
                        data-testid="btn-invite-another"
                      >
                        Invite another
                      </button>
                      <span className="text-gray-300">·</span>
                      <button
                        onClick={resetAddPanel}
                        className="text-xs font-semibold text-gray-500 hover:underline"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Invite by email form */
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Email address</label>
                        <input
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="colleague@company.com"
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal/30"
                          data-testid="input-invite-email"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Role</label>
                        <select
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value)}
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal/30"
                        >
                          <option value="MEMBER">Member</option>
                          <option value="MANAGER">Manager</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Access &amp; Permissions</p>
                      <div className="flex flex-wrap gap-2">
                        <ToggleChip label="Translation Memory" icon={<BookOpen className="w-3.5 h-3.5" />} value={inviteCanTM} onChange={setInviteCanTM} />
                        <ToggleChip label="Glossary" icon={<Library className="w-3.5 h-3.5" />} value={inviteCanGlossary} onChange={setInviteCanGlossary} />
                        <ToggleChip label="Requires Approval" icon={<ShieldCheck className="w-3.5 h-3.5" />} value={inviteRequiresApproval} onChange={setInviteRequiresApproval} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        onClick={sendInvite}
                        disabled={invitePending || !inviteEmail.trim()}
                        className="gap-1.5"
                        data-testid="btn-send-invite"
                      >
                        {invitePending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                        Generate Invite Link
                      </Button>
                      <Button size="sm" variant="outline" onClick={resetAddPanel}>Cancel</Button>
                    </div>
                    <p className="text-xs text-gray-400 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      Invite links are valid for 7 days. If the person is already in your organization, they will be added directly.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => setAddingMember(true)}
                className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-teal border border-dashed border-gray-200 hover:border-teal/40 rounded-xl py-2.5 transition-colors"
                data-testid="btn-add-member"
              >
                <UserPlus className="w-4 h-4" />
                Add or Invite Member
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MemberTableRow({
  member,
  editing,
  onEdit,
  onCancelEdit,
  onSave,
  onRemove,
}: {
  member: Member;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (patch: Partial<Member>) => void;
  onRemove: () => void;
}) {
  const [role, setRole] = useState(member.role);
  const [canTM, setCanTM] = useState(member.canAccessTM);
  const [canGlossary, setCanGlossary] = useState(member.canAccessGlossary);
  const [requiresApproval, setRequiresApproval] = useState(member.requiresApproval);
  const [confirmDel, setConfirmDel] = useState(false);

  const initials = member.user.name
    ? member.user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : member.user.email.slice(0, 2).toUpperCase();

  return (
    <>
      <tr className={cn("hover:bg-gray-50 transition-colors", editing && "bg-teal/5")}>
        {/* Member */}
        <td className="px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-navy to-teal flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-navy truncate max-w-[160px]">
                {member.user.name ?? member.user.email}
              </p>
              {member.user.name && (
                <p className="text-xs text-gray-400 truncate max-w-[160px]">{member.user.email}</p>
              )}
            </div>
          </div>
        </td>

        {/* User Type */}
        <td className="px-4 py-3">
          <span className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded-full",
            USER_TYPE_COLOR[member.user.role] ?? "bg-gray-100 text-gray-500"
          )}>
            {USER_TYPE_LABEL[member.user.role] ?? member.user.role}
          </span>
        </td>

        {/* Role */}
        <td className="px-4 py-3">
          <span className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded-full",
            member.role === "MANAGER" ? "bg-navy/10 text-navy" : "bg-gray-100 text-gray-500"
          )}>
            {member.role}
          </span>
        </td>

        {/* Jobs */}
        <td className="px-4 py-3">
          <span className="text-sm font-medium text-navy">{member.jobCount}</span>
          <span className="text-xs text-gray-400 ms-1">
            {member.user.role === "LINGUIST" ? "jobs" : "orders"}
          </span>
        </td>

        {/* Permissions */}
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {member.canAccessTM && (
              <span className="text-[10px] bg-teal/10 text-teal px-1.5 py-0.5 rounded font-semibold">TM</span>
            )}
            {member.canAccessGlossary && (
              <span className="text-[10px] bg-gold/10 text-gold px-1.5 py-0.5 rounded font-semibold">Glossary</span>
            )}
            {member.requiresApproval && (
              <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-semibold">Approval</span>
            )}
            {!member.canAccessTM && !member.canAccessGlossary && !member.requiresApproval && (
              <span className="text-xs text-gray-300">—</span>
            )}
          </div>
        </td>

        {/* Actions */}
        <td className="px-5 py-3">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={editing ? onCancelEdit : onEdit}
              className="p-1.5 rounded-lg hover:bg-teal/10 text-gray-400 hover:text-teal transition-colors"
              title={editing ? "Cancel edit" : "Edit permissions"}
              data-testid={`btn-edit-member-${member.userId}`}
            >
              {editing ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
            </button>

            {confirmDel ? (
              <div className="flex items-center gap-1 text-xs">
                <span className="text-red-500 font-medium">Sure?</span>
                <button
                  onClick={onRemove}
                  className="text-red-600 font-bold hover:text-red-800"
                  data-testid={`btn-confirm-remove-member-${member.userId}`}
                >
                  Yes
                </button>
                <span className="text-gray-300">·</span>
                <button
                  onClick={() => setConfirmDel(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDel(true)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                title="Remove from department"
                data-testid={`btn-remove-member-${member.userId}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Edit permissions inline row */}
      {editing && (
        <tr className="bg-teal/5 border-b border-teal/10">
          <td colSpan={6} className="px-5 py-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal/30"
                >
                  <option value="MEMBER">Member</option>
                  <option value="MANAGER">Manager</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-2">Permissions</label>
                <div className="flex gap-2">
                  <ToggleChip
                    label="Translation Memory"
                    icon={<BookOpen className="w-3.5 h-3.5" />}
                    value={canTM}
                    onChange={setCanTM}
                  />
                  <ToggleChip
                    label="Glossary"
                    icon={<Library className="w-3.5 h-3.5" />}
                    value={canGlossary}
                    onChange={setCanGlossary}
                  />
                  <ToggleChip
                    label="Requires Approval"
                    icon={<ShieldCheck className="w-3.5 h-3.5" />}
                    value={requiresApproval}
                    onChange={setRequiresApproval}
                  />
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => onSave({ role, canAccessTM: canTM, canAccessGlossary: canGlossary, requiresApproval })}
                className="gap-1.5 mb-0.5"
                data-testid={`btn-save-member-${member.userId}`}
              >
                <Check className="w-3.5 h-3.5" />
                Save
              </Button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function ToggleChip({
  label,
  icon,
  value,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all",
        value
          ? "bg-teal/10 border-teal/30 text-teal"
          : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
