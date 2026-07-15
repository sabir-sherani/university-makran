export default function Mission() {
  return (
    <section className="py-16 md:py-24 bg-white overflow-hidden">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* ── Text ─── */}
          <div>
            <span className="font-semibold uppercase tracking-widest text-sm" style={{ color: '#FA7902' }}>
              Our Purpose
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mt-2 mb-4 leading-tight" style={{ color: '#041476' }}>
              Our Mission
            </h2>
            <div className="w-14 h-1 rounded-full mb-7" style={{ background: '#FA7902' }} />

            <div className="space-y-4 text-gray-600 leading-relaxed text-base">
              <p>
                The University of Makran, Panjgur (UoMP) is committed to offering broad, balanced, and
                high-quality academic programs at undergraduate, graduate, and postgraduate levels —
                programs that are mutually reinforcing and built on a foundation of creative, rigorous
                instruction.
              </p>
              <p>
                We uphold the highest standards of excellence across all disciplines, ensuring every
                graduate leaves with the knowledge, skills, and ethical values needed to contribute
                meaningfully to society. Our dedicated faculty nurture independent thinking and
                intellectual growth, preparing students for both professional success and responsible
                citizenship.
              </p>
              <p>
                At UoMP, education is a force for social transformation. We are committed to making
                quality higher education accessible to the youth of the Makran region — a community of
                extraordinary resilience and immense, yet largely untapped, potential. Through programs in
                science, technology, humanities, and social work, we create lasting pathways of opportunity
                for those who have long deserved access to world-class learning.
              </p>
              <p>
                We also foster cultural understanding through engagement with languages, sciences, and
                modern information technology — equipping students to thrive in an interconnected,
                ever-evolving global society.
              </p>
            </div>
          </div>

          {/* ── Image ─── */}
          <div className="relative mt-8 lg:mt-0">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-[4/3]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80"
                alt="Students collaborating — University of Makran"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
            <div className="absolute -bottom-5 -right-5 w-28 h-28 rounded-3xl -z-10" style={{ background: 'rgba(4,20,118,0.1)' }} />
            <div className="absolute -top-5 -left-5 w-16 h-16 rounded-2xl -z-10" style={{ background: 'rgba(245,158,11,0.15)' }} />
          </div>

        </div>
      </div>
    </section>
  );
}
