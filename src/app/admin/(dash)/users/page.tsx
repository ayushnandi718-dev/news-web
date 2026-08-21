"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDateTime } from "@/lib/format";

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  createdAt: string;
  _count: { articles: number };
}

const ROLES = ["OWNER", "EDITOR_IN_CHIEF", "EDITOR", "REPORTER", "AUTHOR", "MODERATOR"];

export default function AdminUsers() {
  const [items, setItems] = useState<UserRow[]>([]);
  const [msg, setMsg] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "REPORTER" });

  const load = useCallback(async () => {
    const res = await fetch("/api/v1/admin/users", { cache: "no-store" });
    const json = await res.json();
    if (json.ok) setItems(json.data.items);
    else setMsg(json.error || "Failed to load (requires user.manage permission)");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/v1/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (json.ok) {
      setShowAdd(false);
      setForm({ name: "", email: "", password: "", role: "REPORTER" });
      setMsg("User created.");
      load();
    } else setMsg(json.error || "Failed");
  }

  async function changeRole(id: string, role: string) {
    const res = await fetch(`/api/v1/admin/users/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const json = await res.json();
    if (!json.ok) setMsg(json.error || "Failed");
    load();
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <h1 className="section-title mr-auto">Team & roles</h1>
        {msg && <span className="text-xs text-slate-600">{msg}</span>}
        <button onClick={() => setShowAdd((v) => !v)} className="rounded bg-brand px-4 py-1.5 text-sm font-bold text-white hover:bg-brand-dark">
          {showAdd ? "Close" : "+ Add member"}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={create} className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" required className="rounded border border-slate-300 px-2 py-1.5" />
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" required className="rounded border border-slate-300 px-2 py-1.5" />
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password (min 8)" required minLength={8} className="rounded border border-slate-300 px-2 py-1.5" />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="rounded border border-slate-300 px-2 py-1.5">
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
          <button className="rounded bg-brand px-4 py-1.5 font-bold text-white hover:bg-brand-dark">Create</button>
        </form>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Member</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Articles</th>
              <th className="px-3 py-2">Joined</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2">
                  <p className="font-semibold">{u.name}</p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={u.role}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                    disabled={!u.active}
                    className="rounded border border-slate-300 px-1.5 py-0.5 text-xs font-bold"
                  >
                    {ROLES.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2 tabular-nums text-slate-500">{u._count.articles}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{formatDateTime(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
