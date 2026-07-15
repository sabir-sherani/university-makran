import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

// ── Shared icon helpers ───────────────────────────────────────────────────────
function ShieldIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

export default function AdminLogin() {
  const router = useRouter();

  // Login step: 'credentials' | '2fa'
  const [step, setStep]         = useState('credentials');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  // 2FA step
  const [tempToken, setTempToken]     = useState('');
  const [otpDigits, setOtpDigits]     = useState(['', '', '', '', '', '']);
  const [useRecovery, setUseRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const digitRefs = useRef([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('adminToken')) {
      router.replace('/admin/dashboard');
    }
  }, []);

  // ── Step 1: email + password ────────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await axios.post(`${API}/2fa/login`, { email, password });

      if (data.requires2FA) {
        setTempToken(data.tempToken);
        setStep('2fa');
      } else {
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminData', JSON.stringify(data.admin));
        router.push('/admin/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    }
    setLoading(false);
  }

  // ── OTP digit box handling ──────────────────────────────────────────────────
  function handleDigit(i, val) {
    const cleaned = val.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[i] = cleaned;
    setOtpDigits(next);
    if (cleaned && i < 5) digitRefs.current[i + 1]?.focus();
  }

  function handleDigitKey(i, e) {
    if (e.key === 'Backspace' && !otpDigits[i] && i > 0) {
      digitRefs.current[i - 1]?.focus();
    }
  }

  function handleDigitPaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtpDigits(pasted.split(''));
      digitRefs.current[5]?.focus();
    }
  }

  // ── Step 2: verify 2FA code ─────────────────────────────────────────────────
  async function handleVerify2FA(e) {
    e.preventDefault();
    setLoading(true); setError('');
    const code = useRecovery ? recoveryCode.trim() : otpDigits.join('');
    if (!useRecovery && code.length < 6) {
      setError('Please enter all 6 digits.'); setLoading(false); return;
    }
    try {
      const { data } = await axios.post(`${API}/2fa/verify-login`, { tempToken, code });
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminData', JSON.stringify(data.admin));
      router.push('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid code. Please try again.');
      if (!useRecovery) setOtpDigits(['', '', '', '', '', '']);
      digitRefs.current[0]?.focus();
    }
    setLoading(false);
  }

  // ── Shared error box ────────────────────────────────────────────────────────
  function ErrorBox({ msg }) {
    if (!msg) return null;
    return (
      <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
        <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {msg}
      </div>
    );
  }

  return (
    <>
      <Head><title>Admin Login — University of Makran</title></Head>

      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #020b5e 0%, #041476 50%, #0a2580 100%)' }}>

        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="w-full max-w-md relative">

          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShieldIcon className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-blue-200 text-sm mt-1">University of Makran, Panjgur</p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #FA7902, #ff9a3c)' }} />

            <div className="p-8">

              {/* ── Credentials step ── */}
              {step === 'credentials' && (
                <>
                  <h2 className="text-xl font-bold text-gray-800 mb-1">Sign in to continue</h2>
                  <p className="text-gray-400 text-sm mb-7">Enter your admin credentials below</p>
                  <ErrorBox msg={error} />
                  <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email Address</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                          </svg>
                        </div>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                          placeholder="admin@uomp.edu.pk"
                          className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Password</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                          placeholder="••••••••"
                          className="w-full pl-11 pr-12 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all" />
                        <button type="button" onClick={() => setShowPw(p => !p)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600" tabIndex={-1}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            {showPw
                              ? <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              : <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                            }
                          </svg>
                        </button>
                      </div>
                    </div>
                    <button type="submit" disabled={loading}
                      className="w-full flex items-center justify-center gap-2 py-3.5 font-bold text-white rounded-xl transition-all disabled:opacity-60 text-sm"
                      style={{ background: 'linear-gradient(135deg, #041476, #0a2580)', boxShadow: '0 8px 24px rgba(4,20,118,0.35)' }}>
                      {loading ? (
                        <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg> Signing in…</>
                      ) : (
                        <>Sign In <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></>
                      )}
                    </button>
                  </form>
                </>
              )}

              {/* ── 2FA step ── */}
              {step === '2fa' && (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#eef0fb' }}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ color: '#041476' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-800">Two-Factor Authentication</h2>
                      <p className="text-gray-400 text-xs mt-0.5">Open Google Authenticator and enter the code</p>
                    </div>
                  </div>

                  <ErrorBox msg={error} />

                  <form onSubmit={handleVerify2FA} className="space-y-5">
                    {!useRecovery ? (
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 text-center">6-Digit Code</label>
                        <div className="flex gap-2 justify-center" onPaste={handleDigitPaste}>
                          {otpDigits.map((d, i) => (
                            <input
                              key={i}
                              ref={el => digitRefs.current[i] = el}
                              type="text"
                              inputMode="numeric"
                              maxLength={1}
                              value={d}
                              onChange={e => handleDigit(i, e.target.value)}
                              onKeyDown={e => handleDigitKey(i, e)}
                              className="w-11 h-14 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                              style={d ? { borderColor: '#041476' } : {}}
                            />
                          ))}
                        </div>
                        <p className="text-center text-xs text-gray-400 mt-3">Code refreshes every 30 seconds</p>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Recovery Code</label>
                        <input
                          type="text"
                          value={recoveryCode}
                          onChange={e => setRecoveryCode(e.target.value)}
                          placeholder="XXXXXX-XXXXXX-XXXXXX"
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-center tracking-widest"
                          required
                        />
                        <p className="text-xs text-amber-600 mt-2 text-center">⚠ Each recovery code can only be used once.</p>
                      </div>
                    )}

                    <button type="submit" disabled={loading}
                      className="w-full flex items-center justify-center gap-2 py-3.5 font-bold text-white rounded-xl transition-all disabled:opacity-60 text-sm"
                      style={{ background: 'linear-gradient(135deg, #041476, #0a2580)', boxShadow: '0 8px 24px rgba(4,20,118,0.35)' }}>
                      {loading ? (
                        <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg> Verifying…</>
                      ) : 'Verify & Sign In'}
                    </button>
                  </form>

                  <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                    <button onClick={() => { setStep('credentials'); setError(''); setOtpDigits(['','','','','','']); }}
                      className="hover:text-gray-600 underline underline-offset-2">← Back to login</button>
                    <button onClick={() => { setUseRecovery(r => !r); setError(''); }}
                      className="hover:text-gray-600 underline underline-offset-2">
                      {useRecovery ? 'Use authenticator app' : 'Use recovery code'}
                    </button>
                  </div>
                </>
              )}

              <p className="text-center text-gray-400 text-xs mt-6">
                Restricted access — authorized personnel only
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
