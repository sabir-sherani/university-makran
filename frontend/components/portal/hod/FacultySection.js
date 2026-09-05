// HOD Faculty & Staff section — existing teacher list + workload column
// (courses, weekly contact hours, sessions) and the 5th-subject allowance
// toggle (Phase 6, 6.1 — renamed from the old "Teachers" tab). Extracted
// out of hod.js per hard rule 9.
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Spinner, STATUS_BADGE } from '../ui.js';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function FacultySection({ hod, token }) {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState(null);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/portal/hod/teachers`, { headers: { Authorization: `Bearer ${token}` } });
      setTeachers(data || []);
    } catch { setTeachers([]); }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  const handleToggleAllowance = async (teacherId, allowed) => {
    setActingId(teacherId);
    try {
      await axios.patch(`${API}/portal/hod/teachers/${teacherId}/subject-allowance`, { allowed }, { headers: { Authorization: `Bearer ${token}` } });
      setTeachers((prev) => prev.map((t) => (t._id === teacherId ? { ...t, extraSubjectAllowed: allowed } : t)));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update allowance.');
    }
    setActingId(null);
  };

  return (
    <>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Faculty &amp; Staff — {hod.department}</h2>
      {loading ? <Spinner /> : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {teachers.length === 0 ? (
            <div className="p-16 text-center"><p className="text-4xl mb-3">👨‍🏫</p><p className="text-gray-500">No teachers found in this department.</p></div>
          ) : (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Teacher ID', 'Name', 'Designation', 'Courses', 'Sessions/Week', 'Contact Hrs/Week', 'Status', '5th-Subject Allowance'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-gray-200">
                {teachers.map((t) => {
                  const overloaded = t.activeCourses > (t.extraSubjectAllowed ? 5 : 4);
                  return (
                    <tr key={t._id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 font-mono text-xs text-gray-600">{t.teacherId}</td>
                      <td className="px-5 py-3 font-semibold text-gray-800">{t.fullName}</td>
                      <td className="px-5 py-3 text-gray-600">{t.designation || '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`font-bold ${overloaded ? 'text-red-600' : 'text-gray-700'}`}>{t.activeCourses}</span>
                        {overloaded && <span className="ml-1 text-xs text-red-500" title="Over the subject cap">⚠️</span>}
                      </td>
                      <td className="px-5 py-3 text-gray-600">{t.sessionsPerWeek}</td>
                      <td className="px-5 py-3 text-gray-600">{t.weeklyContactHours}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[t.status] || 'bg-gray-100 text-gray-600'}`}>{t.status}</span>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => handleToggleAllowance(t._id, !t.extraSubjectAllowed)}
                          disabled={actingId === t._id}
                          title="Allows this teacher to hold a 5th active subject instead of the default 4"
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50 ${
                            t.extraSubjectAllowed ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}>
                          {t.extraSubjectAllowed ? '✓ 5 subjects allowed' : 'Grant 5th subject'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          )}
        </div>
      )}
    </>
  );
}
