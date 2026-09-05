// One notification bell, used unchanged in every portal (hod.js, teacher.js,
// student.js, exam.js, finance.js) — see PART 2 §4.3 of prompts/phase-4.md.
// Each portal just passes its own `token` and the JWT `role` string it signs
// in with ('hod' | 'teacher' | 'student' | 'exam' | 'finance'); every other
// role-specific detail (which API base, which localStorage key) stays out of
// this component entirely so there is exactly one implementation to maintain.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

export const CATEGORY_ICON = {
  attendance: '📋', document: '📄', approval: '✅', timetable: '🗓️', result: '🧾', notice: '📢', system: '⚙️',
};
const CATEGORIES = Object.keys(CATEGORY_ICON);
const POLL_MS = 60000;

function dayLabel(dateStr) {
  const d = new Date(dateStr);
  const startOf = (x) => { const y = new Date(x); y.setHours(0, 0, 0, 0); return y.getTime(); };
  const diffDays = Math.round((startOf(new Date()) - startOf(d)) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Exported so the "View all" full-page list (pages/portal/notifications.js)
// renders the exact same day-grouping instead of re-deriving it.
export function groupByDay(items) {
  const order = [];
  const map = new Map();
  for (const n of items) {
    const label = dayLabel(n.createdAt);
    if (!map.has(label)) { map.set(label, []); order.push(label); }
    map.get(label).push(n);
  }
  return order.map((label) => ({ label, items: map.get(label) }));
}

function priorityBadgeCls(priority) {
  if (priority === 'urgent') return 'bg-red-100 text-red-700';
  if (priority === 'important') return 'bg-amber-100 text-amber-700';
  return 'bg-gray-100 text-gray-500';
}

// Exported so pages/portal/notifications.js renders identical rows instead
// of a second hand-written copy of this markup.
export function NotificationRow({ n, onOpen }) {
  return (
    <button onClick={() => onOpen(n)}
      className="w-full flex items-start gap-2.5 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors">
      <span className="text-base leading-none mt-0.5 shrink-0">{CATEGORY_ICON[n.category] || '🔔'}</span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-1.5">
          <span className={`text-sm truncate ${n.isRead ? 'text-gray-600' : 'font-semibold text-gray-900'}`}>{n.title}</span>
          {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />}
        </span>
        {n.body && <span className="block text-xs text-gray-400 line-clamp-2 mt-0.5">{n.body}</span>}
        <span className={`inline-block mt-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded ${priorityBadgeCls(n.priority)}`}>
          {n.priority}
        </span>
      </span>
    </button>
  );
}

export default function NotificationBell({ api, token, role }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('');
  const panelRef = useRef(null);

  const authHeaders = useCallback(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  const fetchUnreadCount = useCallback(async () => {
    if (!token || (typeof document !== 'undefined' && document.hidden)) return;
    try {
      const { data } = await axios.get(`${api}/notifications/unread-count`, authHeaders());
      setUnreadCount(data.count || 0);
    } catch { /* a failed poll shouldn't disrupt the portal */ }
  }, [api, token, authHeaders]);

  // Poll every 60s, paused while the tab is hidden (no point spending a
  // request on a badge nobody can see) and resumed with an immediate refresh
  // the moment it becomes visible again.
  useEffect(() => {
    if (!token) return undefined;
    fetchUnreadCount();
    const id = setInterval(fetchUnreadCount, POLL_MS);
    const onVisible = () => { if (!document.hidden) fetchUnreadCount(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [token, fetchUnreadCount]);

  const fetchList = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = { limit: 20 };
      if (category) params.category = category;
      const { data } = await axios.get(`${api}/notifications`, { ...authHeaders(), params });
      setItems(data.data || []);
    } catch { /* silent — the dropdown just shows "no notifications" */ }
    setLoading(false);
  }, [api, token, category, authHeaders]);

  useEffect(() => { if (open) fetchList(); }, [open, fetchList]);

  useEffect(() => {
    function onDocClick(e) { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); }
    if (open) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  async function openNotification(n) {
    if (!n.isRead) {
      try {
        await axios.patch(`${api}/notifications/${n._id}/read`, {}, authHeaders());
        setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch { /* still navigate even if marking-read failed */ }
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  async function markAllRead() {
    try {
      await axios.patch(`${api}/notifications/read-all`, {}, authHeaders());
      setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  }

  function viewAll() {
    setOpen(false);
    router.push(`/portal/notifications?role=${role}`);
  }

  if (!token) return null;

  const groups = groupByDay(items);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative flex items-center justify-center w-10 h-10 min-h-11 rounded-xl bg-white border border-gray-200 shadow-sm text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[28rem] flex flex-col bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
            <p className="font-bold text-gray-800 text-sm">Notifications</p>
            <button onClick={markAllRead} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">Mark all read</button>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-100 overflow-x-auto shrink-0">
            {['', ...CATEGORIES].map((c) => (
              <button key={c || 'all'} onClick={() => setCategory(c)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${category === c ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {c ? `${CATEGORY_ICON[c]} ${c}` : 'All'}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="text-center text-sm text-gray-400 py-8">Loading…</p>
            ) : groups.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">No notifications.</p>
            ) : groups.map((g) => (
              <div key={g.label}>
                <p className="px-4 pt-3 pb-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{g.label}</p>
                {g.items.map((n) => <NotificationRow key={n._id} n={n} onOpen={openNotification} />)}
              </div>
            ))}
          </div>

          <button onClick={viewAll}
            className="shrink-0 px-4 py-2.5 text-center text-xs font-semibold text-indigo-600 hover:bg-gray-50 border-t border-gray-100">
            View all
          </button>
        </div>
      )}
    </div>
  );
}
