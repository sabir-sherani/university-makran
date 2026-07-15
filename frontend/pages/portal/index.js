import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../../components/Header.js';
import Footer from '../../components/Footer.js';
import HeroSection from '../../components/HeroSection.js';

const portals = [
  {
    href: '/portal/student',
    icon: (
      <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
      </svg>
    ),
    gradientFrom: '#041476',
    gradientTo:   '#0a2580',
    accentColor:  '#041476',
    badgeColor:   'bg-blue-100 text-blue-800',
    badgeText:    'Student',
    title: 'Student Portal',
    description: 'Access academic records, exam results, date sheets, enrolled courses, and registration status.',
    features: ['View & download date sheets', 'Check exam results & grades', 'View enrolled courses & CGPA', 'Manage academic profile', 'Track registration status'],
    loginText: 'Student Login',
    registerText: 'Register Now',
    showRegister: true,
  },
  {
    href: '/feedback',
    icon: (
      <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
    gradientFrom: '#e86d00',
    gradientTo:   '#FA7902',
    accentColor:  '#e86d00',
    badgeColor:   'bg-orange-100 text-orange-800',
    badgeText:    'Feedback',
    title: 'Feedback Portal',
    description: 'Share your thoughts, suggestions, and concerns about academic programs, faculty, and university services.',
    features: ['Submit anonymous feedback', 'Rate academic programs', 'Comment on faculty & teaching', 'Report campus issues', 'Suggest improvements'],
    loginText: 'Give Feedback',
    showRegister: false,
  },
];

export default function Portal() {
  return (
    <>
      <Head>
        <title>University Portal — University of Makran, Panjgur</title>
        <meta name="description" content="Access the Student Portal or submit feedback about university services." />
      </Head>

      <Header />
      <HeroSection title="University Portal" subtitle="Student Access & Feedback" />

      <div className="bg-gray-50 py-20">
        <div className="container">

          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold font-heading text-primary mb-3">Select Your Portal</h2>
            <p className="text-gray-500 text-sm max-w-lg mx-auto">Access the student portal to manage your academics, or share feedback to help us improve.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {portals.map((portal) => (
              <div key={portal.href}
                className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col"
                style={{ border: '1px solid rgba(0,0,0,0.06)' }}>

                {/* Card header */}
                <div className="h-36 flex items-center justify-center relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${portal.gradientFrom}, ${portal.gradientTo})` }}>
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}>
                    {portal.icon}
                  </div>
                  <span className={`absolute top-4 right-4 text-xs font-bold px-2.5 py-1 rounded-full ${portal.badgeColor}`}>
                    {portal.badgeText}
                  </span>
                </div>

                {/* Card body */}
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-lg font-bold mb-2" style={{ color: portal.accentColor }}>{portal.title}</h3>
                  <p className="text-gray-500 text-sm mb-4 leading-relaxed">{portal.description}</p>

                  <ul className="space-y-1.5 mb-6 flex-1">
                    {portal.features.map((f) => (
                      <li key={f} className="text-gray-600 text-sm flex items-start gap-2">
                        <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"
                          style={{ color: portal.accentColor }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className="space-y-2.5">
                    <Link href={portal.href}>
                      <span className="block w-full text-center py-2.5 rounded-xl font-bold text-sm text-white transition-opacity hover:opacity-90 cursor-pointer"
                        style={{ background: `linear-gradient(135deg, ${portal.gradientFrom}, ${portal.gradientTo})` }}>
                        {portal.loginText}
                      </span>
                    </Link>
                    {portal.showRegister && (
                      <Link href={`${portal.href}?tab=register`}>
                        <span className="block w-full text-center py-2.5 rounded-xl font-semibold text-sm transition-colors cursor-pointer border-2 hover:opacity-80"
                          style={{ borderColor: portal.accentColor, color: portal.accentColor }}>
                          Register Now
                        </span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 max-w-2xl mx-auto bg-blue-50 border border-blue-200 rounded-2xl p-5 text-center">
            <p className="text-primary font-semibold text-sm mb-1">Staff & Admin Access</p>
            <p className="text-gray-600 text-sm">
              Teacher, HOD, Examination, and Finance portals are accessible via internal links.
              Contact the IT department at{' '}
              <a href="mailto:it@uomp.edu.pk" className="text-primary underline">it@uomp.edu.pk</a>
              {' '}for access.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
