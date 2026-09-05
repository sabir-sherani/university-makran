// HOD Courses & Workload section — the course catalogue (Phase 1) driving
// course -> teacher assignment (the existing OngoingClass flow), plus a
// per-teacher workload summary with over/under-load warnings (Phase 6,
// 6.1 — renamed/extended from the old "Ongoing Classes" tab). Extracted out
// of hod.js per hard rule 9; the assign-class flow itself is unchanged from
// before Phase 6, just self-contained instead of living in the page file.
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Alert, inputCls, labelCls, Spinner } from '../ui.js';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const emptyForm = {
  teacherId: '', className: '', subject: '', programId: '', semester: '', sessionId: '', timeSession: '',
  days: [], startTime: '', endTime: '', room: '', location: '', weeklyHours: '', maxStudents: '',
};

export default function CoursesWorkloadSection({ hod, token }) {
  function headers() { return { headers: { Authorization: `Bearer ${token}` } }; }

  const [teachers, setTeachers] = useState([]);
  const [ocClasses, setOcClasses] = useState([]);
  const [ocLoading, setOcLoading] = useState(false);
  const [ocFilter, setOcFilter] = useState({ status: '', timeSession: '' });

  const [showAssignForm, setShowAssignForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [programs, setPrograms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [actingId, setActingId] = useState(null);

  const fetchTeachers = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/portal/hod/teachers`, headers());
      setTeachers(data || []);
    } catch { setTeachers([]); }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchOngoingClasses = useCallback(async (filter) => {
    setOcLoading(true);
    try {
      const f = filter || ocFilter;
      const q = new URLSearchParams();
      if (f.status) q.set('status', f.status);
      if (f.timeSession) q.set('timeSession', f.timeSession);
      const { data } = await axios.get(`${API}/portal/hod/ongoing-classes${q.toString() ? '?' + q : ''}`, headers());
      setOcClasses(data || []);
    } catch { setOcClasses([]); }
    setOcLoading(false);
  }, [ocFilter, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchTeachers();
    fetchOngoingClasses();
    axios.get(`${API}/lookups/sessions`).then(({ data }) => setSessions(data || [])).catch(() => {});
    if (hod?.departmentId) {
      axios.get(`${API}/lookups/programs`, { params: { department: hod.departmentId } })
        .then(({ data }) => setPrograms(data || [])).catch(() => setPrograms([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hod, token]);

  // Subject dropdown cascades from Program + Semester — pulled from the same
  // curriculum list admin maintains under Courses (SemesterCourse).
  useEffect(() => {
    if (!form.programId || !form.semester) { setSubjects([]); return; }
    axios.get(`${API}/courses`, { params: { program: form.programId } })
      .then(({ data }) => {
        const match = (data || []).find((sc) => String(sc.semesterNumber) === String(form.semester));
        setSubjects(match?.courses || []);
      })
      .catch(() => setSubjects([]));
  }, [form.programId, form.semester]);

  const handleAssignClass = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await axios.post(`${API}/portal/hod/ongoing-classes`, form, headers());
      setForm(emptyForm);
      setShowAssignForm(false);
      fetchOngoingClasses();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to assign class.');
    }
    setSaving(false);
  };

  const handleChangeStatus = async (id, status) => {
    setActingId(id);
    try {
      await axios.patch(`${API}/portal/hod/ongoing-classes/${id}`, { status }, headers());
      fetchOngoingClasses();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update class.');
    }
    setActingId(null);
  };

  const handleDelete = async (c) => {
    if (!confirm(`Unassign "${c.subject}" (${c.className}) from ${c.teacherName}?`)) return;
    setActingId(c._id);
    try {
      await axios.delete(`${API}/portal/hod/ongoing-classes/${c._id}`, headers());
      fetchOngoingClasses();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to unassign class.');
    }
    setActingId(null);
  };

  const approvedTeachers = teachers.filter((t) => t.status === 'approved');
  const selectedTeacher = approvedTeachers.find((t) => t._id === form.teacherId);
  const teacherActiveCount = selectedTeacher
    ? ocClasses.filter((c) => c.teacher === selectedTeacher._id && c.status === 'active').length
    : 0;
  const teacherCap = selectedTeacher?.extraSubjectAllowed ? 5 : 4;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h2 className="text-2xl font-bold text-gray-800">Courses &amp; Workload</h2>
        <button onClick={() => { setShowAssignForm((v) => !v); setFormError(''); }}
          className="px-5 py-2.5 min-h-11 rounded-xl text-sm font-bold text-white hover:opacity-90 transition"
          style={{ background: '#4338ca' }}>
          {showAssignForm ? '✕ Cancel' : '+ Assign Class'}
        </button>
      </div>
      <p className="text-gray-500 text-sm mb-5">
        Assign subjects to teachers in the {hod.department} department. Each teacher may hold up to 4 active
        subjects (5 if granted a subject allowance — see the Faculty &amp; Staff tab).
      </p>

      {showAssignForm && (
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 mb-5">
          <Alert type="error" msg={formError} />
          <form onSubmit={handleAssignClass} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Teacher *</label>
              <select required value={form.teacherId} onChange={(e) => setForm((f) => ({ ...f, teacherId: e.target.value }))} className={inputCls}>
                <option value="">Select teacher</option>
                {approvedTeachers.map((t) => <option key={t._id} value={t._id}>{t.fullName} ({t.teacherId})</option>)}
              </select>
              {selectedTeacher && (
                <p className={`text-xs mt-1 font-semibold ${teacherActiveCount >= teacherCap ? 'text-red-600' : 'text-gray-400'}`}>
                  {teacherActiveCount} / {teacherCap} active subjects{teacherActiveCount >= teacherCap ? ' — at limit' : ''}
                </p>
              )}
            </div>
            <div>
              <label className={labelCls}>Class Name *</label>
              <input type="text" required value={form.className} onChange={(e) => setForm((f) => ({ ...f, className: e.target.value }))} className={inputCls} placeholder="e.g. BSCS-3A" />
            </div>
            <div>
              <label className={labelCls}>Program</label>
              <select value={form.programId} onChange={(e) => setForm((f) => ({ ...f, programId: e.target.value, subject: '' }))} className={inputCls}>
                <option value="">Select program</option>
                {programs.map((p) => <option key={p._id} value={p._id}>{p.title}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Semester</label>
              <select value={form.semester} onChange={(e) => setForm((f) => ({ ...f, semester: e.target.value, subject: '' }))} className={inputCls}>
                <option value="">Select semester</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>Semester {n}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Subject *</label>
              <select required value={form.subject} disabled={!form.programId || !form.semester} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} className={inputCls}>
                <option value="">{form.programId && form.semester ? (subjects.length ? 'Select subject' : 'No courses set up for this program/semester') : 'Select program and semester first'}</option>
                {subjects.map((c) => <option key={c.courseTitle} value={c.courseTitle}>{c.courseTitle}{c.code ? ` (${c.code})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Academic Session</label>
              <select value={form.sessionId} onChange={(e) => setForm((f) => ({ ...f, sessionId: e.target.value }))} className={inputCls}>
                <option value="">Select</option>
                {sessions.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Time Session</label>
              <select value={form.timeSession} onChange={(e) => setForm((f) => ({ ...f, timeSession: e.target.value }))} className={inputCls}>
                <option value="">Select</option>
                <option>Morning</option>
                <option>Evening</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Start Time</label>
              <input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>End Time</label>
              <input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Room</label>
              <input type="text" value={form.room} onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))} className={inputCls} placeholder="e.g. Room 101" />
            </div>
            <div>
              <label className={labelCls}>Weekly Hours</label>
              <input type="number" min="1" max="40" value={form.weeklyHours} onChange={(e) => setForm((f) => ({ ...f, weeklyHours: e.target.value }))} className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Days</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {DAYS_OF_WEEK.map((day) => (
                  <label key={day} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.days.includes(day)}
                      onChange={(e) => setForm((f) => ({ ...f, days: e.target.checked ? [...f.days, day] : f.days.filter((d) => d !== day) }))}
                      className="accent-indigo-600" />
                    {day.slice(0, 3)}
                  </label>
                ))}
              </div>
            </div>
            <div className="md:col-span-2">
              <button type="submit" disabled={saving} className="px-6 py-2.5 min-h-11 rounded-xl text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-50" style={{ background: '#4338ca' }}>
                {saving ? 'Assigning…' : 'Assign Class'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5 flex flex-wrap gap-3 items-end">
        <select value={ocFilter.status} onChange={(e) => { const f = { ...ocFilter, status: e.target.value }; setOcFilter(f); fetchOngoingClasses(f); }}
          className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="on-hold">On Hold</option>
        </select>
        <select value={ocFilter.timeSession} onChange={(e) => { const f = { ...ocFilter, timeSession: e.target.value }; setOcFilter(f); fetchOngoingClasses(f); }}
          className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white">
          <option value="">All Sessions</option>
          <option>Morning</option>
          <option>Evening</option>
        </select>
      </div>

      {ocLoading ? <Spinner /> : ocClasses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
          <p className="text-3xl mb-3">📚</p>
          <p className="text-gray-500">No ongoing classes found for your department.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Class', 'Subject', 'Program', 'Semester', 'Teacher', 'Schedule', 'Room', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-gray-200">
                {ocClasses.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-semibold text-gray-800">{c.className}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{c.subject}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{c.program || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{c.semester || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      <div>{c.teacherName || '—'}</div>
                      {c.timeSession && <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${c.timeSession === 'Morning' ? 'bg-yellow-100 text-yellow-700' : 'bg-indigo-100 text-indigo-700'}`}>{c.timeSession}</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {c.days?.length > 0 && <div>{c.days.map((d) => d.slice(0, 3)).join('·')}</div>}
                      {(c.startTime || c.endTime) && <div>{c.startTime}–{c.endTime}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{c.room || '—'}{c.location ? ` / ${c.location}` : ''}</td>
                    <td className="px-4 py-3">
                      <select value={c.status} disabled={actingId === c._id} onChange={(e) => handleChangeStatus(c._id, e.target.value)}
                        className={`px-2 py-1 rounded-full text-xs font-bold border-0 cursor-pointer ${
                          c.status === 'active' ? 'bg-green-100 text-green-700' :
                          c.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                          c.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                        <option value="active">active</option>
                        <option value="completed">completed</option>
                        <option value="cancelled">cancelled</option>
                        <option value="on-hold">on-hold</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(c)} disabled={actingId === c._id}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50">
                        Unassign
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-gray-50 bg-gray-50">
            <p className="text-xs text-gray-400">Showing {ocClasses.length} class{ocClasses.length !== 1 ? 'es' : ''}</p>
          </div>
        </div>
      )}

      {/* Per-teacher workload summary — same numbers as the Faculty & Staff
          tab's columns, surfaced here with an explicit over/under-load flag. */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50"><h3 className="font-bold text-gray-800">Per-Teacher Workload</h3></div>
        {approvedTeachers.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No teachers to summarize.</div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>{['Teacher', 'Active Courses', 'Sessions/Week', 'Contact Hrs/Week', 'Load'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {approvedTeachers.map((t) => {
                const cap = t.extraSubjectAllowed ? 5 : 4;
                const over = (t.activeCourses || 0) > cap;
                const under = (t.activeCourses || 0) === 0;
                return (
                  <tr key={t._id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-semibold text-gray-800">{t.fullName}</td>
                    <td className="px-4 py-3">{t.activeCourses || 0} / {cap}</td>
                    <td className="px-4 py-3">{t.sessionsPerWeek || 0}</td>
                    <td className="px-4 py-3">{t.weeklyContactHours || 0}</td>
                    <td className="px-4 py-3">
                      {over ? <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">Overloaded</span>
                        : under ? <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">Unassigned</span>
                        : <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">Normal</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </div>
    </>
  );
}
