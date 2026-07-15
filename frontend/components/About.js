import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle, MapPin, Calendar } from 'lucide-react';

const highlights = [
  'Established in 2020 by an act of the provincial assembly',
  'Offering BS (Hons) programs across multiple disciplines',
  'Committed to education and professionalism in the region',
  'Providing necessary human resources for the country',
];

export default function About() {
  return (
    <section className="relative py-24 overflow-hidden" style={{ background: '#F4F7FF' }}>
      {/* Subtle decorative background shapes */}
      <div
        className="absolute top-0 right-0 w-1/2 h-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 80% 50%, rgba(4,20,118,0.04) 0%, transparent 65%)',
        }}
      />
      <div
        className="absolute -bottom-10 -left-10 w-72 h-72 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(4,20,118,0.05) 0%, transparent 70%)' }}
      />

      <div className="container relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* ── Left: Text ── */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-0.5 rounded-full" style={{ background: '#041476' }} />
              <span className="text-sm font-bold uppercase tracking-widest" style={{ color: '#041476' }}>
                Who We Are
              </span>
            </div>

            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mt-2 mb-6 leading-tight">
              About University <br />
              <span style={{ color: '#041476' }}>of Makran</span>
            </h2>

            <div className="flex gap-1.5 mb-8">
              <span className="h-1.5 w-12 rounded-full" style={{ background: '#041476' }} />
              <span className="h-1.5 w-6 rounded-full" style={{ background: '#FA7902' }} />
              <span className="h-1.5 w-3 rounded-full bg-gray-300" />
            </div>

            <p className="text-gray-600 text-base leading-relaxed mb-10">
              Established in 2020 by an act of the provincial assembly, University of Makran, Panjgur
              is committed to promoting education and professionalism in one of the least developed
              regions of Pakistan — nurturing the next generation of leaders and scholars.
            </p>

            <ul className="space-y-3 mb-10">
              {highlights.map((item) => (
                <li key={item} className="flex items-start gap-3 text-gray-700">
                  <CheckCircle size={20} className="mt-0.5 shrink-0" style={{ color: '#041476' }} strokeWidth={2} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/about"
              className="inline-flex items-center gap-2 text-white font-bold px-8 py-4 rounded-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #041476, #0a1fa8)' }}
            >
              Learn More About Us
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          {/* ── Right: Image ── */}
          <div className="relative">
            {/* Background color block */}
            <div
              className="absolute -inset-4 rounded-3xl opacity-20 pointer-events-none"
              style={{ background: 'linear-gradient(135deg, #041476, #FA7902)' }}
            />

            {/* Main image */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <Image
                src="/7.jpg"
                alt="University of Makran, Panjgur Campus"
                width={700}
                height={520}
                className="w-full h-auto object-cover"
              />
              {/* Gradient overlay */}
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgba(4,20,118,0.4) 0%, transparent 50%)' }}
              />
              {/* Bottom label inside image */}
              <div className="absolute bottom-0 left-0 right-0 px-6 pb-5">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-white/70 shrink-0" />
                  <span className="text-white/80 text-sm font-medium">Noori Naseer Khan Chowk, Panjgur, Balochistan</span>
                </div>
              </div>
            </div>

            {/* Floating badge — Est. year */}
            <div
              className="absolute -bottom-6 -left-6 rounded-2xl shadow-2xl px-5 py-4 border border-gray-100"
              style={{ background: '#fff' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, #041476, #0a1fa8)' }}
                >
                  <Calendar size={18} className="text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold" style={{ color: '#041476' }}>Est. 2020</div>
                  <div className="text-xs text-gray-400 font-medium">Panjgur, Balochistan</div>
                </div>
              </div>
            </div>

            {/* Decorative corner accents */}
            <div
              className="absolute -top-4 -right-4 w-20 h-20 rounded-2xl -z-10"
              style={{ background: 'rgba(4,20,118,0.15)', border: '2px solid rgba(4,20,118,0.2)' }}
            />
            <div
              className="absolute -bottom-10 right-4 w-32 h-32 rounded-full -z-10"
              style={{ background: 'rgba(4,20,118,0.08)' }}
            />
          </div>

        </div>
      </div>
    </section>
  );
}
