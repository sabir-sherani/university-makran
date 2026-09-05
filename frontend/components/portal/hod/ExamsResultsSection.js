// HOD Examinations & Results section — existing dept result sheets +
// datesheets, now with an Eligibility sub-view per exam (Phase 6, 6.1 —
// renamed/extended from the old "Dept Results" tab). Extracted out of
// hod.js per hard rule 9; the result-sheet list/detail/print behavior is
// unchanged from before Phase 6.
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Spinner } from '../ui.js';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const RS_BADGE = { submitted: 'bg-yellow-100 text-yellow-800', finalized: 'bg-green-100 text-green-800', draft: 'bg-gray-100 text-gray-600' };
const ELIGIBILITY_BADGE = { eligible: 'bg-green-100 text-green-800', borderline: 'bg-yellow-100 text-yellow-800', 'not-eligible': 'bg-red-100 text-red-700', 'no-data': 'bg-gray-100 text-gray-500' };

function ResultSheetsView({ hod, token }) {
  function headers() { return { headers: { Authorization: `Bearer ${token}` } }; }
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ semester: '', status: '', subject: '' });
  const [detail, setDetail] = useState(null);

  const fetchSheets = useCallback(async (f = filters) => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (f.semester) q.set('semester', f.semester);
      if (f.status) q.set('status', f.status);
      if (f.subject) q.set('subject', f.subject);
      const { data } = await axios.get(`${API}/portal/hod/result-sheets${q.toString() ? '?' + q : ''}`, headers());
      setSheets(data || []);
    } catch { setSheets([]); }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => { fetchSheets(); }, [fetchSheets]);

  const openDetail = async (sheet) => {
    setDetail(sheet);
    if (!sheet.entries) {
      try { const { data } = await axios.get(`${API}/portal/hod/result-sheets/${sheet._id}`, headers()); setDetail(data); }
      catch { /* use what we have */ }
    }
  };

  if (detail) {
    const sheet = detail;
    const entries = sheet.entries || [];
    const passCount = entries.filter((e) => e.resultStatus === 'Pass').length;
    const failCount = entries.filter((e) => e.resultStatus === 'Fail').length;
    return (
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 hod-no-print">
          <button onClick={() => setDetail(null)} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-medium">← Back to Results</button>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 min-h-11 text-sm font-semibold rounded-lg text-white" style={{ background: '#041476' }}>
            🖨️ Print / Export PDF
          </button>
        </div>

        <div className="hod-print-only" style={{ display: 'none', marginBottom: '20px', borderBottom: '2px solid #041476', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
            <img src="/logo.png.webp" alt="" style={{ height: '56px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#041476' }}>University of Makran, Panjgur</div>
              <div style={{ fontSize: '13px', color: '#FA7902', fontWeight: '600', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {sheet.examType} Examination Result Sheet
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', color: '#555' }}>
            <span>Dept: <strong>{sheet.department}</strong></span>
            <span>Program: <strong>{sheet.program}</strong></span>
            <span>Semester: <strong>{sheet.semester}</strong></span>
            <span>Teacher: <strong>{sheet.teacherName}</strong></span>
            <span>Printed: <strong>{new Date().toLocaleDateString('en-GB')}</strong></span>
          </div>
        </div>

        <div id="hod-sheet-printable">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">{sheet.subject}</h2>
                <p className="text-gray-500 text-sm mt-1">{sheet.department} · {sheet.program} · {sheet.semester} · {sheet.academicSession} · {sheet.examType}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${RS_BADGE[sheet.status] || 'bg-gray-100 text-gray-600'}`}>{sheet.status}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-4">
              {[['Teacher', sheet.teacherName || sheet.teacherId], ['Teacher ID', sheet.teacherId], ['Total Marks', sheet.totalMarks], ['Passing Marks', sheet.passingMarks], ['Students', entries.length], ['Pass', passCount], ['Fail', failCount], ['Submitted', sheet.submittedAt ? new Date(sheet.submittedAt).toLocaleDateString('en-GB') : '—']].map(([k, v]) => (
                <div key={k} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 uppercase font-bold">{k}</p>
                  <p className="font-bold text-gray-800 mt-0.5">{v ?? '—'}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50"><h3 className="font-bold text-gray-800">Student Entries ({entries.length})</h3></div>
            {entries.length === 0 ? <div className="p-8 text-center text-gray-400">No entries.</div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>{['#', 'Reg No', 'Name', 'Marks/Total', 'Grade', 'Status', 'Remarks'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {entries.map((e, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{e.registrationNo}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800">{e.studentName}</td>
                        <td className="px-4 py-3 font-bold text-gray-800">{e.resultStatus === 'Absent' || e.resultStatus === 'Withheld' ? '—' : `${e.obtainedMarks}/${sheet.totalMarks}`}</td>
                        <td className="px-4 py-3"><span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">{e.grade || '—'}</span></td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${e.resultStatus === 'Pass' ? 'bg-green-100 text-green-800' : e.resultStatus === 'Fail' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{e.resultStatus}</span></td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{e.remarks || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="hod-print-only" style={{ display: 'none', marginTop: '36px', borderTop: '1px solid #ccc', paddingTop: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#555' }}>
              <div style={{ textAlign: 'center', minWidth: '150px' }}>
                <div style={{ borderTop: '1px solid #333', paddingTop: '4px', marginTop: '36px' }}>HOD Signature</div>
                <div style={{ fontSize: '10px', marginTop: '2px' }}>{hod?.fullName}</div>
              </div>
              <div style={{ textAlign: 'center', fontSize: '10px', color: '#888' }}>
                <div>University of Makran, Panjgur — Examination Section</div>
                <div>Printed on {new Date().toLocaleDateString('en-GB')}</div>
              </div>
              <div style={{ textAlign: 'center', minWidth: '150px' }}>
                <div style={{ borderTop: '1px solid #333', paddingTop: '4px', marginTop: '36px' }}>Controller of Examinations</div>
                <div style={{ fontSize: '10px', marginTop: '2px' }}>University of Makran</div>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @media print {
            body * { visibility: hidden; }
            #hod-sheet-printable, #hod-sheet-printable * { visibility: visible; }
            #hod-sheet-printable { position: fixed; top: 0; left: 0; width: 100%; padding: 20px; }
            .hod-no-print { display: none !important; }
            .hod-print-only { display: block !important; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <p className="text-gray-500 text-sm mb-5">View result sheets submitted by teachers in your department.</p>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5 flex flex-wrap gap-3 items-end">
        <input value={filters.subject} onChange={(e) => setFilters((p) => ({ ...p, subject: e.target.value }))} placeholder="Subject…" className="px-3 py-2 border border-gray-200 rounded-xl text-xs" />
        <select value={filters.semester} onChange={(e) => setFilters((p) => ({ ...p, semester: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white">
          <option value="">All Semesters</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={`Semester ${n}`}>Semester {n}</option>)}
        </select>
        <select value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white">
          <option value="">All Status</option>
          <option value="submitted">Submitted</option>
          <option value="finalized">Finalized</option>
        </select>
        <button onClick={() => fetchSheets(filters)} className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:opacity-90">Apply</button>
        {sheets.length > 0 && <button onClick={() => window.print()} className="px-5 py-2 rounded-xl text-xs font-bold text-white" style={{ background: '#041476' }}>🖨️ Print Report</button>}
      </div>

      {loading ? <Spinner /> : sheets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm"><p className="text-3xl mb-3">📋</p><p className="text-gray-500">No result sheets submitted yet.</p></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Subject', 'Program', 'Semester', 'Type', 'Teacher', 'Students', 'Submitted', 'Status', 'Action'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sheets.map((s) => (
                  <tr key={s._id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-semibold text-gray-800 max-w-xs truncate">{s.subject}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{s.program}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{s.semester}</td>
                    <td className="px-4 py-3"><span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">{s.examType}</span></td>
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{s.teacherName || s.teacherId}</td>
                    <td className="px-4 py-3 text-center font-bold text-gray-700">{s.entries?.length ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('en-GB') : '—'}</td>
                    <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${RS_BADGE[s.status] || 'bg-gray-100 text-gray-600'}`}>{s.status}</span></td>
                    <td className="px-4 py-3"><button onClick={() => openDetail(s)} className="text-xs text-indigo-600 font-bold px-3 py-1.5 border border-indigo-200 rounded-lg hover:bg-indigo-50">View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-gray-50 bg-gray-50"><p className="text-xs text-gray-400">Showing {sheets.length} result sheet{sheets.length !== 1 ? 's' : ''}</p></div>
        </div>
      )}
    </>
  );
}

function EligibilityView({ token }) {
  function headers() { return { headers: { Authorization: `Bearer ${token}` } }; }
  const [sessions, setSessions] = useState([]);
  const [filters, setFilters] = useState({ sessionId: '', semesterNumber: '', examType: '' });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get(`${API}/lookups/sessions`).then(({ data }) => setSessions(data || [])).catch(() => {});
  }, []);

  const runReport = async () => {
    if (!filters.sessionId || !filters.semesterNumber) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/portal/hod/reports/exam-eligibility`, {
        params: { sessionId: filters.sessionId, semesterNumber: filters.semesterNumber, examType: filters.examType || undefined },
        ...headers(),
      });
      setReport(data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load eligibility report.');
      setReport(null);
    }
    setLoading(false);
  };

  const exportXlsx = async () => {
    if (!filters.sessionId || !filters.semesterNumber) return;
    try {
      const params = { sessionId: filters.sessionId, semesterNumber: filters.semesterNumber, format: 'xlsx' };
      if (filters.examType) params.examType = filters.examType;
      const res = await axios.get(`${API}/portal/hod/reports/exam-eligibility`, { params, ...headers(), responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Exam_Eligibility_Sem${filters.semesterNumber}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to export eligibility report.');
    }
  };

  return (
    <>
      <p className="text-gray-500 text-sm mb-5">Every student × course with attendance %, verdict against the department&rsquo;s threshold, and any pending correction that could change it.</p>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5 flex flex-wrap gap-3 items-end hod-no-print">
        <select value={filters.sessionId} onChange={(e) => setFilters((f) => ({ ...f, sessionId: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white">
          <option value="">Select session…</option>
          {sessions.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <select value={filters.semesterNumber} onChange={(e) => setFilters((f) => ({ ...f, semesterNumber: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white">
          <option value="">Select semester…</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>Semester {n}</option>)}
        </select>
        <select value={filters.examType} onChange={(e) => setFilters((f) => ({ ...f, examType: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white">
          <option value="">Exam type (optional)</option>
          <option value="Mid">Mid</option>
          <option value="Final">Final</option>
        </select>
        <button onClick={runReport} disabled={!filters.sessionId || !filters.semesterNumber} className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:opacity-90 disabled:opacity-50">Run Report</button>
        {report && (
          <>
            <button onClick={() => window.print()} className="px-5 py-2 rounded-xl text-xs font-bold text-white" style={{ background: '#041476' }}>🖨️ Print</button>
            <button onClick={exportXlsx} className="px-5 py-2 rounded-xl text-xs font-bold border border-green-300 text-green-700 hover:bg-green-50">⬇ Export .xlsx</button>
          </>
        )}
      </div>

      {loading ? <Spinner /> : report && (
        <div id="hod-eligibility-printable">
          {report.summary.pendingCorrections > 0 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 text-sm rounded-lg px-4 py-3 mb-4">
              ⚠️ {report.summary.pendingCorrections} row(s) have a pending attendance correction request that could change the verdict — do not finalize the eligibility list until these are resolved.
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            {[['Total Rows', report.summary.total], ['Eligible', report.summary.eligible], ['Borderline', report.summary.borderline], ['Not Eligible', report.summary.notEligible]].map(([k, v]) => (
              <div key={k} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <p className="text-xs text-gray-400 uppercase font-bold">{k}</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{v}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Reg No', 'Name', 'Course', 'Attended/Total', 'Attendance %', 'Status', 'Shortfall', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {report.rows.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.registrationNo}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{r.studentName}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{r.subject}</td>
                    <td className="px-4 py-3 text-gray-600">{r.attended}/{r.total}</td>
                    <td className="px-4 py-3 font-bold">{r.attendancePercent != null ? `${r.attendancePercent}%` : '—'}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${ELIGIBILITY_BADGE[r.status]}`}>{r.status}</span></td>
                    <td className="px-4 py-3 text-gray-500">{r.shortfallSessions || '—'}</td>
                    <td className="px-4 py-3">{r.pendingCorrection && <span className="text-xs font-bold text-yellow-700">⚠ Pending correction</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        </div>
      )}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #hod-eligibility-printable, #hod-eligibility-printable * { visibility: visible; }
          #hod-eligibility-printable { position: fixed; top: 0; left: 0; width: 100%; padding: 16px; }
        }
      `}</style>
    </>
  );
}

export default function ExamsResultsSection({ hod, token }) {
  const [view, setView] = useState('list');
  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="text-2xl font-bold text-gray-800">Examinations &amp; Results — {hod.department}</h2>
      </div>
      <div className="flex gap-2 mb-5 hod-no-print">
        {[['list', 'Result Sheets'], ['eligibility', 'Eligibility']].map(([v, label]) => (
          <button key={v} onClick={() => setView(v)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold border transition ${view === v ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            {label}
          </button>
        ))}
      </div>
      {view === 'list' ? <ResultSheetsView hod={hod} token={token} /> : <EligibilityView token={token} />}
    </>
  );
}
