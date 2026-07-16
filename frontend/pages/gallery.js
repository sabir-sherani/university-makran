import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import axios from 'axios';
import { X, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';

const API_URL  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

function imgSrc(item) {
  return item.image?.startsWith("http") ? item.image : `${BASE_URL}${item.image}`;
}

export default function Gallery() {
  const [images, setImages]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [lightbox, setLightbox] = useState(null);
  const [filter, setFilter]     = useState('All');

  useEffect(() => {
    axios.get(`${API_URL}/gallery`)
      .then(r => setImages(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const categories = ['All', ...Array.from(new Set(images.map(i => i.category).filter(Boolean)))];
  const filtered   = filter === 'All' ? images : images.filter(i => i.category === filter);

  const prev = useCallback(() => setLightbox(i => (i - 1 + filtered.length) % filtered.length), [filtered.length]);
  const next = useCallback(() => setLightbox(i => (i + 1) % filtered.length), [filtered.length]);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e) => {
      if (e.key === 'Escape')      setLightbox(null);
      if (e.key === 'ArrowLeft')   prev();
      if (e.key === 'ArrowRight')  next();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [lightbox, prev, next]);

  return (
    <>
      <Head>
        <title>Gallery — University of Makran, Panjgur</title>
        <meta name="description" content="Photo gallery of University of Makran — campus life, events, achievements and milestones." />
      </Head>

      <Header />

      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#041476 0%,#0a2299 60%,#1a3ab8 100%)', padding: '56px 16px 64px' }}>
        <div style={{ position: 'absolute', width: 360, height: 360, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', top: -80, right: -80 }} />
        <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'rgba(250,121,2,0.1)', bottom: -50, left: -50 }} />
        <div className="container relative z-10 text-center">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(250,121,2,0.18)', border: '1px solid rgba(250,121,2,0.4)', borderRadius: 999, padding: '5px 16px', marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: '#FA7902', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Campus Life</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 800, color: '#fff', marginBottom: 12 }}>UoMP Gallery</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, maxWidth: 500, margin: '0 auto' }}>
            A visual journey through University of Makran — events, achievements, and moments that define us.
          </p>
        </div>
      </div>

      {/* Gallery */}
      <section style={{ background: '#f4f6fb', padding: '48px 16px 64px', minHeight: 400 }}>
        <div className="container">

          {/* Category filter tabs */}
          {categories.length > 1 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32, justifyContent: 'center' }}>
              {categories.map(cat => (
                <button key={cat} onClick={() => setFilter(cat)}
                  style={{ padding: '7px 18px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1.5px solid', transition: 'all 0.15s',
                    background: filter === cat ? '#041476' : '#fff',
                    color:      filter === cat ? '#fff' : '#041476',
                    borderColor: filter === cat ? '#041476' : 'rgba(4,20,118,0.2)' }}>
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Count */}
          {!loading && (
            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 24, textAlign: 'center', fontWeight: 500 }}>
              Showing <span style={{ color: '#041476', fontWeight: 700 }}>{filtered.length}</span> photo{filtered.length !== 1 ? 's' : ''}
            </p>
          )}

          {/* Grid */}
          {loading ? (
            <div className="gallery-grid">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="gallery-skeleton" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 32px', background: '#fff', borderRadius: 20, boxShadow: '0 2px 16px rgba(4,20,118,0.07)' }}>
              <p style={{ fontSize: 48 }}>🖼️</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#041476', marginTop: 12 }}>No photos yet</p>
              <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 6 }}>Gallery images will appear here once added.</p>
            </div>
          ) : (
            <div className="gallery-grid">
              {filtered.map((img, i) => (
                <button key={img._id} onClick={() => setLightbox(i)} className="gallery-card"
                  style={{ animationDelay: `${Math.min(i * 60, 600)}ms` }}>
                  {/* Photo */}
                  <div className="gallery-img-wrap">
                    <img src={imgSrc(img)} alt={img.title || `Photo ${i + 1}`} className="gallery-img" />
                    {/* Overlay */}
                    <div className="gallery-overlay">
                      <div className="gallery-zoom-icon">
                        <ZoomIn size={22} color="#fff" />
                      </div>
                      {img.title && (
                        <div className="gallery-title-bar">
                          <span>{img.title}</span>
                        </div>
                      )}
                    </div>
                    {/* Category badge */}
                    {img.category && img.category !== 'General' && (
                      <div className="gallery-badge">{img.category}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Lightbox */}
      {lightbox !== null && filtered[lightbox] && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.93)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setLightbox(null)}>
          {/* Counter */}
          <div style={{ position: 'absolute', top: 16, left: 20, color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, zIndex: 10 }}>
            {lightbox + 1} / {filtered.length}
          </div>
          {/* Close */}
          <button onClick={() => setLightbox(null)} style={{ position: 'absolute', top: 12, right: 16, background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 38, height: 38, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, color: '#fff' }}>
            <X size={20} />
          </button>
          {/* Prev */}
          <button onClick={e => { e.stopPropagation(); prev(); }} style={{ position: 'absolute', left: 14, background: 'rgba(4,20,118,0.7)', border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, color: '#fff', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#041476'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(4,20,118,0.7)'}>
            <ChevronLeft size={24} />
          </button>
          {/* Image */}
          <div style={{ maxWidth: '88vw', maxHeight: '88vh', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <img src={imgSrc(filtered[lightbox])} alt={filtered[lightbox].title || ''}
              style={{ maxWidth: '88vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 12, boxShadow: '0 24px 80px rgba(0,0,0,0.6)', display: 'block' }} />
            {(filtered[lightbox].title || filtered[lightbox].description) && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top,rgba(0,0,0,0.75),transparent)', borderRadius: '0 0 12px 12px', padding: '20px 20px 14px' }}>
                {filtered[lightbox].title && <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: 0 }}>{filtered[lightbox].title}</p>}
                {filtered[lightbox].description && <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: '4px 0 0' }}>{filtered[lightbox].description}</p>}
              </div>
            )}
          </div>
          {/* Next */}
          <button onClick={e => { e.stopPropagation(); next(); }} style={{ position: 'absolute', right: 14, background: 'rgba(4,20,118,0.7)', border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, color: '#fff', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#041476'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(4,20,118,0.7)'}>
            <ChevronRight size={24} />
          </button>
        </div>
      )}

      <style jsx global>{`
        /* ── Grid ── */
        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
          gap: 20px;
        }

        /* ── Card (outer frame / polaroid) ── */
        .gallery-card {
          background: #fff;
          border: none;
          padding: 8px 8px 36px;
          border-radius: 4px;
          box-shadow: 0 4px 18px rgba(0,0,0,0.13), 0 1px 4px rgba(0,0,0,0.08);
          cursor: pointer;
          transition: transform 0.28s cubic-bezier(.22,.68,0,1.4), box-shadow 0.28s ease;
          animation: fadeInUp 0.5s ease both;
          position: relative;
        }
        .gallery-card:hover {
          transform: translateY(-8px) rotate(0.5deg) scale(1.02);
          box-shadow: 0 20px 48px rgba(4,20,118,0.22), 0 4px 12px rgba(0,0,0,0.1);
        }

        /* ── Image wrapper ── */
        .gallery-img-wrap {
          position: relative;
          overflow: hidden;
          aspect-ratio: 1;
          border-radius: 2px;
          background: #e8ecf8;
        }
        .gallery-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.45s cubic-bezier(.22,.68,0,1.2);
        }
        .gallery-card:hover .gallery-img {
          transform: scale(1.1);
        }

        /* ── Hover overlay ── */
        .gallery-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(4,20,118,0.75) 0%, rgba(4,20,118,0.1) 55%, transparent 100%);
          opacity: 0;
          transition: opacity 0.3s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
        }
        .gallery-card:hover .gallery-overlay { opacity: 1; }

        /* ── Zoom icon (top-center) ── */
        .gallery-zoom-icon {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: rgba(255,255,255,0.18);
          backdrop-filter: blur(6px);
          border: 1.5px solid rgba(255,255,255,0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          transform: scale(0.6);
          opacity: 0;
          transition: transform 0.3s cubic-bezier(.22,.68,0,1.4), opacity 0.3s ease;
          align-self: center;
          margin-top: auto;
          margin-bottom: auto;
        }
        .gallery-card:hover .gallery-zoom-icon {
          transform: scale(1);
          opacity: 1;
        }

        /* ── Title bar (slides up from bottom) ── */
        .gallery-title-bar {
          width: 100%;
          padding: 6px 8px 4px;
          text-align: center;
          transform: translateY(12px);
          opacity: 0;
          transition: transform 0.3s ease, opacity 0.3s ease;
        }
        .gallery-title-bar span {
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          text-shadow: 0 1px 4px rgba(0,0,0,0.5);
          line-height: 1.3;
        }
        .gallery-card:hover .gallery-title-bar {
          transform: translateY(0);
          opacity: 1;
        }

        /* ── Category badge ── */
        .gallery-badge {
          position: absolute;
          top: 8px;
          left: 8px;
          background: rgba(250,121,2,0.88);
          backdrop-filter: blur(4px);
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 9px;
          border-radius: 999px;
          letter-spacing: 0.04em;
        }

        /* ── Skeleton ── */
        .gallery-skeleton {
          aspect-ratio: 1;
          border-radius: 4px;
          background: linear-gradient(90deg, #e8ecf8 25%, #d4daf0 50%, #e8ecf8 75%);
          background-size: 200% 100%;
          animation: shimmer 1.6s infinite;
        }

        /* ── Animations ── */
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <Footer />
    </>
  );
}
