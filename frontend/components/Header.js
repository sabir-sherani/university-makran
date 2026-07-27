import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { Menu, X, Search, Mail, Phone, ChevronDown } from 'lucide-react';
import { FaFacebook, FaLinkedin } from 'react-icons/fa';
import axios from 'axios';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen]       = useState(false);
  const [dropdownOpen, setDropdownOpen]   = useState(null);
  const [mobileExp, setMobileExp]         = useState(null);
  const [searchQuery, setSearchQuery]     = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [deptList, setDeptList]           = useState([]);
  const [adminDeptList, setAdminDeptList] = useState([]);
  const [suggestions, setSuggestions]     = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);
  const router    = useRouter();

  useEffect(() => {
    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/departments`).then(r => setDeptList(r.data || [])).catch(() => {});
    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin-depts`).then(r => setAdminDeptList(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (searchQuery.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    const t = setTimeout(() => {
      axios.get(`${process.env.NEXT_PUBLIC_API_URL}/search`, { params: { q: searchQuery, limit: 6 } })
        .then(r => { setSuggestions(r.data.results || []); setShowSuggestions(true); })
        .catch(() => setSuggestions([]));
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    const h = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowSuggestions(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => { setShowSuggestions(false); }, [router.pathname, router.query]);

  const navLinks = [
    { label: 'Home', href: '/' },
    {
      label: 'About', href: '/about',
      dropdown: [
        { label: 'About Us', href: '/about' },
        { label: 'Gallery',  href: '/gallery' },
      ],
    },
    { label: 'Admission', href: '/admission' },
    {
      label: 'Administration', href: '/administration', mega: true,
      dropdown: [
        { label: 'Overview', href: '/administration' },
        ...adminDeptList.filter(d => d.slug).map(d => ({ label: d.name, href: `/administration/${d.slug}` })),
      ],
    },
    {
      label: 'Departments', href: '/departments', mega: true,
      dropdown: [
        { label: 'All Departments', href: '/departments' },
        ...deptList.filter(d => d.slug).map(d => ({ label: d.name, href: `/departments/${d.slug}` })),
      ],
    },
    {
      label: 'Programs', href: '/programs',
      dropdown: [
        { label: 'All Programs',     href: '/programs' },
        { label: 'Science Programs', href: '/science-programs' },
        { label: 'Arts Programs',    href: '/arts-programs' },
        { label: 'Facilities',       href: '/facilities' },
      ],
    },
    { label: 'Portal',     href: '/portal' },
    { label: 'Contact',             href: '/contact' },
  ];

  function handleSearch(e) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery(''); setSuggestions([]); setShowSuggestions(false);
    }
  }
  function handleSuggestionClick() { setSearchQuery(''); setSuggestions([]); setShowSuggestions(false); }

  const activeNavLink = (link) => link.dropdown
    ? router.pathname.startsWith(link.href)
    : router.pathname === link.href;

  return (
    <header className="sticky top-0 z-50" style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.12)' }}>

      {/* ── TOP BAR ── */}
      <div style={{ background: '#0b1229', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="container">
          <div className="flex items-center justify-between py-1.5">

            {/* Left: email · phone */}
            <div className="hidden md:flex items-center gap-0 text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
              <a href="mailto:info@uomp.edu.pk"
                className="flex items-center gap-1.5 pr-4 transition-colors hover:text-white"
                style={{ color: 'inherit' }}>
                <Mail size={12} strokeWidth={1.5} />
                <span>info@uomp.edu.pk</span>
              </a>
              <span style={{ width: 1, height: 13, background: 'rgba(255,255,255,0.18)', display: 'inline-block', margin: '0 12px' }} />
              <a href="tel:0855642053"
                className="flex items-center gap-1.5 transition-colors hover:text-white"
                style={{ color: 'inherit' }}>
                <Phone size={12} strokeWidth={1.5} />
                <span>0855-642053</span>
              </a>
            </div>

            {/* Right: globe · share · search */}
            <div className="flex items-center gap-3 ml-auto">

              {/* Social icons */}
              <a href="https://www.facebook.com/UniversityofMakran/" target="_blank" rel="noopener noreferrer"
                className="hidden md:flex items-center justify-center transition-colors"
                style={{ color: 'rgba(255,255,255,0.45)' }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.45)'}>
                <FaFacebook size={15} />
              </a>
              <a href="https://www.linkedin.com/school/university-of-makran-panjgur/" target="_blank" rel="noopener noreferrer"
                className="hidden md:flex items-center justify-center transition-colors"
                style={{ color: 'rgba(255,255,255,0.45)' }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.45)'}>
                <FaLinkedin size={15} />
              </a>

              {/* Search — icon on the RIGHT */}
              <div ref={searchRef} className="relative">
                <form onSubmit={handleSearch}>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded transition-all duration-200"
                    style={{
                      background: searchFocused ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${searchFocused ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.1)'}`,
                    }}>
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onFocus={() => setSearchFocused(true)}
                      onBlur={() => setSearchFocused(false)}
                      className="bg-transparent outline-none text-xs"
                      style={{
                        color: '#fff',
                        width: searchFocused ? '140px' : '80px',
                        transition: 'width 0.25s',
                      }}
                      placeholder="Search..."
                      autoComplete="off"
                    />
                    <button type="submit" className="shrink-0 transition-colors"
                      style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 0 }}
                      onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.45)'}>
                      <Search size={13} strokeWidth={2} />
                    </button>
                  </div>
                </form>

                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute right-0 top-full mt-1.5 w-80 rounded-xl shadow-2xl z-50 overflow-hidden"
                    style={{ background: '#0f1923', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {suggestions.map(item => (
                      <Link key={`${item.category}-${item.id}`} href={item.url}
                        className="flex items-start gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors border-b border-white/5"
                        onClick={handleSuggestionClick}>
                        <span className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ background: item.categoryColor }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate" style={{ color: 'rgba(255,255,255,0.9)' }}>{item.title}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                            {item.category}{item.meta ? ` · ${item.meta}` : ''}
                          </p>
                        </div>
                      </Link>
                    ))}
                    <Link href={`/search?q=${encodeURIComponent(searchQuery)}`}
                      className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold hover:bg-white/5 transition-colors"
                      style={{ color: '#818cf8' }} onClick={handleSuggestionClick}>
                      <Search size={11} /> See all results for &ldquo;{searchQuery}&rdquo;
                    </Link>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── MAIN NAVBAR (WHITE) ── */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #e8ecf4' }}>
        <div className="container">
          <div className="flex items-center justify-between py-2.5 gap-4">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 shrink-0 group">
              <Image src="/logo.png.webp" alt="UoMP" width={68} height={68} className="object-contain shrink-0" />
              <div className="leading-tight">
                <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: '#041476', fontSize: '1.15rem', letterSpacing: '0.01em', lineHeight: 1.2 }}>
                  University of Makran
                </div>
                <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.18em', color: '#7c8db0', textTransform: 'uppercase', marginTop: 3 }}>
                  Panjgur &nbsp;·&nbsp; UoMP
                </div>
              </div>
            </Link>

            {/* Desktop nav */}
            <div className="hidden lg:flex items-center gap-0.5">
              {navLinks.map(link => {
                const isActive = activeNavLink(link);
                const isOpen   = dropdownOpen === link.label;

                if (link.dropdown) {
                  return (
                    <div key={link.href} className="relative"
                      onMouseEnter={() => setDropdownOpen(link.label)}
                      onMouseLeave={() => setDropdownOpen(null)}>
                      <button className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150 relative"
                        style={{ color: isActive || isOpen ? '#041476' : '#374151' }}>
                        {link.label}
                        <ChevronDown size={12} className="transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
                        {isActive && <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full" style={{ background: '#FA7902' }} />}
                      </button>

                      {isOpen && link.mega ? (
                        <div className="absolute top-full mt-0 rounded-xl shadow-2xl z-30 overflow-hidden"
                          style={{ background: '#041476', border: '1px solid rgba(255,255,255,0.1)', width: 'max-content', minWidth: 340, maxWidth: 560, left: 0 }}>
                          {/* Header row */}
                          <Link href={link.dropdown[0].href}
                            className="flex items-center justify-between px-5 py-3.5 text-sm font-bold transition-colors"
                            style={{ color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.07)' }}
                            onClick={() => setDropdownOpen(null)}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(250,121,2,0.15)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}>
                            <span>{link.dropdown[0].label}</span>
                            <span className="text-xs font-semibold ml-8" style={{ color: '#FA7902' }}>View all →</span>
                          </Link>
                          {/* Grid items */}
                          <div className="p-3" style={{ columns: 2, columnGap: 4 }}>
                            {link.dropdown.slice(1).map(item => (
                              <div key={item.href} style={{ breakInside: 'avoid' }}>
                                <Link href={item.href}
                                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
                                  style={{ color: router.pathname === item.href ? '#FA7902' : 'rgba(255,255,255,0.78)' }}
                                  onClick={() => setDropdownOpen(null)}
                                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(250,121,2,0.15)'; e.currentTarget.style.color = '#FA7902'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = router.pathname === item.href ? '#FA7902' : 'rgba(255,255,255,0.78)'; }}>
                                  <span className="shrink-0 rounded-full"
                                    style={{ width: 6, height: 6, background: router.pathname === item.href ? '#FA7902' : 'rgba(255,255,255,0.3)' }} />
                                  {item.label}
                                </Link>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : isOpen ? (
                        <div className="absolute top-full left-0 mt-0 py-1.5 rounded-xl shadow-2xl min-w-[200px] z-30 overflow-hidden"
                          style={{ background: '#041476', border: '1px solid rgba(255,255,255,0.1)' }}>
                          {link.dropdown.map(item => (
                            <Link key={item.href} href={item.href}
                              className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-all duration-150"
                              style={{ color: router.pathname === item.href ? '#FA7902' : 'rgba(255,255,255,0.78)' }}
                              onClick={() => setDropdownOpen(null)}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(250,121,2,0.15)'; e.currentTarget.style.color = '#FA7902'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = router.pathname === item.href ? '#FA7902' : 'rgba(255,255,255,0.78)'; }}>
                              <span className="shrink-0 rounded-full"
                                style={{ width: 6, height: 6, background: router.pathname === item.href ? '#FA7902' : 'rgba(255,255,255,0.3)' }} />
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                }

                return (
                  <Link key={link.href} href={link.href}
                    className="relative px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-150"
                    style={{ color: isActive ? '#041476' : '#374151' }}>
                    {link.label}
                    {isActive && <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full" style={{ background: '#FA7902' }} />}
                    {!isActive && <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full scale-x-0 hover:scale-x-100 transition-transform duration-200 origin-left" style={{ background: '#FA7902', opacity: 0.4 }} />}
                  </Link>
                );
              })}
            </div>

            {/* Mobile hamburger */}
            <button className="lg:hidden p-2 rounded-lg transition-colors hover:bg-gray-100"
              onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu"
              style={{ color: '#374151' }}>
              {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>

          {/* ── MOBILE MENU ── */}
          {isMenuOpen && (
            <div className="lg:hidden border-t pb-4 pt-3 flex flex-col gap-1" style={{ borderColor: '#e5e7eb' }}>
              {/* Mobile contact info */}
              <div className="flex flex-col gap-2 mb-3 px-3 py-3 rounded-lg" style={{ background: '#f8f9fe' }}>
                <a href="mailto:info@uomp.edu.pk" className="flex items-center gap-2 text-xs text-gray-500 hover:text-blue-700">
                  <Mail size={12} /> info@uomp.edu.pk
                </a>
                <a href="tel:0855642053" className="flex items-center gap-2 text-xs text-gray-500 hover:text-blue-700">
                  <Phone size={12} /> 0855-642053
                </a>
              </div>

              {navLinks.map(link => {
                if (link.dropdown) {
                  const isExpanded = mobileExp === link.label;
                  return (
                    <div key={link.href}>
                      <button
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-gray-50"
                        style={{ color: router.pathname.startsWith(link.href) ? '#041476' : '#374151' }}
                        onClick={() => setMobileExp(isExpanded ? null : link.label)}>
                        {link.label}
                        <ChevronDown size={14} className="transition-transform duration-200"
                          style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }} />
                      </button>
                      {isExpanded && (
                        <div className="ml-4 mt-1 flex flex-col gap-0.5">
                          {link.dropdown.map(item => (
                            <Link key={item.href} href={item.href}
                              className="px-3 py-2 rounded-lg text-sm transition-colors hover:bg-blue-50 flex items-center gap-2"
                              style={{ color: router.pathname === item.href ? '#041476' : '#6b7280' }}
                              onClick={() => { setIsMenuOpen(false); setMobileExp(null); }}>
                              <span className="w-1 h-1 rounded-full bg-current opacity-50" />
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
                return (
                  <Link key={link.href} href={link.href}
                    className="px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-gray-50"
                    style={{ color: router.pathname === link.href ? '#041476' : '#374151' }}
                    onClick={() => setIsMenuOpen(false)}>
                    {link.label}
                  </Link>
                );
              })}

            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
