import Image from 'next/image';

const message = [
  `In the name of Allah, the Most Gracious, the Most Merciful.`,

  `It gives me immense pride to address the students, faculty, and staff of the University of Makran, Panjgur. As Governor of Balochistan, I firmly believe that education is the most powerful foundation upon which lasting prosperity and social transformation are built.`,

  `The establishment of UoMP in Panjgur is a landmark step in fulfilling our collective responsibility to the people of this historically underserved region. The Makran region possesses a rich cultural heritage and a resilient, talented people — and quality higher education is the key to unlocking the immense potential that has long awaited its opportunity to flourish.`,

  `To our students: your enrollment here is not merely a personal achievement — it is an act of hope for your families and your province. Study with dedication, embrace knowledge, and carry the values of integrity and compassion throughout your lives.`,

  `Together, through education, we will build a Balochistan that is strong, proud, and prosperous. May Allah guide us all to serve this institution with sincerity and dedication.`,
];

export default function GovernorMessage() {
  return (
    <section className="py-16 md:py-24 overflow-hidden" style={{ background: '#041476' }}>
      <div className="container">

        {/* Section label */}
        <div className="text-center mb-12">
          <span className="text-amber-400 font-semibold uppercase tracking-widest text-sm">Leadership</span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mt-2">Governor&apos;s Message</h2>
          <div className="w-20 h-1 bg-amber-400 mx-auto mt-4 rounded-full" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12 items-start">

          {/* ── Photo card ─── */}
          <div className="flex flex-col items-center text-center">

            {/* Decorative ring + photo */}
            <div className="relative mb-6">
              {/* Amber glow ring behind photo */}
              <div
                className="absolute inset-0 rounded-2xl -m-2"
                style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.5) 0%, rgba(245,158,11,0.05) 100%)' }}
              />
              {/* Corner accent */}
              <div
                className="absolute -top-3 -right-3 w-8 h-8 rounded-lg"
                style={{ background: '#FA7902', opacity: 0.7 }}
              />
              <div
                className="absolute -bottom-3 -left-3 w-5 h-5 rounded-full"
                style={{ background: 'rgba(245,158,11,0.4)' }}
              />

              <div
                className="relative rounded-2xl overflow-hidden"
                style={{
                  width: 260,
                  height: 320,
                  boxShadow: '0 0 0 3px #FA7902, 0 24px 48px rgba(0,0,0,0.5)',
                }}
              >
                <Image
                  src="/governer.webp"
                  alt="Sheikh Jaffar Khan Mandokhail — Governor of Balochistan"
                  fill
                  className="object-cover object-top"
                  sizes="260px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>
            </div>

            <h3 className="text-lg font-bold text-white mb-1">Sheikh Jaffar Khan Mandokhail</h3>
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest">Governor, Balochistan</p>
            <div className="w-10 h-0.5 bg-amber-400/40 mx-auto mt-4 rounded-full" />
          </div>

          {/* ── Message ─── */}
          <div className="lg:col-span-2">
            <div className="text-7xl leading-none font-serif mb-1 select-none" style={{ color: 'rgba(245,158,11,0.3)' }}>
              &ldquo;
            </div>
            <div className="space-y-4 text-white/85 leading-relaxed text-base">
              {message.map((para, i) =>
                i === 0 ? (
                  <p key={i} className="text-amber-300 font-semibold italic text-sm tracking-wide">{para}</p>
                ) : (
                  <p key={i}>{para}</p>
                )
              )}
            </div>
            <div className="text-7xl leading-none font-serif text-right mt-1 select-none" style={{ color: 'rgba(245,158,11,0.3)' }}>
              &rdquo;
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
