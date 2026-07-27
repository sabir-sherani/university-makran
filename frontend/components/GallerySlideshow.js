import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const API_URL  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

const PANEL_HEIGHT = 500; // px — both panels share this height
const SIDEBAR_W    = 380; // px — "Latest Updates" panel width

function imgSrc(item) {
  return item?.image?.startsWith('http') ? item.image : `${BASE_URL}${item.image}`;
}

export default function GallerySlideshow() {
  const [slides, setSlides]           = useState([]);
  const [news, setNews]               = useState([]);
  const [current, setCurrent]         = useState(0);
  const [loadingSlides, setLSlides]   = useState(true);
  const [loadingNews, setLNews]       = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    axios.get(`${API_URL}/gallery`)
      .then(r => setSlides((r.data || []).slice(0, 10)))
      .catch(() => {})
      .finally(() => setLSlides(false));

    axios.get(`${API_URL}/news`)
      .then(r => setNews(r.data || []))
      .catch(() => {})
      .finally(() => setLNews(false));
  }, []);

  const startAuto = useCallback((len) => {
    if (len <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrent(i => (i + 1) % len);
    }, 4500);
  }, []);

  const stopAuto = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    startAuto(slides.length);
    return () => stopAuto();
  }, [slides.length, startAuto, stopAuto]);

  function goPrev() {
    if (!slides.length) return;
    setCurrent(i => (i - 1 + slides.length) % slides.length);
  }
  function goNext() {
    if (!slides.length) return;
    setCurrent(i => (i + 1) % slides.length);
  }

  return (
    <section style={{ background: '#0B1229', padding: '60px 0 64px' }}>
      <div className="container">

        {/* ── Heading ── */}
        <div className="mb-7">
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#FA7902', marginBottom: 6 }}>
            Campus Life
          </p>
          <h2 style={{ fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 800, color: '#fff', margin: 0 }}>
            Gallery &amp; Latest Updates
          </h2>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <span style={{ height: 4, width: 40, borderRadius: 999, background: '#FA7902', display: 'block' }} />
            <span style={{ height: 4, width: 16, borderRadius: 999, background: '#041476', display: 'block' }} />
            <span style={{ height: 4, width: 8,  borderRadius: 999, background: 'rgba(255,255,255,0.15)', display: 'block' }} />
          </div>
        </div>

        {/* ── Two-panel row ── */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'stretch', height: PANEL_HEIGHT }}>

          {/* ════════════════════════ SLIDESHOW ════════════════════════ */}
          <div
            style={{ flex: 1, minWidth: 0, position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#0a1020', cursor: 'pointer' }}
            onMouseEnter={stopAuto}
            onMouseLeave={() => startAuto(slides.length)}
          >
            {loadingSlides ? (
              <div className="slide-shimmer" style={{ width: '100%', height: '100%' }} />
            ) : slides.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
                <span style={{ fontSize: 52 }}>🖼️</span>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>No gallery photos yet</p>
              </div>
            ) : (
              <>
                {/* ── Slides ── */}
                {slides.map((slide, i) => (
                  <a
                    key={slide._id}
                    href="/gallery"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      position: 'absolute', inset: 0, display: 'block',
                      opacity: i === current ? 1 : 0,
                      transition: 'opacity 0.75s ease',
                      pointerEvents: i === current ? 'auto' : 'none',
                    }}
                  >
                    <img
                      src={imgSrc(slide)}
                      alt={slide.title || 'Gallery photo'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />

                    {/* Gradient overlay */}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.18) 45%, transparent 70%)' }} />

                    {/* Bottom info bar */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 24px 20px' }}>
                      {slide.category && slide.category !== 'General' && (
                        <span style={{ display: 'inline-block', background: '#FA7902', color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 12px', borderRadius: 999, marginBottom: 10, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                          {slide.category}
                        </span>
                      )}
                      {slide.title && (
                        <p style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: 0, lineHeight: 1.3, textShadow: '0 2px 10px rgba(0,0,0,0.7)' }}>
                          {slide.title}
                        </p>
                      )}
                      {slide.description && (
                        <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 13, margin: '6px 0 0', lineHeight: 1.5, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
                          {slide.description}
                        </p>
                      )}
                      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, margin: '8px 0 0', fontWeight: 600, letterSpacing: '0.04em' }}>
                        Click to view full gallery ↗
                      </p>
                    </div>
                  </a>
                ))}

                {/* ── Slide counter ── */}
                <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', borderRadius: 999, padding: '4px 12px', pointerEvents: 'none' }}>
                  <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{current + 1} / {slides.length}</span>
                </div>

                {/* ── Prev / Next arrows ── */}
                {slides.length > 1 && (
                  <>
                    <button
                      onClick={e => { e.preventDefault(); goPrev(); }}
                      style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', zIndex: 10, width: 42, height: 42, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(6px)', transition: 'background 0.18s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(4,20,118,0.85)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={e => { e.preventDefault(); goNext(); }}
                      style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', zIndex: 10, width: 42, height: 42, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(6px)', transition: 'background 0.18s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(4,20,118,0.85)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}

                {/* ── Dot indicators ── */}
                {slides.length > 1 && (
                  <div style={{ position: 'absolute', bottom: 18, right: 22, display: 'flex', gap: 7, zIndex: 10 }}>
                    {slides.map((_, i) => (
                      <button
                        key={i}
                        onClick={e => { e.preventDefault(); setCurrent(i); }}
                        style={{ width: i === current ? 28 : 8, height: 8, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.35s ease', background: i === current ? '#FA7902' : 'rgba(255,255,255,0.35)' }}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ════════════════════════ LATEST UPDATES ════════════════════════ */}
          <div style={{ width: SIDEBAR_W, flexShrink: 0, height: '100%', borderRadius: 16, overflow: 'hidden', background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 32px rgba(0,0,0,0.28)' }}>

            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '2px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg,#041476,#1a3ab8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                  📢
                </span>
                <h3 style={{ fontSize: 13, fontWeight: 800, color: '#041476', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                  Latest Updates
                </h3>
              </div>
              <a
                href="/news"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 11, fontWeight: 700, color: '#FA7902', textDecoration: 'none', flexShrink: 0 }}
              >
                View All →
              </a>
            </div>

            {/* Scrollable news list */}
            <div className="updates-scroll" style={{ flex: 1, overflowY: 'auto' }}>
              {loadingNews ? (
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {[...Array(6)].map((_, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12 }}>
                      <div style={{ width: 44, flexShrink: 0, height: 50, borderRadius: 8, background: '#e8ecf8' }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7, paddingTop: 4 }}>
                        <div style={{ height: 12, background: '#e8ecf8', borderRadius: 4, width: '88%' }} />
                        <div style={{ height: 10, background: '#f1f5f9', borderRadius: 4, width: '65%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : news.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '32px 24px' }}>
                  No updates yet.
                </div>
              ) : (
                <div>
                  {news.map((item) => {
                    const d     = new Date(item.date);
                    const day   = d.toLocaleDateString('en-GB', { day: '2-digit' });
                    const month = d.toLocaleDateString('en-GB', { month: 'short' });
                    return (
                      <a
                        key={item._id}
                        href="/news"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="update-row"
                        style={{ display: 'flex', gap: 0, padding: '13px 16px', borderBottom: '1px solid #f1f5f9', textDecoration: 'none', transition: 'background 0.15s' }}
                      >
                        {/* Date */}
                        <div style={{ flexShrink: 0, width: 46, textAlign: 'center', paddingRight: 10 }}>
                          <span style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#FA7902', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{month}</span>
                          <span style={{ display: 'block', fontSize: 24, fontWeight: 900, color: '#041476', lineHeight: 1.1 }}>{day}</span>
                        </div>

                        {/* Accent bar */}
                        <div style={{ flexShrink: 0, width: 3, borderRadius: 4, background: 'linear-gradient(to bottom,#041476,rgba(4,20,118,0.1))', marginRight: 11, alignSelf: 'stretch' }} />

                        {/* Text */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12.5, fontWeight: 700, color: '#1e293b', margin: 0, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {item.title}
                          </p>
                          {item.description && (
                            <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 0', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {item.description}
                            </p>
                          )}
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer link */}
            <div style={{ padding: '10px 16px', borderTop: '1px solid #f1f5f9', flexShrink: 0, background: '#f8faff' }}>
              <a
                href="/gallery"
                target="_blank"
                rel="noopener noreferrer"
                className="gallery-footer-btn"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none', fontSize: 12, fontWeight: 700, color: '#041476', padding: '9px 0', borderRadius: 10, transition: 'all 0.18s', border: '1.5px solid rgba(4,20,118,0.15)' }}
              >
                🖼️ &nbsp;View Full Gallery ↗
              </a>
            </div>
          </div>

        </div>
      </div>

      <style jsx global>{`
        .slide-shimmer {
          background: linear-gradient(90deg, #0d1633 25%, #1a2555 50%, #0d1633 75%);
          background-size: 200% 100%;
          animation: slideShimmer 1.6s infinite;
        }
        @keyframes slideShimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .updates-scroll {
          scrollbar-width: thin;
          scrollbar-color: #c7d0e8 transparent;
        }
        .updates-scroll::-webkit-scrollbar { width: 4px; }
        .updates-scroll::-webkit-scrollbar-track { background: transparent; }
        .updates-scroll::-webkit-scrollbar-thumb { background: #c7d0e8; border-radius: 99px; }
        .updates-scroll::-webkit-scrollbar-thumb:hover { background: #041476; }
        .update-row:hover { background: #f8f9ff !important; }
        .gallery-footer-btn:hover { background: #041476 !important; color: #fff !important; }
      `}</style>
    </section>
  );
}
