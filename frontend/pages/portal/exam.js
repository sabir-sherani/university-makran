import React, { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import axios from 'axios';

const API      = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const BASE_URL = API.replace('/api', '');

const inputCls = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-500 transition-all';
const labelCls = 'block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5';

function Alert({ type, msg }) {
  if (!msg) return null;
  const styles = type === 'error' ? 'bg-red-50 border-l-4 border-red-500 text-red-700' : 'bg-green-50 border-l-4 border-green-500 text-green-700';
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

const EMPTY_SHEET = { title: '', department: '', program: '', semester: '', academicSession: '', timeSession: '', isPublished: false };
const EMPTY_RESULT = { title: '', department: '', program: '', semester: '', academicSession: '', timeSession: '', passingMarks: '40', isPublished: false };

export default function ExamPortal() {
  const [tab, setTab]       = useState('login');
  const [staff, setStaff]   = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [token, setToken]   = useState('');
  const [creds, setCreds]   = useState({ examId: '', password: '' });
  const [alert, setAlert]   = useState({ type: '', msg: '' });
  const [loggingIn, setLoggingIn] = useState(false);
  const [stats, setStats]   = useState(null);
  const [sheets, setSheets] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sheetForm, setSheetForm] = useState(EMPTY_SHEET);
  const [resultForm, setResultForm] = useState(EMPTY_RESULT);
  const [sheetFile, setSheetFile] = useState(null);
  const [resultFile, setResultFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const sheetRef = useRef(); const resultRef = useRef();
  const [correctionReqs, setCorrectionReqs] = useState([]);
  const [crLoading, setCrLoading]           = useState(false);
  const [crFilter, setCrFilter]             = useState('');
  const [crComment, setCrComment]           = useState({});
  const [crActing, setCrActing]             = useState({});
  const [rsSheets, setRsSheets]             = useState([]);
  const [rsLoading, setRsLoading]           = useState(false);
  const [rsDetail, setRsDetail]             = useState(null);
  const [rsActing, setRsActing]             = useState({});
  const [rsFilters, setRsFilters]           = useState({ department: '', program: '', semester: '', examType: '', status: '' });
  const [rsFinalizeId, setRsFinalizeId]     = useState(null);
  const [rsFinalizeThreshold, setRsFinalizeThreshold] = useState('50');

  // Degree verification state
  const EMPTY_DEGREE = { registrationNo: '', fullName: '', fatherName: '', department: '', program: '', session: '', graduationYear: '', cgpa: '', degreeStatus: 'completed', remarks: '' };
  const [degrees, setDegrees]               = useState([]);
  const [degLoading, setDegLoading]         = useState(false);
  const [degForm, setDegForm]               = useState(EMPTY_DEGREE);
  const [degSaving, setDegSaving]           = useState(false);
  const [degSearch, setDegSearch]           = useState('');
  const [degEditId, setDegEditId]           = useState(null);
  const [degEditForm, setDegEditForm]       = useState(EMPTY_DEGREE);

  function headers(tok) { return { headers: { Authorization: `Bearer ${tok || token}` } }; }

  useEffect(() => {
    const saved = localStorage.getItem('examToken');
    const savedStaff = localStorage.getItem('examData');
    if (saved && savedStaff) { setToken(saved); setStaff(JSON.parse(savedStaff)); setTab('dashboard'); }
  }, []);

  const loadData = useCallback(async (tok) => {
    setLoading(true);
    try {
      const [s, sh, re] = await Promise.all([
        axios.get(`${API}/portal/exam/stats`, headers(tok)),
        axios.get(`${API}/portal/exam/datesheets`, headers(tok)),
        axios.get(`${API}/portal/exam/results`, headers(tok)),
      ]);
      setStats(s.data);
      setSheets(sh.data || []);
      setResults(re.data || []);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { if (tab !== 'login' && tab !== 'corrections' && tab !== 'resultSheets' && tab !== 'degrees' && token) loadData(token); }, [tab, token]);
  useEffect(() => { if (tab === 'corrections'  && token) fetchCorrectionReqs(token); }, [tab, token]);
  useEffect(() => { if (tab === 'resultSheets' && token) fetchRsSheets(token); }, [tab, token]);
  useEffect(() => { if (tab === 'degrees'      && token) fetchDegrees(); }, [tab, token]);

  const fetchCorrectionReqs = async (tok, filter = '') => {
    setCrLoading(true);
    try {
      const url = `${API}/portal/exam/correction-requests${filter ? `?status=${filter}` : ''}`;
      const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${tok || token}` } });
      setCorrectionReqs(data || []);
    } catch { setCorrectionReqs([]); }
    setCrLoading(false);
  };

  const fetchRsSheets = async (tok, filters = rsFilters) => {
    setRsLoading(true);
    try {
      const q = new URLSearchParams();
      if (filters.department) q.set('department', filters.department);
      if (filters.program)    q.set('program',    filters.program);
      if (filters.semester)   q.set('semester',   filters.semester);
      if (filters.examType)   q.set('examType',   filters.examType);
      if (filters.status)     q.set('status',     filters.status);
      const { data } = await axios.get(`${API}/portal/exam/result-sheets${q.toString() ? '?' + q : ''}`, { headers: { Authorization: `Bearer ${tok || token}` } });
      setRsSheets(data || []);
    } catch { setRsSheets([]); }
    setRsLoading(false);
  };

  const handleRsFinalize = async () => {
    const id = rsFinalizeId;
    if (!id) return;
    const threshold = Number(rsFinalizeThreshold);
    if (!threshold || threshold < 1 || threshold > 100) {
      setAlert({ type: 'error', msg: 'Please enter a valid passing marks threshold (1–100).' });
      return;
    }
    setRsActing(p => ({ ...p, [id]: 'finalizing' }));
    try {
      const { data } = await axios.patch(`${API}/portal/exam/result-sheets/${id}/finalize`, { passingMarks: threshold }, { headers: { Authorization: `Bearer ${token}` } });
      setRsSheets(p => p.map(s => s._id === id ? data.sheet : s));
      if (rsDetail?._id === id) setRsDetail(data.sheet);
      setAlert({ type: 'success', msg: data.message });
      setRsFinalizeId(null); setRsFinalizeThreshold('50');
    } catch (err) { setAlert({ type: 'error', msg: err.response?.data?.message || 'Finalize failed.' }); }
    setRsActing(p => ({ ...p, [id]: false }));
  };

  const handleRsRevert = async (id) => {
    if (!confirm('Revert this result sheet back to submitted status?')) return;
    setRsActing(p => ({ ...p, [id]: 'reverting' }));
    try {
      await axios.patch(`${API}/portal/exam/result-sheets/${id}/revert`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setRsSheets(p => p.map(s => s._id === id ? { ...s, status: 'submitted' } : s));
      if (rsDetail?._id === id) setRsDetail(p => p ? { ...p, status: 'submitted' } : p);
    } catch (err) { setAlert({ type: 'error', msg: err.response?.data?.message || 'Revert failed.' }); }
    setRsActing(p => ({ ...p, [id]: false }));
  };

  const openRsDetail = async (sheet) => {
    setRsDetail(sheet);
    if (!sheet.entries) {
      try { const { data } = await axios.get(`${API}/portal/exam/result-sheets/${sheet._id}`, { headers: { Authorization: `Bearer ${token}` } }); setRsDetail(data); }
      catch { /* use what we have */ }
    }
  };

  const handleDeleteCr = async (id) => {
    if (!confirm('Delete this correction request? This cannot be undone.')) return;
    setCrActing(p => ({ ...p, [id]: true }));
    try {
      await axios.delete(`${API}/portal/exam/correction-requests/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setCorrectionReqs(p => p.filter(r => r._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed.');
    }
    setCrActing(p => ({ ...p, [id]: false }));
  };

  const handleCrAction = async (id, status) => {
    const comment = crComment[id] || '';
    setCrActing(p => ({ ...p, [id]: true }));
    try {
      await axios.patch(`${API}/portal/exam/correction-requests/${id}`, { status, reviewerComment: comment },
        { headers: { Authorization: `Bearer ${token}` } });
      fetchCorrectionReqs(token, crFilter);
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed.');
    }
    setCrActing(p => ({ ...p, [id]: false }));
  };

  const fetchDegrees = async (search = degSearch) => {
    setDegLoading(true);
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : '';
      const { data } = await axios.get(`${API}/portal/exam/degrees${q}`, headers());
      setDegrees(data);
    } catch { setDegrees([]); }
    setDegLoading(false);
  };

  const handleDegreeSubmit = async (e) => {
    e.preventDefault();
    setDegSaving(true);
    try {
      const { data } = await axios.post(`${API}/portal/exam/degrees`, degForm, headers());
      setDegrees(p => [data, ...p]);
      setDegForm(EMPTY_DEGREE);
      setAlert({ type: 'success', msg: 'Degree record added successfully.' });
    } catch (err) { setAlert({ type: 'error', msg: err.response?.data?.message || 'Failed to save.' }); }
    setDegSaving(false);
  };

  const handleDegreeUpdate = async (e) => {
    e.preventDefault();
    setDegSaving(true);
    try {
      const { data } = await axios.patch(`${API}/portal/exam/degrees/${degEditId}`, degEditForm, headers());
      setDegrees(p => p.map(d => d._id === degEditId ? data : d));
      setDegEditId(null);
      setAlert({ type: 'success', msg: 'Degree record updated.' });
    } catch (err) { setAlert({ type: 'error', msg: err.response?.data?.message || 'Update failed.' }); }
    setDegSaving(false);
  };

  const handleDegreeDelete = async (id) => {
    if (!confirm('Delete this degree record? This cannot be undone.')) return;
    try {
      await axios.delete(`${API}/portal/exam/degrees/${id}`, headers());
      setDegrees(p => p.filter(d => d._id !== id));
    } catch (err) { setAlert({ type: 'error', msg: err.response?.data?.message || 'Delete failed.' }); }
  };

  async function handleLogin(e) {
    e.preventDefault(); setLoggingIn(true); setAlert({ type: '', msg: '' });
    try {
      const { data } = await axios.post(`${API}/portal/exam/login`, creds);
      setToken(data.token); setStaff(data.staff);
      localStorage.setItem('examToken', data.token);
      localStorage.setItem('examData', JSON.stringify(data.staff));
      setTab('dashboard');
    } catch (err) { setAlert({ type: 'error', msg: err.response?.data?.message || 'Login failed.' }); }
    setLoggingIn(false);
  }

  function handleLogout() {
    setStaff(null); setToken(''); setStats(null); setSheets([]); setResults([]);
    localStorage.removeItem('examToken'); localStorage.removeItem('examData');
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

  async function submitSheet(e) {
    e.preventDefault();
    if (!sheetFile) return setAlert({ type: 'error', msg: 'Please select a PDF file.' });
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(sheetForm).forEach(([k, v]) => fd.append(k, v));
      fd.append('file', sheetFile);
      await axios.post(`${API}/portal/exam/datesheets`, fd, headers());
      setSheetForm(EMPTY_SHEET); setSheetFile(null);
      if (sheetRef.current) sheetRef.current.value = '';
      setAlert({ type: 'success', msg: 'Date sheet uploaded.' });
      loadData(token);
    } catch (err) { setAlert({ type: 'error', msg: err.response?.data?.message || 'Upload failed.' }); }
    setSaving(false);
  }

  async function submitResult(e) {
    e.preventDefault();
    if (!resultFile) return setAlert({ type: 'error', msg: 'Please select a file.' });
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(resultForm).forEach(([k, v]) => fd.append(k, v));
      fd.append('file', resultFile);
      await axios.post(`${API}/portal/exam/results`, fd, headers());
      setResultForm(EMPTY_RESULT); setResultFile(null);
      if (resultRef.current) resultRef.current.value = '';
      setAlert({ type: 'success', msg: 'Result uploaded.' });
      loadData(token);
    } catch (err) { setAlert({ type: 'error', msg: err.response?.data?.message || 'Upload failed.' }); }
    setSaving(false);
  }

  async function togglePublish(type, id, current) {
    try {
      await axios.patch(`${API}/portal/exam/${type}/${id}/publish`, { isPublished: !current }, headers());
      loadData(token);
    } catch { setAlert({ type: 'error', msg: 'Could not update publish status.' }); }
  }

  async function deleteItem(type, id) {
    if (!confirm('Delete this item?')) return;
    try {
      await axios.delete(`${API}/portal/exam/${type}/${id}`, headers());
      loadData(token);
    } catch { setAlert({ type: 'error', msg: 'Delete failed.' }); }
  }

  if (!staff || tab === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #6b21a8, #7c3aed, #8b5cf6)' }}>
        <Head><title>Examination Portal — University of Makran</title></Head>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">Examination Portal</h1>
            <p className="text-purple-200 text-sm mt-1">Examination Section — University of Makran</p>
          </div>
          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            <Alert type={alert.type} msg={alert.msg} />
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className={labelCls}>Exam Staff ID</label>
                <input value={creds.examId} onChange={e => setCreds(p => ({ ...p, examId: e.target.value }))}
                  required placeholder="e.g. EXAM-001" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Password</label>
                <input type="password" value={creds.password} onChange={e => setCreds(p => ({ ...p, password: e.target.value }))}
                  required placeholder="••••••••" className={inputCls} />
              </div>
              <button type="submit" disabled={loggingIn}
                className="w-full py-3 font-bold text-white rounded-xl transition-all disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', boxShadow: '0 8px 24px rgba(124,58,237,0.35)' }}>
                {loggingIn ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
            <p className="text-xs text-gray-400 text-center mt-5">Contact admin for your exam staff credentials.</p>
          </div>
        </div>
      </div>
    );
  }

  const pendingCrCount = correctionReqs.filter(r => r.status === 'pending').length;

  const SIDEBAR = [
    { key: 'dashboard',    label: 'Dashboard',          icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { key: 'resultSheets', label: 'Result Sheets',       icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    { key: 'datesheets',   label: 'Date Sheets',         icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { key: 'results',      label: 'Results',             icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { key: 'corrections',  label: 'Correction Requests', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { key: 'degrees',      label: 'Degree Verification', icon: 'M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z' },
  ];

  function FormField({ label, name, value, onChange, type = 'text', placeholder }) {
    return (
      <div>
        <label className={labelCls}>{label}</label>
        <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder}
          className={inputCls} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-hidden">
      <Head><title>Examination Portal — University of Makran</title></Head>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 w-56 flex flex-col transition-transform duration-300 lg:relative lg:z-auto lg:translate-x-0 lg:shrink-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{ background: 'linear-gradient(180deg, #6b21a8, #5b21b6)' }}>
        <div className="p-5 border-b border-white/10">
          <p className="text-white font-bold text-sm">{staff.fullName}</p>
          <p className="text-purple-300 text-xs mt-0.5">{staff.designation || 'Examination Staff'}</p>
          <span className="inline-block mt-2 text-xs bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded-full font-medium">Exam Section</span>
        </div>
        <nav className="flex-1 p-3">
          {SIDEBAR.map(item => (
            <button key={item.key} onClick={() => { setTab(item.key); setAlert({ type: '', msg: '' }); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors mb-1 ${
                tab === item.key ? 'bg-white/20 text-white' : 'text-purple-200 hover:bg-white/10 hover:text-white'
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
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-purple-300 hover:bg-white/10 hover:text-white text-sm font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

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
        <Alert type={alert.type} msg={alert.msg} />

        {tab === 'dashboard' && (
          <>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Examination Dashboard</h2>
            <p className="text-gray-500 text-sm mb-8">Welcome, {staff.fullName}</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              <StatCard label="Enrolled Students"     value={stats?.totalStudents}      color="border-purple-500" />
              <StatCard label="Total Date Sheets"     value={stats?.totalDateSheets}    color="border-indigo-500" />
              <StatCard label="Published Date Sheets" value={stats?.publishedDateSheets} color="border-green-500" />
              <StatCard label="Results Uploaded"      value={stats?.totalResults}       color="border-blue-500"  />
            </div>
          </>
        )}

        {tab === 'datesheets' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Upload form */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-bold text-gray-800 mb-5">Upload Date Sheet</h3>
                <form onSubmit={submitSheet} className="space-y-4">
                  <FormField label="Title *" name="title" value={sheetForm.title} placeholder="e.g. Mid-Term Date Sheet"
                    onChange={e => setSheetForm(p => ({ ...p, title: e.target.value }))} />
                  <FormField label="Department" name="department" value={sheetForm.department} placeholder="CS & IT"
                    onChange={e => setSheetForm(p => ({ ...p, department: e.target.value }))} />
                  <FormField label="Program" name="program" value={sheetForm.program} placeholder="BS Computer Science"
                    onChange={e => setSheetForm(p => ({ ...p, program: e.target.value }))} />
                  <FormField label="Semester" name="semester" value={sheetForm.semester} placeholder="1st"
                    onChange={e => setSheetForm(p => ({ ...p, semester: e.target.value }))} />
                  <FormField label="Academic Session" name="academicSession" value={sheetForm.academicSession} placeholder="2025-26"
                    onChange={e => setSheetForm(p => ({ ...p, academicSession: e.target.value }))} />
                  <div>
                    <label className={labelCls}>Time Session</label>
                    <select value={sheetForm.timeSession}
                      onChange={e => setSheetForm(p => ({ ...p, timeSession: e.target.value }))}
                      className={inputCls}>
                      <option value="">— All / Not specified —</option>
                      <option value="Morning">🌅 Morning</option>
                      <option value="Evening">🌙 Evening</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>PDF File *</label>
                    <input ref={sheetRef} type="file" accept=".pdf" onChange={e => setSheetFile(e.target.files?.[0])}
                      className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-purple-600 file:text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="ds-pub" checked={sheetForm.isPublished}
                      onChange={e => setSheetForm(p => ({ ...p, isPublished: e.target.checked }))} className="accent-purple-600" />
                    <label htmlFor="ds-pub" className="text-sm text-gray-600">Publish immediately</label>
                  </div>
                  <button type="submit" disabled={saving}
                    className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 text-sm">
                    {saving ? 'Uploading…' : 'Upload Date Sheet'}
                  </button>
                </form>
              </div>
            </div>

            {/* List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50">
                  <h3 className="font-bold text-gray-800">All Date Sheets ({sheets.length})</h3>
                </div>
                {sheets.length === 0 ? (
                  <div className="p-12 text-center"><p className="text-3xl mb-2">📅</p><p className="text-gray-400">No date sheets yet.</p></div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {sheets.map(s => (
                      <div key={s._id} className="px-6 py-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{s.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {s.department} · {s.program} · Sem {s.semester} · {s.academicSession}
                            {s.timeSession && <span className={`ml-2 px-1.5 py-0.5 rounded font-semibold text-[10px] ${s.timeSession === 'Morning' ? 'bg-yellow-100 text-yellow-700' : 'bg-indigo-100 text-indigo-700'}`}>{s.timeSession === 'Morning' ? '🌅' : '🌙'} {s.timeSession}</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {s.fileUrl
                            ? <a href={`${BASE_URL}${s.fileUrl}`} target="_blank" rel="noreferrer"
                                className="px-3 py-1.5 text-xs font-bold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">View</a>
                            : <span className="px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-300 rounded-lg cursor-not-allowed" title="No file attached">No File</span>
                          }
                          <button onClick={() => togglePublish('datesheets', s._id, s.isPublished)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg ${s.isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {s.isPublished ? 'Published' : 'Draft'}
                          </button>
                          <button onClick={() => deleteItem('datesheets', s._id)}
                            className="w-7 h-7 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg text-sm">🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'results' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-bold text-gray-800 mb-5">Upload Result</h3>
                <form onSubmit={submitResult} className="space-y-4">
                  <FormField label="Title *" name="title" value={resultForm.title} placeholder="e.g. Mid-Term Results"
                    onChange={e => setResultForm(p => ({ ...p, title: e.target.value }))} />
                  <FormField label="Department" name="department" value={resultForm.department} placeholder="CS & IT"
                    onChange={e => setResultForm(p => ({ ...p, department: e.target.value }))} />
                  <FormField label="Program" name="program" value={resultForm.program} placeholder="BS Computer Science"
                    onChange={e => setResultForm(p => ({ ...p, program: e.target.value }))} />
                  <FormField label="Semester" name="semester" value={resultForm.semester} placeholder="1st"
                    onChange={e => setResultForm(p => ({ ...p, semester: e.target.value }))} />
                  <FormField label="Academic Session" name="academicSession" value={resultForm.academicSession} placeholder="2025-26"
                    onChange={e => setResultForm(p => ({ ...p, academicSession: e.target.value }))} />
                  <div>
                    <label className={labelCls}>Time Session</label>
                    <select value={resultForm.timeSession} onChange={e => setResultForm(p => ({ ...p, timeSession: e.target.value }))}
                      className={inputCls}>
                      <option value="">-- Select Session --</option>
                      <option value="Morning">Morning</option>
                      <option value="Evening">Evening</option>
                    </select>
                  </div>
                  <FormField label="Passing Marks" name="passingMarks" value={resultForm.passingMarks} placeholder="40" type="number"
                    onChange={e => setResultForm(p => ({ ...p, passingMarks: e.target.value }))} />
                  <div>
                    <label className={labelCls}>Result File *</label>
                    <input ref={resultRef} type="file" accept=".pdf,.xlsx,.csv" onChange={e => setResultFile(e.target.files?.[0])}
                      className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-purple-600 file:text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="re-pub" checked={resultForm.isPublished}
                      onChange={e => setResultForm(p => ({ ...p, isPublished: e.target.checked }))} className="accent-purple-600" />
                    <label htmlFor="re-pub" className="text-sm text-gray-600">Publish immediately</label>
                  </div>
                  <button type="submit" disabled={saving}
                    className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 text-sm">
                    {saving ? 'Uploading…' : 'Upload Result'}
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50">
                  <h3 className="font-bold text-gray-800">All Results ({results.length})</h3>
                </div>
                {results.length === 0 ? (
                  <div className="p-12 text-center"><p className="text-3xl mb-2">📊</p><p className="text-gray-400">No results uploaded yet.</p></div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {results.map(r => (
                      <div key={r._id} className="px-6 py-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{r.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <p className="text-xs text-gray-400">{r.department} · {r.program} · Sem {r.semester} · {r.academicSession}</p>
                            {r.timeSession && (
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.timeSession === 'Morning' ? 'bg-yellow-100 text-yellow-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                {r.timeSession === 'Morning' ? '🌅' : '🌙'} {r.timeSession}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {r.fileUrl
                            ? <a href={`${BASE_URL}${r.fileUrl}`} target="_blank" rel="noreferrer"
                                className="px-3 py-1.5 text-xs font-bold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">View</a>
                            : <span className="px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-300 rounded-lg cursor-not-allowed" title="No file attached">No File</span>
                          }
                          <button onClick={() => togglePublish('results', r._id, r.isPublished)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg ${r.isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {r.isPublished ? 'Published' : 'Draft'}
                          </button>
                          <button onClick={() => deleteItem('results', r._id)}
                            className="w-7 h-7 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg text-sm">🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'resultSheets' && (() => {
          const RS_BADGE = { submitted: 'bg-yellow-100 text-yellow-800', finalized: 'bg-green-100 text-green-800', draft: 'bg-gray-100 text-gray-600' };

          if (rsDetail) {
            const sheet = rsDetail;
            const entries = sheet.entries || [];
            const passCount = entries.filter(e => e.resultStatus === 'Pass').length;
            const failCount = entries.filter(e => e.resultStatus === 'Fail').length;
            return (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={() => setRsDetail(null)} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-medium">← Back</button>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${RS_BADGE[sheet.status] || 'bg-gray-100 text-gray-600'}`}>{sheet.status}</span>
                  <div className="ml-auto flex gap-2">
                    {sheet.status === 'submitted' && (
                      <button onClick={() => { setRsFinalizeId(sheet._id); setRsFinalizeThreshold('50'); }} disabled={!!rsActing[sheet._id]} className="px-5 py-2 bg-green-600 text-white font-bold rounded-xl text-sm hover:opacity-90 disabled:opacity-60">
                        {rsActing[sheet._id] === 'finalizing' ? 'Finalizing…' : '✅ Finalize & Publish'}
                      </button>
                    )}
                    {sheet.status === 'finalized' && (
                      <button onClick={() => handleRsRevert(sheet._id)} disabled={!!rsActing[sheet._id]} className="px-5 py-2 bg-orange-500 text-white font-bold rounded-xl text-sm hover:opacity-90 disabled:opacity-60">
                        {rsActing[sheet._id] === 'reverting' ? 'Reverting…' : 'Revert to Submitted'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
                  <h2 className="text-xl font-bold text-gray-800 mb-1">{sheet.subject}</h2>
                  <p className="text-gray-500 text-sm mb-4">{sheet.department} · {sheet.program} · {sheet.semester} · {sheet.academicSession} · {sheet.examType}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
                          <tr>{['#','Reg No','Name','Father','Marks/Total','Grade','Status','Remarks'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {entries.map((e, i) => (
                            <tr key={i} className="hover:bg-gray-50/50">
                              <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                              <td className="px-4 py-3 font-mono text-xs text-gray-600">{e.registrationNo}</td>
                              <td className="px-4 py-3 font-semibold text-gray-800">{e.studentName}</td>
                              <td className="px-4 py-3 text-gray-500 text-xs">{e.fatherName || '—'}</td>
                              <td className="px-4 py-3 font-bold text-gray-800">{e.resultStatus === 'Absent' || e.resultStatus === 'Withheld' ? '—' : `${e.obtainedMarks}/${sheet.totalMarks}`}</td>
                              <td className="px-4 py-3"><span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">{e.grade || '—'}</span></td>
                              <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${e.resultStatus === 'Pass' ? 'bg-green-100 text-green-800' : e.resultStatus === 'Fail' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{e.resultStatus}</span></td>
                              <td className="px-4 py-3 text-gray-400 text-xs">{e.remarks || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          return (
            <>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">Result Sheets</h2>
              <p className="text-gray-500 text-sm mb-5">Review and finalize teacher-submitted result sheets. Finalized sheets are visible to students.</p>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[['Department', 'department'], ['Program', 'program'], ['Subject', 'subject']].map(([lbl, key]) => (
                    <input key={key} value={rsFilters[key]} onChange={e => setRsFilters(p => ({ ...p, [key]: e.target.value }))} placeholder={lbl} className="px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-200" />
                  ))}
                  <select value={rsFilters.semester} onChange={e => setRsFilters(p => ({ ...p, semester: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-200">
                    <option value="">All Semesters</option>
                    {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={`Semester ${n}`}>Semester {n}</option>)}
                  </select>
                  <select value={rsFilters.status} onChange={e => setRsFilters(p => ({ ...p, status: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-200">
                    <option value="">Submitted + Finalized</option>
                    <option value="submitted">Submitted</option>
                    <option value="finalized">Finalized</option>
                  </select>
                </div>
                <button onClick={() => fetchRsSheets(token, rsFilters)} className="mt-3 px-5 py-2 bg-purple-600 text-white font-bold rounded-xl text-xs hover:opacity-90">Apply Filters</button>
              </div>

              {rsLoading ? <div className="flex items-center gap-3 text-gray-400"><div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /> Loading…</div>
              : rsSheets.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm"><p className="text-3xl mb-3">📋</p><p className="text-gray-500">No result sheets found.</p></div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>{['Subject','Department','Program','Semester','Type','Teacher','Students','Submitted','Status','Action'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {rsSheets.map(s => (
                          <tr key={s._id} className="hover:bg-gray-50/50">
                            <td className="px-4 py-3 font-semibold text-gray-800 max-w-xs truncate">{s.subject}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{s.department}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{s.program}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{s.semester}</td>
                            <td className="px-4 py-3"><span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">{s.examType}</span></td>
                            <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{s.teacherName || s.teacherId}</td>
                            <td className="px-4 py-3 text-center font-bold text-gray-700">{s.entries?.length ?? '—'}</td>
                            <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('en-GB') : '—'}</td>
                            <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${RS_BADGE[s.status] || 'bg-gray-100 text-gray-600'}`}>{s.status}</span></td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1.5">
                                <button onClick={() => openRsDetail(s)} className="text-xs text-purple-600 font-bold px-2.5 py-1.5 border border-purple-200 rounded-lg hover:bg-purple-50 whitespace-nowrap">View</button>
                                {s.status === 'submitted' && (
                                  <button onClick={() => { setRsFinalizeId(s._id); setRsFinalizeThreshold('50'); }} disabled={!!rsActing[s._id]} className="text-xs text-green-700 font-bold px-2.5 py-1.5 border border-green-200 rounded-lg hover:bg-green-50 whitespace-nowrap disabled:opacity-50">
                                    {rsActing[s._id] ? '…' : 'Finalize'}
                                  </button>
                                )}
                                {s.status === 'finalized' && (
                                  <button onClick={() => handleRsRevert(s._id)} disabled={!!rsActing[s._id]} className="text-xs text-orange-600 font-bold px-2.5 py-1.5 border border-orange-200 rounded-lg hover:bg-orange-50 whitespace-nowrap disabled:opacity-50">
                                    {rsActing[s._id] ? '…' : 'Revert'}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-5 py-3 border-t border-gray-50 bg-gray-50"><p className="text-xs text-gray-400">Showing {rsSheets.length} result sheet{rsSheets.length !== 1 ? 's' : ''}</p></div>
                </div>
              )}
            </>
          );
        })()}

        {tab === 'corrections' && (
          <>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Correction Requests</h2>
            <p className="text-gray-500 text-sm mb-6">Review and approve or reject teacher result correction requests.</p>

            <div className="flex gap-2 mb-5 flex-wrap">
              {[['', 'All'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']].map(([val, label]) => (
                <button key={val} onClick={() => { setCrFilter(val); fetchCorrectionReqs(token, val); }}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold border transition ${
                    crFilter === val ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}>{label}</button>
              ))}
            </div>

            {crLoading ? (
              <div className="flex items-center gap-3 text-gray-400"><div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /> Loading…</div>
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
                          {r.examType && <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">{r.examType}</span>}
                          {r.semester && <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">{r.semester}</span>}
                        </div>
                        <p className="text-gray-500 text-xs mt-1">By <strong>{r.teacherName || r.teacherId}</strong> · {new Date(r.createdAt).toLocaleDateString('en-GB')}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          r.status === 'pending'  ? 'bg-yellow-100 text-yellow-800' :
                          r.status === 'approved' ? 'bg-green-100 text-green-800'   :
                                                    'bg-red-100 text-red-700'
                        }`}>{r.status}</span>
                        <button onClick={() => handleDeleteCr(r._id)} disabled={crActing[r._id]}
                          className="w-7 h-7 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg text-sm disabled:opacity-40"
                          title="Delete request">🗑️</button>
                      </div>
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
                          rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500 resize-none mb-3"
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

        {tab === 'degrees' && (
          <>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Degree Verification</h2>
            <p className="text-gray-500 text-sm mb-6">Add and manage degree completion records. These are shown publicly when someone searches by registration number.</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Add / Edit form */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="font-bold text-gray-800 mb-5">{degEditId ? 'Edit Record' : 'Add Degree Record'}</h3>
                  <form onSubmit={degEditId ? handleDegreeUpdate : handleDegreeSubmit} className="space-y-3">
                    {[
                      { label: 'Registration No *', key: 'registrationNo', placeholder: 'e.g. 2021-UoMP-CS-001', disabled: !!degEditId },
                      { label: 'Full Name *',       key: 'fullName',       placeholder: 'Student full name' },
                      { label: "Father's Name",     key: 'fatherName',     placeholder: "Father's name" },
                      { label: 'Department *',      key: 'department',     placeholder: 'e.g. CS & IT' },
                      { label: 'Program *',         key: 'program',        placeholder: 'e.g. BS Computer Science' },
                      { label: 'Session / Batch',   key: 'session',        placeholder: 'e.g. 2021-2025' },
                      { label: 'Graduation Year',   key: 'graduationYear', placeholder: 'e.g. 2025' },
                      { label: 'CGPA',              key: 'cgpa',           placeholder: 'e.g. 3.45' },
                    ].map(({ label, key, placeholder, disabled }) => {
                      const form = degEditId ? degEditForm : degForm;
                      const setForm = degEditId
                        ? (v) => setDegEditForm(p => ({ ...p, [key]: v }))
                        : (v) => setDegForm(p => ({ ...p, [key]: v }));
                      return (
                        <div key={key}>
                          <label className={labelCls}>{label}</label>
                          <input value={form[key]} onChange={e => setForm(e.target.value)}
                            placeholder={placeholder} disabled={disabled}
                            className={`${inputCls} ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`} />
                        </div>
                      );
                    })}

                    <div>
                      <label className={labelCls}>Degree Status</label>
                      <select value={degEditId ? degEditForm.degreeStatus : degForm.degreeStatus}
                        onChange={e => degEditId ? setDegEditForm(p => ({ ...p, degreeStatus: e.target.value })) : setDegForm(p => ({ ...p, degreeStatus: e.target.value }))}
                        className={inputCls}>
                        <option value="completed">✅ Completed</option>
                        <option value="in-progress">🔄 In Progress</option>
                        <option value="withdrawn">❌ Withdrawn</option>
                      </select>
                    </div>

                    <div>
                      <label className={labelCls}>Remarks</label>
                      <textarea value={degEditId ? degEditForm.remarks : degForm.remarks}
                        onChange={e => degEditId ? setDegEditForm(p => ({ ...p, remarks: e.target.value })) : setDegForm(p => ({ ...p, remarks: e.target.value }))}
                        rows={2} placeholder="Optional notes…"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-500 resize-none" />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button type="submit" disabled={degSaving}
                        className="flex-1 py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 text-sm">
                        {degSaving ? 'Saving…' : degEditId ? 'Update Record' : 'Add Record'}
                      </button>
                      {degEditId && (
                        <button type="button" onClick={() => { setDegEditId(null); setDegEditForm(EMPTY_DEGREE); }}
                          className="px-4 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 text-sm">
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>

              {/* Records list */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3">
                    <h3 className="font-bold text-gray-800 flex-1">All Records ({degrees.length})</h3>
                    <div className="flex items-center gap-2">
                      <input value={degSearch} onChange={e => setDegSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && fetchDegrees(degSearch)}
                        placeholder="Search by name or reg no…"
                        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 w-52" />
                      <button onClick={() => fetchDegrees(degSearch)}
                        className="px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-lg hover:opacity-90">Search</button>
                      {degSearch && (
                        <button onClick={() => { setDegSearch(''); fetchDegrees(''); }}
                          className="px-3 py-1.5 border border-gray-200 text-gray-500 text-xs font-semibold rounded-lg hover:bg-gray-50">Clear</button>
                      )}
                    </div>
                  </div>

                  {degLoading ? (
                    <div className="p-10 flex items-center gap-3 text-gray-400"><div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /> Loading…</div>
                  ) : degrees.length === 0 ? (
                    <div className="p-16 text-center"><p className="text-3xl mb-2">🎓</p><p className="text-gray-400">No degree records yet.</p></div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {degrees.map(d => (
                        <div key={d._id} className="px-6 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-gray-800 text-sm">{d.fullName}</p>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                  d.degreeStatus === 'completed'   ? 'bg-green-100 text-green-700' :
                                  d.degreeStatus === 'in-progress' ? 'bg-blue-100 text-blue-700'   :
                                                                     'bg-red-100 text-red-600'
                                }`}>
                                  {d.degreeStatus === 'completed' ? '✅ Completed' : d.degreeStatus === 'in-progress' ? '🔄 In Progress' : '❌ Withdrawn'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {d.registrationNo} · {d.program} · {d.department}
                                {d.session && ` · ${d.session}`}
                                {d.graduationYear && ` · ${d.graduationYear}`}
                                {d.cgpa && ` · CGPA ${d.cgpa}`}
                              </p>
                              {d.remarks && <p className="text-xs text-gray-400 italic mt-0.5">{d.remarks}</p>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button onClick={() => { setDegEditId(d._id); setDegEditForm({ registrationNo: d.registrationNo, fullName: d.fullName, fatherName: d.fatherName || '', department: d.department, program: d.program, session: d.session || '', graduationYear: d.graduationYear || '', cgpa: d.cgpa || '', degreeStatus: d.degreeStatus, remarks: d.remarks || '' }); }}
                                className="px-3 py-1.5 text-xs font-bold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Edit</button>
                              <button onClick={() => handleDegreeDelete(d._id)}
                                className="w-7 h-7 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg text-sm">🗑️</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

      </main>

      {/* Finalize threshold modal */}
      {rsFinalizeId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-gray-800 text-lg mb-1">Set Passing Marks</h3>
            <p className="text-gray-500 text-sm mb-4">
              Enter the minimum marks (out of 100) a student needs to pass. Students at or above this threshold will be marked <strong>Pass</strong>; others will be marked <strong>Fail</strong>.
            </p>
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Passing Threshold (out of 100)</label>
              <input
                type="number" min="1" max="100"
                value={rsFinalizeThreshold}
                onChange={e => setRsFinalizeThreshold(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-green-500 text-center font-bold text-lg"
                placeholder="e.g. 50"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleRsFinalize}
                disabled={!!rsActing[rsFinalizeId]}
                className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-green-700 transition disabled:opacity-50"
              >
                {rsActing[rsFinalizeId] ? 'Finalizing…' : '✅ Finalize & Publish'}
              </button>
              <button
                onClick={() => { setRsFinalizeId(null); setRsFinalizeThreshold('50'); }}
                className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
