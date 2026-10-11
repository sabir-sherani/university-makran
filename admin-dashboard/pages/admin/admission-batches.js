import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminHeader from '../../components/AdminHeader';
import axios from 'axios';
import formatApiError from '../../utils/formatApiError';
import { LuCalendarRange, LuPencil, LuTrash2, LuPlus, LuX, LuCheckCircle } from 'react-icons/lu';

const API = process.env.NEXT_PUBLIC_API_URL;

const emptyForm = { name: '', lastDate: '', isOpen: true, notes: '' };

function getAdminToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('adminToken') || localStorage.getItem('token') || '';
}
function authHeaders() {
  return { headers: { Authorization: `Bearer ${getAdminToken()}` } };
}

// <input type="date"> speaks YYYY-MM-DD only.
function toInputDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '' : dt.toISOString().split('T')[0];
}
function prettyDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime())
    ? '—'
    : dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function AdmissionBatches() {
  const router = useRouter();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState({ text: '', ok: true });

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('adminToken')) {
      router.replace('/');
      return;
    }
    fetchBatches();
  }, []);

  async function fetchBatches() {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admission-batches`, authHeaders());
      setBatches(res.data || []);
    } catch { setBatches([]); }
    setLoading(false);
  }

  function say(text, ok = true) {
    setFlash({ text, ok });
    setTimeout(() => setFlash({ text: '', ok: true }), 4000);
  }

  function startCreate() {
    setFormData(emptyForm);
    setEditId(null);
    setShowForm(true);
  }
  function startEdit(b) {
    setFormData({
      name: b.name || '',
      lastDate: toInputDate(b.lastDate),
      isOpen: !!b.isOpen,
      notes: b.notes || '',
    });
    setEditId(b._id);
    setShowForm(true);
  }
  function cancel() {
    setShowForm(false);
    setEditId(null);
    setFormData(emptyForm);
  }

  async function save(e) {
    e.preventDefault();
    if (!formData.name.trim()) return say('Batch name is required.', false);
    if (!formData.lastDate)    return say('Last date is required.', false);

    setSaving(true);
    try {
      if (editId) await axios.put(`${API}/admission-batches/${editId}`, formData, authHeaders());
      else        await axios.post(`${API}/admission-batches`, formData, authHeaders());
      say(editId ? 'Batch updated.' : 'Batch created.');
      cancel();
      fetchBatches();
    } catch (err) {
      say(formatApiError(err, 'Could not save the batch.'), false);
    }
    setSaving(false);
  }

  async function toggleOpen(b) {
    try {
      await axios.put(`${API}/admission-batches/${b._id}`, { isOpen: !b.isOpen }, authHeaders());
      say(!b.isOpen ? `Batch ${b.name} is now open — any other open batch was closed.` : `Batch ${b.name} closed.`);
      fetchBatches();
    } catch (err) {
      say(formatApiError(err, 'Could not change the batch.'), false);
    }
  }

  async function remove(b) {
    try {
      await axios.delete(`${API}/admission-batches/${b._id}`, authHeaders());
      say('Batch deleted.');
      fetchBatches();
    } catch (err) {
      say(formatApiError(err, 'Could not delete the batch.'), false);
    }
  }

  const accepting = batches.find((b) => b.accepting);

  return (
    <>
      <Head><title>Admission Batches — Admin</title></Head>
      <AdminHeader />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <LuCalendarRange size={22} className="text-primary" /> Admission Batches
            </h1>
            <p className="text-sm text-gray-500 mt-1 max-w-xl">
              Applicants can only apply to the batch that is open, and only until its last
              date. One application per person per batch.
            </p>
          </div>
          <button onClick={startCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity">
            <LuPlus size={15} /> New Batch
          </button>
        </div>

        {/* Current state, in one line */}
        <div className={`rounded-xl border px-5 py-4 mb-6 ${accepting ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
          {accepting ? (
            <p className="text-sm text-green-800">
              <strong>Admissions are open</strong> for batch <strong>{accepting.name}</strong>,
              closing <strong>{prettyDate(accepting.lastDate)}</strong>.
            </p>
          ) : (
            <p className="text-sm text-orange-800">
              <strong>Admissions are closed.</strong> The public form is hidden until a batch is
              open and its last date is in the future.
            </p>
          )}
        </div>

        {flash.text && (
          <div className={`rounded-xl border px-5 py-3 mb-5 text-sm ${flash.ok ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {flash.ok && <LuCheckCircle size={14} className="inline mr-1.5 -mt-0.5" />}
            {flash.text}
          </div>
        )}

        {/* Create / edit */}
        {showForm && (
          <form onSubmit={save} className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">{editId ? 'Edit Batch' : 'New Batch'}</h2>
              <button type="button" onClick={cancel} className="text-gray-400 hover:text-gray-600"><LuX size={18} /></button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name <span className="text-red-500">*</span></label>
                <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. 2027" className="admin-input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Date to Apply <span className="text-red-500">*</span></label>
                <input type="date" value={formData.lastDate}
                  onChange={(e) => setFormData({ ...formData, lastDate: e.target.value })}
                  className="admin-input" />
                <p className="text-xs text-gray-400 mt-1">Applications are accepted up to the end of this day.</p>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Internal note" className="admin-input" />
            </div>

            <label className="flex items-start gap-2 mt-4 text-sm text-gray-700">
              <input type="checkbox" checked={formData.isOpen}
                onChange={(e) => setFormData({ ...formData, isOpen: e.target.checked })}
                className="rounded border-gray-300 mt-0.5" />
              <span>
                Open this batch for applications
                <span className="block text-xs text-gray-400">Any other open batch will be closed automatically.</span>
              </span>
            </label>

            <div className="flex gap-3 mt-5">
              <button type="submit" disabled={saving}
                className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50">
                {saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Batch'}
              </button>
              <button type="button" onClick={cancel}
                className="px-5 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <p className="p-10 text-center text-gray-400 text-sm">Loading…</p>
          ) : batches.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 font-medium">No batches yet.</p>
              <p className="text-gray-400 text-sm mt-1">
                Create one — until then the public admission form stays closed.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3 w-[20%]">Batch</th>
                    <th className="px-4 py-3 w-[24%]">Last Date</th>
                    <th className="px-4 py-3 w-[20%]">Status</th>
                    <th className="px-4 py-3 w-[14%]">Applications</th>
                    <th className="px-4 py-3 w-[22%]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {batches.map((b) => (
                    <tr key={b._id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-semibold text-gray-800 break-words">{b.name}</td>
                      <td className="px-4 py-3 text-gray-600">{prettyDate(b.lastDate)}</td>
                      <td className="px-4 py-3">
                        {b.accepting ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-50 text-green-700">accepting</span>
                        ) : b.isOpen ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-700">date passed</span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-500">closed</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{b.applications ?? 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button onClick={() => startEdit(b)}
                            className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-primary">
                            <LuPencil size={13} /> Edit
                          </button>
                          <button onClick={() => toggleOpen(b)}
                            className="text-xs font-semibold text-primary hover:opacity-70">
                            {b.isOpen ? 'Close' : 'Open'}
                          </button>
                          {(b.applications ?? 0) === 0 && (
                            <button onClick={() => remove(b)}
                              className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700">
                              <LuTrash2 size={13} /> Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
