// HOD Correction Requests section — result-sheet, student-profile, and
// attendance correction requests, all reviewed through the same
// GET/PATCH /correction-requests routes. Extracted out of hod.js per hard
// rule 9 (Phase 5 grows this section with a type filter + an attendance-
// specific card, which would have made the inline block unwieldy).
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Spinner } from '../ui.js';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const BASE_URL = API.replace(/\/api$/, '');
const fileUrl = (u) => (u?.startsWith('http') ? u : `${BASE_URL}${u}`);

const STATUS_BADGE = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700',
};

const TYPE_LABEL = {
  'result-sheet': 'Result Sheet',
  'student-profile': 'Profile',
  attendance: 'Attendance',
};

function AttachmentGallery({ attachments }) {
  if (!attachments || !attachments.length) return null;
  return (
    <div className="bg-gray-50 rounded-xl p-3 md:col-span-2">
      <p className="text-xs font-bold text-gray-500 uppercase mb-2">Supporting Documents</p>
      <div className="flex flex-wrap gap-2">
        {attachments.map((a, i) => {
          const isImage = /\.(jpe?g|png)$/i.test(a.fileName || a.fileUrl || '');
          return (
            <a key={i} href={fileUrl(a.fileUrl)} target="_blank" rel="noopener noreferrer" title={a.fileName}>
              {isImage ? (
                <img src={fileUrl(a.fileUrl)} alt={a.fileName || `attachment ${i + 1}`}
                  className="w-16 h-16 object-cover rounded-lg border border-gray-200 hover:opacity-80" />
              ) : (
                <span className="flex items-center gap-1 px-3 py-1.5 h-16 bg-white border border-gray-200 rounded-lg text-xs font-medium text-indigo-600 hover:bg-indigo-50">
                  📄 {a.fileName || `File ${i + 1}`}
                </span>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}

export default function CorrectionsSection({ hod, token, onPendingChange }) {
  const [requests, setRequests]         = useState([]);
  const [loading, setLoading]           = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter]     = useState('');
  const [comment, setComment]           = useState({});
  const [acting, setActing]             = useState({});

  function headers() { return { headers: { Authorization: `Bearer ${token}` } }; }

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;
      const { data } = await axios.get(`${API}/portal/hod/correction-requests`, { ...headers(), params });
      setRequests(data || []);
    } catch { setRequests([]); }
    setLoading(false);
  }, [statusFilter, typeFilter, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Independent of the display filters above — this is what drives the
  // sidebar's pending-count badge, so it always reflects every pending
  // request regardless of which status/type the list is currently showing.
  const fetchPendingCount = useCallback(async () => {
    if (!onPendingChange) return;
    try {
      const { data } = await axios.get(`${API}/portal/hod/correction-requests`, { ...headers(), params: { status: 'pending' } });
      onPendingChange((data || []).length);
    } catch { /* leave the badge as-is on failure */ }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchRequests(); }, [fetchRequests]);
  useEffect(() => { fetchPendingCount(); }, [fetchPendingCount]);

  const handleAction = async (id, status) => {
    const request = requests.find((r) => r._id === id);
    if (status === 'rejected' && request?.type === 'attendance' && !String(comment[id] || '').trim()) {
      alert('A comment is required when rejecting an attendance correction request.');
      return;
    }
    setActing((p) => ({ ...p, [id]: true }));
    try {
      await axios.patch(`${API}/portal/hod/correction-requests/${id}`, { status, reviewerComment: comment[id] || '' }, headers());
      fetchRequests();
      fetchPendingCount();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed.');
    }
    setActing((p) => ({ ...p, [id]: false }));
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Correction Requests</h2>
      <p className="text-gray-500 text-sm mb-6">Review and approve or reject attendance, result-sheet, and profile correction requests from your department.</p>

      <div className="flex flex-wrap items-center gap-4 mb-5">
        <div className="flex gap-2 flex-wrap">
          {[['', 'All Status'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']].map(([val, label]) => (
            <button key={val} onClick={() => setStatusFilter(val)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold border transition ${
                statusFilter === val ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}>{label}</button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {[['', 'All Types'], ['attendance', 'Attendance'], ['result-sheet', 'Result Sheet'], ['student-profile', 'Profile']].map(([val, label]) => (
            <button key={val} onClick={() => setTypeFilter(val)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold border transition ${
                typeFilter === val ? 'bg-indigo-50 text-indigo-700 border-indigo-300' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}>{label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
          <p className="text-3xl mb-3">✅</p>
          <p className="text-gray-500">No correction requests found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <div key={r._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">{TYPE_LABEL[r.type] || r.type}</span>
                    <span className="font-bold text-gray-800">{r.subject || r.studentName || 'Request'}</span>
                    {r.examType && <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">{r.examType}</span>}
                    {r.semester && <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">{r.semester}</span>}
                  </div>
                  <p className="text-gray-500 text-xs mt-1">
                    {r.type === 'attendance' ? (
                      <>By <strong>{r.studentName}</strong> ({r.studentRegistrationNo}) · {new Date(r.classDate || r.createdAt).toLocaleDateString('en-GB')}</>
                    ) : (
                      <>By <strong>{r.teacherName || r.teacherId || r.studentName || r.studentRegistrationNo}</strong> · {new Date(r.createdAt).toLocaleDateString('en-GB')}</>
                    )}
                  </p>
                </div>
                <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[r.status] || 'bg-gray-100 text-gray-600'}`}>{r.status}</span>
              </div>

              {r.type === 'attendance' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-4">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Current → Requested</p>
                    <p className="text-gray-700 font-semibold">{r.currentStatus} → {r.requestedStatus}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Reason</p>
                    <p className="text-gray-700">{r.reason}</p>
                  </div>
                  <AttachmentGallery attachments={r.attachments} />
                </div>
              ) : r.type === 'student-profile' ? (
                <div className="grid grid-cols-1 gap-3 text-sm mb-4">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Requested Field Changes</p>
                    {(r.requestedFieldChanges || []).map((c, i) => (
                      <p key={i} className="text-gray-700">{c.field}: <span className="line-through text-gray-400">{c.oldValue}</span> → <span className="font-semibold">{c.newValue}</span></p>
                    ))}
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Reason</p>
                    <p className="text-gray-700">{r.reason}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-4">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Reason</p>
                    <p className="text-gray-700">{r.reason}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Requested Changes</p>
                    <p className="text-gray-700">{r.requestedChanges}</p>
                  </div>
                </div>
              )}

              {r.status === 'pending' ? (
                <div className="border-t border-gray-100 pt-4">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Reviewer Comment {r.type === 'attendance' ? '(required to reject)' : '(optional)'}
                  </label>
                  <textarea value={comment[r._id] || ''} onChange={(e) => setComment((p) => ({ ...p, [r._id]: e.target.value }))}
                    rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 resize-none mb-3"
                    placeholder="Add a note…" />
                  <div className="flex gap-2">
                    <button onClick={() => handleAction(r._id, 'approved')} disabled={acting[r._id]}
                      className="flex-1 py-2 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-60">
                      {acting[r._id] ? '…' : '✅ Approve'}
                    </button>
                    <button onClick={() => handleAction(r._id, 'rejected')} disabled={acting[r._id]}
                      className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-60">
                      {acting[r._id] ? '…' : '✕ Reject'}
                    </button>
                  </div>
                </div>
              ) : (
                r.reviewerComment && (
                  <div className="border-t border-gray-100 pt-3 mt-2">
                    <p className="text-xs text-gray-400">Reviewer note: <span className="italic text-gray-600">{r.reviewerComment}</span></p>
                    {r.reviewedAt && <p className="text-xs text-gray-400 mt-0.5">Reviewed on {new Date(r.reviewedAt).toLocaleDateString('en-GB')}</p>}
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
