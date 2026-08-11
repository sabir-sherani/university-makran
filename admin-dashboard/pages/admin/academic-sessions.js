import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminHeader from '../../components/AdminHeader';
import axios from 'axios';
import {
  LuCalendarRange, LuPencil, LuArchive, LuArchiveRestore,
  LuPlus, LuX, LuCheckCircle,
} from 'react-icons/lu';

const API = process.env.NEXT_PUBLIC_API_URL;

const STATUS_STYLES = {
  active:    { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  upcoming:  { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
  completed: { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
  archived:  { bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB' },
};

const emptyForm = { name: '', startYear: '', endYear: '', status: 'active', notes: '' };

function getAdminToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('adminToken') || localStorage.getItem('token') || '';
}
function authHeaders() {
  return { headers: { Authorization: `Bearer ${getAdminToken()}` } };
}

export default function AcademicSessions() {
  const router = useRouter();
  const [sessions, setSessions]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [formData, setFormData]       = useState(emptyForm);
  const [editId, setEditId]           = useState(null);
  const [saving, setSaving]           = useState(false);
  const [errors, setErrors]           = useState({});
  const [flash, setFlash]             = useState({ text: '', ok: true });

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('adminToken')) {
      router.replace('/');
      return;
    }
    fetchSessions();
  }, [showArchived]);

  async function fetchSessions() {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/portal/admin/sessions`, {
        ...authHeaders(),
        params: showArchived ? { includeArchived: 'true' } : {},
      });
      setSessions(res.data || []);
    } catch { setSessions([]); }
    setLoading(false);
  }

  function showFlash(text, ok = true) {
    setFlash({ text, ok });
    setTimeout(() => setFlash({ text: '', ok: true }), 3500);
  }

  function handleField(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  }

  function validate() {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Session name is required (e.g. 2028-2032).';
    else if (!/^\d{4}-\d{4}$/.test(formData.name.trim())) errs.name = 'Use the format YYYY-YYYY, e.g. 2028-2032.';
    return errs;
  }

  function resetForm() {
    setFormData(emptyForm);
    setEditId(null);
    setErrors({});
  }

  function startEdit(s) {
    setEditId(s._id);
    setFormData({
      name: s.name || '', startYear: s.startYear || '', endYear: s.endYear || '',
      status: s.status || 'active', notes: s.notes || '',
    });
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        startYear: formData.startYear.trim(),
        endYear: formData.endYear.trim(),
        status: formData.status,
        notes: formData.notes.trim(),
        isActive: formData.status !== 'archived',
      };
      if (editId) {
        await axios.patch(`${API}/portal/admin/sessions/${editId}`, payload, authHeaders());
        showFlash('Academic session updated.');
      } else {
        await axios.post(`${API}/portal/admin/sessions`, payload, authHeaders());
        showFlash('Academic session created. It will now appear in registration dropdowns.');
      }
      resetForm();
      fetchSessions();
    } catch (err) {
      showFlash(err.response?.data?.message || 'Error saving academic session.', false);
    }
    setSaving(false);
  }

  async function handleArchive(id) {
    if (!confirm('Archive this session? It will disappear from student registration dropdowns.')) return;
    try {
      await axios.patch(`${API}/portal/admin/sessions/${id}/archive`, {}, authHeaders());
      showFlash('Session archived.');
      fetchSessions();
    } catch (err) {
      showFlash(err.response?.data?.message || 'Error archiving session.', false);
    }
  }

  async function handleRestore(id) {
    try {
      await axios.patch(`${API}/portal/admin/sessions/${id}/restore`, {}, authHeaders());
      showFlash('Session restored to active.');
      fetchSessions();
    } catch (err) {
      showFlash(err.response?.data?.message || 'Error restoring session.', false);
    }
  }

  return (
    <>
      <Head><title>Academic Sessions — Admin Dashboard</title></Head>
      <AdminHeader />

      <div className="ml-0 lg:ml-56 min-h-screen p-6 lg:p-8" style={{ background: '#F1F5FF' }}>

        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h2 className="text-3xl font-bold flex items-center gap-3" style={{ color: '#041476' }}>
              <LuCalendarRange size={28} /> Academic Sessions
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Add new intake sessions (e.g. 2025-2029) — they appear immediately in the student registration form's Academic Session dropdown.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-600 select-none cursor-pointer">
            <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} />
            Show archived
          </label>
        </div>

        {flash.text && (
          <div className={`mb-6 px-5 py-3.5 rounded-xl text-sm font-medium border flex items-center gap-2 ${flash.ok ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
            <LuCheckCircle size={16} /> {flash.text}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">

          {/* ── FORM ── */}
          <div className="xl:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-6">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between"
                style={{ background: 'linear-gradient(135deg, #041476, #0d1e9e)' }}>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editId ? 'Edit Academic Session' : 'Add New Academic Session'}
                  </h3>
                  <p className="text-white/50 text-xs mt-0.5">
                    {editId ? 'Update the session details below' : 'Create a new intake session'}
                  </p>
                </div>
                {editId && (
                  <button onClick={resetForm} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                    <LuX size={15} />
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Session Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="name" value={formData.name} onChange={handleField}
                    placeholder="e.g. 2028-2032"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors outline-none focus:ring-2 focus:ring-blue-100 ${errors.name ? 'border-red-400' : 'border-gray-200 focus:border-primary'}`}
                  />
                  {errors.name
                    ? <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                    : <p className="text-xs text-gray-400 mt-1">Format: YYYY-YYYY. This exact text is what students see and select at registration.</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Start Year</label>
                    <input
                      name="startYear" value={formData.startYear} onChange={handleField}
                      placeholder="2028"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">End Year</label>
                    <input
                      name="endYear" value={formData.endYear} onChange={handleField}
                      placeholder="2032"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
                  <select
                    name="status" value={formData.status} onChange={handleField}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-colors"
                  >
                    <option value="active">Active — open for registration</option>
                    <option value="upcoming">Upcoming — not open yet</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived — hidden everywhere</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Only sessions marked <strong>Active</strong> appear in the student registration dropdown.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Notes <span className="text-gray-400 font-normal text-xs">(optional, internal only)</span>
                  </label>
                  <textarea
                    name="notes" value={formData.notes} onChange={handleField}
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit" disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:translate-y-0"
                  style={{ background: 'linear-gradient(135deg, #041476, #0d1e9e)' }}
                >
                  {saving ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</>
                  ) : editId ? (
                    <><LuPencil size={15} /> Update Session</>
                  ) : (
                    <><LuPlus size={15} /> Add Session</>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* ── LIST ── */}
          <div className="xl:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="px-6 py-5 border-b border-gray-100">
                <h3 className="text-base font-bold" style={{ color: '#041476' }}>
                  All Sessions
                  <span className="ml-2 text-sm font-normal text-gray-400">({sessions.length})</span>
                </h3>
              </div>

              <div className="p-6">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#041476', borderTopColor: 'transparent' }} />
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <LuCalendarRange size={40} className="mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No academic sessions found.</p>
                    <p className="text-sm mt-1">Use the form to add one.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sessions.map(s => {
                      const style = STATUS_STYLES[s.status] || STATUS_STYLES.active;
                      return (
                        <div key={s._id}
                          className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-200 group"
                        >
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: style.bg }}>
                            <LuCalendarRange size={20} style={{ color: style.color }} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                                style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}>
                                {s.status}
                              </span>
                            </div>
                            <h4 className="font-bold text-sm text-gray-800">{s.name}</h4>
                            {s.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{s.notes}</p>}
                          </div>

                          <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEdit(s)}
                              className="p-2 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                              title="Edit"
                            >
                              <LuPencil size={14} />
                            </button>
                            {s.status === 'archived' ? (
                              <button
                                onClick={() => handleRestore(s._id)}
                                className="p-2 rounded-lg text-green-600 bg-green-50 hover:bg-green-100 transition-colors"
                                title="Restore"
                              >
                                <LuArchiveRestore size={14} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleArchive(s._id)}
                                className="p-2 rounded-lg text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
                                title="Archive"
                              >
                                <LuArchive size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
