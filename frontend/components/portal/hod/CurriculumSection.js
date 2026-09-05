// HOD Curriculum & Accreditation section — program -> semester -> course
// map with credit-hour totals per semester (flagged when a semester
// deviates from the program's own average), the theory/lab split, the
// credit-hour policy editor (Phase 1's GET/PATCH /credit-hour-policies,
// exposed in the UI for the first time here), and an .xlsx export
// (Phase 6, 6.1 — new). Extracted as its own component per hard rule 9.
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Alert, inputCls, labelCls, Spinner } from '../ui.js';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

function PolicyEditor({ token }) {
  function headers() { return { headers: { Authorization: `Bearer ${token}` } }; }
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null); // { creditHours, isLab, sessions }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/portal/hod/credit-hour-policies`, headers());
      setPolicies(data || []);
    } catch { setPolicies([]); }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => { fetchPolicies(); }, [fetchPolicies]);

  const openEdit = (p) => {
    setError('');
    setEditing({
      creditHours: p.creditHours, isLab: p.isLab,
      sessions: p.sessions.length ? p.sessions.map((s) => ({ ...s })) : [{ kind: 'theory', durationMinutes: 60, count: 1 }],
    });
  };

  const save = async () => {
    setSaving(true); setError('');
    try {
      await axios.patch(`${API}/portal/hod/credit-hour-policies`, editing, headers());
      setEditing(null);
      fetchPolicies();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save policy.');
    }
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50"><h3 className="font-bold text-gray-800">Credit-Hour Policy</h3><p className="text-xs text-gray-400 mt-0.5">How many weekly sessions each credit-hour/lab combination requires. Overrides here apply only to your department.</p></div>
      {loading ? <div className="p-6"><Spinner /></div> : (
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>{['Credit Hours', 'Lab?', 'Weekly Sessions', 'Source', ''].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {policies.map((p, i) => (
              <tr key={i} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-semibold text-gray-800">{p.creditHours}</td>
                <td className="px-4 py-3">{p.isLab ? 'Yes' : 'No'}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {p.sessions.length === 0 ? '—' : p.sessions.map((s, j) => (
                    <span key={j} className="inline-block mr-2">{s.count} × {s.durationMinutes}min {s.kind}</span>
                  ))}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${p.isOverride ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>{p.isOverride ? 'Dept override' : 'University default'}</span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => openEdit(p)} className="text-xs font-bold text-indigo-600 px-3 py-1.5 border border-indigo-200 rounded-lg hover:bg-indigo-50">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 mb-3">Edit Policy — {editing.creditHours}CR {editing.isLab ? '(Lab)' : ''}</h3>
            <Alert type="error" msg={error} />
            <div className="space-y-3">
              {editing.sessions.map((s, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 items-end">
                  <div>
                    <label className={labelCls}>Kind</label>
                    <select value={s.kind} onChange={(e) => setEditing((ed) => { const sessions = [...ed.sessions]; sessions[i] = { ...sessions[i], kind: e.target.value }; return { ...ed, sessions }; })} className={inputCls}>
                      <option value="theory">Theory</option>
                      <option value="lab">Lab</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Minutes</label>
                    <input type="number" min="15" value={s.durationMinutes} onChange={(e) => setEditing((ed) => { const sessions = [...ed.sessions]; sessions[i] = { ...sessions[i], durationMinutes: Number(e.target.value) }; return { ...ed, sessions }; })} className={inputCls} />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className={labelCls}>Count</label>
                      <input type="number" min="1" value={s.count} onChange={(e) => setEditing((ed) => { const sessions = [...ed.sessions]; sessions[i] = { ...sessions[i], count: Number(e.target.value) }; return { ...ed, sessions }; })} className={inputCls} />
                    </div>
                    <button type="button" onClick={() => setEditing((ed) => ({ ...ed, sessions: ed.sessions.filter((_, j) => j !== i) }))} className="text-red-500 hover:text-red-700 px-2 pb-2.5">✕</button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setEditing((ed) => ({ ...ed, sessions: [...ed.sessions, { kind: 'theory', durationMinutes: 60, count: 1 }] }))} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">+ Add session row</button>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
              <button onClick={() => setEditing(null)} className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-600 text-sm font-semibold hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CurriculumSection({ hod, token }) {
  function headers() { return { headers: { Authorization: `Bearer ${token}` } }; }
  const [programs, setPrograms] = useState([]);
  const [programId, setProgramId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hod?.departmentId) {
      axios.get(`${API}/lookups/programs`, { params: { department: hod.departmentId } })
        .then(({ data }) => setPrograms(data || [])).catch(() => setPrograms([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hod]);

  const fetchCurriculum = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (programId) params.programId = programId;
      const { data } = await axios.get(`${API}/portal/hod/curriculum`, { params, ...headers() });
      setData(data);
    } catch { setData(null); }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId, token]);

  useEffect(() => { fetchCurriculum(); }, [fetchCurriculum]);

  const exportXlsx = async () => {
    try {
      const params = {};
      if (programId) params.programId = programId;
      const res = await axios.get(`${API}/portal/hod/curriculum/export.xlsx`, { params, ...headers(), responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Curriculum_${hod.department}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to export curriculum.');
    }
  };

  return (
    <>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Curriculum &amp; Accreditation</h2>
      <p className="text-gray-500 text-sm mb-5">Program → semester → course map with credit-hour totals and theory/lab split.</p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className={labelCls}>Program</label>
          <select value={programId} onChange={(e) => setProgramId(e.target.value)} className={inputCls}>
            <option value="">All Programs</option>
            {programs.map((p) => <option key={p._id} value={p._id}>{p.title}</option>)}
          </select>
        </div>
        {data && <button onClick={exportXlsx} className="px-5 py-2.5 rounded-xl text-xs font-bold border border-green-300 text-green-700 hover:bg-green-50">⬇ Export .xlsx</button>}
      </div>

      {loading ? <Spinner /> : !data ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400 shadow-sm">Could not load curriculum.</div>
      ) : (
        <div className="space-y-3 mb-8">
          {data.expectedCreditHoursPerSemester != null && (
            <p className="text-xs text-gray-400">Program average: <strong>{data.expectedCreditHoursPerSemester}</strong> credit hours/semester — semesters more than 3 away from this are flagged.</p>
          )}
          {data.semesters.map((s) => (
            <div key={s.semesterNumber} className={`bg-white rounded-2xl border shadow-sm p-4 ${s.deviates ? 'border-red-300' : 'border-gray-100'}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-800">Semester {s.semesterNumber}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{s.theoryCount} theory · {s.labCount} lab</span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${s.deviates ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{s.totalCreditHours} CR{s.deviates ? ' ⚠ deviates' : ''}</span>
                </div>
              </div>
              {s.courses.length === 0 ? (
                <p className="text-xs text-gray-400">No courses defined for this semester.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {s.courses.map((c) => (
                    <span key={c._id} className="text-xs bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1">
                      {c.code} — {c.title} ({c.creditHours}CR{c.isLab ? ', Lab' : ''})
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <PolicyEditor token={token} />
    </>
  );
}
