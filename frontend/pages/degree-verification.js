import React, { useState } from 'react';
import Head from 'next/head';
import Header from '../components/Header.js';
import Footer from '../components/Footer.js';
import HeroSection from '../components/HeroSection.js';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const STATUS_CONFIG = {
  completed:   { label: 'Degree Completed',  color: 'bg-green-50 border-green-400 text-green-700',  badge: 'bg-green-100 text-green-800',  icon: '✅' },
  'in-progress': { label: 'In Progress',     color: 'bg-blue-50 border-blue-400 text-blue-700',    badge: 'bg-blue-100 text-blue-800',    icon: '🔄' },
  withdrawn:   { label: 'Withdrawn',         color: 'bg-red-50 border-red-400 text-red-700',        badge: 'bg-red-100 text-red-800',      icon: '❌' },
};

export default function DegreeVerification() {
  const [regNo, setRegNo]     = useState('');
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!regNo.trim()) return;
    setLoading(true); setResult(null); setError('');
    try {
      const { data } = await axios.get(`${API}/portal/exam/degree-verify`, { params: { registrationNo: regNo.trim() } });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || 'No record found for this registration number.');
    }
    setLoading(false);
  };

  const cfg = result ? (STATUS_CONFIG[result.degreeStatus] || STATUS_CONFIG.completed) : null;

  return (
    <>
      <Head>
        <title>Degree Verification — University of Makran, Panjgur</title>
        <meta name="description" content="Verify the authenticity of a degree issued by University of Makran." />
      </Head>

      <Header />
      <HeroSection title="Degree Verification" subtitle="Verify Academic Credentials Issued by University of Makran" />

      <div className="bg-gray-50 py-20">
        <div className="container max-w-5xl mx-auto">

          <div className="grid grid-cols-1 md:grid-cols-5 gap-10">

            {/* ── Left info panel ── */}
            <div className="md:col-span-2 space-y-5">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">How It Works</h3>
                <ol className="space-y-4">
                  {[
                    ['Enter Registration No', 'Type the student\'s registration number exactly as printed on the degree.'],
                    ['Instant Lookup',         'Our system checks the Examination Branch records in real time.'],
                    ['View Credentials',       'Degree details, program, CGPA, and completion status are displayed.'],
                  ].map(([title, desc], i) => (
                    <li key={i} className="flex gap-3">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5" style={{ background: '#041476' }}>{i + 1}</span>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{title}</p>
                        <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-3">What We Verify</h3>
                <ul className="space-y-2">
                  {['Degree authenticity & status', 'Student name & department', 'Program & graduation year', 'CGPA (if available)', 'Issued by Examination Branch'].map(item => (
                    <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ color: '#041476' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ── Right search + result panel ── */}
            <div className="md:col-span-3 space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-xl font-bold text-gray-800 mb-1">Enter Registration Number</h2>
                <p className="text-gray-400 text-sm mb-6">As printed on the degree / marksheet issued by UoMP</p>

                <form onSubmit={handleVerify} className="flex gap-3">
                  <input
                    type="text"
                    value={regNo}
                    onChange={e => { setRegNo(e.target.value); setResult(null); setError(''); }}
                    placeholder="e.g. 2021-UoMP-CS-001"
                    required
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
                  />
                  <button type="submit" disabled={loading}
                    className="px-6 py-3 rounded-xl text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50 shrink-0"
                    style={{ background: '#041476' }}>
                    {loading ? 'Checking…' : 'Verify'}
                  </button>
                </form>
              </div>

              {/* Error state */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-4">
                  <span className="text-3xl">❌</span>
                  <div>
                    <p className="font-bold text-red-800 mb-1">Record Not Found</p>
                    <p className="text-red-700 text-sm">{error}</p>
                    <p className="text-red-500 text-xs mt-2">Please double-check the registration number. Contact the Examination Branch if you believe this is an error.</p>
                  </div>
                </div>
              )}

              {/* Success result */}
              {result && cfg && (
                <div className={`rounded-2xl border-2 p-6 ${cfg.color}`}>
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-3xl">{cfg.icon}</span>
                    <div>
                      <p className="font-bold text-lg">{cfg.label}</p>
                      <p className="text-sm opacity-80">Verified by Examination Branch, University of Makran</p>
                    </div>
                    <span className={`ml-auto text-xs font-bold px-3 py-1 rounded-full shrink-0 ${cfg.badge}`}>{result.degreeStatus}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      ['Registration No',  result.registrationNo],
                      ['Full Name',        result.fullName],
                      ["Father's Name",    result.fatherName],
                      ['Department',       result.department],
                      ['Program',          result.program],
                      ['Session / Batch',  result.session],
                      ['Graduation Year',  result.graduationYear],
                      ['CGPA',             result.cgpa],
                    ].filter(([, v]) => v).map(([label, value]) => (
                      <div key={label} className="bg-white/60 rounded-xl p-3">
                        <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-0.5">{label}</p>
                        <p className="font-semibold text-sm">{value}</p>
                      </div>
                    ))}
                  </div>

                  {result.remarks && (
                    <div className="mt-3 bg-white/60 rounded-xl p-3">
                      <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-0.5">Remarks</p>
                      <p className="text-sm italic">{result.remarks}</p>
                    </div>
                  )}

                  <p className="text-xs opacity-50 mt-4 text-right">
                    Record created {new Date(result.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-12 bg-blue-50 border border-blue-200 rounded-2xl p-5 text-center max-w-2xl mx-auto">
            <p className="text-blue-800 font-semibold text-sm mb-1">Need Help?</p>
            <p className="text-gray-600 text-sm">
              For verification issues or official confirmation letters, contact the Examination Branch at{' '}
              <a href="mailto:exam@uomp.edu.pk" className="underline text-blue-700">exam@uomp.edu.pk</a>
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
