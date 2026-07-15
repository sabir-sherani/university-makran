import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header.js';
import Footer from '../components/Footer.js';
import HeroSection from '../components/HeroSection.js';
import axios from 'axios';

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${process.env.NEXT_PUBLIC_API_URL}/departments`)
      .then((res) => setDepartments(res.data || []))
      .catch(() => {
        setDepartments([
          { _id: '1', name: 'Education', slug: 'education', description: 'Preparing competent educators and educational leaders.' },
          { _id: '2', name: 'CS & IT', slug: 'cs-it', description: 'Computing skills covering programming, networks, and software engineering.' },
          { _id: '3', name: 'Botany', slug: 'botany', description: 'Plant biology, ecology, and environmental science.' },
          { _id: '4', name: 'English', slug: 'english', description: 'Language, literature, linguistics, and creative writing.' },
          { _id: '5', name: 'IR', slug: 'ir', description: 'Global politics, diplomacy, and international law.' },
          { _id: '6', name: 'Social Work', slug: 'social-work', description: 'Addressing social issues and supporting communities.' },
          { _id: '7', name: 'Balochi', slug: 'balochi', description: 'Balochi language, culture, and literary heritage.' },
          { _id: '8', name: 'BBA', slug: 'bba', description: 'Management, finance, marketing, and entrepreneurship.' },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  const deptColors = [
    '#041476', '#1a3a6b', '#0d5c3a', '#5c3a00',
    '#2a0d5c', '#5c0d2a', '#0d4a5c', '#3a5c0d',
  ];

  return (
    <>
      <Head>
        <title>Departments - University of Makran, Panjgur</title>
      </Head>

      <Header />
      <HeroSection title="Departments" subtitle="Explore Our Academic Departments" />

      <div className="bg-gray-50 py-20">
        <div className="container">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <h2 className="section-title">Academic Departments</h2>
              <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
                University of Makran offers a diverse range of academic departments committed to excellence in teaching, research, and community engagement.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {departments.map((dept, i) => {
                  const color = deptColors[i % deptColors.length];
                  const href = dept.slug ? `/departments/${dept.slug}` : '#';

                  return (
                    <Link
                      key={dept._id || dept.slug}
                      href={href}
                      className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1"
                    >
                      {/* Color strip */}
                      <div className="h-2" style={{ background: color }} />

                      <div className="p-6">
                        {/* Icon placeholder */}
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg mb-4"
                          style={{ background: color }}
                        >
                          {dept.name.charAt(0)}
                        </div>

                        <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">
                          {dept.name}
                        </h3>

                        {dept.hod?.name && (
                          <p className="text-sm font-medium text-gray-500 mb-2">
                            HOD: {dept.hod.name}
                          </p>
                        )}
                        {!dept.hod?.name && dept.head && (
                          <p className="text-sm font-medium text-gray-500 mb-2">
                            Head: {dept.head}
                          </p>
                        )}

                        <p className="text-sm text-gray-600 line-clamp-2">
                          {dept.description || 'Explore this department to learn more.'}
                        </p>

                        <div
                          className="mt-4 text-sm font-semibold flex items-center gap-1 transition-colors"
                          style={{ color }}
                        >
                          View Department
                          <span className="transition-transform group-hover:translate-x-1">→</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}
