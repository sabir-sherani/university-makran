import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import axios from 'axios';
import {
  LuLayoutDashboard,
  LuNewspaper,
  LuBuilding2,
  LuGraduationCap,
  LuBookOpen,
  LuUsers,
  LuBookMarked,
  LuBuilding,
  LuClipboardList,
  LuMessageSquare,
  LuMail,
  LuMenu,
  LuX,
  LuFileEdit,
  LuShieldCheck,
  LuUserCheck,
  LuSchool,
  LuImage,
  LuLogOut,
  LuLock,
  LuHistory,
  LuReceipt,
  LuCalendarRange,
} from 'react-icons/lu';

const API = process.env.NEXT_PUBLIC_API_URL;

const NAV = [
  { label: 'Dashboard',       href: '/admin/dashboard',      Icon: LuLayoutDashboard },
  { label: 'News & Events',   href: '/admin/news',           Icon: LuNewspaper },
  { label: 'Gallery',         href: '/admin/gallery',        Icon: LuImage },
  { label: 'Admissions',      href: '/admin/admissions',     Icon: LuFileEdit },
  { label: 'Administration',  href: '/admin/administration', Icon: LuBuilding2 },
  { label: 'Departments',     href: '/admin/departments',    Icon: LuGraduationCap },
  { label: 'Programs',        href: '/admin/programs',       Icon: LuBookOpen },
  { label: 'Academic Sessions', href: '/admin/academic-sessions', Icon: LuCalendarRange },
  { label: 'Faculty',         href: '/admin/faculty',        Icon: LuUsers },
  { label: 'Courses',         href: '/admin/courses',        Icon: LuBookMarked },
  { label: 'Facilities',      href: '/admin/facilities',     Icon: LuBuilding },
  { label: 'Portal Students', href: '/admin/students',       Icon: LuUserCheck },
  { label: 'Portal Teachers', href: '/admin/teachers',       Icon: LuSchool },
  { label: 'Applications',    href: '/admin/applications',   Icon: LuClipboardList },
  { label: 'Feedback',        href: '/admin/feedback',       Icon: LuMessageSquare },

  { label: 'Messages',        href: '/admin/messages',       Icon: LuMail },
  { label: 'Staff Roles',     href: '/admin/staff',          Icon: LuShieldCheck },
  { label: 'Corrections',     href: '/admin/correction-requests', Icon: LuFileEdit },
  { label: 'Fee Challans',    href: '/admin/challans',       Icon: LuReceipt },
  { label: 'Activity Log',    href: '/admin/activity',       Icon: LuHistory },
  { label: 'Security',        href: '/admin/security',       Icon: LuLock },
];

const BADGE_KEYS = {
  '/admin/messages':     'messages',
  '/admin/applications': 'applications',
  '/admin/feedback':     'feedback',
  '/admin/students':     'pendingStudents',
  '/admin/teachers':     'pendingTeachers',
  '/admin/correction-requests': 'pendingCorrectionRequests',
};

function getAdminToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('adminToken') || localStorage.getItem('token') || '';
}

export default function AdminHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifs, setNotifs] = useState({ messages: 0, applications: 0, feedback: 0, pendingStudents: 0, pendingTeachers: 0, pendingCorrectionRequests: 0 });
  const router = useRouter();

  useEffect(() => {
    async function fetchNotifs() {
      try {
        const { data } = await axios.get(`${API}/stats/notifications`);
        setNotifs(p => ({ ...p, ...data }));
      } catch { /* silent */ }
      try {
        const tok = getAdminToken();
        if (tok) {
          const { data } = await axios.get(`${API}/portal/admin/stats`, { headers: { Authorization: `Bearer ${tok}` } });
          setNotifs(p => ({
            ...p,
            pendingStudents: data.pendingStudents || 0,
            pendingTeachers: data.pendingTeachers || 0,
            pendingCorrectionRequests: data.pendingCorrectionRequests || 0,
          }));
        }
      } catch { /* silent */ }
    }
    fetchNotifs();
    const id = setInterval(fetchNotifs, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex">

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar — always expanded, sticky on desktop, drawer on mobile ── */}
      <aside
        className={`
          fixed left-0 top-0 z-40 flex flex-col h-screen w-56 overflow-y-auto
          transition-transform duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ background: 'linear-gradient(180deg, #041476 0%, #020b5e 100%)' }}
      >
        {/* Brand row */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Image src="/logo.png.webp" alt="UoMP" width={36} height={36} className="object-contain shrink-0" />
            <div className="min-w-0">
              <p className="text-white text-xs font-bold leading-tight truncate">University of Makran</p>
              <p className="text-white/40 text-[10px] font-medium uppercase tracking-wider">Admin Panel</p>
            </div>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden ml-2 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <LuX size={16} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {NAV.map(({ label, href, Icon }) => {
            const active     = router.pathname === href || router.pathname.startsWith(href + '/');
            const badgeKey   = BADGE_KEYS[href];
            const badgeCount = badgeKey ? (notifs[badgeKey] || 0) : 0;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`
                  relative flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1
                  transition-all duration-150 group
                  ${active
                    ? 'text-white'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'}
                `}
                style={active ? { background: 'rgba(255,255,255,0.15)' } : {}}
              >
                {/* Active indicator bar */}
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full bg-white" />
                )}

                <span className="relative shrink-0">
                  <Icon size={19} className={active ? 'text-white' : 'group-hover:scale-110 transition-transform duration-150'} />
                  {badgeCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </span>

                <span className="flex-1 flex items-center justify-between min-w-0">
                  <span className="text-sm font-medium truncate">{label}</span>
                  {badgeCount > 0 && (
                    <span className="ml-2 min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shrink-0">
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Logout + version */}
        <div className="px-3 py-3 border-t border-white/10 shrink-0 space-y-2">
          <button
            onClick={() => {
              localStorage.removeItem('adminToken');
              localStorage.removeItem('token');
              router.replace('/');
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/60 hover:bg-red-500/20 hover:text-red-300 transition-all duration-150 group"
          >
            <LuLogOut size={18} className="shrink-0 group-hover:scale-110 transition-transform duration-150" />
            <span className="text-sm font-medium">Logout</span>
          </button>
          <p className="text-white/25 text-[10px] font-medium text-center uppercase tracking-wider">UoMP v1.0</p>
        </div>
      </aside>

      {/* Mobile hamburger — shown only when sidebar is hidden */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-white shadow text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <LuMenu size={20} />
      </button>

    </div>
  );
}
