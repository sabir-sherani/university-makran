import Link from 'next/link';
import Image from 'next/image';
import { Mail, Phone, MapPin, ArrowRight, ExternalLink } from 'lucide-react';
import { FaFacebook, FaLinkedin } from 'react-icons/fa';

const quickLinks = [
  { label: 'Home', href: '/' },
  { label: 'About Us', href: '/about' },
  { label: 'Admissions', href: '/admission' },
  { label: 'Programs', href: '/programs' },
  { label: 'Departments', href: '/departments' },
  { label: 'Facilities',          href: '/facilities' },
  { label: 'Degree Verification', href: '/degree-verification' },
  { label: 'Contact',             href: '/contact' },
];

const contactItems = [
  {
    icon: Mail,
    label: 'info@uomp.edu.pk',
    href: 'mailto:info@uomp.edu.pk',
  },
  {
    icon: Phone,
    label: '0855-642053',
    href: 'tel:0855642053',
  },
  {
    icon: MapPin,
    label: 'Panjgur, Balochistan, Pakistan',
    href: null,
  },
];

const socialLinks = [
  {
    icon: FaFacebook,
    label: 'Facebook',
    href: 'https://www.facebook.com/UniversityofMakran/',
    hoverBg: '#1877F2',
  },
  {
    icon: FaLinkedin,
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/school/university-of-makran-panjgur/',
    hoverBg: '#0A66C2',
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer>
      {/* ── MAIN FOOTER ─────────────────────────────────── */}
      <div style={{ background: '#0B1120' }} className="text-white">
        <div className="container py-16 lg:py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">

            {/* ── Col 1: Brand ─────────────────────────── */}
            <div className="md:col-span-2 lg:col-span-1">
              <Link href="/" className="inline-flex items-center gap-3 mb-5 group">
                <Image
                  src="/logo.png.webp"
                  alt="UoMP Logo"
                  width={44}
                  height={44}
                  className="h-10 md:h-11 w-auto shrink-0 drop-shadow-md group-hover:opacity-90 transition-opacity"
                />
                <div className="leading-tight">
                  <div className="font-bold text-sm text-white">University of Makran</div>
                  <div className="text-xs font-medium tracking-wider uppercase text-gray-400">
                    Panjgur · UoMP
                  </div>
                </div>
              </Link>

              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Empowering the youth of Makran through quality education, research, and innovation —
                building a brighter future for Balochistan and Pakistan.
              </p>

              {/* Social icons */}
              <div className="flex gap-3">
                {socialLinks.map(({ icon: Icon, label, href, hoverBg }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 hover:text-white hover:-translate-y-0.5"
                    style={{ background: 'rgba(255,255,255,0.08)', color: '#e86d00' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#e86d00'; }}
                  >
                    <Icon size={16} strokeWidth={1.75} />
                  </a>
                ))}
              </div>
            </div>

            {/* ── Col 2: Quick Links ────────────────────── */}
            <div>
              <h4 className="font-bold text-base text-white mb-5">
                Quick Links
              </h4>
              <div className="w-10 h-0.5 rounded-full mb-6" style={{ background: '#041476' }} />
              <ul className="space-y-3">
                {quickLinks.map(({ label, href }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-all duration-200 group"
                    >
                      <ArrowRight
                        size={13}
                        className="transition-transform duration-200 group-hover:translate-x-1"
                        style={{ color: '#e86d00' }}
                      />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* ── Col 3: Contact ───────────────────────── */}
            <div>
              <h4 className="font-bold text-base text-white mb-5">
                Contact Us
              </h4>
              <div className="w-10 h-0.5 rounded-full mb-6" style={{ background: '#041476' }} />
              <ul className="space-y-4">
                {contactItems.map(({ icon: Icon, label, href }) => {
                  const inner = (
                    <div className="flex items-start gap-3 group">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200"
                        style={{ background: 'rgba(255,255,255,0.07)' }}
                        onMouseEnter={(e) => href && (e.currentTarget.style.background = '#041476')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                      >
                        <Icon size={14} className="group-hover:text-white transition-colors" style={{ color: '#e86d00' }} strokeWidth={1.75} />
                      </div>
                      <span className="text-sm text-gray-400 group-hover:text-white transition-colors duration-200 pt-1 leading-snug">
                        {label}
                      </span>
                    </div>
                  );

                  return (
                    <li key={label}>
                      {href ? (
                        <a href={href} className="block">
                          {inner}
                        </a>
                      ) : (
                        inner
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* ── Col 4: CTA ───────────────────────────── */}
            <div>
              <h4 className="font-bold text-base text-white mb-5">
                Join UoMP
              </h4>
              <div className="w-10 h-0.5 rounded-full mb-6" style={{ background: '#041476' }} />
              <p className="text-sm text-gray-400 leading-relaxed mb-6">
                Applications are open for upcoming semesters. Take the first step toward a quality
                education in the heart of Makran.
              </p>
              <Link
                href="/admission"
                className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-3 rounded-lg transition-all duration-300 hover:-translate-y-0.5 hover:opacity-90 hover:shadow-lg mb-4"
                style={{ background: '#041476', color: '#fff' }}
              >
                Apply Now
                <ArrowRight size={14} />
              </Link>

              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Official Portals</p>
                <div className="flex flex-col gap-2">
                  <Link href="/portal/student" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors group">
                    <ExternalLink size={11} className="group-hover:text-white" style={{ color: '#e86d00' }} />
                    Student Portal
                  </Link>
                  <Link href="/feedback" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors group">
                    <ExternalLink size={11} className="group-hover:text-white" style={{ color: '#e86d00' }} />
                    Feedback
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="container">
          <div className="h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
        </div>

        {/* ── BOTTOM COPYRIGHT BAR ────────────────────────── */}
        <div style={{ background: '#070D18' }}>
          <div className="container py-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-gray-500">
              <p>
                © {year}&nbsp;
                <span className="text-gray-400 font-medium">University of Makran, Panjgur (UoMP)</span>.
                All rights reserved.
              </p>
              <div className="flex items-center gap-4">
                <Link href="/about" className="hover:text-gray-300 transition-colors">About</Link>
                <span>·</span>
                <Link href="/contact" className="hover:text-gray-300 transition-colors">Contact</Link>
                <span>·</span>
                <Link href="/portal" className="hover:text-gray-300 transition-colors">Portal</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
