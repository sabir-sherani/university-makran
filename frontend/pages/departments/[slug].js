import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import axios from 'axios';

const API_URL  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

function img(p) {
  if (!p) return null;
  return p.startsWith('http') ? p : `${BASE_URL}${p}`;
}

function stripHtml(html) {
  return html?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || '';
}

export async function getServerSideProps({ params }) {
  try {
    const { data } = await axios.get(`${API_URL}/departments/slug/${params.slug}`);
    return { props: { dept: data } };
  } catch (err) {
    if (err.response?.data?.suspended) {
      return { props: { dept: null, suspended: true } };
    }
    return { notFound: true };
  }
}

// ── Tab config (filtered by content) ─────────────────────────────────────────

function buildTabs() {
  return [
    { key: 'about',      label: 'About',                  icon: '📋' },
    { key: 'hod',        label: 'HOD & Staff',            icon: '👤' },
    { key: 'mission',    label: 'Mission & Vision',       icon: '🎯' },
    { key: 'facilities', label: 'Facilities & Resources', icon: '🏫' },
    { key: 'engagement', label: 'Student Engagement',     icon: '🤝' },
    { key: 'courses',    label: 'Course Content',         icon: '📚' },
    { key: 'fee',        label: 'Fee Structure',          icon: '💰' },
    { key: 'programs',   label: 'Degree Programs',        icon: '🎓' },
  ];
}

// ── Rich text renderer ────────────────────────────────────────────────────────

function RichContent({ html, className = '' }) {
  if (!html) return null;
  return (
    <div
      className={`prose-dept ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ── Fee table ─────────────────────────────────────────────────────────────────

function FeeTable({ title, rows }) {
  if (!rows?.length) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
      <div className="px-5 py-3 font-bold text-sm" style={{ background: '#041476', color: '#fff' }}>
        {title}
      </div>
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
  );
}

// ── Semester table ────────────────────────────────────────────────────────────

function SemesterTable({ sem, index }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left font-bold text-sm text-white transition-colors"
        style={{ background: open ? '#041476' : '#041476' }}
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

// ── Staff bio modal ───────────────────────────────────────────────────────────

function StaffBioModal({ m, onClose }) {
  const photo = img(m.photo);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-5 p-6 border-b border-gray-100">
          {photo ? (
            <img src={photo} alt={m.name} className="w-20 h-24 rounded-xl object-cover object-top shrink-0 shadow" />
          ) : (
            <div className="w-20 h-24 rounded-xl flex items-center justify-center text-3xl font-bold shrink-0"
              style={{ background: '#f0f3ff', color: '#041476' }}>
              {m.name?.charAt(0) || '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900">{m.name}</h3>
            {m.jobTitle   && <p className="text-sm font-semibold mt-0.5" style={{ color: '#041476' }}>{m.jobTitle}</p>}
            {m.education  && <p className="text-xs text-gray-500 mt-1">🎓 {m.education}</p>}
            {m.email      && <a href={`mailto:${m.email}`} className="text-xs text-blue-600 hover:underline mt-0.5 block">✉ {m.email}</a>}
            {m.phone      && <p className="text-xs text-gray-500 mt-0.5">📞 {m.phone}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors text-xl leading-none shrink-0 mt-0.5">✕</button>
        </div>
        <div className="p-6">
          <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Publications &amp; Bio</h4>
          <div
            className="prose-dept"
            dangerouslySetInnerHTML={{ __html: m.bio }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Staff card ────────────────────────────────────────────────────────────────

function StaffCard({ m, onReadMore }) {
  const photo = img(m.photo);
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="aspect-square relative bg-gray-100 overflow-hidden">
        {photo ? (
          <img src={photo} alt={m.name} className="absolute inset-0 w-full h-full object-cover object-top" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl font-bold" style={{ color: '#041476', background: '#f0f3ff' }}>
            {m.name?.charAt(0) || '?'}
          </div>
        )}
      </div>
      <div className="p-4">
        <h4 className="font-bold text-gray-900 text-sm leading-snug">{m.name}</h4>
        {m.jobTitle   && <p className="text-xs font-semibold mt-0.5" style={{ color: '#041476' }}>{m.jobTitle}</p>}
        {m.education  && <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><span>🎓</span>{m.education}</p>}
        {m.email      && <a href={`mailto:${m.email}`} className="text-xs text-blue-600 hover:underline mt-0.5 flex items-center gap-1 truncate"><span>✉</span>{m.email}</a>}
        {m.phone      && <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><span>📞</span>{m.phone}</p>}
        {m.bio && (
          <button
            onClick={() => onReadMore(m)}
            className="mt-2 self-start text-xs font-semibold px-3 py-1 rounded-full transition-colors"
            style={{ background: '#f0f3ff', color: '#041476' }}
          >
            Read More
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DepartmentPage({ dept, suspended }) {
  if (suspended) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 text-4xl"
            style={{ background: '#fef9c3' }}>⏸</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Department Suspended</h1>
          <p className="text-gray-500 max-w-md mb-8">
            This department is temporarily suspended and not available for viewing. Please check back later or contact the university for more information.
          </p>
          <a href="/departments"
            className="px-6 py-2.5 rounded-xl font-semibold text-white text-sm"
            style={{ background: '#041476' }}>
            View All Departments
          </a>
        </div>
        <Footer />
      </>
    );
  }

  const tabs = buildTabs();
  const [activeTab, setActiveTab] = useState(tabs[0]?.key || 'about');
  const [bioModal, setBioModal] = useState(null);
  const tabBarRef = useRef(null);
  const banner = img(dept.bannerImage);
  const hodPhoto = img(dept.hod?.photo);

  return (
    <>
      <Head>
        <title>{dept.name} — University of Makran</title>
        <meta name="description"
          content={stripHtml(dept.aboutDescription) || `${dept.name} department at University of Makran`} />
      </Head>

      <Header />

      {/* ── Banner ── */}
      <section className="relative h-56 md:h-72 flex items-end overflow-hidden">
        {banner
          ? <img src={banner} alt={dept.name} className="absolute inset-0 w-full h-full object-cover" />
          : <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #041476 0%, #041476 100%)' }} />
        }
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(4,20,118,0.9) 0%, rgba(4,20,118,0.2) 100%)' }} />
        <div className="relative container pb-8">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-1">Department</p>
          <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight">{dept.name}</h1>
          <p className="text-white/60 text-sm mt-1">University of Makran, Panjgur</p>
        </div>
      </section>

      {/* ── Tab bar ── */}
      <div ref={tabBarRef} className="sticky top-0 z-20 bg-white shadow-md" style={{ borderBottom: '1px solid #e8ecf8' }}>
        <div className="container">
          <div className="flex flex-wrap justify-center gap-1 py-2">
            {tabs.map(t => {
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150"
                  style={{
                    background:  active ? '#041476' : 'transparent',
                    color:       active ? '#fff'    : '#64748b',
                    boxShadow:   active ? '0 2px 8px rgba(4,20,118,0.25)' : 'none',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f1f5f9'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ fontSize: 14 }}>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="bg-gray-50 min-h-screen py-10">
        <div className="container max-w-5xl">

          {/* ── TAB: About ── */}
          {activeTab === 'about' && (
            <div className="space-y-8">
              {dept.aboutHeading && (
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{dept.aboutHeading}</h2>
                  <div className="flex gap-1.5 mb-6">
                    <span className="h-1 w-10 rounded-full" style={{ background: '#041476' }} />
                    <span className="h-1 w-4 rounded-full" style={{ background: '#041476' }} />
                    <span className="h-1 w-2 rounded-full bg-gray-300" />
                  </div>
                </div>
              )}
              {dept.aboutDescription && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                  <RichContent html={dept.aboutDescription} />
                </div>
              )}
            </div>
          )}

          {/* ── TAB: HOD & Staff ── */}
          {activeTab === 'hod' && (
            <div className="space-y-10">

              {/* HOD card */}
              {dept.hod?.name && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-5">Head of Department</h2>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                    <div className="flex flex-col md:flex-row gap-8">
                      {/* Left: photo + info */}
                      <div className="md:w-56 shrink-0 flex flex-col items-center md:items-start">
                        {hodPhoto ? (
                          <div className="w-36 h-44 rounded-xl overflow-hidden shadow-md border-4 border-white ring-2 ring-gray-100">
                            <img src={hodPhoto} alt={dept.hod.name}
                              className="w-full h-full object-cover object-top" />
                          </div>
                        ) : (
                          <div className="w-36 h-44 rounded-xl flex items-center justify-center text-5xl font-bold shrink-0"
                            style={{ background: '#f0f3ff', color: '#041476' }}>
                            {dept.hod.name.charAt(0)}
                          </div>
                        )}
                        <div className="mt-4 text-center md:text-left">
                          <h3 className="font-bold text-gray-900 text-base">{dept.hod.name}</h3>
                          <p className="text-xs font-semibold mt-0.5" style={{ color: '#041476' }}>
                            Head of Department
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{dept.name}</p>
                          {dept.hod.qualification && (
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 justify-center md:justify-start">
                              <span>🎓</span>{dept.hod.qualification}
                            </p>
                          )}
                          {dept.hod.email && (
                            <a href={`mailto:${dept.hod.email}`}
                              className="text-xs text-blue-600 hover:underline mt-1 flex items-center gap-1 justify-center md:justify-start">
                              <span>✉</span>{dept.hod.email}
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Right: heading + description */}
                      <div className="flex-1 min-w-0">
                        {dept.hod.descriptionHeading && (
                          <h4 className="text-lg font-bold text-gray-800 mb-3">{dept.hod.descriptionHeading}</h4>
                        )}
                        {dept.hod.description ? (
                          <div className="text-gray-600 border-l-4 pl-5" style={{ borderColor: '#041476' }}>
                            <RichContent html={dept.hod.description} />
                          </div>
                        ) : (
                          <p className="text-gray-400 text-sm italic">No message added yet.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Staff grid */}
              {dept.staff?.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-5">Department Staff</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {dept.staff.map((m, i) => <StaffCard key={m._id || i} m={m} onReadMore={setBioModal} />)}
                  </div>
                </div>
              )}

              {!dept.hod?.name && !dept.staff?.length && (
                <div className="bg-white rounded-2xl p-16 text-center text-gray-400 border border-gray-100">
                  <p className="text-4xl mb-3">👤</p>
                  <p className="font-medium">HOD & Staff information coming soon.</p>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Fee Structure ── */}
          {activeTab === 'fee' && (
            <div className="space-y-6">
              {dept.feeHeading ? (
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{dept.feeHeading}</h2>
                  <div className="flex gap-1.5 mb-6">
                    <span className="h-1 w-10 rounded-full" style={{ background: '#041476' }} />
                    <span className="h-1 w-4 rounded-full" style={{ background: '#041476' }} />
                    <span className="h-1 w-2 rounded-full bg-gray-300" />
                  </div>
                </div>
              ) : (
                <h2 className="text-xl font-bold text-gray-900">Fee Structure</h2>
              )}
              {dept.feeDescription && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                  <RichContent html={dept.feeDescription} />
                </div>
              )}
              <FeeTable title={dept.feeAdmissionTitle || 'Admission Time Fee Structure'} rows={dept.feeAdmissionRows} />
              <FeeTable title={dept.feeSemesterTitle  || 'Per Semester Fee Structure'}   rows={dept.feeSemesterRows} />
              {!dept.feeDescription && !dept.feeAdmissionRows?.length && !dept.feeSemesterRows?.length && (
                <div className="bg-white rounded-2xl p-16 text-center text-gray-400 border border-gray-100">
                  <p className="text-4xl mb-3">💰</p>
                  <p className="font-medium">Fee structure information coming soon.</p>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Mission & Vision ── */}
          {activeTab === 'mission' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Mission &amp; Vision</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Mission */}
                {(dept.missionHeading || dept.missionDescription) && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #041476, #3a4fb5)' }}>
                      <span className="text-2xl">🎯</span>
                      <h3 className="font-bold text-white text-base">{dept.missionHeading || 'Our Mission'}</h3>
                    </div>
                    <div className="p-6">
                      <RichContent html={dept.missionDescription} className="text-gray-600 text-sm leading-relaxed" />
                    </div>
                  </div>
                )}

                {/* Vision */}
                {(dept.visionHeading || dept.visionDescription) && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #041476, #0a1fa8)' }}>
                      <span className="text-2xl">👁</span>
                      <h3 className="font-bold text-white text-base">{dept.visionHeading || 'Our Vision'}</h3>
                    </div>
                    <div className="p-6">
                      <RichContent html={dept.visionDescription} className="text-gray-600 text-sm leading-relaxed" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB: Facilities & Resources ── */}
          {activeTab === 'facilities' && (
            <div className="space-y-8">
              {dept.facilitiesResources?.heading && (
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{dept.facilitiesResources.heading}</h2>
                  <div className="flex gap-1.5 mb-6">
                    <span className="h-1 w-10 rounded-full" style={{ background: '#041476' }} />
                    <span className="h-1 w-4 rounded-full" style={{ background: '#041476' }} />
                    <span className="h-1 w-2 rounded-full bg-gray-300" />
                  </div>
                </div>
              )}
              {dept.facilitiesResources?.description && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                  <RichContent html={dept.facilitiesResources.description} />
                </div>
              )}
              {dept.facilitiesResources?.images?.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {dept.facilitiesResources.images.map((item, i) => (
                    item.image && (
                      <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="aspect-video overflow-hidden">
                          <img
                            src={img(item.image)}
                            alt={item.subtitle || `Facility ${i + 1}`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        {item.subtitle && (
                          <div className="px-4 py-3">
                            <p className="text-sm font-medium text-gray-700 text-center">{item.subtitle}</p>
                          </div>
                        )}
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Student Engagement ── */}
          {activeTab === 'engagement' && (
            <div className="space-y-8">
              {dept.studentEngagement?.heading && (
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{dept.studentEngagement.heading}</h2>
                  <div className="flex gap-1.5 mb-6">
                    <span className="h-1 w-10 rounded-full" style={{ background: '#041476' }} />
                    <span className="h-1 w-4 rounded-full" style={{ background: '#041476' }} />
                    <span className="h-1 w-2 rounded-full bg-gray-300" />
                  </div>
                </div>
              )}
              {dept.studentEngagement?.description && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                  <RichContent html={dept.studentEngagement.description} />
                </div>
              )}
              {dept.studentEngagement?.images?.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {dept.studentEngagement.images.map((item, i) => (
                    item.image && (
                      <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="aspect-video overflow-hidden">
                          <img
                            src={img(item.image)}
                            alt={item.subtitle || `Activity ${i + 1}`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        {item.subtitle && (
                          <div className="px-4 py-3">
                            <p className="text-sm font-medium text-gray-700 text-center">{item.subtitle}</p>
                          </div>
                        )}
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Course Content ── */}
          {activeTab === 'courses' && (
            <div className="space-y-4">
              {dept.courseHeading ? (
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{dept.courseHeading}</h2>
                  <div className="flex gap-1.5 mb-6">
                    <span className="h-1 w-10 rounded-full" style={{ background: '#041476' }} />
                    <span className="h-1 w-4 rounded-full" style={{ background: '#041476' }} />
                    <span className="h-1 w-2 rounded-full bg-gray-300" />
                  </div>
                </div>
              ) : (
                <h2 className="text-xl font-bold text-gray-900">Course Structure</h2>
              )}
              {dept.courseDescription && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-2">
                  <RichContent html={dept.courseDescription} />
                </div>
              )}
              {dept.semesters?.map((sem, i) => (
                <SemesterTable key={sem._id || i} sem={sem} index={i} />
              ))}
              {!dept.courseDescription && !dept.semesters?.length && (
                <div className="bg-white rounded-2xl p-16 text-center text-gray-400 border border-gray-100">
                  <p className="text-4xl mb-3">📚</p>
                  <p className="font-medium">Course content coming soon.</p>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Degree Programs ── */}
          {activeTab === 'programs' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Degree Programs</h2>
              {dept.degreePrograms?.map((p, i) => (
                <div key={p._id || i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
                  <div className="flex items-start gap-4">
                    <span className="text-2xl mt-0.5 shrink-0">🎓</span>
                    <div className="flex-1">
                      {p.heading && (
                        <h3 className="text-lg font-bold text-gray-900 mb-3">{p.heading}</h3>
                      )}
                      <RichContent html={p.description} className="text-gray-600 text-sm" />
                    </div>
                  </div>
                </div>
              ))}
              {!dept.degreePrograms?.length && (
                <div className="bg-white rounded-2xl p-16 text-center text-gray-400 border border-gray-100">
                  <p className="text-4xl mb-3">🎓</p>
                  <p className="font-medium">Degree programs information coming soon.</p>
                </div>
              )}
            </div>
          )}


        </div>
      </div>

      {bioModal && <StaffBioModal m={bioModal} onClose={() => setBioModal(null)} />}

      {/* Rich text styles */}
      <style jsx global>{`
        .prose-dept p   { margin-bottom: 0.6rem; line-height: 1.7; color: #374151; }
        .prose-dept ul  { list-style: disc; padding-left: 1.4rem; margin: 0.5rem 0; }
        .prose-dept ol  { list-style: decimal; padding-left: 1.4rem; margin: 0.5rem 0; }
        .prose-dept li  { margin-bottom: 0.25rem; }
        .prose-dept strong { font-weight: 700; }
        .prose-dept em     { font-style: italic; }
        .prose-dept u      { text-decoration: underline; }
        .prose-dept p[style*="text-align: center"] { text-align: center; }
        .prose-dept p[style*="text-align: right"]  { text-align: right; }
        .prose-dept p[style*="text-align: justify"] { text-align: justify; }
      `}</style>

      <Footer />
    </>
  );
}
