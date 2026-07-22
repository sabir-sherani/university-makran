const goals = [
  'Provide accessible and affordable opportunities for quality education, scientific learning, and skills development necessary for career advancement and nation building.',
  'Foster a research-oriented environment, encouraging innovative and impactful research which contributes to the knowledge economy.',
  'Provide platforms and resources for capacity building which promote professional and potential growth of the stakeholders.',
  'Serve as liaison between the academia and the industry nationally and internationally for socio-economic development.',
  'Promote practices which contribute to accomplishing sustainable development goals.',
  'Support the community through partnerships, outreach programs, and voluntary initiatives.',
];

const values = [
  {
    icon: '⭐',
    title: 'Excellence',
    desc: 'We strive for excellence in education, research, community engagement, and services.',
  },
  {
    icon: '🛡️',
    title: 'Integrity',
    desc: 'We uphold the highest ethical standards to promote honesty, fairness, and transparency.',
  },
  {
    icon: '🤝',
    title: 'Dignity',
    desc: 'We adhere to an academic and professional environment where each individual gets due respect and fosters collective efforts to extend this to society at large.',
  },
  {
    icon: '💡',
    title: 'Innovation',
    desc: 'We encourage creativity and innovation in teaching, research, and other academic activities.',
  },
  {
    icon: '🌐',
    title: 'Collaboration',
    desc: 'We are committed to join hands with the relevant stakeholders for research and development.',
  },
];

export default function GoalsValues() {
  return (
    <>
      {/* ── GOALS ──────────────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-white overflow-hidden">
        <div className="container">

          {/* Header */}
          <div className="text-center mb-12 md:mb-16">
            <span className="font-semibold uppercase tracking-widest text-sm" style={{ color: '#FA7902' }}>
              What We Aim For
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2" style={{ color: '#041476' }}>
              Our Goals
            </h2>
            <div className="flex items-center justify-center gap-2 mt-4">
              <span className="h-1 w-10 rounded-full" style={{ background: '#041476' }} />
              <span className="h-1 w-4 rounded-full" style={{ background: '#FA7902' }} />
              <span className="h-1 w-2 rounded-full bg-gray-300" />
            </div>
          </div>

          {/* Goals grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6">
            {goals.map((goal, i) => (
              <div
                key={i}
                className="group relative flex gap-4 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: '#f8f9fb',
                  border: '1px solid rgba(4,20,118,0.07)',
                  boxShadow: '0 2px 8px rgba(4,20,118,0.04)',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 24px rgba(4,20,118,0.12)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(4,20,118,0.04)'}
              >
                {/* Number badge */}
                <div
                  className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white"
                  style={{ background: 'linear-gradient(135deg, #041476, #2a3fa0)' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </div>

                {/* Text */}
                <p className="text-gray-600 leading-relaxed text-sm pt-1.5">{goal}</p>

                {/* Bottom accent line on hover */}
                <div
                  className="absolute bottom-0 left-6 right-6 h-0.5 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"
                  style={{ background: '#FA7902' }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CORE VALUES ────────────────────────────────────── */}
      <section className="py-16 md:py-24 overflow-hidden" style={{ background: '#041476' }}>
        <div className="container">

          {/* Header */}
          <div className="text-center mb-12 md:mb-16">
            <span className="font-semibold uppercase tracking-widest text-sm" style={{ color: '#FA7902' }}>
              What We Stand For
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2 text-white">
              Core Values
            </h2>
            <div className="flex items-center justify-center gap-2 mt-4">
              <span className="h-1 w-10 rounded-full bg-white opacity-30" />
              <span className="h-1 w-4 rounded-full" style={{ background: '#FA7902' }} />
              <span className="h-1 w-2 rounded-full bg-white opacity-20" />
            </div>
          </div>

          {/* Values grid — 5 cards: 3+2 on xl, 2+3 on md, 1 on sm */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {values.map((v, i) => (
              <div
                key={i}
                className="group flex flex-col items-center text-center rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1.5 cursor-default"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(8px)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.11)';
                  e.currentTarget.style.borderColor = 'rgba(250,121,2,0.5)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                }}
              >
                {/* Icon */}
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4 transition-transform duration-300 group-hover:scale-110"
                  style={{ background: 'rgba(250,121,2,0.15)', border: '1px solid rgba(250,121,2,0.3)' }}
                >
                  {v.icon}
                </div>

                {/* Title */}
                <h3 className="font-bold text-white text-base mb-2">{v.title}</h3>

                {/* Divider */}
                <div className="w-8 h-0.5 rounded-full mb-3" style={{ background: '#FA7902', opacity: 0.7 }} />

                {/* Description */}
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
