import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import axios from 'axios';

const API_URL  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

function getAction(item) {
  if (item.linkType === 'document' && item.document)
    return { href: item.document?.startsWith('http') ? item.document : `${BASE_URL}${item.document}`, label: 'Download PDF', icon: '⬇', external: true };
  if (item.linkType === 'external' && item.linkUrl)
    return { href: item.linkUrl, label: 'Visit Link', icon: '↗', external: true };
  if (item.linkType === 'internal' && item.linkUrl)
    return { href: item.linkUrl, label: 'Go to Page', icon: '→', external: false };
  return null;
}

function resolveLink(item) {
  if (item.linkType === 'document' && item.document) return { href: item.document?.startsWith('http') ? item.document : `${BASE_URL}${item.document}`, external: true };
  if (item.linkType === 'internal' && item.linkUrl)  return { href: item.linkUrl, external: false };
  return { href: item.linkUrl || '#', external: true };
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return {
    day:   d.toLocaleDateString('en-GB', { day: '2-digit' }),
    month: d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
    year:  d.getFullYear(),
    full:  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
  };
}

/* ── Lightbox ── */
function ZoomableLightbox({ src, alt, onClose }) {
  const [scale, setScale]       = useState(1);
  const [pos, setPos]           = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef  = useRef(null);
  const pinchRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const clampScale = (s) => Math.min(Math.max(s, 0.5), 6);
  const handleWheel = (e) => { e.preventDefault(); const delta = e.deltaY < 0 ? 0.2 : -0.2; setScale(prev => { const next = clampScale(prev + delta); if (next <= 1) setPos({ x: 0, y: 0 }); return next; }); };
  const handleMouseDown = (e) => { e.preventDefault(); dragRef.current = { sx: e.clientX, sy: e.clientY, px: pos.x, py: pos.y }; setDragging(true); };
  const handleMouseMove = (e) => { if (!dragRef.current) return; setPos({ x: dragRef.current.px + (e.clientX - dragRef.current.sx) / scale, y: dragRef.current.py + (e.clientY - dragRef.current.sy) / scale }); };
  const handleMouseUp  = () => { dragRef.current = null; setDragging(false); };
  const zoomIn  = () => setScale(s => clampScale(s + 0.5));
  const zoomOut = () => setScale(s => { const n = clampScale(s - 0.5); if (n <= 1) setPos({ x: 0, y: 0 }); return n; });
  const reset   = () => { setScale(1); setPos({ x: 0, y: 0 }); };
  const cursor  = scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'zoom-in';

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.94)', touchAction: 'none' }}>
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ background: 'rgba(0,0,0,0.5)' }}>
        <div className="flex items-center gap-2">
          <button onClick={zoomOut} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xl transition-colors">−</button>
          <span className="text-white text-sm font-mono w-14 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn}  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xl transition-colors">+</button>
          <button onClick={reset}   className="ml-1 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs transition-colors">Reset</button>
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center overflow-hidden select-none"
        onWheel={handleWheel} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} style={{ cursor }}>
        <img src={src} alt={alt} draggable={false} onMouseDown={handleMouseDown}
          onClick={(e) => { e.stopPropagation(); if (!dragRef.current && scale === 1) zoomIn(); }}
          style={{ transform: `scale(${scale}) translate(${pos.x}px, ${pos.y}px)`, transformOrigin: 'center', maxWidth: '95vw', maxHeight: 'calc(100vh - 96px)', objectFit: 'contain', transition: dragging ? 'none' : 'transform 0.12s ease', cursor }} />
      </div>
      <p className="text-center text-white/30 text-xs py-2 shrink-0">Scroll / pinch to zoom · Drag to pan · Esc to close</p>
    </div>
  );
}

/* ── Description Modal ── */
function DescriptionModal({ item, onClose }) {
  const { full } = formatDate(item.date);
  const { href, external } = resolveLink(item);
  const lp = external ? { target: '_blank', rel: 'noopener noreferrer' } : {};

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(4,20,118,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 640, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(4,20,118,0.25)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #041476, #0a2299)', padding: '20px 24px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              {item.featuredInHero && <span style={{ background: 'rgba(250,121,2,0.25)', color: '#FA7902', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999 }}>⭐ Featured</span>}
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                {full}
              </span>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', lineHeight: 1.4, margin: 0 }}>{item.title}</h2>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Cover image */}
        {item.image && (
          <div style={{ height: 200, overflow: 'hidden', flexShrink: 0 }}>
            <img src={item.image?.startsWith('http') ? item.image : `${BASE_URL}${item.image}`} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          <p style={{ fontSize: 15, color: '#374151', lineHeight: 1.85, margin: 0, whiteSpace: 'pre-wrap' }}>{item.description}</p>
        </div>

        {/* Footer */}
        {href && href !== '#' && (
          <div style={{ padding: '16px 28px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
            <a href={href} {...lp}
              style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: '#041476', padding: '10px 24px', borderRadius: 10, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#FA7902'}
              onMouseLeave={e => e.currentTarget.style.background = '#041476'}>
              {item.linkType === 'document' ? 'Download Document' : 'Visit Link'}
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Skeleton ── */
function Skeleton() {
  return (
    <div className="space-y-5">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={{ background: '#fff', boxShadow: '0 2px 16px rgba(4,20,118,0.07)' }}>
          <div className="flex gap-0">
            <div className="w-20 shrink-0" style={{ background: '#e8ecf8', minHeight: 120 }} />
            <div className="flex-1 p-6 space-y-3">
              <div className="h-5 rounded-lg w-2/3" style={{ background: '#e8ecf8' }} />
              <div className="h-4 rounded-lg w-full" style={{ background: '#f1f3fa' }} />
              <div className="h-4 rounded-lg w-4/5" style={{ background: '#f1f3fa' }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main Page ── */
export default function NewsPage() {
  const [news, setNews]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [lightbox, setLightbox]       = useState(null);
  const [search, setSearch]           = useState('');
  const [readMoreItem, setReadMoreItem] = useState(null);

  useEffect(() => {
    axios.get(`${API_URL}/news`)
      .then(r => setNews(r.data || []))
      .catch(() => setError('Failed to load news. Please try again later.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = news.filter(n =>
    !search || n.title?.toLowerCase().includes(search.toLowerCase()) || n.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Head>
        <title>News &amp; Events — University of Makran, Panjgur</title>
        <meta name="description" content="Latest news, announcements and events from University of Makran, Panjgur." />
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
          <h1 style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 800, color: '#fff', marginBottom: 12, lineHeight: 1.15 }}>News &amp; Events</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, maxWidth: 500, margin: '0 auto 28px' }}>Latest announcements, updates and events from our campus community.</p>

          {/* Search bar */}
          <div style={{ maxWidth: 420, margin: '0 auto', position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search news..."
              style={{ width: '100%', padding: '12px 16px 12px 44px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 14, outline: 'none', backdropFilter: 'blur(8px)' }}
              onFocus={e => e.target.style.borderColor = 'rgba(250,121,2,0.6)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.2)'} />
          </div>
        </div>
      </div>

      {/* ── News Grid ── */}
      <div style={{ background: '#f4f6fb', padding: '48px 16px 64px', minHeight: 400 }}>
        <div className="container">

          {/* Results count */}
          {!loading && !error && news.length > 0 && (
            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 28, fontWeight: 500 }}>
              Showing <span style={{ color: '#041476', fontWeight: 700 }}>{filtered.length}</span> of {news.length} news items
            </p>
          )}

          {loading ? <Skeleton /> : error ? (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 16, padding: '32px', textAlign: 'center', color: '#dc2626' }}>{error}</div>
          ) : filtered.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 20, padding: '64px 32px', textAlign: 'center', boxShadow: '0 2px 16px rgba(4,20,118,0.07)' }}>
              <p style={{ fontSize: 48, marginBottom: 16 }}>📰</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: '#041476', marginBottom: 8 }}>{search ? 'No results found' : 'No news yet'}</p>
              <p style={{ color: '#94a3b8', fontSize: 14 }}>{search ? `No news matching "${search}"` : 'Check back soon for the latest updates.'}</p>
            </div>
          ) : (
            <>
              {/* ── First item: wide featured card ── */}
              {(() => {
                const item = filtered[0];
                const { day, month, year, full } = formatDate(item.date);
                const action = getAction(item);
                const lp = action?.external ? { target: '_blank', rel: 'noopener noreferrer' } : {};
                return (
                  <article key={item._id} style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 32px rgba(4,20,118,0.13)', border: '1px solid rgba(4,20,118,0.1)', marginBottom: 28, transition: 'transform 0.2s, box-shadow 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(4,20,118,0.18)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 32px rgba(4,20,118,0.13)'; }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                      {/* Image */}
                      {item.image ? (
                        <div style={{ flex: '0 0 340px', minHeight: 240, position: 'relative', cursor: 'zoom-in', overflow: 'hidden' }}
                          onClick={() => setLightbox({ src: item.image?.startsWith('http') ? item.image : `${BASE_URL}${item.image}`, alt: item.title })}>
                          <img src={item.image?.startsWith('http') ? item.image : `${BASE_URL}${item.image}`} alt={item.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />
                          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent, rgba(4,20,118,0.08))' }} />
                          <div style={{ position: 'absolute', top: 14, left: 14, background: '#FA7902', color: '#fff', fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 999, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Latest</div>
                        </div>
                      ) : (
                        <div style={{ flex: '0 0 120px', background: 'linear-gradient(180deg,#041476,#0a2299)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: '24px 16px' }}>
                          <span style={{ fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{day}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', marginTop: 6, opacity: 0.9 }}>{month}</span>
                          <span style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>{year}</span>
                        </div>
                      )}

                      {/* Content */}
                      <div style={{ flex: 1, padding: '28px 32px', minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                          {item.featuredInHero && <span style={{ background: '#fff3e0', color: '#e65c00', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>⭐ Featured</span>}
                          {item.linkType === 'document' && <span style={{ background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999 }}>📄 Document</span>}
                          {item.linkType === 'external' && item.linkUrl && <span style={{ background: '#f0f9ff', color: '#0369a1', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999 }}>🔗 External Link</span>}
                          {item.linkType === 'internal' && item.linkUrl && <span style={{ background: '#f0fdf4', color: '#166534', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999 }}>📌 Internal</span>}
                        </div>
                        {/* Plain title — not a link */}
                        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', lineHeight: 1.35, margin: '0 0 12px' }}>
                          {item.title}
                        </h2>
                        {item.description && (
                          <div style={{ marginBottom: 20 }}>
                            <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.7, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {item.description}
                            </p>
                            {item.description.length > 200 && (
                              <button onClick={() => setReadMoreItem(item)}
                                style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: '#FA7902', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                                Read More ▼
                              </button>
                            )}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                          <span style={{ fontSize: 13, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            {full}
                          </span>
                          {action && (
                            <a href={action.href} {...lp}
                              style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: '#041476', padding: '8px 20px', borderRadius: 10, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.15s' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#FA7902'}
                              onMouseLeave={e => e.currentTarget.style.background = '#041476'}>
                              {action.label}
                              <span style={{ fontSize: 15 }}>{action.icon}</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })()}

              {/* ── Remaining items: 3-column grid ── */}
              {filtered.length > 1 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
                  {filtered.slice(1).map((item) => {
                    const { day, month, year, full } = formatDate(item.date);
                    const action = getAction(item);
                    const lp = action?.external ? { target: '_blank', rel: 'noopener noreferrer' } : {};
                    return (
                      <article key={item._id}
                        style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 16px rgba(4,20,118,0.08)', border: '1px solid rgba(4,20,118,0.07)', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, box-shadow 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 32px rgba(4,20,118,0.15)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 16px rgba(4,20,118,0.08)'; }}>

                        {/* Top: image or date banner */}
                        {item.image ? (
                          <div style={{ height: 180, position: 'relative', overflow: 'hidden', cursor: 'zoom-in', flexShrink: 0 }}
                            onClick={() => setLightbox({ src: item.image?.startsWith('http') ? item.image : `${BASE_URL}${item.image}`, alt: item.title })}>
                            <img src={item.image?.startsWith('http') ? item.image : `${BASE_URL}${item.image}`} alt={item.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s' }}
                              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.07)'}
                              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />
                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(4,20,118,0.45), transparent 55%)' }} />
                            <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(4,20,118,0.85)', backdropFilter: 'blur(6px)', borderRadius: 10, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, color: '#fff' }}>
                              <span style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{day}</span>
                              <div style={{ lineHeight: 1 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', opacity: 0.9 }}>{month}</div>
                                <div style={{ fontSize: 10, opacity: 0.5 }}>{year}</div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div style={{ height: 72, background: 'linear-gradient(135deg, #041476, #0a2299)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 14, color: '#fff', flexShrink: 0 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '6px 12px' }}>
                              <span style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{day}</span>
                              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', opacity: 0.85, marginTop: 2 }}>{month}</span>
                            </div>
                            <span style={{ fontSize: 11, opacity: 0.5 }}>{year}</span>
                          </div>
                        )}

                        {/* Body */}
                        <div style={{ flex: 1, padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
                          {/* Badges */}
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                            {item.featuredInHero && <span style={{ background: '#fff3e0', color: '#e65c00', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>⭐ Featured</span>}
                            {item.linkType === 'document' && <span style={{ background: '#fef2f2', color: '#dc2626', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>📄 PDF</span>}
                            {item.linkType === 'external' && item.linkUrl && <span style={{ background: '#f0f9ff', color: '#0369a1', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>🔗 Link</span>}
                            {item.linkType === 'internal' && item.linkUrl && <span style={{ background: '#f0fdf4', color: '#166534', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>📌 Page</span>}
                          </div>

                          {/* Plain title — not a link */}
                          <p style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 10, flex: 1 }}>
                            {item.title}
                          </p>

                          {/* Description */}
                          {item.description && (
                            <div style={{ marginBottom: 14 }}>
                              <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.65, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {item.description}
                              </p>
                              {item.description.length > 120 && (
                                <button onClick={() => setReadMoreItem(item)}
                                  style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: '#FA7902', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                  Read More ▼
                                </button>
                              )}
                            </div>
                          )}

                          {/* Footer */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                            <span style={{ fontSize: 11, color: '#cbd5e1' }}>{full}</span>
                            {action ? (
                              <a href={action.href} {...lp}
                                style={{ fontSize: 11, fontWeight: 700, color: '#041476', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', background: '#f0f4ff', borderRadius: 7, transition: 'all 0.15s' }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#041476'; e.currentTarget.style.color = '#fff'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#f0f4ff'; e.currentTarget.style.color = '#041476'; }}>
                                {action.label} <span>{action.icon}</span>
                              </a>
                            ) : (
                              <span style={{ fontSize: 10, color: '#e2e8f0', fontStyle: 'italic' }}>No attachment</span>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {lightbox && <ZoomableLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
      {readMoreItem && <DescriptionModal item={readMoreItem} onClose={() => setReadMoreItem(null)} />}

      <Footer />
    </>
  );
}
