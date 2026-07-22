import Image from 'next/image';

const message = [
  `I am delighted to welcome you to the University of Mekran, Punjgur. It is the newest public sector university in province of Balochistan offering studies in the fields of Business Management, Computer Science and other allied sciences and humanities.`,

  `We, at the University of Mekran, are proud of our newly established teaching and research endeavours upon which we wish to build our national and international reputation. We are extremely proud of our unique programmes. We hope that they will enable the masses of the area to realise your educational dreams with a special and highly memorable sense. We believe that your period at our university will be remarkable.`,

  `We encourage you to strike a healthy balance between your academic activities and your personal life as this is very important for all of us. Our goal as a University is to educate you as a whole person and as an individual while acknowledging that some essential lessons you will learn, will take place inside and outside the lecture rooms, the computer laboratory, and the library.`,

  `I assure that the UoMP also teaches by means of all learning. We wish to expand your knowledge within a safe and exciting educational environment at all times.`,

  `Dear Students; Your future starts here. Enjoy this new and exciting chapter of your life, get involved with your studies, the wider student experiences of new learnings, co and extra-curricular activities and in the wider community so that you not only develop your subject knowledge but also prepare yourself for wherever your career takes you. Be open to new experiences and learning and in a world where nothing stays the same, be prepared to change, evolve, succeed, and have confidence in your ability to make a difference.`,
];

export default function VCMessage() {
  return (
    <section className="py-16 md:py-24 bg-white overflow-hidden">
      <div className="container">

        {/* Section label */}
        <div className="text-center mb-12">
          <span className="font-semibold uppercase tracking-widest text-sm" style={{ color: '#041476' }}>
            Academic Leadership
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mt-2" style={{ color: '#041476' }}>
            Vice Chancellor&apos;s Message
          </h2>
          <div className="w-20 h-1 mx-auto mt-4 rounded-full" style={{ background: '#041476' }} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12 items-start">

          {/* ── Message (spans 2 cols) ─── */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <div className="text-7xl leading-none font-serif mb-1 select-none" style={{ color: 'rgba(4,20,118,0.1)' }}>
              &ldquo;
            </div>
            <div className="space-y-4 text-gray-600 leading-relaxed text-base">
              {message.map((para, i) =>
                i === message.length - 1 ? (
                  <p key={i} className="font-semibold italic" style={{ color: '#041476' }}>{para}</p>
                ) : (
                  <p key={i}>{para}</p>
                )
              )}
            </div>
            <div className="text-7xl leading-none font-serif text-right mt-1 select-none" style={{ color: 'rgba(4,20,118,0.1)' }}>
              &rdquo;
            </div>
          </div>

          {/* ── Photo card ─── */}
          <div className="flex flex-col items-center text-center order-1 lg:order-2">

            <div className="relative mb-6">
              {/* Navy glow ring behind photo */}
              <div
                className="absolute inset-0 rounded-2xl -m-2"
                style={{ background: 'linear-gradient(135deg, rgba(4,20,118,0.3) 0%, rgba(4,20,118,0.03) 100%)' }}
              />
              {/* Corner accents */}
              <div
                className="absolute -top-3 -left-3 w-8 h-8 rounded-lg"
                style={{ background: '#041476', opacity: 0.5 }}
              />
              <div
                className="absolute -bottom-3 -right-3 w-5 h-5 rounded-full"
                style={{ background: 'rgba(4,20,118,0.35)' }}
              />

              <div
                className="relative rounded-2xl overflow-hidden"
                style={{
                  width: 260,
                  height: 320,
                  boxShadow: '0 0 0 3px #041476, 0 24px 48px rgba(4,20,118,0.2)',
                }}
              >
                <Image
                  src="/sadaat.jpeg"
                  alt="Dr. Mir Sadaat Baloch — Vice Chancellor, University of Makran"
                  fill
                  className="object-cover object-top"
                  sizes="260px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>
            </div>

            <h3 className="text-lg font-bold mb-1" style={{ color: '#041476' }}>Dr. Mir Sadaat Baloch</h3>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#041476' }}>Vice Chancellor</p>
            <p className="text-xs text-gray-400 mt-1">University of Makran, Panjgur</p>
            <div className="w-10 h-0.5 mx-auto mt-4 rounded-full" style={{ background: '#041476', opacity: 0.25 }} />
          </div>

        </div>
      </div>
    </section>
  );
}
