// HOD Portal shell — routing, auth, and layout only (Phase 6, 6.1). Every
// section is its own component under components/portal/hod/; this file
// just decides which one to render. Kept intentionally thin (hard rule 9)
// — do not grow this file, extract instead.
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import axios from 'axios';
import { Alert, labelCls, inputCls } from '../../components/portal/ui.js';
import NotificationBell from '../../components/portal/NotificationBell.js';
import DashboardSection from '../../components/portal/hod/DashboardSection.js';
import StudentsSection from '../../components/portal/hod/StudentsSection.js';
import FacultySection from '../../components/portal/hod/FacultySection.js';
import CoursesWorkloadSection from '../../components/portal/hod/CoursesWorkloadSection.js';
import TimetableSection from '../../components/portal/hod/TimetableSection.js';
import AttendanceSection from '../../components/portal/hod/AttendanceSection.js';
import ExamsResultsSection from '../../components/portal/hod/ExamsResultsSection.js';
import CorrectionsSection from '../../components/portal/hod/CorrectionsSection.js';
import CurriculumSection from '../../components/portal/hod/CurriculumSection.js';
import NoticesCalendarSection from '../../components/portal/hod/NoticesCalendarSection.js';
import ReportsSection from '../../components/portal/hod/ReportsSection.js';
import ProfileSection from '../../components/portal/hod/ProfileSection.js';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const SIDEBAR = [
  { key: 'dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { key: 'students', label: 'Students', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { key: 'faculty', label: 'Faculty & Staff', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { key: 'courses', label: 'Courses & Workload', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
  { key: 'timetable', label: 'Timetable', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { key: 'attendance', label: 'Attendance', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { key: 'exams', label: 'Examinations & Results', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  { key: 'corrections', label: 'Requests & Approvals', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { key: 'curriculum', label: 'Curriculum & Accreditation', icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25' },
  { key: 'notices', label: 'Notices & Calendar', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { key: 'reports', label: 'Reports', icon: 'M9 17v-2a4 4 0 014-4h4M9 17H7a2 2 0 01-2-2V7a2 2 0 012-2h10a2 2 0 012 2v3m-6 9l3-3m0 0l3 3m-3-3v6' },
  { key: 'profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
];

export default function HODPortal() {
  const router = useRouter();
  const [tab, setTab] = useState('login');
  const [hod, setHod] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [token, setToken] = useState('');
  const [creds, setCreds] = useState({ hodId: '', password: '' });
  const [alert, setAlert] = useState({ type: '', msg: '' });
  const [loggingIn, setLoggingIn] = useState(false);
  const [pendingCrCount, setPendingCrCount] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('hodToken');
    const savedHod = localStorage.getItem('hodData');
    if (saved && savedHod) {
      setToken(saved);
      setHod(JSON.parse(savedHod));
      setTab('dashboard');
    }
  }, []);

  // Lets a notification's `link` (e.g. '/portal/hod?tab=corrections') deep-link
  // straight into a sidebar section.
  useEffect(() => {
    if (router.query.tab) setTab(router.query.tab);
  }, [router.query.tab]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoggingIn(true); setAlert({ type: '', msg: '' });
    try {
      const { data } = await axios.post(`${API}/portal/hod/login`, creds);
      setToken(data.token);
      setHod(data.hod);
      localStorage.setItem('hodToken', data.token);
      localStorage.setItem('hodData', JSON.stringify(data.hod));
      setTab('dashboard');
    } catch (err) {
      setAlert({ type: 'error', msg: err.response?.data?.message || 'Login failed.' });
    }
    setLoggingIn(false);
  }

  function handleLogout() {
    setHod(null); setToken('');
    localStorage.removeItem('hodToken'); localStorage.removeItem('hodData');
    setTab('login');
  }

  // A password change issues a fresh token (its tokenVersion bump would
  // otherwise invalidate the one already in use) — keep the session alive.
  function handleTokenRefresh(newToken) {
    setToken(newToken);
    localStorage.setItem('hodToken', newToken);
  }

  // Auto-logout on token expiry (401/403)
  useEffect(() => {
    if (!token) return;
    const id = axios.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err.response?.status === 401 || err.response?.status === 403) handleLogout();
        return Promise.reject(err);
      }
    );
    return () => axios.interceptors.response.eject(id);
  }, [token]);

  // ── Login screen ──
  if (!hod || tab === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #3730a3 0%, #4338ca 50%, #4f46e5 100%)' }}>
        <Head><title>HOD Portal — University of Makran</title></Head>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">HOD Portal</h1>
            <p className="text-indigo-200 text-sm mt-1">Head of Department — University of Makran</p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            <Alert type={alert.type} msg={alert.msg} />
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className={labelCls}>HOD ID</label>
                <input value={creds.hodId} onChange={(e) => setCreds((p) => ({ ...p, hodId: e.target.value }))}
                  required placeholder="e.g. HOD-001" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Password</label>
                <input type="password" value={creds.password} onChange={(e) => setCreds((p) => ({ ...p, password: e.target.value }))}
                  required placeholder="••••••••" className={inputCls} />
              </div>
              <button type="submit" disabled={loggingIn}
                className="w-full py-3 font-bold text-white rounded-xl transition-all disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #3730a3, #4f46e5)', boxShadow: '0 8px 24px rgba(67,56,202,0.35)' }}>
                {loggingIn ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
            <p className="text-xs text-gray-400 text-center mt-5">Contact admin for your HOD credentials.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-hidden">
      <Head><title>HOD Portal — {hod.department}</title></Head>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-40 w-60 flex flex-col transition-transform duration-300 lg:relative lg:z-auto lg:translate-x-0 lg:shrink-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{ background: 'linear-gradient(180deg, #3730a3, #312e81)' }}>
        <div className="p-5 border-b border-white/10">
          <p className="text-white font-bold text-sm leading-tight">{hod.fullName}</p>
          <p className="text-indigo-300 text-xs mt-0.5">{hod.department}</p>
          <span className="inline-block mt-2 text-xs bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full font-medium">HOD</span>
        </div>
        <nav className="flex-1 p-3 overflow-y-auto">
          {SIDEBAR.map((item) => (
            <button key={item.key} onClick={() => { setTab(item.key); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors mb-1 ${
                tab === item.key ? 'bg-white/20 text-white' : 'text-indigo-200 hover:bg-white/10 hover:text-white'
              }`}>
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              <span className="flex-1 text-left">{item.label}</span>
              {item.key === 'corrections' && pendingCrCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">{pendingCrCount}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-4">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-indigo-300 hover:bg-white/10 hover:text-white text-sm font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 lg:p-8 overflow-y-auto min-w-0">
        <div className="flex items-center justify-between mb-4">
          <button
            className="lg:hidden flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow text-sm font-medium text-gray-700 border border-gray-200"
            onClick={() => setSidebarOpen(true)}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            Menu
          </button>
          <div className="ml-auto"><NotificationBell api={API} token={token} role="hod" /></div>
        </div>

        {tab === 'dashboard' && <DashboardSection hod={hod} token={token} />}
        {tab === 'students' && <StudentsSection hod={hod} token={token} />}
        {tab === 'faculty' && <FacultySection hod={hod} token={token} />}
        {tab === 'courses' && <CoursesWorkloadSection hod={hod} token={token} />}
        {tab === 'timetable' && <TimetableSection hod={hod} token={token} />}
        {tab === 'attendance' && <AttendanceSection hod={hod} token={token} />}
        {tab === 'exams' && <ExamsResultsSection hod={hod} token={token} />}
        {tab === 'corrections' && <CorrectionsSection hod={hod} token={token} onPendingChange={setPendingCrCount} />}
        {tab === 'curriculum' && <CurriculumSection hod={hod} token={token} />}
        {tab === 'notices' && <NoticesCalendarSection hod={hod} token={token} />}
        {tab === 'reports' && <ReportsSection hod={hod} token={token} />}
        {tab === 'profile' && <ProfileSection hod={hod} token={token} onTokenRefresh={handleTokenRefresh} />}
      </main>
    </div>
  );
}
