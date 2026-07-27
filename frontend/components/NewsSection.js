import Link from 'next/link';
import Image from 'next/image';

// ── sub-components ────────────────────────────────────────────────────────────

function SectionCard({ children, accent = '#041476' }) {
  return (
    <div
      className="bg-white rounded-2xl shadow-sm flex flex-col overflow-hidden h-full"
      style={{ borderTop: `3px solid ${accent}` }}
    >
      {children}
    </div>
  );
}

function CardHeader({ icon, title, accent = '#041476', action }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
      <div className="flex items-center gap-2.5">
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm shrink-0"
          style={{ background: accent }}
        >
          {icon}
        </span>
        <h3 className="font-bold text-sm tracking-wide uppercase" style={{ color: accent }}>
          {title}
        </h3>
      </div>
      {action}
    </div>
  );
}

// ── Mission ───────────────────────────────────────────────────────────────────

function MissionCard() {
  return (
    <SectionCard accent="#041476">
      <CardHeader icon="🎯" title="Our Mission" accent="#041476" />
      <div className="px-5 py-5 flex flex-col flex-1 gap-4">
        <p className="text-sm text-gray-600 leading-relaxed">
          To provide necessary human resources for the country by promoting education and
          professionalism in one of the least developed regions — empowering the youth of
          Makran with knowledge, skills, and values.
        </p>
        <div className="mt-auto space-y-2.5">
          {['Academic Excellence', 'Community Development', 'Research & Innovation'].map((item) => (
            <div key={item} className="flex items-center gap-2.5">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: '#041476' }}
              />
              <span className="text-xs text-gray-500 font-medium">{item}</span>
            </div>
          ))}
        </div>
        <div
          className="mt-3 rounded-xl p-4 text-xs text-white leading-relaxed font-medium"
          style={{ background: 'linear-gradient(135deg, #041476, #3a4fb5)' }}
        >
          &quot;Committed to promoting education and professionalism in one of the least developed regions of the country.&quot;
        </div>
      </div>
    </SectionCard>
  );
}

// ── Vision ────────────────────────────────────────────────────────────────────

function VisionCard() {
  return (
    <SectionCard accent="#041476">
      <CardHeader icon="👁" title="Our Vision" accent="#041476" />
      <div className="px-5 py-5 flex flex-col flex-1 gap-4">
        <p className="text-sm text-gray-600 leading-relaxed">
          Established in 2020 by an act of the provincial assembly, to become a leading
          institution that develops human capital and drives progress in one of the least
          developed regions of Pakistan.
        </p>
        <div className="mt-auto space-y-2.5">
          {['Regional Leadership', 'Inclusive Growth', 'Global Standards'].map((item) => (
            <div key={item} className="flex items-center gap-2.5">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: '#041476' }}
              />
              <span className="text-xs text-gray-500 font-medium">{item}</span>
            </div>
          ))}
        </div>
        <div
          className="mt-3 rounded-xl p-4 text-xs text-white leading-relaxed font-medium"
          style={{ background: 'linear-gradient(135deg, #041476, #FA7902)' }}
        >
          &quot;Providing necessary human resources for the country through quality education in Makran.&quot;
        </div>
      </div>
    </SectionCard>
  );
}

// ── Vice Chancellor ───────────────────────────────────────────────────────────

function VCCard() {
  return (
    <SectionCard accent="#041476">
      <CardHeader icon="🎓" title="Vice Chancellor" accent="#041476" />

      {/* Full-bleed photo area */}
      <div className="relative w-full" style={{ height: 220 }}>
        {/* Layered glow behind the image */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(160deg, #041476 0%, #020b5e 55%, #041476 100%)',
          }}
        />
        {/* Decorative corner dots */}
        <div className="absolute top-3 left-3 w-2 h-2 rounded-full opacity-40" style={{ background: '#fff' }} />
        <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full opacity-30" style={{ background: '#fff' }} />
        <div className="absolute bottom-8 left-4 w-1 h-1 rounded-full opacity-20" style={{ background: '#fff' }} />

        {/* Image — centred, fills the panel */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ bottom: -22, zIndex: 10 }}
        >
          {/* Outer glow ring */}
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              transform: 'scale(1.08)',
              background: 'linear-gradient(145deg, rgba(255,255,255,0.35), rgba(4,20,118,0.0))',
              filter: 'blur(10px)',
              borderRadius: '18px',
            }}
          />
          {/* Double-ring border frame */}
          <div
            style={{
              padding: 3,
              borderRadius: 18,
              background: 'linear-gradient(145deg, rgba(255,255,255,0.8), rgba(4,20,118,0.4))',
              boxShadow:
                '0 0 0 1px rgba(255,255,255,0.15), ' +
                '0 8px 20px rgba(4,20,118,0.5), ' +
                '0 20px 50px rgba(4,20,118,0.35), ' +
                '0 2px 8px rgba(0,0,0,0.25)',
            }}
          >
            <div
              className="relative overflow-hidden"
              style={{ width: 220, height: 190, borderRadius: 15 }}
            >
              <Image
                src="/vcsahib.jpg"
                alt="Vice Chancellor — University of Makran"
                fill
                className="object-cover"
                style={{ objectPosition: 'top center' }}
                sizes="190px"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              {/* Subtle inner vignette */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(to bottom, transparent 55%, rgba(4,20,118,0.25) 100%)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Text content — extra top padding to clear the protruding photo */}
      <div className="px-5 pt-8 pb-5 flex flex-col flex-1 items-center text-center gap-3">
        {/* Name & title */}
        <div>
          <h4 className="font-bold text-sm text-gray-900 leading-snug">
            Prof. Dr. Mir Sadaat Baloch
          </h4>
          <p className="text-xs font-semibold mt-0.5" style={{ color: '#041476' }}>
            Vice Chancellor
          </p>
          <p className="text-xs text-gray-400 mt-0.5">University of Makran, Panjgur</p>
        </div>

        {/* Divider */}
        <div
          className="w-12 h-0.5 rounded-full"
          style={{ background: 'linear-gradient(to right, #041476, #FA7902)' }}
        />

        {/* Message */}
        <p className="text-xs text-gray-500 leading-relaxed italic flex-1">
          &quot;At the University of Makran, we are committed to nurturing talent and
          fostering a culture of excellence — equipping every student with the
          knowledge and values to lead a purposeful life and contribute to the
          progress of our nation.&quot;
        </p>

        <Link
          href="/about"
          className="text-xs font-semibold hover:underline transition-colors mt-auto"
          style={{ color: '#041476' }}
        >
          Read Full Message →
        </Link>
      </div>
    </SectionCard>
  );
}

// ── Main section ──────────────────────────────────────────────────────────────

export default function NewsSection() {
  return (
    <section className="py-16" style={{ background: '#F4F6FB' }}>
      <div className="container">

        {/* Section heading */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#041476' }}>
              University at a Glance
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              Mission, Vision &amp; Leadership
            </h2>
            <div className="mt-2.5 flex gap-1.5">
              <span className="h-1 w-10 rounded-full" style={{ background: '#041476' }} />
              <span className="h-1 w-4 rounded-full" style={{ background: '#FA7902' }} />
              <span className="h-1 w-2 rounded-full bg-gray-300" />
            </div>
          </div>
        </div>

        {/* 3-column grid — stacks on mobile, 2-col on md, 3-col on lg */}
        <div className="info-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <MissionCard />
          <VisionCard />
          {/* VC card spans both columns on md so it's centered below Mission+Vision */}
          <div className="md:col-span-2 lg:col-span-1 flex flex-col">
            <VCCard />
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media (min-width: 1024px) {
          .info-grid { grid-auto-rows: 520px; }
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .info-grid { grid-auto-rows: 500px; }
        }
      `}</style>
    </section>
  );
}
