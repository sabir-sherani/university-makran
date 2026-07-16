import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Header from '../../components/Header.js';
import Footer from '../../components/Footer.js';
import HeroSection from '../../components/HeroSection.js';
import axios from 'axios';
import { useRouter } from 'next/router';

const API = process.env.NEXT_PUBLIC_API_URL; // e.g. http://localhost:5000/api
const BASE_URL = API ? API.replace(/\/api$/, '') : '';
const fileUrl = (u) => u?.startsWith('http') ? u : `${BASE_URL}${u}`;



const inputCls = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary text-sm';
const labelCls = 'block text-gray-700 font-semibold mb-1 text-sm';

function Alert({ type, message }) {
  if (!message) return null;
  const colors = type === 'error'
    ? 'bg-red-50 border-red-400 text-red-700'
    : 'bg-green-50 border-green-400 text-green-700';
  return (
    <div className={`border-l-4 px-4 py-3 rounded text-sm mb-4 ${colors}`}>
      {message}
    </div>
  );
}

export default function StudentPortal() {
  const router = useRouter();
  const [tab, setTab] = useState('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [student, setStudent] = useState(null);
  const [token, setToken] = useState(null);
  const [activeSection, setActiveSection] = useState('profile');

  const [loginData, setLoginData] = useState({ registrationNo: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPw, setShowLoginPw] = useState(false);

  // Forgot password
  const [showForgotPw, setShowForgotPw]       = useState(false);
  const [forgotEmail, setForgotEmail]         = useState('');
  const [forgotLoading, setForgotLoading]     = useState(false);
  const [forgotMsg, setForgotMsg]             = useState({ type: '', text: '' });
  const [showRegPw, setShowRegPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const [regData, setRegData] = useState({
    registrationNo: '', fullName: '', email: '', phone: '', cnic: '',
    fatherName: '', gender: '', dateOfBirth: '', address: '', timeSession: '',
    department: '', program: '', session: '', currentSemester: '1',
    rollNo: '',
    password: '', confirmPassword: '',
  });
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  const [datesheets, setDatesheets] = useState([]);
  const [results, setResults] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [deptNotices, setDeptNotices]   = useState([]);
  const [noticesLoading, setNoticesLoading] = useState(false);

  // Result Cards (structured result sheets)
  const [resultCards, setResultCards]         = useState([]);
  const [rcLoading, setRcLoading]             = useState(false);
  const [rcView, setRcView]                   = useState('list');   // 'list' | 'card' | 'transcript'
  const [rcSelected, setRcSelected]           = useState(null);
  const [rcSemFilter, setRcSemFilter]         = useState('');
  const [transcriptSem, setTranscriptSem]     = useState('');

  // Fee Challans
  const [challans, setChallans]       = useState([]);
  const [chnLoading, setChnLoading]   = useState(false);
  const [chnSelected, setChnSelected] = useState(null);
  const [chnView, setChnView]         = useState('list');

  // Assignments
  const [assignments, setAssignments] = useState([]);
  const [submittingId, setSubmittingId] = useState(null);
  const [subForm, setSubForm] = useState({ note: '' });
  const [subFile, setSubFile] = useState(null);
  const [subError, setSubError] = useState('');
  const [subSuccess, setSubSuccess] = useState('');
  const [subLoading, setSubLoading] = useState(false);

  // Ongoing Classes
  const [ocClasses, setOcClasses] = useState([]);
  const [ocLoading, setOcLoading] = useState(false);

  // Edit profile
  const [deptList, setDeptList] = useState([]);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editData, setEditData] = useState({});
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('studentToken');
    if (savedToken) {
      setToken(savedToken);
      // Always fetch fresh profile so changes like semester advancement reflect immediately
      axios.get(`${API}/portal/student/profile`, { headers: { Authorization: `Bearer ${savedToken}` } })
        .then(r => {
          setStudent(r.data);
          localStorage.setItem('studentData', JSON.stringify(r.data));
          setIsLoggedIn(true);
        })
        .catch(() => {
          // Token may be expired — fall back to cached data if available
          const savedStudent = localStorage.getItem('studentData');
          if (savedStudent) {
            setStudent(JSON.parse(savedStudent));
            setIsLoggedIn(true);
          } else {
            localStorage.removeItem('studentToken');
          }
        });
    }
    axios.get(`${API}/departments`).then(r => setDeptList(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (router.query.tab === 'register') setTab('register');
  }, [router.query.tab]);

  useEffect(() => {
    if (isLoggedIn && token) {
      if (activeSection === 'datesheets') fetchDatesheets();
      if (activeSection === 'results') fetchResults();
      if (activeSection === 'assignments') fetchAssignments();
      if (activeSection === 'resultCards') { fetchResultCards(); setRcView('list'); }
      if (activeSection === 'challans') { fetchChallans(); setChnView('list'); }
      if (activeSection === 'ongoingClasses') fetchOngoingClasses();
      if (activeSection === 'deptNotices') fetchDeptNotices();
    }
  }, [activeSection, isLoggedIn]);

  const authHeaders = () => ({ headers: { Authorization: `Bearer ${token}` } });

  const fetchDeptNotices = async () => {
    setNoticesLoading(true);
    try {
      const { data } = await axios.get(`${API}/portal/student/dept-notices`, authHeaders());
      setDeptNotices(data || []);
    } catch { setDeptNotices([]); }
    setNoticesLoading(false);
  };

  const fetchDatesheets = async () => {
    setDataLoading(true);
    try {
      const res = await axios.get(`${API}/portal/student/datesheets`, authHeaders());
      setDatesheets(res.data);
    } catch { setDatesheets([]); }
    setDataLoading(false);
  };

  const fetchOngoingClasses = async () => {
    setOcLoading(true);
    try {
      const res = await axios.get(`${API}/portal/student/ongoing-classes`, authHeaders());
      setOcClasses(res.data);
    } catch { setOcClasses([]); }
    setOcLoading(false);
  };

  const fetchResults = async () => {
    setDataLoading(true);
    try {
      const res = await axios.get(`${API}/portal/student/results`, authHeaders());
      setResults(res.data);
    } catch { setResults([]); }
    setDataLoading(false);
  };

  const fetchResultCards = async () => {
    setRcLoading(true);
    try {
      const res = await axios.get(`${API}/portal/student/result-sheets`, authHeaders());
      setResultCards(res.data || []);
    } catch { setResultCards([]); }
    setRcLoading(false);
  };

  const fetchChallans = async () => {
    setChnLoading(true);
    try {
      const res = await axios.get(`${API}/portal/student/challans`, authHeaders());
      setChallans(res.data || []);
    } catch { setChallans([]); }
    setChnLoading(false);
  };

  const fetchAssignments = async () => {
    setDataLoading(true);
    try {
      const res = await axios.get(`${API}/portal/student/assignments`, authHeaders());
      setAssignments(res.data);
    } catch { setAssignments([]); }
    setDataLoading(false);
  };

  const handleSubmitAssignment = async (assignmentId) => {
    const assignment = assignments.find(a => a._id === assignmentId);
    if (assignment?.dueDate && new Date(assignment.dueDate) < new Date()) {
      setSubError('Submission deadline has passed. You can no longer submit this assignment.');
      return;
    }
    setSubError(''); setSubSuccess(''); setSubLoading(true);
    try {
      const fd = new FormData();
      fd.append('note', subForm.note);
      if (subFile) fd.append('file', subFile);
      await axios.post(`${API}/portal/student/assignments/${assignmentId}/submit`, fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      setSubSuccess('Submitted successfully!');
      setSubForm({ note: '' }); setSubFile(null);
      await fetchAssignments();
      setTimeout(() => { setSubmittingId(null); setSubSuccess(''); }, 1800);
    } catch (err) { setSubError(err.response?.data?.message || 'Submission failed.'); }
    setSubLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await axios.post(`${API}/portal/student/login`, loginData);
      const { token: t, student: s } = res.data;
      localStorage.setItem('studentToken', t);
      localStorage.setItem('studentData', JSON.stringify(s));
      setToken(t);
      setStudent(s);
      setIsLoggedIn(true);
    } catch (err) {
      setLoginError(err.response?.data?.message || 'Login failed. Please try again.');
    }
    setLoginLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true); setForgotMsg({ type: '', text: '' });
    try {
      const { data } = await axios.post(`${API}/portal/student/forgot-password`, { email: forgotEmail });
      setForgotMsg({ type: 'success', text: data.message });
      setForgotEmail('');
    } catch (err) {
      setForgotMsg({ type: 'error', text: err.response?.data?.message || 'Something went wrong. Please try again.' });
    }
    setForgotLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');
    if (regData.password !== regData.confirmPassword) {
      return setRegError('Passwords do not match.');
    }
    if (regData.password.length < 8) {
      return setRegError('Password must be at least 8 characters.');
    }
    setRegLoading(true);
    try {
      const { confirmPassword, ...payload } = regData;
      await axios.post(`${API}/portal/student/register`, payload);
      setRegSuccess('Registration submitted successfully! Your account is pending admin approval. You will be notified once approved.');
      setRegData({
        registrationNo: '', fullName: '', email: '', phone: '', cnic: '',
        fatherName: '', gender: '', dateOfBirth: '', address: '', timeSession: '',
        department: '', program: '', session: '', currentSemester: '1',
        rollNo: '',
        password: '', confirmPassword: '',
      });
    } catch (err) {
      setRegError(err.response?.data?.message || 'Registration failed. Please try again.');
    }
    setRegLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('studentToken');
    localStorage.removeItem('studentData');
    setIsLoggedIn(false);
    setStudent(null);
    setToken(null);
    setActiveSection('profile');
    setDatesheets([]);
    setResults([]);
  };

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

  const startEditProfile = () => {
    setEditData({
      fullName: student.fullName || '',
      email: student.email || '',
      phone: student.phone || '',
      cnic: student.cnic || '',
      fatherName: student.fatherName || '',
      gender: student.gender || '',
      dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : '',
      address: student.address || '',
      timeSession: student.timeSession || '',
      rollNo: student.rollNo || '',
    });
    setEditError('');
    setEditSuccess('');
    setIsEditingProfile(true);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');
    setEditLoading(true);
    try {
      const res = await axios.patch(`${API}/portal/student/profile`, editData, authHeaders());
      const updatedStudent = res.data.student;
      setStudent(updatedStudent);
      localStorage.setItem('studentData', JSON.stringify(updatedStudent));
      setEditSuccess('Profile updated successfully!');
      setTimeout(() => { setIsEditingProfile(false); setEditSuccess(''); }, 1500);
    } catch (err) {
      setEditError(err.response?.data?.message || 'Update failed. Please try again.');
    }
    setEditLoading(false);
  };

  if (isLoggedIn && student) {
    return (
      <>
        <Head><title>Student Portal - University of Makran</title></Head>
        {/* Banner */}
        <div className="relative bg-gradient-to-r from-[#041476] via-blue-700 to-blue-500 text-white overflow-hidden shadow-xl">
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-white opacity-5 rounded-full" />
          <div className="absolute -bottom-16 left-1/2 w-80 h-80 bg-white opacity-5 rounded-full" />
          <div className="absolute top-6 right-1/3 w-24 h-24 bg-white opacity-5 rounded-full" />
          <div className="absolute bottom-2 left-16 w-16 h-16 bg-white opacity-5 rounded-full" />
          <div className="relative px-8 py-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-2">University of Makran, Panjgur</p>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-1.5">🎓 Student Portal</h1>
              <p className="text-blue-200 text-sm">
                Welcome back, <span className="text-white font-semibold">{student.fullName}</span>
                {' '}· Semester {student.currentSemester} · {student.program}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-blue-100 text-xs font-medium mb-0.5">{student.registrationNo}</p>
              <p className="text-blue-100 text-xs mb-3">{student.department}</p>
              <button onClick={handleLogout} className="bg-white text-primary px-5 py-2 rounded-lg font-semibold text-sm hover:bg-blue-50 transition shadow">
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-100 min-h-screen flex overflow-hidden">
          {/* Mobile overlay */}
          {sidebarOpen && (
            <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
          )}

          {/* Sidebar */}
          <aside className={`fixed inset-y-0 left-0 z-40 w-60 bg-white shadow-md flex flex-col py-6 transition-transform duration-300 lg:relative lg:z-auto lg:translate-x-0 lg:flex-shrink-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="px-4 mb-6">
              <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-2">
                {student.fullName?.charAt(0)}
              </div>
              <p className="text-center text-sm font-semibold text-gray-800">{student.fullName}</p>
              <p className="text-center text-xs text-gray-500">{student.program} — Sem {student.currentSemester}</p>
            </div>
            <nav className="flex flex-col">
              {[
                { id: 'profile', label: '👤 Profile' },
                { id: 'deptNotices', label: '📢 Dept Notices' },
                { id: 'ongoingClasses', label: '📚 My Subjects' },
                { id: 'datesheets', label: '📅 Date Sheets' },
                { id: 'results', label: '📊 Results' },
                { id: 'resultCards', label: '🎓 Result Cards' },
                { id: 'challans',    label: '💳 Fee & Challans' },
                { id: 'assignments', label: '📝 Assignments' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setActiveSection(item.id); setSidebarOpen(false); }}
                  className={`text-left px-6 py-3 text-sm font-medium transition ${
                    activeSection === item.id
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={handleLogout}
                className="text-left px-6 py-3 text-sm font-medium text-red-600 hover:bg-red-50 mt-auto"
              >
                🚪 Logout
              </button>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-4 lg:p-8 overflow-auto min-w-0">
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
            <h1 className="text-2xl font-bold text-primary mb-6">Dashboard</h1>

            {/* Profile */}
            {activeSection === 'profile' && (
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-primary">My Profile</h2>
                  {!isEditingProfile && (
                    <button onClick={startEditProfile}
                      className="btn btn-primary text-sm px-4 py-2">
                      ✏️ Edit Profile
                    </button>
                  )}
                </div>

                {isEditingProfile ? (
                  /* ── Edit form ── */
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <Alert type="error" message={editError} />
                    <Alert type="success" message={editSuccess} />

                    {/* Read-only academic info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      {[
                        ['Registration No', student.registrationNo],
                        ['Department', student.department],
                        ['Program', student.program],
                        ['Session', student.session],
                        ['Semester', `Semester ${student.currentSemester}`],
                        ['CGPA', student.cgpa != null ? student.cgpa.toFixed(2) : '—'],
                        ['Attendance', student.attendancePercentage != null ? student.attendancePercentage + '%' : '—'],
                        ['Status', student.status],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <p className="text-gray-400 text-xs mb-0.5">{label}</p>
                          <p className="font-semibold text-gray-700">{value}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 -mt-2">Semester, CGPA, and attendance are managed by the university. You can update your roll number below.</p>

                    {/* Editable personal fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Full Name *</label>
                        <input type="text" required value={editData.fullName}
                          onChange={(e) => setEditData({ ...editData, fullName: e.target.value })}
                          className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Email Address *</label>
                        <input type="email" required value={editData.email}
                          onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                          className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Phone Number</label>
                        <input type="text" value={editData.phone}
                          onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                          className={inputCls} placeholder="03XX-XXXXXXX" />
                      </div>
                      <div>
                        <label className={labelCls}>CNIC</label>
                        <input type="text" value={editData.cnic}
                          onChange={(e) => setEditData({ ...editData, cnic: e.target.value })}
                          className={inputCls} placeholder="XXXXX-XXXXXXX-X" />
                      </div>
                      <div>
                        <label className={labelCls}>Father&apos;s Name</label>
                        <input type="text" value={editData.fatherName}
                          onChange={(e) => setEditData({ ...editData, fatherName: e.target.value })}
                          className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Gender</label>
                        <select value={editData.gender}
                          onChange={(e) => setEditData({ ...editData, gender: e.target.value })}
                          className={inputCls}>
                          <option value="">Select gender</option>
                          <option>Male</option>
                          <option>Female</option>
                          <option>Other</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Date of Birth</label>
                        <input type="date" value={editData.dateOfBirth}
                          onChange={(e) => setEditData({ ...editData, dateOfBirth: e.target.value })}
                          className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Time Session</label>
                        <select value={editData.timeSession}
                          onChange={(e) => setEditData({ ...editData, timeSession: e.target.value })}
                          className={inputCls}>
                          <option value="">Select time session</option>
                          <option value="Morning">🌅 Morning</option>
                          <option value="Evening">🌙 Evening</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Roll Number</label>
                        <input type="text" value={editData.rollNo}
                          onChange={(e) => setEditData({ ...editData, rollNo: e.target.value })}
                          className={inputCls} placeholder="Get from your teacher or HOD" />
                        <p className="text-xs text-gray-400 mt-1">Provided by your department after enrollment.</p>
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Address</label>
                      <textarea value={editData.address}
                        onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                        className={inputCls} rows={2} placeholder="Your home address" />
                    </div>

                    <div className="flex gap-3 pt-1">
                      <button type="submit" disabled={editLoading}
                        className="btn btn-primary px-6 py-2">
                        {editLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button type="button"
                        onClick={() => { setIsEditingProfile(false); setEditError(''); setEditSuccess(''); }}
                        className="px-6 py-2 border border-gray-300 rounded-lg font-semibold text-sm text-gray-600 hover:bg-gray-50 transition">
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  /* ── View mode ── */
                  <div className="space-y-5">
                    {/* Academic overview cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Roll Number', value: student.rollNo || 'Not set', icon: '🎫', color: 'bg-indigo-50 border-indigo-200 text-indigo-700', hint: !student.rollNo },
                        { label: 'Current Semester', value: `Semester ${student.currentSemester}`, icon: '📚', color: 'bg-blue-50 border-blue-200 text-blue-700' },
                        { label: 'CGPA', value: student.cgpa != null ? student.cgpa.toFixed(2) + ' / 4.00' : 'N/A', icon: '🏆', color: 'bg-green-50 border-green-200 text-green-700' },
                        { label: 'Attendance', value: student.attendancePercentage != null ? student.attendancePercentage + '%' : 'N/A', icon: '📋', color: student.attendancePercentage != null && student.attendancePercentage < 75 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-orange-50 border-orange-200 text-orange-700' },
                      ].map(({ label, value, icon, color, hint }) => (
                        <div key={label} className={`border rounded-xl p-4 ${color}`}>
                          <p className="text-2xl mb-1">{icon}</p>
                          <p className="text-xs font-medium opacity-70 mb-0.5">{label}</p>
                          <p className="font-bold text-base leading-tight">{value}</p>
                          {hint && <p className="text-xs opacity-60 mt-1">Get it from your teacher or HOD</p>}
                        </div>
                      ))}
                    </div>

                    {/* Full info grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {[
                        ['Registration No', student.registrationNo],
                        ['Full Name', student.fullName],
                        ['Email', student.email],
                        ['Phone', student.phone || '—'],
                        ['CNIC', student.cnic || '—'],
                        ['Father\'s Name', student.fatherName || '—'],
                        ['Gender', student.gender || '—'],
                        ['Date of Birth', student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : '—'],
                        ['Department', student.department],
                        ['Program', student.program],
                        ['Session', student.session],
                        ['Time Session', student.timeSession || '—'],
                        ['Status', student.status],
                        ['Address', student.address || '—'],
                      ].map(([label, value]) => (
                        <div key={label} className="bg-gray-50 rounded-lg p-3">
                          <p className="text-gray-500 text-xs mb-1">{label}</p>
                          <p className="font-semibold text-gray-800">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Department Notices */}
            {activeSection === 'deptNotices' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-primary">Department Notices</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Official notices from your department HOD</p>
                </div>
                {noticesLoading ? (
                  <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400 text-sm">Loading notices…</div>
                ) : deptNotices.length === 0 ? (
                  <div className="bg-white rounded-xl shadow p-10 text-center">
                    <p className="text-4xl mb-3">📭</p>
                    <p className="text-gray-500 font-medium">No notices from your department yet.</p>
                    <p className="text-gray-400 text-sm mt-1">Check back later — your HOD will post updates here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {deptNotices.map(n => {
                      const isUrgent    = n.priority === 'urgent';
                      const isImportant = n.priority === 'important';
                      const cardCls = isUrgent
                        ? 'border-l-4 border-red-500 bg-red-50'
                        : isImportant
                        ? 'border-l-4 border-orange-400 bg-orange-50'
                        : 'border-l-4 border-primary bg-white';
                      const badge = isUrgent
                        ? 'bg-red-100 text-red-700'
                        : isImportant
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-blue-100 text-blue-700';
                      const badgeLabel = isUrgent ? '🔴 Urgent' : isImportant ? '🟠 Important' : '🔵 Normal';
                      return (
                        <div key={n._id} className={`rounded-xl shadow-sm p-5 ${cardCls}`}>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${badge}`}>{badgeLabel}</span>
                            <span className="text-xs text-gray-400">
                              {new Date(n.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            {n.postedByName && (
                              <span className="text-xs text-gray-400">· Posted by {n.postedByName}</span>
                            )}
                          </div>
                          <h3 className="font-bold text-gray-900 text-base leading-snug">{n.title}</h3>
                          {n.body && (
                            <p className="text-sm text-gray-700 mt-2 whitespace-pre-line leading-relaxed">{n.body}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* My Subjects — combined academic overview + live class cards */}
            {activeSection === 'ongoingClasses' && (
              <div className="space-y-5">

                {/* ── Academic Overview Banner ── */}
                <div className="rounded-2xl overflow-hidden shadow-md"
                  style={{ background: 'linear-gradient(135deg, #041476 0%, #0a237a 60%, #1a3a9e 100%)' }}>
                  <div className="px-6 pt-6 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-1">Academic Profile</p>
                        <h2 className="text-white text-2xl font-bold leading-tight">{student.fullName}</h2>
                        <p className="text-blue-200 text-sm mt-0.5">{student.program || '—'}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-blue-300 text-xs">Current Semester</p>
                        <p className="text-white text-3xl font-black">{student.currentSemester || '—'}</p>
                      </div>
                    </div>

                    {/* Info chips */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      {student.department && (
                        <span className="bg-white/15 text-white text-xs font-semibold px-3 py-1 rounded-full">
                          🏛 {student.department}
                        </span>
                      )}
                      {student.session && (
                        <span className="bg-white/15 text-white text-xs font-semibold px-3 py-1 rounded-full">
                          📅 {student.session}
                        </span>
                      )}
                      {student.rollNo && (
                        <span className="bg-white/15 text-white text-xs font-semibold px-3 py-1 rounded-full">
                          🎫 {student.rollNo}
                        </span>
                      )}
                      {student.timeSession && (
                        <span className="bg-white/15 text-white text-xs font-semibold px-3 py-1 rounded-full">
                          {student.timeSession === 'Morning' ? '🌅' : '🌙'} {student.timeSession}
                        </span>
                      )}
                      {student.cgpa != null && (
                        <span className="bg-[#FA7902] text-white text-xs font-bold px-3 py-1 rounded-full">
                          🏆 CGPA {student.cgpa}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats footer */}
                  <div className="grid grid-cols-3 divide-x divide-white/20 bg-white/10 text-center">
                    {[
                      ['Subjects', ocLoading ? '…' : ocClasses.length],
                      ['Program', student.program ? student.program.replace(/^BS\s*/i,'BS ') : '—'],
                      ['Attendance', student.attendancePercentage != null ? `${student.attendancePercentage}%` : '—'],
                    ].map(([label, val]) => (
                      <div key={label} className="py-3 px-2">
                        <p className="text-white font-bold text-lg leading-none">{val}</p>
                        <p className="text-blue-300 text-xs mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Enrolled Courses list (from profile) ── */}
                {student.enrolledCourses?.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <h3 className="font-bold text-gray-700 text-sm mb-3">📋 Registered Course List</h3>
                    <div className="flex flex-wrap gap-2">
                      {student.enrolledCourses.map((course, i) => (
                        <span key={i} className="bg-blue-50 text-primary border border-blue-100 text-xs font-semibold px-3 py-1.5 rounded-full">
                          {course}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Live Subject Cards ── */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-800 text-base">
                      Active Classes
                      {!ocLoading && ocClasses.length > 0 && (
                        <span className="ml-2 bg-primary text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                          {ocClasses.length}
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-gray-400">Matched to your dept · semester · session</p>
                  </div>

                  {ocLoading ? (
                    <div className="flex items-center gap-3 text-gray-400 py-10">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Loading your subjects…
                    </div>
                  ) : ocClasses.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-200 p-10 text-center">
                      <p className="text-4xl mb-3">📭</p>
                      <p className="font-semibold text-gray-600">No active classes yet</p>
                      <p className="text-gray-400 text-sm mt-1 max-w-xs mx-auto">
                        Your teachers haven't added any active classes matching your department and semester. Check back later.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {ocClasses.map((c, idx) => {
                        const palette = [
                          { bg: '#041476', light: '#e8eaf6' },
                          { bg: '#FA7902', light: '#fff3e0' },
                          { bg: '#16a34a', light: '#dcfce7' },
                          { bg: '#7c3aed', light: '#f3e8ff' },
                          { bg: '#0891b2', light: '#e0f7fa' },
                          { bg: '#be185d', light: '#fce7f3' },
                        ];
                        const col = palette[idx % palette.length];
                        return (
                          <div key={c._id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
                            {/* Colored left stripe + header */}
                            <div className="flex">
                              <div className="w-1.5 flex-shrink-0" style={{ background: col.bg }} />
                              <div className="flex-1 p-4">
                                {/* Subject + status */}
                                <div className="flex items-start justify-between gap-2 mb-3">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-gray-900 text-sm leading-snug">{c.subject}</h4>
                                    <p className="text-xs text-gray-400 mt-0.5">{c.className}</p>
                                  </div>
                                  <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-bold"
                                    style={{ background: col.light, color: col.bg }}>
                                    ● Active
                                  </span>
                                </div>

                                {/* Teacher row */}
                                {c.teacherName && (
                                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
                                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                      style={{ background: col.bg }}>
                                      {c.teacherName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Teacher</p>
                                      <p className="text-xs font-semibold text-gray-800">{c.teacherName}</p>
                                    </div>
                                  </div>
                                )}

                                {/* Meta grid */}
                                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-gray-600 mb-3">
                                  {c.semester && <div><span className="text-gray-400">Sem:</span> <span className="font-semibold">{c.semester}</span></div>}
                                  {c.program  && <div><span className="text-gray-400">Prog:</span> <span className="font-semibold">{c.program}</span></div>}
                                  {c.academicSession && <div><span className="text-gray-400">Session:</span> <span className="font-semibold">{c.academicSession}</span></div>}
                                  {(c.room || c.location) && <div><span className="text-gray-400">Room:</span> <span className="font-semibold">{[c.room, c.location].filter(Boolean).join(' · ')}</span></div>}
                                  {c.weeklyHours && <div><span className="text-gray-400">Hrs/wk:</span> <span className="font-semibold">{c.weeklyHours}</span></div>}
                                </div>

                                {/* Schedule chips */}
                                {(c.days?.length > 0 || c.startTime || c.timeSession) && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {c.days?.length > 0 && (
                                      <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: col.light, color: col.bg }}>
                                        {c.days.map(d => d.slice(0,3)).join(' · ')}
                                      </span>
                                    )}
                                    {(c.startTime || c.endTime) && (
                                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-semibold">
                                        🕐 {c.startTime}{c.endTime ? `–${c.endTime}` : ''}
                                      </span>
                                    )}
                                    {c.timeSession && (
                                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${c.timeSession === 'Morning' ? 'bg-yellow-100 text-yellow-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                        {c.timeSession === 'Morning' ? '🌅' : '🌙'} {c.timeSession}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Date Sheets */}
            {activeSection === 'datesheets' && (
              <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-xl font-bold text-primary mb-4">Date Sheets</h2>
                {dataLoading ? (
                  <p className="text-gray-500 text-sm">Loading...</p>
                ) : datesheets.length === 0 ? (
                  <p className="text-gray-500 text-sm">No date sheets published yet.</p>
                ) : (
                  <div className="space-y-4">
                    {datesheets.map((ds) => (
                      <div key={ds._id} className="border rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-gray-800">{ds.title}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {ds.examType} Exam • {ds.semester} • {ds.program} • {ds.department}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Uploaded: {new Date(ds.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {ds.fileUrl && (
                          <a
                            href={fileUrl(ds.fileUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-primary text-sm flex-shrink-0 ml-4"
                          >
                            Download PDF
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Results */}
            {activeSection === 'results' && (
              <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-xl font-bold text-primary mb-4">Results</h2>
                {dataLoading ? (
                  <p className="text-gray-500 text-sm">Loading...</p>
                ) : results.length === 0 ? (
                  <p className="text-gray-500 text-sm">No results published yet.</p>
                ) : (
                  <div className="space-y-6">
                    {results.map((r) => (
                      <div key={r._id} className="border rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-bold text-gray-800">{r.title}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {r.examType} • {r.semester} • {r.program}
                            </p>
                            {r.passingMarks != null && (
                              <p className="mt-1">
                                <span className="inline-block bg-blue-100 text-primary text-xs font-semibold px-2 py-0.5 rounded">
                                  Passing GPA: {r.passingMarks}
                                </span>
                              </p>
                            )}
                          </div>
                          {r.fileUrl && (
                            <a
                              href={fileUrl(r.fileUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-primary text-sm"
                            >
                              Download PDF
                            </a>
                          )}
                        </div>
                        {r.results?.length > 0 && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="border px-3 py-2 text-left">Reg No</th>
                                  <th className="border px-3 py-2 text-left">Student Name</th>
                                  <th className="border px-3 py-2 text-left">Father Name</th>
                                  <th className="border px-3 py-2 text-center">Obtained GPA</th>
                                  <th className="border px-3 py-2 text-center">Total GPA</th>
                                  {r.passingMarks != null && <th className="border px-3 py-2 text-center">Status</th>}
                                </tr>
                              </thead>
                              <tbody>
                                {r.results.map((row, i) => {
                                  const passing = r.passingMarks != null && row.obtainedGPA >= r.passingMarks;
                                  return (
                                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                      <td className="border px-3 py-2">{row.registrationNo}</td>
                                      <td className="border px-3 py-2">{row.studentName}</td>
                                      <td className="border px-3 py-2">{row.fatherName}</td>
                                      <td className="border px-3 py-2 text-center font-semibold">{row.obtainedGPA ?? '—'}</td>
                                      <td className="border px-3 py-2 text-center">{row.totalGPA ?? '—'}</td>
                                      {r.passingMarks != null && (
                                        <td className={`border px-3 py-2 text-center font-semibold ${passing ? 'text-green-600' : 'text-red-600'}`}>
                                          {passing ? 'Pass' : 'Fail'}
                                        </td>
                                      )}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Fee & Challans ── */}
            {activeSection === 'challans' && (() => {
              const fmt = n => Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 0 });
              const FEE_BADGE = { generated: 'bg-blue-100 text-blue-800', paid: 'bg-green-100 text-green-800', expired: 'bg-orange-100 text-orange-700', cancelled: 'bg-gray-100 text-gray-600' };

              if (chnView === 'print' && chnSelected) {
                const ch = chnSelected;
                const fmt2 = n => Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 0 });
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
                            <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{fmt2(it.amount)}</td>
                          </tr>
                        ))}
                        <tr style={S.totalRow}>
                          <td style={{ ...S.totalTd, borderRight: '1px solid #041476' }}>TOTAL PAYABLE</td>
                          <td style={{ ...S.totalTd, textAlign: 'right', fontFamily: 'monospace', borderLeft: '1px solid #041476' }}>Rs. {fmt2(ch.totalAmount)}</td>
                        </tr>
                      </tbody>
                    </table>
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
                    <div style={S.instrBox}><strong>Note: </strong>{ch.paymentInstructions}</div>
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
                        #student-challan-print, #student-challan-print * { visibility: visible !important; }
                        #student-challan-print { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: auto !important; padding: 0 !important; margin: 0 !important; box-sizing: border-box !important; }
                        .no-print-ch { display: none !important; }
                      }
                    `}</style>
                    <div className="no-print-ch flex items-center gap-3 mb-6">
                      <button onClick={() => setChnView('list')} className="flex items-center gap-2 text-gray-500 hover:text-primary text-sm font-medium">← Back to Challans</button>
                      <button onClick={() => window.print()} className="ml-auto px-6 py-2.5 bg-primary text-white font-bold rounded-xl text-sm hover:opacity-90">🖨 Print / Save PDF</button>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <div id="student-challan-print" style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', gap: 0, minWidth: 900, padding: 16, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8 }}>
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
                <div className="space-y-5">
                  <h2 className="text-2xl font-bold text-primary">Fee &amp; Challans</h2>
                  <p className="text-gray-500 text-sm">View and download your fee challans issued by the Finance Section.</p>
                  {chnLoading ? (
                    <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
                  ) : challans.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
                      <p className="text-5xl mb-4">💳</p>
                      <h3 className="text-lg font-semibold text-gray-700">No Fee Challans</h3>
                      <p className="text-gray-400 text-sm mt-1">No challans have been issued for you yet. Contact the Finance Section for assistance.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {challans.map(ch => (
                        <div key={ch._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                          <div className="flex items-start gap-4 p-5">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#e0e7ff' }}>
                              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-sm font-bold text-primary">{ch.challanNo}</span>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${FEE_BADGE[ch.status] || 'bg-gray-100 text-gray-600'}`}>{ch.status}</span>
                              </div>
                              <p className="text-gray-600 text-sm mt-0.5">{ch.semester} · {ch.academicSession || ''}</p>
                              <div className="flex flex-wrap gap-4 mt-2 text-sm">
                                <div><span className="text-gray-400 text-xs">Total</span><br /><span className="font-bold text-gray-800 text-base">Rs. {fmt(ch.totalAmount)}</span></div>
                                {ch.dueDate && <div><span className="text-gray-400 text-xs">Due Date</span><br /><span className={`font-semibold ${new Date(ch.dueDate) < new Date() && ch.status !== 'paid' ? 'text-red-600' : 'text-gray-700'}`}>{new Date(ch.dueDate).toLocaleDateString('en-GB')}</span></div>}
                                <div><span className="text-gray-400 text-xs">Issued On</span><br /><span className="text-gray-600">{new Date(ch.issuedAt).toLocaleDateString('en-GB')}</span></div>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-1">
                                {ch.feeItems.map((it, i) => <span key={i} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{it.description}: Rs.{fmt(it.amount)}</span>)}
                              </div>
                            </div>
                            <button onClick={() => { setChnSelected(ch); setChnView('print'); }} className="shrink-0 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:opacity-90">View &amp; Print</button>
                          </div>
                          {ch.lateFeePerDay > 0 && ch.dueDate && new Date(ch.dueDate) < new Date() && ch.status !== 'paid' && (
                            <div className="px-5 py-2 bg-orange-50 border-t border-orange-100 text-xs text-orange-700 font-medium">
                              ⚠ Overdue — Late fee of Rs. {ch.lateFeePerDay}/day applies.
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── Assignments ── */}
            {activeSection === 'assignments' && (
              <div className="space-y-5">
                <h2 className="text-2xl font-bold text-primary">Assignments</h2>

                {dataLoading ? (
                  <p className="text-gray-500 text-sm">Loading...</p>
                ) : assignments.length === 0 ? (
                  <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400 text-sm">No assignments have been posted yet.</div>
                ) : (
                  assignments.map((a) => {
                    const submitted = !!a.mySubmission;
                    const isOpen = submittingId === a._id;
                    const overdue = a.dueDate && new Date(a.dueDate) < new Date();
                    return (
                      <div key={a._id} className="bg-white rounded-xl shadow overflow-hidden">
                        {/* Header */}
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <h3 className="font-bold text-gray-800">{a.title}</h3>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {a.subject && <span className="bg-primary text-white text-xs font-semibold px-2 py-0.5 rounded-full">{a.subject}</span>}
                                {a.className && <span className="bg-gray-100 text-gray-700 text-xs font-semibold px-2 py-0.5 rounded-full">{a.className}</span>}
                                {a.semester && <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">{a.semester}</span>}
                                {a.dueDate && (
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${overdue ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {overdue ? '⚠ Overdue' : '📅 Due'}: {new Date(a.dueDate).toLocaleDateString()}
                                  </span>
                                )}
                                {a.totalMarks != null && <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded-full">🏅 {a.totalMarks} marks</span>}
                                {submitted && <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">✓ Submitted</span>}
                                {submitted && a.mySubmission?.gradedAt && <span className="bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">✓ Graded: {a.mySubmission.obtainedMarks}/{a.totalMarks || 100}</span>}
                              </div>
                              <p className="text-xs text-gray-400 mt-1">Posted {new Date(a.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="flex flex-col gap-2 flex-shrink-0">
                              {a.fileUrl && (
                                <a href={fileUrl(a.fileUrl)} target="_blank" rel="noreferrer"
                                  className="text-xs px-3 py-1.5 rounded-lg bg-primary text-white font-semibold hover:opacity-90 transition text-center">
                                  ⬇ Download
                                </a>
                              )}
                              {overdue ? (
                                <span className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-red-100 text-red-600 border border-red-200 cursor-default select-none">
                                  🔒 Closed
                                </span>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSubmittingId(isOpen ? null : a._id);
                                    setSubForm({ note: a.mySubmission?.note || '' });
                                    setSubFile(null); setSubError(''); setSubSuccess('');
                                  }}
                                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition ${submitted ? 'border border-primary text-primary hover:bg-blue-50' : 'bg-primary text-white hover:opacity-90'}`}>
                                  {isOpen ? 'Cancel' : submitted ? '✏️ Re-submit' : 'Submit'}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Rich text description */}
                          {a.description && (
                            <div className="mt-4 border-t border-gray-100 pt-4 prose prose-sm max-w-none text-gray-700"
                              dangerouslySetInnerHTML={{ __html: a.description }} />
                          )}

                          {/* Existing submission summary */}
                          {submitted && !isOpen && (
                            <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 text-sm space-y-1">
                              <p className="font-semibold text-green-700">Your Submission</p>
                              {a.mySubmission.note && <p className="text-gray-600 text-xs italic">"{a.mySubmission.note}"</p>}
                              {a.mySubmission.fileUrl && (
                                <a href={fileUrl(a.mySubmission.fileUrl)} target="_blank" rel="noreferrer"
                                  className="inline-block text-xs text-primary font-semibold hover:underline">
                                  ⬇ {a.mySubmission.fileName}
                                </a>
                              )}
                              <p className="text-gray-400 text-xs">Submitted {new Date(a.mySubmission.createdAt).toLocaleDateString()}</p>
                              {/* Teacher grade */}
                              {a.mySubmission.gradedAt ? (
                                <div className="mt-2 pt-2 border-t border-green-200">
                                  <p className="text-xs font-bold text-green-700">
                                    Marks: <span className="text-lg">{a.mySubmission.obtainedMarks != null ? a.mySubmission.obtainedMarks : '—'}</span>
                                    {a.totalMarks != null && <span className="text-gray-500 font-normal"> / {a.totalMarks}</span>}
                                  </p>
                                  {a.mySubmission.feedback && (
                                    <p className="text-xs text-gray-600 mt-0.5">Feedback: {a.mySubmission.feedback}</p>
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs text-orange-500 mt-1">Awaiting marks from teacher</p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Submit form */}
                        {isOpen && !overdue && (
                          <div className="border-t border-gray-100 bg-blue-50 p-5">
                            <h4 className="font-bold text-gray-700 text-sm mb-3">{submitted ? 'Update Submission' : 'Submit Assignment'}</h4>
                            {subError && <div className="bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-2 rounded text-sm mb-3">{subError}</div>}
                            {subSuccess && <div className="bg-green-50 border-l-4 border-green-400 text-green-700 px-4 py-2 rounded text-sm mb-3">{subSuccess}</div>}
                            <div className="space-y-3">
                              <div>
                                <label className={labelCls}>Note / Comment (optional)</label>
                                <textarea value={subForm.note} rows={2}
                                  onChange={(e) => setSubForm({ note: e.target.value })}
                                  className={inputCls} placeholder="Any note for your teacher..." />
                              </div>
                              <div>
                                <label className={labelCls}>Upload File (PDF or Image){submitted ? ' – leave empty to keep existing' : ''}</label>
                                <input type="file" accept=".pdf,image/*"
                                  onChange={(e) => setSubFile(e.target.files[0])}
                                  className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:opacity-90" />
                              </div>
                              <button onClick={() => handleSubmitAssignment(a._id)} disabled={subLoading}
                                className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition">
                                {subLoading ? 'Submitting...' : submitted ? 'Update Submission' : 'Submit'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── Result Cards ── */}
            {activeSection === 'resultCards' && (() => {
              const GRADE_COLOR = g => g === 'A+' || g === 'A' ? '#16a34a' : g === 'B' || g === 'C' ? '#2563eb' : g === 'D' ? '#d97706' : g === 'F' ? '#dc2626' : '#64748b';
              const STATUS_CLS  = s => s === 'Pass' ? 'bg-green-100 text-green-800' : s === 'Fail' ? 'bg-red-100 text-red-700' : s === 'Absent' ? 'bg-gray-100 text-gray-600' : 'bg-orange-100 text-orange-700';
              const semesters = [...new Set(resultCards.map(r => r.semester).filter(Boolean))].sort();
              const filtered  = rcSemFilter ? resultCards.filter(r => r.semester === rcSemFilter) : resultCards;

              // Current semester for transcript
              const tSem = transcriptSem || (semesters[0] || '');

              const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

              return (
                <div className="space-y-6">

                  {/* ── LIST VIEW ── */}
                  {rcView === 'list' && (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h2 className="text-2xl font-bold text-primary">Result Cards</h2>
                          <p className="text-gray-500 text-xs mt-0.5">Official results finalized and published by the Examination Branch</p>
                        </div>
                        <div className="flex gap-2 items-center flex-wrap">
                          <select value={rcSemFilter} onChange={e => setRcSemFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-primary">
                            <option value="">All Semesters</option>
                            {semesters.map(s => <option key={s}>{s}</option>)}
                          </select>
                          {semesters.length > 0 && (
                            <button onClick={() => { setTranscriptSem(tSem); setRcView('transcript'); }}
                              className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90">
                              🎓 Semester Transcript
                            </button>
                          )}
                        </div>
                      </div>

                      {rcLoading ? (
                        <div className="flex items-center gap-3 text-gray-400 py-8">
                          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          Loading result cards…
                        </div>
                      ) : filtered.length === 0 ? (
                        <div className="bg-white rounded-xl shadow p-14 text-center">
                          <p className="text-5xl mb-3">📋</p>
                          <p className="font-semibold text-gray-600 text-lg">No results published yet</p>
                          <p className="text-gray-400 text-sm mt-2 max-w-sm mx-auto">
                            Results are published by the <strong>Examination Branch</strong> after reviewing all subject mark sheets. Please check back later.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {filtered.map(rc => (
                            <div key={rc._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                              {/* Card top accent */}
                              <div className="h-1.5" style={{ background: rc.entry?.resultStatus === 'Pass' ? '#16a34a' : rc.entry?.resultStatus === 'Fail' ? '#dc2626' : '#94a3b8' }} />
                              <div className="p-5">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                  <div>
                                    <h3 className="font-bold text-gray-800 text-base leading-tight">{rc.subject}</h3>
                                    <p className="text-gray-500 text-xs mt-1">{rc.examType} Exam · {rc.semester}</p>
                                    {rc.academicSession && <p className="text-gray-400 text-xs">{rc.academicSession}</p>}
                                  </div>
                                  <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_CLS(rc.entry?.resultStatus)}`}>
                                    {rc.entry?.resultStatus || '—'}
                                  </span>
                                </div>

                                {/* Marks row */}
                                <div className="flex gap-4 text-center mb-4">
                                  <div className="flex-1 bg-gray-50 rounded-xl p-2.5">
                                    <p className="text-xs text-gray-400 mb-0.5">Total Marks</p>
                                    <p className="text-xl font-bold text-gray-700">{rc.totalMarks}</p>
                                  </div>
                                  <div className="flex-1 bg-blue-50 rounded-xl p-2.5">
                                    <p className="text-xs text-gray-400 mb-0.5">Obtained</p>
                                    <p className="text-xl font-bold text-primary">
                                      {rc.entry?.resultStatus === 'Absent' || rc.entry?.resultStatus === 'Withheld' ? '—' : rc.entry?.obtainedMarks ?? '—'}
                                    </p>
                                  </div>
                                  <div className="flex-1 rounded-xl p-2.5" style={{ background: '#f0f9ff' }}>
                                    <p className="text-xs text-gray-400 mb-0.5">Grade</p>
                                    <p className="text-xl font-bold" style={{ color: GRADE_COLOR(rc.entry?.grade) }}>
                                      {rc.entry?.grade || '—'}
                                    </p>
                                  </div>
                                </div>

                                {rc.entry?.remarks && (
                                  <p className="text-gray-500 text-xs italic mb-3">Remarks: {rc.entry.remarks}</p>
                                )}

                                <div className="flex gap-2">
                                  <button onClick={() => { setRcSelected(rc); setRcView('card'); }}
                                    className="flex-1 py-2 border border-primary text-primary rounded-lg text-xs font-semibold hover:bg-blue-50 transition">
                                    View Details
                                  </button>
                                  <button onClick={() => { setRcSelected(rc); setRcView('card'); setTimeout(() => window.print(), 300); }}
                                    className="flex-1 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:opacity-90 transition">
                                    🖨 Print Card
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* ── INDIVIDUAL RESULT CARD VIEW ── */}
                  {rcView === 'card' && rcSelected && (() => {
                    const rc = rcSelected;
                    const e  = rc.entry || {};
                    const absent = e.resultStatus === 'Absent' || e.resultStatus === 'Withheld';
                    return (
                      <>
                        <div className="flex items-center justify-between no-print mb-4">
                          <h2 className="text-xl font-bold text-primary">Result Card — {rc.subject}</h2>
                          <div className="flex gap-2">
                            <button onClick={() => window.print()}
                              className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90">
                              🖨 Print / Save PDF
                            </button>
                            <button onClick={() => setRcView('list')}
                              className="px-4 py-2 border border-gray-300 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">
                              ← Back
                            </button>
                          </div>
                        </div>

                        {/* Printable Card */}
                        <div id="student-result-card" className="bg-white rounded-xl shadow p-0 overflow-hidden">
                          {/* University header */}
                          <div style={{ background: 'linear-gradient(135deg, #041476 0%, #0a2580 100%)', padding: '28px 36px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                              <div style={{ width: '64px', height: '64px', background: 'rgba(255,255,255,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0 }}>
                                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                                </svg>
                              </div>
                              <div>
                                <p style={{ color: '#bfdbfe', fontSize: '11px', fontWeight: '600', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>University of Makran, Panjgur</p>
                                <h1 style={{ color: 'white', fontSize: '22px', fontWeight: '800', margin: 0, letterSpacing: '-0.3px' }}>OFFICIAL RESULT CARD</h1>
                                <p style={{ color: '#93c5fd', fontSize: '12px', marginTop: '3px' }}>Academic Result — Issued by Examination Section</p>
                              </div>
                            </div>
                          </div>

                          {/* Orange accent bar */}
                          <div style={{ height: '4px', background: 'linear-gradient(90deg, #FA7902, #ff9a3c)' }} />

                          <div style={{ padding: '32px 36px' }}>
                            {/* Student info grid */}
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 24px', marginBottom: '28px' }}>
                              <p style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>Student Information</p>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                {[
                                  ['Student Name',    student.fullName],
                                  ["Father's Name",   student.fatherName || '—'],
                                  ['Registration No', student.registrationNo],
                                  ['Program',         student.program || '—'],
                                  ['Department',      student.department || '—'],
                                  ['Semester',        rc.semester || `Semester ${student.currentSemester}`],
                                  ['Academic Session',rc.academicSession || student.session || '—'],
                                  ['Time Session',    student.timeSession || '—'],
                                ].map(([label, val]) => (
                                  <div key={label}>
                                    <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', marginBottom: '2px' }}>{label}</p>
                                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{val}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Subject result table */}
                            <p style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Examination Result</p>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '24px' }}>
                              <thead>
                                <tr style={{ background: '#041476', color: 'white' }}>
                                  {['Subject / Course', 'Exam Type', 'Total Marks', 'Obtained Marks', 'Grade', 'Passing Marks', 'Result Status', 'Remarks'].map(h => (
                                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                  <td style={{ padding: '12px', fontWeight: '600', color: '#1e293b' }}>{rc.subject}</td>
                                  <td style={{ padding: '12px', color: '#475569' }}>{rc.examType}</td>
                                  <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>{rc.totalMarks}</td>
                                  <td style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#041476', fontSize: '15px' }}>
                                    {absent ? '—' : e.obtainedMarks ?? '—'}
                                  </td>
                                  <td style={{ padding: '12px', textAlign: 'center', fontWeight: '800', fontSize: '16px', color: GRADE_COLOR(e.grade) }}>
                                    {absent ? '—' : (e.grade || '—')}
                                  </td>
                                  <td style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>{rc.passingMarks}</td>
                                  <td style={{ padding: '12px' }}>
                                    <span style={{
                                      display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                                      background: e.resultStatus === 'Pass' ? '#dcfce7' : e.resultStatus === 'Fail' ? '#fee2e2' : '#f1f5f9',
                                      color:      e.resultStatus === 'Pass' ? '#15803d' : e.resultStatus === 'Fail' ? '#b91c1c' : '#475569',
                                    }}>{e.resultStatus || '—'}</span>
                                  </td>
                                  <td style={{ padding: '12px', color: '#64748b', fontStyle: 'italic', fontSize: '12px' }}>{e.remarks || '—'}</td>
                                </tr>
                              </tbody>
                            </table>

                            {/* Overall result banner */}
                            <div style={{
                              background: e.resultStatus === 'Pass' ? 'linear-gradient(135deg, #dcfce7, #f0fdf4)' : e.resultStatus === 'Fail' ? 'linear-gradient(135deg, #fee2e2, #fff1f2)' : '#f8fafc',
                              border: `2px solid ${e.resultStatus === 'Pass' ? '#86efac' : e.resultStatus === 'Fail' ? '#fca5a5' : '#e2e8f0'}`,
                              borderRadius: '12px', padding: '16px 24px', marginBottom: '28px',
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            }}>
                              <div>
                                <p style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Overall Result</p>
                                <p style={{ fontSize: '22px', fontWeight: '800', color: e.resultStatus === 'Pass' ? '#15803d' : e.resultStatus === 'Fail' ? '#b91c1c' : '#475569', marginTop: '2px' }}>
                                  {e.resultStatus === 'Pass' ? '✓ PASSED' : e.resultStatus === 'Fail' ? '✗ FAILED' : e.resultStatus?.toUpperCase() || '—'}
                                </p>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '11px', color: '#94a3b8' }}>Percentage</p>
                                <p style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>
                                  {absent ? '—' : `${Math.round((e.obtainedMarks / rc.totalMarks) * 100)}%`}
                                </p>
                              </div>
                            </div>

                            {/* Footer */}
                            <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '20px' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                  <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>Date of Issue</p>
                                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', marginTop: '3px' }}>{today}</p>
                                </div>
                                <div>
                                  <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>Teacher</p>
                                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', marginTop: '3px' }}>{rc.teacherName || rc.teacherId || '—'}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>Authorized By</p>
                                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', marginTop: '3px' }}>Examination Section</p>
                                </div>
                              </div>
                              <div style={{ background: '#f1f5f9', borderRadius: '8px', padding: '10px 14px' }}>
                                <p style={{ fontSize: '10px', color: '#64748b', lineHeight: '1.6' }}>
                                  This is a computer-generated result card issued by the University of Makran, Panjgur. This document is valid without a signature for verification purposes. For official use, please contact the Examination Section. Any tampering with this document is an offence.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  {/* ── SEMESTER TRANSCRIPT VIEW ── */}
                  {rcView === 'transcript' && (() => {
                    const semList = [...new Set(resultCards.map(r => r.semester).filter(Boolean))].sort();
                    const tData   = resultCards.filter(r => r.semester === tSem);
                    const passCount = tData.filter(r => r.entry?.resultStatus === 'Pass').length;
                    const failCount = tData.filter(r => r.entry?.resultStatus === 'Fail').length;
                    const overallPass = tData.length > 0 && failCount === 0;
                    const avgPct = tData.length > 0 ? Math.round(tData.reduce((sum, r) => {
                      const absent = r.entry?.resultStatus === 'Absent' || r.entry?.resultStatus === 'Withheld';
                      return sum + (absent ? 0 : ((r.entry?.obtainedMarks || 0) / (r.totalMarks || 100)) * 100);
                    }, 0) / tData.length) : 0;

                    return (
                      <>
                        <div className="flex items-center justify-between no-print mb-4 flex-wrap gap-3">
                          <div>
                            <h2 className="text-xl font-bold text-primary">Semester Transcript</h2>
                            <p className="text-gray-500 text-xs">All subject results for the selected semester</p>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <select value={tSem} onChange={e => setTranscriptSem(e.target.value)}
                              className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-primary">
                              {semList.map(s => <option key={s}>{s}</option>)}
                            </select>
                            <button onClick={() => window.print()}
                              className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90">
                              🖨 Print Transcript
                            </button>
                            <button onClick={() => setRcView('list')}
                              className="px-4 py-2 border border-gray-300 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">
                              ← Back
                            </button>
                          </div>
                        </div>

                        {tData.length === 0 ? (
                          <div className="bg-white rounded-xl shadow p-12 text-center">
                            <p className="text-gray-500">No results found for {tSem}.</p>
                          </div>
                        ) : (
                          <div id="student-transcript" className="bg-white rounded-xl shadow overflow-hidden">
                            {/* Header */}
                            <div style={{ background: 'linear-gradient(135deg, #041476 0%, #0a2580 100%)', padding: '30px 40px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
                                <div style={{ width: '72px', height: '72px', background: 'rgba(255,255,255,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0 }}>
                                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                                  </svg>
                                </div>
                                <div>
                                  <p style={{ color: '#bfdbfe', fontSize: '11px', fontWeight: '700', letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: '5px' }}>University of Makran, Panjgur — Balochistan, Pakistan</p>
                                  <h1 style={{ color: 'white', fontSize: '24px', fontWeight: '800', margin: 0 }}>SEMESTER ACADEMIC TRANSCRIPT</h1>
                                  <p style={{ color: '#93c5fd', fontSize: '12px', marginTop: '4px' }}>{tSem} · Issued by Office of the Controller of Examinations</p>
                                </div>
                              </div>
                            </div>
                            <div style={{ height: '5px', background: 'linear-gradient(90deg, #FA7902, #ff9a3c, #FA7902)' }} />

                            <div style={{ padding: '36px 40px' }}>
                              {/* Student info */}
                              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '22px 28px', marginBottom: '32px' }}>
                                <p style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Student Information</p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                                  {[
                                    ['Student Name',     student.fullName],
                                    ["Father's Name",    student.fatherName || '—'],
                                    ['Registration No',  student.registrationNo],
                                    ['Program',          student.program || '—'],
                                    ['Department',       student.department || '—'],
                                    ['Semester',         tSem],
                                    ['Academic Session', tData[0]?.academicSession || student.session || '—'],
                                    ['Time Session',     student.timeSession || '—'],
                                    ['Date of Issue',    today],
                                  ].map(([label, val]) => (
                                    <div key={label}>
                                      <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', marginBottom: '2px' }}>{label}</p>
                                      <p style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{val}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Results table */}
                              <p style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Academic Performance</p>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '28px' }}>
                                <thead>
                                  <tr style={{ background: '#041476', color: 'white' }}>
                                    {['#', 'Subject / Course', 'Exam Type', 'Total Marks', 'Obtained Marks', '%', 'Grade', 'Result', 'Remarks'].map(h => (
                                      <th key={h} style={{ padding: '11px 12px', textAlign: 'left', fontSize: '10px', fontWeight: '700', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {tData.map((rc, idx) => {
                                    const e = rc.entry || {};
                                    const absent = e.resultStatus === 'Absent' || e.resultStatus === 'Withheld';
                                    const pct = absent ? '—' : `${Math.round((e.obtainedMarks / rc.totalMarks) * 100)}%`;
                                    return (
                                      <tr key={rc._id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '11px 12px', color: '#94a3b8', fontSize: '11px' }}>{idx + 1}</td>
                                        <td style={{ padding: '11px 12px', fontWeight: '600', color: '#1e293b' }}>{rc.subject}</td>
                                        <td style={{ padding: '11px 12px', color: '#475569' }}>{rc.examType}</td>
                                        <td style={{ padding: '11px 12px', textAlign: 'center', fontWeight: '600' }}>{rc.totalMarks}</td>
                                        <td style={{ padding: '11px 12px', textAlign: 'center', fontWeight: '700', color: '#041476', fontSize: '14px' }}>
                                          {absent ? '—' : e.obtainedMarks ?? '—'}
                                        </td>
                                        <td style={{ padding: '11px 12px', textAlign: 'center', color: '#475569' }}>{pct}</td>
                                        <td style={{ padding: '11px 12px', textAlign: 'center', fontWeight: '800', fontSize: '14px', color: GRADE_COLOR(e.grade) }}>
                                          {absent ? '—' : (e.grade || '—')}
                                        </td>
                                        <td style={{ padding: '11px 12px' }}>
                                          <span style={{
                                            display: 'inline-block', padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                                            background: e.resultStatus === 'Pass' ? '#dcfce7' : e.resultStatus === 'Fail' ? '#fee2e2' : '#f1f5f9',
                                            color:      e.resultStatus === 'Pass' ? '#15803d' : e.resultStatus === 'Fail' ? '#b91c1c' : '#475569',
                                          }}>{e.resultStatus || '—'}</span>
                                        </td>
                                        <td style={{ padding: '11px 12px', color: '#94a3b8', fontStyle: 'italic', fontSize: '11px' }}>{e.remarks || '—'}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>

                              {/* Summary stats */}
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                                {[
                                  ['Total Subjects',   tData.length,    '#e0e7ff', '#4338ca'],
                                  ['Passed',           passCount,        '#dcfce7', '#15803d'],
                                  ['Failed',           failCount,        '#fee2e2', '#b91c1c'],
                                  ['Avg Percentage',   `${avgPct}%`,     '#fef3c7', '#92400e'],
                                ].map(([label, val, bg, color]) => (
                                  <div key={label} style={{ background: bg, borderRadius: '10px', padding: '14px 16px', textAlign: 'center' }}>
                                    <p style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</p>
                                    <p style={{ fontSize: '22px', fontWeight: '800', color }}>{val}</p>
                                  </div>
                                ))}
                              </div>

                              {/* Overall result banner */}
                              <div style={{
                                background: overallPass ? 'linear-gradient(135deg, #dcfce7, #f0fdf4)' : 'linear-gradient(135deg, #fee2e2, #fff1f2)',
                                border: `2px solid ${overallPass ? '#86efac' : '#fca5a5'}`,
                                borderRadius: '12px', padding: '20px 28px', marginBottom: '28px',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              }}>
                                <div>
                                  <p style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Overall Semester Result</p>
                                  <p style={{ fontSize: '26px', fontWeight: '800', color: overallPass ? '#15803d' : '#b91c1c', marginTop: '3px' }}>
                                    {overallPass ? '✓ SEMESTER CLEARED' : '✗ SEMESTER NOT CLEARED'}
                                  </p>
                                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                    {overallPass ? 'Congratulations! You have successfully passed all subjects.' : `${failCount} subject${failCount > 1 ? 's' : ''} failed. Please contact your department.`}
                                  </p>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                  <p style={{ fontSize: '11px', color: '#94a3b8' }}>Average Score</p>
                                  <p style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b' }}>{avgPct}%</p>
                                </div>
                              </div>

                              {/* Footer */}
                              <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '22px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', alignItems: 'end' }}>
                                <div>
                                  <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', marginBottom: '3px' }}>Date of Issue</p>
                                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{today}</p>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ borderTop: '1px solid #94a3b8', width: '120px', margin: '0 auto 6px' }} />
                                  <p style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Controller of Examinations</p>
                                  <p style={{ fontSize: '10px', color: '#94a3b8' }}>University of Makran, Panjgur</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ borderTop: '1px solid #94a3b8', width: '120px', marginLeft: 'auto', marginBottom: '6px' }} />
                                  <p style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Head of Department</p>
                                  <p style={{ fontSize: '10px', color: '#94a3b8' }}>{student.department}</p>
                                </div>
                              </div>
                              <div style={{ background: '#f1f5f9', borderRadius: '8px', padding: '10px 14px', marginTop: '16px' }}>
                                <p style={{ fontSize: '10px', color: '#64748b', lineHeight: '1.6' }}>
                                  This is an official computer-generated transcript of the University of Makran, Panjgur. This document serves as a valid academic record. Any alteration, forgery, or unauthorized reproduction of this document is strictly prohibited and may be subject to legal action. For verification, contact the Office of the Controller of Examinations.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {/* Print styles */}
                  <style>{`
                    @media print {
                      body * { visibility: hidden !important; }
                      #student-result-card,  #student-result-card  * { visibility: visible !important; }
                      #student-transcript,   #student-transcript   * { visibility: visible !important; }
                      #student-result-card  { position: fixed; top: 0; left: 0; width: 100%; background: white; }
                      #student-transcript   { position: fixed; top: 0; left: 0; width: 100%; background: white; }
                      .no-print { display: none !important; }
                    }
                  `}</style>

                </div>
              );
            })()}


          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <Head><title>Student Portal - University of Makran, Panjgur</title></Head>
      <Header />
      <HeroSection title="Student Portal" subtitle="Login or Register to Access Your Academic Dashboard" />

      <div className="bg-gray-50 py-16 min-h-screen">
        <div className="container max-w-2xl mx-auto">
          {/* Tabs */}
          <div className="flex bg-white rounded-xl shadow overflow-hidden mb-6">
            {['login', 'register'].map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setLoginError(''); setRegError(''); setRegSuccess(''); }}
                className={`flex-1 py-4 font-semibold text-sm transition ${
                  tab === t ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t === 'login' ? '🔑 Login' : '📝 Register'}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            {/* LOGIN */}
            {tab === 'login' && (
              <>
                <h2 className="text-2xl font-bold text-primary mb-6 text-center">Student Login</h2>
                <Alert type="error" message={loginError} />
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className={labelCls}>Registration Number *</label>
                    <input
                      type="text"
                      value={loginData.registrationNo}
                      onChange={(e) => setLoginData({ ...loginData, registrationNo: e.target.value })}
                      required
                      className={inputCls}
                      placeholder="e.g. 2024-CS-001"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Password *</label>
                    <div className="relative">
                      <input
                        type={showLoginPw ? 'text' : 'password'}
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        required
                        className={inputCls}
                      />
                      <button type="button" onClick={() => setShowLoginPw(!showLoginPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                        {showLoginPw ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="btn btn-primary w-full py-3 text-base"
                  >
                    {loginLoading ? 'Logging in...' : 'Login'}
                  </button>
                  <p className="text-center text-sm text-gray-500">
                    Forgot password?{' '}
                    <button type="button" onClick={() => { setShowForgotPw(true); setForgotMsg({ type: '', text: '' }); setForgotEmail(''); }}
                      className="text-primary font-semibold hover:underline">
                      Reset here
                    </button>
                  </p>
                </form>
                <p className="text-center text-sm text-gray-500 mt-4">
                  Don&apos;t have an account?{' '}
                  <button onClick={() => setTab('register')} className="text-primary font-semibold hover:underline">
                    Register now
                  </button>
                </p>
              </>
            )}

            {/* REGISTER */}
            {tab === 'register' && (
              <>
                <h2 className="text-2xl font-bold text-primary mb-6 text-center">Student Registration</h2>
                <Alert type="error" message={regError} />
                <Alert type="success" message={regSuccess} />
                {!regSuccess && (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Registration Number *</label>
                        <input type="text" required value={regData.registrationNo}
                          onChange={(e) => setRegData({ ...regData, registrationNo: e.target.value })}
                          className={inputCls} placeholder="e.g. 2024-CS-001" />
                      </div>
                      <div>
                        <label className={labelCls}>Full Name *</label>
                        <input type="text" required value={regData.fullName}
                          onChange={(e) => setRegData({ ...regData, fullName: e.target.value })}
                          className={inputCls} placeholder="Your full name" />
                      </div>
                      <div>
                        <label className={labelCls}>Email Address *</label>
                        <input type="email" required value={regData.email}
                          onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                          className={inputCls} placeholder="you@example.com" />
                      </div>
                      <div>
                        <label className={labelCls}>Phone Number *</label>
                        <input type="text" required value={regData.phone}
                          onChange={(e) => setRegData({ ...regData, phone: e.target.value })}
                          className={inputCls} placeholder="03XX-XXXXXXX" />
                      </div>
                      <div>
                        <label className={labelCls}>CNIC *</label>
                        <input type="text" required value={regData.cnic}
                          onChange={(e) => setRegData({ ...regData, cnic: e.target.value })}
                          className={inputCls} placeholder="XXXXX-XXXXXXX-X" />
                      </div>
                      <div>
                        <label className={labelCls}>Father&apos;s Name *</label>
                        <input type="text" required value={regData.fatherName}
                          onChange={(e) => setRegData({ ...regData, fatherName: e.target.value })}
                          className={inputCls} placeholder="Father's full name" />
                      </div>
                      <div>
                        <label className={labelCls}>Gender *</label>
                        <select required value={regData.gender}
                          onChange={(e) => setRegData({ ...regData, gender: e.target.value })}
                          className={inputCls}>
                          <option value="">Select gender</option>
                          <option>Male</option>
                          <option>Female</option>
                          <option>Other</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Date of Birth *</label>
                        <input type="date" required value={regData.dateOfBirth}
                          onChange={(e) => setRegData({ ...regData, dateOfBirth: e.target.value })}
                          className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Department *</label>
                        <select required value={regData.department}
                          onChange={(e) => setRegData({ ...regData, department: e.target.value, program: '' })}
                          className={inputCls}>
                          <option value="">Select department</option>
                          {deptList.map((d) => <option key={d.name}>{d.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Program *</label>
                        <input type="text" required value={regData.program}
                          onChange={(e) => setRegData({ ...regData, program: e.target.value })}
                          className={inputCls} placeholder="e.g. BSCS, BEd, BSBOT" />
                      </div>
                      <div>
                        <label className={labelCls}>Academic Session *</label>
                        <input type="text" required value={regData.session}
                          onChange={(e) => setRegData({ ...regData, session: e.target.value })}
                          className={inputCls} placeholder="e.g. 2024-2028" />
                      </div>
                      <div>
                        <label className={labelCls}>Time Session *</label>
                        <select required value={regData.timeSession}
                          onChange={(e) => setRegData({ ...regData, timeSession: e.target.value })}
                          className={inputCls}>
                          <option value="">Select time session</option>
                          <option value="Morning">🌅 Morning</option>
                          <option value="Evening">🌙 Evening</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Current Semester *</label>
                        <select required value={regData.currentSemester}
                          onChange={(e) => setRegData({ ...regData, currentSemester: e.target.value })}
                          className={inputCls}>
                          {[1,2,3,4,5,6,7,8,9,10].map((s) => (
                            <option key={s} value={s}>Semester {s}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Roll Number <span className="font-normal text-gray-400">(optional)</span></label>
                        <input type="text" value={regData.rollNo}
                          onChange={(e) => setRegData({ ...regData, rollNo: e.target.value })}
                          className={inputCls} placeholder="Get this from your teacher or HOD" />
                        <p className="text-xs text-gray-400 mt-1">You can add or update this later from your profile.</p>
                      </div>
                    </div>

                    <div>
                      <label className={labelCls}>Address *</label>
                      <textarea required value={regData.address}
                        onChange={(e) => setRegData({ ...regData, address: e.target.value })}
                        className={inputCls} rows={2} placeholder="Your home address" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Password * (min 8 chars)</label>
                        <div className="relative">
                          <input type={showRegPw ? 'text' : 'password'} required minLength={8} value={regData.password}
                            onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                            className={inputCls} />
                          <button type="button" onClick={() => setShowRegPw(!showRegPw)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                            {showRegPw ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>Confirm Password *</label>
                        <div className="relative">
                          <input type={showConfirmPw ? 'text' : 'password'} required value={regData.confirmPassword}
                            onChange={(e) => setRegData({ ...regData, confirmPassword: e.target.value })}
                            className={inputCls} />
                          <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                            {showConfirmPw ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <button type="submit" disabled={regLoading} className="btn btn-primary w-full py-3 text-base">
                      {regLoading ? 'Submitting...' : 'Submit Registration'}
                    </button>
                  </form>
                )}
                <p className="text-center text-sm text-gray-500 mt-4">
                  Already registered?{' '}
                  <button onClick={() => setTab('login')} className="text-primary font-semibold hover:underline">
                    Login here
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
      <Footer />

      {/* ── Forgot Password Modal ── */}
      {showForgotPw && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowForgotPw(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-7">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Forgot Password</h3>
                <p className="text-gray-400 text-sm mt-0.5">Enter your registered email address</p>
              </div>
              <button onClick={() => setShowForgotPw(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-xl font-light">×</button>
            </div>

            {forgotMsg.text && (
              <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${forgotMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {forgotMsg.text}
              </div>
            )}

            {forgotMsg.type !== 'success' && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    required
                    placeholder="e.g. student@example.com"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition"
                  />
                </div>
                <button type="submit" disabled={forgotLoading}
                  className="w-full py-3 rounded-xl font-bold text-sm text-white transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: '#041476' }}>
                  {forgotLoading ? 'Sending…' : 'Send Reset Link'}
                </button>
                <p className="text-xs text-gray-400 text-center">
                  We&apos;ll send a secure reset link to your email. Valid for 1 hour.
                </p>
              </form>
            )}

            {forgotMsg.type === 'success' && (
              <button onClick={() => setShowForgotPw(false)}
                className="w-full mt-2 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
