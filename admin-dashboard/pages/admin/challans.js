import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminHeader from '../../components/AdminHeader';
import axios from 'axios';
import { LuReceipt } from 'react-icons/lu';

const API = process.env.NEXT_PUBLIC_API_URL;

function getAdminToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('adminToken') || localStorage.getItem('token') || '';
}
function authHeaders() { return { headers: { Authorization: `Bearer ${getAdminToken()}` } }; }

const STATUS_BADGE = {
  generated: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  paid:      'bg-green-100  text-green-800  border-green-200',
  expired:   'bg-gray-100   text-gray-600   border-gray-200',
  cancelled: 'bg-red-100    text-red-800    border-red-200',
};

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ChallansPage() {
  const router = useRouter();
  const [challans, setChallans] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [status, setStatus]     = useState('');
  const [ready, setReady]       = useState(false);

  // Honor a ?status= query param from quick links (e.g. dashboard "Unpaid Challans")
  useEffect(() => {
    if (!router.isReady) return;
    if (typeof router.query.status === 'string') setStatus(router.query.status);
    setReady(true);
  }, [router.isReady]);

  const load = useCallback(async (statusFilter) => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const { data } = await axios.get(`${API}/portal/admin/reports/challans`, { ...authHeaders(), params });
      setChallans(data || []);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('adminToken');
        router.replace('/');
      }
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { if (ready) load(status); }, [ready, status, load]);

  const outstanding = challans.filter(c => c.status === 'generated').reduce((sum, c) => sum + (c.totalAmount || 0), 0);

  return (
    <>
      <Head><title>Fee Challans — Admin</title></Head>
      <AdminHeader />

      <div className="ml-0 lg:ml-56 min-h-screen bg-gray-50 p-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #041476, #0d2a90)' }}>
            <LuReceipt size={20} />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-primary">Fee Challans</h2>
            <p className="text-sm text-gray-500 mt-1">All fee challans issued to students, filterable by payment status.</p>
          </div>
        </div>

        {status === 'generated' && !loading && (
          <div className="mb-5 px-4 py-3 rounded-xl text-sm font-medium border bg-red-50 text-red-700 border-red-200">
            {challans.length} unpaid challan{challans.length !== 1 ? 's' : ''} · Rs {outstanding.toLocaleString()} outstanding
          </div>
        )}

        <div className="flex gap-2 mb-5 flex-wrap">
          {[['', 'All'], ['generated', 'Unpaid'], ['paid', 'Paid'], ['expired', 'Expired'], ['cancelled', 'Cancelled']].map(([val, lbl]) => (
            <button key={val} onClick={() => setStatus(val)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold border transition ${status === val ? 'text-white border-primary' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              style={status === val ? { background: '#041476' } : {}}>
              {lbl}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-16 text-center">
              <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: '#041476', borderTopColor: 'transparent' }} />
              <p className="text-gray-400 text-sm">Loading challans…</p>
            </div>
          ) : challans.length === 0 ? (
            <div className="p-16 text-center">
              <LuReceipt size={40} className="mx-auto mb-3 text-gray-200" />
              <p className="text-gray-500 font-medium">No fee challans found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Challan No', 'Student', 'Program / Sem', 'Amount', 'Due Date', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {challans.map(c => (
                    <tr key={c._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">{c.challanNo}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-800 whitespace-nowrap">{c.studentName}</p>
                        <p className="text-xs text-gray-400">{c.registrationNo}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{c.program || '—'} · Sem {c.semester}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-gray-700 whitespace-nowrap">Rs {(c.totalAmount || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(c.dueDate)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${STATUS_BADGE[c.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-5 py-3 border-t border-gray-50 bg-gray-50">
                <p className="text-xs text-gray-400">Showing {challans.length} challan{challans.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
