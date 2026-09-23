'use client';

import { useState, useEffect, useCallback } from 'react';

type UserRole = 'owner' | 'admin' | 'viewer';

interface TgUser {
  _id: string;
  username: string;
  role: UserRole;
  lastLoginAt?: string;
  createdAt: string;
}

const ROLE_BADGE: Record<UserRole, string> = {
  owner: 'bg-[#b31b1b]/30 text-red-300 border border-[#b31b1b]/40',
  admin: 'bg-blue-900/30 text-blue-300 border border-blue-700/40',
  viewer: 'bg-white/5 text-[#888] border border-white/10',
};

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'viewer', label: 'Viewer' },
  { value: 'admin', label: 'Admin' },
  { value: 'owner', label: 'Owner' },
];

export default function UsersPage() {
  const [users, setUsers] = useState<TgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create form
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('viewer');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit modal
  const [editUser, setEditUser] = useState<TgUser | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('viewer');
  const [editPassword, setEditPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.status === 403) { setError('Only owners can manage users.'); return; }
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: newUsername, password: newPassword, userRole: newRole }),
    });
    const data = await res.json();
    if (res.ok) {
      setNewUsername(''); setNewPassword(''); setNewRole('viewer');
      fetchUsers();
    } else {
      setCreateError(data.error || 'Failed to create user');
    }
    setCreating(false);
  }

  async function handleDelete(id: string, username: string) {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
    fetchUsers();
  }

  async function handleSaveEdit() {
    if (!editUser) return;
    setSaving(true);
    await fetch(`/api/users/${editUser._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userRole: editRole, ...(editPassword ? { password: editPassword } : {}) }),
    });
    setSaving(false);
    setEditUser(null);
    setEditPassword('');
    fetchUsers();
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-[#888] mt-1">Manage who has access to TGempire. Only owners can access this page.</p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-900/20 border border-red-700/40 rounded-xl text-red-300 text-sm">{error}</div>}

      {/* Create user form */}
      <div className="bg-[#111] border border-white/10 rounded-2xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-[#aaa] uppercase tracking-wide mb-4">Create New User</h2>
        <form onSubmit={handleCreate} className="flex flex-wrap gap-3">
          <input
            type="text"
            value={newUsername}
            onChange={e => setNewUsername(e.target.value)}
            placeholder="Username"
            required
            className="flex-1 min-w-[140px] p-2.5 bg-[#1a1a1a] border border-white/10 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-[#b31b1b]"
          />
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Password"
            required
            className="flex-1 min-w-[140px] p-2.5 bg-[#1a1a1a] border border-white/10 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-[#b31b1b]"
          />
          <select
            value={newRole}
            onChange={e => setNewRole(e.target.value as UserRole)}
            className="p-2.5 bg-[#1a1a1a] border border-white/10 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-[#b31b1b]"
          >
            {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <button
            type="submit"
            disabled={creating}
            className="px-5 py-2.5 bg-[#b31b1b] text-white text-sm font-semibold rounded-xl hover:bg-[#d42020] transition disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create User'}
          </button>
        </form>
        {createError && <p className="text-red-400 text-sm mt-2">{createError}</p>}
      </div>

      {/* Users table */}
      <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#666] text-sm">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-[#666] text-sm">No users found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-[#666] font-medium">Username</th>
                <th className="text-left p-4 text-[#666] font-medium">Role</th>
                <th className="text-left p-4 text-[#666] font-medium">Last Login</th>
                <th className="text-left p-4 text-[#666] font-medium">Created</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u._id} className={`${i < users.length - 1 ? 'border-b border-white/5' : ''} hover:bg-white/[0.02] transition`}>
                  <td className="p-4 font-mono text-white">{u.username}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${ROLE_BADGE[u.role]}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4 text-[#666]">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="p-4 text-[#666]">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => { setEditUser(u); setEditRole(u.role); setEditPassword(''); }}
                        className="px-3 py-1 text-xs bg-white/5 hover:bg-white/10 text-white rounded-lg transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(u._id, u.username)}
                        className="px-3 py-1 text-xs bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded-lg transition"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Role legend */}
      <div className="mt-4 flex gap-4 text-xs text-[#666]">
        <span><span className="text-red-300 font-semibold">Owner</span> — full access, can manage users</span>
        <span><span className="text-blue-300 font-semibold">Admin</span> — full dashboard access</span>
        <span><span className="text-[#888] font-semibold">Viewer</span> — read-only access</span>
      </div>

      {/* Edit modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold mb-4">Edit <span className="font-mono text-[#b31b1b]">{editUser.username}</span></h3>
            <label className="block text-xs text-[#888] mb-1">Role</label>
            <select
              value={editRole}
              onChange={e => setEditRole(e.target.value as UserRole)}
              className="w-full p-2.5 bg-[#1a1a1a] border border-white/10 rounded-xl text-sm text-white outline-none mb-3"
            >
              {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <label className="block text-xs text-[#888] mb-1">New Password <span className="text-[#555]">(leave blank to keep current)</span></label>
            <input
              type="password"
              value={editPassword}
              onChange={e => setEditPassword(e.target.value)}
              placeholder="New password"
              className="w-full p-2.5 bg-[#1a1a1a] border border-white/10 rounded-xl text-sm text-white outline-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 py-2.5 bg-[#b31b1b] text-white text-sm font-semibold rounded-xl hover:bg-[#d42020] transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setEditUser(null)}
                className="flex-1 py-2.5 bg-white/5 text-white text-sm rounded-xl hover:bg-white/10 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
