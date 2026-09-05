// HOD Profile section — read-only official record + password change
// (Phase 6, 6.1 — new). Wired to the existing GET /profile endpoint and a
// new PATCH /profile/password route.
//
// Contradiction with prompts/phase-6.md: the phase text says to wire 2FA to
// "the existing /api/2fa routes" — those routes (routes/twoFactor.js) are
// admin-only (verifyAdminToken), not available to any other role including
// HOD. Rather than silently building against an endpoint that doesn't
// accept an HOD token, 2FA is left out of this section; see the summary
// given to the user for this project.
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Alert, inputCls, labelCls, Spinner } from '../ui.js';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function ProfileSection({ hod, token, onTokenRefresh }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;
    axios.get(`${API}/portal/hod/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => { if (!cancelled) setProfile(data); })
      .catch(() => { if (!cancelled) setProfile(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (form.newPassword !== form.confirmPassword) { setError('New password and confirmation do not match.'); return; }
    setSaving(true);
    try {
      const { data } = await axios.patch(`${API}/portal/hod/profile/password`,
        { currentPassword: form.currentPassword, newPassword: form.newPassword },
        { headers: { Authorization: `Bearer ${token}` } });
      setSuccess('Password changed.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      if (data.token && onTokenRefresh) onTokenRefresh(data.token);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password.');
    }
    setSaving(false);
  };

  return (
    <>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Profile</h2>
      {loading ? <Spinner /> : !profile ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400 shadow-sm">Could not load profile.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h3 className="font-bold text-gray-800 mb-4">Official Record</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {[
              ['HOD ID', profile.hodId], ['Full Name', profile.fullName], ['Email', profile.email],
              ['Phone', profile.phone || '—'], ['Department', profile.department], ['Designation', profile.designation],
              ['Qualification', profile.qualification || '—'], ['Status', profile.status],
            ].map(([k, v]) => (
              <div key={k} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 uppercase font-bold">{k}</p>
                <p className="font-semibold text-gray-800 mt-0.5">{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-lg">
        <h3 className="font-bold text-gray-800 mb-4">Change Password</h3>
        <Alert type="error" msg={error} />
        <Alert type="success" msg={success} />
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className={labelCls}>Current Password</label>
            <input type="password" required value={form.currentPassword} onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>New Password</label>
            <input type="password" required minLength={8} value={form.newPassword} onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Confirm New Password</label>
            <input type="password" required value={form.confirmPassword} onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))} className={inputCls} />
          </div>
          <button type="submit" disabled={saving} className="px-6 py-2.5 min-h-11 rounded-xl text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-50" style={{ background: '#4338ca' }}>
            {saving ? 'Saving…' : 'Change Password'}
          </button>
        </form>
      </div>
    </>
  );
}
