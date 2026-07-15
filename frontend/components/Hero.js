import { useState, useEffect } from 'react'; // useState kept for future use
import Link from 'next/link';
import axios from 'axios';


export default function Hero() {
  const [updates, setUpdates] = useState([]);

  useEffect(() => {
    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/news/hero`)
      .then(r => setUpdates(r.data || []))
      .catch(() => {});
  }, []);

  const FALLBACK = [
    { title: 'Fall 2024 Admissions Open' },
    { title: 'New CS Program Launched' },
    { title: 'Annual Convocation 2024' },
    { title: 'Scholarship Applications Now Open' },
    { title: 'New Faculty Appointments Announced' },
  ];

  const list = updates.length > 0 ? updates : FALLBACK;

  return (
    <section className="relative">
      <div
        className="relative hero-static w-full overflow-hidden"
        style={{
          backgroundImage: 'url(/1.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Dark-blue gradient overlay — heavy on left, lighter on right */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(105deg, rgba(7, 9, 47, 0.82) 0%, rgba(6, 7, 62, 0.55) 45%, rgba(0,0,0,0.18) 100%)' }} />
        {/* Bottom fade */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 48%)' }} />

        {/* ── Content ── */}
        <div className="relative z-10 h-full flex flex-col">

          {/* Main area */}
          <div className="flex-1 flex items-center">
            <div className="container w-full">
              <div className="flex items-center justify-between gap-8">

                {/* LEFT: headline + buttons */}
                <div className="max-w-2xl">
                  {/* Badge */}
                  <div className="inline-flex items-center gap-2 text-xs font-bold px-4 py-1.5 rounded-full mb-6 uppercase tracking-widest border"
                    style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)', color: '#fff' }}>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#FA7902' }} />
                    University of Makran, Panjgur
                  </div>

                  <h1 className="font-extrabold mb-5 leading-tight"
                    style={{ fontSize: 'clamp(2.4rem, 5.5vw, 4rem)', textShadow: '0 2px 24px rgba(0,0,0,0.5)' }}>
                    <span className="text-white">Excellence in</span><br />
                    <em style={{ color: '#FA7902', fontStyle: 'italic' }}>Education</em>
                  </h1>

                  <p className="mb-10 max-w-lg leading-relaxed"
                    style={{ color: 'rgba(255,255,255,0.82)', fontSize: 'clamp(0.92rem, 1.6vw, 1.08rem)', textShadow: '0 1px 8px rgba(0,0,0,0.4)' }}>
                    Empowering future leaders through world-class academic programs and a vibrant campus community in the heart of Panjgur. Join a legacy of innovation and scholarship.
                  </p>

                  <div className="flex flex-wrap gap-4">
                    <Link href="/admission"
                      className="inline-flex items-center gap-2 font-bold px-8 py-3.5 rounded-xl transition-all duration-300 shadow-xl hover:-translate-y-0.5 hover:shadow-2xl text-sm"
                      style={{ background: 'linear-gradient(135deg, #FA7902, #e06800)', color: '#fff' }}>
                      Apply Now
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </Link>
                    <Link href="/programs"
                      className="inline-flex items-center gap-2 font-bold px-8 py-3.5 rounded-xl transition-all duration-300 hover:-translate-y-0.5 border-2 text-sm"
                      style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.45)', color: '#fff', backdropFilter: 'blur(8px)' }}>
                      Explore Programs
                    </Link>
                  </div>
                </div>

                {/* RIGHT: Latest Updates card */}
                {/* RIGHT: Latest Updates card */}
                <div className="hidden lg:flex flex-col shrink-0 rounded-2xl overflow-hidden latest-updates-card"
                  style={{
                    width: 320,
                    background: 'rgba(8, 20, 80, 0.28)',
                    border: '1px solid rgba(255,255,255,0.22)',
                    backdropFilter: 'blur(28px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                    boxShadow: '0 8px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(255,255,255,0.06)',
                  }}>

                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center gap-2.5">
                      {/* Animated dot */}
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: '#FA7902' }} />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: '#FA7902' }} />
                      </span>
                      <span className="font-bold text-white tracking-wide" style={{ fontSize: 13, letterSpacing: '0.04em' }}>Latest Updates</span>
                    </div>
                    {/* Bell icon */}
                    <div className="flex items-center justify-center rounded-full"
                      style={{ width: 30, height: 30, background: 'rgba(250,121,2,0.18)', border: '1px solid rgba(250,121,2,0.35)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FA7902" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                      </svg>
                    </div>
                  </div>

                  {/* Vertical scrolling ticker */}
                  <div className="relative overflow-hidden" style={{ height: 280 }}>
                    {/* Top fade */}
                    <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
                      style={{ height: 36, background: 'linear-gradient(to bottom, rgba(8,20,80,0.55), transparent)' }} />
                    {/* Bottom fade */}
                    <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none"
                      style={{ height: 36, background: 'linear-gradient(to top, rgba(8,20,80,0.55), transparent)' }} />

                    <div className="news-ticker-track">
                      {[...list, ...list].map((item, i) => {
                        const href = item.linkType === 'internal'  ? item.linkUrl
                                   : item.linkType === 'document'  ? item.document
                                   : item.linkUrl                  ? item.linkUrl
                                   : '/news';
                        const isExternal = item.linkType === 'external' || (item.linkUrl && item.linkUrl.startsWith('http'));
                        return (
                          <a key={i}
                            href={href || '/news'}
                            target={isExternal ? '_blank' : '_self'}
                            rel={isExternal ? 'noopener noreferrer' : undefined}
                            className="flex items-start gap-3 px-5 py-3.5 news-ticker-item"
                            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', textDecoration: 'none' }}>
                            {/* Orange left accent bar */}
                            <div className="shrink-0 rounded-full mt-1.5" style={{ width: 3, height: 34, background: 'linear-gradient(to bottom, #FA7902, rgba(250,121,2,0.2))' }} />
                            <div className="min-w-0">
                              {item.date && (
                                <p className="font-semibold mb-1" style={{ fontSize: 12, color: '#FA7902', letterSpacing: '0.06em' }}>
                                  {new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
                                </p>
                              )}
                              <p className="font-semibold leading-snug news-ticker-title" style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 1.55 }}>
                                {item.title}
                              </p>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-5 py-3.5" style={{ borderTop: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)' }}>
                    <Link href="/news"
                      className="group flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-all duration-200"
                      style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#FA7902'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
                      View All News
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>

      <style jsx global>{`
        /* Ticker item hover */
        .news-ticker-item { transition: background 0.2s; cursor: pointer; }
        .news-ticker-item:hover { background: rgba(255,255,255,0.07); }
        .news-ticker-item:hover .news-ticker-title { color: #FA7902 !important; }

        /* Vertical news ticker */
        .news-ticker-track {
          animation: tickerScroll 14s linear infinite;
        }
        .news-ticker-track:hover {
          animation-play-state: paused;
        }
        @keyframes tickerScroll {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        /* Ping animation for live dot */
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        .animate-ping { animation: ping 1.2s cubic-bezier(0,0,0.2,1) infinite; }

        .hero-static {
          height: calc(100vh - 112px);
          min-height: 520px;
        }
        @media (max-width: 1023px) {
          .hero-static {
            height: calc(100vh - 72px);
            min-height: 420px;
          }
        }
        @media (max-width: 767px) {
          .hero-static {
            height: calc(100vh - 72px);
            min-height: 380px;
          }
        }
        @supports (height: 100svh) {
          .hero-static { height: calc(100svh - 112px); }
          @media (max-width: 1023px) { .hero-static { height: calc(100svh - 72px); } }
          @media (max-width: 767px)  { .hero-static { height: calc(100svh - 72px); } }
        }
      `}</style>
    </section>
  );
}
