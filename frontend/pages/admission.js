import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Header from '../components/Header.js';
import Footer from '../components/Footer.js';
import axios from 'axios';

/* ── Inline SVG components ─────────────────────────────────────────── */

const MegaphoneSVG = () => (
  <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="48" cy="48" r="48" fill="#FA7902" fillOpacity="0.12" />
    <path d="M68 30C68 30 56 38 40 40L36 40C32.686 40 30 42.686 30 46V50C30 53.314 32.686 56 36 56H38L42 70H50L48 56C57.6 55.2 68 62 68 62V30Z" fill="#FA7902" />
    <path d="M30 46C30 42.686 32.686 40 36 40H40V56H36C32.686 56 30 53.314 30 50V46Z" fill="#041476" fillOpacity="0.25" />
    <circle cx="68" cy="46" r="4" fill="#FA7902" fillOpacity="0.5" />
    <path d="M72 34C75 36 77 40 77 46C77 52 75 56 72 58" stroke="#FA7902" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M75 29C80 33 83 39 83 46C83 53 80 59 75 63" stroke="#FA7902" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5" />
  </svg>
);

const GraduationSVG = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 6L2 13L16 20L30 13L16 6Z" fill="#041476" fillOpacity="0.15" stroke="#041476" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M8 17V23C8 23 11 26 16 26C21 26 24 23 24 23V17" stroke="#041476" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M30 13V19" stroke="#041476" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="30" cy="20" r="1.5" fill="#041476" />
  </svg>
);

const DocumentSVG = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="4" width="26" height="34" rx="3" fill="#041476" fillOpacity="0.08" stroke="#041476" strokeWidth="1.5" />
    <path d="M34 10H38C39.105 10 40 10.895 40 12V42C40 43.105 39.105 44 38 44H14C12.895 44 12 43.105 12 42V38" stroke="#041476" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M16 16H26M16 22H26M16 28H22" stroke="#041476" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M28 4L34 10H28V4Z" fill="#041476" fillOpacity="0.2" stroke="#041476" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

const CalendarSVG = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="5" width="24" height="21" rx="3" stroke="#041476" strokeWidth="1.5" />
    <path d="M2 11H26" stroke="#041476" strokeWidth="1.5" />
    <path d="M8 2V7M20 2V7" stroke="#041476" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="9" cy="17" r="1.5" fill="#041476" />
    <circle cx="14" cy="17" r="1.5" fill="#041476" />
    <circle cx="19" cy="17" r="1.5" fill="#041476" />
    <circle cx="9" cy="22" r="1.5" fill="#041476" />
    <circle cx="14" cy="22" r="1.5" fill="#041476" />
  </svg>
);

const SeatsSVG = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="8" r="4" stroke="#041476" strokeWidth="1.5" />
    <circle cx="20" cy="8" r="4" stroke="#041476" strokeWidth="1.5" />
    <path d="M2 24C2 19.582 5.582 16 10 16" stroke="#041476" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M26 24C26 19.582 22.418 16 18 16" stroke="#041476" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M10 24C10 19.582 11.79 16 14 16C16.21 16 18 19.582 18 24" stroke="#041476" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const FeeSVG = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="6" width="24" height="17" rx="3" stroke="#041476" strokeWidth="1.5" />
    <circle cx="14" cy="14.5" r="4" stroke="#041476" strokeWidth="1.5" />
    <path d="M2 11H5M26 11H23M2 18H5M26 18H23" stroke="#041476" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M14 13V16M13 14H15" stroke="#041476" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const CheckSVG = () => (
  <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="2.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l3.5 3.5L13 5" />
  </svg>
);

const InfoSVG = () => (
  <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4M12 8h.01" />
  </svg>
);

const WarnSVG = () => (
  <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
  </svg>
);

const SuccessSVG = () => (
  <svg className="w-12 h-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

/* ── Data ───────────────────────────────────────────────────────────── */

const howToApplySteps = [
  {
    title: 'Major',
    desc: 'You will be studying a particular field for several years. Therefore, you should make sure to choose a field that interests and excites you.',
    cta: false,
    icon: (
      <svg width="88" height="88" viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Background */}
        <rect width="88" height="88" rx="22" fill="#EEF2FF" />
        {/* Left page */}
        <path d="M16 65V31a3 3 0 013-3h18a3 3 0 013 3v34" fill="#BFDBFE" stroke="#041476" strokeWidth="2.5" strokeLinejoin="round" />
        {/* Right page */}
        <path d="M40 65V31a3 3 0 013-3h18a3 3 0 013 3v34" fill="#DBEAFE" stroke="#041476" strokeWidth="2.5" strokeLinejoin="round" />
        {/* Book base */}
        <path d="M14 65h60" stroke="#041476" strokeWidth="2.5" strokeLinecap="round" />
        {/* Spine line */}
        <line x1="40" y1="65" x2="40" y2="25" stroke="#041476" strokeWidth="2" strokeLinecap="round" />
        {/* Left page lines */}
        <line x1="23" y1="38" x2="35" y2="38" stroke="#041476" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="23" y1="45" x2="35" y2="45" stroke="#041476" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="23" y1="52" x2="31" y2="52" stroke="#041476" strokeWidth="1.8" strokeLinecap="round" />
        {/* Right page lines */}
        <line x1="47" y1="38" x2="59" y2="38" stroke="#041476" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="47" y1="45" x2="59" y2="45" stroke="#041476" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="47" y1="52" x2="55" y2="52" stroke="#041476" strokeWidth="1.8" strokeLinecap="round" />
        {/* Graduation cap */}
        <path d="M44 12L27 20l17 8 17-8-17-8Z" fill="#FA7902" stroke="#FA7902" strokeWidth="1" strokeLinejoin="round" />
        <path d="M61 20v10" stroke="#FA7902" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="61" cy="32" r="3" fill="#FA7902" />
        {/* Cap string */}
        <path d="M36 24v8c0 2 4 5 8 5s8-3 8-5v-8" stroke="#FA7902" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    ),
  },
  {
    title: 'Apply',
    desc: 'Fill up the admission form online and submit its hardcopy in admission office along with the required documents and bank receipt of admission processing fee.',
    cta: true,
    icon: (
      <svg width="88" height="88" viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Background */}
        <rect width="88" height="88" rx="22" fill="#EEF2FF" />
        {/* Document body */}
        <rect x="15" y="16" width="42" height="56" rx="5" fill="#BFDBFE" stroke="#041476" strokeWidth="2.5" />
        {/* Folded top-right corner */}
        <path d="M46 16v14h11" stroke="#041476" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M46 16L57 30H46V16Z" fill="#041476" fillOpacity="0.12" />
        {/* Name field */}
        <rect x="23" y="40" width="28" height="6" rx="2" fill="white" stroke="#041476" strokeWidth="1.5" />
        {/* Lines */}
        <line x1="23" y1="55" x2="51" y2="55" stroke="#041476" strokeWidth="2" strokeLinecap="round" />
        <line x1="23" y1="63" x2="40" y2="63" stroke="#041476" strokeWidth="2" strokeLinecap="round" />
        {/* Orange send badge */}
        <circle cx="67" cy="26" r="14" fill="#FA7902" />
        <path d="M67 33V19" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M62 24l5-5 5 5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Badge shine */}
        <circle cx="62" cy="20" r="2" fill="white" fillOpacity="0.3" />
      </svg>
    ),
  },
  {
    title: 'Test',
    desc: 'Eligible candidates will be invited to appear in the admissions test conducted by the University of Makran, Panjgur.',
    cta: false,
    icon: (
      <svg width="88" height="88" viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Background */}
        <rect width="88" height="88" rx="22" fill="#EEF2FF" />
        {/* Clipboard board */}
        <rect x="16" y="22" width="46" height="54" rx="5" fill="#BFDBFE" stroke="#041476" strokeWidth="2.5" />
        {/* Clipboard top clip */}
        <rect x="30" y="14" width="18" height="14" rx="4" fill="white" stroke="#041476" strokeWidth="2.5" />
        <circle cx="39" cy="14" r="3" fill="#BFDBFE" stroke="#041476" strokeWidth="2" />
        {/* Row 1 — checked */}
        <rect x="24" y="39" width="10" height="10" rx="2.5" fill="#041476" />
        <path d="M26.5 44l2.5 2.5 4-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="40" y1="44" x2="56" y2="44" stroke="#041476" strokeWidth="2" strokeLinecap="round" />
        {/* Row 2 — checked */}
        <rect x="24" y="54" width="10" height="10" rx="2.5" fill="#041476" />
        <path d="M26.5 59l2.5 2.5 4-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="40" y1="59" x2="56" y2="59" stroke="#041476" strokeWidth="2" strokeLinecap="round" />
        {/* Row 3 — orange highlight (current) */}
        <rect x="24" y="69" width="10" height="10" rx="2.5" fill="#FA7902" />
        <path d="M26.5 74l2.5 2.5 4-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="40" y1="74" x2="56" y2="74" stroke="#041476" strokeWidth="2" strokeLinecap="round" />
        {/* Pencil (top right of clipboard) */}
        <rect x="55" y="16" width="8" height="22" rx="3" fill="#FA7902" stroke="#FA7902" strokeWidth="1" transform="rotate(30 59 27)" />
        <path d="M65 14l4 7-4 1" fill="#041476" fillOpacity="0.4" transform="rotate(30 59 27)" />
      </svg>
    ),
  },
  {
    title: 'Admission',
    desc: 'Admission will be offered based on the merit calculated from the marks of Matric, Intermediate and the admission test.',
    cta: false,
    icon: (
      <svg width="88" height="88" viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Background */}
        <rect width="88" height="88" rx="22" fill="#EEF2FF" />
        {/* Ribbon left */}
        <path d="M33 18L24 38" stroke="#FA7902" strokeWidth="7" strokeLinecap="round" />
        {/* Ribbon right */}
        <path d="M55 18L64 38" stroke="#FA7902" strokeWidth="7" strokeLinecap="round" />
        {/* Ribbon top bar */}
        <rect x="30" y="14" width="28" height="8" rx="4" fill="#FA7902" />
        {/* Medal outer circle */}
        <circle cx="44" cy="57" r="22" fill="#BFDBFE" stroke="#041476" strokeWidth="2.5" />
        {/* Medal inner ring */}
        <circle cx="44" cy="57" r="15" stroke="#041476" strokeWidth="1.5" strokeDasharray="4 3" />
        {/* Large checkmark */}
        <path d="M34 57l8 8 16-16" stroke="#041476" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Orange star at top of ribbon */}
        <path d="M44 8l1.8 3.6 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4-2.9-2.8 4-.6L44 8Z" fill="#FA7902" />
      </svg>
    ),
  },
];

const currentYear = new Date().getFullYear();
const nextYear    = currentYear + 1;
const session     = `${currentYear}–${nextYear}`;

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const BASE    = API_URL ? API_URL.replace('/api', '') : 'http://localhost:5000';

const programs = [
  {
    name: 'Bachelor of Arts (BA)',
    duration: '2 Years',
    seats: 100,
    fee: 'Rs. 8,500 / yr',
    subjects: 'Urdu, English, Pakistan Studies, Islamic Studies, Economics, Sociology…',
  },
  {
    name: 'Bachelor of Science (BSc)',
    duration: '2 Years',
    seats: 80,
    fee: 'Rs. 8,500 / yr',
    subjects: 'Physics, Chemistry, Mathematics, Biology, Computer Science…',
  },
  {
    name: 'BS — 4-Year Programs',
    duration: '4 Years',
    seats: 60,
    fee: 'Rs. 12,500 / yr',
    subjects: 'Computer Science, Environmental Science, and selected disciplines',
  },
];

/* ── Zoomable Lightbox ──────────────────────────────────────────────── */

function ZoomableLightbox({ src, alt, onClose }) {
  const [scale, setScale]     = useState(1);
  const [pos, setPos]         = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef  = useRef(null);
  const pinchRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  function clampScale(s) { return Math.min(Math.max(s, 0.5), 6); }

  function handleWheel(e) {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.2 : -0.2;
    setScale(prev => {
      const next = clampScale(prev + delta);
      if (next <= 1) setPos({ x: 0, y: 0 });
      return next;
    });
  }

  function handleMouseDown(e) {
    e.preventDefault();
    dragRef.current = { sx: e.clientX, sy: e.clientY, px: pos.x, py: pos.y };
    setDragging(true);
  }

  function handleMouseMove(e) {
    if (!dragRef.current) return;
    setPos({
      x: dragRef.current.px + (e.clientX - dragRef.current.sx) / scale,
      y: dragRef.current.py + (e.clientY - dragRef.current.sy) / scale,
    });
  }

  function handleMouseUp() { dragRef.current = null; setDragging(false); }

  function handleTouchStart(e) {
    if (e.touches.length === 1) {
      dragRef.current = { sx: e.touches[0].clientX, sy: e.touches[0].clientY, px: pos.x, py: pos.y };
    } else if (e.touches.length === 2) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      pinchRef.current = { startDist: d, startScale: scale };
      dragRef.current  = null;
    }
  }

  function handleTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1 && dragRef.current) {
      setPos({
        x: dragRef.current.px + (e.touches[0].clientX - dragRef.current.sx) / scale,
        y: dragRef.current.py + (e.touches[0].clientY - dragRef.current.sy) / scale,
      });
    } else if (e.touches.length === 2 && pinchRef.current) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const next = clampScale(pinchRef.current.startScale * (d / pinchRef.current.startDist));
      setScale(next);
      if (next <= 1) setPos({ x: 0, y: 0 });
    }
  }

  function handleTouchEnd() { dragRef.current = null; pinchRef.current = null; setDragging(false); }

  function zoomIn()  { setScale(s => clampScale(s + 0.5)); }
  function zoomOut() { setScale(s => { const n = clampScale(s - 0.5); if (n <= 1) setPos({ x: 0, y: 0 }); return n; }); }
  function reset()   { setScale(1); setPos({ x: 0, y: 0 }); }

  const cursor = scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'zoom-in';

  return (
    <div className="fixed inset-0 z-50 bg-black/92 flex flex-col" style={{ touchAction: 'none' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-black/40">
        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xl font-light transition-colors"
          >−</button>
          <span className="text-white text-sm font-mono w-14 text-center select-none">{Math.round(scale * 100)}%</span>
          <button
            onClick={zoomIn}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xl font-light transition-colors"
          >+</button>
          <button
            onClick={reset}
            className="ml-1 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
          >Reset</button>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Image area */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden select-none"
        onWheel={handleWheel}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor }}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          onMouseDown={handleMouseDown}
          onClick={(e) => {
            e.stopPropagation();
            if (!dragRef.current && scale === 1) zoomIn();
          }}
          style={{
            transform: `scale(${scale}) translate(${pos.x}px, ${pos.y}px)`,
            transformOrigin: 'center center',
            maxWidth: '95vw',
            maxHeight: 'calc(100vh - 96px)',
            objectFit: 'contain',
            transition: dragging ? 'none' : 'transform 0.12s ease',
            cursor,
          }}
        />
      </div>

      {/* Hint */}
      <p className="text-center text-white/30 text-xs py-2 shrink-0 select-none">
        Scroll / pinch to zoom · Drag to pan · Click image to zoom in · Esc to close
      </p>
    </div>
  );
}

/* ── Academic qualification row definitions ─────────────────────────── */
const QUAL_ROWS = [
  { key: 'matric',       label: 'Matric',                          required: true  },
  { key: 'intermediate', label: 'Intermediate',                    required: true  },
  { key: 'bachelor14',   label: 'Bachelor (14 years)',             required: false },
  { key: 'bachelor16',   label: 'Bachelor (Hons) / Master (16 years)', required: false },
  { key: 'msMPhil',      label: 'MS / M.Phil (18 years)',          required: false },
  { key: 'higher',       label: 'Higher (If any)',                 required: false },
];
const EMPTY_QUAL_ROW = { degreeTitle: '', passingYear: '', obtainedMarks: '', totalMarks: '', board: '' };
const EMPTY_QUALS    = Object.fromEntries(QUAL_ROWS.map(r => [r.key, { ...EMPTY_QUAL_ROW }]));


/* ── Page Component ─────────────────────────────────────────────────── */

export default function Admission() {
  const emptyForm = {
    department: '', program: '', secondPriority: '', thirdPriority: '',
    candidateName: '', fatherName: '', email: '', cnic: '', dob: '',
    gender: '', phone: '', whatsapp: '', nationality: '', city: '',
    currentAddress: '', permanentAddress: '',
  };
  const [formData, setFormData]       = useState(emptyForm);
  const [quals, setQuals]             = useState(EMPTY_QUALS);
  const [profilePic, setProfilePic]   = useState(null);
  const [picPreview, setPicPreview]   = useState('');
  const [submitted, setSubmitted]     = useState(false);
  const [loading, setLoading]         = useState(false);
  const [errors, setErrors]           = useState({});
  const picRef = useRef();

  const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD, used as max for DOB

  function validate() {
    const errs = {};
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yr = today.getFullYear();

    if (!formData.department) errs.department = 'Please select a department.';
    if (!formData.program)    errs.program    = 'Please select a program.';

    if (!formData.candidateName.trim())
      errs.candidateName = 'Candidate name is required.';
    else if (formData.candidateName.trim().length < 3)
      errs.candidateName = 'Name must be at least 3 characters.';
    else if (!/^[a-zA-Z\s.''-]+$/.test(formData.candidateName.trim()))
      errs.candidateName = 'Name may only contain letters, spaces, dots and hyphens.';

    if (!formData.fatherName.trim())
      errs.fatherName = "Father's name is required.";
    else if (formData.fatherName.trim().length < 3)
      errs.fatherName = 'Name must be at least 3 characters.';
    else if (!/^[a-zA-Z\s.''-]+$/.test(formData.fatherName.trim()))
      errs.fatherName = 'Name may only contain letters, spaces, dots and hyphens.';

    if (!formData.email.trim())
      errs.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()))
      errs.email = 'Enter a valid email address (e.g. name@example.com).';

    if (!formData.cnic.trim())
      errs.cnic = 'CNIC is required.';
    else if (!/^\d{5}-\d{7}-\d$/.test(formData.cnic.trim()))
      errs.cnic = 'CNIC must be in the format: XXXXX-XXXXXXX-X';

    if (!formData.dob)
      errs.dob = 'Date of birth is required.';
    else {
      const dob = new Date(formData.dob);
      if (dob >= today)
        errs.dob = 'Date of birth cannot be today or a future date.';
      else {
        const minDob = new Date(today); minDob.setFullYear(today.getFullYear() - 14);
        if (dob > minDob) errs.dob = 'Applicant must be at least 14 years old.';
      }
    }

    if (!formData.gender) errs.gender = 'Please select your gender.';

    const phoneRe = /^0\d{10}$/;
    if (!formData.phone.trim())
      errs.phone = 'Phone number is required.';
    else if (!phoneRe.test(formData.phone.trim().replace(/[\s-]/g, '')))
      errs.phone = 'Enter a valid 11-digit Pakistani number starting with 0.';

    if (!formData.whatsapp.trim())
      errs.whatsapp = 'WhatsApp number is required.';
    else if (!phoneRe.test(formData.whatsapp.trim().replace(/[\s-]/g, '')))
      errs.whatsapp = 'Enter a valid 11-digit Pakistani number starting with 0.';

    if (!formData.nationality) errs.nationality = 'Please select your nationality.';

    if (!formData.city.trim())
      errs.city = 'City is required.';
    else if (formData.city.trim().length < 2)
      errs.city = 'Enter a valid city name.';

    if (!formData.currentAddress.trim())
      errs.currentAddress = 'Current address is required.';
    else if (formData.currentAddress.trim().length < 10)
      errs.currentAddress = 'Please enter a complete address (at least 10 characters).';

    if (!formData.permanentAddress.trim())
      errs.permanentAddress = 'Permanent address is required.';
    else if (formData.permanentAddress.trim().length < 10)
      errs.permanentAddress = 'Please enter a complete address (at least 10 characters).';

    if (!profilePic) errs.profilePic = 'Profile picture is required.';

    for (const row of QUAL_ROWS.filter(r => r.required)) {
      const q = quals[row.key];
      if (!q.degreeTitle.trim())
        errs[`q_${row.key}_degreeTitle`] = `${row.label}: degree title required.`;
      if (!q.passingYear)
        errs[`q_${row.key}_passingYear`] = `${row.label}: passing year required.`;
      else if (parseInt(q.passingYear) < 1980 || parseInt(q.passingYear) > yr)
        errs[`q_${row.key}_passingYear`] = `${row.label}: year must be 1980–${yr}.`;
      if (!q.obtainedMarks.trim())
        errs[`q_${row.key}_obtainedMarks`] = `${row.label}: obtained marks required.`;
      if (!q.totalMarks.trim())
        errs[`q_${row.key}_totalMarks`] = `${row.label}: total marks required.`;
      const obt = parseFloat(q.obtainedMarks), tot = parseFloat(q.totalMarks);
      if (!isNaN(obt) && !isNaN(tot) && obt > tot)
        errs[`q_${row.key}_obtainedMarks`] = `${row.label}: obtained marks cannot exceed total.`;
      if (!isNaN(tot) && tot <= 0)
        errs[`q_${row.key}_totalMarks`] = `${row.label}: total marks must be greater than 0.`;
    }

    return errs;
  }

  const handleQual = (rowKey, field, value) =>
    setQuals(prev => ({ ...prev, [rowKey]: { ...prev[rowKey], [field]: value } }));
  /* ── API data ──────────────────────────────────────────────────── */
  const [notices,        setNotices]        = useState([]);
  const [noticesLoading, setNoticesLoading] = useState(true);
  const [lightboxImg,    setLightboxImg]    = useState(null);
  const [programList,    setProgramList]    = useState([]);
  const [departmentList, setDepartmentList] = useState([]);

  useEffect(() => {
    axios.get(`${API_URL}/admission-content/notices`)
      .then(res => setNotices(res.data || []))
      .catch(() => {})
      .finally(() => setNoticesLoading(false));
  }, []);

  useEffect(() => {
    axios.get(`${API_URL}/programs`)
      .then(res => setProgramList((res.data || []).map(p => p.title).filter(Boolean)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    axios.get(`${API_URL}/departments`)
      .then(res => setDepartmentList((res.data || []).map(d => d.name).filter(Boolean)))
      .catch(() => {});
  }, []);


  const handleChange = (e) => {
    let value = e.target.value;
    // Auto-format CNIC as user types: XXXXX-XXXXXXX-X
    if (e.target.name === 'cnic') {
      const digits = value.replace(/\D/g, '').slice(0, 13);
      if (digits.length <= 5)       value = digits;
      else if (digits.length <= 12) value = `${digits.slice(0,5)}-${digits.slice(5)}`;
      else                          value = `${digits.slice(0,5)}-${digits.slice(5,12)}-${digits.slice(12)}`;
    }
    setFormData(prev => ({ ...prev, [e.target.name]: value }));
    if (errors[e.target.name]) setErrors(prev => ({ ...prev, [e.target.name]: '' }));
  };

  const handlePic = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfilePic(file);
    setPicPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setTimeout(() => {
        const el = document.querySelector('[data-has-error="true"]');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => fd.append(k, v));
      fd.append('qualifications', JSON.stringify(quals));
      if (profilePic) fd.append('profilePicture', profilePic);
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/admissions/apply`, fd);
      setSubmitted(true);
      setFormData(emptyForm);
      setQuals(EMPTY_QUALS);
      setProfilePic(null);
      setPicPreview('');
      if (picRef.current) picRef.current.value = '';
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to submit application. Please try again.';
      setErrors({ _server: msg });
    }
    setLoading(false);
  };

  return (
    <>
      <Head>
        <title>Admissions {session} — University of Makran, Panjgur</title>
        <meta
          name="description"
          content="Apply to University of Makran, Panjgur. Eligibility criteria, required documents, important dates, fee structure, and online application."
        />
      </Head>

      <Header />

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative bg-primary overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <svg viewBox="0 0 1440 380" preserveAspectRatio="xMidYMid slice" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <circle cx="1300" cy="-60" r="380" fill="rgba(250,121,2,0.07)" />
            <circle cx="1200" cy="420" r="320" fill="rgba(250,121,2,0.05)" />
            <circle cx="80" cy="380" r="260" fill="rgba(255,255,255,0.03)" />
            <circle cx="-40" cy="-40" r="200" fill="rgba(255,255,255,0.03)" />
            <path d="M0 280 Q360 200 720 260 Q1080 320 1440 200 L1440 380 L0 380 Z" fill="rgba(255,255,255,0.03)" />
          </svg>
        </div>
        <div className="relative container py-24 flex flex-col items-center text-center text-white z-10">
          <span className="inline-flex items-center gap-2 bg-secondary/20 border border-secondary/40 text-secondary px-5 py-1.5 rounded-full text-sm font-semibold mb-6 uppercase tracking-widest">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Admissions Open
          </span>
          <h1 className="text-5xl md:text-6xl font-bold font-heading mb-5 leading-tight">
            Admissions <span className="text-secondary">{session}</span>
          </h1>
          <p className="text-lg text-white/75 max-w-2xl leading-relaxed">
            University of Makran, Panjgur invites applications from eligible candidates for undergraduate programs for the academic session {session}.
          </p>
          <div className="flex flex-wrap gap-4 mt-10 justify-center">
            <a
              href="#apply"
              className="inline-flex items-center gap-2 bg-secondary text-white font-semibold px-8 py-3 rounded-xl hover:bg-orange-600 transition-colors shadow-lg shadow-orange-900/30"
            >
              Apply Now
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* ── How to Apply ────────────────────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="container">
          <h2 className="section-title">How to Apply</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-14">
            {howToApplySteps.map((step, i) => (
              <div key={i} className="relative pt-5">
                {/* Step badge */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 bg-secondary text-white font-bold px-6 py-2 rounded-full text-sm shadow-md whitespace-nowrap">
                  Step: {i + 1}
                </div>
                {/* Card */}
                <div className="border-2 border-dashed border-secondary rounded-2xl pt-12 pb-8 px-6 text-center h-full flex flex-col items-center">
                  {/* Icon */}
                  <div className="mb-5 flex items-center justify-center">
                    {step.icon}
                  </div>
                  {/* Title */}
                  <h3 className="text-xl font-bold text-primary font-heading mb-3">{step.title}</h3>
                  {/* Description */}
                  <p className="text-gray-600 text-sm leading-relaxed text-justify flex-1">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ── Admission Notices (dynamic) ──────────────────────────────── */}
      {(noticesLoading || notices.length > 0) && (
        <section className="py-14 bg-orange-50">
          <div className="container">
            <div className="flex items-center gap-3 mb-8">
              <MegaphoneSVG />
              <div>
                <h2 className="text-2xl font-bold text-primary font-heading">
                  Admission Notices &amp; News
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">Session {session}</p>
              </div>
            </div>

            {noticesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
                    <div className="h-3 bg-gray-100 rounded w-full mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-4/5" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {notices.map((n) => (
                  <div key={n._id}
                    className="bg-white rounded-2xl shadow-md border border-orange-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">

                    {/* Image */}
                    {n.image && (
                      <div
                        className="relative overflow-hidden cursor-zoom-in"
                        style={{ height: '220px' }}
                        onClick={() => setLightboxImg(`${BASE}${n.image}`)}
                      >
                        <img
                          src={`${BASE}${n.image}`}
                          alt={n.title}
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />
                        <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          View
                        </div>
                      </div>
                    )}

                    <div className="p-6 flex flex-col flex-1">
                      {/* Date + badge */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="bg-secondary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                          Notice
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(n.date).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </span>
                        {n.lastDate && (
                          <span className="ml-auto flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={{ background: '#fff3e0', color: '#c0392b', border: '1px solid #f5c6a0' }}>
                            <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Last Date:&nbsp;
                            {new Date(n.lastDate).toLocaleDateString('en-GB', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-bold text-primary font-heading mb-2 leading-snug">
                        {n.title}
                      </h3>

                      {/* Description */}
                      {n.description && (
                        <p className="text-gray-600 text-sm leading-relaxed flex-1 line-clamp-3">
                          {n.description}
                        </p>
                      )}

                      {/* Eligibility & Documents PDF */}
                      {n.pdf && (
                        <div className="mt-4 pt-4 border-t border-orange-100">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Eligibility &amp; Required Documents
                          </p>
                          <a
                            href={`${BASE}${n.pdf}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-3 bg-red-50 hover:bg-red-100 border border-red-100 hover:border-red-200 rounded-xl px-4 py-3 transition-all group"
                          >
                            <div className="w-10 h-10 bg-white border border-red-200 group-hover:border-red-300 rounded-lg flex items-center justify-center shrink-0 transition-colors">
                              <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-red-700 leading-snug">Eligibility Criteria &amp; Required Documents</p>
                              <p className="text-xs text-red-400 mt-0.5">Click to view or download PDF</p>
                            </div>
                            <svg className="w-4 h-4 text-red-400 shrink-0 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </a>
                        </div>
                      )}

                      {/* External link */}
                      {n.link && (
                        <div className="mt-3">
                          <a
                            href={n.link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Read More →
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}


      {/* ── Online Application Form ─────────────────────────────────── */}
      <section id="apply" className="py-20" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #eef2ff 40%, #f8faff 100%)' }}>
        <div className="container">

          {/* Section heading */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/8 text-primary text-xs font-bold tracking-widest uppercase px-4 py-2 rounded-full mb-4 border border-primary/15">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Student Admission Form
            </div>
            <h2 className="text-3xl md:text-4xl font-bold font-heading text-primary mb-3">Online Application</h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto">Fill in all required fields carefully. Incomplete applications will not be processed.</p>
          </div>

          {submitted ? (
            <div className="max-w-lg mx-auto text-center" style={{ background: 'white', borderRadius: '24px', padding: '56px 48px', boxShadow: '0 32px 80px rgba(4,20,118,0.14), 0 8px 24px rgba(4,20,118,0.08)', border: '1px solid rgba(4,20,118,0.08)' }}>
              <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)' }}>
                <SuccessSVG />
              </div>
              <h3 className="text-2xl font-bold text-green-700 font-heading mb-3">Application Submitted!</h3>
              <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">
                Thank you for applying. We will review your application and get in touch with you shortly via email or phone.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-8 px-10 py-3.5 text-white font-bold rounded-xl transition-all text-sm"
                style={{ background: 'linear-gradient(135deg, #041476, #0a2580)', boxShadow: '0 8px 24px rgba(4,20,118,0.35)' }}
              >
                Submit Another Application
              </button>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto" style={{ background: 'white', borderRadius: '28px', boxShadow: '0 40px 100px rgba(4,20,118,0.16), 0 12px 32px rgba(4,20,118,0.10)', border: '1px solid rgba(4,20,118,0.08)', overflow: 'hidden' }}>

              {/* Form top bar */}
              <div style={{ background: 'linear-gradient(135deg, #041476 0%, #0a2580 60%, #0f3099 100%)', padding: '28px 36px' }}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(250,121,2,0.2)', border: '1px solid rgba(250,121,2,0.3)' }}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg font-heading leading-none">University of Makran — Admission Form</h3>
                    <p className="text-white/50 text-xs mt-1">All fields marked with <span className="text-red-400 font-bold">*</span> are required</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 md:p-9 space-y-8" noValidate>

                {/* ── Validation error summary ── */}
                {Object.keys(errors).length > 0 && (
                  <div className="flex items-start gap-3 px-5 py-4 rounded-xl border border-red-200 bg-red-50" data-has-error="true">
                    <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-bold text-red-700">Please fix the following before submitting:</p>
                      <ul className="mt-1 space-y-0.5 list-disc list-inside">
                        {errors._server
                          ? <li className="text-xs text-red-600">{errors._server}</li>
                          : Object.entries(errors).map(([k, v]) => v && (
                              <li key={k} className="text-xs text-red-600">{v}</li>
                            ))
                        }
                      </ul>
                    </div>
                  </div>
                )}

                {/* ── Section 1: Program of Study ── */}
                <div style={{ borderRadius: '18px', border: '1.5px solid rgba(4,20,118,0.12)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(4,20,118,0.06)' }}>
                  {/* Header */}
                  <div className="flex items-center gap-3 px-6 py-4" style={{ background: 'linear-gradient(135deg, #041476, #0d2a90)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(250,121,2,0.25)' }}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#FA7902" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white/50 text-[10px] font-bold tracking-widest uppercase">Section 01</p>
                      <h4 className="text-white font-bold text-sm">Selection of Program of Study</h4>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-6 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left: Department + Program */}
                      <div className="space-y-5">
                        <div data-has-error={!!errors.department}>
                          <label className="block text-xs font-bold text-primary/70 uppercase tracking-wider mb-2">
                            Department <span className="text-red-500">*</span>
                          </label>
                          <select name="department" value={formData.department}
                            onChange={e => { handleChange(e); setErrors(p => ({ ...p, department: '' })); }}
                            style={{ border: `1.5px solid ${errors.department ? '#f87171' : '#e2e8f0'}`, borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
                            className="w-full px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white transition-all text-gray-700">
                            <option value="">— Select Department —</option>
                            {departmentList.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                          {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department}</p>}
                        </div>
                        <div data-has-error={!!errors.program}>
                          <label className="block text-xs font-bold text-primary/70 uppercase tracking-wider mb-2">
                            Program <span className="text-red-500">*</span>
                          </label>
                          <select name="program" value={formData.program}
                            onChange={e => { handleChange(e); setErrors(p => ({ ...p, program: '' })); }}
                            style={{ border: `1.5px solid ${errors.program ? '#f87171' : '#e2e8f0'}`, borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
                            className="w-full px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white transition-all text-gray-700">
                            <option value="">— Select Program —</option>
                            {programList.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                          {errors.program && <p className="text-red-500 text-xs mt-1">{errors.program}</p>}
                        </div>
                      </div>

                      {/* Right: Priority Programs */}
                      <div style={{ background: 'linear-gradient(135deg, #fffbf5, #fff7ed)', borderRadius: '14px', padding: '20px', border: '1.5px solid rgba(250,121,2,0.2)' }}>
                        <div className="flex items-center gap-2 mb-4">
                          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="#FA7902" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#FA7902' }}>Priority Programs</span>
                          <span className="text-xs text-gray-400 font-normal">(Optional)</span>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">2nd Priority Program</label>
                            <select name="secondPriority" value={formData.secondPriority} onChange={handleChange}
                              style={{ border: '1.5px solid rgba(250,121,2,0.25)', borderRadius: '10px' }}
                              className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white/80 transition-all text-gray-700">
                              <option value="">Select 2nd Priority (Optional)</option>
                              {programList.map(p => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">3rd Priority Program</label>
                            <select name="thirdPriority" value={formData.thirdPriority} onChange={handleChange}
                              style={{ border: '1.5px solid rgba(250,121,2,0.25)', borderRadius: '10px' }}
                              className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white/80 transition-all text-gray-700">
                              <option value="">Select 3rd Priority (Optional)</option>
                              {programList.map(p => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Section 2: Candidate's Details ── */}
                <div style={{ borderRadius: '18px', border: '1.5px solid rgba(4,20,118,0.12)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(4,20,118,0.06)' }}>
                  {/* Header */}
                  <div className="flex items-center gap-3 px-6 py-4" style={{ background: 'linear-gradient(135deg, #041476, #0d2a90)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(250,121,2,0.25)' }}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#FA7902" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white/50 text-[10px] font-bold tracking-widest uppercase">Section 02</p>
                      <h4 className="text-white font-bold text-sm">Candidate&apos;s Personal Details</h4>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-6 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                      {[
                        { label: 'Candidate Name', name: 'candidateName', type: 'text', placeholder: 'Full Name', required: true },
                        { label: 'Father Name', name: 'fatherName', type: 'text', placeholder: "Father's Full Name", required: true },
                        { label: 'E-mail Address', name: 'email', type: 'email', placeholder: 'someone@example.com', required: true },
                        { label: 'CNIC Number', name: 'cnic', type: 'text', placeholder: '00000-0000000-0', required: true, maxLength: 15, hint: 'Format: XXXXX-XXXXXXX-X (auto-formatted)' },
                        { label: 'Date of Birth', name: 'dob', type: 'date', required: true, max: todayStr },
                        { label: 'Phone Number', name: 'phone', type: 'tel', placeholder: '03001234567', required: true, hint: '11-digit Pakistani number starting with 0' },
                        { label: 'WhatsApp Number', name: 'whatsapp', type: 'tel', placeholder: '03001234567', required: true, hint: '11-digit Pakistani number starting with 0' },
                        { label: 'City', name: 'city', type: 'text', placeholder: 'Your City', required: true },
                      ].map(f => (
                        <div key={f.name} data-has-error={!!errors[f.name]}>
                          <label className="block text-xs font-bold text-primary/70 uppercase tracking-wider mb-2">
                            {f.label} {f.required && <span className="text-red-500">*</span>}
                          </label>
                          <input
                            type={f.type} name={f.name} value={formData[f.name]}
                            onChange={handleChange}
                            placeholder={f.placeholder || ''} maxLength={f.maxLength}
                            max={f.max}
                            style={{ border: `1.5px solid ${errors[f.name] ? '#f87171' : '#e2e8f0'}`, borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
                            className="w-full px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white transition-all text-gray-700"
                          />
                          {errors[f.name]
                            ? <p className="text-red-500 text-xs mt-1">{errors[f.name]}</p>
                            : f.hint && <p className="text-gray-400 text-xs mt-1">{f.hint}</p>
                          }
                        </div>
                      ))}

                      {/* Gender */}
                      <div data-has-error={!!errors.gender}>
                        <label className="block text-xs font-bold text-primary/70 uppercase tracking-wider mb-2">
                          Gender <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center gap-4 px-4 py-3" style={{ border: `1.5px solid ${errors.gender ? '#f87171' : '#e2e8f0'}`, borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                          {['Male','Female'].map(g => (
                            <label key={g} className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-gray-700">
                              <input type="radio" name="gender" value={g} checked={formData.gender === g}
                                onChange={e => { handleChange(e); setErrors(p => ({ ...p, gender: '' })); }}
                                className="w-4 h-4 accent-primary" />
                              {g}
                            </label>
                          ))}
                        </div>
                        {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
                      </div>

                      {/* Nationality */}
                      <div data-has-error={!!errors.nationality}>
                        <label className="block text-xs font-bold text-primary/70 uppercase tracking-wider mb-2">
                          Nationality <span className="text-red-500">*</span>
                        </label>
                        <select name="nationality" value={formData.nationality}
                          onChange={e => { handleChange(e); setErrors(p => ({ ...p, nationality: '' })); }}
                          style={{ border: `1.5px solid ${errors.nationality ? '#f87171' : '#e2e8f0'}`, borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
                          className="w-full px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white transition-all text-gray-700">
                          <option value="">— Select Nationality —</option>
                          <option value="Pakistani">Pakistani</option>
                          <option value="Other">Other</option>
                        </select>
                        {errors.nationality && <p className="text-red-500 text-xs mt-1">{errors.nationality}</p>}
                      </div>

                      {/* Current Address */}
                      <div data-has-error={!!errors.currentAddress}>
                        <label className="block text-xs font-bold text-primary/70 uppercase tracking-wider mb-2">
                          Current Address <span className="text-red-500">*</span>
                        </label>
                        <textarea name="currentAddress" value={formData.currentAddress} onChange={handleChange}
                          rows={3} placeholder="Enter current address"
                          style={{ border: `1.5px solid ${errors.currentAddress ? '#f87171' : '#e2e8f0'}`, borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
                          className="w-full px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none text-gray-700" />
                        {errors.currentAddress && <p className="text-red-500 text-xs mt-1">{errors.currentAddress}</p>}
                      </div>

                      {/* Permanent Address */}
                      <div data-has-error={!!errors.permanentAddress}>
                        <label className="block text-xs font-bold text-primary/70 uppercase tracking-wider mb-2">
                          Permanent Address <span className="text-red-500">*</span>
                        </label>
                        <textarea name="permanentAddress" value={formData.permanentAddress} onChange={handleChange}
                          rows={3} placeholder="Enter permanent address"
                          style={{ border: `1.5px solid ${errors.permanentAddress ? '#f87171' : '#e2e8f0'}`, borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
                          className="w-full px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none text-gray-700" />
                        {errors.permanentAddress && <p className="text-red-500 text-xs mt-1">{errors.permanentAddress}</p>}
                      </div>

                      {/* Profile Picture — full width */}
                      <div className="md:col-span-2" data-has-error={!!errors.profilePic}>
                        <label className="block text-xs font-bold text-primary/70 uppercase tracking-wider mb-2">
                          Profile Picture <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center gap-5 p-4" style={{ border: `2px dashed ${errors.profilePic ? '#f87171' : 'rgba(4,20,118,0.2)'}`, borderRadius: '14px', background: 'linear-gradient(135deg, #f8faff, #f0f4ff)' }}>
                          {picPreview ? (
                            <img src={picPreview} alt="Preview" className="w-16 h-16 rounded-full object-cover shrink-0" style={{ border: '3px solid #041476', boxShadow: '0 4px 12px rgba(4,20,118,0.25)' }} />
                          ) : (
                            <div className="w-16 h-16 rounded-full flex items-center justify-center shrink-0" style={{ background: 'white', border: '2px dashed rgba(4,20,118,0.25)', boxShadow: '0 2px 8px rgba(4,20,118,0.08)' }}>
                              <svg className="w-7 h-7 text-primary/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                              </svg>
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-primary mb-2">Upload your photo</p>
                            <input ref={picRef} type="file" accept=".jpg,.jpeg,.png"
                              onChange={e => { handlePic(e); setErrors(p => ({ ...p, profilePic: '' })); }}
                              className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-primary file:text-white hover:file:opacity-90 cursor-pointer" />
                            <p className="text-xs text-gray-400 mt-1.5">JPG, JPEG or PNG · Max 5 MB</p>
                          </div>
                        </div>
                        {errors.profilePic && <p className="text-red-500 text-xs mt-1">{errors.profilePic}</p>}
                      </div>

                    </div>
                  </div>
                </div>

                {/* ── Section 3: Academic Qualifications ── */}
                <div style={{ borderRadius: '18px', border: '1.5px solid rgba(4,20,118,0.12)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(4,20,118,0.06)' }}>
                  {/* Header */}
                  <div className="flex items-center gap-3 px-6 py-4" style={{ background: 'linear-gradient(135deg, #041476, #0d2a90)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(250,121,2,0.25)' }}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#FA7902" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white/50 text-[10px] font-bold tracking-widest uppercase">Section 03</p>
                      <h4 className="text-white font-bold text-sm">Academic Qualifications</h4>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto" style={{ background: 'white' }}>
                    <table className="w-full min-w-[780px] border-collapse">
                      <thead>
                        <tr style={{ background: 'linear-gradient(135deg, #f0f4ff, #e8eeff)' }}>
                          {['Certificate / Degree','Degree Title','Passing Year','Obtained Marks / CGPA','Total Marks / CGPA','Board / University'].map((col, i) => (
                            <th key={i}
                              className="px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-wider"
                              style={{ color: '#041476', borderBottom: '2px solid rgba(4,20,118,0.15)', borderLeft: i > 0 ? '1px solid rgba(4,20,118,0.08)' : 'none', minWidth: i === 0 ? 180 : 120 }}
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {QUAL_ROWS.map((row, ri) => (
                          <tr key={row.key} style={{ background: ri % 2 === 0 ? 'white' : '#fafbff' }}>
                            <td className="px-4 py-3" style={{ borderTop: '1px solid rgba(4,20,118,0.06)' }}>
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: row.required ? '#041476' : '#c7d2fe' }} />
                                <span className="text-sm font-semibold text-gray-700">
                                  {row.label}
                                  {row.required && <span className="text-red-500 ml-1">*</span>}
                                </span>
                              </div>
                            </td>
                            {(['degreeTitle','passingYear','obtainedMarks','totalMarks','board']).map(field => {
                              const errKey = `q_${row.key}_${field}`;
                              const hasErr = !!errors[errKey];
                              return (
                                <td key={field} className="px-2.5 py-2.5" style={{ borderTop: '1px solid rgba(4,20,118,0.06)', borderLeft: '1px solid rgba(4,20,118,0.06)' }}>
                                  <input
                                    type={field === 'passingYear' ? 'number' : 'text'}
                                    value={quals[row.key][field]}
                                    onChange={e => {
                                      handleQual(row.key, field, e.target.value);
                                      if (errors[errKey]) setErrors(p => ({ ...p, [errKey]: '' }));
                                    }}
                                    min={field === 'passingYear' ? 1980 : undefined}
                                    max={field === 'passingYear' ? new Date().getFullYear() : undefined}
                                    placeholder={field === 'passingYear' ? 'YYYY' : '—'}
                                    title={hasErr ? errors[errKey] : undefined}
                                    style={{ border: `1.5px solid ${hasErr ? '#f87171' : '#e2e8f0'}`, borderRadius: '8px', background: hasErr ? '#fff5f5' : 'white' }}
                                    className="w-full px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder-gray-300 text-gray-700"
                                  />
                                  {hasErr && <p className="text-red-500 text-[10px] mt-0.5 leading-tight">{errors[errKey]}</p>}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Table footer note */}
                  <div className="flex items-center gap-2.5 px-5 py-3.5" style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', borderTop: '1px solid rgba(245,158,11,0.2)' }}>
                    <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
                    </svg>
                    <p className="text-xs font-medium text-amber-700">Matric and Intermediate qualifications are mandatory. Fill additional rows only if applicable.</p>
                  </div>
                </div>

                {/* Submit area */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 font-bold py-4 rounded-2xl text-white transition-all disabled:opacity-60 text-base"
                    style={{ background: 'linear-gradient(135deg, #041476 0%, #0a2580 60%, #0f3099 100%)', boxShadow: '0 12px 40px rgba(4,20,118,0.40), 0 4px 12px rgba(4,20,118,0.20)' }}
                    onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(4,20,118,0.50), 0 4px 16px rgba(4,20,118,0.25)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(4,20,118,0.40), 0 4px 12px rgba(4,20,118,0.20)'; }}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Submitting Application…
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Submit Application
                        <svg className="w-4 h-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" />
                        </svg>
                      </>
                    )}
                  </button>
                  <p className="text-xs text-gray-400 text-center mt-4">
                    By submitting this form you agree to be contacted by the University of Makran Admission Office regarding your application.
                  </p>
                </div>

              </form>
            </div>
          )}
        </div>
      </section>

      {/* ── Contact / Help ──────────────────────────────────────────── */}
      <section className="py-14 bg-primary">
        <div className="container text-center text-white">
          <h2 className="text-2xl font-bold font-heading mb-2">Need Help with Admissions?</h2>
          <p className="text-white/60 mb-8 text-sm">
            Our Admission Office is available Monday – Friday, 9:00 AM – 4:00 PM
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            {[
              {
                icon: (
                  <svg className="w-5 h-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                ),
                text: '0855-642053',
              },
              {
                icon: (
                  <svg className="w-5 h-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                ),
                text: 'admissions@uom.edu.pk',
              },
              {
                icon: (
                  <svg className="w-5 h-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
                text: 'Panjgur, Balochistan',
              },
            ].map((c, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/10 hover:bg-white/15 transition-colors rounded-xl px-6 py-3.5">
                {c.icon}
                <span className="text-sm font-medium">{c.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />

      {lightboxImg && (
        <ZoomableLightbox src={lightboxImg} alt="Notice" onClose={() => setLightboxImg(null)} />
      )}
    </>
  );
}
