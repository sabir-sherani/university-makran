import Head from 'next/head';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import axios from 'axios';
import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

function imgUrl(p) {
  if (!p) return null;
  if (p.startsWith('http')) return p;
  return `${BASE_URL}${p}`;
}

export async function getServerSideProps({ params }) {
  try {
    const { data } = await axios.get(`${API_URL}/admin-depts/slug/${params.slug}`);
    return { props: { dept: data } };
  } catch {
    return { notFound: true };
  }
}

// ── Staff bio modal ────────────────────────────────────────────────────────────

function BioModal({ member, onClose }) {
  const photo = imgUrl(member.image);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-5 p-6 border-b border-gray-100">
          {photo ? (
            <img src={photo} alt={member.name} className="w-20 h-24 rounded-xl object-cover object-top shrink-0 shadow" />
          ) : (
            <div className="w-20 h-24 rounded-xl flex items-center justify-center text-3xl font-bold shrink-0"
              style={{ background: 'rgba(4,20,118,0.08)', color: '#041476' }}>
              {member.name?.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900">{member.name}</h3>
            {member.jobTitle && <p className="text-sm font-semibold mt-0.5" style={{ color: '#041476' }}>{member.jobTitle}</p>}
            {member.education && <p className="text-xs text-gray-500 mt-1">🎓 {member.education}</p>}
            {member.email && <a href={`mailto:${member.email}`} className="text-xs text-blue-600 hover:underline mt-0.5 block">✉ {member.email}</a>}
            {member.phone && <p className="text-xs text-gray-500 mt-0.5">📞 {member.phone}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors text-xl leading-none shrink-0 mt-0.5">✕</button>
        </div>
        <div className="p-6">
          <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Publications &amp; Bio</h4>
          <div
            className="staff-bio-content text-gray-700 leading-relaxed text-sm"
            dangerouslySetInnerHTML={{ __html: member.bio }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Staff card ─────────────────────────────────────────────────────────────────

function StaffCard({ member, onReadMore }) {
  const photo = imgUrl(member.image);

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col">
      {/* Photo */}
      <div className="relative w-full" style={{ paddingBottom: '100%' }}>
        {photo ? (
          <img
            src={photo}
            alt={member.name}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: 'top center' }}
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center text-3xl font-bold"
            style={{ background: 'rgba(4,20,118,0.08)', color: '#041476' }}
          >
            {member.name.charAt(0)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-1 flex-1">
        <h4 className="font-bold text-gray-900 text-sm leading-snug">{member.name}</h4>

        {member.jobTitle && (
          <p className="text-xs font-semibold" style={{ color: '#041476' }}>{member.jobTitle}</p>
        )}

        {member.education && (
          <p className="text-xs text-gray-500 flex items-start gap-1 mt-0.5">
            <span className="mt-0.5 shrink-0">🎓</span>
            <span>{member.education}</span>
          </p>
        )}

        {member.email && (
          <a
            href={`mailto:${member.email}`}
            className="text-xs text-blue-600 hover:underline flex items-start gap-1 mt-0.5 break-all"
          >
            <span className="mt-0.5 shrink-0">✉</span>
            <span>{member.email}</span>
          </a>
        )}

        {member.phone && (
          <a
            href={`tel:${member.phone}`}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 mt-0.5"
          >
            <span className="shrink-0">📞</span>
            <span>{member.phone}</span>
          </a>
        )}

        {member.bio && (
          <button
            onClick={() => onReadMore(member)}
            className="mt-2 self-start text-xs font-semibold px-3 py-1 rounded-full transition-colors"
            style={{ background: 'rgba(4,20,118,0.08)', color: '#041476' }}
          >
            Read More
          </button>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdministrationDeptPage({ dept }) {
  const hodPhoto = imgUrl(dept.hod?.image);
  const [bioModal, setBioModal] = useState(null);

  return (
    <>
      <Head>
        <title>{dept.name} - University of Makran</title>
        <meta name="description" content={dept.about || `${dept.name} — University of Makran Administration`} />
      </Head>

      <Header />

      {/* ── BANNER ── */}
      <section
        className="relative h-52 md:h-64 flex items-end overflow-hidden"
        style={{ background: '#041476' }}
      >
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(4,20,118,0.9) 0%, rgba(4,20,118,0.4) 100%)' }} />
        <div className="relative container pb-8">
          <p className="text-white/60 text-xs uppercase tracking-widest mb-1">Administration</p>
          <h1 className="text-3xl md:text-4xl font-bold text-white">{dept.name}</h1>
        </div>
      </section>

      <div className="bg-gray-50">
        <div className="container py-14 space-y-14">

          {/* ── HOD ── */}
          {(dept.hod?.name || dept.hod?.image) && (
            <section>
              <h2 className="text-xl font-bold mb-6 pb-2 border-b-2" style={{ color: '#041476', borderColor: 'rgba(4,20,118,0.2)' }}>
                Head of {dept.name}
              </h2>
              <div className="bg-white rounded-2xl shadow-sm p-8 flex flex-col md:flex-row gap-8">

                {/* HOD photo — fixed-size container, face-top aligned */}
                <div className="shrink-0 self-start">
                  {hodPhoto ? (
                    <div className="w-36 h-44 rounded-xl overflow-hidden shadow-md">
                      <img
                        src={hodPhoto}
                        alt={dept.hod?.name || 'HOD'}
                        className="w-full h-full object-cover"
                        style={{ objectPosition: 'top center' }}
                      />
                    </div>
                  ) : (
                    <div
                      className="w-36 h-44 rounded-xl flex items-center justify-center text-5xl font-bold text-white shadow-md"
                      style={{ background: '#041476' }}
                    >
                      {dept.hod?.name?.charAt(0) || '?'}
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  {dept.hod?.name && (
                    <h3 className="text-xl font-bold text-gray-900">{dept.hod.name}</h3>
                  )}
                  <p className="text-sm font-semibold mt-0.5" style={{ color: '#041476' }}>
                    Head of {dept.name}
                  </p>
                  {dept.hod?.specialization && (
                    <p className="text-sm text-gray-500 mt-1">{dept.hod.specialization}</p>
                  )}

                  {/* Message from the Head */}
                  {dept.hod?.message && (
                    <div className="mt-5 relative">
                      <span
                        className="absolute -top-2 -left-1 text-6xl font-serif leading-none select-none pointer-events-none"
                        style={{ color: 'rgba(4,20,118,0.08)' }}
                      >&ldquo;</span>
                      <div
                        className="hod-message border-l-4 pl-5 text-gray-700 leading-relaxed relative z-10"
                        style={{ borderColor: '#041476' }}
                        dangerouslySetInnerHTML={{ __html: dept.hod.message }}
                      />
                      <span
                        className="block text-right text-6xl font-serif leading-none select-none pointer-events-none -mt-3"
                        style={{ color: 'rgba(4,20,118,0.08)' }}
                      >&rdquo;</span>
                    </div>
                  )}

                  {/* Rich-text HOD about — rendered as HTML */}
                  {dept.hod?.about && (
                    <div
                      className="hod-about mt-4 text-sm text-gray-600 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: dept.hod.about }}
                    />
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ── ABOUT ── */}
          {dept.about && (
            <section>
              <h2 className="text-xl font-bold mb-6 pb-2 border-b-2" style={{ color: '#041476', borderColor: 'rgba(4,20,118,0.2)' }}>
                About the {dept.name}
              </h2>
              <div className="bg-white rounded-2xl shadow-sm p-8">
                <div
                  className="dept-about text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: dept.about }}
                />
              </div>
            </section>
          )}

          {/* ── STAFF ── */}
          {dept.staff && dept.staff.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-8 pb-2 border-b-2" style={{ color: '#041476', borderColor: 'rgba(4,20,118,0.2)' }}>
                Staff Members
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-5">
                {dept.staff.map((member) => (
                  <StaffCard key={member._id} member={member} onReadMore={setBioModal} />
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {!dept.hod?.name && !dept.about && (!dept.staff || dept.staff.length === 0) && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-5xl mb-4">🏛️</p>
              <p className="text-lg font-medium">Department content coming soon.</p>
            </div>
          )}

        </div>
      </div>

      {bioModal && <BioModal member={bioModal} onClose={() => setBioModal(null)} />}

      {/* Prose styles for rich-text content */}
      <style jsx global>{`
        .hod-about p, .dept-about p, .hod-message p   { margin-bottom: 0.75rem; }
        .hod-about p:last-child, .dept-about p:last-child, .hod-message p:last-child { margin-bottom: 0; }
        .hod-about strong, .dept-about strong, .hod-message strong { font-weight: 700; color: #374151; }
        .hod-about em,     .dept-about em,     .hod-message em     { font-style: italic; }
        .hod-about u,      .dept-about u,      .hod-message u      { text-decoration: underline; }
        .hod-message { font-size: 0.95rem; }
        .staff-bio-content p { margin-bottom: 0.6rem; }
        .staff-bio-content p:last-child { margin-bottom: 0; }
        .staff-bio-content strong { font-weight: 700; }
        .staff-bio-content em { font-style: italic; }
        .staff-bio-content u { text-decoration: underline; }
        .staff-bio-content ul { list-style: disc; padding-left: 1.4rem; margin: 0.4rem 0; }
        .staff-bio-content ol { list-style: decimal; padding-left: 1.4rem; margin: 0.4rem 0; }
        .staff-bio-content p[style*="text-align: center"] { text-align: center; }
        .staff-bio-content p[style*="text-align: right"]  { text-align: right; }
        .staff-bio-content p[style*="text-align: justify"] { text-align: justify; }
        .hod-about p, .dept-about p, .hod-message p[style*="text-align: center"] { text-align: center; }
        .hod-about p[style*="text-align: right"], .dept-about p[style*="text-align: right"] { text-align: right; }
        .hod-about p[style*="text-align: justify"], .dept-about p[style*="text-align: justify"] { text-align: justify; }
      `}</style>

      <Footer />
    </>
  );
}
