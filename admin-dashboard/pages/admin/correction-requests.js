import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminHeader from '../../components/AdminHeader';
import axios from 'axios';
import { LuFileEdit, LuX, LuCheck, LuBan } from 'react-icons/lu';

const API = process.env.NEXT_PUBLIC_API_URL;

function getAdminToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('adminToken') || localStorage.getItem('token') || '';
}
function authHeaders() { return { headers: { Authorization: `Bearer ${getAdminToken()}` } }; }

const STATUS_BADGE = {
  pending:  'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-green-100  text-green-800  border-green-200',
  rejected: 'bg-red-100    text-red-800    border-red-200',
};

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function FieldDiff({ changes }) {
  if (!changes || !changes.length) return <span className="text-gray-400 text-xs">No field changes recorded.</span>;
  return (
    <div className="space-y-1.5">
      {changes.map((c, i) => (
        <div key={i} className="text-sm flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{c.field}</span>
          <span className="text-gray-400 line-through">{c.oldValue || '—'}</span>
          <span className="text-gray-300">→</span>
          <span className="text-green-700 font-semibold">{c.newValue || '—'}</span>
        </div>
      ))}
    </div>
  );
}

function ReviewModal({ request, onClose, onReview }) {
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(null); // 'approved' | 'rejected' | null
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  async function act(status) {
    setError('');
    if (status === 'rejected' && !comment.trim()) {
      setError('A reason is required when rejecting a correction request.');
      return;
    }
    setSaving(status);
    try {
      await onReview(request._id, status, comment.trim());
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit review.');
    }
    setSaving(null);
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white z-50 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100" style={{ background: '#041476' }}>
          <div>
            <p className="text-white font-bold text-lg leading-tight">{request.studentName || 'Correction Request'}</p>
            <p className="text-blue-200 text-sm">{request.studentRegistrationNo}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none"><LuX size={22} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${STATUS_BADGE[request.status] || ''}`}>{request.status}</span>
            <span className="text-xs text-gray-400">Submitted {formatDate(request.createdAt)}</span>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Requested Changes</p>
            <FieldDiff changes={request.requestedFieldChanges} />
          </div>

          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Student's Reason</p>
            <p className="text-sm text-gray-700">{request.reason || '—'}</p>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Department</p>
            <p className="text-sm text-gray-700">{request.department || '—'}</p>
          </div>

          {request.status !== 'pending' && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Review</p>
              <p className="text-sm text-gray-700">Reviewed {formatDate(request.reviewedAt)}</p>
              {request.reviewerComment && <p className="text-sm text-gray-600 mt-1">"{request.reviewerComment}"</p>}
            </div>
          )}
        </div>

        {request.status === 'pending' && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 space-y-3">
            {error && <p className="text-xs font-medium text-red-600">{error}</p>}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Reviewer Comment <span className="text-gray-400 normal-case font-normal">(required to reject — shown to the student)</span>
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Optional note for approval, or the reason for rejection…"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => act('approved')} disabled={saving !== null}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition">
                <LuCheck size={16} /> {saving === 'approved' ? 'Approving…' : 'Approve'}
              </button>
              <button onClick={() => act('rejected')} disabled={saving !== null}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition">
                <LuBan size={16} /> {saving === 'rejected' ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function CorrectionRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('pending');
  const [selected, setSelected] = useState(null);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg({ text: '', type: '' }), 4000); };

  const load = useCallback(async (statusFilter) => {
    setLoading(true);
    try {
      const params = { type: 'student-profile' };
      if (statusFilter) params.status = statusFilter;
      const { data } = await axios.get(`${API}/portal/admin/reports/corrections`, { ...authHeaders(), params });
      setRequests(data || []);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('adminToken');
        router.replace('/');
      } else {
        flash('Failed to load correction requests.', 'error');
      }
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { load(status); }, [load, status]);

  async function handleReview(id, newStatus, reviewerComment) {
    await axios.patch(`${API}/portal/admin/reports/corrections/${id}`, { status: newStatus, reviewerComment }, authHeaders());
    flash(`Correction request ${newStatus}.`);
    load(status);
  }

  const counts = {
    pending: requests.filter(r => r.status === 'pending').length,
  };

  return (
    <>
      <Head><title>Correction Requests — Admin</title></Head>
      <AdminHeader />

      <div className="ml-0 lg:ml-56 min-h-screen bg-gray-50 p-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #041476, #0d2a90)' }}>
            <LuFileEdit size={20} />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-primary">Correction Requests</h2>
            <p className="text-sm text-gray-500 mt-1">Student-submitted requests to correct official profile fields (name, CNIC, DOB, email).</p>
          </div>
        </div>

        {msg.text && (
          <div className={`mb-5 px-4 py-3 rounded-xl text-sm font-medium border ${msg.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
            {msg.text}
          </div>
        )}

        {/* Status filter pills */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {[['', 'All'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']].map(([val, lbl]) => (
            <button key={val} onClick={() => setStatus(val)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold border transition ${status === val ? 'text-white border-primary' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              style={status === val ? { background: '#041476' } : {}}>
              {lbl}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-16 text-center">
              <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: '#041476', borderTopColor: 'transparent' }} />
              <p className="text-gray-400 text-sm">Loading requests…</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="p-16 text-center">
              <LuFileEdit size={40} className="mx-auto mb-3 text-gray-200" />
              <p className="text-gray-500 font-medium">No correction requests found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Student', 'Reg No', 'Department', 'Changes', 'Submitted', 'Status', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {requests.map(r => (
                    <tr key={r._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">{r.studentName || '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">{r.studentRegistrationNo || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{r.department || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {(r.requestedFieldChanges || []).map(c => c.field).join(', ') || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${STATUS_BADGE[r.status] || ''}`}>{r.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setSelected(r)}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 whitespace-nowrap transition">
                          {r.status === 'pending' ? 'Review' : 'View'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-5 py-3 border-t border-gray-50 bg-gray-50">
                <p className="text-xs text-gray-400">Showing {requests.length} request{requests.length !== 1 ? 's' : ''}{status === '' && counts.pending ? ` · ${counts.pending} pending` : ''}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <ReviewModal request={selected} onClose={() => setSelected(null)} onReview={handleReview} />
      )}
    </>
  );
}
