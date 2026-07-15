import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import AdminHeader from '../../components/AdminHeader';
import axios from 'axios';

const API  = process.env.NEXT_PUBLIC_API_URL;
const BASE = API ? API.replace('/api', '') : 'http://localhost:5000';

/* ── tiny helpers ───────────────────────────────────────────────── */
function Msg({ text }) {
  if (!text) return null;
  const isErr = /error|failed|invalid/i.test(text);
  return (
    <div className={`mb-4 px-4 py-2 rounded text-sm ${isErr ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
      {text}
    </div>
  );
}


const emptyNotice = {
  title: '', description: '', date: '', lastDate: '',
  link: '', image: null, pdf: null, published: true,
};

/* ════════════════════════════════════════════════════════════════════
   PAGE
════════════════════════════════════════════════════════════════════ */
export default function AdminAdmissions() {
  const [tab, setTab] = useState('notices'); // 'notices' | 'content' | 'schedule'

  /* ── Notices state ─────────────────────────────────────────────── */
  const [notices,      setNotices]      = useState([]);
  const [noticeForm,   setNoticeForm]   = useState(emptyNotice);
  const [editNoticeId, setEditNoticeId] = useState(null);
  const [noticeSaving, setNoticeSaving] = useState(false);
  const [noticeMsg,    setNoticeMsg]    = useState('');
  const [imgPreview,   setImgPreview]   = useState('');
  const [pdfPreview,   setPdfPreview]   = useState('');
  const imgRef = useRef(); const pdfRef = useRef();


  /* ── Load all data on mount ────────────────────────────────────── */
  useEffect(() => { loadNotices(); }, []);

  async function loadNotices() {
    try {
      const { data } = await axios.get(`${API}/admission-content/notices/all`);
      setNotices(data || []);
    } catch { /* silent */ }
  }


  /* ══════════════════════════════════════════════════════════════
     NOTICES handlers
  ══════════════════════════════════════════════════════════════ */
  function handleNoticeField(e) {
    const { name, value, type, checked } = e.target;
    setNoticeForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  }
  function handleImg(e) {
    const f = e.target.files?.[0]; if (!f) return;
    setNoticeForm(p => ({ ...p, image: f }));
    setImgPreview(URL.createObjectURL(f));
  }
  function handlePdf(e) {
    const f = e.target.files?.[0]; if (!f) return;
    setNoticeForm(p => ({ ...p, pdf: f }));
    setPdfPreview(f.name);
  }
  function resetNoticeForm() {
    setNoticeForm(emptyNotice); setEditNoticeId(null);
    setImgPreview(''); setPdfPreview(''); setNoticeMsg('');
    if (imgRef.current) imgRef.current.value = '';
    if (pdfRef.current) pdfRef.current.value = '';
  }
  function startEditNotice(item) {
    setEditNoticeId(item._id);
    setNoticeForm({
      title: item.title || '', description: item.description || '',
      date:     item.date     ? item.date.split('T')[0]     : '',
      lastDate: item.lastDate ? item.lastDate.split('T')[0] : '',
      link:  item.link || '', image: null, pdf: null,
      published: item.published !== false,
    });
    setImgPreview(item.image ? `${BASE}${item.image}` : '');
    setPdfPreview(item.pdf   ? item.pdf.split('/').pop() : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function submitNotice(e) {
    e.preventDefault(); setNoticeSaving(true); setNoticeMsg('');
    try {
      const fd = new FormData();
      fd.append('title',       noticeForm.title);
      fd.append('description', noticeForm.description);
      fd.append('date',        noticeForm.date || new Date().toISOString());
      fd.append('lastDate',    noticeForm.lastDate || '');
      fd.append('link',        noticeForm.link);
      fd.append('published',   noticeForm.published ? 'true' : 'false');
      if (noticeForm.image) fd.append('image', noticeForm.image);
      if (noticeForm.pdf)   fd.append('pdf',   noticeForm.pdf);

      if (editNoticeId) {
        await axios.put(`${API}/admission-content/notices/${editNoticeId}`, fd);
        setNoticeMsg('Notice updated.');
      } else {
        await axios.post(`${API}/admission-content/notices`, fd);
        setNoticeMsg('Notice added.');
      }
      resetNoticeForm(); loadNotices();
    } catch (err) {
      setNoticeMsg(err.response?.data?.message || 'Error saving notice.');
    }
    setNoticeSaving(false);
  }
  async function deleteNotice(id) {
    if (!confirm('Delete this notice? This cannot be undone.')) return;
    try { await axios.delete(`${API}/admission-content/notices/${id}`); loadNotices(); }
    catch { alert('Error deleting notice.'); }
  }


  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  const tabs = [
    { key: 'notices',  label: 'Notices & News' },
  ];

  return (
    <>
      <Head><title>Manage Admissions — Admin Dashboard</title></Head>
      <AdminHeader />

      <div className="ml-0 lg:ml-56 p-8">
        <h2 className="text-3xl font-bold text-primary mb-2">Manage Admissions</h2>
        <p className="text-gray-500 mb-8 text-sm">
          Upload notices, manage eligibility criteria, required documents, and admission schedule.
        </p>

        {/* Tab bar */}
        <div className="flex gap-2 mb-8 border-b border-gray-200">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-colors -mb-px border-b-2 ${
                tab === t.key
                  ? 'border-primary text-primary bg-white'
                  : 'border-transparent text-gray-500 hover:text-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ─────────────────────────────────────────────────────────
            TAB 1 — NOTICES
        ───────────────────────────────────────────────────────── */}
        {tab === 'notices' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Form */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
                <h3 className="text-lg font-bold text-primary mb-5">
                  {editNoticeId ? 'Edit Notice' : 'Add Notice'}
                </h3>
                <Msg text={noticeMsg} />

                <form onSubmit={submitNotice} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input name="title" value={noticeForm.title} onChange={handleNoticeField}
                      required placeholder="Notice headline" className="admin-input" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea name="description" value={noticeForm.description}
                      onChange={handleNoticeField} rows={3}
                      placeholder="Brief description or body text" className="admin-input" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Announcement Date</label>
                      <input name="date" type="date" value={noticeForm.date}
                        onChange={handleNoticeField} className="admin-input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Date <span className="text-gray-400 font-normal">(deadline)</span>
                      </label>
                      <input name="lastDate" type="date" value={noticeForm.lastDate}
                        onChange={handleNoticeField} className="admin-input" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Image <span className="text-gray-400 font-normal">(JPG / PNG / WEBP, max 10 MB)</span>
                    </label>
                    <input ref={imgRef} type="file" accept=".jpg,.jpeg,.png,.webp"
                      onChange={handleImg} className="admin-input text-sm" />
                    {imgPreview && (
                      <img src={imgPreview} alt="preview"
                        className="mt-2 w-full h-28 object-cover rounded-lg border" />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Eligibility &amp; Documents PDF <span className="text-gray-400 font-normal">(max 10 MB)</span>
                    </label>
                    <p className="text-xs text-gray-400 mb-1.5">Upload the eligibility criteria or required documents as a PDF — it will appear as a downloadable section under this notice.</p>
                    <input ref={pdfRef} type="file" accept=".pdf"
                      onChange={handlePdf} className="admin-input text-sm" />
                    {pdfPreview && (
                      <p className="mt-1 text-xs text-gray-500 truncate">
                        📄 {pdfPreview}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      External Link <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input name="link" value={noticeForm.link} onChange={handleNoticeField}
                      placeholder="https://..." className="admin-input" />
                  </div>

                  <div className="flex items-center gap-2">
                    <input id="n-pub" name="published" type="checkbox"
                      checked={noticeForm.published} onChange={handleNoticeField}
                      className="w-4 h-4 accent-primary" />
                    <label htmlFor="n-pub" className="text-sm text-gray-700">Published</label>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="submit" disabled={noticeSaving}
                      className="admin-btn admin-btn-primary flex-1">
                      {noticeSaving ? 'Saving…' : editNoticeId ? 'Update Notice' : 'Add Notice'}
                    </button>
                    {editNoticeId && (
                      <button type="button" onClick={resetNoticeForm}
                        className="admin-btn admin-btn-danger">Cancel</button>
                    )}
                  </div>
                </form>
              </div>
            </div>

            {/* List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-primary mb-5">
                  All Notices ({notices.length})
                </h3>
                {notices.length === 0 ? (
                  <p className="text-gray-400 text-sm">No notices yet. Add one using the form.</p>
                ) : (
                  <div className="space-y-3">
                    {notices.map(n => (
                      <div key={n._id}
                        className="border border-gray-200 rounded-xl p-4 flex gap-4 items-start hover:border-primary/30 transition-colors">

                        {/* Date badge */}
                        <div className="shrink-0 w-12 flex flex-col items-center justify-center rounded-lg py-1.5 text-white text-center bg-primary">
                          <span className="text-base font-bold leading-none">
                            {new Date(n.date).toLocaleDateString('en-GB', { day: '2-digit' })}
                          </span>
                          <span className="text-xs font-semibold">
                            {new Date(n.date).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <h4 className="font-bold text-primary text-sm">{n.title}</h4>
                            {!n.published && (
                              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Draft</span>
                            )}
                          </div>
                          {n.description && (
                            <p className="text-gray-500 text-xs truncate">{n.description}</p>
                          )}
                          <div className="flex gap-2 mt-1.5 flex-wrap">
                            {n.image && (
                              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">🖼 Image</span>
                            )}
                            {n.pdf && (
                              <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">📄 PDF</span>
                            )}
                            {n.link && (
                              <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">🔗 Link</span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => startEditNotice(n)}
                            className="admin-btn text-xs px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded">
                            Edit
                          </button>
                          <button onClick={() => deleteNotice(n._id)}
                            className="admin-btn admin-btn-danger text-xs">
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

