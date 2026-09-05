// HOD Timetable section — filter bar, requirements panel, auto-suggest
// review flow, manual add/edit, and print/export. Extracted out of hod.js
// per hard rule 9 (that file is already 1400+ lines and must not keep
// growing) rather than inlined into the portal page.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Alert, inputCls, labelCls, Spinner } from '../ui.js';
import TimetableGrid from '../TimetableGrid.js';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const KIND_LABEL = { theory: 'Theory', lab: 'Lab' };

function parseSemesterNumber(semesterLike) {
  const m = String(semesterLike || '').match(/\d+/);
  return m ? Number(m[0]) : null;
}

function ConflictList({ conflicts }) {
  if (!conflicts || !conflicts.length) return null;
  return (
    <ul className="bg-red-50 border-l-4 border-red-500 text-red-700 text-xs rounded-lg px-4 py-3 mb-3 list-disc list-inside space-y-0.5">
      {conflicts.map((c, i) => <li key={i}>{c}</li>)}
    </ul>
  );
}

function WarningList({ warnings }) {
  if (!warnings || !warnings.length) return null;
  return (
    <ul className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 text-xs rounded-lg px-4 py-3 mb-3 list-disc list-inside space-y-0.5">
      {warnings.map((w, i) => <li key={i}>{w}</li>)}
    </ul>
  );
}

export default function TimetableSection({ hod, token }) {
  function headers() { return { headers: { Authorization: `Bearer ${token}` } }; }

  const [sessions, setSessions] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [ongoingClasses, setOngoingClasses] = useState([]);

  const [filters, setFilters] = useState({ sessionId: '', programId: '', semesterNumber: '', timeSession: '' });

  const [gridData, setGridData] = useState({ slots: [], grid: { days: DAYS, byDay: {} } });
  const [gridLoading, setGridLoading] = useState(false);

  const [requirements, setRequirements] = useState([]);
  const [reqLoading, setReqLoading] = useState(false);

  const [suggest, setSuggest] = useState(null); // { ongoingClassId, label, loading, payload, selected, error }
  const [suggestSaving, setSuggestSaving] = useState(false);
  const [suggestError, setSuggestError] = useState('');

  const emptyManualForm = { ongoingClassId: '', kind: 'theory', day: 'Monday', startTime: '09:00', durationMinutes: 90, roomId: '' };
  const [manual, setManual] = useState(null); // { editingId, form, saving, error, conflicts, warnings }
  const [postSaveWarnings, setPostSaveWarnings] = useState([]);

  const emptyRoomForm = { code: '', name: '', building: '', capacity: '', type: 'classroom' };
  const [roomsModal, setRoomsModal] = useState(null); // { form, saving, error }

  const fetchRooms = useCallback(() => {
    axios.get(`${API}/portal/hod/rooms`, headers()).then(({ data }) => setRooms(data || [])).catch(() => setRooms([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ── Lookups ──
  useEffect(() => {
    axios.get(`${API}/lookups/sessions`).then(({ data }) => setSessions(data || [])).catch(() => {});
    if (hod?.departmentId) {
      axios.get(`${API}/lookups/programs`, { params: { department: hod.departmentId } })
        .then(({ data }) => setPrograms(data || [])).catch(() => setPrograms([]));
    }
    fetchRooms();
    axios.get(`${API}/portal/hod/ongoing-classes`, { params: { status: 'active' }, ...headers() })
      .then(({ data }) => setOngoingClasses(data || [])).catch(() => setOngoingClasses([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hod, token]);

  // ── Rooms manager ──
  function openRoomsManager() {
    setRoomsModal({ form: { ...emptyRoomForm }, saving: false, error: '' });
  }

  async function addRoom(e) {
    e.preventDefault();
    setRoomsModal((m) => ({ ...m, saving: true, error: '' }));
    try {
      const { code, name, building, capacity, type } = roomsModal.form;
      await axios.post(`${API}/portal/hod/rooms`, {
        code, name, building: building || undefined,
        capacity: capacity ? Number(capacity) : undefined,
        type,
      }, headers());
      fetchRooms();
      setRoomsModal((m) => ({ ...m, form: { ...emptyRoomForm }, saving: false }));
    } catch (err) {
      setRoomsModal((m) => ({ ...m, saving: false, error: err.response?.data?.message || 'Failed to add room.' }));
    }
  }

  async function deleteRoom(room) {
    if (!confirm(`Delete room ${room.code} — ${room.name}?`)) return;
    try {
      await axios.delete(`${API}/portal/hod/rooms/${room._id}`, headers());
      fetchRooms();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete room.');
    }
  }

  const fetchGrid = useCallback(async () => {
    setGridLoading(true);
    try {
      const params = {};
      if (filters.sessionId) params.sessionId = filters.sessionId;
      if (filters.programId) params.programId = filters.programId;
      if (filters.semesterNumber) params.semesterNumber = filters.semesterNumber;
      if (filters.timeSession) params.timeSession = filters.timeSession;
      const { data } = await axios.get(`${API}/portal/hod/timetable`, { params, ...headers() });
      setGridData(data);
    } catch { setGridData({ slots: [], grid: { days: DAYS, byDay: {} } }); }
    setGridLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, token]);

  const filtersComplete = filters.sessionId && filters.programId && filters.semesterNumber;

  const fetchRequirements = useCallback(async () => {
    if (!filtersComplete) { setRequirements([]); return; }
    setReqLoading(true);
    try {
      const { data } = await axios.get(`${API}/portal/hod/timetable/requirements`, {
        params: { sessionId: filters.sessionId, programId: filters.programId, semesterNumber: filters.semesterNumber },
        ...headers(),
      });
      setRequirements(data || []);
    } catch { setRequirements([]); }
    setReqLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, token]);

  useEffect(() => { fetchGrid(); }, [fetchGrid]);
  useEffect(() => { fetchRequirements(); }, [fetchRequirements]);

  const classesForFilters = useMemo(() => ongoingClasses.filter((c) => {
    if (filters.programId && String(c.programId) !== String(filters.programId)) return false;
    if (filters.semesterNumber && parseSemesterNumber(c.semester) !== Number(filters.semesterNumber)) return false;
    if (filters.sessionId && String(c.sessionId) !== String(filters.sessionId)) return false;
    if (filters.timeSession && c.timeSession !== filters.timeSession) return false;
    return true;
  }), [ongoingClasses, filters]);

  // ── Suggest flow ──
  async function openSuggest(course) {
    setSuggestError('');
    setSuggest({ ongoingClassId: course.ongoingClassId, label: `${course.courseCode || ''} ${course.subject}`.trim(), loading: true, payload: null, selected: new Set() });
    try {
      const { data } = await axios.post(`${API}/portal/hod/timetable/suggest`, { ongoingClassId: course.ongoingClassId }, headers());
      setSuggest((s) => ({ ...s, loading: false, payload: data, selected: new Set(data.suggestions.map((_, i) => i)) }));
    } catch (err) {
      setSuggestError(err.response?.data?.message || 'Failed to generate suggestions.');
      setSuggest(null);
    }
  }

  function toggleSuggestion(i) {
    setSuggest((s) => {
      const next = new Set(s.selected);
      if (next.has(i)) next.delete(i); else next.add(i);
      return { ...s, selected: next };
    });
  }

  function editSuggestion(i, field, value) {
    setSuggest((s) => {
      const suggestions = s.payload.suggestions.map((row, idx) => idx === i ? { ...row, [field]: value } : row);
      return { ...s, payload: { ...s.payload, suggestions } };
    });
  }

  async function acceptSelectedSuggestions() {
    if (!suggest?.payload?.suggestions?.length) return;
    const rows = suggest.payload.suggestions
      .filter((_, i) => suggest.selected.has(i))
      .map((s) => ({ ongoingClassId: s.ongoingClass, kind: s.kind, day: s.day, startTime: s.startTime, durationMinutes: s.durationMinutes, roomId: s.roomId }));
    if (!rows.length) { setSuggestError('Select at least one suggestion to accept.'); return; }
    setSuggestSaving(true);
    setSuggestError('');
    try {
      await axios.post(`${API}/portal/hod/timetable/bulk`, { slots: rows }, headers());
      setSuggest(null);
      fetchGrid();
      fetchRequirements();
    } catch (err) {
      setSuggestError(err.response?.data?.conflicts?.join(' ') || err.response?.data?.errors?.join(' ') || err.response?.data?.message || 'Failed to save suggestions.');
    }
    setSuggestSaving(false);
  }

  // ── Manual add/edit ──
  function openManualAdd() {
    setManual({ editingId: null, form: { ...emptyManualForm, day: filters.timeSession === 'Evening' ? 'Monday' : 'Monday' }, saving: false, error: '', conflicts: [], warnings: [] });
  }
  function openManualEdit(slot) {
    setManual({
      editingId: slot._id,
      form: { ongoingClassId: slot.ongoingClass, kind: slot.kind, day: slot.day, startTime: slot.startTime, durationMinutes: slot.durationMinutes, roomId: slot.roomId },
      saving: false, error: '', conflicts: [], warnings: [],
    });
  }

  async function saveManual(e) {
    e.preventDefault();
    setManual((m) => ({ ...m, saving: true, error: '', conflicts: [] }));
    try {
      const body = manual.form;
      let data;
      if (manual.editingId) {
        ({ data } = await axios.patch(`${API}/portal/hod/timetable/${manual.editingId}`, body, headers()));
      } else {
        ({ data } = await axios.post(`${API}/portal/hod/timetable`, body, headers()));
      }
      setManual(null);
      fetchGrid();
      fetchRequirements();
      setPostSaveWarnings(data?.warnings || []);
    } catch (err) {
      setManual((m) => ({
        ...m, saving: false,
        error: err.response?.data?.message || 'Failed to save slot.',
        conflicts: err.response?.data?.conflicts || [],
      }));
    }
  }

  async function deleteSlot(slot) {
    if (!confirm(`Remove ${slot.subject} on ${slot.day} ${slot.startTime}–${slot.endTime}?`)) return;
    try {
      await axios.delete(`${API}/portal/hod/timetable/${slot._id}`, headers());
      fetchGrid();
      fetchRequirements();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete slot.');
    }
  }

  // ── Export ──
  async function exportXlsx() {
    try {
      const params = {};
      if (filters.sessionId) params.sessionId = filters.sessionId;
      if (filters.programId) params.programId = filters.programId;
      if (filters.semesterNumber) params.semesterNumber = filters.semesterNumber;
      if (filters.timeSession) params.timeSession = filters.timeSession;
      const res = await axios.get(`${API}/portal/hod/timetable/export.xlsx`, { params, ...headers(), responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Timetable_${hod.department}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to export timetable.');
    }
  }

  const selectedProgramName = programs.find((p) => p._id === filters.programId)?.title || '';
  const selectedSessionName = sessions.find((s) => s._id === filters.sessionId)?.name || '';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 tt-no-print">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Timetable</h2>
          <p className="text-gray-500 text-sm mt-0.5">Slots, rooms and clash detection for {hod.department}.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openRoomsManager} className="px-4 py-2.5 min-h-11 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">
            🏫 Manage Rooms
          </button>
          <button onClick={openManualAdd} className="px-4 py-2.5 min-h-11 rounded-xl text-sm font-bold text-white hover:opacity-90 transition" style={{ background: '#4338ca' }}>
            + Add Slot
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2.5 min-h-11 text-sm font-semibold rounded-xl text-white" style={{ background: '#041476' }}>
            🖨 Print / Save PDF
          </button>
          <button onClick={exportXlsx} className="px-4 py-2.5 min-h-11 text-sm font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">
            ⬇ Export .xlsx
          </button>
        </div>
      </div>

      {postSaveWarnings.length > 0 && (
        <div className="tt-no-print">
          <WarningList warnings={postSaveWarnings} />
          <button onClick={() => setPostSaveWarnings([])} className="text-xs font-semibold text-gray-400 hover:text-gray-600 -mt-3 mb-2">Dismiss</button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-end gap-3 tt-no-print">
        <div>
          <label className={labelCls}>Session</label>
          <select value={filters.sessionId} onChange={(e) => setFilters((f) => ({ ...f, sessionId: e.target.value }))} className={inputCls}>
            <option value="">Select session</option>
            {sessions.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Program</label>
          <select value={filters.programId} onChange={(e) => setFilters((f) => ({ ...f, programId: e.target.value }))} className={inputCls}>
            <option value="">Select program</option>
            {programs.map((p) => <option key={p._id} value={p._id}>{p.title}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Semester</label>
          <select value={filters.semesterNumber} onChange={(e) => setFilters((f) => ({ ...f, semesterNumber: e.target.value }))} className={inputCls}>
            <option value="">Select semester</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>Semester {n}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Time Session</label>
          <select value={filters.timeSession} onChange={(e) => setFilters((f) => ({ ...f, timeSession: e.target.value }))} className={inputCls}>
            <option value="">Morning &amp; Evening</option>
            <option value="Morning">🌅 Morning</option>
            <option value="Evening">🌙 Evening</option>
          </select>
        </div>
      </div>

      {/* Print-only header */}
      <div className="tt-print-header" style={{ display: 'none', marginBottom: '14px', borderBottom: '2px solid #041476', paddingBottom: '8px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#041476' }}>University of Makran, Panjgur</div>
        <div style={{ fontSize: '12px', color: '#FA7902', fontWeight: 600, marginTop: '4px' }}>
          Timetable — {hod.department}{selectedProgramName ? ` · ${selectedProgramName}` : ''}{filters.semesterNumber ? ` · Semester ${filters.semesterNumber}` : ''}{filters.timeSession ? ` · ${filters.timeSession}` : ''}{selectedSessionName ? ` · ${selectedSessionName}` : ''}
        </div>
      </div>

      {/* Requirements panel */}
      {filtersComplete && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 tt-no-print">
          <h3 className="font-bold text-gray-800 mb-3">Requirements — scheduled vs required</h3>
          {reqLoading ? <Spinner /> : requirements.length === 0 ? (
            <p className="text-sm text-gray-400">No active classes assigned for this program/semester/session yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['Course', 'Teacher', 'Required', 'Scheduled', 'Shortfall', ''].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {requirements.map((r) => (
                    <tr key={r.ongoingClassId} className={r.shortfall > 0 ? 'bg-red-50/40' : ''}>
                      <td className="px-3 py-2 font-semibold text-gray-800">{r.courseCode ? `${r.courseCode} — ` : ''}{r.subject}</td>
                      <td className="px-3 py-2 text-gray-600 text-xs">{r.teacherName}</td>
                      <td className="px-3 py-2 text-center">{r.required}</td>
                      <td className="px-3 py-2 text-center">{r.scheduled}</td>
                      <td className="px-3 py-2 text-center">
                        {r.shortfall > 0 ? <span className="text-red-600 font-bold">{r.shortfall}</span> : <span className="text-green-600 font-bold">0</span>}
                      </td>
                      <td className="px-3 py-2">
                        {r.shortfall > 0 && (
                          <button onClick={() => openSuggest(r)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-700 hover:bg-indigo-200">
                            Suggest slots
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Grid */}
      <div className="tt-printable">
        <TimetableGrid grid={gridData.grid} loading={gridLoading} emptyLabel="No timetable slots match these filters yet." />
        <div className="tt-print-footer" style={{ display: 'none', marginTop: '16px', borderTop: '1px solid #ccc', paddingTop: '8px', textAlign: 'right', fontSize: '10px', color: '#555' }}>
          Generated on {new Date().toLocaleDateString('en-GB')}
        </div>
      </div>

      {/* Slot list (edit/delete) — screen only */}
      {gridData.slots?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden tt-no-print">
          <div className="px-5 py-3 border-b border-gray-50"><h3 className="font-bold text-gray-800 text-sm">All slots ({gridData.slots.length})</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Day', 'Time', 'Course', 'Kind', 'Teacher', 'Room', ''].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {gridData.slots.map((s) => (
                  <tr key={s._id} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2 text-gray-600">{s.day}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">{s.startTime}–{s.endTime}</td>
                    <td className="px-3 py-2 font-semibold text-gray-800">{s.courseCode ? `${s.courseCode} — ` : ''}{s.subject}</td>
                    <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.kind === 'lab' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'}`}>{KIND_LABEL[s.kind]}</span></td>
                    <td className="px-3 py-2 text-gray-600 text-xs">{s.teacherName}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs">{s.room}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <button onClick={() => openManualEdit(s)} className="text-xs font-bold text-indigo-600 mr-3 hover:underline">Edit</button>
                      <button onClick={() => deleteSlot(s)} className="text-xs font-bold text-red-600 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Suggest modal ── */}
      {suggest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 tt-no-print" onClick={() => setSuggest(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 text-lg mb-1">Suggested slots — {suggest.label}</h3>
            <p className="text-gray-500 text-sm mb-4">Review each proposal, edit if needed, then accept the ones you want.</p>
            <Alert type="error" msg={suggestError} />
            {suggest.loading ? <Spinner label="Generating suggestions…" /> : !suggest.payload ? null : (
              <>
                {suggest.payload.suggestions.length === 0 ? (
                  <p className="text-sm text-gray-500 mb-4">No clash-free suggestions could be generated with the current rooms/working hours.</p>
                ) : (
                  <div className="space-y-2 mb-4">
                    {suggest.payload.suggestions.map((s, i) => (
                      <div key={i} className={`border rounded-xl p-3 flex flex-wrap items-center gap-2 ${suggest.selected.has(i) ? 'border-indigo-300 bg-indigo-50/40' : 'border-gray-200'}`}>
                        <input type="checkbox" checked={suggest.selected.has(i)} onChange={() => toggleSuggestion(i)} className="accent-indigo-600" />
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 uppercase">{s.kind}</span>
                        <select value={s.day} onChange={(e) => editSuggestion(i, 'day', e.target.value)} className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs">
                          {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <input type="time" value={s.startTime} onChange={(e) => editSuggestion(i, 'startTime', e.target.value)} className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs" />
                        <input type="number" min={15} max={240} step={5} value={s.durationMinutes} onChange={(e) => editSuggestion(i, 'durationMinutes', Number(e.target.value))} className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-xs" />
                        <span className="text-xs text-gray-400">min</span>
                        <select value={s.roomId} onChange={(e) => editSuggestion(i, 'roomId', e.target.value)} className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs flex-1 min-w-[140px]">
                          {rooms.map((r) => <option key={r._id} value={r._id}>{r.code} — {r.name}</option>)}
                        </select>
                        <button type="button" onClick={() => toggleSuggestion(i)} className="text-xs font-bold text-gray-400 hover:text-red-600">
                          {suggest.selected.has(i) ? 'Skip' : 'Include'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {suggest.payload.unplaceable?.length > 0 && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 text-xs rounded-lg px-4 py-3 mb-4">
                    {suggest.payload.unplaceable.map((u, i) => (
                      <p key={i}>{u.kind ? `${KIND_LABEL[u.kind] || u.kind} (${u.durationMinutes}min): ` : ''}{u.reason}</p>
                    ))}
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={acceptSelectedSuggestions} disabled={suggestSaving || !suggest.payload.suggestions.length}
                    className="px-5 py-2.5 min-h-11 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-50" style={{ background: '#4338ca' }}>
                    {suggestSaving ? 'Saving…' : 'Accept selected'}
                  </button>
                  <button type="button" onClick={() => setSuggest(null)} className="px-5 py-2.5 min-h-11 rounded-xl text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50">
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Manual add/edit modal ── */}
      {manual && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 tt-no-print" onClick={() => setManual(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 text-lg mb-4">{manual.editingId ? 'Edit Slot' : 'Add Slot'}</h3>
            <Alert type="error" msg={manual.error} />
            <ConflictList conflicts={manual.conflicts} />
            <form onSubmit={saveManual} className="space-y-3">
              <div>
                <label className={labelCls}>Class *</label>
                <select required disabled={!!manual.editingId} value={manual.form.ongoingClassId}
                  onChange={(e) => setManual((m) => ({ ...m, form: { ...m.form, ongoingClassId: e.target.value } }))} className={inputCls}>
                  <option value="">Select a class</option>
                  {(manual.editingId ? ongoingClasses : classesForFilters).map((c) => (
                    <option key={c._id} value={c._id}>{c.courseCode ? `${c.courseCode} — ` : ''}{c.subject} — {c.teacherName}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Kind</label>
                  <select value={manual.form.kind} onChange={(e) => setManual((m) => ({ ...m, form: { ...m.form, kind: e.target.value } }))} className={inputCls}>
                    <option value="theory">Theory</option>
                    <option value="lab">Lab</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Day</label>
                  <select value={manual.form.day} onChange={(e) => setManual((m) => ({ ...m, form: { ...m.form, day: e.target.value } }))} className={inputCls}>
                    {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Start Time</label>
                  <input type="time" required value={manual.form.startTime} onChange={(e) => setManual((m) => ({ ...m, form: { ...m.form, startTime: e.target.value } }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Duration (min)</label>
                  <input type="number" min={15} max={240} step={5} required value={manual.form.durationMinutes}
                    onChange={(e) => setManual((m) => ({ ...m, form: { ...m.form, durationMinutes: Number(e.target.value) } }))} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Room *</label>
                <select required value={manual.form.roomId} onChange={(e) => setManual((m) => ({ ...m, form: { ...m.form, roomId: e.target.value } }))} className={inputCls}>
                  <option value="">Select room</option>
                  {rooms.map((r) => <option key={r._id} value={r._id}>{r.code} — {r.name} (cap {r.capacity})</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={manual.saving} className="px-6 py-2.5 min-h-11 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-50" style={{ background: '#4338ca' }}>
                  {manual.saving ? 'Saving…' : manual.editingId ? 'Save Changes' : 'Add Slot'}
                </button>
                <button type="button" onClick={() => setManual(null)} className="px-6 py-2.5 min-h-11 rounded-xl text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Rooms manager modal ── */}
      {roomsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 tt-no-print" onClick={() => setRoomsModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 text-lg mb-1">Manage Rooms</h3>
            <p className="text-gray-500 text-sm mb-4">Rooms your department can schedule classes into. Shared university-wide rooms (added by admin) also show up here read-only.</p>

            <Alert type="error" msg={roomsModal.error} />
            <form onSubmit={addRoom} className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4 items-end">
              <div className="col-span-1">
                <label className={labelCls}>Code *</label>
                <input required maxLength={20} value={roomsModal.form.code}
                  onChange={(e) => setRoomsModal((m) => ({ ...m, form: { ...m.form, code: e.target.value } }))}
                  className={inputCls} placeholder="B1-101" />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <label className={labelCls}>Name *</label>
                <input required maxLength={120} value={roomsModal.form.name}
                  onChange={(e) => setRoomsModal((m) => ({ ...m, form: { ...m.form, name: e.target.value } }))}
                  className={inputCls} placeholder="Lecture Hall 1" />
              </div>
              <div className="col-span-1">
                <label className={labelCls}>Type</label>
                <select value={roomsModal.form.type} onChange={(e) => setRoomsModal((m) => ({ ...m, form: { ...m.form, type: e.target.value } }))} className={inputCls}>
                  <option value="classroom">Classroom</option>
                  <option value="lab">Lab</option>
                  <option value="seminar">Seminar</option>
                </select>
              </div>
              <div className="col-span-1">
                <label className={labelCls}>Capacity</label>
                <input type="number" min={1} max={2000} value={roomsModal.form.capacity}
                  onChange={(e) => setRoomsModal((m) => ({ ...m, form: { ...m.form, capacity: e.target.value } }))}
                  className={inputCls} placeholder="60" />
              </div>
              <div className="col-span-2 sm:col-span-5">
                <label className={labelCls}>Building</label>
                <input maxLength={120} value={roomsModal.form.building}
                  onChange={(e) => setRoomsModal((m) => ({ ...m, form: { ...m.form, building: e.target.value } }))}
                  className={inputCls} placeholder="Block B (optional)" />
              </div>
              <div className="col-span-2 sm:col-span-5">
                <button type="submit" disabled={roomsModal.saving} className="px-5 py-2.5 min-h-11 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-50" style={{ background: '#4338ca' }}>
                  {roomsModal.saving ? 'Adding…' : '+ Add Room'}
                </button>
              </div>
            </form>

            <div className="border-t border-gray-100 pt-3">
              <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Existing rooms ({rooms.length})</h4>
              {rooms.length === 0 ? (
                <p className="text-sm text-gray-400">No rooms yet — add one above.</p>
              ) : (
                <div className="space-y-1.5">
                  {rooms.map((r) => (
                    <div key={r._id} className="flex items-center justify-between px-3 py-2 border border-gray-100 rounded-lg text-sm">
                      <div>
                        <span className="font-semibold text-gray-800">{r.code}</span>
                        <span className="text-gray-500"> — {r.name}</span>
                        <span className="text-gray-400 text-xs ml-2">{r.type}{r.capacity ? ` · cap ${r.capacity}` : ''}{r.building ? ` · ${r.building}` : ''}{!r.departmentId ? ' · shared' : ''}</span>
                      </div>
                      {r.departmentId && (
                        <button onClick={() => deleteRoom(r)} className="text-xs font-bold text-red-600 hover:underline">Delete</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setRoomsModal(null)} className="px-6 py-2.5 min-h-11 rounded-xl text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body * { visibility: hidden; }
          .tt-printable, .tt-printable *, .tt-print-header, .tt-print-header * { visibility: visible; }
          .tt-print-header, .tt-print-footer { display: block !important; }
          .tt-printable { position: absolute; top: 70px; left: 0; width: 100%; }
          .tt-no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
