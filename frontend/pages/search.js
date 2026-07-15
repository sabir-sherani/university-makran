import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Header from '../components/Header';
import Footer from '../components/Footer';
import axios from 'axios';
import { Search, ArrowRight, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// ── Category config ───────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'all',            label: 'All' },
  { key: 'news',           label: 'News' },
  { key: 'departments',    label: 'Departments' },
  { key: 'administration', label: 'Administration' },
  { key: 'programs',       label: 'Programs' },
  { key: 'faculty',        label: 'Faculty' },
  { key: 'facilities',     label: 'Facilities' },
];

const CAT_STYLES = {
  News:           { bg: 'bg-red-50',     text: 'text-red-800',   dot: '#041476' },
  Department:     { bg: 'bg-blue-50',    text: 'text-blue-800',  dot: '#041476' },
  Administration: { bg: 'bg-indigo-50',  text: 'text-indigo-800',dot: '#1d4ed8' },
  Staff:          { bg: 'bg-emerald-50', text: 'text-emerald-800',dot: '#065f46' },
  Program:        { bg: 'bg-amber-50',   text: 'text-amber-800', dot: '#b45309' },
  Faculty:        { bg: 'bg-violet-50',  text: 'text-violet-800',dot: '#7c3aed' },
  Facility:       { bg: 'bg-cyan-50',    text: 'text-cyan-800',  dot: '#0891b2' },
};

// ── Highlight matched text ────────────────────────────────────────────────────

function Highlight({ text, query }) {
  if (!text || !query) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-yellow-100 text-yellow-900 rounded-sm px-0.5 not-italic font-semibold">{part}</mark>
          : part
      )}
    </>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-1 h-full min-h-[80px] rounded-full bg-gray-200 shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="h-3 bg-gray-200 rounded w-16" />
          <div className="h-5 bg-gray-200 rounded w-2/3" />
          <div className="h-4 bg-gray-100 rounded w-full" />
          <div className="h-4 bg-gray-100 rounded w-4/5" />
        </div>
      </div>
    </div>
  );
}

// ── Result card ───────────────────────────────────────────────────────────────

function ResultCard({ result, query }) {
  const style = CAT_STYLES[result.category] || CAT_STYLES.News;
  const isExternal = result.url.startsWith('http');

  const inner = (
    <div
      className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200 flex items-stretch gap-0 group cursor-pointer"
    >
      {/* Accent bar */}
      <div
        className="w-1 rounded-full shrink-0 mr-5 transition-all duration-200 group-hover:w-1.5"
        style={{ background: style.dot }}
      />

      <div className="flex-1 min-w-0">
        {/* Category badge + meta */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: style.dot }} />
            {result.category}
          </span>
          {result.meta && (
            <span className="text-xs text-gray-400">{result.meta}</span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-bold text-gray-900 text-base leading-snug mb-1.5 group-hover:text-blue-900 transition-colors">
          <Highlight text={result.title} query={query} />
        </h3>

        {/* Description */}
        {result.description && (
          <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
            <Highlight text={result.description} query={query} />
          </p>
        )}
      </div>

      {/* Arrow */}
      <div className="flex items-center pl-4 shrink-0">
        <ArrowRight
          size={16}
          className="text-gray-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all duration-200"
        />
      </div>
    </div>
  );

  if (isExternal) {
    return <a href={result.url} target="_blank" rel="noopener noreferrer">{inner}</a>;
  }
  return <Link href={result.url}>{inner}</Link>;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const router = useRouter();
  const { q: urlQuery = '', category: urlCat = 'all' } = router.query;

  const [inputVal, setInputVal]   = useState('');
  const [results, setResults]     = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(false);
  const [searched, setSearched]   = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const inputRef = useRef();

  // Sync input with URL query
  useEffect(() => {
    if (urlQuery) setInputVal(urlQuery);
    if (urlCat)   setActiveCategory(urlCat);
  }, [urlQuery, urlCat]);

  // Fetch results whenever URL params change
  useEffect(() => {
    if (!urlQuery || urlQuery.length < 2) {
      setResults([]);
      setTotal(0);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(false);
    axios
      .get(`${API_URL}/search`, { params: { q: urlQuery, category: urlCat || 'all' } })
      .then(res => {
        setResults(res.data.results || []);
        setTotal(res.data.total || 0);
      })
      .catch(() => { setResults([]); setTotal(0); })
      .finally(() => { setLoading(false); setSearched(true); });
  }, [urlQuery, urlCat]);

  // Handle form submit — push new URL
  function handleSubmit(e) {
    e.preventDefault();
    if (!inputVal.trim()) return;
    router.push(`/search?q=${encodeURIComponent(inputVal.trim())}&category=${activeCategory}`);
  }

  // Switch category tab without retyping
  function switchCategory(cat) {
    setActiveCategory(cat);
    if (urlQuery) {
      router.push(`/search?q=${encodeURIComponent(urlQuery)}&category=${cat}`, undefined, { shallow: false });
    }
  }

  // Count per category for tab badges
  const countByCategory = results.reduce((acc, r) => {
    const key = r.category.toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const filteredResults = activeCategory === 'all'
    ? results
    : results.filter(r => r.category.toLowerCase() === activeCategory ||
        (activeCategory === 'administration' && r.category === 'Staff'));

  return (
    <>
      <Head>
        <title>{urlQuery ? `"${urlQuery}" — Search` : 'Search'} · University of Makran</title>
        <meta name="robots" content="noindex" />
      </Head>

      <Header />

      {/* ── Search hero ── */}
      <section style={{ background: 'linear-gradient(135deg, #041476 0%, #020b5e 60%, #041476 100%)' }}>
        <div className="container py-12 md:py-16">
          <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-3">
            University of Makran — Search
          </p>
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-8">
            {urlQuery
              ? <>Results for <span className="text-yellow-300">&quot;{urlQuery}&quot;</span></>
              : 'Search the University'}
          </h1>

          {/* Search form */}
          <form onSubmit={handleSubmit} className="max-w-2xl">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search
                  size={17}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  placeholder="Search news, departments, programs…"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-white/40"
                  autoFocus={!urlQuery}
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5 shrink-0"
                style={{ background: '#041476' }}
              >
                Search
              </button>
            </div>
          </form>

          {/* Result count */}
          {searched && (
            <p className="mt-4 text-white/60 text-sm">
              {total === 0
                ? 'No results found'
                : <>{total} result{total !== 1 ? 's' : ''} found</>}
            </p>
          )}
        </div>
      </section>

      {/* ── Category filter tabs ── */}
      {(searched || loading) && (
        <div className="border-b border-gray-200 bg-white sticky top-0 z-20 shadow-sm">
          <div className="container">
            <div className="flex gap-1 overflow-x-auto py-1 scrollbar-hide">
              {CATEGORIES.map(cat => {
                const count = cat.key === 'all'
                  ? total
                  : results.filter(r =>
                      r.category.toLowerCase() === cat.key ||
                      (cat.key === 'administration' && r.category === 'Staff')
                    ).length;

                const isActive = activeCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={() => switchCategory(cat.key)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-150 ${
                      isActive
                        ? 'border-blue-800 text-blue-900'
                        : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                    }`}
                  >
                    {cat.label}
                    {count > 0 && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                          isActive ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Results body ── */}
      <div className="bg-gray-50 min-h-screen py-10">
        <div className="container max-w-4xl">

          {/* Loading skeletons */}
          {loading && (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* Results */}
          {!loading && searched && filteredResults.length > 0 && (
            <div className="space-y-3">
              {filteredResults.map(result => (
                <ResultCard key={`${result.category}-${result.id}`} result={result} query={urlQuery} />
              ))}
            </div>
          )}

          {/* No results */}
          {!loading && searched && filteredResults.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-16 text-center border border-gray-100">
              <div className="text-6xl mb-5">🔍</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                No results for &quot;{urlQuery}&quot;
              </h3>
              <p className="text-gray-400 text-sm max-w-sm mx-auto mb-8">
                Try different keywords, or browse the sections below.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  { label: 'All News',       href: '/news' },
                  { label: 'Departments',    href: '/departments' },
                  { label: 'Programs',       href: '/programs' },
                  { label: 'Administration', href: '/administration' },
                  { label: 'Facilities',     href: '/facilities' },
                ].map(l => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Empty state (page opened with no query) */}
          {!loading && !searched && !urlQuery && (
            <div className="bg-white rounded-2xl shadow-sm p-16 text-center border border-gray-100">
              <div className="text-6xl mb-5">🔎</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Start searching</h3>
              <p className="text-gray-400 text-sm">
                Type in the search bar above to find news, departments, programs and more.
              </p>
            </div>
          )}

        </div>
      </div>

      <Footer />
    </>
  );
}
