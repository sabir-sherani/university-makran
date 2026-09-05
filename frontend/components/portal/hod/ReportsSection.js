// HOD Reports section (Phase 6, 6.2) — monthly and semester departmental
// reports, each with an on-screen view, print, and .xlsx export. The
// exam-eligibility report (the third one from 6.2) lives under
// Examinations & Results -> Eligibility, next to the result sheets it's
// most often read alongside — see ExamsResultsSection.js.
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { inputCls, labelCls, Spinner } from '../ui.js';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

function downloadBlob(res, filename) {
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  window.URL.revokeObjectURL(url);
}

function MonthlyReport({ hod, token }) {
  function headers() { return { headers: { Authorization: `Bearer ${token}` } }; }
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/portal/hod/reports/monthly`, { params: { month }, ...headers() });
      setReport(data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load monthly report.');
      setReport(null);
    }
    setLoading(false);
  };

  useEffect(() => { run(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const exportXlsx = async () => {
    try {
      const res = await axios.get(`${API}/portal/hod/reports/monthly`, { params: { month, format: 'xlsx' }, ...headers(), responseType: 'blob' });
      downloadBlob(res, `Monthly_Report_${month}.xlsx`);
    } catch { alert('Failed to export report.'); }
  };

  const delta = report?.monthOverMonthDelta;

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5 flex flex-wrap gap-3 items-end hod-no-print">
        <div>
          <label className={labelCls}>Month</label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={inputCls} />
        </div>
        <button onClick={run} className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:opacity-90">Run Report</button>
        {report && (
          <>
            <button onClick={() => window.print()} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white" style={{ background: '#041476' }}>🖨️ Print</button>
            <button onClick={exportXlsx} className="px-5 py-2.5 rounded-xl text-xs font-bold border border-green-300 text-green-700 hover:bg-green-50">⬇ Export .xlsx</button>
          </>
        )}
      </div>

      {loading ? <Spinner /> : report && (
        <div id="hod-monthly-printable">
          <div className="hod-print-header" style={{ display: 'none', marginBottom: '14px', borderBottom: '2px solid #041476', paddingBottom: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#041476' }}>University of Makran, Panjgur</div>
            <div style={{ fontSize: '11px', color: '#FA7902', fontWeight: 600, marginTop: '2px' }}>Monthly Attendance Report — {hod.department} — {month}</div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            {[
              ['Sessions Required', report.totals.sessionsRequired],
              ['Sessions Held', report.totals.sessionsHeld],
              ['Make-up Sessions', report.totals.makeupSessions],
              ['Unmarked', report.totals.unmarkedSessions],
              ['Avg Attendance', report.totals.averageAttendance != null ? `${report.totals.averageAttendance}%` : '—'],
              ['Defaulters', report.totals.defaultersCount],
              ['Pending Result Sheets', report.totals.pendingResultSheets],
            ].map(([k, v]) => (
              <div key={k} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <p className="text-xs text-gray-400 uppercase font-bold">{k}</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{v}</p>
              </div>
            ))}
          </div>

          {delta && (
            <p className="text-xs text-gray-500 mb-4">
              vs {delta.previousMonth}: attendance {delta.averageAttendanceDelta != null ? (delta.averageAttendanceDelta >= 0 ? `+${delta.averageAttendanceDelta}` : delta.averageAttendanceDelta) : '—'} pts,
              {' '}sessions held {delta.sessionsHeldDelta >= 0 ? `+${delta.sessionsHeldDelta}` : delta.sessionsHeldDelta}
            </p>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-50"><h3 className="font-bold text-gray-800">Per-Course Breakdown</h3></div>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Course', 'Teacher', 'Required', 'Held', 'Make-up', 'Unmarked', 'Avg %', 'Defaulters', 'Pending Docs'].map((h) => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {report.courses.map((c) => (
                  <tr key={c.ongoingClassId} className="hover:bg-gray-50/50">
                    <td className="px-3 py-3 font-semibold text-gray-800">{c.subject}</td>
                    <td className="px-3 py-3 text-gray-600 text-xs">{c.teacherName}</td>
                    <td className="px-3 py-3">{c.sessionsRequired}</td>
                    <td className="px-3 py-3">{c.sessionsHeld}</td>
                    <td className="px-3 py-3">{c.makeupSessions}</td>
                    <td className="px-3 py-3">{c.unmarkedSessions > 0 ? <span className="font-bold text-red-600">{c.unmarkedSessions}</span> : 0}</td>
                    <td className="px-3 py-3">{c.averageAttendance != null ? `${c.averageAttendance}%` : '—'}</td>
                    <td className="px-3 py-3">{c.defaultersCount}</td>
                    <td className="px-3 py-3">{c.pendingResultSheets}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50"><h3 className="font-bold text-gray-800">Per-Teacher Delivery Rate</h3></div>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Teacher', 'Required', 'Held', 'Delivery Rate'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {report.teacherDelivery.map((t, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-semibold text-gray-800">{t.teacherName}</td>
                    <td className="px-4 py-3">{t.required}</td>
                    <td className="px-4 py-3">{t.held}</td>
                    <td className="px-4 py-3 font-bold">{t.deliveryRate != null ? `${t.deliveryRate}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        </div>
      )}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body * { visibility: hidden; }
          #hod-monthly-printable, #hod-monthly-printable * { visibility: visible; }
          #hod-monthly-printable { position: fixed; top: 0; left: 0; width: 100%; padding: 12px; }
          #hod-monthly-printable .hod-print-header { display: block !important; }
        }
      `}</style>
    </>
  );
}

function SemesterReport({ hod, token }) {
  function headers() { return { headers: { Authorization: `Bearer ${token}` } }; }
  const [sessions, setSessions] = useState([]);
  const [filters, setFilters] = useState({ sessionId: '', semesterNumber: '' });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get(`${API}/lookups/sessions`).then(({ data }) => setSessions(data || [])).catch(() => {});
  }, []);

  const run = async () => {
    if (!filters.sessionId || !filters.semesterNumber) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/portal/hod/reports/semester`, { params: filters, ...headers() });
      setReport(data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load semester report.');
      setReport(null);
    }
    setLoading(false);
  };

  const exportXlsx = async () => {
    if (!filters.sessionId || !filters.semesterNumber) return;
    try {
      const res = await axios.get(`${API}/portal/hod/reports/semester`, { params: { ...filters, format: 'xlsx' }, ...headers(), responseType: 'blob' });
      downloadBlob(res, `Semester_Report_${filters.semesterNumber}.xlsx`);
    } catch { alert('Failed to export report.'); }
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5 flex flex-wrap gap-3 items-end hod-no-print">
        <select value={filters.sessionId} onChange={(e) => setFilters((f) => ({ ...f, sessionId: e.target.value }))} className={inputCls}>
          <option value="">Select session…</option>
          {sessions.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <select value={filters.semesterNumber} onChange={(e) => setFilters((f) => ({ ...f, semesterNumber: e.target.value }))} className={inputCls}>
          <option value="">Select semester…</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>Semester {n}</option>)}
        </select>
        <button onClick={run} disabled={!filters.sessionId || !filters.semesterNumber} className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:opacity-90 disabled:opacity-50">Run Report</button>
        {report && (
          <>
            <button onClick={() => window.print()} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white" style={{ background: '#041476' }}>🖨️ Print</button>
            <button onClick={exportXlsx} className="px-5 py-2.5 rounded-xl text-xs font-bold border border-green-300 text-green-700 hover:bg-green-50">⬇ Export .xlsx</button>
          </>
        )}
      </div>

      {loading ? <Spinner /> : report && (
        <div id="hod-semester-printable" className="space-y-6">
          <div className="hod-print-header" style={{ display: 'none', marginBottom: '14px', borderBottom: '2px solid #041476', paddingBottom: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#041476' }}>University of Makran, Panjgur</div>
            <div style={{ fontSize: '11px', color: '#FA7902', fontWeight: 600, marginTop: '2px' }}>Semester Report — {hod.department} — Semester {report.semesterNumber}</div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"><p className="text-xs text-gray-400 uppercase font-bold">Enrolled</p><p className="text-2xl font-bold mt-1">{report.enrolment.approved}</p></div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"><p className="text-xs text-gray-400 uppercase font-bold">Pending</p><p className="text-2xl font-bold mt-1">{report.enrolment.pending}</p></div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"><p className="text-xs text-gray-400 uppercase font-bold">Pass</p><p className="text-2xl font-bold mt-1 text-green-600">{report.passCount}</p></div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"><p className="text-xs text-gray-400 uppercase font-bold">Fail</p><p className="text-2xl font-bold mt-1 text-red-600">{report.failCount}</p></div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-800 mb-3">Attendance Distribution</h3>
            <div className="flex gap-4 flex-wrap">
              {Object.entries(report.attendanceDistribution).map(([bucket, count]) => (
                <div key={bucket} className="text-center">
                  <p className="text-2xl font-bold text-gray-800">{count}</p>
                  <p className="text-xs text-gray-400">{bucket}%</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-800 mb-3">Grade Distribution</h3>
            <div className="flex gap-3 flex-wrap">
              {Object.entries(report.gradeDistribution).map(([grade, count]) => (
                <span key={grade} className="px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">{grade}: {count}</span>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50"><h3 className="font-bold text-gray-800">Course-wise Averages</h3></div>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Subject', 'Teacher', 'Students', 'Avg Marks %', 'Avg Attendance %'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {report.courseAverages.map((c, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-semibold text-gray-800">{c.subject}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{c.teacherName}</td>
                    <td className="px-4 py-3">{c.studentCount}</td>
                    <td className="px-4 py-3">{c.averageMarksPercent != null ? `${c.averageMarksPercent}%` : '—'}</td>
                    <td className="px-4 py-3">{c.averageAttendance != null ? `${c.averageAttendance}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50"><h3 className="font-bold text-gray-800">Teacher Workload Delivered</h3></div>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Teacher', 'Courses', 'Sessions Delivered'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {report.teacherWorkload.map((t, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-semibold text-gray-800">{t.teacherName}</td>
                    <td className="px-4 py-3">{t.coursesCount}</td>
                    <td className="px-4 py-3">{t.sessionsDelivered}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-800 mb-3">Correction Requests</h3>
            <p className="text-sm text-gray-600">Raised: <strong>{report.correctionRequests.raised}</strong> · Approved: <strong className="text-green-600">{report.correctionRequests.approved}</strong> · Rejected: <strong className="text-red-600">{report.correctionRequests.rejected}</strong> · Pending: <strong className="text-yellow-600">{report.correctionRequests.pending}</strong></p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50"><h3 className="font-bold text-gray-800">Trend — Last 4 Sessions (Semester {report.semesterNumber})</h3></div>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Session', 'Avg Attendance %', 'Pass Rate %'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {report.trend.map((t, i) => (
                  <tr key={i} className={t.isCurrent ? 'bg-indigo-50/50' : 'hover:bg-gray-50/50'}>
                    <td className="px-4 py-3 font-semibold text-gray-800">{t.session}{t.isCurrent && ' (current)'}</td>
                    <td className="px-4 py-3">{t.averageAttendance != null ? `${t.averageAttendance}%` : '—'}</td>
                    <td className="px-4 py-3">{t.passRate != null ? `${t.passRate}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        </div>
      )}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body * { visibility: hidden; }
          #hod-semester-printable, #hod-semester-printable * { visibility: visible; }
          #hod-semester-printable { position: fixed; top: 0; left: 0; width: 100%; padding: 12px; }
          #hod-semester-printable .hod-print-header { display: block !important; }
        }
      `}</style>
    </>
  );
}

export default function ReportsSection({ hod, token }) {
  const [view, setView] = useState('monthly');
  return (
    <>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Reports — {hod.department}</h2>
      <p className="text-gray-500 text-sm mb-5">Every report is computed live from Attendance, ResultSheet, and TimetableSlot records — never from cached student fields.</p>
      <div className="flex gap-2 mb-5 hod-no-print">
        {[['monthly', 'Monthly'], ['semester', 'Semester']].map(([v, label]) => (
          <button key={v} onClick={() => setView(v)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold border transition ${view === v ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            {label}
          </button>
        ))}
        <span className="px-4 py-1.5 rounded-full text-xs font-bold border border-gray-200 text-gray-400">Exam Eligibility — see Examinations &amp; Results</span>
      </div>
      {view === 'monthly' ? <MonthlyReport hod={hod} token={token} /> : <SemesterReport hod={hod} token={token} />}
    </>
  );
}
