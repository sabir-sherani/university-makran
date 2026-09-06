import { useState, useEffect } from 'react';
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import axios from 'axios';

const API_URL  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

const isPdf = (path) => !!path && path.toLowerCase().split('?')[0].endsWith('.pdf');
const fileHref = (path) => path?.startsWith('http') ? path : `${BASE_URL}${path}`;

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ── Loading skeleton ── */
function Skeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 22 }}>
      {[...Array(8)].map((_, i) => (
        <div key={i} className="animate-pulse" style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 16px rgba(4,20,118,0.07)' }}>
          <div style={{ height: 140, background: '#e8ecf8' }} />
          <div style={{ padding: '14px 16px' }}>
            <div style={{ height: 14, borderRadius: 6, background: '#e8ecf8', width: '75%', marginBottom: 8 }} />
            <div style={{ height: 10, borderRadius: 6, background: '#f1f3fa', width: '40%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main Page ── */
export default function DownloadsPage() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');

  useEffect(() => {
    axios.get(`${API_URL}/downloads`)
      .then(r => setItems(r.data || []))
      .catch(() => setError('Failed to load downloads. Please try again later.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter(i => !search || i.title?.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <Head>
        <title>Downloads — University of Makran, Panjgur</title>
        <meta name="description" content="Download prospectuses, forms, notices and other documents from University of Makran, Panjgur." />
      </Head>

      <Header />

      {/* ── Page Hero ── */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #041476 0%, #0a2299 60%, #1a3ab8 100%)', padding: '56px 16px 64px' }}>
        <div style={{ position: 'absolute', width: 360, height: 360, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', top: -80, right: -80 }} />
        <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'rgba(250,121,2,0.1)', bottom: -50, left: -50 }} />
        <div className="container relative z-10 text-center">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(250,121,2,0.18)', border: '1px solid rgba(250,121,2,0.4)', borderRadius: 999, padding: '5px 16px', marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: '#FA7902', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>University of Makran</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 800, color: '#fff', marginBottom: 12, lineHeight: 1.15 }}>Downloads</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, maxWidth: 500, margin: '0 auto 28px' }}>
            Prospectuses, forms, notices and other documents — available to view or download.
          </p>

          {/* Search bar */}
          <div style={{ maxWidth: 420, margin: '0 auto', position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search downloads..."
              style={{ width: '100%', padding: '12px 16px 12px 44px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 14, outline: 'none', backdropFilter: 'blur(8px)' }}
              onFocus={e => e.target.style.borderColor = 'rgba(250,121,2,0.6)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.2)'} />
          </div>
        </div>
      </div>

      {/* ── Downloads Grid ── */}
      <div style={{ background: '#f4f6fb', padding: '48px 16px 64px', minHeight: 400 }}>
        <div className="container">

          {!loading && !error && items.length > 0 && (
            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 28, fontWeight: 500 }}>
              Showing <span style={{ color: '#041476', fontWeight: 700 }}>{filtered.length}</span> of {items.length} file{items.length === 1 ? '' : 's'}
            </p>
          )}

          {loading ? <Skeleton /> : error ? (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 16, padding: '32px', textAlign: 'center', color: '#dc2626' }}>{error}</div>
          ) : filtered.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 20, padding: '64px 32px', textAlign: 'center', boxShadow: '0 2px 16px rgba(4,20,118,0.07)' }}>
              <p style={{ fontSize: 48, marginBottom: 16 }}>📁</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: '#041476', marginBottom: 8 }}>{search ? 'No results found' : 'No downloads yet'}</p>
              <p style={{ color: '#94a3b8', fontSize: 14 }}>{search ? `No files matching "${search}"` : 'Check back soon — documents will appear here once published.'}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 22 }}>
              {filtered.map((item) => {
                const href = fileHref(item.file);
                const pdf = isPdf(item.file);
                return (
                  <article key={item._id}
                    style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 16px rgba(4,20,118,0.08)', border: '1px solid rgba(4,20,118,0.07)', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, box-shadow 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 32px rgba(4,20,118,0.15)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 16px rgba(4,20,118,0.08)'; }}>

                    {/* Preview */}
                    {pdf ? (
                      <div style={{ height: 140, background: 'linear-gradient(135deg, #fef2f2, #fee2e2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      </div>
                    ) : (
                      <div style={{ height: 140, overflow: 'hidden' }}>
                        <img src={href} alt={item.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s' }}
                          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
                          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />
                      </div>
                    )}

                    {/* Body */}
                    <div style={{ flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column' }}>
                      <span style={{ alignSelf: 'flex-start', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999, marginBottom: 8, background: pdf ? '#fef2f2' : '#f0f9ff', color: pdf ? '#dc2626' : '#0369a1' }}>
                        {pdf ? 'PDF' : 'Image'}
                      </span>

                      <p style={{ fontSize: 14.5, fontWeight: 700, color: '#1e293b', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 4, flex: 1 }}>
                        {item.title}
                      </p>

                      {/* Small, unobtrusive date — deliberately not a badge */}
                      <span style={{ fontSize: 11, color: '#b8c0d4', marginBottom: 12 }}>{formatDate(item.date)}</span>

                      <a href={href} download target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', background: '#041476', padding: '8px 0', borderRadius: 9, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#FA7902'}
                        onMouseLeave={e => e.currentTarget.style.background = '#041476'}>
                        Download
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
                        </svg>
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}
