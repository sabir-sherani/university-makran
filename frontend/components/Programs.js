import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import {
  Monitor, Leaf, BookOpen, FlaskConical,
  GraduationCap, BookMarked, Globe, Heart,
  Palette, ArrowRight,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL;

const SCIENCE_SLOTS = [
  { Icon: Monitor,       accent: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  { Icon: Leaf,          accent: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
  { Icon: FlaskConical,  accent: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  { Icon: BookMarked,    accent: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC' },
];

const ARTS_SLOTS = [
  { Icon: BookOpen,      accent: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  { Icon: GraduationCap, accent: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  { Icon: Palette,       accent: '#E11D48', bg: '#FFF1F2', border: '#FECDD3' },
  { Icon: Globe,         accent: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' },
  { Icon: Heart,         accent: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
];

export default function Programs() {
  const [cards, setCards] = useState([]);

  useEffect(() => {
    axios.get(`${API}/programs`)
      .then(res => {
        let sci = 0, art = 0;
        const enriched = (res.data || []).slice(0, 8).map(prog => {
          const slot = prog.category === 'Science'
            ? SCIENCE_SLOTS[sci++ % SCIENCE_SLOTS.length]
            : ARTS_SLOTS[art++ % ARTS_SLOTS.length];
          return { ...slot, prog };
        });
        setCards(enriched);
      })
      .catch(() => {});
  }, []);

  if (cards.length === 0) return null;

  return (
    <section className="relative py-24 overflow-hidden bg-white">
      {/* Faint background text */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-black uppercase select-none pointer-events-none leading-none"
        style={{ fontSize: 'clamp(80px, 18vw, 200px)', color: 'rgba(4,20,118,0.03)', letterSpacing: '-0.02em' }}
      >
        PROGRAMS
      </div>

      <div className="container relative z-10">

        {/* Section header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="h-0.5 w-10 rounded-full" style={{ background: '#041476' }} />
            <span className="text-sm font-bold uppercase tracking-widest" style={{ color: '#041476' }}>
              Academic Offerings
            </span>
            <div className="h-0.5 w-10 rounded-full" style={{ background: '#041476' }} />
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mt-2 mb-4">
            Undergraduate Degree <span style={{ color: '#041476' }}>Programs</span>
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Explore our diverse range of four-year degree programs designed to shape
            the future leaders of Balochistan and beyond.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {cards.map(({ Icon, accent, bg, border, prog }) => (
            <Link
              key={prog._id}
              href={`/programs/${prog._id}`}
              className="group relative rounded-2xl p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl overflow-hidden block"
              style={{ background: bg, border: `1.5px solid ${border}` }}
            >
              {/* Hover fill */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: accent }}
              />

              {/* Decorative circle */}
              <div
                className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full opacity-20 transition-transform duration-500 group-hover:scale-150"
                style={{ background: '#fff' }}
              />

              <div className="relative z-10">
                {/* Icon */}
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 shadow-sm transition-all duration-300 group-hover:bg-white/20"
                  style={{ background: '#fff' }}
                >
                  <Icon
                    size={26}
                    style={{ color: accent }}
                    className="group-hover:text-white transition-colors duration-300"
                    strokeWidth={1.5}
                  />
                </div>

                {/* Program name */}
                <h3
                  className="font-bold text-sm leading-snug mb-4 transition-colors duration-300 group-hover:text-white"
                  style={{ color: '#1a1a1a' }}
                >
                  {prog.title}
                </h3>

                {/* Footer row */}
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-bold px-3 py-1 rounded-full transition-colors duration-300 group-hover:bg-white/20 group-hover:text-white"
                    style={{ background: `${accent}18`, color: accent }}
                  >
                    {prog.duration || '4 Years'}
                  </span>
                  <ArrowRight
                    size={16}
                    className="opacity-0 group-hover:opacity-100 group-hover:text-white -translate-x-2 group-hover:translate-x-0 transition-all duration-300"
                    style={{ color: accent }}
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-14">
          <Link
            href="/programs"
            className="inline-flex items-center gap-2.5 text-white font-bold px-10 py-4 rounded-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #041476, #1a3db5)' }}
          >
            View All Programs
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
