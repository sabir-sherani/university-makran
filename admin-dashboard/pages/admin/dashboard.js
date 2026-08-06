import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
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
  LuShieldCheck,
  LuFileEdit,
  LuReceipt,
  LuHistory,
  LuUserPlus,
} from 'react-icons/lu';

const API = process.env.NEXT_PUBLIC_API_URL;

function getAdminToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('adminToken') || localStorage.getItem('token') || '';
}
function authHeaders() { return { headers: { Authorization: `Bearer ${getAdminToken()}` } }; }

// ── Quick action cards config (content / site management) ────────────────────

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

// ── Operational "needs attention" quick links ─────────────────────────────────

function buildAttentionLinks(stats) {
  return [
    {
      label: 'Pending Student Approvals',
      href: '/admin/students?status=pending',
      count: stats.pendingStudents || 0,
      Icon: LuUserPlus,
      accent: '#d97706',
      iconBg: '#fffbeb',
    },
    {
      label: 'Pending Teacher Approvals',
      href: '/admin/teachers?status=pending',
      count: stats.pendingTeachers || 0,
      Icon: LuUserCheck,
      accent: '#d97706',
      iconBg: '#fffbeb',
    },
    {
      label: 'Correction Requests',
      href: '/admin/correction-requests',
      count: stats.pendingCorrectionRequests || 0,
      Icon: LuFileEdit,
      accent: '#7c3aed',
      iconBg: '#f5f3ff',
    },
    {
      label: 'Unpaid Challans',
      href: '/admin/challans?status=generated',
      count: stats.unpaidChallans || 0,
      sub: stats.outstandingAmount ? `Rs ${stats.outstandingAmount.toLocaleString()} outstanding` : '',
      Icon: LuReceipt,
      accent: '#dc2626',
      iconBg: '#fef2f2',
    },
  ];
}

function ActionCard({ action }) {
  const { label, href, desc, Icon, accent, iconBg } = action;
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden relative"
    >
      <span
        className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r-full transition-all duration-200 group-hover:top-0 group-hover:bottom-0"
        style={{ background: accent }}
      />
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
        style={{ background: iconBg }}
      >
        <Icon size={24} style={{ color: accent }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-800 text-sm leading-tight">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5 leading-snug">{desc}</p>
      </div>
      <LuArrowRight
        size={16}
        className="shrink-0 text-gray-300 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all duration-200"
      />
    </Link>
  );
}

function AttentionCard({ item }) {
  const { label, href, count, sub, Icon, accent, iconBg } = item;
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: iconBg }}>
        <Icon size={22} style={{ color: accent }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-800 text-sm leading-tight">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <span className="text-2xl font-extrabold shrink-0" style={{ color: count > 0 ? accent : '#d1d5db' }}>
        {count}
      </span>
    </Link>
  );
}

function ActionBadge({ action }) {
  const isDestructive = /delete|archive|reject|cancel|suspend/i.test(action || '');
  const isPositive = /create|approve|restore|paid|finalize|publish/i.test(action || '');
  const cls = isDestructive
    ? 'bg-red-50 text-red-700'
    : isPositive
      ? 'bg-green-50 text-green-700'
      : 'bg-blue-50 text-blue-700';
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>{action}</span>;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter();
  const [stats,   setStats]   = useState({});
  const [loading, setLoading] = useState(true);

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('adminToken')) {
      router.replace('/');
      return;
    }
    (async () => {
      try {
        const { data } = await axios.get(`${API}/portal/admin/stats`, authHeaders());
        setStats(data || {});
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('adminToken');
          router.replace('/');
        }
      }
      setLoading(false);
    })();
  }, []);

  const staffTotal = (stats.staffCounts?.hod || 0) + (stats.staffCounts?.exam || 0) + (stats.staffCounts?.finance || 0) + (stats.staffCounts?.admin || 0);
  const attentionLinks = buildAttentionLinks(stats);

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

          {/* ── Portal overview stat cards ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1 h-5 rounded-full inline-block" style={{ background: '#041476' }} />
              <h2 className="text-base font-bold text-gray-800">Portal Overview</h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Students', value: stats.totalStudents, sub: `${stats.activeStudents || 0} active · ${stats.suspendedStudents || 0} suspended`, Icon: LuUsers, accent: '#2563eb', iconBg: '#eff6ff' },
                { label: 'Total Teachers', value: stats.totalTeachers, sub: `${stats.pendingTeachers || 0} pending`, Icon: LuUserCheck, accent: '#059669', iconBg: '#ecfdf5' },
                { label: 'Staff Accounts', value: staffTotal, sub: `${stats.staffCounts?.hod || 0} HOD · ${stats.staffCounts?.exam || 0} Exam · ${stats.staffCounts?.finance || 0} Finance`, Icon: LuShieldCheck, accent: '#7c3aed', iconBg: '#f5f3ff' },
                { label: 'Pending Admissions', value: stats.pendingAdmissions, sub: 'Awaiting review', Icon: LuClipboardList, accent: '#ea580c', iconBg: '#fff7ed' },
              ].map(({ label, value, sub, Icon, accent, iconBg }) => (
                <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: iconBg }}>
                      <Icon size={22} style={{ color: accent }} />
                    </div>
                    {loading ? (
                      <div className="w-14 h-8 bg-gray-100 rounded-lg animate-pulse mt-1" />
                    ) : (
                      <span className="text-3xl font-extrabold" style={{ color: accent }}>{(value ?? 0).toLocaleString()}</span>
                    )}
                  </div>
                  <p className="text-gray-700 text-sm font-semibold">{label}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Needs attention ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1 h-5 rounded-full inline-block bg-amber-500" />
              <h2 className="text-base font-bold text-gray-800">Needs Attention</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {attentionLinks.map(item => <AttentionCard key={item.href} item={item} />)}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Recent activity feed ── */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <span className="w-1 h-5 rounded-full inline-block bg-blue-500" />
                  <h2 className="text-base font-bold text-gray-800">Recent Activity</h2>
                </div>
                <Link href="/admin/activity" className="text-sm font-semibold hover:underline flex items-center gap-1" style={{ color: '#041476' }}>
                  View All <LuArrowRight size={13} />
                </Link>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
                </div>
              ) : (stats.recentActivity || []).length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <LuHistory size={36} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-sm font-medium">No recent activity recorded yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {(stats.recentActivity || []).map(log => (
                    <div key={log._id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <ActionBadge action={log.action} />
                          <span className="text-xs text-gray-500 truncate">{log.entityLabel || log.entityType}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          by <span className="font-semibold text-gray-600">{log.actorName || 'system'}</span> ({log.actorRole})
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{formatDate(log.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Recent registrations ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-5">
                <span className="w-1 h-5 rounded-full inline-block bg-emerald-500" />
                <h2 className="text-base font-bold text-gray-800">New This Week</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50">
                      <LuUsers size={18} className="text-blue-600" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700">Students</p>
                  </div>
                  <span className="text-2xl font-extrabold text-blue-600">{stats.recentRegistrations?.students ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50">
                      <LuUserCheck size={18} className="text-emerald-600" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700">Teachers</p>
                  </div>
                  <span className="text-2xl font-extrabold text-emerald-600">{stats.recentRegistrations?.teachers ?? 0}</span>
                </div>
                <p className="text-xs text-gray-400 pt-2 border-t border-gray-50">Registrations in the last 7 days.</p>
              </div>
            </div>
          </div>

          {/* ── Quick actions (content & site management) ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1 h-5 rounded-full inline-block" style={{ background: '#041476' }} />
              <h2 className="text-base font-bold text-gray-800">Content & Site Management</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {ACTIONS.map(a => <ActionCard key={a.href} action={a} />)}
            </div>
          </div>

          <p className="text-center text-xs text-gray-300 pb-2">
            University of Makran, Panjgur — Admin Panel v1.0
          </p>
        </div>
      </div>
    </>
  );
}
