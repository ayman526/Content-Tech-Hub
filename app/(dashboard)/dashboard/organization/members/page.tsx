"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Users, Pencil, Check } from "lucide-react";

interface OrgMember {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  createdAt: string;
  clientAccountIds: string[];
}

interface ClientAccount {
  id: string;
  name: string;
}

export default function MembersPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";

  const [members, setMembers] = useState<OrgMember[]>([]);
  const [clientAccounts, setClientAccounts] = useState<ClientAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [mRes, cRes] = await Promise.all([
        fetch("/api/org-members"),
        fetch("/api/client-accounts"),
      ]);
      if (mRes.ok) setMembers(await mRes.json());
      if (cRes.ok) setClientAccounts(await cRes.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openEdit(member: OrgMember) {
    setEditingMemberId(member.id);
    setSelected(member.clientAccountIds);
    setError(null);
  }

  function closeEdit() {
    setEditingMemberId(null);
    setSelected([]);
    setError(null);
  }

  function toggleAccount(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function saveAccess() {
    if (!editingMemberId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/org-members/${editingMemberId}/client-access`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientAccountIds: selected }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save");
        return;
      }
      closeEdit();
      await load();
    } finally {
      setSaving(false);
    }
  }

  const editingMember = members.find((m) => m.id === editingMemberId);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy flex items-center gap-2">
          <Users className="w-6 h-6" />
          Members
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage client account access for each organization member.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading members...</div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No members found.</div>
        ) : (
          <table className="w-full text-sm" data-testid="members-table">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 font-semibold text-gray-500 uppercase tracking-widest text-[10px]">Member</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-500 uppercase tracking-widest text-[10px]">Role</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-500 uppercase tracking-widest text-[10px]">Client Account Access</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr
                  key={member.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                  data-testid={`row-member-${member.id}`}
                >
                  <td className="px-6 py-4">
                    <p className="font-medium text-navy" data-testid={`text-name-${member.id}`}>
                      {member.name ?? "—"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{member.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {member.clientAccountIds.length === 0 ? (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500"
                        data-testid={`badge-fullaccess-${member.id}`}
                      >
                        Full Access
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1" data-testid={`badges-accounts-${member.id}`}>
                        {member.clientAccountIds.map((id) => {
                          const acct = clientAccounts.find((c) => c.id === id);
                          return (
                            <span
                              key={id}
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: "#0091AE1A", color: "#0091AE" }}
                              data-testid={`badge-account-${id}`}
                            >
                              {acct?.name ?? id}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {isAdmin && (
                      <button
                        onClick={() => openEdit(member)}
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-navy transition-colors"
                        data-testid={`button-editaccess-${member.id}`}
                      >
                        <Pencil className="w-3 h-3" />
                        Edit Access
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editingMemberId && editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" data-testid="dialog-editaccess">
            <h2 className="text-base font-bold text-navy mb-1">Edit Client Account Access</h2>
            <p className="text-sm text-gray-500 mb-4">
              Assign <span className="font-medium text-navy">{editingMember.name ?? editingMember.email}</span> to
              specific client accounts. Leave empty to grant full access to all org assets.
            </p>

            {clientAccounts.length === 0 ? (
              <p className="text-sm text-gray-400 mb-4">No client accounts exist yet.</p>
            ) : (
              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto" data-testid="checklist-accounts">
                {clientAccounts.map((acct) => {
                  const checked = selected.includes(acct.id);
                  return (
                    <label
                      key={acct.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                      data-testid={`label-account-${acct.id}`}
                    >
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                          checked ? "border-teal bg-teal" : "border-gray-300 bg-white"
                        }`}
                      >
                        {checked && <Check className="w-3 h-3 text-white" />}
                      </span>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => toggleAccount(acct.id)}
                        data-testid={`checkbox-account-${acct.id}`}
                      />
                      <span className="text-sm font-medium text-navy">{acct.name}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {selected.length === 0 && (
              <p className="text-xs text-gray-400 mb-4">
                No accounts selected — member will have full access to all org assets.
              </p>
            )}

            {error && (
              <p className="text-xs text-red-500 mb-4" data-testid="error-save">{error}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={closeEdit}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
                data-testid="button-cancel"
              >
                Cancel
              </button>
              <button
                onClick={saveAccess}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60"
                style={{ backgroundColor: "#0091AE" }}
                data-testid="button-save"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
