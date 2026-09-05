// HOD Notices & Calendar section — existing Dept Notices CRUD, now paired
// with a month calendar overlaying exam dates, semester start/end, notices,
// and make-up classes (Phase 6, 6.1). Extracted out of hod.js per hard
// rule 9; the notices CRUD behavior itself is unchanged from before Phase 6.
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Alert, inputCls, labelCls, Spinner } from '../ui.js';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const EVENT_ICON = { exam: '📝', 'semester-start': '🚀', 'semester-end': '🏁', notice: '📢', 'makeup-class': '🔁' };
const EVENT_LABEL = { exam: 'Exam', 'semester-start': 'Semester Start', 'semester-end': 'Semester End', notice: 'Notice', 'makeup-class': 'Make-up Class' };

function CalendarPanel({ hod, token }) {
  function headers() { return { headers: { Authorization: `Bearer ${token}` } }; }
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/portal/hod/calendar`, { params: { month }, ...headers() });
      setData(data);
    } catch { setData(null); }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, token]);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
        <h3 className="font-bold text-gray-800">Calendar</h3>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs" />
      </div>
      {loading ? <div className="p-6"><Spinner /></div> : !data || data.events.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">No exams, semester dates, notices, or make-up classes this month.</div>
      ) : (
        <div className="divide-y divide-gray-50">
          {data.events.map((ev, i) => (
            <div key={i} className="flex items-center gap-3 px-6 py-3">
              <span className="text-lg">{EVENT_ICON[ev.type] || '•'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{ev.title}</p>
                <p className="text-xs text-gray-400">{EVENT_LABEL[ev.type] || ev.type} · {new Date(ev.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const emptyNoticeForm = () => ({
  title: '', body: '', priority: 'normal', isPublished: true, publishAt: '', expiresAt: '',
  audience: { programs: [], semesters: [], roles: [] },
});

export default function NoticesCalendarSection({ hod, token }) {
  function headers() { return { headers: { Authorization: `Bearer ${token}` } }; }

  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyNoticeForm());
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [noticePrograms, setNoticePrograms] = useState([]);
  const [files, setFiles] = useState([]);
  const [removeAttachments, setRemoveAttachments] = useState([]);

  const fetchNotices = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/portal/hod/notices`, headers());
      setNotices(data || []);
    } catch { setNotices([]); }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => { fetchNotices(); }, [fetchNotices]);
  useEffect(() => {
    if (hod?.departmentId) {
      axios.get(`${API}/lookups/programs`, { params: { department: hod.departmentId } })
        .then(({ data }) => setNoticePrograms(data || [])).catch(() => setNoticePrograms([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hod]);

  const openNew = () => {
    setEditing(null); setForm(emptyNoticeForm()); setFiles([]); setRemoveAttachments([]);
    setError(''); setSuccess(''); setShowForm(true);
  };

  const openEdit = (n) => {
    setEditing(n);
    setForm({
      title: n.title, body: n.body || '', priority: n.priority, isPublished: n.isPublished,
      publishAt: n.publishAt ? new Date(n.publishAt).toISOString().slice(0, 10) : '',
      expiresAt: n.expiresAt ? new Date(n.expiresAt).toISOString().slice(0, 10) : '',
      audience: {
        programs: (n.audience?.programs || []).map(String),
        semesters: n.audience?.semesters || [],
        roles: n.audience?.roles || [],
      },
    });
    setFiles([]); setRemoveAttachments([]); setError(''); setSuccess(''); setShowForm(true);
  };

  function toggleAudienceValue(key, value) {
    setForm((f) => {
      const current = f.audience[key];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...f, audience: { ...f.audience, [key]: next } };
    });
  }

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('body', form.body);
      fd.append('priority', form.priority);
      fd.append('isPublished', String(form.isPublished));
      if (form.publishAt) fd.append('publishAt', form.publishAt);
      if (form.expiresAt) fd.append('expiresAt', form.expiresAt);
      fd.append('audience', JSON.stringify(form.audience));
      files.forEach((f) => fd.append('files', f));
      if (removeAttachments.length) fd.append('removeAttachments', JSON.stringify(removeAttachments));

      if (editing) {
        const { data } = await axios.patch(`${API}/portal/hod/notices/${editing._id}`, fd, headers());
        setNotices((prev) => prev.map((n) => (n._id === editing._id ? data : n)));
        setSuccess('Notice updated.');
      } else {
        const { data } = await axios.post(`${API}/portal/hod/notices`, fd, headers());
        setNotices((prev) => [data, ...prev]);
        setSuccess('Notice posted.');
      }
      setShowForm(false); setEditing(null); setFiles([]); setRemoveAttachments([]);
    } catch (err) { setError(err.response?.data?.message || 'Failed to save.'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this notice? This cannot be undone.')) return;
    try {
      await axios.delete(`${API}/portal/hod/notices/${id}`, headers());
      setNotices((prev) => prev.filter((n) => n._id !== id));
    } catch (err) { alert(err.response?.data?.message || 'Failed to delete.'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-indigo-900">Notices &amp; Calendar</h2>
          <p className="text-sm text-gray-500 mt-0.5">Post notices for students of your department, and see exams, semester dates, and make-up classes on one calendar.</p>
        </div>
        <button onClick={openNew} className="shrink-0 bg-indigo-700 text-white px-5 py-2.5 min-h-11 rounded-xl text-sm font-bold hover:bg-indigo-800 transition">+ New Notice</button>
      </div>

      <CalendarPanel hod={hod} token={token} />

      {showForm && (
        <div className="bg-white rounded-2xl shadow p-6 border border-indigo-100">
          <h3 className="font-bold text-indigo-800 mb-4">{editing ? 'Edit Notice' : 'Post New Notice'}</h3>
          <Alert type="error" msg={error} />
          <Alert type="success" msg={success} />
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className={labelCls}>Title *</label>
              <input type="text" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="e.g. Schedule Change for Semester 3" />
            </div>
            <div>
              <label className={labelCls}>Message / Details</label>
              <textarea rows={5} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} className={inputCls} placeholder="Full notice content (optional)" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Priority</label>
                <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} className={inputCls}>
                  <option value="normal">🔵 Normal</option>
                  <option value="important">🟠 Important</option>
                  <option value="urgent">🔴 Urgent</option>
                </select>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <input type="checkbox" id="noticePublished" checked={form.isPublished} onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))} className="w-4 h-4 accent-indigo-700" />
                <label htmlFor="noticePublished" className="text-sm font-medium text-gray-700">Publish immediately (visible to students)</label>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Publish Date</label>
                <input type="date" value={form.publishAt} onChange={(e) => setForm((f) => ({ ...f, publishAt: e.target.value }))} className={inputCls} />
                <p className="text-xs text-gray-400 mt-1">Leave blank to publish immediately.</p>
              </div>
              <div>
                <label className={labelCls}>Expiry Date</label>
                <input type="date" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} className={inputCls} />
                <p className="text-xs text-gray-400 mt-1">Leave blank to never expire.</p>
              </div>
            </div>
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Audience — leave a group empty to target everyone in your department</p>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1.5">Programs</p>
                {noticePrograms.length === 0 ? <p className="text-xs text-gray-400">No programs found for your department.</p> : (
                  <div className="flex flex-wrap gap-2">
                    {noticePrograms.map((p) => (
                      <label key={p._id} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition ${form.audience.programs.includes(p._id) ? 'bg-indigo-700 text-white border-indigo-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                        <input type="checkbox" className="hidden" checked={form.audience.programs.includes(p._id)} onChange={() => toggleAudienceValue('programs', p._id)} />
                        {p.title}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1.5">Semesters</p>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                    <label key={sem} className={`w-9 h-9 flex items-center justify-center rounded-lg text-xs font-bold border cursor-pointer transition ${form.audience.semesters.includes(sem) ? 'bg-indigo-700 text-white border-indigo-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                      <input type="checkbox" className="hidden" checked={form.audience.semesters.includes(sem)} onChange={() => toggleAudienceValue('semesters', sem)} />
                      {sem}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className={labelCls}>Attach Files</label>
              <input type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx" onChange={(e) => setFiles(Array.from(e.target.files || []))}
                className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-semibold hover:file:bg-indigo-100" />
              {files.length > 0 && <p className="text-xs text-gray-500 mt-1">{files.length} file(s) selected: {files.map((f) => f.name).join(', ')}</p>}
              {editing?.attachments?.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-semibold text-gray-500">Existing attachments (check to remove):</p>
                  {editing.attachments.map((att, i) => (
                    <label key={i} className="flex items-center gap-2 text-xs text-gray-600">
                      <input type="checkbox" checked={removeAttachments.includes(att.fileUrl)}
                        onChange={() => setRemoveAttachments((prev) => (prev.includes(att.fileUrl) ? prev.filter((u) => u !== att.fileUrl) : [...prev, att.fileUrl]))}
                        className="w-3.5 h-3.5 accent-red-600" />
                      <span className={removeAttachments.includes(att.fileUrl) ? 'line-through text-red-500' : ''}>{att.fileName || att.fileUrl}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-800 transition disabled:opacity-60">
                {saving ? 'Saving…' : editing ? '💾 Update Notice' : '📢 Post Notice'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="px-6 py-2.5 rounded-xl text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 transition">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <Spinner /> : notices.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-10 text-center">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-gray-500 font-medium">No notices yet.</p>
          <p className="text-gray-400 text-sm mt-1">Click &ldquo;+ New Notice&rdquo; above to post one for your students.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notices.map((n) => {
            const priorityStyle = n.priority === 'urgent' ? 'border-l-4 border-red-500 bg-red-50'
              : n.priority === 'important' ? 'border-l-4 border-orange-400 bg-orange-50'
              : 'border-l-4 border-indigo-300 bg-white';
            const priorityLabel = n.priority === 'urgent' ? '🔴 Urgent' : n.priority === 'important' ? '🟠 Important' : '🔵 Normal';
            const audiencePrograms = (n.audience?.programs || []).map((id) => noticePrograms.find((p) => p._id === id)?.title).filter(Boolean);
            const audienceSemesters = n.audience?.semesters || [];
            const isFuturePublish = n.publishAt && new Date(n.publishAt) > new Date();
            return (
              <div key={n._id} className={`rounded-2xl shadow-sm p-5 ${priorityStyle}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-bold">{priorityLabel}</span>
                      {!n.isPublished && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-200 text-gray-600">Draft</span>}
                      {isFuturePublish && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">Scheduled</span>}
                      <span className="text-xs text-gray-400">Publishes {new Date(n.publishAt || n.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      {n.expiresAt && <span className="text-xs text-gray-400">· Expires {new Date(n.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                    </div>
                    <h3 className="font-bold text-gray-900 text-base">{n.title}</h3>
                    {n.body && <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{n.body}</p>}
                    {(audiencePrograms.length > 0 || audienceSemesters.length > 0) && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {audiencePrograms.map((p) => <span key={p} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{p}</span>)}
                        {audienceSemesters.map((s) => <span key={s} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Sem {s}</span>)}
                      </div>
                    )}
                    {n.attachments?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {n.attachments.map((att, i) => (
                          <a key={i} href={att.fileUrl.startsWith('http') ? att.fileUrl : `${API.replace(/\/api$/, '')}${att.fileUrl}`} target="_blank" rel="noreferrer"
                            className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg hover:bg-indigo-100 transition">
                            📎 {att.fileName || 'attachment'}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => openEdit(n)} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-indigo-300 text-indigo-700 hover:bg-indigo-50 transition">Edit</button>
                    <button onClick={() => handleDelete(n._id)} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition">Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
