import Link from 'next/link';
import { Clock, Layers, ArrowRight, FlaskConical, Palette } from 'lucide-react';

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace('/api', '');

const CAT_META = {
  Science: { Icon: FlaskConical, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', badge: 'Science' },
  Arts:    { Icon: Palette,      color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', badge: 'Arts'    },
};

function imgSrc(image) {
  if (!image) return null;
  if (image.startsWith('http')) return image;
  return image?.startsWith("http") ? image : `${BASE_URL}${image}`;
}

export default function ProgramCard({ program }) {
  const meta  = CAT_META[program.category] || CAT_META.Science;
  const { Icon, color, bg } = meta;
  const thumb = imgSrc(program.image);

  return (
    <Link
      href={`/programs/${program._id}`}
      className="group relative bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col"
    >
      {/* Image / placeholder */}
      <div className="relative overflow-hidden" style={{ height: 200 }}>
        {thumb ? (
          <img
            src={thumb}
            alt={program.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${bg}, #fff)` }}>
            <Icon size={56} style={{ color, opacity: 0.25 }} strokeWidth={1} />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 60%)' }} />

        {/* Category badge */}
        <span
          className="absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ background: color, color: '#fff' }}
        >
          {meta.badge}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">

        {/* Meta row */}
        <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
          {program.duration && (
            <span className="flex items-center gap-1.5">
              <Clock size={12} /> {program.duration}
            </span>
          )}
          {program.semesters && (
            <span className="flex items-center gap-1.5">
              <Layers size={12} /> {program.semesters} Semesters
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-bold text-gray-900 text-base leading-snug mb-2 group-hover:text-primary transition-colors duration-200">
          {program.title}
        </h3>

        {/* Short description */}
        {program.shortDescription && (
          <p className="text-sm text-gray-500 leading-relaxed line-clamp-3 flex-1">
            {program.shortDescription}
          </p>
        )}

        {/* View Program button */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <span
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-bold text-sm text-white transition-all duration-300 group-hover:opacity-90 group-hover:shadow-lg"
            style={{ background: `linear-gradient(135deg, #041476, #0d1e9e)` }}
          >
            View Program
            <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>

      {/* Bottom accent bar */}
      <div className="h-0.5 w-0 group-hover:w-full transition-all duration-500 rounded-b-2xl"
        style={{ background: color }} />
    </Link>
  );
}
