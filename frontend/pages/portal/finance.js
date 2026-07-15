import React, { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const inputCls = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 transition-all';
const labelCls = 'block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5';

function Alert({ type, msg }) {
  if (!msg) return null;
  const styles = type === 'error' ? 'bg-red-50 border-l-4 border-red-500 text-red-700' : 'bg-green-50 border-l-4 border-green-500 text-green-700';
  return <div className={`px-4 py-3 rounded-lg text-sm mb-4 ${styles}`}>{msg}</div>;
}

function StatCard({ label, value, color, sub }) {
  return (
    <div className={`bg-white rounded-2xl p-5 border-l-4 ${color} shadow-sm`}>
      <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold text-gray-800 mt-1">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

const STATUS_BADGE = {
  approved: 'bg-green-100 text-green-800',
  pending:  'bg-yellow-100 text-yellow-800',
  rejected: 'bg-red-100 text-red-800',
  suspended:'bg-gray-100 text-gray-500',
};

const FEE_BADGE = {
  paid:    'bg-green-100 text-green-800',
  unpaid:  'bg-red-100 text-red-700',
  partial: 'bg-yellow-100 text-yellow-800',
  overdue: 'bg-orange-100 text-orange-800',
  waived:  'bg-gray-100 text-gray-600',
  generated:'bg-blue-100 text-blue-800',
  expired: 'bg-orange-100 text-orange-700',
  cancelled:'bg-gray-100 text-gray-600',
};

const EMPTY_FS = { program: '', department: '', semester: '', academicSession: '', dueDate: '', lateFeePerDay: '0' };
const EMPTY_FS_ITEM = { description: '', amount: '' };
const EMPTY_GEN = { studentId: '', feeStructureId: '', dueDate: '', lateFeePerDay: '0', bankName: 'Habib Bank Limited (HBL)', bankAccount: 'PK36HABB0002437900614201', bankBranch: 'Panjgur Branch', paymentInstructions: 'Deposit the fee amount in the university bank account and submit the original deposit slip to the Finance Section within the due date.', academicSession: '' };

function fmt(n) { return Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 0 }); }

export default function FinancePortal() {
  const [tab, setTab]       = useState('login');
  const [staff, setStaff]   = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [token, setToken]   = useState('');
  const [creds, setCreds]   = useState({ financeId: '', password: '' });
  const [alert, setAlert]   = useState({ type: '', msg: '' });
  const [loggingIn, setLoggingIn] = useState(false);
  const [stats, setStats]   = useState(null);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(false);

  // Fee Structure state
  const [feeStructures, setFeeStructures] = useState([]);
  const [fsLoading, setFsLoading]         = useState(false);
  const [fsForm, setFsForm]               = useState(EMPTY_FS);
  const [fsItems, setFsItems]             = useState([{ ...EMPTY_FS_ITEM }]);
  const [fsSaving, setFsSaving]           = useState(false);
  const [fsMsg, setFsMsg]                 = useState({ type: '', text: '' });
  const [fsEditId, setFsEditId]           = useState(null);

  // Fee Records state
  const [feeRecords, setFeeRecords]       = useState([]);
  const [frLoading, setFrLoading]         = useState(false);
  const [frSearch, setFrSearch]           = useState('');
  const [frStatus, setFrStatus]           = useState('');
  const [frSemFilter, setFrSemFilter]     = useState('');
  const [frUpdateId, setFrUpdateId]       = useState(null);
  const [frUpdateForm, setFrUpdateForm]   = useState({ status: '', paidAmount: '', paymentMethod: '', transactionRef: '', remarks: '' });
  const [frUpdating, setFrUpdating]       = useState(false);

  // Challans state
  const [challans, setChallans]           = useState([]);
  const [chnLoading, setChnLoading]       = useState(false);
  const [chnSearch, setChnSearch]         = useState('');
  const [chnStatus, setChnStatus]         = useState('');
  const [chnGenForm, setChnGenForm]       = useState(EMPTY_GEN);
  const [chnGenItems, setChnGenItems]     = useState([{ ...EMPTY_FS_ITEM }]);
  const [chnGenStudents, setChnGenStudents] = useState([]);
  const [chnGenSearch, setChnGenSearch]   = useState('');
  const [chnGenSearching, setChnGenSearching] = useState(false);
  const [chnGenerating, setChnGenerating] = useState(false);
  const [chnGenMsg, setChnGenMsg]         = useState({ type: '', text: '' });
  const [chnView, setChnView]             = useState('list');
  const [chnSelected, setChnSelected]     = useState(null);
  const [chnActing, setChnActing]         = useState({});

  // Fee stats
  const [feeStats, setFeeStats]           = useState(null);

  // Always uses the current token — passed explicitly to avoid stale closures
  function authHeader(tok) { return { headers: { Authorization: `Bearer ${tok}` } }; }

  const tokenRef = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);

  useEffect(() => {
    const saved      = localStorage.getItem('financeToken');
    const savedStaff = localStorage.getItem('financeData');
    if (saved && savedStaff) {
      tokenRef.current = saved;
      setToken(saved);
      setStaff(JSON.parse(savedStaff));
      setTab('dashboard');
    }
  }, []);

  const loadData = useCallback(async (tok, q = {}) => {
    const t = tok || tokenRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams(q).toString();
      const [s, st] = await Promise.all([
        axios.get(`${API}/portal/finance/stats`, authHeader(t)),
        axios.get(`${API}/portal/finance/students${params ? '?' + params : ''}`, authHeader(t)),
      ]);
      setStats(s.data);
      setStudents(st.data || []);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load data.';
      setAlert({ type: 'error', msg });
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (tab === 'dashboard' && token) { loadData(token); fetchFeeStats(token); } }, [tab, token, loadData]);
  useEffect(() => { if (tab === 'students'     && token) loadData(token); }, [tab, token, loadData]);
  useEffect(() => { if (tab === 'feeStructure' && token) fetchFeeStructures(token); }, [tab, token]);
  useEffect(() => { if (tab === 'feeRecords'   && token) fetchFeeRecords(token); }, [tab, token]);
  useEffect(() => { if (tab === 'challans'     && token) { fetchChallans(token); fetchFeeStructures(token); } }, [tab, token]);

  const fetchFeeStats = async (tok) => {
    const t = tok || tokenRef.current;
    try {
      const { data } = await axios.get(`${API}/portal/finance/fee-stats`, authHeader(t));
      setFeeStats(data);
    } catch { /* fee stats failure is non-critical */ }
  };

  const fetchFeeStructures = async (tok) => {
    const t = tok || tokenRef.current;
    setFsLoading(true);
    try {
      const { data } = await axios.get(`${API}/portal/finance/fee-structures`, authHeader(t));
      setFeeStructures(data || []);
    } catch (err) {
      setFsMsg({ type: 'error', text: err.response?.data?.message || 'Failed to load fee structures.' });
    }
    setFsLoading(false);
  };

  const handleSaveFS = async (e) => {
    e.preventDefault(); setFsSaving(true); setFsMsg({ type: '', text: '' });
    const validItems = fsItems.filter(i => i.description && Number(i.amount) > 0);
    if (!validItems.length) { setFsMsg({ type: 'error', text: 'Add at least one valid fee item.' }); setFsSaving(false); return; }
    try {
      const body = { ...fsForm, feeItems: validItems };
      if (fsEditId) { await axios.patch(`${API}/portal/finance/fee-structures/${fsEditId}`, body, authHeader(tokenRef.current)); }
      else          { await axios.post(`${API}/portal/finance/fee-structures`, body, authHeader(tokenRef.current)); }
      setFsMsg({ type: 'success', text: fsEditId ? 'Fee structure updated.' : 'Fee structure created.' });
      setFsForm(EMPTY_FS); setFsItems([{ ...EMPTY_FS_ITEM }]); setFsEditId(null);
      fetchFeeStructures();
    } catch (err) { setFsMsg({ type: 'error', text: err.response?.data?.message || 'Error.' }); }
    setFsSaving(false);
  };

  const startEditFS = (s) => {
    setFsForm({ program: s.program, department: s.department || '', semester: s.semester, academicSession: s.academicSession || '', dueDate: s.dueDate ? s.dueDate.slice(0,10) : '', lateFeePerDay: String(s.lateFeePerDay || 0) });
    setFsItems(s.feeItems.length ? s.feeItems.map(i => ({ description: i.description, amount: String(i.amount) })) : [{ ...EMPTY_FS_ITEM }]);
    setFsEditId(s._id);
    setFsMsg({ type: '', text: '' });
  };

  const handleDeleteFS = async (id) => {
    if (!confirm('Delete this fee structure?')) return;
    try { await axios.delete(`${API}/portal/finance/fee-structures/${id}`, authHeader(tokenRef.current)); fetchFeeStructures(); }
    catch { setAlert({ type: 'error', msg: 'Delete failed.' }); }
  };

  const fetchFeeRecords = async (tok) => {
    setFrLoading(true);
    try {
      const q = new URLSearchParams();
      if (frSearch)    q.set('search', frSearch);
      if (frStatus)    q.set('status', frStatus);
      if (frSemFilter) q.set('semester', frSemFilter);
      const { data } = await axios.get(`${API}/portal/finance/fee-records${q.toString() ? '?' + q : ''}`, authHeader(tok || tokenRef.current));
      setFeeRecords(data || []);
    } catch { /* silent */ }
    setFrLoading(false);
  };

  const openFrUpdate = (rec) => {
    setFrUpdateId(rec._id);
    setFrUpdateForm({ status: rec.status, paidAmount: String(rec.paidAmount || ''), paymentMethod: rec.paymentMethod || '', transactionRef: rec.transactionRef || '', remarks: rec.remarks || '' });
  };

  const handleUpdateFR = async (e) => {
    e.preventDefault(); setFrUpdating(true);
    try {
      await axios.patch(`${API}/portal/finance/fee-records/${frUpdateId}`, frUpdateForm, authHeader(tokenRef.current));
      setFrUpdateId(null); fetchFeeRecords();
    } catch (err) { setAlert({ type: 'error', msg: err.response?.data?.message || 'Update failed.' }); }
    setFrUpdating(false);
  };

  const fetchChallans = async (tok) => {
    setChnLoading(true);
    try {
      const q = new URLSearchParams();
      if (chnSearch) q.set('search', chnSearch);
      if (chnStatus) q.set('status', chnStatus);
      const { data } = await axios.get(`${API}/portal/finance/challans${q.toString() ? '?' + q : ''}`, authHeader(tok || tokenRef.current));
      setChallans(data || []);
    } catch { /* silent */ }
    setChnLoading(false);
  };

  const searchChallanStudents = async () => {
    if (!chnGenSearch.trim()) return;
    setChnGenSearching(true);
    try {
      const { data } = await axios.get(`${API}/portal/finance/students?search=${encodeURIComponent(chnGenSearch)}`, authHeader(tokenRef.current));
      setChnGenStudents(data || []);
    } catch { setChnGenStudents([]); }
    setChnGenSearching(false);
  };

  const onSelectFS = (fsId) => {
    const fs = feeStructures.find(f => f._id === fsId);
    setChnGenForm(p => ({ ...p, feeStructureId: fsId, dueDate: fs?.dueDate ? fs.dueDate.slice(0,10) : p.dueDate, lateFeePerDay: String(fs?.lateFeePerDay ?? p.lateFeePerDay) }));
    if (fs) setChnGenItems(fs.feeItems.map(i => ({ description: i.description, amount: String(i.amount) })));
  };

  const handleGenerateChallan = async (e) => {
    e.preventDefault(); setChnGenerating(true); setChnGenMsg({ type: '', text: '' });
    if (!chnGenForm.studentId) { setChnGenMsg({ type: 'error', text: 'Please select a student.' }); setChnGenerating(false); return; }
    const validItems = chnGenItems.filter(i => i.description && Number(i.amount) > 0);
    if (!chnGenForm.feeStructureId && !validItems.length) { setChnGenMsg({ type: 'error', text: 'Add at least one fee item or select a fee structure.' }); setChnGenerating(false); return; }
    try {
      const body = { ...chnGenForm, feeItems: chnGenForm.feeStructureId ? undefined : validItems };
      const { data } = await axios.post(`${API}/portal/finance/challans`, body, authHeader(tokenRef.current));
      setChnGenMsg({ type: 'success', text: `Challan ${data.challan.challanNo} generated!` });
      setChnGenForm(EMPTY_GEN); setChnGenItems([{ ...EMPTY_FS_ITEM }]); setChnGenStudents([]);
      setChnGenSearch(''); fetchChallans(); fetchFeeRecords();
    } catch (err) { setChnGenMsg({ type: 'error', text: err.response?.data?.message || 'Error.' }); }
    setChnGenerating(false);
  };

  const handleChallanAction = async (id, status, paymentRef = '') => {
    setChnActing(p => ({ ...p, [id]: true }));
    try {
      await axios.patch(`${API}/portal/finance/challans/${id}`, { status, paymentRef }, authHeader(tokenRef.current));
      fetchChallans(); if (chnSelected?._id === id) setChnSelected(p => p ? { ...p, status, paymentRef } : p);
    } catch (err) { setAlert({ type: 'error', msg: err.response?.data?.message || 'Action failed.' }); }
    setChnActing(p => ({ ...p, [id]: false }));
  };

  async function handleLogin(e) {
    e.preventDefault(); setLoggingIn(true); setAlert({ type: '', msg: '' });
    try {
      const { data } = await axios.post(`${API}/portal/finance/login`, creds);
      setToken(data.token); setStaff(data.staff);
      localStorage.setItem('financeToken', data.token);
      localStorage.setItem('financeData', JSON.stringify(data.staff));
      setTab('dashboard');
    } catch (err) { setAlert({ type: 'error', msg: err.response?.data?.message || 'Login failed.' }); }
    setLoggingIn(false);
  }

  function handleLogout() {
    setStaff(null); setToken(''); setStats(null); setStudents([]);
    localStorage.removeItem('financeToken'); localStorage.removeItem('financeData');
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

  function handleSearch(e) {
    e.preventDefault();
    const q = {};
    if (search) q.search = search;
    if (filterStatus) q.status = filterStatus;
    loadData(token, q);
  }

  function handleFrSearch(e) {
    e.preventDefault();
    fetchFeeRecords();
  }

  function handleChnSearch(e) {
    e.preventDefault();
    fetchChallans();
  }

  if (!staff || tab === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #065f46, #047857, #059669)' }}>
        <Head><title>Finance Portal — University of Makran</title></Head>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">Finance Portal</h1>
            <p className="text-emerald-200 text-sm mt-1">Finance Section — University of Makran</p>
          </div>
          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            <Alert type={alert.type} msg={alert.msg} />
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className={labelCls}>Finance Staff ID</label>
                <input value={creds.financeId} onChange={e => setCreds(p => ({ ...p, financeId: e.target.value }))}
                  required placeholder="e.g. FIN-001" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Password</label>
                <input type="password" value={creds.password} onChange={e => setCreds(p => ({ ...p, password: e.target.value }))}
                  required placeholder="••••••••" className={inputCls} />
              </div>
              <button type="submit" disabled={loggingIn}
                className="w-full py-3 font-bold text-white rounded-xl transition-all disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #047857, #059669)', boxShadow: '0 8px 24px rgba(4,120,87,0.35)' }}>
                {loggingIn ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
            <p className="text-xs text-gray-400 text-center mt-5">Contact admin for your finance staff credentials.</p>
          </div>
        </div>
      </div>
    );
  }

  const SIDEBAR = [
    { key: 'dashboard',    label: 'Dashboard',      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { key: 'students',     label: 'Students',        icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { key: 'feeStructure', label: 'Fee Structure',   icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    { key: 'feeRecords',   label: 'Fee Records',     icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { key: 'challans',     label: 'Challans',        icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-hidden">
      <Head><title>Finance Portal — University of Makran</title></Head>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 w-56 flex flex-col transition-transform duration-300 lg:relative lg:z-auto lg:translate-x-0 lg:shrink-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{ background: 'linear-gradient(180deg, #065f46, #047857)' }}>
        <div className="p-5 border-b border-white/10">
          <p className="text-white font-bold text-sm">{staff.fullName}</p>
          <p className="text-emerald-300 text-xs mt-0.5">{staff.designation || 'Finance Officer'}</p>
          <span className="inline-block mt-2 text-xs bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full font-medium">Finance</span>
        </div>
        <nav className="flex-1 p-3">
          {SIDEBAR.map(item => (
            <button key={item.key} onClick={() => { setTab(item.key); setAlert({ type: '', msg: '' }); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors mb-1 ${
                tab === item.key ? 'bg-white/20 text-white' : 'text-emerald-200 hover:bg-white/10 hover:text-white'
              }`}>
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-emerald-300 hover:bg-white/10 hover:text-white text-sm font-medium transition-colors">
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
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Finance Dashboard</h2>
            <p className="text-gray-500 text-sm mb-6">Welcome, {staff.fullName}</p>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Student Enrollment</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard label="Total Students"      value={stats?.total}     color="border-emerald-500" />
              <StatCard label="Enrolled (Approved)" value={stats?.approved}  color="border-green-500"  />
              <StatCard label="Pending Approval"    value={stats?.pending}   color="border-yellow-500" />
              <StatCard label="Suspended"           value={stats?.suspended} color="border-red-500"    />
            </div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Fee Collection</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Fee Records"         value={feeStats?.totalRecords} color="border-emerald-500" />
              <StatCard label="Paid"                value={feeStats?.paid}         color="border-green-500"   sub={feeStats ? `Rs. ${fmt(feeStats.totalCollected)}` : undefined} />
              <StatCard label="Unpaid / Overdue"    value={(feeStats?.unpaid || 0) + (feeStats?.overdue || 0)} color="border-red-500" sub={feeStats ? `Rs. ${fmt(feeStats.totalPending)} pending` : undefined} />
              <StatCard label="Total Challans"      value={challans.length || '—'}  color="border-blue-500"   />
            </div>
          </>
        )}

        {tab === 'students' && (
          <>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Student Records</h2>
            {/* Search bar */}
            <form onSubmit={handleSearch} className="flex gap-3 mb-6 flex-wrap">
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, reg no, or email…"
                className="flex-1 min-w-48 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500">
                <option value="">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
                <option value="suspended">Suspended</option>
              </select>
              <button type="submit" className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-sm hover:opacity-90">Search</button>
            </form>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {loading ? (
                <div className="p-12 text-center"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p className="text-gray-400 text-sm">Loading…</p></div>
              ) : students.length === 0 ? (
                <div className="p-16 text-center"><p className="text-4xl mb-3">🎓</p><p className="text-gray-500">No students found.</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {['Reg No','Name','Email','Phone','Dept / Program','Semester','Status','Enrolled'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {students.map(s => (
                        <tr key={s._id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">{s.registrationNo}</td>
                          <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">{s.fullName}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{s.email}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{s.phone || '—'}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{s.department}<br /><span className="text-gray-400">{s.program}</span></td>
                          <td className="px-4 py-3 text-gray-500 text-center">Sem {s.currentSemester}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[s.status] || 'bg-gray-100 text-gray-600'}`}>{s.status}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{new Date(s.createdAt).toLocaleDateString('en-GB')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="px-5 py-3 border-t border-gray-50 bg-gray-50">
                <p className="text-xs text-gray-400">Showing {students.length} student record{students.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </>
        )}
        {/* ── Fee Structure Tab ──────────────────────────────────────────────────── */}
        {tab === 'feeStructure' && (() => {
          const fsTotal = fsForm && fsItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);
          return (
            <>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">Fee Structure</h2>
              <p className="text-gray-500 text-sm mb-6">Define program-wise and semester-wise fee structures.</p>
              {fsMsg.text && <div className={`px-4 py-3 rounded-lg text-sm mb-5 ${fsMsg.type === 'error' ? 'bg-red-50 border-l-4 border-red-500 text-red-700' : 'bg-green-50 border-l-4 border-green-500 text-green-700'}`}>{fsMsg.text}</div>}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Form */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="font-bold text-gray-800 mb-5 text-sm uppercase tracking-wider">{fsEditId ? 'Edit Fee Structure' : 'Create Fee Structure'}</h3>
                  <form onSubmit={handleSaveFS} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className={labelCls}>Program *</label><input value={fsForm.program} onChange={e => setFsForm(p => ({ ...p, program: e.target.value }))} required placeholder="e.g. BS Computer Science" className={inputCls} /></div>
                      <div><label className={labelCls}>Department</label><input value={fsForm.department} onChange={e => setFsForm(p => ({ ...p, department: e.target.value }))} placeholder="e.g. CS" className={inputCls} /></div>
                      <div><label className={labelCls}>Semester *</label>
                        <select value={fsForm.semester} onChange={e => setFsForm(p => ({ ...p, semester: e.target.value }))} required className={inputCls}>
                          <option value="">Select…</option>
                          {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={`Semester ${n}`}>Semester {n}</option>)}
                          <option value="Annual">Annual</option>
                        </select>
                      </div>
                      <div><label className={labelCls}>Session</label><input value={fsForm.academicSession} onChange={e => setFsForm(p => ({ ...p, academicSession: e.target.value }))} placeholder="e.g. Fall 2024" className={inputCls} /></div>
                      <div><label className={labelCls}>Due Date</label><input type="date" value={fsForm.dueDate} onChange={e => setFsForm(p => ({ ...p, dueDate: e.target.value }))} className={inputCls} /></div>
                      <div><label className={labelCls}>Late Fee / Day (Rs.)</label><input type="number" min="0" value={fsForm.lateFeePerDay} onChange={e => setFsForm(p => ({ ...p, lateFeePerDay: e.target.value }))} className={inputCls} /></div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2"><label className={labelCls + ' mb-0'}>Fee Items</label><button type="button" onClick={() => setFsItems(p => [...p, { ...EMPTY_FS_ITEM }])} className="text-xs text-emerald-600 font-bold hover:underline">+ Add Item</button></div>
                      <div className="space-y-2">
                        {fsItems.map((item, idx) => (
                          <div key={idx} className="flex gap-2">
                            <input value={item.description} onChange={e => setFsItems(p => p.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))} placeholder="Description" className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
                            <input type="number" min="0" value={item.amount} onChange={e => setFsItems(p => p.map((x, i) => i === idx ? { ...x, amount: e.target.value } : x))} placeholder="Amount" className="w-28 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
                            {fsItems.length > 1 && <button type="button" onClick={() => setFsItems(p => p.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 text-lg leading-none px-1">×</button>}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2 text-right">Total: <strong>Rs. {fmt(fsTotal)}</strong></p>
                    </div>
                    <div className="flex gap-3">
                      <button type="submit" disabled={fsSaving} className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-sm hover:opacity-90 disabled:opacity-60">{fsSaving ? 'Saving…' : fsEditId ? 'Update Structure' : 'Create Structure'}</button>
                      {fsEditId && <button type="button" onClick={() => { setFsEditId(null); setFsForm(EMPTY_FS); setFsItems([{ ...EMPTY_FS_ITEM }]); setFsMsg({ type: '', text: '' }); }} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>}
                    </div>
                  </form>
                </div>

                {/* List */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-50"><h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Existing Structures ({feeStructures.length})</h3></div>
                  {fsLoading ? <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" /></div> : feeStructures.length === 0 ? (
                    <div className="p-12 text-center"><p className="text-3xl mb-2">📋</p><p className="text-gray-400 text-sm">No fee structures yet.</p></div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {feeStructures.map(s => (
                        <div key={s._id} className="px-6 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-bold text-gray-800 text-sm">{s.program}</p>
                              <p className="text-gray-500 text-xs mt-0.5">{s.semester}{s.academicSession ? ` · ${s.academicSession}` : ''}{s.department ? ` · ${s.department}` : ''}</p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {s.feeItems.map((it, i) => <span key={i} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{it.description}: Rs.{fmt(it.amount)}</span>)}
                              </div>
                              <p className="text-emerald-700 font-bold text-sm mt-2">Total: Rs. {fmt(s.totalAmount)}</p>
                              {s.dueDate && <p className="text-xs text-gray-400">Due: {new Date(s.dueDate).toLocaleDateString('en-GB')}{s.lateFeePerDay > 0 ? ` · Late fee Rs.${s.lateFeePerDay}/day` : ''}</p>}
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <button onClick={() => startEditFS(s)} className="text-xs text-emerald-600 font-bold px-3 py-1.5 border border-emerald-200 rounded-lg hover:bg-emerald-50">Edit</button>
                              <button onClick={() => handleDeleteFS(s._id)} className="text-xs text-red-500 font-bold px-3 py-1.5 border border-red-100 rounded-lg hover:bg-red-50">Delete</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          );
        })()}

        {/* ── Fee Records Tab ──────────────────────────────────────────────────── */}
        {tab === 'feeRecords' && (
          <>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Fee Records</h2>
            <p className="text-gray-500 text-sm mb-6">View and update student payment status.</p>
            <form onSubmit={handleFrSearch} className="flex gap-3 mb-6 flex-wrap">
              <input value={frSearch} onChange={e => setFrSearch(e.target.value)} placeholder="Search name or reg no…" className="flex-1 min-w-48 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500" />
              <select value={frStatus} onChange={e => setFrStatus(e.target.value)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500">
                <option value="">All Status</option>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="waived">Waived</option>
              </select>
              <select value={frSemFilter} onChange={e => setFrSemFilter(e.target.value)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500">
                <option value="">All Semesters</option>
                {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={`Semester ${n}`}>Semester {n}</option>)}
              </select>
              <button type="submit" className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-sm hover:opacity-90">Search</button>
            </form>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {frLoading ? <div className="p-12 text-center"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" /></div> : feeRecords.length === 0 ? (
                <div className="p-16 text-center"><p className="text-4xl mb-3">🧾</p><p className="text-gray-500">No fee records found.</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>{['Reg No','Name','Program','Semester','Total','Paid','Status','Due Date','Action'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {feeRecords.map(r => (
                        <tr key={r._id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">{r.registrationNo}</td>
                          <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">{r.studentName}<br /><span className="text-xs text-gray-400 font-normal">{r.fatherName}</span></td>
                          <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{r.program}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{r.semester}</td>
                          <td className="px-4 py-3 text-gray-800 font-semibold whitespace-nowrap">Rs. {fmt(r.totalAmount)}</td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">Rs. {fmt(r.paidAmount)}</td>
                          <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${FEE_BADGE[r.status] || 'bg-gray-100 text-gray-600'}`}>{r.status}</span></td>
                          <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{r.dueDate ? new Date(r.dueDate).toLocaleDateString('en-GB') : '—'}</td>
                          <td className="px-4 py-3"><button onClick={() => openFrUpdate(r)} className="text-xs text-emerald-600 font-bold px-3 py-1.5 border border-emerald-200 rounded-lg hover:bg-emerald-50 whitespace-nowrap">Update</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Update modal */}
            {frUpdateId && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                  <h3 className="font-bold text-gray-800 mb-5 text-lg">Update Payment Status</h3>
                  <form onSubmit={handleUpdateFR} className="space-y-4">
                    <div><label className={labelCls}>Payment Status</label>
                      <select value={frUpdateForm.status} onChange={e => setFrUpdateForm(p => ({ ...p, status: e.target.value }))} className={inputCls}>
                        <option value="unpaid">Unpaid</option>
                        <option value="partial">Partial</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                        <option value="waived">Waived</option>
                      </select>
                    </div>
                    <div><label className={labelCls}>Amount Paid (Rs.)</label><input type="number" min="0" value={frUpdateForm.paidAmount} onChange={e => setFrUpdateForm(p => ({ ...p, paidAmount: e.target.value }))} className={inputCls} /></div>
                    <div><label className={labelCls}>Payment Method</label><input value={frUpdateForm.paymentMethod} onChange={e => setFrUpdateForm(p => ({ ...p, paymentMethod: e.target.value }))} placeholder="e.g. Bank Deposit, HBL" className={inputCls} /></div>
                    <div><label className={labelCls}>Transaction / Deposit Slip No.</label><input value={frUpdateForm.transactionRef} onChange={e => setFrUpdateForm(p => ({ ...p, transactionRef: e.target.value }))} placeholder="Reference number" className={inputCls} /></div>
                    <div><label className={labelCls}>Remarks</label><input value={frUpdateForm.remarks} onChange={e => setFrUpdateForm(p => ({ ...p, remarks: e.target.value }))} placeholder="Optional remarks" className={inputCls} /></div>
                    <div className="flex gap-3 pt-2">
                      <button type="submit" disabled={frUpdating} className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-sm hover:opacity-90 disabled:opacity-60">{frUpdating ? 'Saving…' : 'Save Changes'}</button>
                      <button type="button" onClick={() => setFrUpdateId(null)} className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Challans Tab ─────────────────────────────────────────────────────── */}
        {tab === 'challans' && (() => {
          if (chnView === 'print' && chnSelected) {
            const ch = chnSelected;
            const S = {
              col: { border: '2px solid #041476', borderRadius: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontSize: 11 },
              hdr: { background: '#041476', color: '#fff', padding: '12px 12px', display: 'flex', alignItems: 'center', gap: 10 },
              logo: { width: 60, height: 60, objectFit: 'contain', background: '#fff', borderRadius: '50%', padding: 3, flexShrink: 0 },
              uname: { fontWeight: 'bold', fontSize: 13, letterSpacing: 0.3, lineHeight: 1.3 },
              usub: { fontSize: 10, opacity: 0.85, marginTop: 2 },
              umotto: { fontSize: 9.5, opacity: 0.65, marginTop: 2, fontStyle: 'italic' },
              badge: { background: '#FA7902', color: '#fff', fontSize: 10, fontWeight: 'bold', padding: '3px 10px', borderRadius: 12, marginBottom: 5, display: 'inline-block' },
              cno: { fontSize: 12, fontWeight: 'bold', fontFamily: 'monospace' },
              infoBox: { padding: '10px 12px', borderBottom: '1px solid #e5e7eb' },
              infoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6, marginBottom: 5 },
              infoLbl: { color: '#777', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.4, flexShrink: 0 },
              infoVal: { fontWeight: 700, fontSize: 11, textAlign: 'right', wordBreak: 'break-word', maxWidth: '62%' },
              tbl: { width: '100%', borderCollapse: 'collapse', fontSize: 11 },
              th: { border: '1px solid #d1d5db', padding: '6px 8px', background: '#f3f4f6', fontWeight: 'bold', fontSize: 10.5 },
              td: { border: '1px solid #d1d5db', padding: '6px 8px' },
              totalRow: { background: '#041476', color: '#fff' },
              totalTd: { border: '1px solid #041476', padding: '7px 8px', fontWeight: 'bold', fontSize: 12 },
              bankBox: { padding: '10px 12px', fontSize: 11 },
              instrBox: { padding: '8px 12px', background: '#f0fdf4', borderTop: '1px solid #bbf7d0', fontSize: 10, color: '#166534', lineHeight: 1.5 },
              footer: { padding: '5px 12px', textAlign: 'center', fontSize: 9, color: '#9ca3af', borderTop: '1px solid #f3f4f6' },
            };
            const ChallanCopy = ({ label }) => (
              <div style={S.col}>
                {/* Header */}
                <div style={S.hdr}>
                  <img src="/logo.png.webp" alt="UoMP" style={S.logo} />
                  <div style={{ flex: 1 }}>
                    <div style={S.uname}>UNIVERSITY OF MAKRAN</div>
                    <div style={S.usub}>Finance Section — Fee Challan</div>
                    <div style={S.umotto}>Enquire · Envision · Empower · Panjgur</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={S.badge}>{label}</span>
                    <div style={S.cno}>{ch.challanNo}</div>
                  </div>
                </div>
                {/* Student Info */}
                <div style={S.infoBox}>
                  {[
                    ['Student', ch.studentName],
                    ["Father's", ch.fatherName || '—'],
                    ['Reg No.', ch.registrationNo],
                    ['Program', ch.program],
                    ['Dept.', ch.department || '—'],
                    ['Semester', ch.semester],
                    ['Session', ch.academicSession || '—'],
                    ['Issued', new Date(ch.issuedAt).toLocaleDateString('en-GB')],
                  ].map(([k, v]) => (
                    <div key={k} style={S.infoRow}>
                      <span style={S.infoLbl}>{k}</span>
                      <strong style={S.infoVal}>{v}</strong>
                    </div>
                  ))}
                </div>
                {/* Fee Table */}
                <table style={S.tbl}>
                  <thead>
                    <tr>
                      <th style={{ ...S.th, textAlign: 'left' }}>Description</th>
                      <th style={{ ...S.th, textAlign: 'right' }}>Rs.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ch.feeItems.map((it, i) => (
                      <tr key={i}>
                        <td style={S.td}>{it.description}</td>
                        <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(it.amount)}</td>
                      </tr>
                    ))}
                    <tr style={S.totalRow}>
                      <td style={{ ...S.totalTd, borderRight: '1px solid #041476' }}>TOTAL PAYABLE</td>
                      <td style={{ ...S.totalTd, textAlign: 'right', fontFamily: 'monospace', borderLeft: '1px solid #041476' }}>Rs. {fmt(ch.totalAmount)}</td>
                    </tr>
                  </tbody>
                </table>
                {/* Bank Info */}
                <div style={S.bankBox}>
                  {[
                    ['Due Date', ch.dueDate ? new Date(ch.dueDate).toLocaleDateString('en-GB') : 'N/A'],
                    ['Late Fee', ch.lateFeePerDay > 0 ? `Rs. ${ch.lateFeePerDay}/day` : 'None'],
                    ['Bank', ch.bankName],
                    ['Account', ch.bankAccount],
                    ['Branch', ch.bankBranch],
                  ].map(([k, v]) => (
                    <div key={k} style={S.infoRow}>
                      <span style={S.infoLbl}>{k}</span>
                      <strong style={{ ...S.infoVal, fontFamily: k === 'Account' ? 'monospace' : 'inherit', fontSize: k === 'Account' ? 7.5 : 8.5 }}>{v}</strong>
                    </div>
                  ))}
                </div>
                {/* Instructions */}
                <div style={S.instrBox}>
                  <strong>Note: </strong>{ch.paymentInstructions}
                </div>
                {/* Footer */}
                <div style={S.footer}>Computer-generated challan · University of Makran, Panjgur, Balochistan</div>
              </div>
            );
            const cutLine = (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 18, flexShrink: 0 }}>
                <div style={{ borderLeft: '2px dashed #bbb', height: '100%', position: 'relative', width: 0 }}>
                  <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) rotate(90deg)', whiteSpace: 'nowrap', fontSize: 7, color: '#aaa', background: '#fff', padding: '0 3px' }}>✂ CUT</span>
                </div>
              </div>
            );
            return (
              <div>
                <style>{`
                  @media print {
                    @page { size: A4 landscape; margin: 6mm; }
                    html, body { height: auto !important; overflow: visible !important; }
                    body * { visibility: hidden !important; }
                    #challan-print-area, #challan-print-area * { visibility: visible !important; }
                    #challan-print-area { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: auto !important; padding: 0 !important; margin: 0 !important; box-sizing: border-box !important; }
                    .no-print { display: none !important; }
                  }
                `}</style>
                <div className="no-print flex items-center gap-3 mb-6">
                  <button onClick={() => setChnView('list')} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-medium">← Back to Challans</button>
                  <button onClick={() => window.print()} className="ml-auto px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-sm hover:opacity-90">🖨 Print / Save PDF</button>
                  {ch.status === 'generated' && <button onClick={() => handleChallanAction(ch._id, 'paid')} disabled={chnActing[ch._id]} className="px-6 py-2.5 bg-green-500 text-white font-bold rounded-xl text-sm hover:opacity-90 disabled:opacity-60">Mark as Paid</button>}
                </div>
                {/* Screen preview wrapper */}
                <div style={{ overflowX: 'auto' }}>
                  <div id="challan-print-area" style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', gap: 0, minWidth: 900, padding: 16, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                    <div style={{ flex: 1 }}><ChallanCopy label="STUDENT COPY" /></div>
                    {cutLine}
                    <div style={{ flex: 1 }}><ChallanCopy label="BANK COPY" /></div>
                    {cutLine}
                    <div style={{ flex: 1 }}><ChallanCopy label="UNIVERSITY COPY" /></div>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">Fee Challans</h2>
              <p className="text-gray-500 text-sm mb-6">Generate and manage student fee challans.</p>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Generate form */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="font-bold text-gray-800 mb-5 text-sm uppercase tracking-wider">Generate New Challan</h3>
                  {chnGenMsg.text && <div className={`px-4 py-3 rounded-lg text-sm mb-4 ${chnGenMsg.type === 'error' ? 'bg-red-50 border-l-4 border-red-500 text-red-700' : 'bg-green-50 border-l-4 border-green-500 text-green-700'}`}>{chnGenMsg.text}</div>}
                  <form onSubmit={handleGenerateChallan} className="space-y-4">
                    {/* Student search */}
                    <div>
                      <label className={labelCls}>Search & Select Student *</label>
                      <div className="flex gap-2 mb-2">
                        <input value={chnGenSearch} onChange={e => setChnGenSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchChallanStudents())} placeholder="Name or reg no…" className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
                        <button type="button" onClick={searchChallanStudents} disabled={chnGenSearching} className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:opacity-90 disabled:opacity-60">{chnGenSearching ? '…' : 'Find'}</button>
                      </div>
                      {chnGenStudents.length > 0 && (
                        <div className="border border-gray-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                          {chnGenStudents.map(s => (
                            <button key={s._id} type="button" onClick={() => { setChnGenForm(p => ({ ...p, studentId: s._id })); setChnGenStudents([]); setChnGenSearch(`${s.fullName} (${s.registrationNo})`); }}
                              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-emerald-50 transition-colors border-b border-gray-50 last:border-0 ${chnGenForm.studentId === s._id ? 'bg-emerald-50 font-bold' : ''}`}>
                              <span className="font-semibold">{s.fullName}</span> · <span className="font-mono text-xs text-gray-500">{s.registrationNo}</span>
                              <br /><span className="text-xs text-gray-400">{s.program} · Sem {s.currentSemester}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {!chnGenStudents.length && chnGenSearch && !chnGenSearching && !chnGenForm.studentId && <p className="text-xs text-gray-400 mt-1">Click Find to search students.</p>}
                    </div>

                    {/* Fee Structure */}
                    <div>
                      <label className={labelCls}>Fee Structure (optional)</label>
                      <select value={chnGenForm.feeStructureId} onChange={e => onSelectFS(e.target.value)} className={inputCls}>
                        <option value="">Manual entry below</option>
                        {feeStructures.map(f => <option key={f._id} value={f._id}>{f.program} · {f.semester}{f.academicSession ? ` · ${f.academicSession}` : ''} — Rs.{fmt(f.totalAmount)}</option>)}
                      </select>
                    </div>

                    {/* Manual fee items (shown when no structure selected) */}
                    {!chnGenForm.feeStructureId && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className={labelCls + ' mb-0'}>Fee Items *</label>
                          <button type="button" onClick={() => setChnGenItems(p => [...p, { ...EMPTY_FS_ITEM }])} className="text-xs text-emerald-600 font-bold hover:underline">+ Add Item</button>
                        </div>
                        {chnGenItems.map((item, idx) => (
                          <div key={idx} className="flex gap-2 mb-2">
                            <input value={item.description} onChange={e => setChnGenItems(p => p.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))} placeholder="Description" className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
                            <input type="number" min="0" value={item.amount} onChange={e => setChnGenItems(p => p.map((x, i) => i === idx ? { ...x, amount: e.target.value } : x))} placeholder="Amount" className="w-28 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
                            {chnGenItems.length > 1 && <button type="button" onClick={() => setChnGenItems(p => p.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 text-lg px-1">×</button>}
                          </div>
                        ))}
                        {chnGenItems.length > 0 && <p className="text-xs text-gray-500 text-right">Total: Rs. {fmt(chnGenItems.reduce((s, i) => s + (Number(i.amount)||0), 0))}</p>}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className={labelCls}>Due Date</label><input type="date" value={chnGenForm.dueDate} onChange={e => setChnGenForm(p => ({ ...p, dueDate: e.target.value }))} className={inputCls} /></div>
                      <div><label className={labelCls}>Late Fee/Day (Rs.)</label><input type="number" min="0" value={chnGenForm.lateFeePerDay} onChange={e => setChnGenForm(p => ({ ...p, lateFeePerDay: e.target.value }))} className={inputCls} /></div>
                      <div><label className={labelCls}>Session</label><input value={chnGenForm.academicSession} onChange={e => setChnGenForm(p => ({ ...p, academicSession: e.target.value }))} placeholder="Fall 2024" className={inputCls} /></div>
                    </div>
                    <details className="group">
                      <summary className="text-xs text-emerald-600 font-bold cursor-pointer hover:underline">Bank Details (click to expand)</summary>
                      <div className="grid grid-cols-1 gap-3 mt-3">
                        <div><label className={labelCls}>Bank Name</label><input value={chnGenForm.bankName} onChange={e => setChnGenForm(p => ({ ...p, bankName: e.target.value }))} className={inputCls} /></div>
                        <div><label className={labelCls}>Account No.</label><input value={chnGenForm.bankAccount} onChange={e => setChnGenForm(p => ({ ...p, bankAccount: e.target.value }))} className={inputCls} /></div>
                        <div><label className={labelCls}>Branch</label><input value={chnGenForm.bankBranch} onChange={e => setChnGenForm(p => ({ ...p, bankBranch: e.target.value }))} className={inputCls} /></div>
                        <div><label className={labelCls}>Payment Instructions</label><textarea rows={3} value={chnGenForm.paymentInstructions} onChange={e => setChnGenForm(p => ({ ...p, paymentInstructions: e.target.value }))} className={inputCls.replace('py-2.5','py-2') + ' resize-none'} /></div>
                      </div>
                    </details>
                    <button type="submit" disabled={chnGenerating} className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-sm hover:opacity-90 disabled:opacity-60">{chnGenerating ? 'Generating…' : 'Generate Challan'}</button>
                  </form>
                </div>

                {/* Challan list */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="px-5 py-4 border-b border-gray-50">
                    <form onSubmit={handleChnSearch} className="flex gap-2">
                      <input value={chnSearch} onChange={e => setChnSearch(e.target.value)} placeholder="Search challan no, name, reg no…" className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-200" />
                      <select value={chnStatus} onChange={e => setChnStatus(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200">
                        <option value="">All</option>
                        <option value="generated">Generated</option>
                        <option value="paid">Paid</option>
                        <option value="expired">Expired</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <button type="submit" className="px-3 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:opacity-90">Go</button>
                    </form>
                  </div>
                  {chnLoading ? <div className="p-8 text-center flex-1"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
                  : challans.length === 0 ? <div className="p-12 text-center flex-1"><p className="text-3xl mb-2">🧾</p><p className="text-gray-400 text-sm">No challans yet.</p></div>
                  : (
                    <div className="divide-y divide-gray-50 overflow-y-auto max-h-[70vh]">
                      {challans.map(ch => (
                        <div key={ch._id} className="px-5 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-bold text-emerald-700">{ch.challanNo}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${FEE_BADGE[ch.status] || 'bg-gray-100 text-gray-600'}`}>{ch.status}</span>
                              </div>
                              <p className="font-semibold text-gray-800 text-sm mt-0.5">{ch.studentName}</p>
                              <p className="text-xs text-gray-400">{ch.registrationNo} · {ch.program} · {ch.semester}</p>
                              <p className="text-emerald-700 font-bold text-sm mt-1">Rs. {fmt(ch.totalAmount)}{ch.dueDate ? ` · Due: ${new Date(ch.dueDate).toLocaleDateString('en-GB')}` : ''}</p>
                            </div>
                            <div className="flex flex-col gap-1.5 shrink-0">
                              <button onClick={() => { setChnSelected(ch); setChnView('print'); }} className="text-xs text-emerald-600 font-bold px-3 py-1.5 border border-emerald-200 rounded-lg hover:bg-emerald-50 whitespace-nowrap">Print</button>
                              {ch.status === 'generated' && (
                                <button onClick={() => handleChallanAction(ch._id, 'paid')} disabled={chnActing[ch._id]} className="text-xs text-green-700 font-bold px-3 py-1.5 border border-green-200 rounded-lg hover:bg-green-50 whitespace-nowrap disabled:opacity-50">Mark Paid</button>
                              )}
                              {ch.status === 'generated' && (
                                <button onClick={() => handleChallanAction(ch._id, 'expired')} disabled={chnActing[ch._id]} className="text-xs text-orange-600 font-bold px-3 py-1.5 border border-orange-200 rounded-lg hover:bg-orange-50 whitespace-nowrap disabled:opacity-50">Expire</button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          );
        })()}

      </main>
    </div>
  );
}
