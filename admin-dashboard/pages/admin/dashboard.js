import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import AdminHeader from '../../components/AdminHeader';
import axios from 'axios';
import {
  LuUsers,
  LuUserCheck,
  LuGraduationCap,
  LuClipboardList,
  LuBuilding2,
  LuBookOpen,
  LuBookMarked,
  LuBuilding,
  LuNewspaper,
  LuArrowRight,
  LuTrendingUp,
} from 'react-icons/lu';

const API = process.env.NEXT_PUBLIC_API_URL;

// ── Stat cards config ─────────────────────────────────────────────────────────

const STAT_CARDS = [
  {
    key: 'students',
    label: 'Total Students',
    Icon: LuUsers,
    accent: '#2563eb',
    iconBg: '#eff6ff',
    bar: 'from-blue-500 to-blue-600',
    border: 'border-blue-100',
  },
  {
    key: 'faculty',
    label: 'Faculty Members',
    Icon: LuUserCheck,
    accent: '#059669',
    iconBg: '#ecfdf5',
    bar: 'from-emerald-500 to-emerald-600',
    border: 'border-emerald-100',
  },
  {
    key: 'programs',
    label: 'Programs',
    Icon: LuGraduationCap,
    accent: '#7c3aed',
    iconBg: '#f5f3ff',
    bar: 'from-violet-500 to-violet-600',
    border: 'border-violet-100',
  },
  {
    key: 'applications',
    label: 'New Applications',
    Icon: LuClipboardList,
    accent: '#ea580c',
    iconBg: '#fff7ed',
    bar: 'from-orange-500 to-orange-600',
    border: 'border-orange-100',
  },
];

// ── Quick action cards config ─────────────────────────────────────────────────

const ACTIONS = [
  {
    label: 'Departments',
    href:  '/admin/departments',
    desc:  'Add or edit academic departments',
    Icon:  LuGraduationCap,
    accent:'#041476',
    iconBg:'#eef0fb',
  },
  {
    label: 'News & Events',
    href:  '/admin/news',
    desc:  'Publish announcements and events',
    Icon:  LuNewspaper,
    accent:'#041476',
    iconBg:'#fdf0f3',
  },
  {
    label: 'Administration',
    href:  '/admin/administration',
    desc:  'Manage admin departments & staff',
    Icon:  LuBuilding2,
    accent:'#4f46e5',
    iconBg:'#eef2ff',
  },
  {
    label: 'Programs',
    href:  '/admin/programs',
    desc:  'Create and manage degree programs',
    Icon:  LuBookOpen,
    accent:'#7c3aed',
    iconBg:'#f5f3ff',
  },
  {
    label: 'Faculty',
    href:  '/admin/faculty',
    desc:  'Add or update faculty members',
    Icon:  LuUsers,
    accent:'#059669',
    iconBg:'#ecfdf5',
  },
  {
    label: 'Course Structure',
    href:  '/admin/courses',
    desc:  'Manage semester course tables',
    Icon:  LuBookMarked,
    accent:'#0284c7',
    iconBg:'#f0f9ff',
  },
  {
    label: 'Applications',
    href:  '/admin/applications',
    desc:  'Review admission applications',
    Icon:  LuClipboardList,
    accent:'#ea580c',
    iconBg:'#fff7ed',
  },
  {
    label: 'Facilities',
    href:  '/admin/facilities',
    desc:  'Update campus facilities',
    Icon:  LuBuilding,
    accent:'#0d9488',
    iconBg:'#f0fdfa',
  },
];

const STATUS_STYLE = {
  pending:  'bg-yellow-50 text-yellow-700 border border-yellow-200',
  approved: 'bg-green-50  text-green-700  border border-green-200',
  rejected: 'bg-red-50    text-red-700    border border-red-200',
};

// ── Action card component ─────────────────────────────────────────────────────

function ActionCard({ action }) {
  const { label, href, desc, Icon, accent, iconBg } = action;
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden relative"
    >
      {/* Left accent bar */}
      <span
        className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r-full transition-all duration-200 group-hover:top-0 group-hover:bottom-0"
        style={{ background: accent }}
      />

      {/* Icon */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
        style={{ background: iconBg }}
      >
        <Icon size={24} style={{ color: accent }} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-800 text-sm leading-tight">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5 leading-snug">{desc}</p>
      </div>

      {/* Arrow */}
      <LuArrowRight
        size={16}
        className="shrink-0 text-gray-300 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all duration-200"
      />
    </Link>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [stats,   setStats]   = useState({ students: 0, faculty: 0, programs: 0, applications: 0 });
  const [recent,  setRecent]  = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  useEffect(() => {
    (async () => {
      try {
        const [sRes, aRes] = await Promise.all([
          axios.get(`${API}/stats`),
          axios.get(`${API}/admissions`),
        ]);
        setStats(sRes.data);
        setRecent((aRes.data || []).slice(0, 5));
      } catch {
        setStats({ students: 5000, faculty: 250, programs: 15, applications: 120 });
      }
      setLoading(false);
    })();
  }, []);

  return (
    <>
      <Head><title>Admin Dashboard — University of Makran</title></Head>
      <AdminHeader />

      <div className="ml-0 lg:ml-56 min-h-screen bg-gray-50">

        {/* ── Welcome banner ── */}
        <div
          className="relative overflow-hidden px-8 py-10"
          style={{ background: 'linear-gradient(135deg, #041476 0%, #6b0530 55%, #041476 100%)' }}
        >
          <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/5" />
          <div className="absolute top-6 right-40 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full bg-white/3" />

          <div className="relative flex items-center justify-between gap-5">
            <div className="flex items-center gap-5">
              <div className="shrink-0 bg-white rounded-2xl p-2 shadow-xl">
                <Image src="/logo.png.webp" alt="UoMP" width={68} height={68} className="object-contain" />
              </div>
              <div>
                <p className="text-white/50 text-xs font-semibold tracking-widest uppercase mb-1">Admin Portal</p>
                <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">University of Makran</h1>
                <p className="text-white/40 text-sm mt-1 flex items-center gap-1.5">
                  <LuTrendingUp size={13} />
                  {today}
                </p>
              </div>
            </div>
            <a
              href="http://localhost:3000"
              target="_blank"
              rel="noreferrer"
              className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-sm transition-all duration-150"
            >
              <LuArrowRight size={16} />
              View Frontend
            </a>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-8">

          {/* ── Stat cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {STAT_CARDS.map(({ key, label, Icon, accent, iconBg, bar, border }) => (
              <div
                key={key}
                className={`bg-white rounded-2xl border ${border} shadow-sm overflow-hidden`}
              >
                <div className={`h-1 bg-gradient-to-r ${bar}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-13 h-13 rounded-xl flex items-center justify-center"
                      style={{ background: iconBg, width: 52, height: 52 }}
                    >
                      <Icon size={26} style={{ color: accent }} />
                    </div>
                    {loading ? (
                      <div className="w-14 h-8 bg-gray-100 rounded-lg animate-pulse mt-1" />
                    ) : (
                      <span className="text-3xl font-extrabold" style={{ color: accent }}>
                        {(stats[key] ?? 0).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-sm font-medium">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Quick actions ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1 h-5 rounded-full inline-block" style={{ background: '#041476' }} />
              <h2 className="text-base font-bold text-gray-800">Quick Actions</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {ACTIONS.map(a => <ActionCard key={a.href} action={a} />)}
            </div>
          </div>

          {/* ── Recent applications ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <span className="w-1 h-5 rounded-full inline-block bg-orange-500" />
                <h2 className="text-base font-bold text-gray-800">Recent Applications</h2>
              </div>
              <Link href="/admin/applications" className="text-sm font-semibold hover:underline flex items-center gap-1" style={{ color: '#041476' }}>
                View All <LuArrowRight size={13} />
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <LuClipboardList size={36} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-medium">No applications received yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-3 text-gray-400 font-semibold text-xs uppercase tracking-wide">Applicant</th>
                      <th className="text-left py-2 px-3 text-gray-400 font-semibold text-xs uppercase tracking-wide">Program</th>
                      <th className="text-left py-2 px-3 text-gray-400 font-semibold text-xs uppercase tracking-wide">Applied</th>
                      <th className="text-left py-2 px-3 text-gray-400 font-semibold text-xs uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map(app => (
                      <tr key={app._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-3">
                          <p className="font-semibold text-gray-800">{app.fullName}</p>
                          <p className="text-xs text-gray-400">{app.email}</p>
                        </td>
                        <td className="py-3 px-3 text-gray-600">{app.program || '—'}</td>
                        <td className="py-3 px-3 text-gray-400 text-xs">
                          {app.createdAt ? new Date(app.createdAt).toLocaleDateString('en-GB') : '—'}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[app.status] || 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                            {app.status || 'pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-gray-300 pb-2">
            University of Makran, Panjgur — Admin Panel v1.0
          </p>
        </div>
      </div>
    </>
  );
}

