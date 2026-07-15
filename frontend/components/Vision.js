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
            <span className="font-semibold uppercase tracking-widest text-sm" style={{ color: '#041476' }}>
              Our Future
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mt-2 mb-4 leading-tight" style={{ color: '#041476' }}>
              Our Vision
            </h2>
            <div className="w-14 h-1 rounded-full mb-7" style={{ background: '#041476' }} />

            <div className="space-y-4 text-gray-600 leading-relaxed text-base">
              <p>
                University of Makran, Panjgur was established in 2020 by an act of the provincial
                assembly with a clear vision of providing necessary human resources in the country.
                Since then, Makran University has been committed to promoting the cause of education
                and professionalism in one of the least developed regions of the country.
              </p>
              <p>
                We envision becoming a leading institution of higher learning in Balochistan —
                recognized for academic distinction and acknowledged for its contributions to
                developing skilled, professional graduates who serve the nation.
              </p>
              <p>
                Central to our vision is the development of Makran&apos;s human capital. UoMP is dedicated
                to building a generation of leaders, innovators, and professionals who will drive the
                progress of this region for decades to come — honoring the rich cultural heritage of
                Makran while embracing the opportunities of a modern, interconnected world.
              </p>
              <p>
                Our vision is to be not just a university — but a lasting force for education,
                professionalism, and meaningful progress in the lives of the people we serve.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
