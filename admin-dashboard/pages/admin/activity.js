import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminHeader from '../../components/AdminHeader';
import axios from 'axios';
import { LuHistory, LuSearch, LuChevronLeft, LuChevronRight, LuX } from 'react-icons/lu';

const API = process.env.NEXT_PUBLIC_API_URL;

const ENTITY_TYPES = [
  'Student', 'Teacher', 'HOD', 'ExaminationStaff', 'FinanceStaff',
  'Result', 'ResultSheet', 'Attendance', 'CorrectionRequest',
  'FeeStructure', 'FeeChallan', 'AcademicSession', 'Semester',
];
const ACTOR_ROLES = ['admin', 'teacher', 'hod', 'exam', 'finance', 'student'];

function getAdminToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('adminToken') || localStorage.getItem('token') || '';
}
function authHeaders() {
  return { headers: { Authorization: `Bearer ${getAdminToken()}` } };
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function ActionBadge({ action }) {
  const isDestructive = /delete|archive|reject|cancel|suspend/i.test(action);
  const isPositive = /create|approve|restore|paid|finalize|publish/i.test(action);
  const cls = isDestructive
    ? 'bg-red-50 text-red-700'
    : isPositive
      ? 'bg-green-50 text-green-700'
      : 'bg-blue-50 text-blue-700';
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>{action}</span>;
}

function DiffView({ before, after }) {
  if (!before && !after) return <span className="text-gray-400 text-xs">—</span>;
  const keys = [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])];
  if (!keys.length) return <span className="text-gray-400 text-xs">—</span>;
  return (
    <div className="space-y-1">
      {keys.map((k) => {
        const b = before ? before[k] : undefined;
        const a = after ? after[k] : undefined;
        const changed = JSON.stringify(b) !== JSON.stringify(a);
        return (
          <div key={k} className="text-xs flex gap-1.5 flex-wrap">
            <span className="font-mono text-gray-500">{k}:</span>
            {b !== undefined && (
              <span className={changed ? 'line-through text-red-400' : 'text-gray-500'}>{String(b)}</span>
            )}
            {changed && a !== undefined && <span className="text-gray-400">→</span>}
            {a !== undefined && <span className={changed ? 'text-green-700 font-medium' : 'text-gray-500'}>{String(a)}</span>}
          </div>
        );
      })}
    </div>
  );
}

export default function ActivityLog() {
  const router = useRouter();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({ entityType: '', actorRole: '', from: '', to: '', search: '' });
  const [entityHistory, setEntityHistory] = useState(null); // { type, id, logs } | null

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('adminToken')) {
      router.replace('/');
    }
  }, []);

  const load = useCallback(async (pageNum = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = { page: pageNum, limit: 25 };
      if (filters.entityType) params.entityType = filters.entityType;
      if (filters.actorRole)  params.actorRole  = filters.actorRole;
      if (filters.from)       params.from       = filters.from;
      if (filters.to)         params.to          = filters.to;
      if (filters.search)     params.search     = filters.search;
      const { data } = await axios.get(`${API}/portal/admin/audit-logs`, { ...authHeaders(), params });
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setPage(data.page || 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load activity log.');
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => { load(1); }, [load]);

  async function viewEntityHistory(entityType, entityId) {
    try {
      const { data } = await axios.get(`${API}/portal/admin/audit-logs/entity/${entityType}/${entityId}`, authHeaders());
      setEntityHistory({ type: entityType, id: entityId, logs: data });
    } catch {
      setEntityHistory({ type: entityType, id: entityId, logs: [] });
    }
  }

  function handleFilterChange(e) {
    const { name, value } = e.target;
    setFilters((p) => ({ ...p, [name]: value }));
  }

  function clearFilters() {
    setFilters({ entityType: '', actorRole: '', from: '', to: '', search: '' });
  }

  return (
    <>
      <Head><title>Activity Log — Admin Dashboard</title></Head>
      <AdminHeader />

      <div className="ml-0 lg:ml-56 min-h-screen bg-gray-50 p-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #041476, #0d2a90)' }}>
            <LuHistory size={20} />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-primary">Activity / Audit Trail</h2>
            <p className="text-sm text-gray-500 mt-1">Every account, academic, and financial change made across the portal.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Search</label>
              <div className="relative">
                <LuSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input name="search" value={filters.search} onChange={handleFilterChange}
                  placeholder="Action, actor, or record…"
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Record Type</label>
              <select name="entityType" value={filters.entityType} onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                <option value="">All types</option>
                {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Actor Role</label>
              <select name="actorRole" value={filters.actorRole} onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                <option value="">All roles</option>
                {ACTOR_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">From</label>
                <input type="date" name="from" value={filters.from} onChange={handleFilterChange}
                  className="w-full px-2 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">To</label>
                <input type="date" name="to" value={filters.to} onChange={handleFilterChange}
                  className="w-full px-2 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center mt-4">
            <button onClick={clearFilters} className="text-xs font-semibold text-gray-500 hover:text-primary transition-colors">
              Clear filters
            </button>
            <span className="text-xs text-gray-400">{total} record{total !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {error && <div className="mb-4 px-4 py-2 rounded-xl text-sm font-medium bg-red-50 text-red-700 border border-red-200">{error}</div>}

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-16 text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Loading activity…</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-16 text-center">
              <LuHistory size={40} className="mx-auto mb-3 text-gray-200" />
              <p className="text-gray-500 font-semibold">No activity found</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting the filters above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <th className="px-5 py-3">When</th>
                    <th className="px-5 py-3">Actor</th>
                    <th className="px-5 py-3">Action</th>
                    <th className="px-5 py-3">Record</th>
                    <th className="px-5 py-3">Changes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50/50 transition-colors align-top">
                      <td className="px-5 py-3 whitespace-nowrap text-gray-500 text-xs">{formatDate(log.createdAt)}</td>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-gray-800 text-xs">{log.actorName || '—'}</p>
                        <p className="text-[11px] text-gray-400">{log.actorRole}</p>
                      </td>
                      <td className="px-5 py-3"><ActionBadge action={log.action} /></td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => viewEntityHistory(log.entityType, log.entityId)}
                          className="text-left hover:underline"
                          title="View full history for this record"
                        >
                          <p className="font-medium text-gray-700 text-xs">{log.entityType}</p>
                          <p className="text-[11px] text-gray-400 truncate max-w-[160px]">{log.entityLabel || log.entityId}</p>
                        </button>
                      </td>
                      <td className="px-5 py-3 max-w-xs">
                        <DiffView before={log.before} after={log.after} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
              <button
                disabled={page <= 1}
                onClick={() => load(page - 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                <LuChevronLeft size={13} /> Prev
              </button>
              <span className="text-xs text-gray-400">Page {page} of {pages}</span>
              <button
                disabled={page >= pages}
                onClick={() => load(page + 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Next <LuChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Entity history modal */}
      {entityHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"
              style={{ background: 'linear-gradient(135deg, #041476, #0d2a90)' }}>
              <div>
                <h3 className="text-white font-bold text-base">{entityHistory.type} history</h3>
                <p className="text-white/50 text-xs font-mono">{entityHistory.id}</p>
              </div>
              <button onClick={() => setEntityHistory(null)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                <LuX size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {entityHistory.logs.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-10">No recorded history for this item.</p>
              ) : entityHistory.logs.map((log) => (
                <div key={log._id} className="p-3 rounded-xl border border-gray-100 bg-gray-50">
                  <div className="flex items-center justify-between mb-1.5">
                    <ActionBadge action={log.action} />
                    <span className="text-[11px] text-gray-400">{formatDate(log.createdAt)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-1.5">by <span className="font-semibold text-gray-700">{log.actorName || 'system'}</span> ({log.actorRole})</p>
                  <DiffView before={log.before} after={log.after} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
