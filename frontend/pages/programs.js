import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProgramCard from '../components/ProgramCard';
import axios from 'axios';
import { BookOpen, FlaskConical, Palette, Search, ArrowRight } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL;

const CATEGORIES = [
  { key: 'all',     label: 'All Programs' },
  { key: 'Science', label: 'Science',      Icon: FlaskConical, color: '#2563EB' },
  { key: 'Arts',    label: 'Arts',         Icon: Palette,      color: '#7C3AED' },
];

export default function Programs() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');
  const [query, setQuery]       = useState('');

  useEffect(() => {
    axios.get(`${API}/programs`)
      .then(res => setPrograms(res.data || []))
      .catch(() => setPrograms([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = programs
    .filter(p => filter === 'all' || p.category === filter)
    .filter(p =>
      !query.trim() ||
      p.title?.toLowerCase().includes(query.toLowerCase()) ||
      p.shortDescription?.toLowerCase().includes(query.toLowerCase())
    );

  const scienceCount = programs.filter(p => p.category === 'Science').length;
  const artsCount    = programs.filter(p => p.category === 'Arts').length;

  return (
    <>
      <Head>
        <title>Academic Programs — University of Makran, Panjgur</title>
        <meta name="description" content="Explore all undergraduate degree programs at University of Makran, Panjgur — Science and Arts faculties." />
      </Head>

      <Header />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden py-20"
        style={{ background: 'linear-gradient(135deg, #041476 0%, #0d1e9e 55%, #FA7902 100%)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="container relative z-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-5 text-xs font-bold uppercase tracking-widest text-white/60 border border-white/15"
            style={{ background: 'rgba(255,255,255,0.07)' }}>
            <BookOpen size={13} /> Academic Offerings
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">Degree Programs</h1>
          <p className="text-lg text-white/65 max-w-2xl mx-auto leading-relaxed">
            University of Makran offers a wide range of BS (Hons) programs across Science
            and Arts faculties — shaping the future leaders of Balochistan.
          </p>

          {/* Quick-nav cards */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <Link href="/science-programs"
              className="flex items-center gap-3 px-6 py-4 rounded-2xl text-white font-semibold text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
              style={{ background: 'rgba(37,99,235,0.25)', border: '1px solid rgba(37,99,235,0.4)' }}>
              <FlaskConical size={20} />
              <div className="text-left">
                <div>Science Programs</div>
                <div className="text-white/50 text-xs font-normal">{scienceCount} program{scienceCount !== 1 ? 's' : ''}</div>
              </div>
              <ArrowRight size={15} className="ml-auto opacity-60" />
            </Link>
            <Link href="/arts-programs"
              className="flex items-center gap-3 px-6 py-4 rounded-2xl text-white font-semibold text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
              style={{ background: 'rgba(124,58,237,0.25)', border: '1px solid rgba(124,58,237,0.4)' }}>
              <Palette size={20} />
              <div className="text-left">
                <div>Arts Programs</div>
                <div className="text-white/50 text-xs font-normal">{artsCount} program{artsCount !== 1 ? 's' : ''}</div>
              </div>
              <ArrowRight size={15} className="ml-auto opacity-60" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Programs grid ── */}
      <section className="py-16" style={{ background: '#F1F5FF' }}>
        <div className="container">

          {/* Filter + search bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${filter === key ? 'text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-primary hover:text-primary'}`}
                  style={filter === key ? { background: '#041476' } : {}}
                >
                  {label}
                  {key !== 'all' && (
                    <span className="ml-1.5 opacity-60">
                      ({key === 'Science' ? scienceCount : artsCount})
                    </span>
                  )}
                  {key === 'all' && <span className="ml-1.5 opacity-60">({programs.length})</span>}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search programs…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:border-primary focus:ring-2 focus:ring-blue-100 transition-colors w-52"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: '#041476', borderTopColor: 'transparent' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 text-gray-400">
              <BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">
                {query ? `No results for "${query}"` : 'No programs found.'}
              </p>
              {(query || filter !== 'all') && (
                <button
                  onClick={() => { setQuery(''); setFilter('all'); }}
                  className="mt-3 text-sm text-primary hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map(prog => (
                <ProgramCard key={prog._id} program={prog} />
              ))}
            </div>
          )}

          {/* Bottom CTA */}
          {!loading && (
            <div className="mt-16 rounded-2xl overflow-hidden relative"
              style={{ background: 'linear-gradient(135deg, #041476 0%, #0d1e9e 50%, #FA7902 100%)' }}>
              <div className="absolute inset-0 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 px-8 py-10">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">Ready to Begin Your Journey?</h3>
                  <p className="text-white/65 text-sm">Apply for admission and join the University of Makran community.</p>
                </div>
                <Link href="/admission"
                  className="shrink-0 inline-flex items-center gap-2 bg-white font-bold px-8 py-3.5 rounded-xl hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                  style={{ color: '#041476' }}>
                  Apply for Admission
                </Link>
              </div>
            </div>
          )}

        </div>
      </section>

      <Footer />
    </>
  );
}
