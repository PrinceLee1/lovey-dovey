// src/pages/admin/AdminUsers.tsx
import { useEffect, useState } from "react";
import api from "../../libs/axios";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

type UserRow = {
  id: number; name: string; email: string;
  xp: number; status: 'active'|'deactivated';
  is_admin: boolean; created_at?: string;
};

export default function AdminUsers() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all'|'active'|'deactivated'>('all');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(false);

  async function load(p = page) {
    setLoading(true);
    const params:any = { page: p, sort: 'created_at', dir: 'desc' };
    if (query) params.query = query;
    if (status !== 'all') params.status = status;
    const { data } = await api.get('/admin/users', { params });
    setRows(data.data);
    setPage(data.meta.current_page);
    setLastPage(data.meta.last_page);
    setLoading(false);
  }

  useEffect(() => { load(1); /* eslint-disable-next-line */ }, [status]);
  useEffect(() => {
    const t = setTimeout(() => load(1), 300);
    return () => clearTimeout(t);
  }, [query]);

  async function changeStatus(id:number, action:'deactivate'|'reactivate') {
    await api.patch(`/admin/users/${id}/status`, { action });
    await load();
  }
  async function destroy(id:number) {
    if (!confirm('Delete this user?')) return;
    await api.delete(`/admin/users/${id}`);
    await load();
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            value={query}
            onChange={e=>setQuery(e.target.value)}
            placeholder="Search name or email…"
            className="pl-9 pr-3 py-2 rounded-xl border bg-white w-72"
          />
        </div>
        <select
          value={status}
          onChange={e=>setStatus(e.target.value as any)}
          className="px-3 py-2 rounded-xl border bg-white"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="deactivated">Deactivated</option>
        </select>
      </div>

      <div className="rounded-2xl border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <Th>Name</Th><Th>Email</Th><Th>XP</Th><Th>Status</Th><Th>Admin</Th><Th>Joined</Th><Th></Th>
            </tr>
          </thead>
          <tbody>
          {rows.map(u => (
            <tr key={u.id} className="border-t">
              <Td>{u.name}</Td>
              <Td className="text-gray-600">{u.email}</Td>
              <Td>{u.xp}</Td>
              <Td>
                <span className={`px-2 py-1 rounded-full text-xs ${u.status==='active'?'bg-emerald-50 text-emerald-700':'bg-gray-100 text-gray-700'}`}>
                  {u.status}
                </span>
              </Td>
              <Td>{u.is_admin ? 'Yes' : 'No'}</Td>
              <Td>{u.created_at?.slice(0,10) || '—'}</Td>
              <Td className="text-right">
                {u.status==='active' ? (
                  <button onClick={()=>changeStatus(u.id,'deactivate')} className="px-3 py-1.5 rounded-lg border hover:bg-gray-50 mr-2">Deactivate</button>
                ) : (
                  <button onClick={()=>changeStatus(u.id,'reactivate')} className="px-3 py-1.5 rounded-lg border hover:bg-gray-50 mr-2">Reactivate</button>
                )}
                <button onClick={()=>destroy(u.id)} className="px-3 py-1.5 rounded-lg border hover:bg-red-50 text-red-600">Delete</button>
              </Td>
            </tr>
          ))}
          {!rows.length && !loading && (
            <tr><td colSpan={7} className="text-center py-10 text-gray-500">No users found.</td></tr>
          )}
          {loading && (
            <tr><td colSpan={7} className="text-center py-10 text-gray-500">Loading…</td></tr>
          )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end gap-2">
        <button disabled={page<=1} onClick={()=>load(page-1)} className="px-3 py-2 rounded-lg border disabled:opacity-50">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-sm text-gray-600">Page {page} / {lastPage}</div>
        <button disabled={page>=lastPage} onClick={()=>load(page+1)} className="px-3 py-2 rounded-lg border disabled:opacity-50">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function Th({children}:{children:any}){ return <th className="px-4 py-3 font-medium text-gray-700">{children}</th>;}
function Td({children, className}:{children:any; className?:string}){ return <td className={`px-4 py-3 ${className||''}`}>{children}</td>;}
