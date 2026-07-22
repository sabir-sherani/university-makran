export default function Vision() {
  return (
    <section className="py-16 md:py-24 overflow-hidden" style={{ background: '#f8f9fb' }}>
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* ── Image (left on desktop) ─── */}
          <div className="relative mt-8 lg:mt-0 order-2 lg:order-1">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-[4/3]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80"
                alt="Graduates — University of Makran vision of excellence"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
            <div className="absolute -bottom-5 -left-5 w-28 h-28 rounded-3xl -z-10" style={{ background: 'rgba(4,20,118,0.08)' }} />
            <div className="absolute -top-5 -right-5 w-16 h-16 rounded-2xl -z-10" style={{ background: 'rgba(4,20,118,0.1)' }} />
          </div>

          {/* ── Text (right on desktop) ─── */}
          <div className="order-1 lg:order-2">
            <span className="font-semibold uppercase tracking-widest text-sm" style={{ color: '#FA7902' }}>
              Our Future
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mt-2 mb-4 leading-tight" style={{ color: '#041476' }}>
              Our Vision
            </h2>
            <div className="w-14 h-1 rounded-full mb-7" style={{ background: '#FA7902' }} />

            <div className="space-y-5 text-gray-600 leading-relaxed text-base">
              <p className="flex gap-3">
                <span className="mt-1 shrink-0 text-lg" style={{ color: '#041476' }}>✤</span>
                <span>Offering quality education and research, nurturing the human intellect, and providing a vibrant learning environment through innovation and academic excellence which make a positive impact on the society.</span>
              </p>
              <p className="flex gap-3">
                <span className="mt-1 shrink-0 text-lg" style={{ color: '#041476' }}>✤</span>
                <span>Becoming a leading institution for research and innovation in Balochistan, contributing meaningfully to the national knowledge economy and producing graduates who drive sustainable development.</span>
              </p>
              <p className="flex gap-3">
                <span className="mt-1 shrink-0 text-lg" style={{ color: '#041476' }}>✤</span>
                <span>Building a globally competitive academic environment rooted in regional values — one that empowers the youth of Makran to realise their full potential and serve as agents of positive change.</span>
              </p>
              <p className="flex gap-3">
                <span className="mt-1 shrink-0 text-lg" style={{ color: '#041476' }}>✤</span>
                <span>Establishing strong national and international partnerships that open doors for faculty, researchers, and students to collaborate, exchange knowledge, and contribute to the global academic community.</span>
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
