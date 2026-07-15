import { useEffect, useRef, useState } from 'react';
import { GraduationCap, Users, Award, BookOpen } from 'lucide-react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

function AnimatedNumber({ end, suffix, animate }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!animate) return;
    const duration = 2200;
    const startTime = performance.now();
    const tick = (now) => {
      const p = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.floor(eased * end));
      if (p < 1) requestAnimationFrame(tick);
      else setCount(end);
    };
    requestAnimationFrame(tick);
  }, [end, animate]);

  return <>{count}{suffix}</>;
}

export default function Highlights() {
  const [inView, setInView] = useState(false);
  const [programCount, setProgramCount] = useState(0);
  const [deptCount, setDeptCount] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    axios.get(`${API}/programs`).then(r => setProgramCount(r.data?.length || 0)).catch(() => {});
    axios.get(`${API}/departments`).then(r => setDeptCount(r.data?.length || 0)).catch(() => {});
  }, []);

  const stats = [
    { icon: GraduationCap, end: programCount, suffix: '', label: 'Degree Programs',  desc: 'Undergraduate & postgraduate offerings' },
    { icon: Users,         end: 2000,          suffix: '+', label: 'Enrolled Students', desc: 'Future leaders from Balochistan' },
    { icon: Award,         end: 100,           suffix: '+', label: 'Qualified Faculty',  desc: 'Expert educators & researchers' },
    { icon: BookOpen,      end: deptCount,     suffix: '', label: 'Departments',        desc: 'Across diverse disciplines' },
  ];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold: 0.25 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden py-20"
      style={{ background: 'linear-gradient(135deg, #041476 0%, #0d1e9e 55%, #FA7902 100%)' }}
    >
      {/* Dot grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />
      {/* Decorative rings */}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10 border border-white pointer-events-none" />
      <div className="absolute -bottom-32 -right-16 w-80 h-80 rounded-full opacity-5 border border-white pointer-events-none" />

      <div className="container relative z-10">
        <div className="text-center mb-14">
          <span className="text-white/40 text-xs font-bold uppercase tracking-[0.2em]">University at a Glance</span>
          <h2 className="text-3xl lg:text-4xl font-bold text-white mt-2">Why Choose UoMP</h2>
          <div className="w-16 h-0.5 bg-white/25 mx-auto mt-4 rounded-full" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-2">
          {stats.map(({ icon: Icon, end, suffix, label, desc }, i) => (
            <div
              key={label}
              className="group flex flex-col items-center text-center px-6 py-8 rounded-2xl transition-all duration-300 hover:bg-white/10"
              style={i < 3 ? { borderRight: '1px solid rgba(255,255,255,0.08)' } : {}}
            >
              <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center mb-5 group-hover:bg-white/20 group-hover:scale-110 transition-all duration-300 backdrop-blur-sm">
                <Icon size={28} className="text-white" strokeWidth={1.5} />
              </div>
              <div className="text-5xl lg:text-6xl font-bold text-white mb-2 tabular-nums">
                <AnimatedNumber end={end} suffix={suffix} animate={inView} />
              </div>
              <div className="text-base font-semibold text-white/90 mb-1">{label}</div>
              <p className="text-sm text-white/45 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
