// HOD Dashboard — department KPIs extended in Phase 6 (6.1): students,
// faculty, active courses, sessions scheduled vs required, this month's
// attendance %, pending approvals, at-risk students, and today's classes.
// Extracted out of hod.js per hard rule 9.
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { StatCard, Spinner } from '../ui.js';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function DashboardSection({ hod, token }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/portal/hod/stats`, { headers: { Authorization: `Bearer ${token}` } });
      setStats(data);
    } catch { setStats(null); }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Welcome, {hod.fullName}</h2>
      <p className="text-gray-500 text-sm mb-8">
        Department of {hod.department} — {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>

      {loading ? <Spinner label="Loading dashboard…" /> : !stats ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400 shadow-sm">Could not load dashboard stats.</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard label="Total Students" value={stats.totalStudents} color="border-indigo-500" />
            <StatCard label="Approved Students" value={stats.approvedStudents} color="border-green-500" />
            <StatCard label="Teachers" value={stats.totalTeachers} color="border-purple-500" />
            <StatCard label="Active Courses" value={stats.activeCourses} color="border-blue-500" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard label="Sessions Scheduled" value={`${stats.sessionsScheduled} / ${stats.sessionsRequired}`} color="border-teal-500" />
            <StatCard label="Attendance This Month" value={stats.attendancePercentThisMonth != null ? `${stats.attendancePercentThisMonth}%` : '—'} color="border-amber-500" />
            <StatCard label="Pending Approvals" value={stats.pendingApprovals} color="border-yellow-500" />
            <StatCard label="At-Risk Students" value={stats.atRiskStudents} color="border-red-500" />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50">
              <h3 className="font-bold text-gray-800">Today&rsquo;s Classes</h3>
            </div>
            {(stats.todaysClasses || []).length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No classes scheduled for today.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>{['Time', 'Course', 'Teacher', 'Room', 'Type'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {stats.todaysClasses.map((c, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 font-mono text-xs text-gray-600">{c.startTime}–{c.endTime}</td>
                        <td className="px-5 py-3 font-semibold text-gray-800">{c.subject}</td>
                        <td className="px-5 py-3 text-gray-600">{c.teacherName}</td>
                        <td className="px-5 py-3 text-gray-500">{c.room}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${c.kind === 'lab' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{c.kind}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
