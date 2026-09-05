// Shared primitives for new portal sections — see hard rule 9 in
// prompts/phase-2.md: extract new sections into their own components instead
// of growing the (already huge) portal page files, and share primitives like
// these across portals instead of redefining them per file. The existing
// per-page copies in hod.js/teacher.js/student.js are left as-is; this module
// is what every new component (TimetableGrid, hod/TimetableSection, ...) imports.
import React from 'react';

export const inputCls = 'w-full px-4 py-2.5 min-h-11 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition-all';
export const labelCls = 'block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5';

export function Alert({ type, msg }) {
  if (!msg) return null;
  const styles = type === 'error'
    ? 'bg-red-50 border-l-4 border-red-500 text-red-700'
    : 'bg-green-50 border-l-4 border-green-500 text-green-700';
  return <div className={`px-4 py-3 rounded-lg text-sm mb-4 ${styles}`}>{msg}</div>;
}

export function StatCard({ label, value, color }) {
  return (
    <div className={`bg-white rounded-2xl p-5 border-l-4 ${color || 'border-indigo-500'} shadow-sm`}>
      <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold text-gray-800 mt-1">{value ?? '—'}</p>
    </div>
  );
}

export function Spinner({ label }) {
  return (
    <div className="flex items-center gap-3 text-gray-400">
      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      {label || 'Loading…'}
    </div>
  );
}

// Shared status-badge color map — student/teacher/correction-request/etc.
// status pills all use the same four colors instead of each portal file
// redefining its own copy.
export const STATUS_BADGE = {
  approved: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  rejected: 'bg-red-100 text-red-800',
  suspended: 'bg-gray-100 text-gray-600',
};
