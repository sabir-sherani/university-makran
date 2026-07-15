import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminHeader from '../../components/AdminHeader';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

const EMPTY_COURSE = { sNo: '', courseTitle: '', creditHours: '', theoryLab: '', code: '' };

export default function Courses() {
  const [departments, setDepartments]       = useState([]);
  const [programs, setPrograms]             = useState([]);
  const [filteredProgs, setFilteredProgs]   = useState([]);
  const [selDept, setSelDept]               = useState('');
  const [selProgram, setSelProgram]         = useState('');
  const [selSemester, setSelSemester]       = useState(1);
  const [courses, setCourses]               = useState([{ ...EMPTY_COURSE }]);
  const [savedSemesters, setSavedSemesters] = useState([]);
  const [loading, setLoading]               = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [msg, setMsg]                       = useState('');

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/departments`),
      axios.get(`${API}/programs`),
    ]).then(([dRes, pRes]) => {
      setDepartments(dRes.data || []);
      setPrograms(pRes.data || []);
    }).catch(() => {});
  }, []);

  // Filter programs by selected department
  useEffect(() => {
    if (!selDept) {
      setFilteredProgs(programs);
    } else {
      setFilteredProgs(
        programs.filter((p) => {
          const deptId = p.department?._id || p.department;
          return deptId === selDept;
        })
      );
    }
    setSelProgram('');
    setSavedSemesters([]);
  }, [selDept, programs]);

  // Load existing semester data when program changes
  useEffect(() => {
    if (!selProgram) { setSavedSemesters([]); return; }
    setLoading(true);
    axios
      .get(`${API}/courses?program=${selProgram}`)
      .then((res) => setSavedSemesters(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selProgram]);

  // Load existing courses when semester tab changes
  useEffect(() => {
    const existing = savedSemesters.find((s) => s.semesterNumber === selSemester);
    if (existing && existing.courses?.length > 0) {
      setCourses(existing.courses.map((c) => ({ ...c })));
    } else {
      setCourses([{ ...EMPTY_COURSE }]);
    }
    setMsg('');
  }, [selSemester, savedSemesters]);

  function updateCourse(index, field, value) {
    setCourses((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function addRow() {
    setCourses((prev) => [...prev, { ...EMPTY_COURSE, sNo: prev.length + 1 }]);
  }

  function removeRow(index) {
    setCourses((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveSemester() {
    if (!selProgram) { setMsg('Please select a program first.'); return; }
    setSaving(true);
    setMsg('');
    try {
      const filteredCourses = courses.filter((c) => c.courseTitle?.trim());
      await axios.post(`${API}/courses`, {
        program: selProgram,
        semesterNumber: selSemester,
        courses: filteredCourses,
      });
      setMsg(`Semester ${selSemester} saved successfully.`);
      // Refresh saved semesters
      const res = await axios.get(`${API}/courses?program=${selProgram}`);
      setSavedSemesters(res.data || []);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Error saving semester.');
    }
    setSaving(false);
  }

  async function deleteSemester(semId) {
    if (!confirm('Delete this semester\'s course data?')) return;
    try {
      await axios.delete(`${API}/courses/${semId}`);
      const res = await axios.get(`${API}/courses?program=${selProgram}`);
      setSavedSemesters(res.data || []);
      setCourses([{ ...EMPTY_COURSE }]);
      setMsg('Semester deleted.');
    } catch { setMsg('Error deleting semester.'); }
  }

  const hasSaved = (num) => savedSemesters.some((s) => s.semesterNumber === num);

  return (
    <>
      <Head><title>Manage Courses - Admin Dashboard</title></Head>
      <AdminHeader />

      <div className="ml-0 lg:ml-56 p-8">
        <h2 className="text-3xl font-bold text-primary mb-8">Semester Course Structure</h2>

        {/* ── SELECTION ── */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Select Program</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Department</label>
              <select
                value={selDept}
                onChange={(e) => setSelDept(e.target.value)}
                className="admin-input"
              >
                <option value="">— All Departments —</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Program *</label>
              <select
                value={selProgram}
                onChange={(e) => setSelProgram(e.target.value)}
                className="admin-input"
              >
                <option value="">— Select Program —</option>
                {filteredProgs.map((p) => (
                  <option key={p._id} value={p._id}>{p.title || p.category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {selProgram && (
          <>
            {/* ── SEMESTER TABS ── */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
              <div className="flex overflow-x-auto border-b">
                {Array.from({ length: 8 }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    onClick={() => setSelSemester(num)}
                    className={`shrink-0 px-5 py-3 text-sm font-semibold transition-colors relative ${
                      selSemester === num
                        ? 'text-primary border-b-2 border-primary bg-primary/5'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    Sem {num}
                    {hasSaved(num) && (
                      <span className="ml-1.5 w-2 h-2 bg-green-500 rounded-full inline-block" title="Data saved" />
                    )}
                  </button>
                ))}
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-gray-800">
                    Semester {selSemester} — Course List
                    {hasSaved(selSemester) && (
                      <span className="ml-2 text-xs text-green-600 font-normal">(saved)</span>
                    )}
                  </h4>
                  {hasSaved(selSemester) && (
                    <button
                      onClick={() => {
                        const s = savedSemesters.find((s) => s.semesterNumber === selSemester);
                        if (s) deleteSemester(s._id);
                      }}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Clear Semester
                    </button>
                  )}
                </div>

                {msg && (
                  <div className={`mb-4 px-4 py-2 rounded text-sm ${msg.includes('Error') || msg.includes('select') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    {msg}
                  </div>
                )}

                {/* Course Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700">
                        <th className="px-3 py-2 text-left font-semibold w-12">S.No</th>
                        <th className="px-3 py-2 text-left font-semibold">Course Title</th>
                        <th className="px-3 py-2 text-center font-semibold w-24">Credit Hrs</th>
                        <th className="px-3 py-2 text-center font-semibold w-28">Theory+Lab</th>
                        <th className="px-3 py-2 text-center font-semibold w-24">Code</th>
                        <th className="px-3 py-2 w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map((course, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              value={course.sNo}
                              onChange={(e) => updateCourse(i, 'sNo', e.target.value)}
                              placeholder={`${i + 1}`}
                              className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-primary"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={course.courseTitle}
                              onChange={(e) => updateCourse(i, 'courseTitle', e.target.value)}
                              placeholder="Course Title"
                              className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-primary"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              value={course.creditHours}
                              onChange={(e) => updateCourse(i, 'creditHours', e.target.value)}
                              placeholder="3"
                              className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-primary"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={course.theoryLab}
                              onChange={(e) => updateCourse(i, 'theoryLab', e.target.value)}
                              placeholder="3+0"
                              className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-primary"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={course.code}
                              onChange={(e) => updateCourse(i, 'code', e.target.value)}
                              placeholder="CS-101"
                              className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-center font-mono focus:outline-none focus:border-primary"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <button
                              onClick={() => removeRow(i)}
                              className="text-red-400 hover:text-red-600 font-bold text-lg leading-none"
                              title="Remove row"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <button onClick={addRow} className="text-sm text-primary font-semibold hover:underline flex items-center gap-1">
                    + Add Row
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={saveSemester}
                    disabled={saving}
                    className="admin-btn admin-btn-primary text-sm px-6"
                  >
                    {saving ? 'Saving...' : `Save Semester ${selSemester}`}
                  </button>
                </div>
              </div>
            </div>

            {/* ── SAVED SEMESTERS OVERVIEW ── */}
            {savedSemesters.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  Saved Semesters ({savedSemesters.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {savedSemesters.map((sem) => (
                    <div key={sem._id} className="border border-gray-200 rounded-lg p-3 text-center">
                      <p className="font-bold text-primary text-sm">Semester {sem.semesterNumber}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{sem.courses?.length || 0} courses</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {!selProgram && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">📚</p>
            <p className="font-medium">Select a program above to manage its semester-wise course structure.</p>
          </div>
        )}
      </div>
    </>
  );
}

