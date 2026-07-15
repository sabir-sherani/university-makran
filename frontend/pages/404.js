import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function NotFound() {
  return (
    <>
      <Head>
        <title>404 — Page Not Found | University of Makran</title>
      </Head>

      <Header />

      <main className="bg-gray-50 min-h-[80vh] flex items-center justify-center px-4 py-20">
        <div className="max-w-2xl w-full text-center">

          {/* Big 404 */}
          <div className="relative inline-block mb-6 select-none">
            <span
              className="text-[10rem] md:text-[14rem] font-black leading-none tracking-tighter"
              style={{ color: '#f0f2fb' }}>
              404
            </span>
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-24 h-24 md:w-32 md:h-32 rounded-3xl flex items-center justify-center shadow-2xl"
                style={{ background: 'linear-gradient(135deg, #041476, #0a2580)' }}>
                <svg className="w-12 h-12 md:w-16 md:h-16 text-white opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.4">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-3xl md:text-4xl font-black mb-3" style={{ color: '#041476' }}>
            Page Not Found
          </h1>

          {/* Divider */}
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="h-px w-16 rounded-full" style={{ background: '#e5e7eb' }} />
            <div className="w-2 h-2 rounded-full" style={{ background: '#FA7902' }} />
            <div className="h-px w-16 rounded-full" style={{ background: '#e5e7eb' }} />
          </div>

          <p className="text-gray-500 text-base md:text-lg leading-relaxed mb-10 max-w-md mx-auto">
            The page you&apos;re looking for doesn&apos;t exist or may have been moved.
            Let us help you find your way back.
          </p>

          {/* Quick links */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10 max-w-xl mx-auto">
            {[
              { label: 'Home',       href: '/',           icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
              { label: 'Admission',  href: '/admission',  icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
              { label: 'Programs',   href: '/programs',   icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
              { label: 'Contact',    href: '/contact',    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
            ].map(({ label, href, icon }) => (
              <Link key={href} href={href}>
                <span className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
                    style={{ background: '#f0f2fb' }}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"
                      style={{ color: '#041476' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                    </svg>
                  </span>
                  <span className="text-sm font-semibold text-gray-700">{label}</span>
                </span>
              </Link>
            ))}
          </div>

          {/* Primary CTA */}
          <Link href="/">
            <span className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white text-sm transition-all duration-200 hover:opacity-90 hover:shadow-lg cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #041476, #0a2580)' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Homepage
            </span>
          </Link>

          {/* Help note */}
          <p className="mt-8 text-xs text-gray-400">
            Need help?{' '}
            <Link href="/contact">
              <span className="underline cursor-pointer hover:text-gray-600 transition-colors">Contact us</span>
            </Link>
            {' '}or email{' '}
            <a href="mailto:info@uomp.edu.pk" className="underline hover:text-gray-600 transition-colors">
              info@uomp.edu.pk
            </a>
          </p>

        </div>
      </main>

      <Footer />
    </>
  );
}
