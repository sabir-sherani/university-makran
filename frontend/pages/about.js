import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Mission from '../components/Mission';
import Vision from '../components/Vision';
import GovernorMessage from '../components/GovernorMessage';
import VCMessage from '../components/VCMessage';
import { Images } from 'lucide-react';

export default function About() {
  return (
    <>
      <Head>
        <title>About Us — University of Makran, Panjgur (UoMP)</title>
        <meta
          name="description"
          content="Learn about the University of Makran, Panjgur — our mission, vision, leadership, and commitment to quality higher education in Balochistan."
        />
      </Head>

      <Header />

      {/* ── PAGE HERO ──────────────────────────────────── */}
      <section
        className="relative flex items-center justify-center text-white"
        style={{
          background: 'linear-gradient(135deg, #041476 0%, #041476 100%)',
          minHeight: '38vh',
        }}
      >
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 50%, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }}
        />
        <div className="relative text-center px-6">
          <span className="text-amber-400 font-semibold uppercase tracking-widest text-sm block mb-3">
            University of Makran, Panjgur
          </span>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">About Us</h1>
          <p className="text-white/70 text-lg max-w-xl mx-auto">
            Our journey, values, leadership, and unwavering commitment to excellence in education.
          </p>
        </div>
      </section>

      {/* ── QUICK STATS BAR ────────────────────────────── */}
      <div style={{ background: '#0B1120' }} className="py-6">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: '2020', label: 'Year Established' },
              { value: '10+', label: 'Degree Programs' },
              { value: '2,000+', label: 'Students Enrolled' },
              { value: '100+', label: 'Qualified Faculty' },
            ].map(({ value, label }) => (
              <div key={label}>
                <div className="text-2xl md:text-3xl font-bold text-white">{value}</div>
                <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTIONS ───────────────────────────────────── */}
      <Mission />
      <Vision />
      <GovernorMessage />
      <VCMessage />

      {/* ── GALLERY CTA ────────────────────────────────── */}
      <section className="py-16" style={{ background: '#f8f9fb' }}>
        <div className="container text-center">
          <span className="text-accent font-semibold uppercase tracking-widest text-sm block mb-3">
            Visual Journey
          </span>
          <h2 className="text-3xl font-bold mb-4" style={{ color: '#041476' }}>
            UoMP in Pictures
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto mb-8 text-base">
            Explore campus life, events, achievements, and milestones through our curated photo gallery.
          </p>
          <Link
            href="/gallery"
            className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-lg text-white transition-all duration-300 hover:-translate-y-0.5 hover:opacity-90 hover:shadow-lg"
            style={{ background: '#041476' }}
          >
            <Images size={18} />
            View Gallery
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
