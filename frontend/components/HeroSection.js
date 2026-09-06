import React from 'react';

// Shared page-banner design — used by every top-level page (Admission,
// Administration, Departments, Programs, Downloads, Portal, Contact, etc.)
// so the hero always has the same font, color and layout. `children` is for
// page-specific extras below the subtitle (a CTA button, quick-nav cards, a
// search bar) — see admission.js / programs.js / downloads.js for examples.
export default function HeroSection({ eyebrow = 'UNIVERSITY OF MAKRAN', title, subtitle, children }) {
  return (
    <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #041476 0%, #0a2299 60%, #1a3ab8 100%)', padding: '56px 16px 64px' }}>
      <div style={{ position: 'absolute', width: 360, height: 360, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', top: -80, right: -80 }} />
      <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'rgba(250,121,2,0.1)', bottom: -50, left: -50 }} />
      <div className="container relative z-10 text-center">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(250,121,2,0.18)', border: '1px solid rgba(250,121,2,0.4)', borderRadius: 999, padding: '5px 16px', marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: '#FA7902', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{eyebrow}</span>
        </div>
        <h1 style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 800, color: '#fff', marginBottom: (subtitle || children) ? 12 : 0, lineHeight: 1.15 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, maxWidth: 560, margin: children ? '0 auto 28px' : '0 auto' }}>
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
