// HOD Students section — existing list + attendance %, eligibility flag,
// and per-student drill-down (Phase 6, 6.1). Extracted out of hod.js per
// hard rule 9.
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Spinner, STATUS_BADGE } from '../ui.js';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

function StudentDrillDown({ student, token, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    axios.get(`${API}/portal/hod/students/${student._id}/attendance`, { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => { if (!cancelled) setData(data); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [student._id, token]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-800">{student.fullName}</h3>
            <p className="text-xs text-gray-400 font-mono">{student.registrationNo}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
        </div>
        {loading ? <Spinner /> : !data ? (
          <p className="text-gray-400 text-sm">Could not load attendance details.</p>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">Eligibility threshold: <strong>{data.minAttendancePercent}%</strong></p>
            {data.courses.length === 0 ? (
              <p className="text-sm text-gray-400">No attendance recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {data.courses.map((c) => (
                  <div key={c.ongoingClassId} className="border border-gray-100 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{c.subject}</p>
                      <p className="text-xs text-gray-400">{c.Present} Present · {c.Late} Late · {c.Absent} Absent · {c.Excused} Excused · {c.total} total</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${c.eligible ? 'text-green-600' : 'text-red-600'}`}>{c.attendancePercent}%</p>
                      <p className="text-xs text-gray-400">{c.eligible ? 'Eligible' : 'Not eligible'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentsSection({ hod, token }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ program: '', semester: '', session: '', timeSession: '' });
  const [drillDown, setDrillDown] = useState(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/portal/hod/students`, {
        headers: { Authorization: `Bearer ${token}` }, params: { withAttendance: 'true' },
      });
      setStudents(data || []);
    } catch { setStudents([]); }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const uniq = (key) => [...new Set(students.map((s) => s[key]).filter(Boolean))].sort();
  const programOptions = uniq('program');
  const semesterOptions = [...new Set(students.map((s) => s.currentSemester).filter(Boolean))].sort((a, b) => a - b);
  const sessionOptions = uniq('session');
  const filtered = students.filter((s) =>
    (!filter.program || s.program === filter.program) &&
    (!filter.semester || String(s.currentSemester) === filter.semester) &&
    (!filter.session || s.session === filter.session) &&
    (!filter.timeSession || s.timeSession === filter.timeSession));
  const filtersActive = filter.program || filter.semester || filter.session || filter.timeSession;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Students — {hod.department}</h2>
        {filtered.length > 0 && (
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2.5 min-h-11 text-sm font-semibold rounded-xl text-white" style={{ background: '#041476' }}>
            🖨️ Print List
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-wrap items-end gap-3">
        <select value={filter.program} onChange={(e) => setFilter({ ...filter, program: e.target.value })} className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white">
          <option value="">All Programs</option>
          {programOptions.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filter.semester} onChange={(e) => setFilter({ ...filter, semester: e.target.value })} className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white">
          <option value="">All Semesters</option>
          {semesterOptions.map((sem) => <option key={sem} value={sem}>Semester {sem}</option>)}
        </select>
        <select value={filter.session} onChange={(e) => setFilter({ ...filter, session: e.target.value })} className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white">
          <option value="">All Batches</option>
          {sessionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filter.timeSession} onChange={(e) => setFilter({ ...filter, timeSession: e.target.value })} className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white">
          <option value="">Morning &amp; Evening</option>
          <option value="Morning">🌅 Morning</option>
          <option value="Evening">🌙 Evening</option>
        </select>
        {filtersActive && (
          <button onClick={() => setFilter({ program: '', semester: '', session: '', timeSession: '' })}
            className="px-4 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-50">
            ✕ Clear Filters
          </button>
        )}
        <p className="text-xs text-gray-400 ml-auto">{filtered.length} of {students.length} students</p>
      </div>

      {loading ? <Spinner /> : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-16 text-center"><p className="text-4xl mb-3">🎓</p><p className="text-gray-500">No students match.</p></div>
          ) : (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Reg No', 'Name', 'Program', 'Semester', 'Attendance', 'Eligibility', 'Status', ''].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((s) => (
                  <tr key={s._id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-mono text-xs text-gray-600">{s.registrationNo}</td>
                    <td className="px-5 py-3 font-semibold text-gray-800">{s.fullName}</td>
                    <td className="px-5 py-3 text-gray-600">{s.program || '—'}</td>
                    <td className="px-5 py-3 text-gray-500">Sem {s.currentSemester}</td>
                    <td className="px-5 py-3 font-bold">{s.attendancePercent != null ? `${s.attendancePercent}%` : '—'}</td>
                    <td className="px-5 py-3">
                      {s.eligible == null ? <span className="text-gray-400 text-xs">—</span> : (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${s.eligible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                          {s.eligible ? 'Eligible' : 'At Risk'}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[s.status] || 'bg-gray-100 text-gray-600'}`}>{s.status}</span>
                    </td>
                    <td className="px-5 py-3">
                      <button onClick={() => setDrillDown(s)} className="text-xs font-bold text-indigo-600 px-3 py-1.5 border border-indigo-200 rounded-lg hover:bg-indigo-50">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      )}

      {drillDown && <StudentDrillDown student={drillDown} token={token} onClose={() => setDrillDown(null)} />}
    </>
  );
}
