import { useState } from 'react';

// Shared presentation for curriculum and fee tables.
//
// These mirror the versions inside pages/departments/[slug].js so a programme's
// Course Content and Fee Structure read exactly like a department's. They live
// here because the programme page needs the same markup; the department page
// keeps its own copies for now, so this file can be changed without any risk of
// disturbing pages that are already live.

export function RichContent({ html, className = '' }) {
  if (!html) return null;
  return (
    <>
      <div className={`prose-dept ${className}`} dangerouslySetInnerHTML={{ __html: html }} />
      {/* Carried with the component so rich text renders correctly on any page
          that uses it, not only the one that happens to define these rules. */}
      <style jsx global>{`
        .prose-dept p   { margin-bottom: 0.6rem; line-height: 1.7; color: #374151; }
        .prose-dept ul  { list-style: disc; padding-left: 1.4rem; margin: 0.5rem 0; }
        .prose-dept ol  { list-style: decimal; padding-left: 1.4rem; margin: 0.5rem 0; }
        .prose-dept li  { margin-bottom: 0.25rem; }
        .prose-dept strong { font-weight: 700; }
        .prose-dept em     { font-style: italic; }
        .prose-dept u      { text-decoration: underline; }
        .prose-dept p[style*="text-align: center"]  { text-align: center; }
        .prose-dept p[style*="text-align: right"]   { text-align: right; }
        .prose-dept p[style*="text-align: justify"] { text-align: justify; }
      `}</style>
    </>
  );
}

export function FeeTable({ title, rows }) {
  if (!rows?.length) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
      <div className="px-5 py-3 font-bold text-sm" style={{ background: '#041476', color: '#fff' }}>
        {title}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: '#f0f3ff' }}>
              <th className="text-left px-4 py-2.5 font-semibold text-gray-600 w-12">S#</th>
              <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Description</th>
              <th className="text-right px-4 py-2.5 font-semibold text-gray-600 w-36">Fee (PKR)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-2.5 text-gray-500">{i + 1}</td>
                <td className="px-4 py-2.5 text-gray-700">{r.description}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-gray-800">{r.fee}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SemesterTable({ sem, index }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left font-bold text-sm text-white transition-colors"
        style={{ background: '#041476' }}
      >
        <span>{sem.title || `Semester ${index + 1}`}</span>
        <span className="text-white/70 text-xs">{open ? '▲' : '▼'} {sem.courses?.length || 0} courses</span>
      </button>
      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#f0f3ff' }}>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 w-10">S#</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Course Title</th>
                <th className="text-center px-4 py-2.5 font-semibold text-gray-600 w-28">Credit Hours</th>
                <th className="text-center px-4 py-2.5 font-semibold text-gray-600 w-28">Theory+Lab</th>
                <th className="text-center px-4 py-2.5 font-semibold text-gray-600 w-24">Code</th>
              </tr>
            </thead>
            <tbody>
              {(sem.courses || []).map((c, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2.5 text-gray-500">{i + 1}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{c.courseTitle}</td>
                  <td className="px-4 py-2.5 text-center text-gray-600">{c.creditHours}</td>
                  <td className="px-4 py-2.5 text-center text-gray-600">{c.theoryLab}</td>
                  <td className="px-4 py-2.5 text-center text-gray-500 font-mono text-xs">{c.code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function CustomTable({ table }) {
  const columns = table?.columns || [];
  const rows    = table?.rows || [];
  if (!columns.length || !rows.length) return null;

  const serial = table.showSerial !== false;
  // Numbering counts ordinary rows only, so a "Total" line does not take a number.
  let n = 0;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white">
      {table.title && (
        <div className="px-5 py-3.5 text-left font-bold text-sm text-white" style={{ background: '#041476' }}>
          {table.title}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: '#f0f3ff' }}>
              {serial && (
                <th className="text-center px-4 py-2.5 font-semibold text-gray-600 w-16 whitespace-nowrap">
                  {table.serialLabel || 'S/N'}
                </th>
              )}
              {columns.map((c, i) => (
                <th key={i}
                  className={`px-4 py-2.5 font-semibold text-gray-600 ${i === 0 ? 'text-left' : 'text-center whitespace-nowrap'}`}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => {
              const isTotal = !!r.highlight;
              if (!isTotal) n += 1;
              const num = n;
              return (
                <tr key={ri}
                  className={isTotal
                    ? 'border-t-2 border-gray-300 font-bold text-gray-900'
                    : (ri % 2 === 0 ? 'bg-white' : 'bg-gray-50')}
                  style={isTotal ? { background: '#f0f3ff' } : undefined}>
                  {serial && (
                    <td className="px-4 py-2.5 text-center text-gray-500 whitespace-nowrap">
                      {isTotal ? (r.label || '') : num}
                    </td>
                  )}
                  {columns.map((_, ci) => (
                    <td key={ci}
                      className={`px-4 py-2.5 ${ci === 0 ? 'text-left text-gray-800' : 'text-center text-gray-600'} ${isTotal ? 'text-gray-900' : ''}`}>
                      {r.cells?.[ci] || ''}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
