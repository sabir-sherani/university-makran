import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import '../styles/globals.css';

// Global 401 interceptor — if any API call returns Unauthorized, clear session and boot to login
if (typeof window !== 'undefined') {
  axios.interceptors.response.use(
    res => res,
    err => {
      if (err.response?.status === 401) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');
        localStorage.removeItem('token');
        window.location.replace('/');
      }
      return Promise.reject(err);
    }
  );
}

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  // null = checking, true = authorized, false = unauthorized
  const [authState, setAuthState] = useState(null);

  useEffect(() => {
    const isAdminRoute = router.pathname.startsWith('/admin');

    if (!isAdminRoute) {
      // Login page and any other public pages — always allowed
      setAuthState(true);
      return;
    }

    const token = localStorage.getItem('adminToken');
    if (!token) {
      // No token → send to login, keep screen blank while redirecting
      setAuthState(false);
      router.replace('/');
    } else {
      setAuthState(true);
    }
  }, [router.pathname]);

  // Non-admin pages render immediately without any check
  if (!router.pathname.startsWith('/admin')) {
    return <Component {...pageProps} />;
  }

  // While auth is still being evaluated show a blank navy screen
  // (prevents any flash of admin UI to unauthenticated users)
  if (authState !== true) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #041476 0%, #020b5e 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <svg
            style={{ margin: '0 auto 12px', display: 'block', animation: 'spin 1s linear infinite', width: 28, height: 28 }}
            viewBox="0 0 24 24" fill="none"
          >
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="rgba(255,255,255,0.7)" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Verifying access…
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return <Component {...pageProps} />;
}

export default MyApp;
