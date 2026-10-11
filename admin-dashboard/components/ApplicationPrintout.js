import React from 'react';

/**
 * A print-ready copy of a submitted admission application.
 *
 * Rendered hidden on screen and revealed only by the print stylesheet, so the
 * same markup serves both "Print" buttons without a second page or a
 * server-side PDF step. The applicant prints it to sign and hand in; the admin
 * prints the same sheet from the dashboard.
 */

function parseQuals(raw) {
  if (!raw) return [];
  let obj = raw;
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw); } catch { return []; }
  }
  if (!obj || typeof obj !== 'object') return [];
  const LABELS = {
    matric: 'Matriculation', intermediate: 'Intermediate',
    bachelor: 'Bachelor', master: 'Master', other: 'Other',
  };
  return Object.entries(obj)
    .filter(([, q]) => q && (q.degreeTitle || q.passingYear || q.obtainedMarks))
    .map(([key, q]) => ({
      level: LABELS[key] || key,
      degreeTitle: q.degreeTitle || '',
      board: q.board || q.institute || '',
      passingYear: q.passingYear || '',
      obtained: q.obtainedMarks || '',
      total: q.totalMarks || '',
    }));
}

const fmtDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return isNaN(dt.getTime())
    ? String(d)
    : dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

function Field({ label, value, wide }) {
  return (
    <div className={`pf-field${wide ? ' pf-wide' : ''}`}>
      <span className="pf-label">{label}</span>
      <span className="pf-value">{value || '—'}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="pf-section">
      <h2 className="pf-h2">{title}</h2>
      <div className="pf-grid">{children}</div>
    </section>
  );
}

export default function ApplicationPrintout({ app, photoUrl, id = 'application-printout' }) {
  if (!app) return null;
  const quals = parseQuals(app.qualifications);

  return (
    <div id={id} className="pf-root" aria-hidden="true">
      <div className="pf-page">

        {/* Letterhead */}
        <header className="pf-head">
          <div className="pf-head-text">
            <h1>University of Makran, Panjgur</h1>
            <p className="pf-sub">Balochistan, Pakistan</p>
            <p className="pf-title">Admission Application Form</p>
          </div>
          {photoUrl && <img className="pf-photo" src={photoUrl} alt="" />}
        </header>

        <div className="pf-meta">
          <span><strong>Batch:</strong> {app.batchName || '—'}</span>
          <span><strong>Applied On:</strong> {fmtDate(app.createdAt) || '—'}</span>
          <span><strong>Status:</strong> {(app.status || 'pending').toUpperCase()}</span>
        </div>

        <Section title="Program of Study">
          <Field label="Department" value={app.department} />
          <Field label="Program (1st Priority)" value={app.program} />
          <Field label="2nd Priority Department" value={app.secondDepartment} />
          <Field label="2nd Priority Program" value={app.secondPriority} />
          <Field label="3rd Priority Department" value={app.thirdDepartment} />
          <Field label="3rd Priority Program" value={app.thirdPriority} />
        </Section>

        <Section title="Personal Details">
          <Field label="Candidate Name" value={app.candidateName} />
          <Field label="Father's Name" value={app.fatherName} />
          <Field label="CNIC" value={app.cnic} />
          <Field label="Date of Birth" value={fmtDate(app.dob)} />
          <Field label="Gender" value={app.gender} />
          <Field label="Nationality" value={app.nationality} />
          <Field label="Email" value={app.email} />
          <Field label="Phone" value={app.phone} />
          <Field label="WhatsApp" value={app.whatsapp} />
          <Field label="City" value={app.city} />
          <Field label="Current Address" value={app.currentAddress} wide />
          <Field label="Permanent Address" value={app.permanentAddress} wide />
        </Section>

        <section className="pf-section">
          <h2 className="pf-h2">Academic Qualifications</h2>
          <table className="pf-table">
            <thead>
              <tr>
                <th style={{ width: '20%' }}>Level</th>
                <th>Degree / Certificate</th>
                <th style={{ width: '14%' }}>Board / Institute</th>
                <th style={{ width: '10%' }}>Year</th>
                <th style={{ width: '12%' }}>Obtained</th>
                <th style={{ width: '12%' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {quals.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center' }}>—</td></tr>
              ) : quals.map((q, i) => (
                <tr key={i}>
                  <td>{q.level}</td>
                  <td>{q.degreeTitle || '—'}</td>
                  <td>{q.board || '—'}</td>
                  <td>{q.passingYear || '—'}</td>
                  <td>{q.obtained || '—'}</td>
                  <td>{q.total || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="pf-declaration">
          <h2 className="pf-h2">Declaration</h2>
          <p>
            I hereby declare that the information given above is true and correct to the best of my
            knowledge. I understand that any false statement or concealment of fact may result in the
            cancellation of my admission at any stage.
          </p>
        </section>

        <div className="pf-signs">
          <div><span className="pf-line" />Applicant's Signature</div>
          <div><span className="pf-line" />Date</div>
          <div><span className="pf-line" />For Office Use / Authorised Signatory</div>
        </div>
      </div>

      <style jsx global>{`
        /* Hidden on screen; the print stylesheet below reveals it. */
        #${id} { display: none; }

        @media print {
          /* Hide the app, show only this sheet. visibility (not display) keeps
             the printout's own layout intact while blanking everything else. */
          body * { visibility: hidden !important; }
          #${id}, #${id} * { visibility: visible !important; }
          #${id} {
            display: block !important;
            position: absolute;
            inset: 0 auto auto 0;
            width: 100%;
            background: #fff;
          }
          @page { size: A4; margin: 12mm 14mm; }
        }

        #${id} .pf-page {
          font-family: "Times New Roman", Georgia, serif;
          color: #000;
          font-size: 11pt;
          line-height: 1.45;
        }
        #${id} .pf-head {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 16px; border-bottom: 2.5px solid #000; padding-bottom: 8px;
        }
        #${id} .pf-head h1 { margin: 0; font-size: 17pt; letter-spacing: .3px; }
        #${id} .pf-sub { margin: 1px 0 0; font-size: 10pt; }
        #${id} .pf-title {
          margin: 6px 0 0; font-size: 12.5pt; font-weight: bold;
          text-transform: uppercase; letter-spacing: 1.5px;
        }
        #${id} .pf-photo {
          width: 28mm; height: 35mm; object-fit: cover;
          border: 1px solid #000; flex: none;
        }
        #${id} .pf-meta {
          display: flex; gap: 22px; flex-wrap: wrap;
          font-size: 10pt; padding: 6px 0; border-bottom: 1px solid #999; margin-bottom: 10px;
        }
        #${id} .pf-section { margin-bottom: 12px; break-inside: avoid; }
        #${id} .pf-h2 {
          margin: 0 0 6px; font-size: 11pt; text-transform: uppercase;
          letter-spacing: 1px; border-bottom: 1px solid #000; padding-bottom: 2px;
        }
        #${id} .pf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 22px; }
        #${id} .pf-field { display: flex; gap: 6px; padding: 2px 0; border-bottom: 1px dotted #bbb; }
        #${id} .pf-field.pf-wide { grid-column: 1 / -1; }
        #${id} .pf-label { min-width: 46mm; font-size: 9.5pt; color: #333; }
        #${id} .pf-value { font-weight: bold; flex: 1; }
        #${id} .pf-table { width: 100%; border-collapse: collapse; font-size: 10pt; }
        #${id} .pf-table th, #${id} .pf-table td {
          border: 1px solid #000; padding: 4px 6px; text-align: left;
        }
        #${id} .pf-table th { background: #eee; font-size: 9.5pt; }
        #${id} .pf-declaration { margin: 14px 0 0; break-inside: avoid; }
        #${id} .pf-declaration p { margin: 0; font-size: 10pt; text-align: justify; }
        #${id} .pf-signs {
          display: flex; justify-content: space-between; gap: 18px; margin-top: 22mm;
          font-size: 9.5pt; break-inside: avoid;
        }
        #${id} .pf-signs > div { flex: 1; text-align: center; }
        #${id} .pf-line {
          display: block; border-top: 1px solid #000; margin-bottom: 4px;
        }
      `}</style>
    </div>
  );
}
