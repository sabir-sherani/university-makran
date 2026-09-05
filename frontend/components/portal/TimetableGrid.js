// Days x sessions timetable grid — shared by all four portals (HOD, teacher,
// student, admin) so there's exactly one rendering of a TimetableSlot list.
// Purely props-driven: no role-specific logic, no data fetching. The parent
// wraps this in its own print/export controls (see
// frontend/components/portal/hod/TimetableSection.js for the full example).
import React from 'react';

const KIND_STYLES = {
  theory: 'bg-emerald-50 border-emerald-300 text-emerald-800',
  lab: 'bg-sky-50 border-sky-300 text-sky-800',
};

// grid: { days: string[], byDay: { [day]: slot[] } } — the exact shape
// returned by backend/utils/timetableGrid.js's buildGrid().
export default function TimetableGrid({ grid, loading, emptyLabel, printId, dense }) {
  const days = grid?.days || [];
  const byDay = grid?.byDay || {};
  const hasAny = days.some((d) => (byDay[d] || []).length > 0);

  if (loading) return <div className="text-gray-400 text-sm py-10 text-center">Loading timetable…</div>;

  if (!hasAny) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
        <p className="text-3xl mb-3">🗓️</p>
        <p className="text-gray-500">{emptyLabel || 'No timetable slots to show.'}</p>
      </div>
    );
  }

  return (
    <div id={printId} className="overflow-x-auto">
      <div
        className={`grid gap-3 ${dense ? 'min-w-[760px]' : 'min-w-[900px]'} timetable-grid-cols`}
        style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0,1fr))` }}
      >
        {days.map((day) => (
          <div key={day} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-100 px-3 py-2 text-center">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">{day}</p>
            </div>
            <div className="p-2 space-y-2 min-h-[80px]">
              {(byDay[day] || []).length === 0 ? (
                <p className="text-center text-xs text-gray-300 py-6">—</p>
              ) : (
                (byDay[day] || []).map((s) => (
                  <div
                    key={s._id || `${s.day}-${s.startTime}-${s.room}-${s.subject}`}
                    className={`rounded-xl border px-3 py-2 text-xs ${KIND_STYLES[s.kind] || 'bg-gray-50 border-gray-200 text-gray-700'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold">{s.startTime}–{s.endTime}</p>
                      {s.kind === 'lab' && <span className="px-1.5 py-0.5 rounded-full bg-white/70 text-[10px] font-bold">LAB</span>}
                    </div>
                    <p className="font-semibold mt-0.5 leading-snug">{s.courseCode ? `${s.courseCode} — ` : ''}{s.subject}</p>
                    <p className="mt-1 text-[11px] opacity-80">{s.teacherName}</p>
                    <p className="text-[11px] opacity-80">{s.room}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
