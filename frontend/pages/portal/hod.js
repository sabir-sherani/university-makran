import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const inputCls  = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition-all';
const labelCls  = 'block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5';

function Alert({ type, msg }) {
  if (!msg) return null;
  const styles = type === 'error'
    ? 'bg-red-50 border-l-4 border-red-500 text-red-700'
    : 'bg-green-50 border-l-4 border-green-500 text-green-700';
  return <div className={`px-4 py-3 rounded-lg text-sm mb-4 ${styles}`}>{msg}</div>;
}

function StatCard({ label, value, color }) {
  return (
    <div className={`bg-white rounded-2xl p-5 border-l-4 ${color} shadow-sm`}>
      <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold text-gray-800 mt-1">{value ?? '—'}</p>
    </div>
  );
}

const STATUS_BADGE = {
  approved: 'bg-green-100 text-green-800',
  pending:  'bg-yellow-100 text-yellow-800',
  rejected: 'bg-red-100 text-red-800',
  suspended:'bg-gray-100 text-gray-600',
};

export default function HODPortal() {
  const [tab, setTab]       = useState('login');
  const [hod, setHod]       = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [token, setToken]   = useState('');
  const [creds, setCreds]   = useState({ hodId: '', password: '' });
  const [alert, setAlert]   = useState({ type: '', msg: '' });
  const [loggingIn, setLoggingIn] = useState(false);
  const [stats, setStats]   = useState(null);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [correctionReqs, setCorrectionReqs] = useState([]);
  const [crLoading, setCrLoading]           = useState(false);
  const [crFilter, setCrFilter]             = useState('');
  const [crComment, setCrComment]           = useState({});
  const [crActing, setCrActing]             = useState({});
  const [deptSheets, setDeptSheets]         = useState([]);
  const [dsLoading, setDsLoading]           = useState(false);
  const [dsDetail, setDsDetail]             = useState(null);
  const [dsFilters, setDsFilters]           = useState({ semester: '', status: '', subject: '' });
  const [ocClasses, setOcClasses]           = useState([]);
  const [ocLoading, setOcLoading]           = useState(false);
  const [ocFilter, setOcFilter]             = useState({ status: '', timeSession: '' });

  // Dept Notices
  const [notices, setNotices]               = useState([]);
  const [noticeLoading, setNoticeLoading]   = useState(false);
  const [noticeForm, setNoticeForm]         = useState({ title: '', body: '', priority: 'normal', isPublished: true });
  const [noticeEditing, setNoticeEditing]   = useState(null);
  const [noticeSaving, setNoticeSaving]     = useState(false);
  const [noticeError, setNoticeError]       = useState('');
  const [noticeSuccess, setNoticeSuccess]   = useState('');
  const [showNoticeForm, setShowNoticeForm] = useState(false);

  function headers(tok) { return { headers: { Authorization: `Bearer ${tok || token}` } }; }

  useEffect(() => {
    const saved = localStorage.getItem('hodToken');
    const savedHod = localStorage.getItem('hodData');
    if (saved && savedHod) {
      setToken(saved);
      setHod(JSON.parse(savedHod));
      setTab('dashboard');
    }
  }, []);

  const loadData = useCallback(async (tok) => {
    setLoadingData(true);
    try {
      const [s, st, te] = await Promise.all([
        axios.get(`${API}/portal/hod/stats`, headers(tok)),
        axios.get(`${API}/portal/hod/students`, headers(tok)),
        axios.get(`${API}/portal/hod/teachers`, headers(tok)),
      ]);
      setStats(s.data);
      setStudents(st.data || []);
      setTeachers(te.data || []);
    } catch { /* silent */ }
    setLoadingData(false);
  }, []);

  useEffect(() => { if (tab === 'dashboard'       && token) loadData(token); }, [tab, token]);
  useEffect(() => { if (tab === 'corrections'     && token) fetchCorrectionReqs(token); }, [tab, token]);
  useEffect(() => { if (tab === 'results'         && token) fetchDeptSheets(token); }, [tab, token]);
  useEffect(() => { if (tab === 'ongoingClasses'  && token) fetchOngoingClasses(); }, [tab, token]);
  useEffect(() => { if (tab === 'notices'         && token) fetchNotices(); }, [tab, token]);

  const fetchOngoingClasses = async (filter) => {
    setOcLoading(true);
    try {
      const f = filter || ocFilter;
      const q = new URLSearchParams();
      if (f.status) q.set('status', f.status);
      if (f.timeSession) q.set('timeSession', f.timeSession);
      const { data } = await axios.get(`${API}/portal/hod/ongoing-classes${q.toString() ? '?' + q : ''}`, { headers: { Authorization: `Bearer ${token}` } });
      setOcClasses(data || []);
    } catch { setOcClasses([]); }
    setOcLoading(false);
  };

  const fetchDeptSheets = async (tok, filters = dsFilters) => {
    setDsLoading(true);
    try {
      const q = new URLSearchParams();
      if (filters.semester) q.set('semester', filters.semester);
      if (filters.status)   q.set('status',   filters.status);
      if (filters.subject)  q.set('subject',  filters.subject);
      const { data } = await axios.get(`${API}/portal/hod/result-sheets${q.toString() ? '?' + q : ''}`, { headers: { Authorization: `Bearer ${tok || token}` } });
      setDeptSheets(data || []);
    } catch { setDeptSheets([]); }
    setDsLoading(false);
  };

  const openDsDetail = async (sheet) => {
    setDsDetail(sheet);
    if (!sheet.entries) {
      try { const { data } = await axios.get(`${API}/portal/hod/result-sheets/${sheet._id}`, { headers: { Authorization: `Bearer ${token}` } }); setDsDetail(data); }
      catch { /* use what we have */ }
    }
  };

  const fetchCorrectionReqs = async (tok, filter = '') => {
    setCrLoading(true);
    try {
      const url = `${API}/portal/hod/correction-requests${filter ? `?status=${filter}` : ''}`;
      const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${tok || token}` } });
      setCorrectionReqs(data || []);
    } catch { setCorrectionReqs([]); }
    setCrLoading(false);
  };

  const fetchNotices = async () => {
    setNoticeLoading(true);
    try {
      const { data } = await axios.get(`${API}/portal/hod/notices`, headers());
      setNotices(data || []);
    } catch { setNotices([]); }
    setNoticeLoading(false);
  };

  const openNewNotice = () => {
    setNoticeEditing(null);
    setNoticeForm({ title: '', body: '', priority: 'normal', isPublished: true });
    setNoticeError(''); setNoticeSuccess('');
    setShowNoticeForm(true);
  };

  const openEditNotice = (n) => {
    setNoticeEditing(n);
    setNoticeForm({ title: n.title, body: n.body || '', priority: n.priority, isPublished: n.isPublished });
    setNoticeError(''); setNoticeSuccess('');
    setShowNoticeForm(true);
  };

  const handleSaveNotice = async (e) => {
    e.preventDefault();
    setNoticeSaving(true); setNoticeError(''); setNoticeSuccess('');
    try {
      if (noticeEditing) {
        const { data } = await axios.patch(`${API}/portal/hod/notices/${noticeEditing._id}`, noticeForm, headers());
        setNotices(prev => prev.map(n => n._id === noticeEditing._id ? data : n));
        setNoticeSuccess('Notice updated.');
      } else {
        const { data } = await axios.post(`${API}/portal/hod/notices`, noticeForm, headers());
        setNotices(prev => [data, ...prev]);
        setNoticeSuccess('Notice posted.');
      }
      setShowNoticeForm(false);
      setNoticeEditing(null);
    } catch (err) { setNoticeError(err.response?.data?.message || 'Failed to save.'); }
    setNoticeSaving(false);
  };

  const handleDeleteNotice = async (id) => {
    if (!confirm('Delete this notice? This cannot be undone.')) return;
    try {
      await axios.delete(`${API}/portal/hod/notices/${id}`, headers());
      setNotices(prev => prev.filter(n => n._id !== id));
    } catch (err) { alert(err.response?.data?.message || 'Failed to delete.'); }
  };

  const handleCrAction = async (id, status) => {
    const comment = crComment[id] || '';
    setCrActing(p => ({ ...p, [id]: true }));
    try {
      await axios.patch(`${API}/portal/hod/correction-requests/${id}`, { status, reviewerComment: comment },
        { headers: { Authorization: `Bearer ${token}` } });
      fetchCorrectionReqs(token, crFilter);
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed.');
    }
    setCrActing(p => ({ ...p, [id]: false }));
  };

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
    setHod(null); setToken(''); setStats(null); setStudents([]); setTeachers([]);
    localStorage.removeItem('hodToken'); localStorage.removeItem('hodData');
    setTab('login');
  }

  // Auto-logout on token expiry (401/403)
  useEffect(() => {
    if (!token) return;
    const id = axios.interceptors.response.use(
      res => res,
      err => {
        if (err.response?.status === 401 || err.response?.status === 403) {
          handleLogout();
        }
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
                <input value={creds.hodId} onChange={e => setCreds(p => ({ ...p, hodId: e.target.value }))}
                  required placeholder="e.g. HOD-001" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Password</label>
                <input type="password" value={creds.password} onChange={e => setCreds(p => ({ ...p, password: e.target.value }))}
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

  const pendingCrCount = correctionReqs.filter(r => r.status === 'pending').length;

  const SIDEBAR = [
    { key: 'dashboard',   label: 'Dashboard',          icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { key: 'students',    label: 'Students',            icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { key: 'teachers',    label: 'Teachers',            icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { key: 'notices',        label: 'Dept Notices',        icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
    { key: 'results',        label: 'Dept Results',        icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    { key: 'ongoingClasses', label: 'Ongoing Classes',    icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    { key: 'corrections',    label: 'Correction Requests', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-hidden">
      <Head><title>HOD Portal — {hod.department}</title></Head>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-56 flex flex-col transition-transform duration-300 lg:relative lg:z-auto lg:translate-x-0 lg:shrink-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{ background: 'linear-gradient(180deg, #3730a3, #312e81)' }}>
        <div className="p-5 border-b border-white/10">
          <p className="text-white font-bold text-sm leading-tight">{hod.fullName}</p>
          <p className="text-indigo-300 text-xs mt-0.5">{hod.department}</p>
          <span className="inline-block mt-2 text-xs bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full font-medium">HOD</span>
        </div>
        <nav className="flex-1 p-3">
          {SIDEBAR.map(item => (
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

      {/* Main */}
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto min-w-0">
        {/* Mobile menu button */}
        <button
          className="lg:hidden mb-4 flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow text-sm font-medium text-gray-700 border border-gray-200"
          onClick={() => setSidebarOpen(true)}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Menu
        </button>
        {tab === 'dashboard' && (
          <>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Welcome, {hod.fullName}</h2>
            <p className="text-gray-500 text-sm mb-8">Department of {hod.department} — {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            {loadingData ? (
              <div className="flex items-center gap-3 text-gray-400"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /> Loading data…</div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard label="Total Students"    value={stats?.totalStudents}    color="border-indigo-500" />
                <StatCard label="Approved Students" value={stats?.approvedStudents} color="border-green-500"  />
                <StatCard label="Pending Students"  value={stats?.pendingStudents}  color="border-yellow-500" />
                <StatCard label="Teachers"          value={stats?.totalTeachers}    color="border-purple-500" />
              </div>
            )}
          </>
        )}

        {tab === 'students' && (
          <>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Students — {hod.department}</h2>
            {loadingData ? <div className="text-gray-400">Loading…</div> : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {students.length === 0 ? (
                  <div className="p-16 text-center"><p className="text-4xl mb-3">🎓</p><p className="text-gray-500">No students found in this department.</p></div>
                ) : (
                  <div className="overflow-x-auto"><table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {['Reg No','Name','Program','Semester','Status','Enrolled'].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {students.map(s => (
                        <tr key={s._id} className="hover:bg-gray-50/50">
                          <td className="px-5 py-3 font-mono text-xs text-gray-600">{s.registrationNo}</td>
                          <td className="px-5 py-3 font-semibold text-gray-800">{s.fullName}</td>
                          <td className="px-5 py-3 text-gray-600">{s.program || '—'}</td>
                          <td className="px-5 py-3 text-gray-500">Sem {s.currentSemester}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[s.status] || 'bg-gray-100 text-gray-600'}`}>{s.status}</span>
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-400">{new Date(s.createdAt).toLocaleDateString('en-GB')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                )}
              </div>
            )}
          </>
        )}

        {tab === 'teachers' && (
          <>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Teachers — {hod.department}</h2>
            {loadingData ? <div className="text-gray-400">Loading…</div> : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {teachers.length === 0 ? (
                  <div className="p-16 text-center"><p className="text-4xl mb-3">👨‍🏫</p><p className="text-gray-500">No teachers found in this department.</p></div>
                ) : (
                  <div className="overflow-x-auto"><table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {['Teacher ID','Name','Designation','Qualification','Status'].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {teachers.map(t => (
                        <tr key={t._id} className="hover:bg-gray-50/50">
                          <td className="px-5 py-3 font-mono text-xs text-gray-600">{t.teacherId}</td>
                          <td className="px-5 py-3 font-semibold text-gray-800">{t.fullName}</td>
                          <td className="px-5 py-3 text-gray-600">{t.designation || '—'}</td>
                          <td className="px-5 py-3 text-gray-500">{t.qualification || '—'}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[t.status] || 'bg-gray-100 text-gray-600'}`}>{t.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                )}
              </div>
            )}
          </>
        )}
        {tab === 'results' && (() => {
          const RS_BADGE = { submitted: 'bg-yellow-100 text-yellow-800', finalized: 'bg-green-100 text-green-800', draft: 'bg-gray-100 text-gray-600' };

          if (dsDetail) {
            const sheet = dsDetail;
            const entries = sheet.entries || [];
            const passCount = entries.filter(e => e.resultStatus === 'Pass').length;
            const failCount = entries.filter(e => e.resultStatus === 'Fail').length;
            return (
              <div>
                <div className="flex items-center justify-between mb-6 hod-no-print">
                  <button onClick={() => setDsDetail(null)} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-medium">← Back to Results</button>
                  <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-white" style={{background:'#041476'}}>
                    🖨️ Print / Export PDF
                  </button>
                </div>

                {/* Print header */}
                <div className="hod-print-only" style={{display:'none',marginBottom:'20px',borderBottom:'2px solid #041476',paddingBottom:'12px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'12px',justifyContent:'center'}}>
                    <img src="/logo.png.webp" alt="" style={{height:'56px',objectFit:'contain'}} onError={e=>{e.target.style.display='none';}} />
                    <div style={{textAlign:'center'}}>
                      <div style={{fontSize:'18px',fontWeight:'bold',color:'#041476'}}>University of Makran, Panjgur</div>
                      <div style={{fontSize:'13px',color:'#FA7902',fontWeight:'600',marginTop:'4px',textTransform:'uppercase',letterSpacing:'1px'}}>
                        {sheet.examType} Examination Result Sheet
                      </div>
                    </div>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:'8px',fontSize:'11px',color:'#555'}}>
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
                          <tr>{['#','Reg No','Name','Marks/Total','Grade','Status','Remarks'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr>
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
                {/* Print footer */}
                <div className="hod-print-only" style={{display:'none',marginTop:'36px',borderTop:'1px solid #ccc',paddingTop:'14px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'#555'}}>
                    <div style={{textAlign:'center',minWidth:'150px'}}>
                      <div style={{borderTop:'1px solid #333',paddingTop:'4px',marginTop:'36px'}}>HOD Signature</div>
                      <div style={{fontSize:'10px',marginTop:'2px'}}>{hod?.name}</div>
                    </div>
                    <div style={{textAlign:'center',fontSize:'10px',color:'#888'}}>
                      <div>University of Makran, Panjgur — Examination Section</div>
                      <div>Printed on {new Date().toLocaleDateString('en-GB')}</div>
                    </div>
                    <div style={{textAlign:'center',minWidth:'150px'}}>
                      <div style={{borderTop:'1px solid #333',paddingTop:'4px',marginTop:'36px'}}>Controller of Examinations</div>
                      <div style={{fontSize:'10px',marginTop:'2px'}}>University of Makran</div>
                    </div>
                  </div>
                </div>
                </div>{/* end hod-sheet-printable */}

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
              <h2 className="text-2xl font-bold text-gray-800 mb-1">Department Results — {hod.department}</h2>
              <p className="text-gray-500 text-sm mb-5">View result sheets submitted by teachers in your department.</p>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5 flex flex-wrap gap-3 items-end">
                <input value={dsFilters.subject} onChange={e => setDsFilters(p => ({ ...p, subject: e.target.value }))} placeholder="Subject…" className="px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                <select value={dsFilters.semester} onChange={e => setDsFilters(p => ({ ...p, semester: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200">
                  <option value="">All Semesters</option>
                  {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={`Semester ${n}`}>Semester {n}</option>)}
                </select>
                <select value={dsFilters.status} onChange={e => setDsFilters(p => ({ ...p, status: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200">
                  <option value="">All Status</option>
                  <option value="submitted">Submitted</option>
                  <option value="finalized">Finalized</option>
                </select>
                <button onClick={() => fetchDeptSheets(token, dsFilters)} className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:opacity-90">Apply</button>
                {deptSheets.length > 0 && (
                  <button onClick={() => window.print()} className="px-5 py-2 rounded-xl text-xs font-bold text-white" style={{background:'#041476'}}>🖨️ Print Report</button>
                )}
              </div>

              {/* Print header for list view */}
              <div id="hod-list-print-header" style={{display:'none',marginBottom:'16px',borderBottom:'2px solid #041476',paddingBottom:'10px'}}>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:'18px',fontWeight:'bold',color:'#041476'}}>University of Makran, Panjgur</div>
                  <div style={{fontSize:'13px',color:'#FA7902',fontWeight:'600',marginTop:'4px'}}>
                    Department Result Submissions Report — {hod?.department}
                  </div>
                  <div style={{fontSize:'11px',color:'#555',marginTop:'4px'}}>
                    {dsFilters.semester && `Semester: ${dsFilters.semester} · `}
                    {dsFilters.status && `Status: ${dsFilters.status} · `}
                    Printed: {new Date().toLocaleDateString('en-GB')}
                  </div>
                </div>
              </div>
              <div id="hod-list-printable">
              {dsLoading ? <div className="flex items-center gap-3 text-gray-400"><div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /> Loading…</div>
              : deptSheets.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm"><p className="text-3xl mb-3">📋</p><p className="text-gray-500">No result sheets submitted yet.</p></div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>{['Subject','Program','Semester','Type','Teacher','Students','Submitted','Status','Action'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {deptSheets.map(s => (
                          <tr key={s._id} className="hover:bg-gray-50/50">
                            <td className="px-4 py-3 font-semibold text-gray-800 max-w-xs truncate">{s.subject}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{s.program}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{s.semester}</td>
                            <td className="px-4 py-3"><span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">{s.examType}</span></td>
                            <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{s.teacherName || s.teacherId}</td>
                            <td className="px-4 py-3 text-center font-bold text-gray-700">{s.entries?.length ?? '—'}</td>
                            <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('en-GB') : '—'}</td>
                            <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${RS_BADGE[s.status] || 'bg-gray-100 text-gray-600'}`}>{s.status}</span></td>
                            <td className="px-4 py-3"><button onClick={() => openDsDetail(s)} className="text-xs text-indigo-600 font-bold px-3 py-1.5 border border-indigo-200 rounded-lg hover:bg-indigo-50">View</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-5 py-3 border-t border-gray-50 bg-gray-50"><p className="text-xs text-gray-400">Showing {deptSheets.length} result sheet{deptSheets.length !== 1 ? 's' : ''}</p></div>
                </div>
              )}
              </div>{/* end hod-list-printable */}
              <style>{`
                @media print {
                  body * { visibility: hidden; }
                  #hod-list-print-header, #hod-list-print-header *, #hod-list-printable, #hod-list-printable * { visibility: visible; }
                  #hod-list-print-header { display: block !important; position: fixed; top: 0; left: 0; width: 100%; padding: 16px; }
                  #hod-list-printable { position: fixed; top: 90px; left: 0; width: 100%; padding: 0 16px; }
                }
              `}</style>
            </>
          );
        })()}

        {tab === 'corrections' && (
          <>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Correction Requests</h2>
            <p className="text-gray-500 text-sm mb-6">Review and approve or reject teacher result correction requests.</p>

            {/* Filter */}
            <div className="flex gap-2 mb-5 flex-wrap">
              {[['', 'All'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']].map(([val, label]) => (
                <button key={val} onClick={() => { setCrFilter(val); fetchCorrectionReqs(token, val); }}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold border transition ${
                    crFilter === val ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}>{label}</button>
              ))}
            </div>

            {crLoading ? (
              <div className="flex items-center gap-3 text-gray-400"><div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /> Loading…</div>
            ) : correctionReqs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
                <p className="text-3xl mb-3">✅</p>
                <p className="text-gray-500">No correction requests found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {correctionReqs.map(r => (
                  <div key={r._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-800">{r.subject}</span>
                          {r.examType && <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">{r.examType}</span>}
                          {r.semester && <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">{r.semester}</span>}
                        </div>
                        <p className="text-gray-500 text-xs mt-1">By <strong>{r.teacherName || r.teacherId}</strong> · {new Date(r.createdAt).toLocaleDateString('en-GB')}</p>
                      </div>
                      <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${
                        r.status === 'pending'  ? 'bg-yellow-100 text-yellow-800' :
                        r.status === 'approved' ? 'bg-green-100 text-green-800'   :
                                                  'bg-red-100 text-red-700'
                      }`}>{r.status}</span>
                    </div>

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

                    {r.status === 'pending' ? (
                      <div className="border-t border-gray-100 pt-4">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Reviewer Comment (optional)</label>
                        <textarea value={crComment[r._id] || ''} onChange={e => setCrComment(p => ({ ...p, [r._id]: e.target.value }))}
                          rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 resize-none mb-3"
                          placeholder="Add a note to the teacher…" />
                        <div className="flex gap-2">
                          <button onClick={() => handleCrAction(r._id, 'approved')} disabled={crActing[r._id]}
                            className="flex-1 py-2 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-60">
                            {crActing[r._id] ? '…' : '✅ Approve'}
                          </button>
                          <button onClick={() => handleCrAction(r._id, 'rejected')} disabled={crActing[r._id]}
                            className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-60">
                            {crActing[r._id] ? '…' : '✕ Reject'}
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
          </>
        )}

        {tab === 'ongoingClasses' && (
          <>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Ongoing Classes</h2>
            <p className="text-gray-500 text-sm mb-5">All classes in the {hod.department} department.</p>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5 flex flex-wrap gap-3 items-end">
              <select value={ocFilter.status} onChange={e => { const f = {...ocFilter, status: e.target.value}; setOcFilter(f); fetchOngoingClasses(f); }}
                className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200">
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="on-hold">On Hold</option>
              </select>
              <select value={ocFilter.timeSession} onChange={e => { const f = {...ocFilter, timeSession: e.target.value}; setOcFilter(f); fetchOngoingClasses(f); }}
                className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200">
                <option value="">All Sessions</option>
                <option>Morning</option>
                <option>Evening</option>
              </select>
            </div>

            {ocLoading ? (
              <div className="flex items-center gap-3 text-gray-400"><div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /> Loading…</div>
            ) : ocClasses.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
                <p className="text-3xl mb-3">📚</p>
                <p className="text-gray-500">No ongoing classes found for your department.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>{['Class','Subject','Program','Semester','Teacher','Schedule','Room','Status'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {ocClasses.map(c => (
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
                            {c.days?.length > 0 && <div>{c.days.map(d => d.slice(0,3)).join('·')}</div>}
                            {(c.startTime || c.endTime) && <div>{c.startTime}–{c.endTime}</div>}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">{c.room || '—'}{c.location ? ` / ${c.location}` : ''}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              c.status === 'active' ? 'bg-green-100 text-green-700' :
                              c.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                              c.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>{c.status}</span>
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
          </>
        )}

        {/* ── Department Notices ── */}
        {tab === 'notices' && (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-indigo-900">Department Notices</h2>
                <p className="text-sm text-gray-500 mt-0.5">Post notices for students of your department. They will appear in the student portal.</p>
              </div>
              <button onClick={openNewNotice}
                className="bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-800 transition">
                + New Notice
              </button>
            </div>

            {/* Create / Edit form */}
            {showNoticeForm && (
              <div className="bg-white rounded-2xl shadow p-6 border border-indigo-100">
                <h3 className="font-bold text-indigo-800 mb-4">{noticeEditing ? 'Edit Notice' : 'Post New Notice'}</h3>
                <Alert type="error" msg={noticeError} />
                <Alert type="success" msg={noticeSuccess} />
                <form onSubmit={handleSaveNotice} className="space-y-4">
                  <div>
                    <label className={labelCls}>Title *</label>
                    <input type="text" required value={noticeForm.title}
                      onChange={e => setNoticeForm(f => ({ ...f, title: e.target.value }))}
                      className={inputCls} placeholder="e.g. Schedule Change for Semester 3" />
                  </div>
                  <div>
                    <label className={labelCls}>Message / Details</label>
                    <textarea rows={5} value={noticeForm.body}
                      onChange={e => setNoticeForm(f => ({ ...f, body: e.target.value }))}
                      className={inputCls} placeholder="Full notice content (optional)" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Priority</label>
                      <select value={noticeForm.priority}
                        onChange={e => setNoticeForm(f => ({ ...f, priority: e.target.value }))}
                        className={inputCls}>
                        <option value="normal">🔵 Normal</option>
                        <option value="important">🟠 Important</option>
                        <option value="urgent">🔴 Urgent</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-3 pt-6">
                      <input type="checkbox" id="noticePublished" checked={noticeForm.isPublished}
                        onChange={e => setNoticeForm(f => ({ ...f, isPublished: e.target.checked }))}
                        className="w-4 h-4 accent-indigo-700" />
                      <label htmlFor="noticePublished" className="text-sm font-medium text-gray-700">Publish immediately (visible to students)</label>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" disabled={noticeSaving}
                      className="bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-800 transition disabled:opacity-60">
                      {noticeSaving ? 'Saving…' : noticeEditing ? '💾 Update Notice' : '📢 Post Notice'}
                    </button>
                    <button type="button" onClick={() => { setShowNoticeForm(false); setNoticeEditing(null); }}
                      className="px-6 py-2.5 rounded-xl text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 transition">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Notices list */}
            {noticeLoading ? (
              <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-400 text-sm">Loading notices…</div>
            ) : notices.length === 0 ? (
              <div className="bg-white rounded-2xl shadow p-10 text-center">
                <p className="text-4xl mb-3">📭</p>
                <p className="text-gray-500 font-medium">No notices yet.</p>
                <p className="text-gray-400 text-sm mt-1">Click &ldquo;+ New Notice&rdquo; above to post one for your students.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notices.map(n => {
                  const priorityStyle = n.priority === 'urgent'    ? 'border-l-4 border-red-500 bg-red-50'
                                      : n.priority === 'important' ? 'border-l-4 border-orange-400 bg-orange-50'
                                      : 'border-l-4 border-indigo-300 bg-white';
                  const priorityLabel = n.priority === 'urgent' ? '🔴 Urgent' : n.priority === 'important' ? '🟠 Important' : '🔵 Normal';
                  return (
                    <div key={n._id} className={`rounded-2xl shadow-sm p-5 ${priorityStyle}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-xs font-bold">{priorityLabel}</span>
                            {!n.isPublished && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-200 text-gray-600">Draft</span>
                            )}
                            <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                          <h3 className="font-bold text-gray-900 text-base">{n.title}</h3>
                          {n.body && <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{n.body}</p>}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => openEditNotice(n)}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-indigo-300 text-indigo-700 hover:bg-indigo-50 transition">
                            Edit
                          </button>
                          <button onClick={() => handleDeleteNotice(n._id)}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition">
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
