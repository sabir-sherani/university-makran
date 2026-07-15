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
  active:    'bg-green-100  text-green-800  border-green-200',
  inactive:  'bg-gray-100   text-gray-500   border-gray-200',
};

function Flash({ msg, type }) {
  if (!msg) return null;
  const cls = type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200';
  return <div className={`mb-5 px-4 py-3 rounded-xl text-sm font-medium border ${cls}`}>{msg}</div>;
}

function TeacherDetailPanel({ teacher, onClose, onStatusChange }) {
  const [status, setStatus] = useState(teacher.status);
  const [saving, setSaving]  = useState(false);

  useEffect(() => { setStatus(teacher.status); }, [teacher]);
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  async function save() {
    setSaving(true);
    await onStatusChange(teacher._id, status);
    setSaving(false);
  }

  const Info = ({ label, value }) => value ? (
    <div className="py-2.5 border-b border-gray-50 flex gap-3 last:border-0">
      <span className="text-xs font-bold text-gray-400 uppercase tracking-wide w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800 font-medium flex-1 break-words">{value}</span>
    </div>
  ) : null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white z-50 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100" style={{ background: '#041476' }}>
          <div>
            <p className="text-white font-bold text-lg leading-tight">{teacher.fullName}</p>
            <p className="text-blue-200 text-sm">{teacher.teacherId}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-1">
          <Info label="Full Name"        value={teacher.fullName} />
          <Info label="Teacher ID"       value={teacher.teacherId} />
          <Info label="Email"            value={teacher.email} />
          <Info label="Phone"            value={teacher.phone} />
          <Info label="CNIC"             value={teacher.cnic} />
          <Info label="Department"       value={teacher.department} />
          <Info label="Designation"      value={teacher.designation} />
          <Info label="Qualification"    value={teacher.qualification} />
          <Info label="Specialization"   value={teacher.specialization} />
          <Info label="Time Session"     value={teacher.timeSession} />
          <Info label="Registered On"    value={teacher.createdAt ? new Date(teacher.createdAt).toLocaleString('en-GB') : undefined} />
          {teacher.ongoingClasses?.length > 0 && (
            <div className="py-2.5 border-b border-gray-50">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-2">Ongoing Classes</span>
              <div className="space-y-1">
                {teacher.ongoingClasses.map((c, i) => (
                  <p key={i} className="text-sm text-gray-700">{c.subject} — {c.department} · Sem {c.semester}</p>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Update Status</label>
            <div className="flex gap-2 flex-wrap">
              {['pending', 'approved', 'rejected', 'suspended'].map(s => (
                <button key={s} onClick={() => setStatus(s)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition capitalize ${status === s ? 'ring-2 ring-offset-1' : 'hover:bg-gray-100'} ${STATUS_BADGE[s]}`}
                  style={status === s ? { outline: '2px solid #041476', outlineOffset: '2px' } : {}}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <button onClick={save} disabled={saving || status === teacher.status}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition"
            style={{ background: '#041476' }}>
            {saving ? 'Saving…' : 'Save Status Change'}
          </button>
        </div>
      </div>
    </>
  );
}

export default function TeachersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('teachers');

  // Teachers state
  const [teachers, setTeachers]   = useState([]);
  const [tLoading, setTLoading]   = useState(false);
  const [tSearch, setTSearch]     = useState('');
  const [tStatus, setTStatus]     = useState('');
  const [tDept, setTDept]         = useState('');
  const [tDetail, setTDetail]     = useState(null);
  const [tActing, setTActing]     = useState(null);

  // Teacher IDs state
  const [ids, setIds]             = useState([]);
  const [idLoading, setIdLoading] = useState(false);
  const [idNew, setIdNew]         = useState('');
  const [idAdding, setIdAdding]   = useState(false);
  const [idEditId, setIdEditId]   = useState(null);
  const [idEditVal, setIdEditVal] = useState('');
  const [idSaving, setIdSaving]   = useState(false);

  const [msg, setMsg]             = useState({ text: '', type: '' });
  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg({ text: '', type: '' }), 4000); };

  const loadTeachers = useCallback(async (q = {}) => {
    setTLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.search) params.set('search', q.search);
      if (q.status) params.set('status', q.status);
      if (q.department) params.set('department', q.department);
      const { data } = await axios.get(`${API}/portal/admin/teachers${params.toString() ? '?' + params : ''}`, authHeaders());
      setTeachers(data || []);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('adminToken');
        router.replace('/');
      } else {
        flash('Failed to load teachers. Please try refreshing.', 'error');
      }
    }
    setTLoading(false);
  }, [router]);

  const loadIds = useCallback(async () => {
    setIdLoading(true);
    try {
      const { data } = await axios.get(`${API}/portal/admin/teacher-ids`, authHeaders());
      setIds(data || []);
    } catch { flash('Failed to load teacher IDs.', 'error'); }
    setIdLoading(false);
  }, []);

  useEffect(() => { loadTeachers(); loadIds(); }, [loadTeachers, loadIds]);

  async function handleTStatusChange(id, status) {
    try {
      await axios.patch(`${API}/portal/admin/teachers/${id}/status`, { status }, authHeaders());
      flash(`Status updated to ${status}.`);
      setTeachers(prev => prev.map(t => t._id === id ? { ...t, status } : t));
      if (tDetail?._id === id) setTDetail(p => ({ ...p, status }));
    } catch (err) { flash(err.response?.data?.message || 'Update failed.', 'error'); }
  }

  async function handleTDelete(id, name) {
    if (!confirm(`Permanently delete teacher "${name}"? This cannot be undone.`)) return;
    setTActing(id);
    try {
      await axios.delete(`${API}/portal/admin/teachers/${id}`, authHeaders());
      flash('Teacher deleted.');
      setTeachers(prev => prev.filter(t => t._id !== id));
      if (tDetail?._id === id) setTDetail(null);
    } catch (err) { flash(err.response?.data?.message || 'Delete failed.', 'error'); }
    setTActing(null);
  }

  async function handleAddId(e) {
    e.preventDefault();
    if (!idNew.trim()) return;
    setIdAdding(true);
    try {
      await axios.post(`${API}/portal/admin/teacher-ids`, { teacherId: idNew.trim() }, authHeaders());
      flash(`Teacher ID "${idNew.trim()}" created.`);
      setIdNew('');
      loadIds();
    } catch (err) { flash(err.response?.data?.message || 'Error.', 'error'); }
    setIdAdding(false);
  }

  async function handleEditId(id) {
    if (!idEditVal.trim()) return;
    setIdSaving(true);
    try {
      await axios.patch(`${API}/portal/admin/teacher-ids/${id}`, { teacherId: idEditVal.trim() }, authHeaders());
      flash('Teacher ID updated.');
      setIdEditId(null); setIdEditVal('');
      loadIds();
    } catch (err) { flash(err.response?.data?.message || 'Error.', 'error'); }
    setIdSaving(false);
  }

  async function handleDeleteId(id, val) {
    if (!confirm(`Delete Teacher ID "${val}"?`)) return;
    try {
      await axios.delete(`${API}/portal/admin/teacher-ids/${id}`, authHeaders());
      flash('Deleted.');
      setIds(prev => prev.filter(i => i._id !== id));
    } catch (err) { flash(err.response?.data?.message || 'Error.', 'error'); }
  }

  const freeIds  = ids.filter(i => !i.isUsed);
  const usedIds  = ids.filter(i => i.isUsed);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Head><title>Portal Teachers — Admin</title></Head>
      <AdminHeader />

      <div className="flex-1 min-w-0 ml-0 lg:ml-56 p-4 lg:p-6">
        <div>
          <div className="mb-8">
            <h1 className="text-3xl font-black text-gray-900">Portal Teachers</h1>
            <p className="text-gray-500 mt-1 text-sm">Manage teacher registrations and pre-assigned Teacher IDs used for portal login.</p>
          </div>

          <Flash msg={msg.text} type={msg.type} />

          {/* Tabs */}
          <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 w-fit mb-6">
            {[['teachers', 'Registered Teachers'], ['ids', 'Teacher IDs']].map(([key, lbl]) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition ${activeTab === key ? 'text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                style={activeTab === key ? { background: '#041476' } : {}}>
                {lbl}
                {key === 'teachers' && <span className="ml-2 bg-white/20 text-xs px-1.5 py-0.5 rounded-full">{teachers.length}</span>}
                {key === 'ids'      && <span className="ml-2 bg-white/20 text-xs px-1.5 py-0.5 rounded-full">{freeIds.length} free</span>}
              </button>
            ))}
          </div>

          {/* ── Registered Teachers ── */}
          {activeTab === 'teachers' && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[['Total', teachers.length, 'text-blue-700 bg-blue-50 border-blue-100'], ['Pending', teachers.filter(t => t.status === 'pending').length, 'text-yellow-700 bg-yellow-50 border-yellow-100'], ['Approved', teachers.filter(t => t.status === 'approved').length, 'text-green-700 bg-green-50 border-green-100'], ['Rejected/Suspended', teachers.filter(t => t.status === 'rejected' || t.status === 'suspended').length, 'text-red-700 bg-red-50 border-red-100']].map(([lbl, val, cls]) => (
                  <div key={lbl} className={`rounded-2xl border p-4 ${cls}`}>
                    <p className="text-xs font-bold uppercase tracking-wider opacity-70">{lbl}</p>
                    <p className="text-2xl font-black mt-1">{val}</p>
                  </div>
                ))}
              </div>

              {/* Search */}
              <form onSubmit={e => { e.preventDefault(); loadTeachers({ search: tSearch, status: tStatus, department: tDept }); }}
                className="flex gap-3 mb-6 flex-wrap bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <input value={tSearch} onChange={e => setTSearch(e.target.value)}
                  placeholder="Search by name, teacher ID, or email…"
                  className="flex-1 min-w-48 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500" />
                <select value={tStatus} onChange={e => setTStatus(e.target.value)}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500">
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="suspended">Suspended</option>
                </select>
                <input value={tDept} onChange={e => setTDept(e.target.value)}
                  placeholder="Department…"
                  className="w-44 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500" />
                <button type="submit" className="px-6 py-2.5 text-white font-bold rounded-xl text-sm hover:opacity-90 transition" style={{ background: '#041476' }}>Search</button>
                <button type="button" onClick={() => { setTSearch(''); setTStatus(''); setTDept(''); loadTeachers(); }}
                  className="px-4 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-xl text-sm hover:bg-gray-50 transition">Reset</button>
              </form>

              {/* Quick filters */}
              <div className="flex gap-2 mb-5 flex-wrap">
                {[['', 'All'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['suspended', 'Suspended']].map(([val, lbl]) => (
                  <button key={val} onClick={() => { setTStatus(val); loadTeachers({ search: tSearch, status: val, department: tDept }); }}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold border transition ${tStatus === val ? 'text-white border-primary' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    style={tStatus === val ? { background: '#041476' } : {}}>
                    {lbl}
                  </button>
                ))}
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {tLoading ? (
                  <div className="p-16 text-center">
                    <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: '#041476', borderTopColor: 'transparent' }} />
                    <p className="text-gray-400 text-sm">Loading teachers…</p>
                  </div>
                ) : teachers.length === 0 ? (
                  <div className="p-16 text-center">
                    <p className="text-5xl mb-4">👨‍🏫</p>
                    <p className="text-gray-500 font-medium">No teachers found.</p>
                    <p className="text-gray-400 text-sm mt-1">Teachers who register through the Teacher Portal will appear here.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          {['Teacher ID', 'Name', 'Department', 'Designation', 'Qualification', 'Email', 'Status', 'Registered', 'Actions'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {teachers.map(t => (
                          <tr key={t._id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 font-mono text-xs font-bold text-primary whitespace-nowrap" style={{ color: '#041476' }}>{t.teacherId}</td>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-gray-800 whitespace-nowrap">{t.fullName}</p>
                              {t.phone && <p className="text-xs text-gray-400">{t.phone}</p>}
                            </td>
                            <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{t.department || '—'}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{t.designation || '—'}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{t.qualification || '—'}</td>
                            <td className="px-4 py-3 text-gray-400 text-xs">{t.email}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${STATUS_BADGE[t.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                {t.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                              {t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-GB') : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1.5 flex-wrap">
                                <button onClick={() => setTDetail(t)}
                                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 whitespace-nowrap transition">View</button>
                                {t.status !== 'approved' && (
                                  <button onClick={() => handleTStatusChange(t._id, 'approved')}
                                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-green-200 text-green-700 hover:bg-green-50 whitespace-nowrap transition">Approve</button>
                                )}
                                {t.status === 'approved' && (
                                  <button onClick={() => handleTStatusChange(t._id, 'suspended')}
                                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 whitespace-nowrap transition">Suspend</button>
                                )}
                                {t.status === 'pending' && (
                                  <button onClick={() => handleTStatusChange(t._id, 'rejected')}
                                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 whitespace-nowrap transition">Reject</button>
                                )}
                                <button onClick={() => handleTDelete(t._id, t.fullName)} disabled={tActing === t._id}
                                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-red-100 text-red-500 hover:bg-red-50 whitespace-nowrap transition disabled:opacity-50">
                                  {tActing === t._id ? '…' : 'Delete'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="px-5 py-3 border-t border-gray-50 bg-gray-50">
                      <p className="text-xs text-gray-400">Showing {teachers.length} teacher record{teachers.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Teacher IDs ── */}
          {activeTab === 'ids' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Add new ID */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider mb-1">Create Teacher ID</h3>
                <p className="text-xs text-gray-400 mb-5">Pre-assign teacher IDs. Teachers use these IDs to register on the Teacher Portal.</p>
                <form onSubmit={handleAddId} className="flex gap-3">
                  <input value={idNew} onChange={e => setIdNew(e.target.value)}
                    placeholder="e.g. TCH-001, TCH-CS-001…"
                    required maxLength={30}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500" />
                  <button type="submit" disabled={idAdding}
                    className="px-6 py-2.5 text-white font-bold rounded-xl text-sm hover:opacity-90 transition disabled:opacity-60"
                    style={{ background: '#041476' }}>
                    {idAdding ? 'Adding…' : 'Add ID'}
                  </button>
                </form>

                <div className="mt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Summary</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-gray-800">{ids.length}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Total IDs</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-green-700">{freeIds.length}</p>
                      <p className="text-xs text-green-600 mt-0.5">Available</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-blue-700">{usedIds.length}</p>
                      <p className="text-xs text-blue-600 mt-0.5">In Use</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ID list */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">All Teacher IDs ({ids.length})</h3>
                  {idLoading && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
                </div>
                {ids.length === 0 ? (
                  <div className="p-12 text-center"><p className="text-3xl mb-2">🪪</p><p className="text-gray-400 text-sm">No teacher IDs created yet.</p></div>
                ) : (
                  <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
                    {ids.map(id => (
                      <div key={id._id} className="px-6 py-3 flex items-center gap-3">
                        {idEditId === id._id ? (
                          <>
                            <input value={idEditVal} onChange={e => setIdEditVal(e.target.value)} autoFocus
                              className="flex-1 px-3 py-1.5 border border-blue-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-200" />
                            <button onClick={() => handleEditId(id._id)} disabled={idSaving}
                              className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-60">
                              {idSaving ? '…' : 'Save'}
                            </button>
                            <button onClick={() => { setIdEditId(null); setIdEditVal(''); }}
                              className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-50">Cancel</button>
                          </>
                        ) : (
                          <>
                            <div className="flex-1 min-w-0">
                              <span className="font-mono text-sm font-bold" style={{ color: '#041476' }}>{id.teacherId}</span>
                              <span className={`ml-3 px-2 py-0.5 rounded-full text-xs font-bold ${id.isUsed ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                {id.isUsed ? 'In Use' : 'Available'}
                              </span>
                            </div>
                            {!id.isUsed && (
                              <button onClick={() => { setIdEditId(id._id); setIdEditVal(id.teacherId); }}
                                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition">Edit</button>
                            )}
                            <button onClick={() => handleDeleteId(id._id, id.teacherId)}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${id.isUsed ? 'border-gray-100 text-gray-300 cursor-not-allowed' : 'border-red-100 text-red-500 hover:bg-red-50'}`}
                              disabled={id.isUsed} title={id.isUsed ? 'Cannot delete an ID in use' : 'Delete this ID'}>
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {tDetail && (
        <TeacherDetailPanel
          teacher={tDetail}
          onClose={() => setTDetail(null)}
          onStatusChange={handleTStatusChange}
        />
      )}
    </div>
  );
}

