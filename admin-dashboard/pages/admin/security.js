import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import AdminHeader from '../../components/AdminHeader';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

function getToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('adminToken') || '';
}
function authH() { return { headers: { Authorization: `Bearer ${getToken()}` } }; }

function Alert({ type, msg }) {
  if (!msg) return null;
  const cls = type === 'error'
    ? 'bg-red-50 border-red-200 text-red-700'
    : 'bg-green-50 border-green-200 text-green-700';
  return <div className={`px-4 py-3 rounded-xl text-sm border mb-4 ${cls}`}>{msg}</div>;
}

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-50">
        <h3 className="font-bold text-gray-800">{title}</h3>
        {subtitle && <p className="text-gray-400 text-sm mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function SecuritySettings() {
  const [status, setStatus]   = useState(null); // { twoFactorEnabled, remainingRecoveryCodes }
  const [loading, setLoading] = useState(true);
  const [alert, setAlert]     = useState({ type: '', msg: '' });

  // Setup flow state
  const [qrCode, setQrCode]     = useState('');
  const [secret, setSecret]     = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [setupStep, setSetupStep] = useState('idle'); // idle | scan | verify | done

  // Recovery codes shown after enable
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [recoveryAcked, setRecoveryAcked] = useState(false);

  // Disable flow
  const [disablePassword, setDisablePassword] = useState('');
  const [disabling, setDisabling]             = useState(false);

  // Regenerate codes
  const [regenPassword, setRegenPassword]     = useState('');
  const [regening, setRegening]               = useState(false);
  const [newCodes, setNewCodes]               = useState([]);

  const flash = (msg, type = 'success') => {
    setAlert({ type, msg });
    setTimeout(() => setAlert({ type: '', msg: '' }), 5000);
  };

  useEffect(() => { fetchStatus(); }, []);

  async function fetchStatus() {
    try {
      const { data } = await axios.get(`${API}/2fa/status`, authH());
      setStatus(data);
    } catch { /* not authed yet */ }
    setLoading(false);
  }

  // ── Enable: step 1 — generate QR ─────────────────────────────────────────
  async function handleSetup() {
    try {
      const { data } = await axios.post(`${API}/2fa/setup`, {}, authH());
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setSetupStep('scan');
    } catch (err) {
      flash(err.response?.data?.message || 'Setup failed.', 'error');
    }
  }

  // ── Enable: step 2 — verify code ─────────────────────────────────────────
  async function handleEnable(e) {
    e.preventDefault();
    try {
      const { data } = await axios.post(`${API}/2fa/enable`, { code: setupCode }, authH());
      setRecoveryCodes(data.recoveryCodes);
      setSetupStep('done');
      setStatus(s => ({ ...s, twoFactorEnabled: true, remainingRecoveryCodes: 8 }));
      flash('2FA enabled successfully! Save your recovery codes below.');
    } catch (err) {
      flash(err.response?.data?.message || 'Verification failed.', 'error');
    }
  }

  // ── Disable ───────────────────────────────────────────────────────────────
  async function handleDisable(e) {
    e.preventDefault();
    setDisabling(true);
    try {
      await axios.post(`${API}/2fa/disable`, { password: disablePassword }, authH());
      setStatus(s => ({ ...s, twoFactorEnabled: false, remainingRecoveryCodes: 0 }));
      setDisablePassword('');
      setSetupStep('idle');
      setRecoveryCodes([]);
      flash('2FA has been disabled.');
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to disable 2FA.', 'error');
    }
    setDisabling(false);
  }

  // ── Regenerate recovery codes ─────────────────────────────────────────────
  async function handleRegen(e) {
    e.preventDefault();
    setRegening(true);
    try {
      const { data } = await axios.post(`${API}/2fa/regenerate-recovery-codes`, { password: regenPassword }, authH());
      setNewCodes(data.recoveryCodes);
      setRegenPassword('');
      setStatus(s => ({ ...s, remainingRecoveryCodes: 8 }));
      flash('Recovery codes regenerated. Save them now — they won\'t be shown again.');
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to regenerate codes.', 'error');
    }
    setRegening(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <AdminHeader />
        <div className="flex-1 flex items-center justify-center ml-0 lg:ml-56">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Head><title>Security Settings — Admin</title></Head>
      <AdminHeader />

      <div className="flex-1 ml-0 lg:ml-56 p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">

          <div className="mb-8">
            <h1 className="text-3xl font-black text-gray-900">Security Settings</h1>
            <p className="text-gray-500 mt-1 text-sm">Manage two-factor authentication and account security.</p>
          </div>

          <Alert type={alert.type} msg={alert.msg} />

          {/* ── 2FA Status Banner ── */}
          <div className={`rounded-2xl p-5 mb-6 flex items-center gap-4 border ${status?.twoFactorEnabled ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${status?.twoFactorEnabled ? 'bg-green-100' : 'bg-amber-100'}`}>
              {status?.twoFactorEnabled ? (
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>
            <div>
              <p className={`font-bold text-sm ${status?.twoFactorEnabled ? 'text-green-800' : 'text-amber-800'}`}>
                {status?.twoFactorEnabled ? '2FA is Enabled' : '2FA is Disabled'}
              </p>
              <p className={`text-xs mt-0.5 ${status?.twoFactorEnabled ? 'text-green-600' : 'text-amber-600'}`}>
                {status?.twoFactorEnabled
                  ? `Your account is protected. ${status.remainingRecoveryCodes} recovery code(s) remaining.`
                  : 'Enable 2FA to add an extra layer of security to your account.'}
              </p>
            </div>
          </div>

          {/* ── Enable 2FA ── */}
          {!status?.twoFactorEnabled && (
            <Section title="Enable Two-Factor Authentication" subtitle="Use Google Authenticator to generate one-time codes.">
              {setupStep === 'idle' && (
                <button onClick={handleSetup}
                  className="px-6 py-3 rounded-xl font-bold text-sm text-white transition hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg,#041476,#0a2580)' }}>
                  Set Up 2FA
                </button>
              )}

              {setupStep === 'scan' && (
                <div className="space-y-5">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
                    <p className="font-bold mb-1">Step 1 — Scan the QR code</p>
                    <p>Open <strong>Google Authenticator</strong> on your phone, tap <strong>"+"</strong> → <strong>"Scan QR code"</strong>, and scan the image below.</p>
                  </div>

                  <div className="flex justify-center">
                    {qrCode && <Image src={qrCode} alt="2FA QR Code" width={200} height={200} className="rounded-xl border border-gray-200 p-2" />}
                  </div>

                  <details className="text-xs text-gray-500">
                    <summary className="cursor-pointer hover:text-gray-700 font-medium">Can&apos;t scan? Enter key manually</summary>
                    <p className="mt-2 font-mono bg-gray-100 px-3 py-2 rounded-lg break-all select-all">{secret}</p>
                  </details>

                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-sm font-bold text-gray-700 mb-3">Step 2 — Enter the 6-digit code from the app to confirm</p>
                    <form onSubmit={handleEnable} className="flex gap-3">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={setupCode}
                        onChange={e => setSetupCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="123456"
                        maxLength={6}
                        className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono text-center tracking-widest focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        required
                      />
                      <button type="submit" disabled={setupCode.length < 6}
                        className="px-5 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-50 hover:opacity-90"
                        style={{ background: '#041476' }}>
                        Verify & Enable
                      </button>
                    </form>
                  </div>

                  <button onClick={() => setSetupStep('idle')} className="text-xs text-gray-400 hover:text-gray-600 underline">Cancel</button>
                </div>
              )}

              {setupStep === 'done' && recoveryCodes.length > 0 && !recoveryAcked && (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
                    <p className="font-bold text-amber-800 text-sm mb-1">⚠ Save your recovery codes now!</p>
                    <p className="text-amber-700 text-xs">These are shown <strong>only once</strong>. If you lose access to your authenticator app, use one of these codes to log in. Each code can be used only once.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {recoveryCodes.map((c, i) => (
                      <div key={i} className="font-mono text-sm bg-gray-900 text-green-400 px-3 py-2 rounded-lg text-center tracking-widest select-all">{c}</div>
                    ))}
                  </div>
                  <button onClick={() => setRecoveryAcked(true)}
                    className="w-full py-2.5 rounded-xl font-bold text-sm text-white"
                    style={{ background: '#041476' }}>
                    I&apos;ve saved these codes
                  </button>
                </div>
              )}

              {setupStep === 'done' && recoveryAcked && (
                <div className="text-center py-4">
                  <p className="text-4xl mb-2">✅</p>
                  <p className="font-bold text-green-700">2FA is now active on your account.</p>
                </div>
              )}
            </Section>
          )}

          {/* ── Disable 2FA ── */}
          {status?.twoFactorEnabled && (
            <Section title="Disable Two-Factor Authentication" subtitle="You will need your account password to confirm.">
              <form onSubmit={handleDisable} className="flex gap-3">
                <input
                  type="password"
                  value={disablePassword}
                  onChange={e => setDisablePassword(e.target.value)}
                  placeholder="Enter your password"
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  required
                />
                <button type="submit" disabled={disabling}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">
                  {disabling ? 'Disabling…' : 'Disable 2FA'}
                </button>
              </form>
              <p className="text-xs text-red-500 mt-2">Warning: Disabling 2FA reduces your account security.</p>
            </Section>
          )}

          {/* ── Regenerate Recovery Codes ── */}
          {status?.twoFactorEnabled && (
            <Section
              title="Recovery Codes"
              subtitle={`${status.remainingRecoveryCodes} of 8 codes remaining. Regenerating invalidates all old codes.`}
            >
              {newCodes.length > 0 && (
                <div className="mb-4 space-y-3">
                  <div className="bg-amber-50 border border-amber-300 rounded-xl p-3">
                    <p className="text-amber-800 text-xs font-bold">Save these new codes — old ones are now invalid.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {newCodes.map((c, i) => (
                      <div key={i} className="font-mono text-sm bg-gray-900 text-green-400 px-3 py-2 rounded-lg text-center tracking-widest select-all">{c}</div>
                    ))}
                  </div>
                </div>
              )}
              <form onSubmit={handleRegen} className="flex gap-3">
                <input
                  type="password"
                  value={regenPassword}
                  onChange={e => setRegenPassword(e.target.value)}
                  placeholder="Enter your password to confirm"
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  required
                />
                <button type="submit" disabled={regening}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                  {regening ? 'Regenerating…' : 'Regenerate'}
                </button>
              </form>
            </Section>
          )}

        </div>
      </div>
    </div>
  );
}
