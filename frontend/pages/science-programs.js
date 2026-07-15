import { useState, useEffect } from 'react';
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProgramCard from '../components/ProgramCard';
import Link from 'next/link';
import axios from 'axios';
import { FlaskConical, Search, BookOpen } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function SciencePrograms() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [query, setQuery]       = useState('');

  useEffect(() => {
    axios.get(`${API}/programs?category=Science`)
      .then(res => setPrograms(res.data || []))
      .catch(() => setPrograms([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = query.trim()
    ? programs.filter(p =>
        p.title?.toLowerCase().includes(query.toLowerCase()) ||
        p.shortDescription?.toLowerCase().includes(query.toLowerCase())
      )
    : programs;

  return (
    <>
      <Head>
        <title>Science Programs — University of Makran, Panjgur</title>
        <meta name="description" content="Explore undergraduate Science degree programs at University of Makran, Panjgur — BS Computer Science, Bio-Chemistry, Botany and more." />
      </Head>

      <Header />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden py-20"
        style={{ background: 'linear-gradient(135deg, #041476 0%, #0d1e9e 55%, #1e3eb8 100%)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.3) 0%, transparent 70%)' }} />

        <div className="container relative z-10">
          <div className="flex flex-col items-center text-center gap-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <FlaskConical size={30} className="text-white" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-2">Faculty of Sciences</p>
              <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">Science Programs</h1>
              <p className="text-lg text-white/65 max-w-2xl mx-auto leading-relaxed">
                Discover our undergraduate science degree programs designed to build analytical
                thinking, research skills, and technical expertise for the modern world.
              </p>
            </div>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-white/40 font-medium">
              <Link href="/" className="hover:text-white/70 transition-colors">Home</Link>
              <span>/</span>
              <Link href="/programs" className="hover:text-white/70 transition-colors">Programs</Link>
              <span>/</span>
              <span className="text-white/70">Science</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Content ── */}
      <section className="py-16" style={{ background: '#F1F5FF' }}>
        <div className="container">

          {/* Search + count row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <p className="text-gray-500 text-sm">
              Showing <span className="font-semibold text-gray-800">{filtered.length}</span> Science program{filtered.length !== 1 ? 's' : ''}
            </p>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search programs…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:border-primary focus:ring-2 focus:ring-blue-100 transition-colors w-56"
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
                {query ? `No results for "${query}"` : 'No Science programs found yet.'}
              </p>
              {query && (
                <button onClick={() => setQuery('')} className="mt-3 text-sm text-primary hover:underline">
                  Clear search
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

          {/* CTA banner */}
          {!loading && (
            <div className="mt-16 rounded-2xl overflow-hidden relative"
              style={{ background: 'linear-gradient(135deg, #041476 0%, #0d1e9e 50%, #FA7902 100%)' }}>
              <div className="absolute inset-0 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 px-8 py-10">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">Ready to Join Us?</h3>
                  <p className="text-white/65 text-sm">Apply for admission and start your academic journey at University of Makran.</p>
                </div>
                <Link
                  href="/admission"
                  className="shrink-0 inline-flex items-center gap-2 bg-white font-bold px-8 py-3.5 rounded-xl hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                  style={{ color: '#041476' }}
                >
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
