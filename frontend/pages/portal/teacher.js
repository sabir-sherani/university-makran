import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Header from '../../components/Header.js';
import Footer from '../../components/Footer.js';
import HeroSection from '../../components/HeroSection.js';
import axios from 'axios';
import { useRouter } from 'next/router';
import TimetableGrid from '../../components/portal/TimetableGrid.js';
import NotificationBell from '../../components/portal/NotificationBell.js';

const API = process.env.NEXT_PUBLIC_API_URL;
const BASE_URL = API ? API.replace(/\/api$/, '') : '';
const fileUrl = (u) => u?.startsWith('http') ? u : `${BASE_URL}${u}`;


const inputCls = 'w-full px-4 py-2 min-h-11 border border-gray-300 rounded-lg focus:outline-none focus:border-[#FA7902] text-sm';
const labelCls = 'block text-gray-700 font-semibold mb-1 text-sm';

function RichTextEditor({ initialValue = '', onChange, key: _key }) {
  const ref = useRef(null);
  const ready = useRef(false);

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = initialValue;
      ready.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exec = (cmd, val = null) => {
    document.execCommand(cmd, false, val);
    ref.current?.focus();
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const btnCls = 'px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-200 transition select-none';

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:border-[#FA7902]">
      <div className="flex flex-wrap gap-1 p-2 bg-gray-50 border-b border-gray-200">
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('formatBlock', 'H2'); }} className={`${btnCls} font-bold`}>H2</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('formatBlock', 'H3'); }} className={`${btnCls} font-semibold`}>H3</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('formatBlock', 'P'); }} className={btnCls}>¶ Para</button>
        <span className="border-l border-gray-300 mx-0.5" />
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('bold'); }} className={`${btnCls} font-bold`}>B</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('italic'); }} className={`${btnCls} italic`}>I</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('underline'); }} className={`${btnCls} underline`}>U</button>
        <span className="border-l border-gray-300 mx-0.5" />
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('insertUnorderedList'); }} className={btnCls}>• List</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('insertOrderedList'); }} className={btnCls}>1. List</button>
        <span className="border-l border-gray-300 mx-0.5" />
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('removeFormat'); }} className={btnCls}>Clear</button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => { if (ref.current) onChange(ref.current.innerHTML); }}
        className="min-h-[160px] p-3 text-sm focus:outline-none"
        style={{ lineHeight: '1.7' }}
      />
    </div>
  );
}

function Alert({ type, message }) {
  if (!message) return null;
  const colors = type === 'error'
    ? 'bg-red-50 border-red-400 text-red-700'
    : 'bg-green-50 border-green-400 text-green-700';
  return <div className={`border-l-4 px-4 py-3 rounded text-sm mb-4 ${colors}`}>{message}</div>;
}

// Formats an axios error into a single display string, appending
// field-level validation detail when the API returned it — either the
// express-validator `validate` middleware's { message, errors: {field: msg} }
// shape, or a plain { message, errors: [msg, ...] } array shape.
function formatApiError(err, fallback) {
  const data = err.response?.data;
  if (!data) return fallback;
  let detail = '';
  if (Array.isArray(data.errors)) detail = data.errors.join(' · ');
  else if (data.errors && typeof data.errors === 'object') detail = Object.values(data.errors).join(' · ');
  return detail ? `${data.message} ${detail}` : (data.message || fallback);
}

// Single source of truth for how a make-up session reads wherever attendance
// is listed — mirrors backend/utils/attendanceSummary.js's formatMakeupLabel()
// so the wording stays identical between server-rendered and client-rendered
// views.
function formatMakeupLabel(session) {
  if (!session?.isMakeup) return null;
  const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const heldOn = session.date ? fmt(session.date) : 'an unspecified date';
  const missedOn = session.makeupFor ? fmt(session.makeupFor) : 'an unspecified date';
  return `Make-up class (held ${heldOn}, for the class missed on ${missedOn})`;
}

const emptyResultRow = () => ({ registrationNo: '', studentName: '', fatherName: '', obtainedGPA: '', totalGPA: '' });

// These are administrative staff designations (assigned by admin to HOD/Exam/Finance
// accounts), not teaching designations — hidden here so a self-registering teacher
// can't pick one.
const NON_TEACHING_DESIGNATIONS = ['Head of Department', 'Examination Officer', 'Finance Officer'];

export default function TeacherPortal() {
  const router = useRouter();
  const [tab, setTab] = useState('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [teacher, setTeacher] = useState(null);
  const [token, setToken] = useState(null);
  const [activeSection, setActiveSection] = useState('profile');

  // Login
  const [loginData, setLoginData] = useState({ teacherId: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [showRegPw, setShowRegPw] = useState(false);

  // Register
  const [regData, setRegData] = useState({
    teacherId: '', fullName: '', email: '', password: '', phone: '',
    cnic: '', departmentId: '', qualification: '', designationId: '',
    classesTaught: '',
  });
  const [designationList, setDesignationList] = useState([]);
  const [regError, setRegError] = useState('');
  const [regFieldErrors, setRegFieldErrors] = useState({});
  const [regSuccess, setRegSuccess] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // Departments (dynamic)
  const [deptList, setDeptList] = useState([]);

  // Attendance
  const [atTab, setAtTab]                 = useState('take');   // 'take' | 'edit' | 'report'
  const [atClassId, setAtClassId]         = useState('');
  const [atDate, setAtDate]               = useState(new Date().toISOString().split('T')[0]);
  const [atRecords, setAtRecords]         = useState([]);
  const [atIsMakeup, setAtIsMakeup]       = useState(false);
  const [atMakeupFor, setAtMakeupFor]     = useState('');
  const [atMakeupReason, setAtMakeupReason] = useState('');
  const [atSaving, setAtSaving]           = useState(false);
  const [atError, setAtError]             = useState('');
  const [atSuccess, setAtSuccess]         = useState('');
  const [atSessions, setAtSessions]       = useState([]);
  const [atSessionsLoading, setAtSessionsLoading] = useState(false);
  const [atEditSession, setAtEditSession] = useState(null);
  const [atReport, setAtReport]           = useState(null);
  const [atReportLoading, setAtReportLoading] = useState(false);

  // Ongoing classes — read-only for teachers; the HOD assigns these (see hod.js).
  const [ocClasses, setOcClasses] = useState([]);
  const [ocLoading, setOcLoading] = useState(false);
  const [timetable, setTimetable] = useState({ grid: { days: [], byDay: {} } });
  const [timetableLoading, setTimetableLoading] = useState(false);


  // Results
  const [results, setResults] = useState([]);
  const [rForm, setRForm] = useState({ title: '', examType: '', semester: '', department: '', program: '', session: '', timeSession: '', passingMarks: '' });
  const [rRows, setRRows] = useState([emptyResultRow()]);
  const [rFile, setRFile] = useState(null);
  const [rError, setRError] = useState('');
  const [rSuccess, setRSuccess] = useState('');
  const [rLoading, setRLoading] = useState(false);

  // Edit / delete result
  const [editingResult, setEditingResult] = useState(null);
  const [editResultForm, setEditResultForm] = useState({ title: '', examType: '', semester: '', department: '', program: '', session: '', timeSession: '', passingMarks: '' });
  const [editResultRows, setEditResultRows] = useState([emptyResultRow()]);
  const [editResultFile, setEditResultFile] = useState(null);
  const [editResultError, setEditResultError] = useState('');
  const [editResultSuccess, setEditResultSuccess] = useState('');
  const [editResultLoading, setEditResultLoading] = useState(false);
  const [deletingResultId, setDeletingResultId] = useState(null);
  const [deleteResultLoading, setDeleteResultLoading] = useState(false);

  // Assignments
  const [assignments, setAssignments] = useState([]);
  const [aForm, setAForm] = useState({ title: '', description: '', ongoingClassId: '', dueDate: '', totalMarks: '100' });
  const [aFile, setAFile] = useState(null);
  const [aError, setAError] = useState('');
  const [aSuccess, setASuccess] = useState('');
  const [aLoading, setALoading] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [editAForm, setEditAForm] = useState({ title: '', description: '', ongoingClassId: '', dueDate: '', totalMarks: '100' });
  const [editAFile, setEditAFile] = useState(null);
  const [editAError, setEditAError] = useState('');
  const [editASuccess, setEditASuccess] = useState('');
  const [editALoading, setEditALoading] = useState(false);
  const [deletingAssignmentId, setDeletingAssignmentId] = useState(null);
  const [deleteALoading, setDeleteALoading] = useState(false);
  const [viewingSubmissions, setViewingSubmissions] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [gradingSubId, setGradingSubId] = useState(null);
  const [gradingInputs, setGradingInputs] = useState({ obtainedMarks: '', feedback: '' });
  const [gradingSaving, setGradingSaving] = useState(false);
  const [showAForm, setShowAForm] = useState(false);
  const editorKey = useRef(0);
  const editEditorKey = useRef(0);

  const [dataLoading, setDataLoading] = useState(false);


  // Teaching Fields
  const [tfFields, setTfFields]       = useState([]);
  const [tfLoading, setTfLoading]     = useState(false);
  const [tfDeleting, setTfDeleting]   = useState(null);
  const [tfError, setTfError]         = useState('');
  const [tfSuccess, setTfSuccess]     = useState('');
  const [tfForm, setTfForm]           = useState({ subject: '', program: '', department: '', description: '' });
  const [tfSaving, setTfSaving]       = useState(false);
  const [showTfForm, setShowTfForm]   = useState(false);

  // Result Sheets
  const [rsSheets, setRsSheets]               = useState([]);
  const [rsLoading, setRsLoading]             = useState(false);
  const [rsView, setRsView]                   = useState('list'); // 'list' | 'form' | 'detail'
  const [rsEditing, setRsEditing]             = useState(null);   // draft sheet when in form view
  const [rsSelected, setRsSelected]           = useState(null);   // sheet in detail view
  const [rsForm, setRsForm]                   = useState({ ongoingClassId: '', examType: 'Final', useComponents: true, hasLab: false, quizMax: 10, presentationMax: 5, assignmentMax: 5, midMax: 30, finalMax: 50 });
  const [rsEntries, setRsEntries]             = useState([]);
  const [rsError, setRsError]                 = useState('');
  const [rsSuccess, setRsSuccess]             = useState('');
  const [rsSaving, setRsSaving]               = useState(false);
  const [rsSubmitting, setRsSubmitting]       = useState(false);
  const [rsImporting, setRsImporting]         = useState(false);
  const rsFileInputRef                        = useRef(null);
  const [crForm, setCrForm]                   = useState({ reason: '', requestedChanges: '' });
  const [crSubmitting, setCrSubmitting]       = useState(false);
  const [crError, setCrError]                 = useState('');
  const [crSuccess, setCrSuccess]             = useState('');
  const [showCrForm, setShowCrForm]           = useState(false);
  const [myCrs, setMyCrs]                     = useState([]);
  const [myCrsLoading, setMyCrsLoading]       = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('teacherToken');
    const savedTeacher = localStorage.getItem('teacherData');
    if (savedToken && savedTeacher) {
      setToken(savedToken);
      setTeacher(JSON.parse(savedTeacher));
      setIsLoggedIn(true);
    }
    axios.get(`${API}/departments`).then(r => setDeptList(r.data)).catch(() => {});
    axios.get(`${API}/lookups/designations`).then(r => setDesignationList(r.data)).catch(() => {});
  }, []);

  // 'register' picks the pre-login form; any other value deep-links a
  // notification straight into a logged-in section (see NotificationBell's
  // openNotification() — teacher.js's post-login nav state is activeSection,
  // not tab).
  useEffect(() => {
    if (router.query.tab === 'register') { setTab('register'); return; }
    if (router.query.tab) setActiveSection(router.query.tab);
  }, [router.query.tab]);

  useEffect(() => {
    if (isLoggedIn && token) {
      if (activeSection === 'myClasses') {
        fetchOngoingClasses();
      }
      if (activeSection === 'attendance') { fetchOngoingClasses(); }
      if (activeSection === 'assignments') { fetchAssignments(); fetchOngoingClasses(); }
      if (activeSection === 'results') { fetchResultSheets(); fetchOngoingClasses(); setRsView('list'); }
      if (activeSection === 'correctionRequests') fetchMyCrs();
      if (activeSection === 'teachingFields') fetchTeachingFields();
      if (activeSection === 'timetable') fetchTimetable();
    }
  }, [activeSection, isLoggedIn]);

  const authHeaders = () => ({ headers: { Authorization: `Bearer ${token}` } });

  // ── Attendance helpers ────────────────────────────────────────────────────
  const atEmptyRecord = () => ({ registrationNo: '', studentName: '', status: 'Present' });

  const fetchAtSessions = async (classId) => {
    if (!classId) return;
    setAtSessionsLoading(true);
    try {
      const { data } = await axios.get(`${API}/portal/teacher/attendance?ongoingClassId=${classId}`, authHeaders());
      setAtSessions(data || []);
    } catch { setAtSessions([]); }
    setAtSessionsLoading(false);
  };

  const fetchAtReport = async (classId) => {
    if (!classId) return;
    setAtReportLoading(true);
    try {
      const { data } = await axios.get(`${API}/portal/teacher/attendance/report?ongoingClassId=${classId}`, authHeaders());
      setAtReport(data);
    } catch { setAtReport(null); }
    setAtReportLoading(false);
  };

  const loadRosterFromLastSession = async (classId) => {
    try {
      const { data } = await axios.get(`${API}/portal/teacher/attendance?ongoingClassId=${classId}`, authHeaders());
      if (data?.length) {
        const last = data[0]; // most recent
        setAtRecords(last.records.map(r => ({ registrationNo: r.registrationNo, studentName: r.studentName, status: 'Present' })));
      }
    } catch { /* no roster */ }
  };

  const handleTakeAttendance = async (e) => {
    e.preventDefault();
    if (!atClassId) { setAtError('Please select a class.'); return; }
    if (!atRecords.length) { setAtError('Add at least one student.'); return; }
    if (atIsMakeup && (!atMakeupFor || !atMakeupReason.trim())) {
      setAtError('Make-up classes need both the missed-class date and a reason.'); return;
    }
    setAtSaving(true); setAtError(''); setAtSuccess('');
    try {
      const { data } = await axios.post(`${API}/portal/teacher/attendance`, {
        ongoingClassId: atClassId, date: atDate, records: atRecords,
        isMakeup: atIsMakeup, makeupFor: atIsMakeup ? atMakeupFor : undefined, makeupReason: atIsMakeup ? atMakeupReason : undefined,
      }, authHeaders());
      setAtSuccess(`Attendance saved successfully!${data?.notified ? ` ${data.notified} absence alert(s) sent.` : ''}`);
      setAtRecords([]);
      setAtDate(new Date().toISOString().split('T')[0]);
      setAtIsMakeup(false); setAtMakeupFor(''); setAtMakeupReason('');
    } catch (err) { setAtError(err.response?.data?.message || 'Failed to save.'); }
    setAtSaving(false);
  };

  const handleEditAttendanceSession = async (e) => {
    e.preventDefault();
    if (!atEditSession) return;
    if (atEditSession.isMakeup && (!atEditSession.makeupFor || !String(atEditSession.makeupReason || '').trim())) {
      setAtError('Make-up classes need both the missed-class date and a reason.'); return;
    }
    setAtSaving(true); setAtError(''); setAtSuccess('');
    try {
      const { data } = await axios.patch(`${API}/portal/teacher/attendance/${atEditSession._id}`, {
        records: atEditSession.records, date: atEditSession.date,
        isMakeup: atEditSession.isMakeup, makeupFor: atEditSession.makeupFor, makeupReason: atEditSession.makeupReason, kind: atEditSession.kind,
      }, authHeaders());
      setAtSuccess(`Attendance updated.${data?.notified ? ` ${data.notified} absence alert(s) sent.` : ''}`);
      fetchAtSessions(atClassId);
      setAtEditSession(null);
    } catch (err) { setAtError(err.response?.data?.message || 'Update failed.'); }
    setAtSaving(false);
  };

  const handleDeleteAtSession = async (id) => {
    if (!confirm('Delete this attendance session?')) return;
    try {
      await axios.delete(`${API}/portal/teacher/attendance/${id}`, authHeaders());
      fetchAtSessions(atClassId);
    } catch (err) { alert(err.response?.data?.message || 'Delete failed.'); }
  };

  const fetchResultSheets = async () => {
    setRsLoading(true);
    try {
      const res = await axios.get(`${API}/portal/teacher/result-sheets`, authHeaders());
      setRsSheets(res.data || []);
    } catch { setRsSheets([]); }
    setRsLoading(false);
  };

  const fetchMyCrs = async () => {
    setMyCrsLoading(true);
    try {
      const res = await axios.get(`${API}/portal/teacher/correction-requests`, authHeaders());
      setMyCrs(res.data || []);
    } catch { setMyCrs([]); }
    setMyCrsLoading(false);
  };

  const fetchTeachingFields = async () => {
    setTfLoading(true);
    try {
      const res = await axios.get(`${API}/portal/teacher/teaching-fields`, authHeaders());
      setTfFields(res.data || []);
    } catch { setTfFields([]); }
    setTfLoading(false);
  };

  const handleAddTeachingField = async (e) => {
    e.preventDefault();
    if (!tfForm.subject.trim()) { setTfError('Subject name is required.'); return; }
    setTfSaving(true); setTfError(''); setTfSuccess('');
    try {
      const res = await axios.post(`${API}/portal/teacher/teaching-fields`, {
        subject: tfForm.subject.trim(),
        program: tfForm.program.trim(),
        department: tfForm.department.trim(),
        description: tfForm.description.trim(),
      }, authHeaders());
      setTfFields(res.data.teachingFields || []);
      setTfForm({ subject: '', program: '', department: '', description: '' });
      setShowTfForm(false);
      setTfSuccess('Teaching field added successfully.');
      setTimeout(() => setTfSuccess(''), 3000);
    } catch (err) { setTfError(err.response?.data?.message || 'Failed to add field.'); }
    setTfSaving(false);
  };

  const handleDeleteTeachingField = async (fieldId) => {
    if (!confirm('Remove this teaching field?')) return;
    setTfDeleting(fieldId);
    try {
      const res = await axios.delete(`${API}/portal/teacher/teaching-fields/${fieldId}`, authHeaders());
      setTfFields(res.data.teachingFields || []);
    } catch (err) { setTfError(err.response?.data?.message || 'Failed to remove field.'); }
    setTfDeleting(null);
  };

  // Live-typing preview only — the server (utils/grading.js) is the
  // authoritative source and recomputes this on save; mirrored here so what
  // the teacher sees while typing matches what actually gets saved, instead
  // of a simpler scale that used to disagree with it.
  const GRADE_SCALE = [
    { min: 90, grade: 'A+', points: 4.00 },
    { min: 85, grade: 'A',  points: 3.66 },
    { min: 80, grade: 'A-', points: 3.33 },
    { min: 75, grade: 'B+', points: 3.00 },
    { min: 70, grade: 'B',  points: 2.66 },
    { min: 65, grade: 'B-', points: 2.33 },
    { min: 60, grade: 'C+', points: 2.00 },
    { min: 55, grade: 'C',  points: 1.66 },
    { min: 50, grade: 'C-', points: 1.33 },
    { min: 45, grade: 'D+', points: 1.00 },
    { min: 40, grade: 'D',  points: 0.66 },
    { min: 0,  grade: 'F',  points: 0.00 },
  ];
  function rsGradeRow(marks) {
    const pct = Math.min(100, Math.max(0, Number(marks) || 0));
    return GRADE_SCALE.find(r => pct >= r.min) || GRADE_SCALE[GRADE_SCALE.length - 1];
  }
  function rsCalcGrade(marks) { return rsGradeRow(marks).grade; }
  function rsCalcGpa(marks) { return rsGradeRow(marks).points; }

  // Default component weighting for the two standard mark-sheet layouts.
  // Lab subjects: Sessional + Lab + Mid + Final. Non-lab subjects: the
  // "sessional" portion is broken into Quiz + Presentation + Assignment
  // instead, plus Mid + Final.
  function rsDefaultComponents(hasLab) {
    return hasLab
      ? { sessionalMax: 15, labMax: 25, midMax: 20, finalMax: 40 }
      : { quizMax: 10, presentationMax: 5, assignmentMax: 5, midMax: 30, finalMax: 50 };
  }

  function rsComponentsTotal(f) {
    return f.hasLab
      ? (Number(f.sessionalMax) || 0) + (Number(f.labMax) || 0) + (Number(f.midMax) || 0) + (Number(f.finalMax) || 0)
      : (Number(f.quizMax) || 0) + (Number(f.presentationMax) || 0) + (Number(f.assignmentMax) || 0) + (Number(f.midMax) || 0) + (Number(f.finalMax) || 0);
  }

  function rsEntryTotal(e, f) {
    return f.hasLab
      ? (Number(e.sessionalMarks) || 0) + (Number(e.labMarks) || 0) + (Number(e.midMarks) || 0) + (Number(e.finalMarks) || 0)
      : (Number(e.quizMarks) || 0) + (Number(e.presentationMarks) || 0) + (Number(e.assignmentMarks) || 0) + (Number(e.midMarks) || 0) + (Number(e.finalMarks) || 0);
  }

  function emptyRsEntry() {
    return {
      registrationNo: '', studentName: '', fatherName: '',
      sessionalMarks: '', labMarks: '', quizMarks: '', presentationMarks: '', assignmentMarks: '', midMarks: '', finalMarks: '',
      obtainedMarks: '', remarks: '',
    };
  }

  function updateRsEntry(idx, field, value) {
    setRsEntries(prev => prev.map((e, i) => {
      if (i !== idx) return e;
      return { ...e, [field]: value };
    }));
  }

  function openNewRsForm() {
    setRsEditing(null);
    setRsForm({ ongoingClassId: '', examType: 'Final', useComponents: true, hasLab: false, ...rsDefaultComponents(false) });
    setRsEntries([emptyRsEntry()]);
    setRsError(''); setRsSuccess('');
    setRsView('form');
  }

  function openEditRsForm(sheet) {
    setRsEditing(sheet);
    // Drafts saved before this feature (or imported without a breakdown) have
    // no markComponents — those keep editing in the original single-total
    // mode instead of showing blank breakdown columns for marks that were
    // never split out.
    const useComponents = !!(sheet.markComponents && (sheet.markComponents.sessionalMax != null || sheet.markComponents.quizMax != null));
    const hasLab = !!sheet.hasLab;
    const dc = rsDefaultComponents(hasLab);
    setRsForm({
      ongoingClassId: sheet.ongoingClassId || '',
      examType: sheet.examType || 'Final',
      useComponents,
      hasLab,
      sessionalMax:    sheet.markComponents?.sessionalMax    ?? dc.sessionalMax,
      labMax:          sheet.markComponents?.labMax          ?? dc.labMax,
      quizMax:         sheet.markComponents?.quizMax         ?? dc.quizMax,
      presentationMax: sheet.markComponents?.presentationMax ?? dc.presentationMax,
      assignmentMax:   sheet.markComponents?.assignmentMax   ?? dc.assignmentMax,
      midMax:          sheet.markComponents?.midMax          ?? dc.midMax,
      finalMax:        sheet.markComponents?.finalMax        ?? dc.finalMax,
    });
    setRsEntries(sheet.entries?.length ? sheet.entries.map(e => ({
      ...e,
      obtainedMarks:     String(e.obtainedMarks),
      sessionalMarks:    e.sessionalMarks    != null ? String(e.sessionalMarks)    : '',
      labMarks:          e.labMarks          != null ? String(e.labMarks)          : '',
      quizMarks:         e.quizMarks         != null ? String(e.quizMarks)         : '',
      presentationMarks: e.presentationMarks != null ? String(e.presentationMarks) : '',
      assignmentMarks:   e.assignmentMarks   != null ? String(e.assignmentMarks)   : '',
      midMarks:          e.midMarks          != null ? String(e.midMarks)          : '',
      finalMarks:        e.finalMarks        != null ? String(e.finalMarks)        : '',
    })) : [emptyRsEntry()]);
    setRsError(''); setRsSuccess('');
    setRsView('form');
  }

  function openRsDetail(sheet) {
    setRsSelected(sheet);
    setCrForm({ reason: '', requestedChanges: '' });
    setCrError(''); setCrSuccess(''); setShowCrForm(false);
    fetchMyCrs();
    setRsView('detail');
  }

  async function handleSaveRsDraft(e) {
    e.preventDefault();
    if (!rsForm.ongoingClassId && !rsEditing) { setRsError('Please select a class.'); return; }
    if (!rsEntries.length) { setRsError('Add at least one student entry.'); return; }
    if (rsForm.useComponents && rsComponentsTotal(rsForm) !== 100) {
      setRsError(`${rsForm.hasLab ? 'Sessional + Lab + Mid + Final' : 'Quiz + Presentation + Assignment + Mid + Final'} must add up to 100 (currently ${rsComponentsTotal(rsForm)}).`);
      return;
    }
    setRsError(''); setRsSuccess(''); setRsSaving(true);
    try {
      const markComponents = rsForm.useComponents
        ? (rsForm.hasLab ? {
            sessionalMax: Number(rsForm.sessionalMax) || 0,
            labMax: Number(rsForm.labMax) || 0,
            midMax: Number(rsForm.midMax) || 0,
            finalMax: Number(rsForm.finalMax) || 0,
          } : {
            quizMax: Number(rsForm.quizMax) || 0,
            presentationMax: Number(rsForm.presentationMax) || 0,
            assignmentMax: Number(rsForm.assignmentMax) || 0,
            midMax: Number(rsForm.midMax) || 0,
            finalMax: Number(rsForm.finalMax) || 0,
          })
        : undefined;
      const payload = {
        ongoingClassId: rsForm.ongoingClassId,
        examType: rsForm.examType,
        hasLab: rsForm.useComponents ? rsForm.hasLab : undefined,
        markComponents,
        entries: rsEntries.map(e => {
          if (!rsForm.useComponents) return { ...e, obtainedMarks: Number(e.obtainedMarks) || 0 };
          return rsForm.hasLab ? {
            registrationNo: e.registrationNo, studentName: e.studentName, fatherName: e.fatherName,
            sessionalMarks: e.sessionalMarks, labMarks: e.labMarks,
            midMarks: e.midMarks, finalMarks: e.finalMarks, remarks: e.remarks,
          } : {
            registrationNo: e.registrationNo, studentName: e.studentName, fatherName: e.fatherName,
            quizMarks: e.quizMarks, presentationMarks: e.presentationMarks, assignmentMarks: e.assignmentMarks,
            midMarks: e.midMarks, finalMarks: e.finalMarks, remarks: e.remarks,
          };
        }),
      };
      let saved;
      if (rsEditing) {
        const r = await axios.patch(`${API}/portal/teacher/result-sheets/${rsEditing._id}`, payload, authHeaders());
        saved = r.data.sheet;
      } else {
        const r = await axios.post(`${API}/portal/teacher/result-sheets`, payload, authHeaders());
        saved = r.data.sheet;
      }
      setRsEditing(saved);
      setRsSuccess('Draft saved successfully!');
      fetchResultSheets();
    } catch (err) {
      setRsError(formatApiError(err, 'Failed to save result sheet.'));
    }
    setRsSaving(false);
  }

  function rsTemplateParams() {
    const params = { ongoingClassId: rsForm.ongoingClassId, examType: rsForm.examType, hasLab: rsForm.hasLab };
    if (rsForm.hasLab) {
      params.sessionalMax = rsForm.sessionalMax;
      params.labMax = rsForm.labMax;
    } else {
      params.quizMax = rsForm.quizMax;
      params.presentationMax = rsForm.presentationMax;
      params.assignmentMax = rsForm.assignmentMax;
    }
    params.midMax = rsForm.midMax;
    params.finalMax = rsForm.finalMax;
    return params;
  }

  async function handleDownloadTemplate() {
    if (!rsForm.ongoingClassId) { setRsError('Please select a class first.'); return; }
    setRsError('');
    try {
      const res = await axios.get(`${API}/portal/teacher/result-sheets/template`, {
        ...authHeaders(), params: rsTemplateParams(), responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ResultSheet_Template.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setRsError('Failed to download template.');
    }
  }

  async function handleImportExcel(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!rsForm.ongoingClassId) {
      setRsError('Please select a class first.');
      if (rsFileInputRef.current) rsFileInputRef.current.value = '';
      return;
    }
    setRsError(''); setRsSuccess(''); setRsImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const params = rsTemplateParams();
      Object.entries(params).forEach(([k, v]) => fd.append(k, v));
      const res = await axios.post(`${API}/portal/teacher/result-sheets/import`, fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      openEditRsForm(res.data.sheet);
      setRsSuccess(res.data.message || 'Imported successfully. Review the entries below, then save or submit.');
      fetchResultSheets();
    } catch (err) {
      setRsError(formatApiError(err, 'Failed to import Excel file.'));
    }
    setRsImporting(false);
    if (rsFileInputRef.current) rsFileInputRef.current.value = '';
  }

  async function handleSubmitResultSheet() {
    if (!rsEditing) return;
    setRsSubmitting(true); setRsError(''); setRsSuccess('');
    try {
      await axios.patch(`${API}/portal/teacher/result-sheets/${rsEditing._id}/submit`, {}, authHeaders());
      const r = await axios.get(`${API}/portal/teacher/result-sheets/${rsEditing._id}`, authHeaders());
      fetchResultSheets();
      openRsDetail(r.data);
    } catch (err) {
      setRsError(formatApiError(err, 'Failed to submit result sheet.'));
    }
    setRsSubmitting(false);
  }

  async function handleSubmitCr(e) {
    e.preventDefault();
    setCrError(''); setCrSuccess(''); setCrSubmitting(true);
    try {
      await axios.post(`${API}/portal/teacher/result-sheets/${rsSelected._id}/correction-request`, crForm, authHeaders());
      setCrSuccess('Correction request submitted. Awaiting HOD or Exam Section approval.');
      setShowCrForm(false);
      setCrForm({ reason: '', requestedChanges: '' });
      fetchMyCrs();
    } catch (err) {
      setCrError(err.response?.data?.message || 'Failed to submit correction request.');
    }
    setCrSubmitting(false);
  }

  const fetchResults = async () => {
    setDataLoading(true);
    try {
      const res = await axios.get(`${API}/portal/teacher/results`, authHeaders());
      setResults(res.data);
    } catch { setResults([]); }
    setDataLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await axios.post(`${API}/portal/teacher/login`, loginData);
      const { token: t, teacher: tc } = res.data;
      localStorage.setItem('teacherToken', t);
      localStorage.setItem('teacherData', JSON.stringify(tc));
      setToken(t);
      setTeacher(tc);
      setIsLoggedIn(true);
    } catch (err) {
      setLoginError(err.response?.data?.message || 'Login failed. Please try again.');
    }
    setLoginLoading(false);
  };

  const regInputCls = (field) => regFieldErrors[field]
    ? inputCls.replace('border-gray-300', 'border-red-400') + ' focus:border-red-500'
    : inputCls;

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError('');
    setRegFieldErrors({});
    setRegSuccess('');
    if (regData.password.length < 8) return setRegError('Password must be at least 8 characters.');
    setRegLoading(true);
    try {
      await axios.post(`${API}/portal/teacher/register`, regData);
      setRegSuccess('Registration submitted successfully! Your account is pending admin approval.');
      setRegData({ teacherId: '', fullName: '', email: '', password: '', phone: '', cnic: '', departmentId: '', qualification: '', designationId: '', classesTaught: '' });
    } catch (err) {
      setRegError(err.response?.data?.message || 'Registration failed. Please try again.');
      setRegFieldErrors(err.response?.data?.errors || {});
    }
    setRegLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('teacherToken');
    localStorage.removeItem('teacherData');
    setIsLoggedIn(false);
    setTeacher(null);
    setToken(null);
    setActiveSection('profile');
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


  const fetchOngoingClasses = async () => {
    setOcLoading(true);
    try {
      const res = await axios.get(`${API}/portal/teacher/ongoing-classes`, authHeaders());
      setOcClasses(res.data);
    } catch { setOcClasses([]); }
    setOcLoading(false);
  };

  const fetchTimetable = async () => {
    setTimetableLoading(true);
    try {
      const { data } = await axios.get(`${API}/portal/teacher/timetable`, authHeaders());
      setTimetable(data);
    } catch { setTimetable({ grid: { days: [], byDay: {} } }); }
    setTimetableLoading(false);
  };

  const handleUploadResults = async (e) => {
    e.preventDefault();
    setRError('');
    setRSuccess('');
    setRLoading(true);
    try {
      const formData = new FormData();
      Object.entries(rForm).forEach(([k, v]) => formData.append(k, v));
      formData.append('results', JSON.stringify(rRows));
      if (rFile) formData.append('file', rFile);
      await axios.post(`${API}/portal/teacher/results`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      setRSuccess('Results uploaded successfully!');
      setRForm({ title: '', examType: '', semester: '', department: '', program: '', session: '', timeSession: '', passingMarks: '' });
      setRRows([emptyResultRow()]);
      setRFile(null);
    } catch (err) {
      setRError(err.response?.data?.message || 'Upload failed.');
    }
    setRLoading(false);
  };

  const updateRow = (index, field, value) => {
    const updated = [...rRows];
    updated[index] = { ...updated[index], [field]: value };
    setRRows(updated);
  };

  const updateEditRow = (index, field, value) => {
    const updated = [...editResultRows];
    updated[index] = { ...updated[index], [field]: value };
    setEditResultRows(updated);
  };

  const startEditResult = (r) => {
    setEditingResult(r);
    setEditResultForm({ title: r.title || '', examType: r.examType || '', semester: r.semester || '', department: r.department || '', program: r.program || '', session: r.session || '', timeSession: r.timeSession || '', passingMarks: r.passingMarks ?? '' });
    setEditResultRows(r.results?.length > 0 ? r.results.map((row) => ({ registrationNo: row.registrationNo || '', studentName: row.studentName || '', fatherName: row.fatherName || '', obtainedGPA: row.obtainedGPA ?? '', totalGPA: row.totalGPA ?? '' })) : [emptyResultRow()]);
    setEditResultFile(null);
    setEditResultError('');
    setEditResultSuccess('');
  };

  const handleEditResult = async (e) => {
    e.preventDefault();
    setEditResultError('');
    setEditResultSuccess('');
    setEditResultLoading(true);
    try {
      const formData = new FormData();
      Object.entries(editResultForm).forEach(([k, v]) => formData.append(k, v));
      formData.append('results', JSON.stringify(editResultRows));
      if (editResultFile) formData.append('file', editResultFile);
      await axios.patch(`${API}/portal/teacher/results/${editingResult._id}`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      setEditResultSuccess('Result updated successfully!');
      await fetchResults();
      setTimeout(() => { setEditingResult(null); setEditResultSuccess(''); }, 1500);
    } catch (err) {
      setEditResultError(err.response?.data?.message || 'Update failed.');
    }
    setEditResultLoading(false);
  };

  const handleDeleteResult = async (id) => {
    setDeleteResultLoading(true);
    try {
      await axios.delete(`${API}/portal/teacher/results/${id}`, authHeaders());
      setDeletingResultId(null);
      await fetchResults();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed.');
    }
    setDeleteResultLoading(false);
  };

  const fetchAssignments = async () => {
    setDataLoading(true);
    try {
      const res = await axios.get(`${API}/portal/teacher/assignments`, authHeaders());
      setAssignments(res.data);
    } catch { setAssignments([]); }
    setDataLoading(false);
  };

  const handlePostAssignment = async (e) => {
    e.preventDefault();
    setAError(''); setASuccess(''); setALoading(true);
    try {
      const fd = new FormData();
      Object.entries(aForm).forEach(([k, v]) => fd.append(k, v));
      if (aFile) fd.append('file', aFile);
      await axios.post(`${API}/portal/teacher/assignments`, fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      setASuccess('Assignment posted successfully!');
      setAForm({ title: '', description: '', ongoingClassId: '', dueDate: '', totalMarks: '100' });
      editorKey.current += 1;
      setAFile(null);
      setShowAForm(false);
      await fetchAssignments();
    } catch (err) { setAError(err.response?.data?.message || 'Post failed.'); }
    setALoading(false);
  };

  const startEditAssignment = (a) => {
    setEditingAssignment(a);
    setEditAForm({ title: a.title || '', description: a.description || '', ongoingClassId: a.ongoingClassId || '', dueDate: a.dueDate ? a.dueDate.slice(0, 10) : '', totalMarks: a.totalMarks != null ? String(a.totalMarks) : '100' });
    editEditorKey.current += 1;
    setEditAFile(null); setEditAError(''); setEditASuccess('');
  };

  const handleEditAssignment = async (e) => {
    e.preventDefault();
    setEditAError(''); setEditASuccess(''); setEditALoading(true);
    try {
      const fd = new FormData();
      Object.entries(editAForm).forEach(([k, v]) => fd.append(k, v));
      if (editAFile) fd.append('file', editAFile);
      await axios.patch(`${API}/portal/teacher/assignments/${editingAssignment._id}`, fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      setEditASuccess('Assignment updated!');
      await fetchAssignments();
      setTimeout(() => { setEditingAssignment(null); setEditASuccess(''); }, 1500);
    } catch (err) { setEditAError(err.response?.data?.message || 'Update failed.'); }
    setEditALoading(false);
  };

  const handleDeleteAssignment = async (id) => {
    setDeleteALoading(true);
    try {
      await axios.delete(`${API}/portal/teacher/assignments/${id}`, authHeaders());
      setDeletingAssignmentId(null);
      await fetchAssignments();
    } catch (err) { alert(err.response?.data?.message || 'Delete failed.'); }
    setDeleteALoading(false);
  };

  const openSubmissions = async (assignment) => {
    setViewingSubmissions(assignment);
    setGradingSubId(null);
    setSubsLoading(true);
    try {
      const res = await axios.get(`${API}/portal/teacher/assignments/${assignment._id}/submissions`, authHeaders());
      setSubmissions(res.data);
    } catch { setSubmissions([]); }
    setSubsLoading(false);
  };

  const openGrading = (sub) => {
    setGradingSubId(sub._id);
    setGradingInputs({
      obtainedMarks: sub.obtainedMarks != null ? String(sub.obtainedMarks) : '',
      feedback: sub.feedback || '',
    });
  };

  const handleGradeSubmission = async (e) => {
    e.preventDefault();
    setGradingSaving(true);
    try {
      const res = await axios.patch(
        `${API}/portal/teacher/assignments/${viewingSubmissions._id}/submissions/${gradingSubId}`,
        { obtainedMarks: gradingInputs.obtainedMarks, feedback: gradingInputs.feedback },
        authHeaders()
      );
      setSubmissions(prev => prev.map(s => s._id === gradingSubId ? res.data : s));
      setGradingSubId(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save marks.');
    }
    setGradingSaving(false);
  };

  if (isLoggedIn && teacher) {
    return (
      <>
        <Head><title>Teacher Portal - University of Makran</title></Head>
        {/* Banner */}
        <div className="relative overflow-hidden shadow-xl" style={{background: 'linear-gradient(135deg, #111 0%, #333 50%, #FA7902 100%)'}}>
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-white opacity-5 rounded-full" />
          <div className="absolute -bottom-16 left-1/2 w-80 h-80 bg-white opacity-5 rounded-full" />
          <div className="absolute top-6 right-1/3 w-24 h-24 bg-[#FA7902] opacity-10 rounded-full" />
          <div className="absolute bottom-2 left-16 w-16 h-16 bg-white opacity-5 rounded-full" />
          <div className="relative px-8 py-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-white">
            <div>
              <p className="text-orange-200 text-xs font-semibold uppercase tracking-widest mb-2">University of Makran, Panjgur</p>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-1.5">👨‍🏫 Teacher Portal</h1>
              <p className="text-orange-200 text-sm">
                Welcome, <span className="text-white font-semibold">{teacher.fullName}</span>
                {teacher.designation && <> · {teacher.designation}</>}
                {' '}· {teacher.department}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-orange-100 text-xs font-medium mb-0.5">{teacher.teacherId}</p>
              <p className="text-orange-100 text-xs mb-3">{teacher.qualification || teacher.department}</p>
              <button onClick={handleLogout} className="bg-white text-black px-5 py-2 rounded-lg font-semibold text-sm hover:bg-orange-50 transition shadow">
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
              <div className="w-14 h-14 bg-[#FA7902] rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-2">
                {teacher.fullName?.charAt(0)}
              </div>
              <p className="text-center text-sm font-semibold text-gray-800">{teacher.fullName}</p>
              <p className="text-center text-xs text-gray-500">{teacher.designation}</p>
              <p className="text-center text-xs text-gray-400">{teacher.department}</p>
            </div>
            <nav className="flex flex-col">
              {[
                { id: 'profile', label: '👤 Profile' },
                { id: 'teachingFields', label: '🎓 Teaching Fields' },
                { id: 'myClasses', label: '📚 My Classes' },
                { id: 'timetable', label: '🗓️ Timetable' },
                { id: 'attendance', label: '✅ Attendance' },
                { id: 'results', label: '📝 Mark Sheets' },
                { id: 'correctionRequests', label: '🔄 Correction Requests' },
                { id: 'assignments', label: '📝 Assignments' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setActiveSection(item.id); setSidebarOpen(false); }}
                  className={`text-left px-6 py-3 text-sm font-medium transition ${
                    activeSection === item.id
                      ? 'bg-[#FA7902] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <button onClick={handleLogout} className="text-left px-6 py-3 text-sm font-medium text-red-600 hover:bg-red-50 mt-4">
                🚪 Logout
              </button>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-4 lg:p-8 overflow-auto min-w-0">
            {/* Mobile menu button + notification bell */}
            <div className="flex items-center justify-between mb-4">
              <button
                className="lg:hidden flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow text-sm font-medium text-gray-700 border border-gray-200"
                onClick={() => setSidebarOpen(true)}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                Menu
              </button>
              <div className="ml-auto">
                <NotificationBell api={API} token={token} role="teacher" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-[#FA7902] mb-6">Dashboard</h1>

            {/* Timetable */}
            {activeSection === 'timetable' && (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6 no-print-tt">
                  <p className="text-gray-500 text-sm">Your weekly teaching schedule.</p>
                  {timetable.slots?.length > 0 && (
                    <button onClick={() => window.print()} className="px-4 py-2.5 min-h-11 text-sm font-semibold rounded-xl text-white bg-[#FA7902] hover:opacity-90">
                      🖨 Print / Save PDF
                    </button>
                  )}
                </div>
                <div className="no-print-tt-header" style={{ display: 'none', marginBottom: '14px', borderBottom: '2px solid #FA7902', paddingBottom: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#041476' }}>University of Makran, Panjgur</div>
                  <div style={{ fontSize: '12px', color: '#FA7902', fontWeight: 600, marginTop: '4px' }}>Timetable — {teacher.fullName} ({teacher.teacherId})</div>
                </div>
                <div id="teacher-timetable-printable">
                  <TimetableGrid grid={timetable.grid} loading={timetableLoading} emptyLabel="No timetable slots have been scheduled for you yet." />
                  <div className="no-print-tt-footer" style={{ display: 'none', marginTop: '16px', borderTop: '1px solid #ccc', paddingTop: '8px', textAlign: 'right', fontSize: '10px', color: '#555' }}>
                    Generated on {new Date().toLocaleDateString('en-GB')}
                  </div>
                </div>
                <style>{`
                  @media print {
                    @page { size: A4 landscape; margin: 10mm; }
                    body * { visibility: hidden; }
                    #teacher-timetable-printable, #teacher-timetable-printable *, .no-print-tt-header, .no-print-tt-header * { visibility: visible; }
                    .no-print-tt-header, .no-print-tt-footer { display: block !important; }
                    #teacher-timetable-printable { position: absolute; top: 70px; left: 0; width: 100%; }
                    .no-print-tt { display: none !important; }
                  }
                `}</style>
              </div>
            )}

            {/* Profile */}
            {activeSection === 'profile' && (
              <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-xl font-bold text-[#FA7902] mb-4">My Profile</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {[
                    ['Teacher ID', teacher.teacherId],
                    ['Full Name', teacher.fullName],
                    ['Email', teacher.email],
                    ['Phone', teacher.phone || '—'],
                    ['CNIC', teacher.cnic || '—'],
                    ['Department', teacher.department],
                    ['Qualification', teacher.qualification || '—'],
                    ['Designation', teacher.designation || '—'],
                    ['Weekly Hours', teacher.weeklyHours || '—'],
                    ['Status', teacher.status],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-500 text-xs mb-1">{label}</p>
                      <p className="font-semibold text-gray-800">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Teaching Fields */}
            {activeSection === 'teachingFields' && (
              <div className="space-y-5">
                {/* Header card */}
                <div className="bg-white rounded-xl shadow p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h2 className="text-xl font-bold text-[#FA7902]">Teaching Fields</h2>
                      <p className="text-sm text-gray-500 mt-1">
                        Declare the subjects you are qualified and assigned to teach. This helps the administration and students know your area of expertise.
                      </p>
                    </div>
                    <button
                      onClick={() => { setShowTfForm(v => !v); setTfError(''); }}
                      className="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition text-white"
                      style={{ background: '#FA7902' }}
                    >
                      {showTfForm ? '✕ Cancel' : '+ Add Subject'}
                    </button>
                  </div>

                  {/* Add form */}
                  {showTfForm && (
                    <form onSubmit={handleAddTeachingField} className="mt-5 border-t border-gray-100 pt-5 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}>Subject / Course Name *</label>
                          <input
                            type="text" required
                            value={tfForm.subject}
                            onChange={e => setTfForm({ ...tfForm, subject: e.target.value })}
                            className={inputCls}
                            placeholder="e.g. Programming Fundamentals"
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Program</label>
                          <input
                            type="text"
                            value={tfForm.program}
                            onChange={e => setTfForm({ ...tfForm, program: e.target.value })}
                            className={inputCls}
                            placeholder="e.g. BSCS, BIT, BS Math"
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Department (leave blank to use your dept.)</label>
                          <select
                            value={tfForm.department}
                            onChange={e => setTfForm({ ...tfForm, department: e.target.value })}
                            className={inputCls}
                          >
                            <option value="">— My Department ({teacher.department}) —</option>
                            {deptList.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>Brief Description (optional)</label>
                          <input
                            type="text"
                            value={tfForm.description}
                            onChange={e => setTfForm({ ...tfForm, description: e.target.value })}
                            className={inputCls}
                            placeholder="e.g. C/C++ based introductory course"
                          />
                        </div>
                      </div>
                      {tfError && <p className="text-red-600 text-sm">{tfError}</p>}
                      <button type="submit" disabled={tfSaving}
                        className="px-6 py-2 rounded-lg text-sm font-semibold text-white transition disabled:opacity-50"
                        style={{ background: '#FA7902' }}>
                        {tfSaving ? 'Saving…' : 'Save Teaching Field'}
                      </button>
                    </form>
                  )}
                </div>

                {/* Success flash */}
                {tfSuccess && (
                  <div className="bg-green-50 border border-green-200 text-green-700 text-sm font-medium px-4 py-3 rounded-xl">{tfSuccess}</div>
                )}

                {/* Fields list */}
                <div className="bg-white rounded-xl shadow overflow-hidden">
                  {tfLoading ? (
                    <div className="p-10 text-center text-gray-400 text-sm">Loading…</div>
                  ) : tfFields.length === 0 ? (
                    <div className="p-10 text-center">
                      <p className="text-4xl mb-3">📋</p>
                      <p className="text-gray-500 font-medium">No teaching fields added yet.</p>
                      <p className="text-gray-400 text-sm mt-1">Click "+ Add Subject" to declare what you teach.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-orange-50 border-b border-orange-100">
                        <tr>
                          {['#', 'Subject / Course', 'Program', 'Department', 'Description', ''].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {tfFields.map((f, idx) => (
                          <tr key={f._id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                            <td className="px-4 py-3 font-semibold text-gray-800">{f.subject}</td>
                            <td className="px-4 py-3 text-gray-600">{f.program || <span className="text-gray-300">—</span>}</td>
                            <td className="px-4 py-3 text-gray-600">{f.department || teacher.department}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{f.description || <span className="text-gray-300">—</span>}</td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handleDeleteTeachingField(f._id)}
                                disabled={tfDeleting === f._id}
                                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition disabled:opacity-40"
                              >
                                {tfDeleting === f._id ? '…' : 'Remove'}
                              </button>
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

            {/* My Classes */}
            {activeSection === 'myClasses' && (
              <div className="space-y-6">
                {/* Ongoing Classes — assigned by HOD, read-only here */}
                <div className="bg-white rounded-xl shadow p-6">
                  <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                    <h2 className="text-xl font-bold text-[#FA7902]">My Assigned Classes</h2>
                    {(() => {
                      const activeCount = ocClasses.filter(c => c.status === 'active').length;
                      const cap = teacher.extraSubjectAllowed ? 5 : 4;
                      return (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${activeCount >= cap ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-[#FA7902]'}`}>
                          {activeCount} / {cap} subjects
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-xs text-gray-400 mb-4">
                    Classes and subjects are assigned by your Head of Department. Contact your HOD to have a class added, changed, or removed.
                  </p>

                  {/* Class List */}
                  {ocLoading ? (
                    <p className="text-gray-500 text-sm">Loading...</p>
                  ) : ocClasses.length === 0 ? (
                    <p className="text-gray-500 text-sm">No classes assigned yet. Your HOD will assign subjects here.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {ocClasses.map((c) => (
                        <div key={c._id} className="border rounded-xl p-4" style={{borderLeft: '4px solid #FA7902'}}>
                          <p className="font-bold text-gray-800 text-sm">{c.className}</p>
                          <p className="text-gray-600 text-xs">{c.subject}</p>
                          {c.department && <p className="text-gray-400 text-xs mt-0.5">{c.department}{c.program ? ` · ${c.program}` : ''}</p>}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.status === 'active' ? 'bg-green-100 text-green-700' : c.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{c.status}</span>
                            {c.timeSession && <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.timeSession === 'Morning' ? 'bg-yellow-100 text-yellow-700' : 'bg-indigo-100 text-indigo-700'}`}>{c.timeSession}</span>}
                            {c.semester && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-semibold">{c.semester}</span>}
                            {c.weeklyHours && <span className="bg-orange-100 text-[#FA7902] px-2 py-0.5 rounded-full text-[10px] font-semibold">{c.weeklyHours}h/wk</span>}
                          </div>
                          {(c.days?.length > 0 || c.startTime) && (
                            <p className="text-xs text-gray-400 mt-1">{c.days?.map(d => d.slice(0,3)).join(' · ')}{c.startTime ? ` · ${c.startTime}–${c.endTime}` : ''}{c.room ? ` · ${c.room}` : ''}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Courses / Subjects */}
                <div className="bg-white rounded-xl shadow p-6">
                  <h2 className="text-xl font-bold text-[#FA7902] mb-4">Courses / Subjects Taught</h2>
                  {teacher.classesTaught?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {teacher.classesTaught.map((cls, i) => (
                        <div key={i} className="border-l-4 border-[#FA7902] bg-gray-50 p-3 rounded text-sm font-medium text-gray-700">
                          {cls}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No courses assigned yet. Update your profile to add courses.</p>
                  )}
                </div>
              </div>
            )}

            {/* ── Attendance ── */}
            {activeSection === 'attendance' && (
              <div className="space-y-5">
                {/* Header + sub-tabs */}
                <div className="bg-white rounded-xl shadow p-5">
                  <h2 className="text-2xl font-bold text-[#FA7902]">Attendance</h2>
                  <p className="text-xs text-gray-400 mt-0.5 mb-4">Manage attendance for your classes.</p>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { key: 'take',   label: '✅ Take Attendance' },
                      { key: 'edit',   label: '✏️ Edit Attendance' },
                      { key: 'report', label: '📊 Attendance Reports' },
                    ].map(t => (
                      <button key={t.key} onClick={() => { setAtTab(t.key); setAtError(''); setAtSuccess(''); setAtEditSession(null); setAtReport(null); }}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${atTab === t.key ? 'bg-[#FA7902] text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── TAKE ATTENDANCE ── */}
                {atTab === 'take' && (
                  <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="font-bold text-gray-700 mb-4">Take Attendance</h3>
                    <Alert type="error" message={atError} />
                    <Alert type="success" message={atSuccess} />
                    <form onSubmit={handleTakeAttendance} className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}>Select Class *</label>
                          <select value={atClassId} onChange={async e => {
                            setAtClassId(e.target.value);
                            setAtRecords([]);
                            if (e.target.value) await loadRosterFromLastSession(e.target.value);
                          }} className={inputCls} required>
                            <option value="">— Choose a class —</option>
                            {ocClasses.filter(c => c.status === 'active').map(c => (
                              <option key={c._id} value={c._id}>{c.subject} — {c.className} ({c.semester || 'N/A'})</option>
                            ))}
                          </select>
                          {atClassId && <p className="text-xs text-gray-400 mt-1">Roster auto-loaded from last session. You can add/remove students below.</p>}
                        </div>
                        <div>
                          <label className={labelCls}>Date *</label>
                          <input type="date" value={atDate} onChange={e => setAtDate(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            className={inputCls} required />
                        </div>
                      </div>

                      {/* Make-up class */}
                      <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer">
                          <input type="checkbox" checked={atIsMakeup}
                            onChange={e => { setAtIsMakeup(e.target.checked); if (!e.target.checked) { setAtMakeupFor(''); setAtMakeupReason(''); } }}
                            className="w-4 h-4 accent-[#FA7902]" />
                          This is a make-up class
                        </label>
                        {atIsMakeup && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                            <div>
                              <label className={labelCls}>Missed class date *</label>
                              <input type="date" value={atMakeupFor} onChange={e => setAtMakeupFor(e.target.value)}
                                max={new Date().toISOString().split('T')[0]}
                                className={inputCls} required={atIsMakeup} />
                              <p className="text-xs text-gray-400 mt-1">Must be within the last 60 days.</p>
                            </div>
                            <div>
                              <label className={labelCls}>Reason *</label>
                              <input value={atMakeupReason} onChange={e => setAtMakeupReason(e.target.value)}
                                maxLength={500} placeholder="e.g. Class cancelled due to public holiday"
                                className={inputCls} required={atIsMakeup} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Student rows */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className={labelCls}>Students ({atRecords.length})</label>
                          <button type="button" onClick={() => setAtRecords(p => [...p, atEmptyRecord()])}
                            className="text-xs bg-[#FA7902] text-white px-3 py-1.5 rounded-lg font-semibold hover:opacity-90">
                            + Add Student
                          </button>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="py-2 px-2 text-left font-bold text-gray-500 uppercase">#</th>
                                <th className="py-2 px-2 text-left font-bold text-gray-500 uppercase">Reg No *</th>
                                <th className="py-2 px-2 text-left font-bold text-gray-500 uppercase">Student Name *</th>
                                <th className="py-2 px-2 text-left font-bold text-gray-500 uppercase">Status</th>
                                <th className="py-2 px-2"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {atRecords.map((r, i) => (
                                <tr key={i} className="border-b border-gray-50">
                                  <td className="py-2 px-2 text-gray-400">{i + 1}</td>
                                  <td className="py-2 px-1">
                                    <input value={r.registrationNo} required
                                      onChange={e => setAtRecords(p => p.map((x, j) => j === i ? { ...x, registrationNo: e.target.value } : x))}
                                      className="w-28 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#FA7902]"
                                      placeholder="Reg No" />
                                  </td>
                                  <td className="py-2 px-1">
                                    <input value={r.studentName} required
                                      onChange={e => setAtRecords(p => p.map((x, j) => j === i ? { ...x, studentName: e.target.value } : x))}
                                      className="w-36 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#FA7902]"
                                      placeholder="Full Name" />
                                  </td>
                                  <td className="py-2 px-1">
                                    <div className="flex gap-1 flex-wrap">
                                      {['Present', 'Absent', 'Late', 'Excused'].map(s => (
                                        <button key={s} type="button"
                                          onClick={() => setAtRecords(p => p.map((x, j) => j === i ? { ...x, status: s } : x))}
                                          className={`px-2 py-1 rounded text-xs font-semibold transition ${r.status === s
                                            ? s === 'Present' ? 'bg-green-500 text-white'
                                              : s === 'Absent' ? 'bg-red-500 text-white'
                                              : s === 'Late' ? 'bg-yellow-500 text-white'
                                              : 'bg-gray-400 text-white'
                                            : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                          {s}
                                        </button>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="py-2 px-1">
                                    <button type="button" onClick={() => setAtRecords(p => p.filter((_, j) => j !== i))}
                                      className="text-red-400 hover:text-red-600 font-bold text-base px-1">×</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {atRecords.length === 0 && (
                          <p className="text-center text-gray-400 text-sm py-4">No students added. Click &ldquo;+ Add Student&rdquo; or select a class to auto-load the last roster.</p>
                        )}
                      </div>

                      <button type="submit" disabled={atSaving}
                        className="bg-[#FA7902] text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:opacity-90 transition disabled:opacity-60">
                        {atSaving ? 'Saving…' : '✅ Submit Attendance'}
                      </button>
                    </form>
                  </div>
                )}

                {/* ── EDIT ATTENDANCE ── */}
                {atTab === 'edit' && (
                  <div className="space-y-4">
                    <div className="bg-white rounded-xl shadow p-5">
                      <h3 className="font-bold text-gray-700 mb-3">Edit Attendance</h3>
                      <Alert type="error" message={atError} />
                      <Alert type="success" message={atSuccess} />
                      <div>
                        <label className={labelCls}>Select Class</label>
                        <select value={atClassId} onChange={e => { setAtClassId(e.target.value); setAtEditSession(null); fetchAtSessions(e.target.value); }}
                          className={inputCls}>
                          <option value="">— Choose a class —</option>
                          {ocClasses.filter(c => c.status === 'active').map(c => (
                            <option key={c._id} value={c._id}>{c.subject} — {c.className} ({c.semester || 'N/A'})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {atClassId && !atEditSession && (
                      <div className="bg-white rounded-xl shadow p-5">
                        <h4 className="font-bold text-gray-600 mb-3 text-sm">Past Sessions</h4>
                        {atSessionsLoading ? <p className="text-gray-400 text-sm">Loading…</p>
                        : atSessions.length === 0 ? <p className="text-gray-400 text-sm">No sessions recorded yet for this class.</p>
                        : (
                          <div className="space-y-2">
                            {atSessions.map(s => {
                              const present = s.records.filter(r => r.status === 'Present').length;
                              const total   = s.records.length;
                              return (
                                <div key={s._id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50">
                                  <div>
                                    <p className="font-semibold text-gray-800 text-sm">{new Date(s.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{total} students · {present} present · {total - present} absent</p>
                                    {formatMakeupLabel(s) && (
                                      <p className="text-xs font-semibold text-indigo-600 mt-1">🔁 {formatMakeupLabel(s)}</p>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={() => setAtEditSession({ ...s, records: s.records.map(r => ({ ...r })) })}
                                      className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[#FA7902] text-[#FA7902] hover:bg-orange-50 transition">
                                      Edit
                                    </button>
                                    <button onClick={() => handleDeleteAtSession(s._id)}
                                      className="px-3 py-1.5 text-xs font-bold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition">
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {atEditSession && (
                      <div className="bg-white rounded-xl shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-gray-700">Editing: {new Date(atEditSession.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h4>
                          <button onClick={() => setAtEditSession(null)} className="text-gray-400 hover:text-gray-600 text-sm">← Back</button>
                        </div>
                        <div className="mb-4">
                          <label className={labelCls}>Date</label>
                          <input type="date" value={atEditSession.date?.split?.('T')[0] || atEditSession.date}
                            onChange={e => setAtEditSession(p => ({ ...p, date: e.target.value }))}
                            max={new Date().toISOString().split('T')[0]}
                            className={`${inputCls} max-w-xs`} />
                        </div>
                        <div className="mb-4 border border-gray-200 rounded-xl p-4 bg-gray-50">
                          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer">
                            <input type="checkbox" checked={!!atEditSession.isMakeup}
                              onChange={e => setAtEditSession(p => ({ ...p, isMakeup: e.target.checked, ...(e.target.checked ? {} : { makeupFor: '', makeupReason: '' }) }))}
                              className="w-4 h-4 accent-[#FA7902]" />
                            This is a make-up class
                          </label>
                          {atEditSession.isMakeup && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                              <div>
                                <label className={labelCls}>Missed class date *</label>
                                <input type="date" value={atEditSession.makeupFor?.split?.('T')[0] || atEditSession.makeupFor || ''}
                                  onChange={e => setAtEditSession(p => ({ ...p, makeupFor: e.target.value }))}
                                  max={new Date().toISOString().split('T')[0]}
                                  className={inputCls} required />
                              </div>
                              <div>
                                <label className={labelCls}>Reason *</label>
                                <input value={atEditSession.makeupReason || ''}
                                  onChange={e => setAtEditSession(p => ({ ...p, makeupReason: e.target.value }))}
                                  maxLength={500} className={inputCls} required />
                              </div>
                            </div>
                          )}
                        </div>
                        <form onSubmit={handleEditAttendanceSession} className="space-y-4">
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-gray-200 bg-gray-50">
                                  <th className="py-2 px-2 text-left font-bold text-gray-500 uppercase">#</th>
                                  <th className="py-2 px-2 text-left font-bold text-gray-500 uppercase">Reg No</th>
                                  <th className="py-2 px-2 text-left font-bold text-gray-500 uppercase">Name</th>
                                  <th className="py-2 px-2 text-left font-bold text-gray-500 uppercase">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {atEditSession.records.map((r, i) => (
                                  <tr key={i} className="border-b border-gray-50">
                                    <td className="py-2 px-2 text-gray-400">{i + 1}</td>
                                    <td className="py-2 px-2 font-mono text-gray-600">{r.registrationNo}</td>
                                    <td className="py-2 px-2 text-gray-800">{r.studentName}</td>
                                    <td className="py-2 px-1">
                                      <div className="flex gap-1 flex-wrap">
                                        {['Present', 'Absent', 'Late', 'Excused'].map(s => (
                                          <button key={s} type="button"
                                            onClick={() => setAtEditSession(p => ({ ...p, records: p.records.map((x, j) => j === i ? { ...x, status: s } : x) }))}
                                            className={`px-2 py-1 rounded text-xs font-semibold transition ${r.status === s
                                              ? s === 'Present' ? 'bg-green-500 text-white'
                                                : s === 'Absent' ? 'bg-red-500 text-white'
                                                : s === 'Late' ? 'bg-yellow-500 text-white'
                                                : 'bg-gray-400 text-white'
                                              : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                            {s}
                                          </button>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="flex gap-3">
                            <button type="submit" disabled={atSaving}
                              className="bg-[#FA7902] text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:opacity-90 transition disabled:opacity-60">
                              {atSaving ? 'Saving…' : '💾 Save Changes'}
                            </button>
                            <button type="button" onClick={() => setAtEditSession(null)}
                              className="px-6 py-2.5 rounded-lg text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50">
                              Cancel
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                )}

                {/* ── ATTENDANCE REPORTS ── */}
                {atTab === 'report' && (
                  <div className="space-y-4">
                    <div className="bg-white rounded-xl shadow p-5">
                      <h3 className="font-bold text-gray-700 mb-3">Attendance Report</h3>
                      <div>
                        <label className={labelCls}>Select Class</label>
                        <select value={atClassId} onChange={e => { setAtClassId(e.target.value); setAtReport(null); fetchAtReport(e.target.value); }}
                          className={inputCls}>
                          <option value="">— Choose a class —</option>
                          {ocClasses.filter(c => c.status === 'active').map(c => (
                            <option key={c._id} value={c._id}>{c.subject} — {c.className} ({c.semester || 'N/A'})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {atReportLoading && <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400 text-sm">Loading report…</div>}

                    {atReport && !atReportLoading && (
                      <div className="bg-white rounded-xl shadow p-5">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 text-center">
                            <p className="text-2xl font-bold text-[#FA7902]">{atReport.sessions}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Total Sessions</p>
                          </div>
                          <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-center">
                            <p className="text-2xl font-bold text-green-600">{atReport.report.length}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Students</p>
                          </div>
                        </div>
                        {atReport.report.length === 0 ? (
                          <p className="text-gray-400 text-sm">No attendance data yet.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-gray-200 bg-gray-50">
                                  <th className="py-2 px-3 text-left font-bold text-gray-500 uppercase">#</th>
                                  <th className="py-2 px-3 text-left font-bold text-gray-500 uppercase">Reg No</th>
                                  <th className="py-2 px-3 text-left font-bold text-gray-500 uppercase">Name</th>
                                  <th className="py-2 px-3 text-center font-bold text-green-600 uppercase">Present</th>
                                  <th className="py-2 px-3 text-center font-bold text-red-500 uppercase">Absent</th>
                                  <th className="py-2 px-3 text-center font-bold text-yellow-600 uppercase">Late</th>
                                  <th className="py-2 px-3 text-center font-bold text-gray-500 uppercase">Excused</th>
                                  <th className="py-2 px-3 text-center font-bold text-indigo-600 uppercase">Attendance %</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {atReport.report.sort((a, b) => a.studentName.localeCompare(b.studentName)).map((s, i) => (
                                  <tr key={s.registrationNo} className={s.attendancePercent < 75 ? 'bg-red-50/40' : ''}>
                                    <td className="py-2.5 px-3 text-gray-400">{i + 1}</td>
                                    <td className="py-2.5 px-3 font-mono text-gray-600">{s.registrationNo}</td>
                                    <td className="py-2.5 px-3 font-semibold text-gray-800">{s.studentName}</td>
                                    <td className="py-2.5 px-3 text-center font-semibold text-green-600">{s.Present}</td>
                                    <td className="py-2.5 px-3 text-center font-semibold text-red-500">{s.Absent}</td>
                                    <td className="py-2.5 px-3 text-center font-semibold text-yellow-600">{s.Late}</td>
                                    <td className="py-2.5 px-3 text-center text-gray-500">{s.Excused}</td>
                                    <td className="py-2.5 px-3 text-center">
                                      <span className={`font-bold text-sm ${s.attendancePercent >= 75 ? 'text-green-600' : 'text-red-600'}`}>
                                        {s.attendancePercent}%
                                      </span>
                                      {s.attendancePercent < 75 && <span className="ml-1 text-red-400 text-xs">⚠</span>}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <p className="text-xs text-gray-400 mt-3">⚠ Students below 75% attendance are highlighted in red. Late is counted as attending.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

            {/* Date sheets section removed — managed by Examination portal only */}

            {/* GPA Results section removed — unified into Results (markSheets) */}
            {false && (
              <div className="space-y-5">
                <div className="bg-white rounded-xl shadow p-5">
                  <h2 className="text-xl font-bold text-[#FA7902]">GPA Results</h2>
                  <p className="text-sm text-gray-500 mt-1"></p>
                  {/* Sub-tabs */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => setGpaTab('upload')}
                      className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${gpaTab === 'upload' ? 'bg-[#FA7902] text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                      + Upload New Result
                    </button>
                    <button
                      onClick={() => { setGpaTab('list'); fetchResults(); }}
                      className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${gpaTab === 'list' ? 'bg-[#FA7902] text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                      My Uploads {results.length > 0 && `(${results.length})`}
                    </button>
                  </div>
                </div>

                {/* Upload tab */}
                {gpaTab === 'upload' && (
                <div className="bg-white rounded-xl shadow p-6">
                <Alert type="error" message={rError} />
                <Alert type="success" message={rSuccess} />
                <form onSubmit={handleUploadResults} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Title *</label>
                      <input type="text" required value={rForm.title}
                        onChange={(e) => setRForm({ ...rForm, title: e.target.value })}
                        className={inputCls} placeholder="e.g. Mid Term Results Semester 3" />
                    </div>
                    <div>
                      <label className={labelCls}>Exam Type *</label>
                      <select required value={rForm.examType}
                        onChange={(e) => setRForm({ ...rForm, examType: e.target.value })}
                        className={inputCls}>
                        <option value="">Select type</option>
                        <option>Mid</option>
                        <option>Final</option>
                        <option>Quiz</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Semester</label>
                      <select value={rForm.semester}
                        onChange={(e) => setRForm({ ...rForm, semester: e.target.value })}
                        className={inputCls}>
                        <option value="">All Semesters</option>
                        {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                          <option key={n} value={`Semester ${n}`}>Semester {n}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Department</label>
                      <select value={rForm.department}
                        onChange={(e) => setRForm({ ...rForm, department: e.target.value })}
                        className={inputCls}>
                        <option value="">Select department</option>
                        {deptList.map((d) => <option key={d.name}>{d.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Program</label>
                      <input type="text" value={rForm.program}
                        onChange={(e) => setRForm({ ...rForm, program: e.target.value })}
                        className={inputCls} placeholder="e.g. BSCS" />
                    </div>
                    <div>
                      <label className={labelCls}>Session</label>
                      <input type="text" value={rForm.session}
                        onChange={(e) => setRForm({ ...rForm, session: e.target.value })}
                        className={inputCls} placeholder="e.g. 2024-2028" />
                    </div>
                    <div>
                      <label className={labelCls}>Time Session</label>
                      <select value={rForm.timeSession}
                        onChange={(e) => setRForm({ ...rForm, timeSession: e.target.value })}
                        className={inputCls}>
                        <option value="">Select session</option>
                        <option value="Morning">🌅 Morning</option>
                        <option value="Evening">🌙 Evening</option>
                      </select>
                    </div>
                  </div>

                  {/* Passing Marks */}
                  <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 flex items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-[#FA7902] font-semibold text-sm mb-1">Passing GPA Threshold</label>
                      <p className="text-xs text-[#FA7902]">Students with Obtained GPA ≥ this value are passing. Leave blank if not applicable.</p>
                    </div>
                    <input
                      type="number" min="0" step="0.01" value={rForm.passingMarks}
                      onChange={(e) => setRForm({ ...rForm, passingMarks: e.target.value })}
                      className="w-24 px-3 py-2 border border-orange-300 rounded-lg text-sm text-center font-bold focus:outline-none focus:border-[#FA7902]"
                      placeholder="e.g. 2.5" />
                  </div>

                  {/* Student Results Table */}
                  <div>
                    <label className={labelCls}>Student Results</label>
                    <div className="overflow-x-auto border rounded-lg">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-orange-50">
                            <th className="border-b px-3 py-2 text-left">Reg No</th>
                            <th className="border-b px-3 py-2 text-left">Student Name</th>
                            <th className="border-b px-3 py-2 text-left">Father Name</th>
                            <th className="border-b px-3 py-2 text-center">Obtained GPA</th>
                            <th className="border-b px-3 py-2 text-center">Total GPA</th>
                            <th className="border-b px-3 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {rRows.map((row, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-2 py-1">
                                <input type="text" value={row.registrationNo}
                                  onChange={(e) => updateRow(i, 'registrationNo', e.target.value)}
                                  className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-[#FA7902]"
                                  placeholder="2024-CS-001" />
                              </td>
                              <td className="px-2 py-1">
                                <input type="text" value={row.studentName}
                                  onChange={(e) => updateRow(i, 'studentName', e.target.value)}
                                  className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-[#FA7902]"
                                  placeholder="Full name" />
                              </td>
                              <td className="px-2 py-1">
                                <input type="text" value={row.fatherName}
                                  onChange={(e) => updateRow(i, 'fatherName', e.target.value)}
                                  className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-[#FA7902]"
                                  placeholder="Father's name" />
                              </td>
                              <td className="px-2 py-1">
                                <input type="number" step="0.01" value={row.obtainedGPA}
                                  onChange={(e) => updateRow(i, 'obtainedGPA', e.target.value)}
                                  className="w-20 border rounded px-2 py-1 text-xs focus:outline-none focus:border-[#FA7902] text-center"
                                  placeholder="3.5" />
                              </td>
                              <td className="px-2 py-1">
                                <input type="number" step="0.01" value={row.totalGPA}
                                  onChange={(e) => updateRow(i, 'totalGPA', e.target.value)}
                                  className="w-20 border rounded px-2 py-1 text-xs focus:outline-none focus:border-[#FA7902] text-center"
                                  placeholder="4.0" />
                              </td>
                              <td className="px-2 py-1">
                                <button type="button" onClick={() => setRRows(rRows.filter((_, idx) => idx !== i))}
                                  className="text-red-500 hover:text-red-700 font-bold text-base">×</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <button type="button" onClick={() => setRRows([...rRows, emptyResultRow()])}
                      className="mt-2 text-sm text-[#FA7902] hover:underline font-semibold">
                      + Add Row
                    </button>
                  </div>

                  <div>
                    <label className={labelCls}>Upload PDF (optional)</label>
                    <input type="file" accept=".pdf"
                      onChange={(e) => setRFile(e.target.files[0])}
                      className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-orange-50 file:text-[#FA7902] file:font-semibold hover:file:bg-orange-100" />
                  </div>
                  <button type="submit" disabled={rLoading}
                    className="bg-[#FA7902] text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition">
                    {rLoading ? 'Uploading...' : 'Upload Results'}
                  </button>
                </form>
                </div>
                )}

                {/* List tab — My Uploads */}
                {gpaTab === 'list' && (
                  <div className="bg-white rounded-xl shadow p-6">
                    {/* Delete confirmation dialog */}
                    {deletingResultId && (
                      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
                          <p className="font-bold text-gray-800 mb-2">Delete Result?</p>
                          <p className="text-sm text-gray-500 mb-5">This action cannot be undone. The result and all student records in it will be permanently deleted.</p>
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleDeleteResult(deletingResultId)}
                              disabled={deleteResultLoading}
                              className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold text-sm hover:bg-red-700 transition">
                              {deleteResultLoading ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                            <button onClick={() => setDeletingResultId(null)}
                              className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg font-semibold text-sm hover:bg-gray-50 transition">
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {dataLoading ? (
                      <p className="text-gray-500 text-sm">Loading...</p>
                    ) : results.length === 0 ? (
                      <div className="text-center py-10">
                        <p className="text-gray-400 text-sm">No results uploaded yet.</p>
                        <button onClick={() => setGpaTab('upload')} className="mt-3 text-sm text-[#FA7902] font-semibold hover:underline">+ Upload your first result</button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {results.map((r) => (
                          <div key={r._id} className="border rounded-xl overflow-hidden">
                            {editingResult?._id === r._id ? (
                              <div className="p-5">
                                <h3 className="font-bold text-[#FA7902] mb-3 text-sm">Edit Result</h3>
                                <Alert type="error" message={editResultError} />
                                <Alert type="success" message={editResultSuccess} />
                                <form onSubmit={handleEditResult} className="space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <label className={labelCls}>Title *</label>
                                      <input type="text" required value={editResultForm.title}
                                        onChange={(e) => setEditResultForm({ ...editResultForm, title: e.target.value })}
                                        className={inputCls} />
                                    </div>
                                    <div>
                                      <label className={labelCls}>Exam Type *</label>
                                      <select required value={editResultForm.examType}
                                        onChange={(e) => setEditResultForm({ ...editResultForm, examType: e.target.value })}
                                        className={inputCls}>
                                        <option value="">Select type</option>
                                        <option>Mid</option>
                                        <option>Final</option>
                                        <option>Quiz</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className={labelCls}>Semester</label>
                                      <select value={editResultForm.semester}
                                        onChange={(e) => setEditResultForm({ ...editResultForm, semester: e.target.value })}
                                        className={inputCls}>
                                        <option value="">All Semesters</option>
                                        {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                                          <option key={n} value={`Semester ${n}`}>Semester {n}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className={labelCls}>Department</label>
                                      <select value={editResultForm.department}
                                        onChange={(e) => setEditResultForm({ ...editResultForm, department: e.target.value })}
                                        className={inputCls}>
                                        <option value="">Select department</option>
                                        {deptList.map((d) => <option key={d.name}>{d.name}</option>)}
                                      </select>
                                    </div>
                                    <div>
                                      <label className={labelCls}>Program</label>
                                      <input type="text" value={editResultForm.program}
                                        onChange={(e) => setEditResultForm({ ...editResultForm, program: e.target.value })}
                                        className={inputCls} />
                                    </div>
                                    <div>
                                      <label className={labelCls}>Session</label>
                                      <input type="text" value={editResultForm.session}
                                        onChange={(e) => setEditResultForm({ ...editResultForm, session: e.target.value })}
                                        className={inputCls} />
                                    </div>
                                    <div>
                                      <label className={labelCls}>Time Session</label>
                                      <select value={editResultForm.timeSession}
                                        onChange={(e) => setEditResultForm({ ...editResultForm, timeSession: e.target.value })}
                                        className={inputCls}>
                                        <option value="">Select session</option>
                                        <option value="Morning">🌅 Morning</option>
                                        <option value="Evening">🌙 Evening</option>
                                      </select>
                                    </div>
                                  </div>

                                  <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 flex items-center gap-4">
                                    <div className="flex-1">
                                      <label className="block text-[#FA7902] font-semibold text-sm mb-1">Passing GPA Threshold</label>
                                      <p className="text-xs text-[#FA7902]">Students with Obtained GPA ≥ this value are passing.</p>
                                    </div>
                                    <input
                                      type="number" min="0" step="0.01" value={editResultForm.passingMarks}
                                      onChange={(e) => setEditResultForm({ ...editResultForm, passingMarks: e.target.value })}
                                      className="w-24 px-3 py-2 border border-orange-300 rounded-lg text-sm text-center font-bold focus:outline-none focus:border-[#FA7902]"
                                      placeholder="e.g. 2.5" />
                                  </div>

                                  <div>
                                    <label className={labelCls}>Student Results</label>
                                    <div className="overflow-x-auto border rounded-lg">
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="bg-orange-50">
                                            <th className="border-b px-3 py-2 text-left">Reg No</th>
                                            <th className="border-b px-3 py-2 text-left">Student Name</th>
                                            <th className="border-b px-3 py-2 text-left">Father Name</th>
                                            <th className="border-b px-3 py-2 text-center">Obtained GPA</th>
                                            <th className="border-b px-3 py-2 text-center">Total GPA</th>
                                            <th className="border-b px-3 py-2"></th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {editResultRows.map((row, i) => (
                                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                              <td className="px-2 py-1">
                                                <input type="text" value={row.registrationNo}
                                                  onChange={(e) => updateEditRow(i, 'registrationNo', e.target.value)}
                                                  className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-[#FA7902]"
                                                  placeholder="2024-CS-001" />
                                              </td>
                                              <td className="px-2 py-1">
                                                <input type="text" value={row.studentName}
                                                  onChange={(e) => updateEditRow(i, 'studentName', e.target.value)}
                                                  className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-[#FA7902]"
                                                  placeholder="Full name" />
                                              </td>
                                              <td className="px-2 py-1">
                                                <input type="text" value={row.fatherName}
                                                  onChange={(e) => updateEditRow(i, 'fatherName', e.target.value)}
                                                  className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-[#FA7902]"
                                                  placeholder="Father's name" />
                                              </td>
                                              <td className="px-2 py-1">
                                                <input type="number" step="0.01" value={row.obtainedGPA}
                                                  onChange={(e) => updateEditRow(i, 'obtainedGPA', e.target.value)}
                                                  className="w-20 border rounded px-2 py-1 text-xs focus:outline-none focus:border-[#FA7902] text-center"
                                                  placeholder="3.5" />
                                              </td>
                                              <td className="px-2 py-1">
                                                <input type="number" step="0.01" value={row.totalGPA}
                                                  onChange={(e) => updateEditRow(i, 'totalGPA', e.target.value)}
                                                  className="w-20 border rounded px-2 py-1 text-xs focus:outline-none focus:border-[#FA7902] text-center"
                                                  placeholder="4.0" />
                                              </td>
                                              <td className="px-2 py-1">
                                                <button type="button"
                                                  onClick={() => setEditResultRows(editResultRows.filter((_, idx) => idx !== i))}
                                                  className="text-red-500 hover:text-red-700 font-bold text-base">×</button>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                    <button type="button"
                                      onClick={() => setEditResultRows([...editResultRows, emptyResultRow()])}
                                      className="mt-2 text-sm text-[#FA7902] hover:underline font-semibold">
                                      + Add Row
                                    </button>
                                  </div>

                                  <div>
                                    <label className={labelCls}>Replace PDF (optional)</label>
                                    <input type="file" accept=".pdf"
                                      onChange={(e) => setEditResultFile(e.target.files[0])}
                                      className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-orange-50 file:text-[#FA7902] file:font-semibold hover:file:bg-orange-100" />
                                    {r.fileUrl && !editResultFile && (
                                      <p className="text-xs text-gray-400 mt-1">Current file: {r.fileName}</p>
                                    )}
                                  </div>

                                  <div className="flex gap-3 pt-1">
                                    <button type="submit" disabled={editResultLoading}
                                      className="bg-[#FA7902] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition">
                                      {editResultLoading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    <button type="button" onClick={() => setEditingResult(null)}
                                      className="px-5 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 transition">
                                      Cancel
                                    </button>
                                  </div>
                                </form>
                              </div>
                            ) : (
                              <div className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-gray-800">{r.title}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {r.examType} • {r.semester} • {r.program} • {r.department}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      {new Date(r.createdAt).toLocaleDateString()} •{' '}
                                      <span className={r.isPublished ? 'text-green-600' : 'text-orange-500'}>
                                        {r.isPublished ? 'Published' : 'Unpublished'}
                                      </span>
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      {r.results?.length > 0 && `${r.results.length} student record(s)`}
                                      {r.passingMarks != null && (
                                        <span className="ml-2 bg-orange-100 text-[#FA7902] font-semibold px-2 py-0.5 rounded">
                                          Pass ≥ {r.passingMarks}
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <button onClick={() => startEditResult(r)}
                                      className="border border-[#FA7902] text-[#FA7902] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-50 transition">
                                      Edit
                                    </button>
                                    {r.fileUrl && (
                                      <a href={fileUrl(r.fileUrl)} target="_blank" rel="noreferrer"
                                        className="bg-[#FA7902] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90">
                                        Download
                                      </a>
                                    )}
                                    <button onClick={() => setDeletingResultId(r._id)}
                                      className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition">
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Assignments ── */}
            {activeSection === 'assignments' && (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-2xl font-bold text-[#FA7902]">Assignments</h2>
                  <button onClick={() => { setShowAForm(v => !v); setAError(''); setASuccess(''); }}
                    className="bg-[#FA7902] text-white px-5 py-2 min-h-11 rounded-lg text-sm font-semibold hover:opacity-90 transition">
                    {showAForm ? '✕ Cancel' : '+ New Assignment'}
                  </button>
                </div>

                <Alert type="error" message={aError} />
                <Alert type="success" message={aSuccess} />

                {/* Create form */}
                {showAForm && (
                  <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="font-bold text-gray-700 mb-4">Create New Assignment</h3>
                    <form onSubmit={handlePostAssignment} className="space-y-4">
                      {/* Class selector */}
                      <div>
                        <label className={labelCls}>Assign to Class *</label>
                        {ocClasses.filter(c => c.status === 'active').length === 0 ? (
                          <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
                            You have no active classes. Please add a class under "My Classes" first.
                          </p>
                        ) : (
                          <select required value={aForm.ongoingClassId}
                            onChange={(e) => setAForm({ ...aForm, ongoingClassId: e.target.value })}
                            className={inputCls}>
                            <option value="">— Select a class —</option>
                            {ocClasses.filter(c => c.status === 'active').map(c => (
                              <option key={c._id} value={c._id}>
                                {c.subject} — {c.className} ({c.semester || 'N/A'}{c.program ? `, ${c.program}` : ''})
                              </option>
                            ))}
                          </select>
                        )}
                        {/* Auto-filled class info */}
                        {aForm.ongoingClassId && (() => {
                          const cls = ocClasses.find(c => c._id === aForm.ongoingClassId);
                          return cls ? (
                            <div className="mt-2 bg-orange-50 border border-orange-100 rounded-lg px-4 py-3 text-xs text-gray-600 grid grid-cols-2 gap-x-4 gap-y-1">
                              <span><strong>Subject:</strong> {cls.subject}</span>
                              <span><strong>Class:</strong> {cls.className}</span>
                              <span><strong>Dept:</strong> {cls.department || '—'}</span>
                              <span><strong>Program:</strong> {cls.program || '—'}</span>
                              <span><strong>Semester:</strong> {cls.semester || '—'}</span>
                              <span><strong>Session:</strong> {cls.academicSession || '—'}</span>
                            </div>
                          ) : null;
                        })()}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className={labelCls}>Title *</label>
                          <input type="text" required value={aForm.title}
                            onChange={(e) => setAForm({ ...aForm, title: e.target.value })}
                            className={inputCls} placeholder="e.g. Assignment 1 – Data Structures" />
                        </div>
                        <div>
                          <label className={labelCls}>Due Date</label>
                          <input type="date" value={aForm.dueDate}
                            onChange={(e) => setAForm({ ...aForm, dueDate: e.target.value })}
                            className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>Total Marks</label>
                          <input type="number" min="1" value={aForm.totalMarks}
                            onChange={(e) => setAForm({ ...aForm, totalMarks: e.target.value })}
                            className={inputCls} placeholder="100" />
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>Description / Instructions</label>
                        <RichTextEditor key={editorKey.current} initialValue="" onChange={(html) => setAForm((f) => ({ ...f, description: html }))} />
                      </div>
                      <div>
                        <label className={labelCls}>Attachment (PDF or Image, optional)</label>
                        <input type="file" accept=".pdf,image/*"
                          onChange={(e) => setAFile(e.target.files[0])}
                          className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#FA7902] file:text-white hover:file:opacity-90" />
                      </div>
                      <button type="submit" disabled={aLoading}
                        className="bg-[#FA7902] text-white px-6 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition">
                        {aLoading ? 'Posting...' : 'Post Assignment'}
                      </button>
                    </form>
                  </div>
                )}

                {/* Assignments list */}
                {dataLoading ? (
                  <p className="text-gray-500 text-sm">Loading...</p>
                ) : assignments.length === 0 ? (
                  <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400 text-sm">No assignments posted yet.</div>
                ) : (
                  <div className="space-y-4">
                    {assignments.map((a) => (
                      <div key={a._id} className="bg-white rounded-xl shadow overflow-hidden">
                        {/* Card header */}
                        <div className="p-5 flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-800">{a.title}</h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {a.subject && <span className="bg-[#FA7902] text-white text-xs font-semibold px-2 py-0.5 rounded-full">{a.subject}</span>}
                              {a.className && <span className="bg-gray-100 text-gray-700 text-xs font-semibold px-2 py-0.5 rounded-full">{a.className}</span>}
                              {a.semester && <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">{a.semester}</span>}
                              {a.department && <span className="bg-gray-100 text-gray-500 text-xs font-semibold px-2 py-0.5 rounded-full">{a.department}</span>}
                              {a.dueDate && <span className="bg-red-100 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full">Due: {new Date(a.dueDate).toLocaleDateString()}</span>}
                              {a.totalMarks != null && <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded-full">🏅 {a.totalMarks} marks</span>}
                              {a.fileUrl && <span className="bg-orange-100 text-[#FA7902] text-xs font-semibold px-2 py-0.5 rounded-full">📎 Attachment</span>}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Posted {new Date(a.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            <button onClick={() => openSubmissions(a)}
                              className="text-xs px-3 py-1.5 rounded-lg border border-[#FA7902] text-[#FA7902] font-semibold hover:bg-orange-50 transition">
                              Submissions
                            </button>
                            <button onClick={() => startEditAssignment(a)}
                              className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 font-semibold hover:bg-gray-50 transition">
                              ✏️ Edit
                            </button>
                            {a.fileUrl && (
                              <a href={fileUrl(a.fileUrl)} target="_blank" rel="noreferrer"
                                className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition text-center">
                                ⬇ File
                              </a>
                            )}
                            <button onClick={() => setDeletingAssignmentId(a._id)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition">
                              Delete
                            </button>
                          </div>
                        </div>

                        {/* Inline edit form */}
                        {editingAssignment?._id === a._id && (
                          <div className="border-t border-gray-100 bg-orange-50 p-5">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-bold text-gray-700 text-sm">Edit Assignment</h4>
                              <button type="button" onClick={() => setEditingAssignment(null)} className="text-gray-400 hover:text-gray-600 text-lg font-bold">×</button>
                            </div>
                            <Alert type="error" message={editAError} />
                            <Alert type="success" message={editASuccess} />
                            <form onSubmit={handleEditAssignment} className="space-y-4">
                              {/* Class selector */}
                              <div>
                                <label className={labelCls}>Assign to Class *</label>
                                {ocClasses.filter(c => c.status === 'active').length === 0 ? (
                                  <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
                                    You have no active classes.
                                  </p>
                                ) : (
                                  <select required value={editAForm.ongoingClassId}
                                    onChange={(e) => setEditAForm({ ...editAForm, ongoingClassId: e.target.value })}
                                    className={inputCls}>
                                    <option value="">— Select a class —</option>
                                    {ocClasses.filter(c => c.status === 'active').map(c => (
                                      <option key={c._id} value={c._id}>
                                        {c.subject} — {c.className} ({c.semester || 'N/A'}{c.program ? `, ${c.program}` : ''})
                                      </option>
                                    ))}
                                  </select>
                                )}
                                {editAForm.ongoingClassId && (() => {
                                  const cls = ocClasses.find(c => c._id === editAForm.ongoingClassId);
                                  return cls ? (
                                    <div className="mt-2 bg-orange-50 border border-orange-100 rounded-lg px-4 py-3 text-xs text-gray-600 grid grid-cols-2 gap-x-4 gap-y-1">
                                      <span><strong>Subject:</strong> {cls.subject}</span>
                                      <span><strong>Class:</strong> {cls.className}</span>
                                      <span><strong>Dept:</strong> {cls.department || '—'}</span>
                                      <span><strong>Program:</strong> {cls.program || '—'}</span>
                                      <span><strong>Semester:</strong> {cls.semester || '—'}</span>
                                    </div>
                                  ) : null;
                                })()}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                  <label className={labelCls}>Title *</label>
                                  <input type="text" required value={editAForm.title}
                                    onChange={(e) => setEditAForm({ ...editAForm, title: e.target.value })}
                                    className={inputCls} />
                                </div>
                                <div>
                                  <label className={labelCls}>Due Date</label>
                                  <input type="date" value={editAForm.dueDate}
                                    onChange={(e) => setEditAForm({ ...editAForm, dueDate: e.target.value })}
                                    className={inputCls} />
                                </div>
                                <div>
                                  <label className={labelCls}>Total Marks</label>
                                  <input type="number" min="1" value={editAForm.totalMarks}
                                    onChange={(e) => setEditAForm({ ...editAForm, totalMarks: e.target.value })}
                                    className={inputCls} placeholder="100" />
                                </div>
                              </div>
                              <div>
                                <label className={labelCls}>Description / Instructions</label>
                                <RichTextEditor key={editEditorKey.current} initialValue={editAForm.description} onChange={(html) => setEditAForm((f) => ({ ...f, description: html }))} />
                              </div>
                              <div>
                                <label className={labelCls}>Replace Attachment (optional)</label>
                                <input type="file" accept=".pdf,image/*"
                                  onChange={(e) => setEditAFile(e.target.files[0])}
                                  className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#FA7902] file:text-white hover:file:opacity-90" />
                              </div>
                              <div className="flex gap-2">
                                <button type="submit" disabled={editALoading}
                                  className="bg-[#FA7902] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition">
                                  {editALoading ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button type="button" onClick={() => setEditingAssignment(null)}
                                  className="px-5 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 transition">
                                  Cancel
                                </button>
                              </div>
                            </form>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Delete confirmation */}
                {deletingAssignmentId && (
                  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
                      <h3 className="font-bold text-gray-800 mb-2">Delete Assignment?</h3>
                      <p className="text-gray-500 text-sm mb-5">This will also delete all student submissions. This cannot be undone.</p>
                      <div className="flex gap-3">
                        <button onClick={() => handleDeleteAssignment(deletingAssignmentId)} disabled={deleteALoading}
                          className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold text-sm hover:bg-red-700 transition">
                          {deleteALoading ? 'Deleting...' : 'Yes, Delete'}
                        </button>
                        <button onClick={() => setDeletingAssignmentId(null)}
                          className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-semibold text-sm hover:bg-gray-50 transition">
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submissions + Grading modal */}
                {viewingSubmissions && (
                  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                      {/* Header */}
                      <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
                        <div>
                          <h3 className="font-bold text-gray-800">Submissions & Grading</h3>
                          <p className="text-gray-500 text-xs mt-0.5">
                            {viewingSubmissions.title}
                            {viewingSubmissions.totalMarks != null && (
                              <span className="ml-2 bg-orange-100 text-[#FA7902] font-bold px-2 py-0.5 rounded-full">
                                Total: {viewingSubmissions.totalMarks} marks
                              </span>
                            )}
                          </p>
                        </div>
                        <button onClick={() => { setViewingSubmissions(null); setGradingSubId(null); }}
                          className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none">×</button>
                      </div>

                      {/* Body */}
                      <div className="overflow-auto flex-1 p-5">
                        {subsLoading ? (
                          <p className="text-gray-400 text-sm text-center py-10">Loading...</p>
                        ) : submissions.length === 0 ? (
                          <div className="text-center py-10">
                            <p className="text-4xl mb-2">📭</p>
                            <p className="text-gray-400 text-sm">No submissions yet.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {/* Summary row */}
                            <div className="flex gap-3 text-xs font-semibold mb-1">
                              <span className="text-gray-500">{submissions.length} submission{submissions.length !== 1 ? 's' : ''}</span>
                              <span className="text-green-600">{submissions.filter(s => s.gradedAt).length} graded</span>
                              <span className="text-orange-500">{submissions.filter(s => !s.gradedAt).length} pending</span>
                            </div>

                            {submissions.map((s) => (
                              <div key={s._id} className="border border-gray-200 rounded-xl overflow-hidden">
                                {/* Submission info row */}
                                <div className="p-4 flex items-start gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-semibold text-gray-800 text-sm">{s.studentName}</p>
                                      <span className="text-gray-400 text-xs">{s.registrationNo}</span>
                                      {s.gradedAt ? (
                                        <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                          ✓ {s.obtainedMarks != null ? `${s.obtainedMarks}/${viewingSubmissions.totalMarks || 100}` : 'Graded'}
                                        </span>
                                      ) : (
                                        <span className="bg-orange-100 text-orange-600 text-xs font-semibold px-2 py-0.5 rounded-full">Pending</span>
                                      )}
                                    </div>
                                    {s.note && <p className="text-gray-500 text-xs mt-1 italic">"{s.note}"</p>}
                                    {s.feedback && s.gradedAt && (
                                      <p className="text-gray-500 text-xs mt-1">Feedback: {s.feedback}</p>
                                    )}
                                    <p className="text-gray-400 text-xs mt-1">Submitted {new Date(s.createdAt).toLocaleDateString()}</p>
                                  </div>
                                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                                    {s.fileUrl && (
                                      <a href={fileUrl(s.fileUrl)} target="_blank" rel="noreferrer"
                                        className="bg-gray-100 text-gray-700 text-xs px-3 py-1.5 rounded-lg font-semibold hover:bg-gray-200 text-center">
                                        ⬇ File
                                      </a>
                                    )}
                                    <button
                                      onClick={() => gradingSubId === s._id ? setGradingSubId(null) : openGrading(s)}
                                      className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition ${gradingSubId === s._id ? 'bg-gray-200 text-gray-600' : 'bg-[#FA7902] text-white hover:opacity-90'}`}>
                                      {gradingSubId === s._id ? 'Cancel' : s.gradedAt ? '✏️ Edit Grade' : '+ Give Marks'}
                                    </button>
                                  </div>
                                </div>

                                {/* Inline grading form */}
                                {gradingSubId === s._id && (
                                  <form onSubmit={handleGradeSubmission} className="border-t border-gray-100 bg-orange-50/40 px-4 py-4 space-y-3">
                                    <div className="flex gap-3 items-end">
                                      <div className="w-36">
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                                          Marks Obtained <span className="text-gray-400 font-normal">/ {viewingSubmissions.totalMarks || 100}</span>
                                        </label>
                                        <input
                                          type="number" min="0" max={viewingSubmissions.totalMarks || 100} step="0.5"
                                          value={gradingInputs.obtainedMarks}
                                          onChange={(e) => setGradingInputs(g => ({ ...g, obtainedMarks: e.target.value }))}
                                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-center focus:outline-none focus:border-[#FA7902]"
                                          placeholder="e.g. 85"
                                        />
                                      </div>
                                      <div className="flex-1">
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Feedback (optional)</label>
                                        <input
                                          type="text"
                                          value={gradingInputs.feedback}
                                          onChange={(e) => setGradingInputs(g => ({ ...g, feedback: e.target.value }))}
                                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FA7902]"
                                          placeholder="e.g. Good work, but..."
                                        />
                                      </div>
                                    </div>
                                    <button type="submit" disabled={gradingSaving}
                                      className="bg-[#FA7902] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition">
                                      {gradingSaving ? 'Saving...' : 'Save Grade'}
                                    </button>
                                  </form>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Results ── */}
            {activeSection === 'results' && (
              <div className="space-y-6">

                {/* ── LIST VIEW ── */}
                {rsView === 'list' && (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-bold text-[#FA7902]">Mark Sheets</h2>
                        <p className="text-gray-500 text-sm mt-0.5">Enter marks for the subject(s) you teach. Each sheet covers one subject for one class.</p>
                      </div>
                      <button onClick={openNewRsForm}
                        className="flex-shrink-0 bg-[#FA7902] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition">
                        + New Mark Sheet
                      </button>
                    </div>

                    {/* Workflow info banner */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex gap-3 text-sm">
                      <span className="text-blue-500 text-lg flex-shrink-0">ℹ️</span>
                      <div className="text-blue-700">
                        <p className="font-semibold">How it works</p>
                        <p className="text-xs mt-0.5 text-blue-600">
                          You upload marks only for the subject(s) you teach. Once submitted, the
                          <strong> Examination Branch</strong> reviews all subject mark sheets together,
                          sets the pass/fail threshold, and publishes the official final result to students.
                        </p>
                      </div>
                    </div>

                    {rsLoading ? (
                      <p className="text-gray-500 text-sm">Loading...</p>
                    ) : rsSheets.length === 0 ? (
                      <div className="bg-white rounded-xl shadow p-12 text-center">
                        <p className="text-5xl mb-3">📝</p>
                        <p className="text-gray-500 font-semibold">No mark sheets yet</p>
                        <p className="text-gray-400 text-sm mt-1">Create a mark sheet to enter obtained marks for your subject.</p>
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl shadow overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                              {['Subject', 'Dept / Program', 'Semester', 'Exam Type', 'Session', 'Students', 'Status', 'Actions'].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {rsSheets.map(s => (
                              <tr key={s._id} className="hover:bg-gray-50/50">
                                <td className="px-4 py-3 font-semibold text-gray-800">{s.subject}</td>
                                <td className="px-4 py-3 text-gray-600 text-xs">{s.department}<br /><span className="text-gray-400">{s.program}</span></td>
                                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{s.semester || '—'}</td>
                                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{s.examType}</td>
                                <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{s.academicSession || '—'}</td>
                                <td className="px-4 py-3 text-center text-gray-700 font-medium">{s.entries?.length || 0}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                    s.status === 'draft'     ? 'bg-yellow-100 text-yellow-800' :
                                    s.status === 'submitted' ? 'bg-blue-100 text-blue-800'     :
                                                               'bg-green-100 text-green-800'
                                  }`}>{s.status}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex gap-2">
                                    {s.status === 'draft' && (
                                      <button onClick={() => openEditRsForm(s)}
                                        className="text-xs px-3 py-1.5 rounded-lg border border-[#FA7902] text-[#FA7902] font-semibold hover:bg-orange-50 transition whitespace-nowrap">
                                        ✏️ Edit
                                      </button>
                                    )}
                                    <button onClick={() => openRsDetail(s)}
                                      className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition">
                                      View
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}

                {/* ── FORM VIEW (create / edit draft) ── */}
                {rsView === 'form' && (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h2 className="text-2xl font-bold text-[#FA7902]">{rsEditing ? 'Edit Mark Sheet' : 'New Mark Sheet'}</h2>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {rsForm.useComponents ? 'Enter Sessional / Mid / Final marks per student — Total, GPA and grade are auto-calculated.' : 'Enter obtained marks for your subject (0–100). GPA and grade are auto-calculated.'}
                        </p>
                      </div>
                      <button onClick={() => setRsView('list')}
                        className="shrink-0 px-4 py-2 min-h-11 rounded-lg border border-gray-300 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition">
                        ← Back to List
                      </button>
                    </div>

                    {rsError   && <div className="border-l-4 border-red-400   bg-red-50   text-red-700   px-4 py-3 rounded text-sm">{rsError}</div>}
                    {rsSuccess && <div className="border-l-4 border-green-400 bg-green-50 text-green-700 px-4 py-3 rounded text-sm">{rsSuccess}</div>}

                    <form onSubmit={handleSaveRsDraft} className="space-y-6">
                      {/* Sheet metadata */}
                      <div className="bg-white rounded-xl shadow p-6">
                        <h3 className="font-bold text-gray-700 mb-1">Class & Exam Details</h3>
                        <p className="text-xs text-gray-400 mb-4">Select one of your active classes. You can only enter marks for the subject you teach in that class. Pass/Fail is determined by the Examination Branch after they review all subject mark sheets.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {!rsEditing && (
                            <div className="md:col-span-2">
                              <label className={labelCls}>Select Your Class *</label>
                              {ocClasses?.length > 0 ? (
                                <select value={rsForm.ongoingClassId} onChange={e => setRsForm(f => ({ ...f, ongoingClassId: e.target.value }))}
                                  className={inputCls} required>
                                  <option value="">— Select a class —</option>
                                  {ocClasses.filter(c => c.status === 'active').map(c => (
                                    <option key={c._id} value={c._id}>
                                      {c.subject} — {c.className} ({c.semester || 'N/A'}{c.program ? `, ${c.program}` : ''})
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
                                  You have no active classes. Please add a class under "My Classes" first.
                                </p>
                              )}
                              {rsForm.ongoingClassId && (() => {
                                const cls = ocClasses.find(c => c._id === rsForm.ongoingClassId);
                                return cls ? (
                                  <div className="mt-2 bg-gray-50 rounded-lg px-4 py-3 text-xs text-gray-600 grid grid-cols-2 gap-x-4 gap-y-1">
                                    <span><strong>Subject:</strong> {cls.subject}</span>
                                    <span><strong>Dept:</strong> {cls.department}</span>
                                    <span><strong>Program:</strong> {cls.program || '—'}</span>
                                    <span><strong>Semester:</strong> {cls.semester || '—'}</span>
                                    <span><strong>Session:</strong> {cls.academicSession || '—'}</span>
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          )}
                          {rsEditing && (
                            <div className="md:col-span-2 bg-gray-50 rounded-lg px-4 py-3 text-xs text-gray-600 grid grid-cols-2 gap-x-4 gap-y-1">
                              <span><strong>Subject:</strong> {rsEditing.subject}</span>
                              <span><strong>Dept:</strong> {rsEditing.department}</span>
                              <span><strong>Program:</strong> {rsEditing.program || '—'}</span>
                              <span><strong>Semester:</strong> {rsEditing.semester || '—'}</span>
                              <span><strong>Session:</strong> {rsEditing.academicSession || '—'}</span>
                            </div>
                          )}
                          <div>
                            <label className={labelCls}>Exam Type</label>
                            <select value={rsForm.examType} onChange={e => setRsForm(f => ({ ...f, examType: e.target.value }))}
                              className={inputCls}>
                              {['Mid','Final','Quiz','Sessional'].map(t => <option key={t}>{t}</option>)}
                            </select>
                          </div>
                          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-3">
                            <span className="text-2xl">📐</span>
                            <div>
                              <p className="text-xs font-bold text-blue-700">Auto-calculation enabled</p>
                              <p className="text-xs text-blue-500">Total marks = 100 · GPA = (marks/100)×4 · Grade auto-derived</p>
                            </div>
                          </div>
                        </div>

                        {rsForm.useComponents && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer mb-3">
                              <input type="checkbox" checked={rsForm.hasLab}
                                onChange={ev => { const hasLab = ev.target.checked; setRsForm(f => ({ ...f, hasLab, ...rsDefaultComponents(hasLab) })); }}
                                className="accent-[#FA7902]" />
                              This subject has a Lab component
                            </label>
                            <div className={`grid grid-cols-2 ${rsForm.hasLab ? 'md:grid-cols-4' : 'md:grid-cols-5'} gap-3`}>
                              {rsForm.hasLab ? (
                                <>
                                  <div>
                                    <label className={labelCls}>Sessional Max</label>
                                    <input type="number" min="0" max="100" value={rsForm.sessionalMax}
                                      onChange={ev => setRsForm(f => ({ ...f, sessionalMax: ev.target.value }))} className={inputCls} />
                                  </div>
                                  <div>
                                    <label className={labelCls}>Lab Max</label>
                                    <input type="number" min="0" max="100" value={rsForm.labMax}
                                      onChange={ev => setRsForm(f => ({ ...f, labMax: ev.target.value }))} className={inputCls} />
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div>
                                    <label className={labelCls}>Quiz Max</label>
                                    <input type="number" min="0" max="100" value={rsForm.quizMax}
                                      onChange={ev => setRsForm(f => ({ ...f, quizMax: ev.target.value }))} className={inputCls} />
                                  </div>
                                  <div>
                                    <label className={labelCls}>Presentation Max</label>
                                    <input type="number" min="0" max="100" value={rsForm.presentationMax}
                                      onChange={ev => setRsForm(f => ({ ...f, presentationMax: ev.target.value }))} className={inputCls} />
                                  </div>
                                  <div>
                                    <label className={labelCls}>Assignment Max</label>
                                    <input type="number" min="0" max="100" value={rsForm.assignmentMax}
                                      onChange={ev => setRsForm(f => ({ ...f, assignmentMax: ev.target.value }))} className={inputCls} />
                                  </div>
                                </>
                              )}
                              <div>
                                <label className={labelCls}>Mid Max</label>
                                <input type="number" min="0" max="100" value={rsForm.midMax}
                                  onChange={ev => setRsForm(f => ({ ...f, midMax: ev.target.value }))} className={inputCls} />
                              </div>
                              <div>
                                <label className={labelCls}>Final Max</label>
                                <input type="number" min="0" max="100" value={rsForm.finalMax}
                                  onChange={ev => setRsForm(f => ({ ...f, finalMax: ev.target.value }))} className={inputCls} />
                              </div>
                            </div>
                            <p className={`text-xs mt-2 font-semibold ${rsComponentsTotal(rsForm) === 100 ? 'text-green-600' : 'text-red-600'}`}>
                              Total: {rsComponentsTotal(rsForm)} / 100{rsComponentsTotal(rsForm) !== 100 ? ' — must add up to 100' : ' ✓'}
                            </p>

                            {rsForm.ongoingClassId && (
                              <div className="flex flex-wrap gap-3 mt-4">
                                <button type="button" onClick={handleDownloadTemplate}
                                  className="flex items-center gap-2 px-4 py-2 min-h-11 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition">
                                  📥 Download Excel Template
                                </button>
                                <button type="button" onClick={() => rsFileInputRef.current?.click()} disabled={rsImporting}
                                  className="flex items-center gap-2 px-4 py-2 min-h-11 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition disabled:opacity-50">
                                  {rsImporting ? 'Importing…' : '📤 Upload Filled Excel'}
                                </button>
                                <input ref={rsFileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleImportExcel} />
                              </div>
                            )}
                            <p className="text-xs text-gray-400 mt-2">
                              Download the template, fill in marks in Excel, then upload it back — or just type marks directly into the table below. Either way goes through the same validation.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Student entries */}
                      <div className="bg-white rounded-xl shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-gray-700">Student Entries ({rsEntries.length})</h3>
                          <button type="button" onClick={() => setRsEntries(p => [...p, emptyRsEntry()])}
                            className="text-sm bg-[#FA7902] text-white px-4 py-1.5 rounded-lg font-semibold hover:opacity-90">
                            + Add Student
                          </button>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="py-2 px-2 text-left font-bold text-gray-500 uppercase tracking-wider">#</th>
                                <th className="py-2 px-2 text-left font-bold text-gray-500 uppercase tracking-wider">Reg No *</th>
                                <th className="py-2 px-2 text-left font-bold text-gray-500 uppercase tracking-wider">Student Name *</th>
                                <th className="py-2 px-2 text-left font-bold text-gray-500 uppercase tracking-wider">Father Name</th>
                                {rsForm.useComponents ? (
                                  <>
                                    {rsForm.hasLab ? (
                                      <>
                                        <th className="py-2 px-2 text-left font-bold text-gray-500 uppercase tracking-wider">Sessional</th>
                                        <th className="py-2 px-2 text-left font-bold text-gray-500 uppercase tracking-wider">Lab</th>
                                      </>
                                    ) : (
                                      <>
                                        <th className="py-2 px-2 text-left font-bold text-gray-500 uppercase tracking-wider">Quiz</th>
                                        <th className="py-2 px-2 text-left font-bold text-gray-500 uppercase tracking-wider">Presentation</th>
                                        <th className="py-2 px-2 text-left font-bold text-gray-500 uppercase tracking-wider">Assignment</th>
                                      </>
                                    )}
                                    <th className="py-2 px-2 text-left font-bold text-gray-500 uppercase tracking-wider">Mid</th>
                                    <th className="py-2 px-2 text-left font-bold text-gray-500 uppercase tracking-wider">Final</th>
                                    <th className="py-2 px-2 text-left font-bold text-gray-500 uppercase tracking-wider">Total /100</th>
                                  </>
                                ) : (
                                  <th className="py-2 px-2 text-left font-bold text-gray-500 uppercase tracking-wider">Marks /100 *</th>
                                )}
                                <th className="py-2 px-2 text-left font-bold text-gray-500 uppercase tracking-wider">GPA /4</th>
                                <th className="py-2 px-2 text-left font-bold text-gray-500 uppercase tracking-wider">Grade</th>
                                <th className="py-2 px-2 text-left font-bold text-gray-500 uppercase tracking-wider">Remarks</th>
                                <th className="py-2 px-2"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {rsEntries.map((e, idx) => {
                                const marks = rsForm.useComponents ? rsEntryTotal(e, rsForm) : (Number(e.obtainedMarks) || 0);
                                const hasAnyMark = rsForm.useComponents
                                  ? (rsForm.hasLab
                                      ? (e.sessionalMarks !== '' || e.labMarks !== '')
                                      : (e.quizMarks !== '' || e.presentationMarks !== '' || e.assignmentMarks !== ''))
                                    || e.midMarks !== '' || e.finalMarks !== ''
                                  : e.obtainedMarks !== '';
                                const autoGrade = hasAnyMark ? rsCalcGrade(marks) : '—';
                                const autoGpa   = hasAnyMark ? rsCalcGpa(marks)   : '—';
                                const numCls = 'w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#FA7902]';
                                return (
                                  <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50">
                                    <td className="py-2 px-2 text-gray-400">{idx + 1}</td>
                                    <td className="py-2 px-1">
                                      <input value={e.registrationNo}
                                        onChange={ev => updateRsEntry(idx, 'registrationNo', ev.target.value)}
                                        required className="w-28 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#FA7902]"
                                        placeholder="Reg No" />
                                    </td>
                                    <td className="py-2 px-1">
                                      <input value={e.studentName}
                                        onChange={ev => updateRsEntry(idx, 'studentName', ev.target.value)}
                                        required className="w-36 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#FA7902]"
                                        placeholder="Full Name" />
                                    </td>
                                    <td className="py-2 px-1">
                                      <input value={e.fatherName}
                                        onChange={ev => updateRsEntry(idx, 'fatherName', ev.target.value)}
                                        className="w-32 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#FA7902]"
                                        placeholder="Father Name" />
                                    </td>
                                    {rsForm.useComponents ? (
                                      <>
                                        {rsForm.hasLab ? (
                                          <>
                                            <td className="py-2 px-1">
                                              <input type="number" min="0" max={rsForm.sessionalMax} value={e.sessionalMarks}
                                                onChange={ev => updateRsEntry(idx, 'sessionalMarks', ev.target.value)}
                                                className={numCls} placeholder={`/${rsForm.sessionalMax}`} />
                                            </td>
                                            <td className="py-2 px-1">
                                              <input type="number" min="0" max={rsForm.labMax} value={e.labMarks}
                                                onChange={ev => updateRsEntry(idx, 'labMarks', ev.target.value)}
                                                className={numCls} placeholder={`/${rsForm.labMax}`} />
                                            </td>
                                          </>
                                        ) : (
                                          <>
                                            <td className="py-2 px-1">
                                              <input type="number" min="0" max={rsForm.quizMax} value={e.quizMarks}
                                                onChange={ev => updateRsEntry(idx, 'quizMarks', ev.target.value)}
                                                className={numCls} placeholder={`/${rsForm.quizMax}`} />
                                            </td>
                                            <td className="py-2 px-1">
                                              <input type="number" min="0" max={rsForm.presentationMax} value={e.presentationMarks}
                                                onChange={ev => updateRsEntry(idx, 'presentationMarks', ev.target.value)}
                                                className={numCls} placeholder={`/${rsForm.presentationMax}`} />
                                            </td>
                                            <td className="py-2 px-1">
                                              <input type="number" min="0" max={rsForm.assignmentMax} value={e.assignmentMarks}
                                                onChange={ev => updateRsEntry(idx, 'assignmentMarks', ev.target.value)}
                                                className={numCls} placeholder={`/${rsForm.assignmentMax}`} />
                                            </td>
                                          </>
                                        )}
                                        <td className="py-2 px-1">
                                          <input type="number" min="0" max={rsForm.midMax} value={e.midMarks}
                                            onChange={ev => updateRsEntry(idx, 'midMarks', ev.target.value)}
                                            className={numCls} placeholder={`/${rsForm.midMax}`} />
                                        </td>
                                        <td className="py-2 px-1">
                                          <input type="number" min="0" max={rsForm.finalMax} value={e.finalMarks}
                                            onChange={ev => updateRsEntry(idx, 'finalMarks', ev.target.value)}
                                            className={numCls} placeholder={`/${rsForm.finalMax}`} />
                                        </td>
                                        <td className="py-2 px-2 text-center font-bold text-gray-700">{hasAnyMark ? marks : '—'}</td>
                                      </>
                                    ) : (
                                      <td className="py-2 px-1">
                                        <input type="number" min="0" max="100" value={e.obtainedMarks}
                                          onChange={ev => updateRsEntry(idx, 'obtainedMarks', ev.target.value)}
                                          className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#FA7902]"
                                          placeholder="0–100" />
                                      </td>
                                    )}
                                    <td className="py-2 px-2 text-center font-semibold text-indigo-600">{autoGpa}</td>
                                    <td className="py-2 px-2">
                                      <span className={`font-bold text-sm ${
                                        autoGrade.startsWith('A') ? 'text-green-600' :
                                        autoGrade.startsWith('B') ? 'text-blue-600'  :
                                        autoGrade.startsWith('C') ? 'text-yellow-600' :
                                        autoGrade.startsWith('D') ? 'text-orange-500' :
                                        autoGrade === 'F'         ? 'text-red-500'    : 'text-gray-400'
                                      }`}>{autoGrade}</span>
                                    </td>
                                    <td className="py-2 px-1">
                                      <input value={e.remarks}
                                        onChange={ev => updateRsEntry(idx, 'remarks', ev.target.value)}
                                        className="w-28 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#FA7902]"
                                        placeholder="Optional" />
                                    </td>
                                    <td className="py-2 px-1">
                                      <button type="button" onClick={() => setRsEntries(p => p.filter((_, i) => i !== idx))}
                                        className="text-red-400 hover:text-red-600 font-bold text-base leading-none px-1">×</button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {rsEntries.length === 0 && (
                          <p className="text-center text-gray-400 text-sm py-4">No students added yet. Click &ldquo;+ Add Student&rdquo; above.</p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-3 flex-wrap">
                        <button type="submit" disabled={rsSaving}
                          className="bg-[#FA7902] text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:opacity-90 transition disabled:opacity-60">
                          {rsSaving ? 'Saving…' : '💾 Save as Draft'}
                        </button>
                        {rsEditing && (
                          <button type="button" onClick={handleSubmitResultSheet} disabled={rsSubmitting || !rsEntries.length}
                            className="bg-green-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-green-700 transition disabled:opacity-60">
                            {rsSubmitting ? 'Submitting…' : '✅ Submit Final'}
                          </button>
                        )}
                        <button type="button" onClick={() => setRsView('list')}
                          className="px-6 py-2.5 rounded-lg text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 transition">
                          Cancel
                        </button>
                      </div>
                      <p className="text-xs text-gray-400">💡 Save as Draft to preserve your work. Once submitted, the result sheet can only be edited via an approval request.</p>
                    </form>
                  </>
                )}

                {/* ── DETAIL VIEW ── */}
                {rsView === 'detail' && rsSelected && (
                  <>
                    <div className="flex items-center justify-between no-print">
                      <div>
                        <h2 className="text-2xl font-bold text-[#FA7902]">Result Sheet — {rsSelected.subject}</h2>
                        <p className="text-gray-500 text-xs mt-0.5">{rsSelected.department} · {rsSelected.program} · {rsSelected.semester}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => window.print()}
                          className="px-4 py-2 rounded-lg bg-[#041476] text-white text-sm font-semibold hover:opacity-90 transition">
                          🖨️ Print / Export PDF
                        </button>
                        <button onClick={() => setRsView('list')}
                          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition">
                          ← Back
                        </button>
                      </div>
                    </div>

                    {rsSelected.status === 'draft' && rsSelected.returnedRemarks && (
                      <div className="no-print border-l-4 border-orange-400 bg-orange-50 text-orange-800 px-4 py-3 rounded text-sm">
                        <p className="font-bold">Returned by Examination Section for correction</p>
                        <p className="mt-1">{rsSelected.returnedRemarks}</p>
                        {rsSelected.returnedAt && <p className="text-xs text-orange-600 mt-1">{new Date(rsSelected.returnedAt).toLocaleString('en-GB')}</p>}
                      </div>
                    )}

                    {/* Printable result sheet */}
                    <div id="rs-printable" className="bg-white rounded-xl shadow p-6">
                      {/* Print header — professional university layout */}
                      <div className="print-only" style={{ display: 'none', marginBottom: '24px', borderBottom: '2px solid #041476', paddingBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'center' }}>
                          <img src="/logo.png.webp" alt="UoM Logo" style={{ height: '64px', width: '64px', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#041476' }}>University of Makran, Panjgur</div>
                            <div style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>Panjgur, Balochistan, Pakistan</div>
                            <div style={{ fontSize: '15px', fontWeight: '600', color: '#FA7902', marginTop: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                              {rsSelected?.examType} Examination Result Sheet
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '11px', color: '#555' }}>
                          <span>Dept: <strong>{rsSelected?.department}</strong></span>
                          <span>Program: <strong>{rsSelected?.program}</strong></span>
                          <span>Semester: <strong>{rsSelected?.semester}</strong></span>
                          <span>Session: <strong>{rsSelected?.academicSession || '—'}</strong></span>
                          <span>Printed: <strong>{new Date().toLocaleDateString('en-GB')}</strong></span>
                        </div>
                      </div>

                      {/* Sheet meta info */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 pb-5 border-b border-gray-100">
                        {[
                          ['Subject',         rsSelected.subject],
                          ['Department',      rsSelected.department || '—'],
                          ['Program',         rsSelected.program || '—'],
                          ['Semester',        rsSelected.semester || '—'],
                          ['Exam Type',       rsSelected.examType],
                          ['Session',         rsSelected.academicSession || '—'],
                          ['Total Marks',     rsSelected.totalMarks],
                          ['Passing Marks',   rsSelected.passingMarks],
                          ['Teacher',         rsSelected.teacherName || '—'],
                          ['Teacher ID',      rsSelected.teacherId || '—'],
                          ['Status',          rsSelected.status.toUpperCase()],
                          ['Submitted',       rsSelected.submittedAt ? new Date(rsSelected.submittedAt).toLocaleDateString('en-GB') : 'Not yet'],
                        ].map(([label, val]) => (
                          <div key={label}>
                            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{label}</p>
                            <p className="text-sm font-semibold text-gray-800 mt-0.5">{val}</p>
                          </div>
                        ))}
                      </div>

                      {/* Entries table */}
                      <div className="overflow-x-auto print-table-scroll">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b-2 border-gray-200 bg-gray-50">
                              <th className="py-3 px-3 text-left text-xs font-bold text-gray-500 uppercase">#</th>
                              <th className="py-3 px-3 text-left text-xs font-bold text-gray-500 uppercase">Reg No</th>
                              <th className="py-3 px-3 text-left text-xs font-bold text-gray-500 uppercase">Student Name</th>
                              <th className="py-3 px-3 text-left text-xs font-bold text-gray-500 uppercase">Father Name</th>
                              <th className="py-3 px-3 text-center text-xs font-bold text-gray-500 uppercase">Marks /100</th>
                              <th className="py-3 px-3 text-center text-xs font-bold text-gray-500 uppercase">GPA /4</th>
                              <th className="py-3 px-3 text-center text-xs font-bold text-gray-500 uppercase">Grade</th>
                              <th className="py-3 px-3 text-center text-xs font-bold text-gray-500 uppercase">Result</th>
                              <th className="py-3 px-3 text-left text-xs font-bold text-gray-500 uppercase">Remarks</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {rsSelected.entries?.map((e, idx) => (
                              <tr key={idx} className={`${e.resultStatus === 'Fail' ? 'bg-red-50/30' : e.resultStatus === 'Pass' ? 'bg-green-50/20' : ''}`}>
                                <td className="py-2.5 px-3 text-gray-400">{idx + 1}</td>
                                <td className="py-2.5 px-3 font-mono text-xs text-gray-600">{e.registrationNo}</td>
                                <td className="py-2.5 px-3 font-semibold text-gray-800">{e.studentName}</td>
                                <td className="py-2.5 px-3 text-gray-500">{e.fatherName || '—'}</td>
                                <td className="py-2.5 px-3 text-center font-semibold text-gray-800">
                                  {e.resultStatus === 'Absent' || e.resultStatus === 'Withheld' ? '—' : e.obtainedMarks}
                                </td>
                                <td className="py-2.5 px-3 text-center font-semibold text-indigo-600">
                                  {e.resultStatus === 'Absent' || e.resultStatus === 'Withheld' ? '—' : (e.gpa ?? Math.round((e.obtainedMarks / 100) * 4 * 100) / 100)}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className={`font-bold ${
                                    e.grade === 'A+' || e.grade === 'A' ? 'text-green-600' :
                                    e.grade === 'B+' || e.grade === 'B' ? 'text-blue-600'  :
                                    e.grade === 'C'  ? 'text-yellow-600' :
                                    e.grade === 'D'  ? 'text-orange-500' :
                                    e.grade === 'F'  ? 'text-red-500'    : 'text-gray-500'
                                  }`}>{e.grade || '—'}</span>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                    e.resultStatus === 'Pass'     ? 'bg-green-100 text-green-800' :
                                    e.resultStatus === 'Fail'     ? 'bg-red-100 text-red-700'     :
                                    e.resultStatus === 'Absent'   ? 'bg-gray-100 text-gray-600'   :
                                                                    'bg-orange-100 text-orange-700'
                                  }`}>{e.resultStatus}</span>
                                </td>
                                <td className="py-2.5 px-3 text-gray-400 text-xs">{e.remarks || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Summary row */}
                      {rsSelected.entries?.length > 0 && (() => {
                        const pass = rsSelected.entries.filter(e => e.resultStatus === 'Pass').length;
                        const fail = rsSelected.entries.filter(e => e.resultStatus === 'Fail').length;
                        const abs  = rsSelected.entries.filter(e => e.resultStatus === 'Absent').length;
                        const wh   = rsSelected.entries.filter(e => e.resultStatus === 'Withheld').length;
                        return (
                          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-6 text-sm">
                            <span className="text-gray-500">Total: <strong>{rsSelected.entries.length}</strong></span>
                            <span className="text-green-600">Passed: <strong>{pass}</strong></span>
                            <span className="text-red-500">Failed: <strong>{fail}</strong></span>
                            {abs > 0 && <span className="text-gray-400">Absent: <strong>{abs}</strong></span>}
                            {wh  > 0 && <span className="text-orange-500">Withheld: <strong>{wh}</strong></span>}
                            <span className="text-blue-600">Pass Rate: <strong>{rsSelected.entries.length ? Math.round((pass / rsSelected.entries.length) * 100) : 0}%</strong></span>
                          </div>
                        );
                      })()}

                      {/* Print footer */}
                      <div className="print-only" style={{ display: 'none', marginTop: '40px', borderTop: '1px solid #ccc', paddingTop: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#555' }}>
                          <div style={{ textAlign: 'center', minWidth: '160px' }}>
                            <div style={{ borderTop: '1px solid #333', paddingTop: '4px', marginTop: '40px' }}>Teacher Signature</div>
                            <div style={{ fontSize: '10px', marginTop: '2px' }}>{rsSelected?.teacherName}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', color: '#888' }}>This is a computer-generated document.</div>
                            <div style={{ fontSize: '10px', color: '#888' }}>University of Makran, Panjgur — Examination Section</div>
                          </div>
                          <div style={{ textAlign: 'center', minWidth: '160px' }}>
                            <div style={{ borderTop: '1px solid #333', paddingTop: '4px', marginTop: '40px' }}>Controller of Examinations</div>
                            <div style={{ fontSize: '10px', marginTop: '2px' }}>University of Makran</div>
                          </div>
                        </div>
                      </div>
                    </div>{/* end #rs-printable */}

                    {/* Action zone (non-printable) */}
                    <div className="no-print space-y-4">
                      {rsSelected.status === 'draft' && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 flex items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold text-yellow-800">This result sheet is a draft</p>
                            <p className="text-yellow-700 text-sm mt-0.5">Review the entries above and submit when ready for final processing.</p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => openEditRsForm(rsSelected)}
                              className="px-4 py-2 rounded-lg border border-yellow-400 text-yellow-800 text-sm font-semibold hover:bg-yellow-100">
                              ✏️ Edit
                            </button>
                            <button onClick={handleSubmitResultSheet} disabled={rsSubmitting}
                              className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-60">
                              {rsSubmitting ? 'Submitting…' : '✅ Submit Final'}
                            </button>
                          </div>
                        </div>
                      )}

                      {(rsSelected.status === 'submitted' || rsSelected.status === 'finalized') && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-semibold text-blue-800">Result sheet submitted</p>
                              <p className="text-blue-600 text-sm">To request a correction, submit an approval request below.</p>
                            </div>
                            <button onClick={() => { setShowCrForm(v => !v); setCrError(''); setCrSuccess(''); }}
                              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shrink-0">
                              {showCrForm ? '✕ Cancel' : '✏️ Request Correction'}
                            </button>
                          </div>

                          {crSuccess && <div className="border-l-4 border-green-400 bg-green-50 text-green-700 px-4 py-3 rounded text-sm mb-3">{crSuccess}</div>}
                          {crError   && <div className="border-l-4 border-red-400   bg-red-50   text-red-700   px-4 py-3 rounded text-sm mb-3">{crError}</div>}

                          {showCrForm && (
                            <form onSubmit={handleSubmitCr} className="space-y-3 mt-3 pt-3 border-t border-blue-200">
                              <div>
                                <label className={labelCls}>Reason for Correction *</label>
                                <input value={crForm.reason} onChange={e => setCrForm(f => ({ ...f, reason: e.target.value }))}
                                  required className={inputCls} placeholder="e.g. Data entry error in student marks" />
                              </div>
                              <div>
                                <label className={labelCls}>Requested Changes (describe what to correct) *</label>
                                <textarea value={crForm.requestedChanges} onChange={e => setCrForm(f => ({ ...f, requestedChanges: e.target.value }))}
                                  required rows={3} className={`${inputCls} resize-y`}
                                  placeholder="e.g. Change Reg No 2024-CS-001 marks from 45 to 55. Student was incorrectly marked." />
                              </div>
                              <button type="submit" disabled={crSubmitting}
                                className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-60">
                                {crSubmitting ? 'Submitting…' : 'Submit Request'}
                              </button>
                            </form>
                          )}

                          {/* Correction request history */}
                          {myCrs.filter(r => String(r.resultSheet) === String(rsSelected._id)).length > 0 && (
                            <div className="mt-4 pt-4 border-t border-blue-100">
                              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">Correction Request History</p>
                              {myCrs.filter(r => String(r.resultSheet) === String(rsSelected._id)).map(r => (
                                <div key={r._id} className="flex items-start justify-between gap-3 bg-white rounded-lg border border-blue-100 p-3 mb-2">
                                  <div>
                                    <p className="text-xs font-semibold text-gray-700">{r.reason}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{r.requestedChanges}</p>
                                    {r.reviewerComment && <p className="text-xs text-gray-400 mt-1 italic">Reviewer: {r.reviewerComment}</p>}
                                    <p className="text-xs text-gray-400 mt-1">{new Date(r.createdAt).toLocaleDateString('en-GB')}</p>
                                  </div>
                                  <span className={`shrink-0 px-2 py-1 rounded-full text-xs font-bold ${
                                    r.status === 'pending'  ? 'bg-yellow-100 text-yellow-800' :
                                    r.status === 'approved' ? 'bg-green-100 text-green-800'   :
                                                              'bg-red-100 text-red-700'
                                  }`}>{r.status}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Print styles */}
                <style>{`
                  @media print {
                    @page { size: A4; margin: 10mm; }
                    body * { visibility: hidden; }
                    #rs-printable, #rs-printable * { visibility: visible; }
                    #rs-printable { position: fixed; top: 0; left: 0; width: 100%; }
                    .no-print { display: none !important; }
                    .print-only { display: block !important; }
                    .print-table-scroll { overflow: visible !important; }
                    .print-table-scroll table { width: 100% !important; min-width: 0 !important; }
                  }
                `}</style>

              </div>
            )}

            {/* ── Correction Requests ── */}
            {activeSection === 'correctionRequests' && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-2xl font-bold text-[#FA7902]">My Correction Requests</h2>
                    <p className="text-gray-500 text-sm mt-0.5">Track all correction requests you have submitted for review.</p>
                  </div>
                  <button onClick={() => setActiveSection('results')}
                    className="px-4 py-2 text-sm font-semibold border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
                    ← Back to Results
                  </button>
                </div>

                {myCrsLoading ? (
                  <p className="text-gray-500 text-sm">Loading...</p>
                ) : myCrs.length === 0 ? (
                  <div className="bg-white rounded-xl shadow p-12 text-center">
                    <p className="text-5xl mb-3">✅</p>
                    <p className="text-gray-500 font-semibold">No correction requests yet</p>
                    <p className="text-gray-400 text-sm mt-1">After submitting a result sheet, you can request corrections from the detail view.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myCrs.map(r => (
                      <div key={r._id} className="bg-white rounded-xl shadow p-5">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-800">{r.reason}</p>
                            <p className="text-sm text-gray-500 mt-1 leading-relaxed">{r.requestedChanges}</p>
                          </div>
                          <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                            r.status === 'pending'  ? 'bg-yellow-100 text-yellow-800' :
                            r.status === 'approved' ? 'bg-green-100 text-green-800'   :
                                                      'bg-red-100 text-red-700'
                          }`}>{r.status}</span>
                        </div>

                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-400 mb-3">
                          <span>Submitted: {new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          {r.reviewedAt && <span>Reviewed: {new Date(r.reviewedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                          {r.reviewerRole && <span>Reviewed by: <span className="capitalize font-medium text-gray-600">{r.reviewerRole}</span></span>}
                        </div>

                        {r.reviewerComment && (
                          <div className={`rounded-lg px-4 py-3 text-sm ${r.status === 'approved' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                            <span className="font-semibold">Reviewer note:</span> {r.reviewerComment}
                          </div>
                        )}

                        {r.status === 'pending' && (
                          <div className="mt-3 flex items-center gap-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2">
                            <span>⏳</span>
                            <span>Awaiting review by HOD or Examination Section.</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <Head><title>Teacher Portal - University of Makran, Panjgur</title></Head>
      <Header />
      <HeroSection title="Teacher Portal" subtitle="Login or Register to Manage Your Classes" />

      <div className="bg-gray-50 py-16 min-h-screen">
        <div className="container max-w-2xl mx-auto">
          {/* Tabs */}
          <div className="flex bg-white rounded-xl shadow overflow-hidden mb-6">
            {['login', 'register'].map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setLoginError(''); setRegError(''); setRegSuccess(''); }}
                className={`flex-1 py-4 font-semibold text-sm transition ${
                  tab === t ? 'bg-[#FA7902] text-white' : 'text-gray-600 hover:bg-gray-50'
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
                <h2 className="text-2xl font-bold text-[#FA7902] mb-6 text-center">Teacher Login</h2>
                <Alert type="error" message={loginError} />
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className={labelCls}>Teacher ID *</label>
                    <input type="text" required value={loginData.teacherId}
                      onChange={(e) => setLoginData({ ...loginData, teacherId: e.target.value })}
                      className={inputCls} placeholder="e.g. TCH-2024-001" />
                  </div>
                  <div>
                    <label className={labelCls}>Password *</label>
                    <div className="relative">
                      <input type={showLoginPw ? 'text' : 'password'} required value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        className={inputCls} />
                      <button type="button" onClick={() => setShowLoginPw(!showLoginPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                        {showLoginPw ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={loginLoading}
                    className="w-full py-3 bg-[#FA7902] text-white rounded-lg font-semibold hover:opacity-90 transition text-base">
                    {loginLoading ? 'Logging in...' : 'Login'}
                  </button>
                </form>
                <p className="text-center text-sm text-gray-500 mt-4">
                  Don&apos;t have an account?{' '}
                  <button onClick={() => setTab('register')} className="text-[#FA7902] font-semibold hover:underline">
                    Register with your Teacher ID
                  </button>
                </p>
              </>
            )}

            {/* REGISTER */}
            {tab === 'register' && (
              <>
                <h2 className="text-2xl font-bold text-[#FA7902] mb-2 text-center">Teacher Registration</h2>
                <p className="text-center text-xs text-gray-500 mb-4">You need a valid Teacher ID issued by admin to register.</p>
                <Alert type="error" message={regError} />
                <Alert type="success" message={regSuccess} />
                {!regSuccess && (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <label className={labelCls}>Teacher ID * (assigned by admin)</label>
                      <input type="text" required value={regData.teacherId}
                        onChange={(e) => setRegData({ ...regData, teacherId: e.target.value })}
                        className={regInputCls('teacherId')} placeholder="e.g. TCH-2024-001" />
                      {regFieldErrors.teacherId && <p className="text-xs text-red-600 mt-1">{regFieldErrors.teacherId}</p>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Full Name *</label>
                        <input type="text" required value={regData.fullName}
                          onChange={(e) => setRegData({ ...regData, fullName: e.target.value })}
                          className={regInputCls('fullName')} />
                        {regFieldErrors.fullName && <p className="text-xs text-red-600 mt-1">{regFieldErrors.fullName}</p>}
                      </div>
                      <div>
                        <label className={labelCls}>Email *</label>
                        <input type="email" required value={regData.email}
                          onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                          className={regInputCls('email')} />
                        {regFieldErrors.email && <p className="text-xs text-red-600 mt-1">{regFieldErrors.email}</p>}
                      </div>
                      <div>
                        <label className={labelCls}>Password * (min 8 chars)</label>
                        <div className="relative">
                          <input type={showRegPw ? 'text' : 'password'} required minLength={8} value={regData.password}
                            onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                            className={regInputCls('password')} />
                          <button type="button" onClick={() => setShowRegPw(!showRegPw)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                            {showRegPw ? 'Hide' : 'Show'}
                          </button>
                        </div>
                        {regFieldErrors.password && <p className="text-xs text-red-600 mt-1">{regFieldErrors.password}</p>}
                      </div>
                      <div>
                        <label className={labelCls}>Phone</label>
                        <input type="text" value={regData.phone}
                          onChange={(e) => setRegData({ ...regData, phone: e.target.value })}
                          className={regInputCls('phone')} placeholder="03XX-XXXXXXX" />
                        {regFieldErrors.phone && <p className="text-xs text-red-600 mt-1">{regFieldErrors.phone}</p>}
                      </div>
                      <div>
                        <label className={labelCls}>CNIC</label>
                        <input type="text" value={regData.cnic}
                          onChange={(e) => setRegData({ ...regData, cnic: e.target.value })}
                          className={regInputCls('cnic')} placeholder="XXXXX-XXXXXXX-X" />
                        {regFieldErrors.cnic && <p className="text-xs text-red-600 mt-1">{regFieldErrors.cnic}</p>}
                      </div>
                      <div>
                        <label className={labelCls}>Department</label>
                        <select value={regData.departmentId}
                          onChange={(e) => setRegData({ ...regData, departmentId: e.target.value })}
                          className={regInputCls('departmentId')}>
                          <option value="">Select department</option>
                          {deptList.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                        </select>
                        {regFieldErrors.departmentId && <p className="text-xs text-red-600 mt-1">{regFieldErrors.departmentId}</p>}
                      </div>
                      <div>
                        <label className={labelCls}>Qualification</label>
                        <input type="text" value={regData.qualification}
                          onChange={(e) => setRegData({ ...regData, qualification: e.target.value })}
                          className={regInputCls('qualification')} placeholder="e.g. PhD Computer Science" />
                        {regFieldErrors.qualification && <p className="text-xs text-red-600 mt-1">{regFieldErrors.qualification}</p>}
                      </div>
                      <div>
                        <label className={labelCls}>Designation</label>
                        <select value={regData.designationId}
                          onChange={(e) => setRegData({ ...regData, designationId: e.target.value })}
                          className={regInputCls('designationId')}>
                          <option value="">Select designation</option>
                          {designationList
                            .filter((d) => !NON_TEACHING_DESIGNATIONS.includes(d.title))
                            .map((d) => <option key={d._id} value={d._id}>{d.title}</option>)}
                        </select>
                        {regFieldErrors.designationId && <p className="text-xs text-red-600 mt-1">{regFieldErrors.designationId}</p>}
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Classes / Courses Taught (comma-separated)</label>
                      <input type="text" value={regData.classesTaught}
                        onChange={(e) => setRegData({ ...regData, classesTaught: e.target.value })}
                        className={inputCls} placeholder="e.g. Data Structures, Algorithms, OOP" />
                    </div>
                    <button type="submit" disabled={regLoading}
                      className="w-full py-3 bg-[#FA7902] text-white rounded-lg font-semibold hover:opacity-90 transition text-base">
                      {regLoading ? 'Submitting...' : 'Submit Registration'}
                    </button>
                  </form>
                )}
                <p className="text-center text-sm text-gray-500 mt-4">
                  Already registered?{' '}
                  <button onClick={() => setTab('login')} className="text-[#FA7902] font-semibold hover:underline">
                    Login here
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
