import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AdminHeader from '../../components/AdminHeader';
import RecycleBinPanel from '../../components/RecycleBinPanel';
import axios from 'axios';
import { LuTrash2, LuPauseCircle, LuPlayCircle } from 'react-icons/lu';

const API  = process.env.NEXT_PUBLIC_API_URL;
const BASE = API ? API.replace('/api', '') : 'http://localhost:5000';

// ── OTP Modal ─────────────────────────────────────────────────────────────────
function SuspendOtpModal({ dept, action, onClose, onSuccess }) {
  const [step, setStep]       = useState('confirm'); // confirm | sending | otp | verifying
  const [otp, setOtp]         = useState('');
  const [error, setError]     = useState('');
  const [sending, setSending] = useState(false);

  const actionLabel = action === 'suspend' ? 'Suspend' : 'Unsuspend';
  const actionColor = action === 'suspend' ? '#dc2626' : '#16a34a';
  const actionBg    = action === 'suspend' ? '#fef2f2' : '#f0fdf4';

  async function requestOtp() {
    setSending(true);
    setError('');
    try {
      await axios.post(`${API}/departments/${dept._id}/suspend-otp`, { action });
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Check server email config.');
    }
    setSending(false);
  }

  async function confirmOtp(e) {
    e.preventDefault();
    if (!otp.trim()) return;
    setSending(true);
    setError('');
    try {
      await axios.patch(`${API}/departments/${dept._id}/suspend`, { action, otp });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed.');
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 z-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: actionBg }}>
            {action === 'suspend'
              ? <LuPauseCircle size={22} style={{ color: actionColor }} />
              : <LuPlayCircle  size={22} style={{ color: actionColor }} />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{actionLabel} Department</h3>
            <p className="text-sm text-gray-500 truncate max-w-xs">{dept.name}</p>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
        </div>

        {step === 'confirm' && (
          <>
            <div className="rounded-xl p-4 mb-6 text-sm" style={{ background: actionBg, color: actionColor }}>
              {action === 'suspend'
                ? 'This will hide the department globally across the entire website. Students will not be able to view it.'
                : 'This will make the department visible again across the entire website.'}
            </div>
            <p className="text-sm text-gray-600 mb-6">
              An OTP will be sent to the admin email address to confirm this action.
            </p>
            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={requestOtp}
                disabled={sending}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                style={{ background: actionColor }}
              >
                {sending ? 'Sending OTP…' : 'Send OTP'}
              </button>
            </div>
          </>
        )}

        {step === 'otp' && (
          <>
            <div className="rounded-xl p-4 mb-6 text-sm bg-blue-50 text-blue-700">
              A 6-digit OTP has been sent to the admin email. Enter it below to confirm.
            </div>
            <form onSubmit={confirmOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Enter OTP</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="● ● ● ● ● ●"
                  className="w-full text-center text-2xl font-bold tracking-[0.5em] border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setStep('confirm'); setOtp(''); setError(''); }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={sending || otp.length !== 6}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
                  style={{ background: actionColor }}
                >
                  {sending ? 'Verifying…' : `Confirm ${actionLabel}`}
                </button>
              </div>
              <p className="text-xs text-gray-400 text-center">OTP expires in 5 minutes.</p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DepartmentsList() {
  const [departments, setDepartments]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [newName, setNewName]           = useState('');
  const [creating, setCreating]         = useState(false);
  const [msg, setMsg]                   = useState('');
  const [trashItems, setTrashItems]     = useState([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [showTrash, setShowTrash]       = useState(false);
  const [suspendModal, setSuspendModal] = useState(null); // { dept, action }
  const router = useRouter();

  useEffect(() => { fetchDepartments(); fetchTrash(); }, []);

  async function fetchDepartments() {
    try {
      const res = await axios.get(`${API}/departments?all=1`);
      setDepartments(res.data || []);
    } catch {}
    setLoading(false);
  }

  async function fetchTrash() {
    setTrashLoading(true);
    try {
      const res = await axios.get(`${API}/departments/trash`);
      setTrashItems(res.data || []);
    } catch {}
    setTrashLoading(false);
  }

  async function handleRestore(id) {
    try {
      await axios.patch(`${API}/departments/${id}/restore`);
      fetchDepartments(); fetchTrash();
    } catch { alert('Error restoring department.'); }
  }

  async function handlePermanentDelete(id) {
    if (!confirm('Permanently delete this department? This cannot be undone.')) return;
    try {
      await axios.delete(`${API}/departments/${id}/permanent`);
      fetchTrash();
    } catch { alert('Error deleting department.'); }
  }

  async function handleEmptyTrash() {
    if (!confirm('Permanently delete ALL trashed departments? This cannot be undone.')) return;
    try {
      await Promise.all(trashItems.map(d => axios.delete(`${API}/departments/${d._id}/permanent`)));
      fetchTrash();
    } catch { alert('Error emptying trash.'); }
  }

  async function createDepartment(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setMsg('');
    try {
      const fd = new FormData();
      fd.append('name', newName.trim());
      const res = await axios.post(`${API}/departments`, fd);
      router.push(`/admin/departments/${res.data._id}`);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Error creating department.');
      setCreating(false);
    }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Move "${name}" to the recycle bin?`)) return;
    try {
      await axios.delete(`${API}/departments/${id}`);
      fetchDepartments(); fetchTrash();
    } catch {
      alert('Error moving department to trash.');
    }
  }

  const suspended = departments.filter(d => d.suspended);
  const active    = departments.filter(d => !d.suspended);

  return (
    <>
      <Head><title>Departments — Admin Dashboard</title></Head>
      <AdminHeader />

      <RecycleBinPanel
        open={showTrash}
        onClose={() => setShowTrash(false)}
        items={trashItems}
        loading={trashLoading}
        onRestore={handleRestore}
        onPermanentDelete={handlePermanentDelete}
        onEmptyTrash={handleEmptyTrash}
        label="department"
      />

      {suspendModal && (
        <SuspendOtpModal
          dept={suspendModal.dept}
          action={suspendModal.action}
          onClose={() => setSuspendModal(null)}
          onSuccess={() => { setSuspendModal(null); fetchDepartments(); }}
        />
      )}

      <div className="ml-0 lg:ml-56 p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-primary">Manage Departments</h2>
          <div className="flex items-center gap-2">
            {suspended.length > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
                <LuPauseCircle size={14} />
                {suspended.length} Suspended
              </span>
            )}
            <button
              onClick={() => setShowTrash(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-colors"
              style={{ borderColor: trashItems.length ? '#fca5a5' : '#e5e7eb', color: trashItems.length ? '#dc2626' : '#6b7280', background: trashItems.length ? '#fef2f2' : '#f9fafb' }}
            >
              <LuTrash2 size={15} />
              Recycle Bin
              {trashItems.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold text-white bg-red-500">{trashItems.length}</span>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Create panel ── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
              <h3 className="text-lg font-bold text-primary mb-2">Add New Department</h3>
              <p className="text-xs text-gray-400 mb-5">
                Enter a name to create the department. You'll add all tab content in the editor.
              </p>

              {msg && (
                <div className="mb-4 px-4 py-2 rounded text-sm bg-red-50 text-red-700">{msg}</div>
              )}

              <form onSubmit={createDepartment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department Name *</label>
                  <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    required
                    placeholder="e.g. Computer Science"
                    className="admin-input"
                  />
                </div>
                <button
                  type="submit"
                  disabled={creating}
                  className="admin-btn admin-btn-primary w-full flex items-center justify-center gap-2"
                >
                  {creating ? 'Creating…' : <>Create & Open Editor <span>→</span></>}
                </button>
              </form>

              {/* Suspension info box */}
              <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-100">
                <p className="text-xs font-semibold text-amber-800 mb-1 flex items-center gap-1.5">
                  <LuPauseCircle size={13} /> Department Suspension
                </p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Suspending a department hides it globally from the website. It is protected by OTP verification sent to the admin email.
                </p>
              </div>
            </div>
          </div>

          {/* ── Departments list ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Active departments */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-primary mb-5">
                Active Departments ({active.length})
              </h3>

              {loading ? (
                <p className="text-gray-400">Loading…</p>
              ) : active.length === 0 ? (
                <p className="text-gray-400 text-sm">No active departments.</p>
              ) : (
                <div className="space-y-3">
                  {active.map(dept => (
                    <DeptRow
                      key={dept._id}
                      dept={dept}
                      onDelete={handleDelete}
                      onSuspend={() => setSuspendModal({ dept, action: 'suspend' })}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Suspended departments */}
            {suspended.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-amber-400">
                <h3 className="text-lg font-bold text-amber-700 mb-1 flex items-center gap-2">
                  <LuPauseCircle size={18} /> Suspended Departments ({suspended.length})
                </h3>
                <p className="text-xs text-amber-600 mb-5">These departments are hidden from the website.</p>
                <div className="space-y-3">
                  {suspended.map(dept => (
                    <DeptRow
                      key={dept._id}
                      dept={dept}
                      onDelete={handleDelete}
                      onUnsuspend={() => setSuspendModal({ dept, action: 'unsuspend' })}
                      isSuspended
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}

// ── Department row ─────────────────────────────────────────────────────────────
function DeptRow({ dept, onDelete, onSuspend, onUnsuspend, isSuspended }) {
  return (
    <div
      className="border rounded-xl p-4 flex items-center gap-4 transition-colors"
      style={{
        borderColor: isSuspended ? '#fcd34d' : '#e5e7eb',
        background:  isSuspended ? '#fffbeb' : '#fff',
      }}
    >
      {/* Thumbnail */}
      {dept.bannerImage ? (
        <img
          src={`${BASE}${dept.bannerImage}`}
          alt={dept.name}
          className="w-16 h-16 object-cover rounded-lg shrink-0"
          style={{ opacity: isSuspended ? 0.5 : 1 }}
        />
      ) : (
        <div
          className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold shrink-0"
          style={{ background: isSuspended ? '#fef9c3' : '#eff6ff', color: isSuspended ? '#b45309' : '#041476' }}
        >
          {dept.name.charAt(0)}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-bold" style={{ color: isSuspended ? '#92400e' : '#041476' }}>{dept.name}</h4>
          {dept.slug && (
            <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded">
              /{dept.slug}
            </span>
          )}
          {isSuspended && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
              <LuPauseCircle size={10} /> Suspended
            </span>
          )}
        </div>
        {dept.hod?.name && (
          <p className="text-gray-500 text-sm">HOD: {dept.hod.name}</p>
        )}
      </div>

      <div className="flex gap-2 shrink-0 flex-wrap justify-end">
        <Link
          href={`/admin/departments/${dept._id}`}
          className="admin-btn text-xs px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded font-medium"
        >
          Edit
        </Link>
        {isSuspended ? (
          <button
            onClick={onUnsuspend}
            className="text-xs px-3 py-1.5 rounded font-semibold flex items-center gap-1 transition-colors"
            style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}
          >
            <LuPlayCircle size={13} /> Unsuspend
          </button>
        ) : (
          <button
            onClick={onSuspend}
            className="text-xs px-3 py-1.5 rounded font-semibold flex items-center gap-1 transition-colors"
            style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
          >
            <LuPauseCircle size={13} /> Suspend
          </button>
        )}
        <button
          onClick={() => onDelete(dept._id, dept.name)}
          className="admin-btn admin-btn-danger text-xs"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
