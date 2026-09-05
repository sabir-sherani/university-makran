// Student Attendance section — per-course percentage bars against the
// department's minimum threshold, a session list, and the attendance
// correction-request flow (file + supporting documents, HOD-reviewed).
// Extracted as its own component per hard rule 9 (student.js is already
// 2500+ lines and must not keep growing) rather than inlined into the page.
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Alert, inputCls, labelCls, Spinner } from '../ui.js';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const STATUS_OPTIONS = ['Present', 'Absent', 'Late', 'Excused'];
const MAX_FILES = 5;
const MAX_FILE_MB = 5;
const ALLOWED_EXT = ['pdf', 'jpg', 'jpeg', 'png'];

const STATUS_BADGE = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700',
};

const EMPTY_DATA = { minAttendancePercent: 75, courses: [], sessions: [] };

// Mirrors the backend's own checks (extension whitelist, per-file size cap,
// 1-5 files) so the user finds out about a bad file before an upload starts,
// not after multer's fileFilter rejects it server-side.
function validateFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return { error: 'At least one supporting document is required.' };
  if (files.length > MAX_FILES) return { error: `You can attach at most ${MAX_FILES} files.` };
  for (const f of files) {
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) return { error: `${f.name}: only PDF, JPG, and PNG files are allowed.` };
    if (f.size > MAX_FILE_MB * 1024 * 1024) return { error: `${f.name} is larger than ${MAX_FILE_MB}MB.` };
  }
  return { files };
}

function AttendanceBar({ course, minAttendancePercent }) {
  const pct = Math.max(0, Math.min(100, course.attendancePercent));
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="font-bold text-gray-800 text-sm">{course.subject}</p>
          <p className="text-xs text-gray-400">{course.className}</p>
        </div>
        <span className={`text-lg font-extrabold ${course.eligible ? 'text-green-600' : 'text-red-600'}`}>{course.attendancePercent}%</span>
      </div>
      <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${course.eligible ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
        <div className="absolute top-0 bottom-0 w-0.5 bg-gray-700" style={{ left: `${minAttendancePercent}%` }}
          title={`${minAttendancePercent}% minimum required`} />
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <p className="text-xs text-gray-400">{course.Present + course.Late} / {course.total} sessions attended</p>
        {!course.eligible && <p className="text-xs font-semibold text-red-600">Below {minAttendancePercent}% minimum</p>}
      </div>
    </div>
  );
}

export default function AttendanceSection({ student, token }) {
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [view, setView] = useState('overview'); // 'overview' | 'requests'

  const [modalSession, setModalSession] = useState(null);
  const [form, setForm] = useState({ requestedStatus: '', reason: '' });
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  function headers() { return { headers: { Authorization: `Bearer ${token}` } }; }

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/portal/student/attendance`, headers());
      setData(data || EMPTY_DATA);
    } catch { setData(EMPTY_DATA); }
    setLoading(false);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRequests = useCallback(async () => {
    setReqLoading(true);
    try {
      const { data } = await axios.get(`${API}/portal/student/attendance-corrections`, headers());
      setRequests(data || []);
    } catch { setRequests([]); }
    setReqLoading(false);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchAttendance(); fetchRequests(); }, [fetchAttendance, fetchRequests]);

  function openCorrectionModal(session) {
    setModalSession(session);
    setForm({ requestedStatus: '', reason: '' });
    setFiles([]);
    setFileError('');
    setSubmitError('');
    setUploadProgress(0);
  }

  function handleFileChange(e) {
    const { files: chosen, error } = validateFiles(e.target.files);
    if (error) { setFileError(error); setFiles([]); e.target.value = ''; return; }
    setFileError('');
    setFiles(chosen);
  }

  async function submitCorrection(e) {
    e.preventDefault();
    if (!form.requestedStatus) { setSubmitError('Select the status you are requesting.'); return; }
    if (form.reason.trim().length < 20) { setSubmitError('Reason must be at least 20 characters.'); return; }
    if (!files.length) { setSubmitError('At least one supporting document is required.'); return; }

    setSubmitting(true); setSubmitError(''); setUploadProgress(0);
    try {
      const fd = new FormData();
      fd.append('attendanceSessionId', modalSession._id);
      fd.append('requestedStatus', form.requestedStatus);
      fd.append('reason', form.reason.trim());
      files.forEach((f) => fd.append('files', f));

      await axios.post(`${API}/portal/student/attendance-corrections`, fd, {
        headers: { Authorization: `Bearer ${token}` },
        onUploadProgress: (evt) => {
          if (evt.total) setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
        },
      });

      setModalSession(null);
      fetchAttendance();
      fetchRequests();
      setView('requests');
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to submit correction request.');
    }
    setSubmitting(false);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Attendance</h2>
          <p className="text-gray-500 text-sm">Your per-course attendance and correction requests.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView('overview')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold border transition ${view === 'overview' ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            Overview
          </button>
          <button onClick={() => setView('requests')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold border transition ${view === 'requests' ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            My Requests {requests.length > 0 && `(${requests.length})`}
          </button>
        </div>
      </div>

      {view === 'overview' ? (
        loading ? (
          <Spinner />
        ) : (
          <div className="space-y-6">
            {data.courses.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.courses.map((c) => (
                  <AttendanceBar key={c.ongoingClassId} course={c} minAttendancePercent={data.minAttendancePercent} />
                ))}
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <p className="font-bold text-gray-800 text-sm">Session History</p>
              </div>
              {data.sessions.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-10">No attendance sessions recorded yet.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {data.sessions.map((s) => (
                    <div key={s._id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {s.subject}{s.isMakeup && <span className="ml-2 text-xs font-normal text-blue-600">(Make-up)</span>}
                        </p>
                        <p className="text-xs text-gray-400">{new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                          s.status === 'Present' ? 'bg-green-100 text-green-700' :
                          s.status === 'Late'    ? 'bg-yellow-100 text-yellow-700' :
                          s.status === 'Excused' ? 'bg-gray-100 text-gray-600' :
                                                    'bg-red-100 text-red-700'
                        }`}>{s.status}</span>
                        {s.correctionStatus ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_BADGE[s.correctionStatus]}`}>
                            {s.correctionStatus === 'pending' ? 'Review pending' : `${s.correctionStatus} → ${s.correctionRequestedStatus}`}
                          </span>
                        ) : (s.status === 'Absent' || s.status === 'Late') && (
                          <button onClick={() => openCorrectionModal(s)} className="text-xs font-bold text-primary hover:underline whitespace-nowrap">
                            Request correction
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        reqLoading ? (
          <Spinner />
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
            <p className="text-3xl mb-3">📄</p>
            <p className="text-gray-500">You haven&apos;t submitted any attendance correction requests.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{r.subject}</p>
                    <p className="text-xs text-gray-400">{new Date(r.classDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[r.status] || 'bg-gray-100 text-gray-600'}`}>{r.status}</span>
                </div>
                <p className="text-sm text-gray-600 mb-1"><span className="font-semibold">{r.currentStatus}</span> → <span className="font-semibold">{r.requestedStatus}</span></p>
                <p className="text-xs text-gray-500">{r.reason}</p>
                <p className="text-xs text-gray-400 mt-1">{(r.attachments || []).length} attachment{(r.attachments || []).length !== 1 ? 's' : ''}</p>
                {r.reviewerComment && (
                  <p className="text-xs text-gray-400 mt-2 border-t border-gray-50 pt-2">HOD note: <span className="italic text-gray-600">{r.reviewerComment}</span></p>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {modalSession && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !submitting && setModalSession(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">Request Attendance Correction</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {modalSession.subject} · {new Date(modalSession.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · currently marked <strong>{modalSession.status}</strong>
              </p>
            </div>
            <form onSubmit={submitCorrection} className="p-5 space-y-4">
              <Alert type="error" msg={submitError} />
              <div>
                <label className={labelCls}>Requested Status</label>
                <select className={inputCls} value={form.requestedStatus}
                  onChange={(e) => setForm((f) => ({ ...f, requestedStatus: e.target.value }))}>
                  <option value="">Select status…</option>
                  {STATUS_OPTIONS.filter((s) => s !== modalSession.status).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Reason (20-1000 characters)</label>
                <textarea className={inputCls} rows={4} value={form.reason} minLength={20} maxLength={1000}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="Explain why this attendance record should be corrected…" />
                <p className="text-xs text-gray-400 mt-1">{form.reason.trim().length}/1000</p>
              </div>
              <div>
                <label className={labelCls}>Supporting Documents (PDF/JPG/PNG, up to {MAX_FILES} files, {MAX_FILE_MB}MB each)</label>
                <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-primary file:font-semibold hover:file:bg-indigo-100" />
                {fileError && <p className="text-xs text-red-600 mt-1">{fileError}</p>}
                {files.length > 0 && (
                  <ul className="text-xs text-gray-500 mt-2 space-y-0.5">
                    {files.map((f, i) => <li key={i}>📎 {f.name} ({(f.size / 1024).toFixed(0)} KB)</li>)}
                  </ul>
                )}
              </div>
              {submitting && (
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-primary h-full transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setModalSession(null)} disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 disabled:opacity-60">
                  {submitting ? `Uploading… ${uploadProgress}%` : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
