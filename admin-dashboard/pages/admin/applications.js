import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import AdminHeader from '../../components/AdminHeader';
import axios from 'axios';

const API  = process.env.NEXT_PUBLIC_API_URL;
const BASE = API ? API.replace('/api', '') : 'http://localhost:5000';

const STATUS_STYLES = {
  pending:  'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100  text-green-800',
  rejected: 'bg-red-100    text-red-800',
};

const QUAL_COLS = ['Degree Title', 'Passing Year', 'Obtained Marks / CGPA', 'Total Marks / CGPA', 'Board / University'];

/* ── Detail slide-over panel ──────────────────────────────────────────── */
function DetailPanel({ app, onClose, onStatusChange }) {
  const [status, setStatus] = useState(app.status || 'pending');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setStatus(app.status || 'pending'); }, [app]);

  // Lock body scroll while panel open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  async function handleSaveStatus() {
    setSaving(true);
    await onStatusChange(app._id, status);
    setSaving(false);
  }

  let quals = {};
  try { quals = JSON.parse(app.qualifications || '{}'); } catch { quals = {}; }

  const rows = [
    { key: 'matric',        label: 'Matric (SSC)' },
    { key: 'intermediate',  label: 'Intermediate (HSSC)' },
    { key: 'bachelor',      label: 'Bachelor\'s Degree' },
    { key: 'master',        label: 'Master\'s Degree' },
    { key: 'mphil',         label: 'M.Phil / MS' },
    { key: 'other',         label: 'Other' },
  ];

  function InfoRow({ label, value }) {
    if (!value) return null;
    return (
      <div className="flex gap-3 py-2.5 border-b border-gray-50 last:border-0">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide w-36 shrink-0 pt-0.5">{label}</span>
        <span className="text-sm text-gray-800 font-medium flex-1">{value}</span>
      </div>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full w-full max-w-2xl z-50 flex flex-col overflow-hidden"
        style={{ background: 'white', boxShadow: '-8px 0 60px rgba(0,0,0,0.18)' }}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ background: 'linear-gradient(135deg, #041476, #0d2a90)' }}>
          <div className="flex items-center gap-3">
            {app.profilePicture ? (
              <img
                src={`${BASE}${app.profilePicture}`}
                alt={app.candidateName}
                className="w-11 h-11 rounded-full object-cover border-2 border-white/30"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center border-2 border-white/20">
                <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
            )}
            <div>
              <h3 className="text-white font-bold text-base leading-tight">{app.candidateName || '—'}</h3>
              <p className="text-white/50 text-xs mt-0.5">{app.email || '—'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Status bar */}
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100">
            <div className="flex-1">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Application Status</p>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <button
                onClick={handleSaveStatus}
                disabled={saving || status === app.status}
                className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

          {/* Profile picture (large) */}
          {app.profilePicture && (
            <div className="flex justify-center">
              <div className="text-center">
                <img
                  src={`${BASE}${app.profilePicture}`}
                  alt={app.candidateName}
                  className="w-28 h-28 rounded-2xl object-cover mx-auto"
                  style={{ boxShadow: '0 8px 32px rgba(4,20,118,0.18)', border: '3px solid rgba(4,20,118,0.15)' }}
                />
                <p className="text-xs text-gray-400 mt-2">Profile Photo</p>
              </div>
            </div>
          )}

          {/* Section: Program of Study */}
          <div style={{ border: '1.5px solid rgba(4,20,118,0.1)', borderRadius: '16px', overflow: 'hidden' }}>
            <div className="px-5 py-3 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #f0f4ff, #eef2ff)' }}>
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h4 className="text-sm font-bold text-primary">Program of Study</h4>
            </div>
            <div className="px-5 py-3 bg-white">
              <InfoRow label="Department"      value={app.department} />
              <InfoRow label="Program"         value={app.program} />
              <InfoRow label="2nd Priority"    value={app.secondPriority} />
              <InfoRow label="3rd Priority"    value={app.thirdPriority} />
            </div>
          </div>

          {/* Section: Personal Details */}
          <div style={{ border: '1.5px solid rgba(4,20,118,0.1)', borderRadius: '16px', overflow: 'hidden' }}>
            <div className="px-5 py-3 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #f0f4ff, #eef2ff)' }}>
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <h4 className="text-sm font-bold text-primary">Personal Details</h4>
            </div>
            <div className="px-5 py-3 bg-white">
              <InfoRow label="Full Name"        value={app.candidateName} />
              <InfoRow label="Father Name"      value={app.fatherName} />
              <InfoRow label="Email"            value={app.email} />
              <InfoRow label="CNIC"             value={app.cnic} />
              <InfoRow label="Date of Birth"    value={app.dob} />
              <InfoRow label="Gender"           value={app.gender} />
              <InfoRow label="Phone"            value={app.phone} />
              <InfoRow label="WhatsApp"         value={app.whatsapp} />
              <InfoRow label="Nationality"      value={app.nationality} />
              <InfoRow label="City"             value={app.city} />
              <InfoRow label="Current Address"  value={app.currentAddress} />
              <InfoRow label="Perm. Address"    value={app.permanentAddress} />
            </div>
          </div>

          {/* Section: Academic Qualifications */}
          <div style={{ border: '1.5px solid rgba(4,20,118,0.1)', borderRadius: '16px', overflow: 'hidden' }}>
            <div className="px-5 py-3 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #f0f4ff, #eef2ff)' }}>
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <h4 className="text-sm font-bold text-primary">Academic Qualifications</h4>
            </div>
            <div className="overflow-x-auto bg-white">
              <table className="w-full text-xs min-w-[480px]">
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #f0f4ff, #e8eeff)' }}>
                    <th className="px-4 py-2.5 text-left font-black text-primary/70 uppercase tracking-wider border-b border-primary/10">Certificate</th>
                    {QUAL_COLS.map((col, i) => (
                      <th key={i} className="px-3 py-2.5 text-left font-black text-primary/70 uppercase tracking-wider border-b border-primary/10 border-l border-primary/8">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, ri) => {
                    const q = quals[row.key] || {};
                    const hasData = q.degreeTitle || q.passingYear || q.obtainedMarks || q.totalMarks || q.board;
                    if (!hasData) return null;
                    return (
                      <tr key={row.key} style={{ background: ri % 2 === 0 ? 'white' : '#fafbff' }}>
                        <td className="px-4 py-2.5 font-semibold text-gray-700 border-t border-gray-50">{row.label}</td>
                        <td className="px-3 py-2.5 text-gray-600 border-t border-gray-50 border-l border-gray-50">{q.degreeTitle || '—'}</td>
                        <td className="px-3 py-2.5 text-gray-600 border-t border-gray-50 border-l border-gray-50">{q.passingYear || '—'}</td>
                        <td className="px-3 py-2.5 text-gray-600 border-t border-gray-50 border-l border-gray-50">{q.obtainedMarks || '—'}</td>
                        <td className="px-3 py-2.5 text-gray-600 border-t border-gray-50 border-l border-gray-50">{q.totalMarks || '—'}</td>
                        <td className="px-3 py-2.5 text-gray-600 border-t border-gray-50 border-l border-gray-50">{q.board || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!rows.some(row => { const q = quals[row.key] || {}; return q.degreeTitle || q.passingYear || q.obtainedMarks; }) && (
                <p className="text-xs text-gray-400 px-5 py-4">No qualifications recorded.</p>
              )}
            </div>
          </div>

          {/* Meta */}
          <div className="text-center pb-2">
            <p className="text-xs text-gray-300">Application submitted on {app.createdAt ? new Date(app.createdAt).toLocaleString('en-GB') : '—'}</p>
          </div>

        </div>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════
   PAGE
════════════════════════════════════════════════════════════════════ */
export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [selected, setSelected]         = useState(new Set());
  const [loading, setLoading]           = useState(true);
  const [deleting, setDeleting]         = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [msg, setMsg]                   = useState('');
  const [viewApp, setViewApp]           = useState(null);

  useEffect(() => { fetchApplications(); }, []);

  async function fetchApplications() {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admissions`);
      setApplications(res.data || []);
    } catch {
      setApplications([]);
    }
    setSelected(new Set());
    setLoading(false);
  }

  const filtered = useMemo(() => {
    if (filterStatus === 'all') return applications;
    return applications.filter((a) => a.status === filterStatus);
  }, [applications, filterStatus]);

  const allFilteredIds = filtered.map((a) => a._id);
  const allSelected    = allFilteredIds.length > 0 && allFilteredIds.every((id) => selected.has(id));
  const someSelected   = allFilteredIds.some((id) => selected.has(id));
  const selectedCount  = [...selected].filter((id) => allFilteredIds.includes(id)).length;

  function toggleOne(id) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    if (allSelected) {
      setSelected((prev) => { const n = new Set(prev); allFilteredIds.forEach(id => n.delete(id)); return n; });
    } else {
      setSelected((prev) => { const n = new Set(prev); allFilteredIds.forEach(id => n.add(id)); return n; });
    }
  }

  async function deleteOne(id) {
    if (!confirm('Delete this application?')) return;
    try {
      await axios.delete(`${API}/admissions/${id}`);
      flash('Application deleted.');
      if (viewApp?._id === id) setViewApp(null);
      fetchApplications();
    } catch { flash('Error deleting application.', true); }
  }

  async function deleteSelected() {
    const ids = [...selected].filter(id => allFilteredIds.includes(id));
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} selected application${ids.length > 1 ? 's' : ''}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await axios.post(`${API}/admissions/bulk-delete`, { ids });
      flash(`${ids.length} application${ids.length > 1 ? 's' : ''} deleted.`);
      if (viewApp && ids.includes(viewApp._id)) setViewApp(null);
      fetchApplications();
    } catch { flash('Error deleting applications.', true); }
    setDeleting(false);
  }

  async function deleteAll() {
    if (applications.length === 0) return;
    if (!confirm(`Delete ALL ${applications.length} applications? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const ids = applications.map(a => a._id);
      await axios.post(`${API}/admissions/bulk-delete`, { ids });
      flash(`All ${ids.length} applications deleted.`);
      setViewApp(null);
      fetchApplications();
    } catch { flash('Error deleting applications.', true); }
    setDeleting(false);
  }

  async function handleStatusChange(id, status) {
    try {
      await axios.put(`${API}/admissions/${id}`, { status });
      setApplications(prev => prev.map(a => a._id === id ? { ...a, status } : a));
      if (viewApp?._id === id) setViewApp(prev => ({ ...prev, status }));
    } catch { flash('Error updating status.', true); }
  }

  function flash(text, isError = false) {
    setMsg({ text, isError });
    setTimeout(() => setMsg(''), 3500);
  }

  const statusCounts = useMemo(() => ({
    all:      applications.length,
    pending:  applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  }), [applications]);

  return (
    <>
      <Head><title>Admission Applications — Admin Dashboard</title></Head>
      <AdminHeader />

      <div className="ml-0 lg:ml-56 min-h-screen bg-gray-50 p-8">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-bold text-primary">Admission Applications</h2>
            <p className="text-sm text-gray-500 mt-1">{applications.length} total application{applications.length !== 1 ? 's' : ''}</p>
          </div>
          {applications.length > 0 && (
            <button onClick={deleteAll} disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors">
              🗑️ Delete All ({applications.length})
            </button>
          )}
        </div>

        {/* Flash */}
        {msg && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${msg.isError ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
            {msg.text}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {['all','pending','approved','rejected'].map(s => (
            <button key={s}
              onClick={() => { setFilterStatus(s); setSelected(new Set()); }}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                filterStatus === s ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-primary hover:text-primary'
              }`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
              <span className="ml-1.5 opacity-70">({statusCounts[s]})</span>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Bulk action bar */}
          {selectedCount > 0 && (
            <div className="px-5 py-3 bg-primary/5 border-b border-primary/10 flex items-center justify-between">
              <p className="text-sm font-semibold text-primary">{selectedCount} application{selectedCount > 1 ? 's' : ''} selected</p>
              <button onClick={deleteSelected} disabled={deleting}
                className="flex items-center gap-2 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors">
                {deleting ? 'Deleting...' : `🗑️ Delete Selected (${selectedCount})`}
              </button>
            </div>
          )}

          {loading ? (
            <div className="p-12 text-center text-gray-400">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              Loading applications...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center text-gray-400">
              <p className="text-4xl mb-3">📭</p>
              <p className="font-medium">No {filterStatus !== 'all' ? filterStatus : ''} applications found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-medium">
                    <th className="px-5 py-3 w-10">
                      <input type="checkbox" checked={allSelected}
                        ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                        onChange={toggleAll}
                        className="w-4 h-4 rounded accent-primary cursor-pointer"
                        title={allSelected ? 'Deselect all' : 'Select all'} />
                    </th>
                    <th className="px-4 py-3 text-left">Applicant</th>
                    <th className="px-4 py-3 text-left">Department / Program</th>
                    <th className="px-4 py-3 text-left">Phone</th>
                    <th className="px-4 py-3 text-left">Applied On</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Change Status</th>
                    <th className="px-4 py-3 text-center">Details</th>
                    <th className="px-4 py-3 text-center w-14">Del</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((app, i) => {
                    const isChecked = selected.has(app._id);
                    const isViewing = viewApp?._id === app._id;
                    return (
                      <tr key={app._id}
                        className={`border-b border-gray-50 transition-colors ${
                          isViewing ? 'bg-primary/8 border-l-2 border-l-primary' :
                          isChecked ? 'bg-primary/5' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        } hover:bg-primary/5`}>

                        <td className="px-5 py-3">
                          <input type="checkbox" checked={isChecked} onChange={() => toggleOne(app._id)}
                            className="w-4 h-4 rounded accent-primary cursor-pointer" />
                        </td>

                        {/* Applicant — with photo thumbnail */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {app.profilePicture ? (
                              <img src={`${BASE}${app.profilePicture}`} alt={app.candidateName}
                                className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <svg className="w-4 h-4 text-primary/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                </svg>
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-gray-800 leading-tight">{app.candidateName || '—'}</p>
                              <p className="text-xs text-gray-400">{app.email || '—'}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <p className="text-gray-700 font-medium">{app.program || '—'}</p>
                          <p className="text-xs text-gray-400">{app.department || ''}</p>
                        </td>

                        <td className="px-4 py-3 text-gray-500">{app.phone || '—'}</td>

                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {app.createdAt ? new Date(app.createdAt).toLocaleDateString('en-GB') : '—'}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[app.status] || 'bg-gray-100 text-gray-600'}`}>
                            {app.status || 'pending'}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <select value={app.status || 'pending'}
                            onChange={e => handleStatusChange(app._id, e.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-primary cursor-pointer">
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </td>

                        {/* View Details */}
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setViewApp(isViewing ? null : app)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                              isViewing
                                ? 'bg-primary text-white'
                                : 'bg-primary/10 text-primary hover:bg-primary/20'
                            }`}>
                            {isViewing ? 'Viewing' : 'View'}
                          </button>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <button onClick={() => deleteOne(app._id)}
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-colors"
                            title="Delete">
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-400">
              <span>Showing {filtered.length} of {applications.length} application{applications.length !== 1 ? 's' : ''}</span>
              {selectedCount > 0 && <span className="text-primary font-medium">{selectedCount} selected</span>}
            </div>
          )}
        </div>
      </div>

      {/* Detail slide-over */}
      {viewApp && (
        <DetailPanel
          app={viewApp}
          onClose={() => setViewApp(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </>
  );
}

