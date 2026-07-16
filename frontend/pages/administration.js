import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import HeroSection from '../components/HeroSection';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

function imgUrl(p) {
  if (!p) return null;
  if (p.startsWith('http')) return p;
  return p?.startsWith("http") ? p : `${BASE_URL}${p}`;
}

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function Administration() {
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${API_URL}/admin-depts`)
      .then((res) => setDepts(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Head>
        <title>Administration - University of Makran, Panjgur</title>
        <meta name="description" content="Administrative departments and leadership at University of Makran, Panjgur." />
      </Head>

      <Header />
      <HeroSection title="Administration" subtitle="Departments &amp; Leadership" />

      <div className="bg-gray-50 py-16">
        <div className="container">

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                  <div className="w-16 h-16 rounded-full bg-gray-200 mb-4" />
                  <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-100 rounded w-full" />
                </div>
              ))}
            </div>
          ) : depts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-5xl mb-4">🏛️</p>
              <p className="text-xl font-semibold text-gray-700">Administration departments coming soon.</p>
              <p className="text-gray-400 text-sm mt-2">Check back later for details.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {depts.map((dept) => {
                const hodPhoto = imgUrl(dept.hod?.image);
                return (
                  <Link
                    key={dept._id}
                    href={`/administration/${dept.slug}`}
                    className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group"
                  >
                    {/* Top accent */}
                    <div className="h-1.5 w-full" style={{ background: '#041476' }} />

                    <div className="p-6">
                      {/* HOD avatar */}
                      <div className="mb-4">
                        {hodPhoto ? (
                          <img
                            src={hodPhoto}
                            alt={dept.hod?.name || dept.name}
                            className="w-16 h-16 rounded-full object-cover shadow"
                            style={{ objectPosition: 'top center' }}
                          />
                        ) : (
                          <div
                            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                            style={{ background: '#041476' }}
                          >
                            {dept.name.charAt(0)}
                          </div>
                        )}
                      </div>

                      <h3
                        className="text-base font-bold leading-snug mb-1 group-hover:underline"
                        style={{ color: '#041476' }}
                      >
                        {dept.name}
                      </h3>

                      {dept.hod?.name && (
                        <p className="text-sm text-gray-500 mb-2">
                          Head: <span className="font-medium text-gray-700">{dept.hod.name}</span>
                        </p>
                      )}

                      {dept.about && (
                        <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{stripHtml(dept.about)}</p>
                      )}

                      <div
                        className="mt-4 text-xs font-semibold"
                        style={{ color: '#041476' }}
                      >
                        View Department →
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}
