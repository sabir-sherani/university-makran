// HOD Attendance section — department-wide attendance browser: by course /
// teacher / section / date, make-up sessions flagged, un-marked sessions
// for a given day highlighted, and a link into the exam-eligibility report
// for the defaulters list (Phase 6, 6.1 — new). Extracted as its own
// component per hard rule 9.
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { inputCls, labelCls, Spinner } from '../ui.js';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function AttendanceSection({ hod, token }) {
  function headers() { return { headers: { Authorization: `Bearer ${token}` } }; }

  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [filters, setFilters] = useState({ courseId: '', teacherId: '', date: '' });
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  const [unmarkedDate, setUnmarkedDate] = useState(new Date().toISOString().slice(0, 10));
  const [unmarked, setUnmarked] = useState(null);
  const [unmarkedLoading, setUnmarkedLoading] = useState(false);

  useEffect(() => {
    axios.get(`${API}/portal/hod/ongoing-classes`, { params: { status: 'active' }, ...headers() })
      .then(({ data }) => setClasses(data || [])).catch(() => setClasses([]));
    axios.get(`${API}/portal/hod/teachers`, headers())
      .then(({ data }) => setTeachers(data || [])).catch(() => setTeachers([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.courseId) params.courseId = filters.courseId;
      if (filters.teacherId) params.teacherId = filters.teacherId;
      if (filters.date) params.date = filters.date;
      const { data } = await axios.get(`${API}/portal/hod/attendance`, { params, ...headers() });
      setSessions(data || []);
    } catch { setSessions([]); }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, token]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const fetchUnmarked = useCallback(async () => {
    setUnmarkedLoading(true);
    try {
      const { data } = await axios.get(`${API}/portal/hod/attendance/unmarked`, { params: { date: unmarkedDate }, ...headers() });
      setUnmarked(data);
    } catch { setUnmarked(null); }
    setUnmarkedLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unmarkedDate, token]);

  useEffect(() => { fetchUnmarked(); }, [fetchUnmarked]);

  return (
    <>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Attendance — {hod.department}</h2>
      <p className="text-gray-500 text-sm mb-6">Browse every recorded session across the department, and see which of today&rsquo;s classes haven&rsquo;t been marked yet.</p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
        <h3 className="font-bold text-gray-800 mb-3 text-sm">Un-marked Sessions</h3>
        <div className="flex flex-wrap items-end gap-3 mb-3">
          <div>
            <label className={labelCls}>Date</label>
            <input type="date" value={unmarkedDate} onChange={(e) => setUnmarkedDate(e.target.value)} className={inputCls} />
          </div>
        </div>
        {unmarkedLoading ? <Spinner /> : !unmarked ? (
          <p className="text-sm text-gray-400">Could not load.</p>
        ) : unmarked.unmarked.length === 0 ? (
          <p className="text-sm text-green-600 font-semibold">✅ All scheduled sessions for {unmarked.day} have attendance recorded.</p>
        ) : (
          <div className="space-y-2">
            {unmarked.unmarked.map((u, i) => (
              <div key={i} className="flex items-center justify-between bg-red-50 border-l-4 border-red-400 rounded-lg px-4 py-2 text-sm">
                <span><strong>{u.subject}</strong> — {u.teacherName} · {u.startTime}–{u.endTime} · {u.room}</span>
                <span className="text-xs font-bold text-red-600 uppercase">Not marked</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className={labelCls}>Course</label>
          <select value={filters.courseId} onChange={(e) => setFilters((f) => ({ ...f, courseId: e.target.value }))} className={inputCls}>
            <option value="">All Courses</option>
            {classes.map((c) => <option key={c._id} value={c._id}>{c.subject} — {c.className}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Teacher</label>
          <select value={filters.teacherId} onChange={(e) => setFilters((f) => ({ ...f, teacherId: e.target.value }))} className={inputCls}>
            <option value="">All Teachers</option>
            {teachers.map((t) => <option key={t._id} value={t._id}>{t.fullName}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Date</label>
          <input type="date" value={filters.date} onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))} className={inputCls} />
        </div>
        {(filters.courseId || filters.teacherId || filters.date) && (
          <button onClick={() => setFilters({ courseId: '', teacherId: '', date: '' })} className="px-4 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-50">
            ✕ Clear
          </button>
        )}
      </div>

      {loading ? <Spinner /> : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {sessions.length === 0 ? (
            <div className="p-16 text-center"><p className="text-3xl mb-3">📋</p><p className="text-gray-500">No attendance sessions match these filters.</p></div>
          ) : (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Date', 'Subject', 'Class', 'Students Marked', 'Type'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sessions.map((s) => (
                  <tr key={s._id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(s.date).toLocaleDateString('en-GB')}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{s.subject}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{s.className}</td>
                    <td className="px-4 py-3 text-gray-600">{s.records?.length || 0}</td>
                    <td className="px-4 py-3">
                      {s.isMakeup
                        ? <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">Make-up</span>
                        : <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">Regular</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">
        Looking for students below the attendance threshold? See <strong>Examinations &amp; Results → Eligibility</strong> for the full defaulters list, scoped by session and semester.
      </p>
    </>
  );
}
