import Link from 'next/link';
import { ArrowRight, FileText, ClipboardCheck, CalendarCheck } from 'lucide-react';

const steps = [
  { icon: FileText,       step: '01', title: 'Fill Online Form',    desc: 'Complete the admission application' },
  { icon: ClipboardCheck, step: '02', title: 'Submit Documents',    desc: 'Upload required certificates & docs' },
  { icon: CalendarCheck,  step: '03', title: 'Appear for Test',     desc: 'Sit for the entrance assessment' },
];

export default function AdmissionBanner() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #041476 0%, #0d1e9e 50%, #FA7902 100%)' }}
    >
      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      {/* Glow blobs */}
      <div
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(4,20,118,0.3) 0%, transparent 70%)' }}
      />

      <div className="container relative z-10 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Left: CTA text */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2.5 rounded-full px-4 py-2 mb-6 border"
              style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)' }}>
              <span className="w-2 h-2 rounded-full bg-blue-300 shrink-0" />
              <span className="text-white text-sm font-semibold">BS (Hons) Programs</span>
            </div>

            <h2 className="text-3xl lg:text-5xl font-bold text-white mb-5 leading-tight">
              Begin Your Academic<br />
              <span style={{ color: '#c7d2fe' }}>Journey at UoMP</span>
            </h2>

            <p className="text-lg leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.65)' }}>
              University of Makran offers a wide range of BS (Hons) programs. Learn about
              our admission process, eligibility criteria, and available disciplines across
              multiple departments.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/admission"
                className="inline-flex items-center justify-center gap-2 bg-white font-bold px-8 py-4 rounded-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-0.5"
                style={{ color: '#041476' }}
              >
                Admission Info <ArrowRight size={18} />
              </Link>
              <Link
                href="/programs"
                className="inline-flex items-center justify-center gap-2 font-bold px-8 py-4 rounded-xl transition-all duration-300 hover:-translate-y-0.5 border"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  borderColor: 'rgba(255,255,255,0.25)',
                  color: '#fff',
                  backdropFilter: 'blur(8px)',
                }}
              >
                Explore Programs
              </Link>
            </div>
          </div>

          {/* Right: Steps */}
          <div className="flex flex-col gap-4">
            {steps.map(({ icon: Icon, step, title, desc }) => (
              <div
                key={title}
                className="flex items-center gap-5 rounded-2xl px-6 py-5 transition-all duration-300 hover:bg-white/10"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {/* Step number + icon */}
                <div className="relative shrink-0">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.12)' }}
                  >
                    <Icon size={24} className="text-white" strokeWidth={1.5} />
                  </div>
                  <span
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                    style={{ background: '#041476', color: '#fff' }}
                  >
                    {step}
                  </span>
                </div>

                <div>
                  <div className="font-bold text-white text-sm">{title}</div>
                  <div className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
