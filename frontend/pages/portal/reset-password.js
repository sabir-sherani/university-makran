import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function ResetPassword() {
  const router = useRouter();
  const { token } = router.query;

  const [newPassword, setNewPassword]   = useState('');
  const [confirmPw, setConfirmPw]       = useState('');
  const [showPw, setShowPw]             = useState(false);
  const [loading, setLoading]           = useState(false);
  const [msg, setMsg]                   = useState({ type: '', text: '' });
  const [done, setDone]                 = useState(false);

  useEffect(() => {
    if (router.isReady && !token) {
      setMsg({ type: 'error', text: 'Invalid or missing reset token. Please request a new password reset link.' });
    }
  }, [router.isReady, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) return setMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
    if (newPassword !== confirmPw)  return setMsg({ type: 'error', text: 'Passwords do not match.' });

    setLoading(true); setMsg({ type: '', text: '' });
    try {
      const { data } = await axios.post(`${API}/portal/student/reset-password`, { token, newPassword });
      setMsg({ type: 'success', text: data.message });
      setDone(true);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Reset failed. The link may have expired.' });
    }
    setLoading(false);
  };

  return (
    <>
      <Head><title>Reset Password — University of Makran Student Portal</title></Head>

      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md">

          {/* Brand header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-4"
              style={{ background: 'linear-gradient(135deg,#041476,#0a2580)' }}>
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Reset Your Password</h1>
            <p className="text-gray-400 text-sm mt-1">University of Makran — Student Portal</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

            {msg.text && (
              <div className={`mb-5 px-4 py-3 rounded-xl text-sm font-medium ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {msg.text}
              </div>
            )}

            {!done ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">New Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                      placeholder="At least 6 characters"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition pr-16"
                    />
                    <button type="button" onClick={() => setShowPw(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 font-medium">
                      {showPw ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Confirm New Password</label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    required
                    placeholder="Re-enter your new password"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
                  />
                </div>

                <button type="submit" disabled={loading || !token}
                  className="w-full py-3 rounded-xl font-bold text-sm text-white transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#041476,#0a2580)' }}>
                  {loading ? 'Resetting…' : 'Set New Password'}
                </button>
              </form>
            ) : (
              <button onClick={() => router.push('/portal/student')}
                className="w-full py-3 rounded-xl font-bold text-sm text-white transition hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#041476,#0a2580)' }}>
                Go to Student Login
              </button>
            )}

            <p className="text-center text-xs text-gray-400 mt-5">
              Remember your password?{' '}
              <button onClick={() => router.push('/portal/student')} className="text-blue-600 hover:underline font-semibold">
                Log in here
              </button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
