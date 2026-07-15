import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminHeader from '../../components/AdminHeader';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

const TABS = [
  { key: 'hod',     label: 'HOD Accounts',       color: 'indigo',  idField: 'hodId',     idLabel: 'HOD ID',     idPlaceholder: 'HOD-001' },
  { key: 'exam',    label: 'Examination Section',  color: 'purple',  idField: 'examId',    idLabel: 'Exam ID',    idPlaceholder: 'EXAM-001' },
  { key: 'finance', label: 'Finance Staff',        color: 'emerald', idField: 'financeId', idLabel: 'Finance ID', idPlaceholder: 'FIN-001' },
];

const ROLE_BADGE = {
  hod:     'bg-indigo-100 text-indigo-800',
  exam:    'bg-purple-100 text-purple-800',
  finance: 'bg-emerald-100 text-emerald-800',
};

const STATUS_BADGE = {
  active:   'bg-green-100 text-green-800',
  inactive: 'bg-red-100 text-red-800',
};

function emptyForm(tab) {
  return { fullName: '', email: '', password: '', phone: '', cnic: '', designation: '', department: '', section: '', [tab.idField]: '' };
}

function Flash({ msg }) {
  if (!msg) return null;
  const isErr = /error|fail|invalid/i.test(msg);
  return (
    <div className={`mb-5 px-4 py-3 rounded-xl text-sm font-medium border ${isErr ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
      {msg}
    </div>
  );
}

function getToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('adminToken') || localStorage.getItem('token') || '';
}

function authHeaders() {
  return { headers: { Authorization: `Bearer ${getToken()}` } };
}

export default function StaffManagement() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('hod');
  const [staff, setStaff]         = useState({ hod: [], exam: [], finance: [] });
  const [loading, setLoading]     = useState({ hod: false, exam: false, finance: false });
  const [form, setForm]           = useState(emptyForm(TABS[0]));
  const [editId, setEditId]       = useState(null);
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [showPw, setShowPw]       = useState(false);

  const tab = TABS.find(t => t.key === activeTab);

  // Redirect to login if no token
  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('adminToken')) {
      router.replace('/');
    }
  }, []);

  useEffect(() => { loadStaff(activeTab); }, [activeTab]);

  async function loadStaff(role) {
    setLoading(p => ({ ...p, [role]: true }));
    try {
      const { data } = await axios.get(`${API}/portal/admin/staff/${role}`, authHeaders());
      setStaff(p => ({ ...p, [role]: data }));
    } catch { /* silent */ }
    setLoading(p => ({ ...p, [role]: false }));
  }

  function flash(text) {
    setMsg(text);
    setTimeout(() => setMsg(''), 3500);
  }

  function openCreate() {
    setEditId(null);
    setForm(emptyForm(tab));
    setShowPw(false);
    setShowForm(true);
  }

  function openEdit(member) {
    setEditId(member._id);
    setShowPw(false);
    setForm({
      fullName:    member.fullName || '',
      email:       member.email || '',
      password:    '',
      phone:       member.phone || '',
      cnic:        member.cnic || '',
      designation: member.designation || '',
      department:  member.department || '',
      section:     member.section || '',
      [tab.idField]: member[tab.idField] || '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleField(e) {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password && editId) delete payload.password;

      if (editId) {
        await axios.patch(`${API}/portal/admin/staff/${activeTab}/${editId}`, payload, authHeaders());
        flash('Account updated successfully.');
      } else {
        await axios.post(`${API}/portal/admin/staff/${activeTab}`, payload, authHeaders());
        flash('Account created successfully.');
      }
      setShowForm(false);
      setEditId(null);
      loadStaff(activeTab);
    } catch (err) {
      flash(err.response?.data?.message || 'Error saving account.');
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this account? This cannot be undone.')) return;
    try {
      await axios.delete(`${API}/portal/admin/staff/${activeTab}/${id}`, authHeaders());
      flash('Account deleted.');
      loadStaff(activeTab);
    } catch { flash('Error deleting account.'); }
  }

  async function toggleStatus(member) {
    const newStatus = member.status === 'active' ? 'inactive' : 'active';
    try {
      await axios.patch(`${API}/portal/admin/staff/${activeTab}/${member._id}`, { status: newStatus }, authHeaders());
      loadStaff(activeTab);
    } catch { flash('Error updating status.'); }
  }

  const list = staff[activeTab] || [];

  return (
    <>
      <Head><title>Staff Management — Admin Dashboard</title></Head>
      <AdminHeader />

      <div className="ml-0 lg:ml-56 min-h-screen bg-gray-50 p-8">

        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-primary">Staff Management</h2>
          <p className="text-sm text-gray-500 mt-1">Create and manage HOD, Examination Section, and Finance Staff accounts.</p>
        </div>

        {/* Role tabs */}
        <div className="flex gap-2 mb-8 border-b border-gray-200">
          {TABS.map(t => (
            <button key={t.key}
              onClick={() => { setActiveTab(t.key); setShowForm(false); setMsg(''); }}
              className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-colors -mb-px border-b-2 ${
                activeTab === t.key
                  ? 'border-primary text-primary bg-white'
                  : 'border-transparent text-gray-500 hover:text-primary'
              }`}>
              {t.label}
              <span className="ml-2 text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                {staff[t.key]?.length || 0}
              </span>
            </button>
          ))}
        </div>

        <Flash msg={msg} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Form panel */}
          <div className="lg:col-span-1">
            {!showForm ? (
              <button onClick={openCreate}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold text-sm transition-all"
                style={{ background: 'linear-gradient(135deg, #041476, #0d2a90)', boxShadow: '0 8px 24px rgba(4,20,118,0.25)' }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Create {tab.label.split(' ')[0]} Account
              </button>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4" style={{ background: 'linear-gradient(135deg, #041476, #0d2a90)' }}>
                  <h3 className="text-white font-bold text-base">
                    {editId ? `Edit ${tab.label.split(' ')[0]}` : `New ${tab.label.split(' ')[0]}`}
                  </h3>
                  <p className="text-white/50 text-xs mt-0.5">Fill all required fields</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  {/* ID field */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{tab.idLabel} *</label>
                    <input name={tab.idField} value={form[tab.idField]} onChange={handleField}
                      required placeholder={tab.idPlaceholder} disabled={!!editId}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Full Name *</label>
                    <input name="fullName" value={form.fullName} onChange={handleField}
                      required placeholder="Full Name"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email *</label>
                    <input name="email" type="email" value={form.email} onChange={handleField}
                      required placeholder="email@uom.edu.pk"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Password {editId ? '(leave blank to keep)' : '*'}
                    </label>
                    <div className="relative">
                      <input name="password" type={showPw ? 'text' : 'password'} value={form.password} onChange={handleField}
                        required={!editId} placeholder={editId ? '••••••••' : 'Set password'}
                        className="w-full px-4 py-2.5 pr-11 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                      <button type="button" onClick={() => setShowPw(p => !p)} tabIndex={-1}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors">
                        {showPw ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Phone</label>
                    <input name="phone" value={form.phone} onChange={handleField}
                      placeholder="03001234567"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">CNIC</label>
                    <input name="cnic" value={form.cnic} onChange={handleField}
                      placeholder="00000-0000000-0"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Designation</label>
                    <input name="designation" value={form.designation} onChange={handleField}
                      placeholder={activeTab === 'hod' ? 'Head of Department' : activeTab === 'exam' ? 'Examination Officer' : 'Finance Officer'}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  </div>

                  {(activeTab === 'hod' || activeTab === 'finance') && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Department {activeTab === 'hod' ? '*' : ''}
                      </label>
                      <input name="department" value={form.department} onChange={handleField}
                        required={activeTab === 'hod'} placeholder="e.g. CS & IT"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    </div>
                  )}

                  {activeTab === 'exam' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Section</label>
                      <input name="section" value={form.section} onChange={handleField}
                        placeholder="e.g. Exam Block A"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button type="submit" disabled={saving}
                      className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 text-sm">
                      {saving ? 'Saving…' : editId ? 'Update Account' : 'Create Account'}
                    </button>
                    <button type="button" onClick={() => { setShowForm(false); setEditId(null); setShowPw(false); }}
                      className="px-5 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 text-sm">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* List panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                <h3 className="font-bold text-primary text-base">{tab.label} ({list.length})</h3>
                {!showForm && (
                  <button onClick={openCreate}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 text-primary text-xs font-bold rounded-lg hover:bg-primary/15 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add New
                  </button>
                )}
              </div>

              {loading[activeTab] ? (
                <div className="p-12 text-center">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">Loading accounts…</p>
                </div>
              ) : list.length === 0 ? (
                <div className="p-16 text-center">
                  <p className="text-4xl mb-3">👤</p>
                  <p className="text-gray-500 font-semibold">No accounts yet</p>
                  <p className="text-gray-400 text-sm mt-1">Create the first {tab.label.toLowerCase()} account.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {list.map(member => (
                    <div key={member._id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base shrink-0"
                        style={{ background: 'linear-gradient(135deg, #041476, #0d2a90)' }}>
                        {member.fullName?.charAt(0) || '?'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-gray-800 text-sm">{member.fullName}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_BADGE[member.status] || 'bg-gray-100 text-gray-600'}`}>
                            {member.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{member.email}</p>
                        <div className="flex gap-3 mt-1 flex-wrap">
                          <span className="text-xs text-gray-500 font-mono">{member[tab.idField]}</span>
                          {member.department && <span className="text-xs text-gray-400">· {member.department}</span>}
                          {member.designation && <span className="text-xs text-gray-400">· {member.designation}</span>}
                          {member.phone && <span className="text-xs text-gray-400">· {member.phone}</span>}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => toggleStatus(member)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                            member.status === 'active'
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}>
                          {member.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onClick={() => openEdit(member)}
                          className="px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(member._id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

