import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import AdminHeader from '../../components/AdminHeader';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

const emptyF = { serialNo: '', facility: '', description: '', purpose: '' };
const emptyS = { serialNo: '', name: '', eligibility: '', award: '' };

function Flash({ msg, type }) {
  if (!msg) return null;
  const colors = { success: 'bg-green-50 border-green-300 text-green-700', error: 'bg-red-50 border-red-300 text-red-700' };
  return <div className={`border rounded-xl px-4 py-3 text-sm mb-5 ${colors[type] || colors.success}`}>{msg}</div>;
}

function SectionHeader({ title, count, loading }) {
  return (
    <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
      <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider">{title} ({count})</h2>
      {loading && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
    </div>
  );
}

export default function FacilitiesAdmin() {
  // ── Facilities state ──
  const [rows, setRows]       = useState([]);
  const [form, setForm]       = useState(emptyF);
  const [editId, setEditId]   = useState(null);
  const [loadingF, setLoadingF] = useState(true);
  const [savingF, setSavingF]   = useState(false);

  // ── Scholarships state ──
  const [schRows, setSchRows]     = useState([]);
  const [schForm, setSchForm]     = useState(emptyS);
  const [schEditId, setSchEditId] = useState(null);
  const [loadingS, setLoadingS]   = useState(true);
  const [savingS, setSavingS]     = useState(false);

  const [msg, setMsg] = useState({ text: '', type: 'success' });

  const flash = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: 'success' }), 3500);
  };

  const loadFacilities = useCallback(async () => {
    setLoadingF(true);
    try { const r = await axios.get(`${API}/facilities`); setRows(r.data); }
    catch { flash('Failed to load facilities.', 'error'); }
    setLoadingF(false);
  }, []);

  const loadScholarships = useCallback(async () => {
    setLoadingS(true);
    try { const r = await axios.get(`${API}/scholarships`); setSchRows(r.data); }
    catch { flash('Failed to load scholarships.', 'error'); }
    setLoadingS(false);
  }, []);

  useEffect(() => { loadFacilities(); loadScholarships(); }, [loadFacilities, loadScholarships]);

  // ── Facility handlers ──
  const startEditF = (item) => {
    setEditId(item._id);
    setForm({ serialNo: item.serialNo ?? '', facility: item.facility ?? '', description: item.description ?? '', purpose: item.purpose ?? '' });
    document.getElementById('facility-form')?.scrollIntoView({ behavior: 'smooth' });
  };
  const cancelEditF = () => { setEditId(null); setForm(emptyF); };

  const handleSubmitF = async (e) => {
    e.preventDefault();
    if (!form.facility.trim()) return flash('Facility name is required.', 'error');
    setSavingF(true);
    try {
      if (editId) { await axios.put(`${API}/facilities/${editId}`, form); flash('Facility updated.'); }
      else        { await axios.post(`${API}/facilities`, form); flash('Facility added.'); }
      setEditId(null); setForm(emptyF); loadFacilities();
    } catch { flash('Failed to save facility.', 'error'); }
    setSavingF(false);
  };

  const handleDeleteF = async (id) => {
    if (!confirm('Delete this facility?')) return;
    try { await axios.delete(`${API}/facilities/${id}`); flash('Facility deleted.'); loadFacilities(); }
    catch { flash('Failed to delete.', 'error'); }
  };

  // ── Scholarship handlers ──
  const startEditS = (item) => {
    setSchEditId(item._id);
    setSchForm({ serialNo: item.serialNo ?? '', name: item.name ?? '', eligibility: item.eligibility ?? '', award: item.award ?? '' });
    document.getElementById('scholarship-form')?.scrollIntoView({ behavior: 'smooth' });
  };
  const cancelEditS = () => { setSchEditId(null); setSchForm(emptyS); };

  const handleSubmitS = async (e) => {
    e.preventDefault();
    if (!schForm.name.trim()) return flash('Scholarship name is required.', 'error');
    setSavingS(true);
    try {
      if (schEditId) { await axios.put(`${API}/scholarships/${schEditId}`, schForm); flash('Scholarship updated.'); }
      else           { await axios.post(`${API}/scholarships`, schForm); flash('Scholarship added.'); }
      setSchEditId(null); setSchForm(emptyS); loadScholarships();
    } catch { flash('Failed to save scholarship.', 'error'); }
    setSavingS(false);
  };

  const handleDeleteS = async (id) => {
    if (!confirm('Delete this scholarship?')) return;
    try { await axios.delete(`${API}/scholarships/${id}`); flash('Scholarship deleted.'); loadScholarships(); }
    catch { flash('Failed to delete.', 'error'); }
  };

  const actionBtn = (label, onClick, danger = false) => (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-colors ${
        danger
          ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'
          : 'bg-transparent border-[#041476] text-[#041476] hover:bg-blue-50'
      }`}
    >{label}</button>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Head><title>Manage Facilities & Scholarships — Admin</title></Head>
      <AdminHeader />

      <div className="flex-1 min-w-0 ml-0 lg:ml-56 p-4 lg:p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-black text-gray-900">Facilities & Scholarships</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage the facilities table and scholarships table shown on the Facilities page.</p>
        </div>

        <Flash msg={msg.text} type={msg.type} />

        {/* ════════════ FACILITIES SECTION ════════════ */}
        <div className="mb-2">
          <h2 className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
            <span className="inline-block w-1 h-5 rounded-full" style={{ background: '#041476' }} />
            Facilities
          </h2>
        </div>

        {/* Facility form */}
        <div id="facility-form" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
          <h3 className="font-bold text-gray-800 mb-4 text-sm">{editId ? 'Edit Facility' : 'Add New Facility'}</h3>
          <form onSubmit={handleSubmitF} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">S No.</label>
              <input type="number" min="1" placeholder="Auto" value={form.serialNo}
                onChange={e => setForm({ ...form, serialNo: e.target.value })} className="admin-input w-full" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Facility <span className="text-red-500">*</span></label>
              <input type="text" placeholder="e.g. Computer Lab" value={form.facility} required
                onChange={e => setForm({ ...form, facility: e.target.value })} className="admin-input w-full" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Description</label>
              <input type="text" placeholder="Brief description" value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })} className="admin-input w-full" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Purpose</label>
              <input type="text" placeholder="Purpose of the facility" value={form.purpose}
                onChange={e => setForm({ ...form, purpose: e.target.value })} className="admin-input w-full" />
            </div>
            <div className="md:col-span-4 flex gap-3">
              <button type="submit" disabled={savingF} className="admin-btn admin-btn-primary px-6">
                {savingF ? 'Saving…' : editId ? 'Update Facility' : 'Add Facility'}
              </button>
              {editId && <button type="button" onClick={cancelEditF} className="admin-btn admin-btn-secondary px-6">Cancel</button>}
            </div>
          </form>
        </div>

        {/* Facility table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-10">
          <SectionHeader title="All Facilities" count={rows.length} loading={loadingF} />
          {!loadingF && rows.length === 0 ? (
            <div className="p-12 text-center"><p className="text-3xl mb-2">🏫</p><p className="text-gray-400 text-sm">No facilities yet.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['S No.','Facility','Description','Purpose','Actions'].map((h, i) => (
                      <th key={h} className={`px-4 py-3 font-bold text-gray-500 uppercase tracking-wide text-xs ${i === 4 ? 'text-right' : 'text-left'} ${i === 0 ? 'w-16' : ''} ${i === 4 ? 'w-32' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map((row, i) => (
                    <tr key={row._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 font-medium text-center">{row.serialNo ?? i + 1}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{row.facility}</td>
                      <td className="px-4 py-3 text-gray-600">{row.description || <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-gray-600">{row.purpose || <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3"><div className="flex gap-2 justify-end">{actionBtn('Edit', () => startEditF(row))}{actionBtn('Delete', () => handleDeleteF(row._id), true)}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ════════════ SCHOLARSHIPS SECTION ════════════ */}
        <div className="mb-2">
          <h2 className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
            <span className="inline-block w-1 h-5 rounded-full" style={{ background: '#FA7902' }} />
            Scholarships
          </h2>
        </div>

        {/* Scholarship form */}
        <div id="scholarship-form" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
          <h3 className="font-bold text-gray-800 mb-4 text-sm">{schEditId ? 'Edit Scholarship' : 'Add New Scholarship'}</h3>
          <form onSubmit={handleSubmitS} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">S No.</label>
              <input type="number" min="1" placeholder="Auto" value={schForm.serialNo}
                onChange={e => setSchForm({ ...schForm, serialNo: e.target.value })} className="admin-input w-full" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Scholarship <span className="text-red-500">*</span></label>
              <input type="text" placeholder="e.g. BEEF" value={schForm.name} required
                onChange={e => setSchForm({ ...schForm, name: e.target.value })} className="admin-input w-full" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Eligibility Criteria</label>
              <input type="text" placeholder="Who can apply" value={schForm.eligibility}
                onChange={e => setSchForm({ ...schForm, eligibility: e.target.value })} className="admin-input w-full" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Award</label>
              <input type="text" placeholder="What they receive" value={schForm.award}
                onChange={e => setSchForm({ ...schForm, award: e.target.value })} className="admin-input w-full" />
            </div>
            <div className="md:col-span-4 flex gap-3">
              <button type="submit" disabled={savingS} className="admin-btn admin-btn-primary px-6">
                {savingS ? 'Saving…' : schEditId ? 'Update Scholarship' : 'Add Scholarship'}
              </button>
              {schEditId && <button type="button" onClick={cancelEditS} className="admin-btn admin-btn-secondary px-6">Cancel</button>}
            </div>
          </form>
        </div>

        {/* Scholarship table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader title="All Scholarships" count={schRows.length} loading={loadingS} />
          {!loadingS && schRows.length === 0 ? (
            <div className="p-12 text-center"><p className="text-3xl mb-2">🎓</p><p className="text-gray-400 text-sm">No scholarships yet. Use the form above to add one.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['S No.','Scholarship','Eligibility Criteria','Award','Actions'].map((h, i) => (
                      <th key={h} className={`px-4 py-3 font-bold text-gray-500 uppercase tracking-wide text-xs ${i === 4 ? 'text-right' : 'text-left'} ${i === 0 ? 'w-16' : ''} ${i === 4 ? 'w-36' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {schRows.map((row, i) => (
                    <tr key={row._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 font-medium text-center">{row.serialNo ?? i + 1}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{row.name}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs">{row.eligibility || <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs">{row.award || <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3"><div className="flex gap-2 justify-end">{actionBtn('Edit', () => startEditS(row))}{actionBtn('Delete', () => handleDeleteS(row._id), true)}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
