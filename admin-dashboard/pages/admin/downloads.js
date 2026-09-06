import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import AdminHeader from '../../components/AdminHeader';
import axios from 'axios';
import formatApiError from '../../utils/formatApiError';

const API = process.env.NEXT_PUBLIC_API_URL;
const BASE = API ? API.replace('/api', '') : 'http://localhost:5000';

const emptyForm = {
  title: '',
  date: '',
  file: null,
  published: true,
};

const isPdf = (path) => !!path && path.toLowerCase().split('?')[0].endsWith('.pdf');

export default function DownloadsAdmin() {
  const [items, setItems]       = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editId, setEditId]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState('');
  const [filePreview, setFilePreview] = useState('');
  const fileRef = useRef();

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    try {
      const res = await axios.get(`${API}/downloads/all`);
      setItems(res.data || []);
    } catch { /* silent */ }
    setLoading(false);
  }

  function handleField(e) {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormData((prev) => ({ ...prev, file }));
    setFilePreview(file.type === 'application/pdf' ? file.name : URL.createObjectURL(file));
  }

  function resetForm() {
    setFormData(emptyForm);
    setFilePreview('');
    setEditId(null);
    if (fileRef.current) fileRef.current.value = '';
    setMsg('');
  }

  function startEdit(item) {
    setEditId(item._id);
    setFormData({
      title: item.title || '',
      date: item.date ? item.date.split('T')[0] : '',
      file: null,
      published: item.published !== false,
    });
    setFilePreview(item.file ? (item.file.startsWith('http') ? item.file : `${BASE}${item.file}`) : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!editId && !formData.file) { setMsg('A file (image or PDF) is required.'); return; }
    setSaving(true);
    setMsg('');
    try {
      const fd = new FormData();
      fd.append('title', formData.title);
      fd.append('date', formData.date || new Date().toISOString());
      fd.append('published', formData.published ? 'true' : 'false');
      if (formData.file) fd.append('file', formData.file);

      if (editId) {
        await axios.put(`${API}/downloads/${editId}`, fd);
        setMsg('Download item updated.');
      } else {
        await axios.post(`${API}/downloads`, fd);
        setMsg('Download item created.');
      }
      resetForm();
      fetchItems();
    } catch (err) {
      setMsg(formatApiError(err, 'Error saving download item.'));
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this download? This cannot be undone.')) return;
    try {
      await axios.delete(`${API}/downloads/${id}`);
      fetchItems();
    } catch {
      alert('Error deleting download item.');
    }
  }

  function formatDate(d) {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <>
      <Head><title>Manage Downloads - Admin Dashboard</title></Head>
      <AdminHeader />

      <div className="ml-0 lg:ml-56 p-8">
        <h2 className="text-3xl font-bold text-primary mb-8">
          {editId ? 'Edit Download' : 'Manage Downloads'}
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── FORM ── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
              <h3 className="text-lg font-bold text-primary mb-5">
                {editId ? 'Edit Download' : 'Add Download'}
              </h3>

              {msg && (
                <div className={`mb-4 px-4 py-2 rounded text-sm ${msg.includes('Error') || msg.includes('required') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                  {msg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    name="title"
                    value={formData.title}
                    onChange={handleField}
                    required
                    placeholder="e.g. Admission Prospectus 2026"
                    className="admin-input"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleField}
                    className="admin-input"
                  />
                </div>

                {/* File upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    File — image or PDF{editId ? ' (leave blank to keep current)' : ' *'} (max 10MB)
                  </label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={handleFile}
                    className="admin-input text-sm"
                  />
                  {filePreview && (
                    isPdf(filePreview) ? (
                      <p className="mt-1.5 text-xs text-gray-500 truncate">
                        📄 <span className="font-medium">{filePreview.split('/').pop()}</span>
                      </p>
                    ) : (
                      <img
                        src={filePreview}
                        alt="Preview"
                        className="mt-2 w-full h-32 object-cover rounded-lg border border-gray-200"
                      />
                    )
                  )}
                </div>

                {/* Published toggle */}
                <div className="flex items-center gap-2">
                  <input
                    id="published"
                    name="published"
                    type="checkbox"
                    checked={formData.published}
                    onChange={handleField}
                    className="w-4 h-4 accent-primary"
                  />
                  <label htmlFor="published" className="text-sm text-gray-700">Published (visible on the public Downloads page)</label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving} className="admin-btn admin-btn-primary flex-1">
                    {saving ? 'Saving...' : editId ? 'Update' : 'Add Download'}
                  </button>
                  {editId && (
                    <button type="button" onClick={resetForm} className="admin-btn admin-btn-danger">
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* ── LIST ── */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-primary mb-5">All Downloads ({items.length})</h3>
              {loading ? (
                <p className="text-gray-500">Loading...</p>
              ) : items.length === 0 ? (
                <p className="text-gray-400 text-sm">No downloads yet. Add one using the form.</p>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => {
                    const fileHref = item.file?.startsWith('http') ? item.file : `${BASE}${item.file}`;
                    return (
                      <div key={item._id} className="border border-gray-200 rounded-lg p-4 flex gap-4 items-start">
                        {/* Thumbnail or PDF badge */}
                        {isPdf(item.file) ? (
                          <div
                            className="shrink-0 w-16 h-16 flex items-center justify-center rounded-lg text-white text-2xl"
                            style={{ background: '#dc2626' }}
                          >
                            📄
                          </div>
                        ) : (
                          <img
                            src={fileHref}
                            alt={item.title}
                            className="shrink-0 w-16 h-16 object-cover rounded-lg border border-gray-100"
                          />
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-primary text-sm">{item.title}</h4>
                            {!item.published && (
                              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Draft</span>
                            )}
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                              {isPdf(item.file) ? 'PDF' : 'Image'}
                            </span>
                          </div>
                          <p className="text-gray-400 text-xs mt-0.5">{formatDate(item.date)}</p>
                        </div>

                        <div className="flex gap-2 shrink-0">
                          <a
                            href={fileHref}
                            target="_blank"
                            rel="noreferrer"
                            className="admin-btn text-xs px-3 py-1.5 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded"
                          >
                            View
                          </a>
                          <button
                            onClick={() => startEdit(item)}
                            className="admin-btn text-xs px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item._id)}
                            className="admin-btn admin-btn-danger text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
