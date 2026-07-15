import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import {
  Clock, Layers, GraduationCap, ArrowRight,
  FlaskConical, Palette, ChevronLeft, BookOpen,
} from 'lucide-react';

const API      = process.env.NEXT_PUBLIC_API_URL;
const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace('/api', '');

const CAT_META = {
  Science: {
    Icon: FlaskConical,
    color: '#2563EB',
    gradient: 'linear-gradient(135deg, #041476 0%, #1e40af 55%, #2563EB 100%)',
  },
  Arts: {
    Icon: Palette,
    color: '#7C3AED',
    gradient: 'linear-gradient(135deg, #041476 0%, #4c1d95 55%, #7C3AED 100%)',
  },
};

function imgSrc(image) {
  if (!image) return null;
  if (image.startsWith('http')) return image;
  return `${BASE_URL}${image}`;
}

export default function ProgramDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [program, setProgram]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    axios.get(`${API}/programs/${id}`)
      .then(res => setProgram(res.data))
      .catch(err => { if (err.response?.status === 404) setNotFound(true); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <>
      <Header />
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 rounded-full animate-spin"
          style={{ borderColor: '#041476', borderTopColor: 'transparent' }} />
      </div>
      <Footer />
    </>
  );

  if (notFound || !program) return (
    <>
      <Header />
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <BookOpen size={56} className="mb-4" style={{ color: '#041476', opacity: 0.2 }} />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Program Not Found</h2>
        <p className="text-gray-500 mb-6 max-w-md">
          The program you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Link
          href="/programs"
          className="inline-flex items-center gap-2 text-white font-bold px-6 py-3 rounded-xl"
          style={{ background: 'linear-gradient(135deg, #041476, #1a3db5)' }}
        >
          <ChevronLeft size={16} /> Back to Programs
        </Link>
      </div>
      <Footer />
    </>
  );

  const meta = CAT_META[program.category] || CAT_META.Science;
  const { Icon, color, gradient } = meta;
  const thumb        = imgSrc(program.image);
  const categoryHref = program.category === 'Science' ? '/science-programs' : '/arts-programs';

  return (
    <>
      <Head>
        <title>{program.title} — University of Makran, Panjgur</title>
        <meta
          name="description"
          content={program.shortDescription || `${program.title} at University of Makran, Panjgur`}
        />
      </Head>

      <Header />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden py-8 md:py-12 lg:py-14" style={{ background: gradient }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="container relative z-10">
          {/* Breadcrumb */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-white/40 font-medium mb-6">
            <Link href="/" className="hover:text-white/70 transition-colors">Home</Link>
            <span>/</span>
            <Link href="/programs" className="hover:text-white/70 transition-colors">Programs</Link>
            <span>/</span>
            <Link href={categoryHref} className="hover:text-white/70 transition-colors">{program.category}</Link>
            <span>/</span>
            <span className="text-white/70 truncate max-w-[200px]">{program.title}</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-12">
            {/* Text side */}
            <div className="flex-1 min-w-0">
              <span
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full text-white mb-4"
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
              >
                <Icon size={13} /> {program.category}
              </span>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                {program.title}
              </h1>

              {/* Quick stats */}
              <div className="flex flex-wrap gap-3 mt-6">
                {program.duration && (
                  <div className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 backdrop-blur-sm"
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <Clock size={16} className="text-white/70" />
                    <div>
                      <p className="text-white/50 text-xs leading-none mb-0.5">Duration</p>
                      <p className="text-white font-bold text-sm">{program.duration}</p>
                    </div>
                  </div>
                )}
                {program.semesters && (
                  <div className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 backdrop-blur-sm"
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <Layers size={16} className="text-white/70" />
                    <div>
                      <p className="text-white/50 text-xs leading-none mb-0.5">Semesters</p>
                      <p className="text-white font-bold text-sm">{program.semesters}</p>
                    </div>
                  </div>
                )}
                {program.level && (
                  <div className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 backdrop-blur-sm"
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <GraduationCap size={16} className="text-white/70" />
                    <div>
                      <p className="text-white/50 text-xs leading-none mb-0.5">Level</p>
                      <p className="text-white font-bold text-sm">{program.level}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Image / icon side */}
            <div className="w-full max-w-xs sm:max-w-sm mx-auto lg:mx-0 lg:w-80 xl:w-96 shrink-0">
              {thumb ? (
                <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ aspectRatio: '4/3' }}>
                  <img src={thumb} alt={program.title} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div
                  className="rounded-2xl flex items-center justify-center shadow-2xl"
                  style={{
                    aspectRatio: '4/3',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  <Icon size={80} className="text-white" style={{ opacity: 0.3 }} strokeWidth={1} />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Content ── */}
      <section className="py-16" style={{ background: '#F8FAFF' }}>
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

            {/* Main */}
            <div className="lg:col-span-2 space-y-6">
              {(program.description || program.shortDescription) && (
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">About This Program</h2>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-wrap text-sm">
                    {program.description || program.shortDescription}
                  </p>
                </div>
              )}

              {program.specialization?.length > 0 && (
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Specializations</h2>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {program.specialization.map((s, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-gray-700 text-sm">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {program.prerequisite && (
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Prerequisites</h2>
                  <p className="text-gray-600 text-sm leading-relaxed">{program.prerequisite}</p>
                </div>
              )}

              {program.degreeAwardDetails && (
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Degree Award Details</h2>
                  <p className="text-gray-600 text-sm leading-relaxed">{program.degreeAwardDetails}</p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              {/* Details card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-5 text-sm uppercase tracking-wide">
                  Program Details
                </h3>
                <dl className="divide-y divide-gray-50">
                  {[
                    { label: 'Category',   value: program.category },
                    { label: 'Duration',   value: program.duration },
                    { label: 'Semesters',  value: program.semesters ? `${program.semesters} Semesters` : null },
                    { label: 'Level',      value: program.level },
                    { label: 'Department', value: program.department?.name },
                  ].filter(d => d.value).map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center py-3 gap-3">
                      <dt className="text-xs text-gray-400 font-medium shrink-0">{label}</dt>
                      <dd className="text-sm font-semibold text-gray-800 text-right">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Apply CTA */}
              <div className="rounded-2xl overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #041476 0%, #0d1e9e 55%, #FA7902 100%)' }}>
                <div className="p-6 text-center">
                  <GraduationCap size={36} className="mx-auto text-white mb-3" strokeWidth={1.5} />
                  <h3 className="text-white font-bold text-lg mb-1">Ready to Apply?</h3>
                  <p className="text-white/60 text-xs mb-5 leading-relaxed">
                    Start your academic journey at University of Makran, Panjgur.
                  </p>
                  <Link
                    href="/admission"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white font-bold text-sm hover:shadow-lg hover:opacity-90 transition-all duration-300"
                    style={{ color: '#041476' }}
                  >
                    Apply for Admission
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex flex-col gap-1">
                <Link
                  href={categoryHref}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors font-medium py-2 px-3 rounded-xl hover:bg-gray-50"
                >
                  <ChevronLeft size={15} /> All {program.category} Programs
                </Link>
                <Link
                  href="/programs"
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors font-medium py-2 px-3 rounded-xl hover:bg-gray-50"
                >
                  <ChevronLeft size={15} /> All Programs
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
