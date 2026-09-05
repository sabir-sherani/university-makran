// The "View all" destination for NotificationBell's dropdown (PART 2 §4.3 of
// prompts/phase-4.md) — one shared full-page list for every portal role
// instead of five near-identical pages, reusing NotificationBell's own row
// markup and day-grouping so there is exactly one implementation of both.
import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import axios from 'axios';
import { CATEGORY_ICON, NotificationRow, groupByDay } from '../../components/portal/NotificationBell.js';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const CATEGORIES = Object.keys(CATEGORY_ICON);
const ROLE_LABEL = { hod: 'HOD', teacher: 'Teacher', student: 'Student', exam: 'Examination', finance: 'Finance' };
const VALID_ROLES = Object.keys(ROLE_LABEL);

export default function NotificationsPage() {
  const router = useRouter();
  const role = VALID_ROLES.includes(router.query.role) ? router.query.role : '';
  const [token, setToken] = useState(null); // null = not checked yet, '' = checked, none found

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [category, setCategory] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!role) return;
    setToken(localStorage.getItem(`${role}Token`) || '');
  }, [role]);

  const authHeaders = useCallback(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  const fetchList = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = { page, limit: 25 };
      if (category) params.category = category;
      if (unreadOnly) params.unreadOnly = 'true';
      const { data } = await axios.get(`${API}/notifications`, { ...authHeaders(), params });
      setItems(data.data || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch { /* silent — list just stays empty */ }
    setLoading(false);
  }, [token, page, category, unreadOnly, authHeaders]);

  useEffect(() => { fetchList(); }, [fetchList]);
  useEffect(() => { setPage(1); }, [category, unreadOnly]);

  async function openNotification(n) {
    if (!n.isRead) {
      try {
        await axios.patch(`${API}/notifications/${n._id}/read`, {}, authHeaders());
        setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
      } catch { /* still navigate */ }
    }
    if (n.link) router.push(n.link);
  }

  async function markAllRead() {
    try {
      await axios.patch(`${API}/notifications/read-all`, {}, authHeaders());
      setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    } catch { /* silent */ }
  }

  if (!role || token === '') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Head><title>Notifications — University of Makran</title></Head>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm text-center">
          <p className="text-gray-600 text-sm mb-4">
            {role ? `You're not signed in to the ${ROLE_LABEL[role]} portal.` : 'Open this page from a portal\'s notification bell.'}
          </p>
          <Link href="/" className="text-indigo-600 font-semibold text-sm hover:text-indigo-800">Go home</Link>
        </div>
      </div>
    );
  }

  const groups = groupByDay(items);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <Head><title>Notifications — {ROLE_LABEL[role]} Portal</title></Head>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href={`/portal/${role}`} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">← Back to portal</Link>
            <h1 className="text-2xl font-bold text-gray-800 mt-1">Notifications</h1>
          </div>
          <button onClick={markAllRead} className="px-4 py-2 min-h-11 text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">
            Mark all read
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-4 p-3 flex flex-wrap items-center gap-2">
          {['', ...CATEGORIES].map((c) => (
            <button key={c || 'all'} onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${category === c ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {c ? `${CATEGORY_ICON[c]} ${c}` : 'All'}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-1.5 text-xs font-medium text-gray-500 cursor-pointer">
            <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} className="rounded" />
            Unread only
          </label>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <p className="text-center text-sm text-gray-400 py-12">Loading…</p>
          ) : groups.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-12">No notifications.</p>
          ) : groups.map((g) => (
            <div key={g.label} className="border-b border-gray-50 last:border-0">
              <p className="px-4 pt-3 pb-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{g.label}</p>
              {g.items.map((n) => <NotificationRow key={n._id} n={n} onOpen={openNotification} />)}
            </div>
          ))}
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-5 text-sm">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed">
              Previous
            </button>
            <span className="text-gray-500">Page {page} of {pages} ({total} total)</span>
            <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed">
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
