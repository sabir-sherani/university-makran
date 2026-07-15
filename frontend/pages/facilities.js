import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Header from '../components/Header.js';
import Footer from '../components/Footer.js';
import HeroSection from '../components/HeroSection.js';
import axios from 'axios';

export default function Facilities() {
  const [facilities,   setFacilities]   = useState([]);
  const [scholarships, setScholarships] = useState([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${process.env.NEXT_PUBLIC_API_URL}/facilities`).then(r => r.data).catch(() => []),
      axios.get(`${process.env.NEXT_PUBLIC_API_URL}/scholarships`).then(r => r.data).catch(() => []),
    ]).then(([f, s]) => {
      setFacilities(f);
      setScholarships(s);
      setLoading(false);
    });
  }, []);

  return (
    <>
      <Head>
        <title>Facilities — University of Makran, Panjgur</title>
      </Head>

      <Header />
      <HeroSection title="Campus Facilities & Scholarships" subtitle="State-of-the-Art Infrastructure" />

      <div className="bg-gray-50 py-16">
        <div className="container mx-auto px-4 max-w-5xl">

          {loading ? (
            <div className="flex justify-center py-24">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* ── Facilities Table ── */}
              {facilities.length > 0 && (
                <>
                  <SectionTitle title="Our Facilities" />
                  <div className="overflow-x-auto rounded-lg shadow-md mb-16">
                    <table style={tableStyle}>
                      <thead>
                        <tr style={{ background: '#041476', color: '#fff' }}>
                          <th style={thStyle}>S No.</th>
                          <th style={thStyle}>Facility</th>
                          <th style={thStyle}>Description</th>
                          <th style={thStyle}>Purpose</th>
                        </tr>
                      </thead>
                      <tbody>
                        {facilities.map((row, i) => (
                          <tr key={row._id} style={{ background: i % 2 === 0 ? '#fff' : '#f8f9ff' }}>
                            <td style={tdCenter}>{row.serialNo ?? i + 1}</td>
                            <td style={{ ...tdStyle, fontWeight: 600, color: '#041476' }}>{row.facility}</td>
                            <td style={tdStyle}>{row.description || '—'}</td>
                            <td style={tdStyle}>{row.purpose || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* ── Scholarships Table ── */}
              {scholarships.length > 0 && (
                <>
                  <SectionTitle title="Scholarships" />
                  <div className="overflow-x-auto rounded-lg shadow-md">
                    <table style={tableStyle}>
                      <thead>
                        <tr style={{ background: '#041476', color: '#fff' }}>
                          <th style={thStyle}>S. No.</th>
                          <th style={thStyle}>Scholarship</th>
                          <th style={thStyle}>Eligibility Criteria</th>
                          <th style={thStyle}>Award</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scholarships.map((s, i) => (
                          <tr key={s._id} style={{ background: i % 2 === 0 ? '#fff' : '#f8f9ff' }}>
                            <td style={tdCenter}>{s.serialNo ?? String(i + 1).padStart(2, '0')}</td>
                            <td style={{ ...tdStyle, fontWeight: 700, color: '#041476' }}>{s.name}</td>
                            <td style={tdStyle}>{s.eligibility || '—'}</td>
                            <td style={tdStyle}>{s.award || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {facilities.length === 0 && scholarships.length === 0 && (
                <p className="text-center text-gray-400 py-12">No information available yet.</p>
              )}
            </>
          )}

        </div>
      </div>

      <Footer />
    </>
  );
}

function SectionTitle({ title }) {
  return (
    <div className="mb-8 text-center">
      <h2 className="text-3xl font-extrabold mb-2" style={{ color: '#041476' }}>{title}</h2>
      <div className="mx-auto h-1 w-16 rounded-full" style={{ background: '#FA7902' }} />
    </div>
  );
}

const border = '1px solid #d1d5db';

const tableStyle = { width: '100%', borderCollapse: 'collapse', background: '#fff', fontSize: '0.97rem' };

const thStyle = {
  padding: '13px 18px',
  textAlign: 'left',
  fontWeight: 700,
  fontSize: '0.85rem',
  letterSpacing: '0.04em',
  border,
};

const tdStyle = {
  padding: '11px 18px',
  border,
  color: '#374151',
  verticalAlign: 'top',
};

const tdCenter = {
  ...tdStyle,
  textAlign: 'center',
  color: '#6b7280',
  fontWeight: 500,
  width: '70px',
};
