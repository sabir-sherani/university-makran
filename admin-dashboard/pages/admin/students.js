import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import AdminHeader from '../../components/AdminHeader';
import axios from 'axios';
import { useRouter } from 'next/router';

const API = process.env.NEXT_PUBLIC_API_URL;

function getToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('adminToken') || localStorage.getItem('token') || '';
}
function authHeaders() { return { headers: { Authorization: `Bearer ${getToken()}` } }; }

const STATUS_BADGE = {
  pending:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved:  'bg-green-100  text-green-800  border-green-200',
  rejected:  'bg-red-100    text-red-800    border-red-200',
  suspended: 'bg-gray-100   text-gray-600   border-gray-200',
};

function Flash({ msg, type }) {
  if (!msg) return null;
  const cls = type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200';
  return <div className={`mb-5 px-4 py-3 rounded-xl text-sm font-medium border ${cls}`}>{msg}</div>;
}

function DetailPanel({ student, onClose, onStatusChange, onAcademicChange }) {
  const [status, setStatus]     = useState(student.status);
  const [saving, setSaving]     = useState(false);
  const [acad, setAcad]         = useState({
    rollNo:               student.rollNo || '',
    currentSemester:      student.currentSemester || 1,
    cgpa:                 student.cgpa ?? '',
    attendancePercentage: student.attendancePercentage ?? '',
  });
  const [acadSaving, setAcadSaving] = useState(false);
  const [acadMsg, setAcadMsg]       = useState('');

  useEffect(() => {
    setStatus(student.status);
    setAcad({
      rollNo:               student.rollNo || '',
      currentSemester:      student.currentSemester || 1,
      cgpa:                 student.cgpa ?? '',
      attendancePercentage: student.attendancePercentage ?? '',
    });
  }, [student]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  async function save() {
    setSaving(true);
    await onStatusChange(student._id, status);
    setSaving(false);
  }

  async function saveAcademic() {
    setAcadSaving(true);
    setAcadMsg('');
    const payload = {
      rollNo: acad.rollNo,
      currentSemester: Number(acad.currentSemester),
    };
    if (acad.cgpa !== '') payload.cgpa = Number(acad.cgpa);
    if (acad.attendancePercentage !== '') payload.attendancePercentage = Number(acad.attendancePercentage);
    try {
      await onAcademicChange(student._id, payload);
      setAcadMsg('Academic info saved.');
    } catch { setAcadMsg('Failed to save.'); }
    setAcadSaving(false);
    setTimeout(() => setAcadMsg(''), 3000);
  }

  const Info = ({ label, value }) => value ? (
    <div className="py-2.5 border-b border-gray-50 flex gap-3 last:border-0">
      <span className="text-xs font-bold text-gray-400 uppercase tracking-wide w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800 font-medium flex-1 break-words">{value}</span>
    </div>
  ) : null;

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400';

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white z-50 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100" style={{ background: '#041476' }}>
          <div>
            <p className="text-white font-bold text-lg leading-tight">{student.fullName}</p>
            <p className="text-blue-200 text-sm">{student.registrationNo}{student.rollNo ? ` · Roll No: ${student.rollNo}` : ''}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-1">
          <Info label="Full Name"        value={student.fullName} />
          <Info label="Registration No"  value={student.registrationNo} />
          <Info label="Roll No"          value={student.rollNo || '—'} />
          <Info label="Email"            value={student.email} />
          <Info label="Phone"            value={student.phone} />
          <Info label="CNIC"             value={student.cnic} />
          <Info label="Father's Name"    value={student.fatherName} />
          <Info label="Gender"           value={student.gender} />
          <Info label="Date of Birth"    value={student.dateOfBirth} />
          <Info label="Address"          value={student.address} />
          <Info label="Department"       value={student.department} />
          <Info label="Program"          value={student.program} />
          <Info label="Session"          value={student.session} />
          <Info label="Current Semester" value={student.currentSemester ? `Semester ${student.currentSemester}` : undefined} />
          <Info label="CGPA"             value={student.cgpa != null ? String(student.cgpa) : undefined} />
          <Info label="Attendance"       value={student.attendancePercentage != null ? `${student.attendancePercentage}%` : undefined} />
          <Info label="Time Session"     value={student.timeSession} />
          <Info label="Registered On"    value={student.createdAt ? new Date(student.createdAt).toLocaleString('en-GB') : undefined} />
        </div>

        {/* Academic info editor */}
        <div className="px-6 py-4 border-t border-gray-100 bg-blue-50 space-y-3">
          <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Edit Academic Info</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-semibold block mb-1">Roll No</label>
              <input value={acad.rollNo} onChange={e => setAcad(a => ({ ...a, rollNo: e.target.value }))}
                className={inputCls} placeholder="e.g. CS-2024-01" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-semibold block mb-1">Current Semester</label>
              <select value={acad.currentSemester} onChange={e => setAcad(a => ({ ...a, currentSemester: e.target.value }))}
                className={inputCls}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>Semester {n}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-semibold block mb-1">CGPA (0 – 4)</label>
              <input type="number" min="0" max="4" step="0.01" value={acad.cgpa}
                onChange={e => setAcad(a => ({ ...a, cgpa: e.target.value }))}
                className={inputCls} placeholder="e.g. 3.50" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-semibold block mb-1">Attendance %</label>
              <input type="number" min="0" max="100" step="1" value={acad.attendancePercentage}
                onChange={e => setAcad(a => ({ ...a, attendancePercentage: e.target.value }))}
                className={inputCls} placeholder="e.g. 85" />
            </div>
          </div>
          {acadMsg && <p className="text-xs font-medium text-blue-700">{acadMsg}</p>}
          <button onClick={saveAcademic} disabled={acadSaving}
            className="w-full py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition bg-blue-600 hover:bg-blue-700">
            {acadSaving ? 'Saving…' : '💾 Save Academic Info'}
          </button>
        </div>

        {/* Status editor */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Update Status</label>
            <div className="flex gap-2 flex-wrap">
              {['pending', 'approved', 'rejected', 'suspended'].map(s => (
                <button key={s} onClick={() => setStatus(s)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition capitalize ${status === s ? 'ring-2 ring-offset-1 ring-primary' : 'hover:bg-gray-100'} ${STATUS_BADGE[s]}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <button onClick={save} disabled={saving || status === student.status}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition"
            style={{ background: '#041476' }}>
            {saving ? 'Saving…' : 'Save Status Change'}
          </button>
        </div>
      </div>
    </>
  );
}

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState('');
  const [filterStatus, setStatus]   = useState('');
  const [filterDept, setDept]       = useState('');
  const [msg, setMsg]               = useState({ text: '', type: '' });
  const [detail, setDetail]         = useState(null);
  const [actingId, setActingId]     = useState(null);

  // Advance semester state
  const [advOpen, setAdvOpen]           = useState(false);
  const [advDept, setAdvDept]           = useState('');
  const [advSession, setAdvSession]     = useState('');
  const [advSemester, setAdvSemester]   = useState('1');
  const [advStudents, setAdvStudents]   = useState([]);   // full student list from preview
  const [advSelected, setAdvSelected]   = useState({});  // { [_id]: bool }
  const [advPreview, setAdvPreview]     = useState(null); // null | number (total matched)
  const [advPreviewing, setAdvPreviewing] = useState(false);
  const [advConfirmed, setAdvConfirmed] = useState(false);
  const [advancing, setAdvancing]       = useState(false);

  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg({ text: '', type: '' }), 4000); };

  const load = useCallback(async (q = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.search) params.set('search', q.search);
      if (q.status) params.set('status', q.status);
      if (q.department) params.set('department', q.department);
      const { data } = await axios.get(`${API}/portal/admin/students${params.toString() ? '?' + params : ''}`, authHeaders());
      setStudents(data || []);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('adminToken');
        router.replace('/');
      } else {
        flash('Failed to load students. Please try refreshing.', 'error');
      }
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function handleStatusChange(id, status) {
    try {
      await axios.patch(`${API}/portal/admin/students/${id}/status`, { status }, authHeaders());
      flash(`Status updated to ${status}.`);
      setStudents(prev => prev.map(s => s._id === id ? { ...s, status } : s));
      if (detail?._id === id) setDetail(p => ({ ...p, status }));
    } catch (err) { flash(err.response?.data?.message || 'Update failed.', 'error'); }
  }

  async function handleAcademicChange(id, payload) {
    const { data } = await axios.patch(`${API}/portal/admin/students/${id}/academic`, payload, authHeaders());
    setStudents(prev => prev.map(s => s._id === id ? { ...s, ...data.student } : s));
    if (detail?._id === id) setDetail(p => ({ ...p, ...data.student }));
  }

  async function handleDelete(id, name) {
    if (!confirm(`Permanently delete student "${name}"? This cannot be undone.`)) return;
    setActingId(id);
    try {
      await axios.delete(`${API}/portal/admin/students/${id}`, authHeaders());
      flash('Student deleted.');
      setStudents(prev => prev.filter(s => s._id !== id));
      if (detail?._id === id) setDetail(null);
    } catch (err) { flash(err.response?.data?.message || 'Delete failed.', 'error'); }
    setActingId(null);
  }

  function handleSearch(e) {
    e.preventDefault();
    load({ search, status: filterStatus, department: filterDept });
  }

  async function handleAdvancePreview() {
    if (!advDept.trim() || !advSession.trim() || !advSemester) {
      return flash('Please fill in Department, Session, and Current Semester.', 'error');
    }
    setAdvPreviewing(true); setAdvPreview(null); setAdvStudents([]); setAdvSelected({}); setAdvConfirmed(false);
    try {
      const params = new URLSearchParams({ department: advDept, session: advSession, semester: advSemester });
      const { data } = await axios.get(`${API}/portal/admin/students/advance-semester/preview?${params}`, authHeaders());
      setAdvPreview(data.count);
      setAdvStudents(data.students || []);
      const sel = {};
      (data.students || []).forEach(s => { sel[s._id] = true; });
      setAdvSelected(sel);
    } catch (err) { flash(err.response?.data?.message || 'Preview failed.', 'error'); }
    setAdvPreviewing(false);
  }

  function toggleAdvStudent(id) {
    setAdvSelected(p => ({ ...p, [id]: !p[id] }));
    setAdvConfirmed(false);
  }

  function toggleAllAdvStudents(checked) {
    const sel = {};
    advStudents.forEach(s => { sel[s._id] = checked; });
    setAdvSelected(sel);
    setAdvConfirmed(false);
  }

  async function handleAdvanceConfirm() {
    const selectedIds = advStudents.filter(s => advSelected[s._id]).map(s => s._id);
    if (selectedIds.length === 0) return flash('No students selected to advance.', 'error');
    if (!advConfirmed) { setAdvConfirmed(true); return; }
    setAdvancing(true);
    try {
      const { data } = await axios.post(`${API}/portal/admin/students/advance-semester`, {
        studentIds: selectedIds, fromSemester: advSemester,
      }, authHeaders());
      flash(data.message);
      setAdvPreview(null); setAdvStudents([]); setAdvSelected({}); setAdvConfirmed(false);
      setAdvDept(''); setAdvSession(''); setAdvSemester('1');
      setAdvOpen(false);
      load();
    } catch (err) { flash(err.response?.data?.message || 'Advance failed.', 'error'); }
    setAdvancing(false);
  }

  const counts = {
    all:       students.length,
    pending:   students.filter(s => s.status === 'pending').length,
    approved:  students.filter(s => s.status === 'approved').length,
    rejected:  students.filter(s => s.status === 'rejected').length,
    suspended: students.filter(s => s.status === 'suspended').length,
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Head><title>Portal Students — Admin</title></Head>
      <AdminHeader />

      <div className="flex-1 min-w-0 ml-0 lg:ml-56 p-4 lg:p-6">
        <div>
          <div className="mb-8">
            <h1 className="text-3xl font-black text-gray-900">Portal Students</h1>
            <p className="text-gray-500 mt-1 text-sm">Manage students registered through the Student Portal. Approve, reject, or suspend accounts.</p>
          </div>

          <Flash msg={msg.text} type={msg.type} />

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {[['Total', counts.all, 'bg-blue-50 border-blue-100 text-blue-700'], ['Pending', counts.pending, 'bg-yellow-50 border-yellow-100 text-yellow-700'], ['Approved', counts.approved, 'bg-green-50 border-green-100 text-green-700'], ['Rejected', counts.rejected, 'bg-red-50 border-red-100 text-red-700'], ['Suspended', counts.suspended, 'bg-gray-50 border-gray-100 text-gray-600']].map(([label, val, cls]) => (
              <div key={label} className={`rounded-2xl border p-4 ${cls}`}>
                <p className="text-xs font-bold uppercase tracking-wider opacity-70">{label}</p>
                <p className="text-2xl font-black mt-1">{val}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <form onSubmit={handleSearch} className="flex gap-3 mb-6 flex-wrap bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, reg no, or email…"
              className="flex-1 min-w-48 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500" />
            <select value={filterStatus} onChange={e => setStatus(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500">
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
            </select>
            <input value={filterDept} onChange={e => setDept(e.target.value)}
              placeholder="Department…"
              className="w-44 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500" />
            <button type="submit" className="px-6 py-2.5 text-white font-bold rounded-xl text-sm hover:opacity-90 transition" style={{ background: '#041476' }}>Search</button>
            <button type="button" onClick={() => { setSearch(''); setStatus(''); setDept(''); load(); }}
              className="px-4 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-xl text-sm hover:bg-gray-50 transition">Reset</button>
          </form>

          {/* Quick status filter pills */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {[['', 'All'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['suspended', 'Suspended']].map(([val, lbl]) => (
              <button key={val} onClick={() => { setStatus(val); load({ search, status: val, department: filterDept }); }}
                className={`px-4 py-1.5 rounded-full text-xs font-bold border transition ${filterStatus === val ? 'text-white border-primary' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                style={filterStatus === val ? { background: '#041476' } : {}}>
                {lbl}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="p-16 text-center">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: '#041476', borderTopColor: 'transparent' }} />
                <p className="text-gray-400 text-sm">Loading students…</p>
              </div>
            ) : students.length === 0 ? (
              <div className="p-16 text-center">
                <p className="text-5xl mb-4">🎓</p>
                <p className="text-gray-500 font-medium">No students found.</p>
                <p className="text-gray-400 text-sm mt-1">Students who register through the portal will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Reg No', 'Roll No', 'Name', 'Dept / Program', 'Sem', 'CGPA', 'Attendance', 'Session', 'Status', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {students.map(s => (
                      <tr key={s._id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">{s.registrationNo}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{s.rollNo || '—'}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-800 whitespace-nowrap">{s.fullName}</p>
                          <p className="text-xs text-gray-400">{s.email}</p>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <p className="text-gray-700 font-medium whitespace-nowrap">{s.department || '—'}</p>
                          <p className="text-gray-400">{s.program || '—'}</p>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600 text-xs">{s.currentSemester ? `Sem ${s.currentSemester}` : '—'}</td>
                        <td className="px-4 py-3 text-center text-xs font-semibold text-green-700">{s.cgpa != null ? s.cgpa.toFixed(2) : '—'}</td>
                        <td className="px-4 py-3 text-center text-xs">
                          {s.attendancePercentage != null ? (
                            <span className={`font-semibold ${s.attendancePercentage < 75 ? 'text-red-600' : 'text-green-700'}`}>{s.attendancePercentage}%</span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{s.session || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${STATUS_BADGE[s.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5 flex-wrap">
                            <button onClick={() => setDetail(s)}
                              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 whitespace-nowrap transition">View</button>
                            {s.status !== 'approved' && (
                              <button onClick={() => handleStatusChange(s._id, 'approved')}
                                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-green-200 text-green-700 hover:bg-green-50 whitespace-nowrap transition">Approve</button>
                            )}
                            {s.status === 'approved' && (
                              <button onClick={() => handleStatusChange(s._id, 'suspended')}
                                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 whitespace-nowrap transition">Suspend</button>
                            )}
                            {s.status === 'pending' && (
                              <button onClick={() => handleStatusChange(s._id, 'rejected')}
                                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 whitespace-nowrap transition">Reject</button>
                            )}
                            <button onClick={() => handleDelete(s._id, s.fullName)} disabled={actingId === s._id}
                              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-red-100 text-red-500 hover:bg-red-50 whitespace-nowrap transition disabled:opacity-50">
                              {actingId === s._id ? '…' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-5 py-3 border-t border-gray-50 bg-gray-50">
                  <p className="text-xs text-gray-400">Showing {students.length} student record{students.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
            )}
          </div>

          {/* Advance Semester */}
          <div className="mt-8 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => { setAdvOpen(o => !o); setAdvPreview(null); setAdvConfirmed(false); }}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-base font-bold" style={{ background: '#041476' }}>↑</div>
                <div className="text-left">
                  <p className="font-bold text-gray-800 text-sm">Advance Semester</p>
                  <p className="text-xs text-gray-400">Bulk-promote a group of students to the next semester</p>
                </div>
              </div>
              <span className="text-gray-400 text-xl leading-none">{advOpen ? '−' : '+'}</span>
            </button>

            {advOpen && (
              <div className="px-6 pb-6 border-t border-gray-50 pt-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Department</label>
                    <input
                      value={advDept}
                      onChange={e => { setAdvDept(e.target.value); setAdvPreview(null); setAdvConfirmed(false); }}
                      placeholder="e.g. CS & IT"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Session</label>
                    <input
                      value={advSession}
                      onChange={e => { setAdvSession(e.target.value); setAdvPreview(null); setAdvConfirmed(false); }}
                      placeholder="e.g. 2025-2029"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Current Semester (to advance from)</label>
                    <select
                      value={advSemester}
                      onChange={e => { setAdvSemester(e.target.value); setAdvPreview(null); setAdvConfirmed(false); }}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                    >
                      {[1,2,3,4,5,6,7].map(n => (
                        <option key={n} value={String(n)}>Semester {n} → {n + 1}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={handleAdvancePreview}
                    disabled={advPreviewing}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold border border-blue-200 text-blue-700 hover:bg-blue-50 transition disabled:opacity-50"
                  >
                    {advPreviewing ? 'Checking…' : 'Preview Students'}
                  </button>

                  {advPreview === 0 && (
                    <div className="px-4 py-2 rounded-xl text-sm font-medium border bg-yellow-50 border-yellow-200 text-yellow-700">
                      No matching students found.
                    </div>
                  )}
                </div>

                {advStudents.length > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-gray-700">
                        {Object.values(advSelected).filter(Boolean).length} of {advStudents.length} selected to advance
                      </p>
                      <div className="flex gap-2 text-xs">
                        <button onClick={() => toggleAllAdvStudents(true)} className="text-blue-600 hover:underline font-semibold">Select All</button>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => toggleAllAdvStudents(false)} className="text-gray-500 hover:underline font-semibold">Deselect All</button>
                      </div>
                    </div>
                    <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-64 overflow-y-auto">
                      {advStudents.map(s => (
                        <label key={s._id} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition ${!advSelected[s._id] ? 'opacity-50' : ''}`}>
                          <input
                            type="checkbox"
                            checked={!!advSelected[s._id]}
                            onChange={() => toggleAdvStudent(s._id)}
                            className="accent-blue-600 w-4 h-4 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{s.fullName}</p>
                            <p className="text-xs text-gray-400">{s.registrationNo}{s.rollNo ? ` · Roll ${s.rollNo}` : ''}</p>
                          </div>
                          {!advSelected[s._id] && (
                            <span className="text-xs font-bold text-red-400 bg-red-50 px-2 py-0.5 rounded-full shrink-0">Excluded</span>
                          )}
                        </label>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center gap-3 flex-wrap">
                      <button
                        onClick={handleAdvanceConfirm}
                        disabled={advancing || Object.values(advSelected).filter(Boolean).length === 0}
                        className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-50 ${advConfirmed ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                        style={advConfirmed ? {} : { background: '#041476' }}
                      >
                        {advancing ? 'Advancing…' : advConfirmed ? 'Confirm — Advance Now' : `Advance ${Object.values(advSelected).filter(Boolean).length} Student(s)`}
                      </button>
                      {advConfirmed && (
                        <p className="text-xs text-orange-600 font-medium">
                          This will permanently advance {Object.values(advSelected).filter(Boolean).length} student(s) to Semester {Number(advSemester) + 1}. Click confirm to proceed.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {detail && (
        <DetailPanel
          student={detail}
          onClose={() => setDetail(null)}
          onStatusChange={handleStatusChange}
          onAcademicChange={handleAcademicChange}
        />
      )}
    </div>
  );
}

