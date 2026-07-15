import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import AdminHeader from '../../components/AdminHeader';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;
const BASE = API ? API.replace('/api', '') : 'http://localhost:5000';

const emptyForm = {
  title: '',
  description: '',
  date: '',
  linkType: 'external',
  linkUrl: '',
  document: null,
  image: null,
  published: true,
  featuredInHero: false,
};


export default function NewsAdmin() {
  const [items, setItems]         = useState([]);
  const [formData, setFormData]   = useState(emptyForm);
  const [editId, setEditId]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState('');
  const [docPreview, setDocPreview]     = useState('');
  const [imgPreview, setImgPreview]     = useState('');
  const docRef = useRef();
  const imgRef = useRef();

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    try {
      const res = await axios.get(`${API}/news/all`);
      setItems(res.data || []);
    } catch { /* silent */ }
    setLoading(false);
  }

  function handleField(e) {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  function handleDoc(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormData((prev) => ({ ...prev, document: file, linkType: 'document' }));
    setDocPreview(file.name);
  }

  function handleImg(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormData((prev) => ({ ...prev, image: file }));
    setImgPreview(URL.createObjectURL(file));
  }

  function resetForm() {
    setFormData(emptyForm);
    setDocPreview('');
    setImgPreview('');
    setEditId(null);
    if (docRef.current) docRef.current.value = '';
    if (imgRef.current) imgRef.current.value = '';
    setMsg('');
  }

  function startEdit(item) {
    setEditId(item._id);
    setFormData({
      title: item.title || '',
      description: item.description || '',
      date: item.date ? item.date.split('T')[0] : '',
      linkType: item.linkType || 'external',
      linkUrl: item.linkUrl || '',
      document: null,
      image: null,
      published: item.published !== false,
      featuredInHero: item.featuredInHero === true,
    });
    setDocPreview(item.document ? `${BASE}${item.document}` : '');
    setImgPreview(item.image ? `${BASE}${item.image}` : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const fd = new FormData();
      fd.append('title', formData.title);
      fd.append('description', formData.description);
      fd.append('date', formData.date || new Date().toISOString());
      fd.append('linkType', formData.document ? 'document' : formData.linkType);
      fd.append('linkUrl', formData.linkUrl);
      fd.append('published', formData.published ? 'true' : 'false');
      fd.append('featuredInHero', formData.featuredInHero ? 'true' : 'false');
      if (formData.document) fd.append('document', formData.document);
      if (formData.image)    fd.append('image', formData.image);

      if (editId) {
        await axios.put(`${API}/news/${editId}`, fd);
        setMsg('News item updated.');
      } else {
        await axios.post(`${API}/news`, fd);
        setMsg('News item created.');
      }
      resetForm();
      fetchItems();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Error saving news item.');
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this news item? This cannot be undone.')) return;
    try {
      await axios.delete(`${API}/news/${id}`);
      fetchItems();
    } catch {
      alert('Error deleting news item.');
    }
  }

  function formatDate(d) {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <>
      <Head><title>Manage News - Admin Dashboard</title></Head>
      <AdminHeader />

      <div className="ml-0 lg:ml-56 p-8">
        <h2 className="text-3xl font-bold text-primary mb-8">
          {editId ? 'Edit News Item' : 'Manage News & Events'}
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── FORM ── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
              <h3 className="text-lg font-bold text-primary mb-5">
                {editId ? 'Edit News Item' : 'Add News Item'}
              </h3>

              {msg && (
                <div className={`mb-4 px-4 py-2 rounded text-sm ${msg.includes('Error') || msg.includes('must') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
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
                    placeholder="Short news headline"
                    className="admin-input"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleField}
                    rows={3}
                    placeholder="Brief description"
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

                {/* Link Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link Type</label>
                  <select
                    name="linkType"
                    value={formData.linkType}
                    onChange={handleField}
                    className="admin-input"
                  >
                    <option value="external">External URL</option>
                    <option value="internal">Internal Page</option>
                    <option value="document">Upload Document</option>
                  </select>
                </div>

                {/* Link URL */}
                {formData.linkType !== 'document' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {formData.linkType === 'internal' ? 'Page Path (e.g. /admission)' : 'URL'}
                    </label>
                    <input
                      name="linkUrl"
                      value={formData.linkUrl}
                      onChange={handleField}
                      placeholder={formData.linkType === 'internal' ? '/admission' : 'https://...'}
                      className="admin-input"
                    />
                  </div>
                )}

                {/* Document upload */}
                {formData.linkType === 'document' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Upload Document (PDF / image, max 5MB)
                    </label>
                    <input
                      ref={docRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={handleDoc}
                      className="admin-input text-sm"
                    />
                    {docPreview && (
                      <p className="mt-1.5 text-xs text-gray-500 truncate">
                        {docPreview.startsWith('http') ? '📎 Existing: ' : '📎 Selected: '}
                        <span className="font-medium">{docPreview.split('/').pop()}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Image upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cover Image (optional, max 5MB)
                  </label>
                  <input
                    ref={imgRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={handleImg}
                    className="admin-input text-sm"
                  />
                  {imgPreview && (
                    <img
                      src={imgPreview}
                      alt="Preview"
                      className="mt-2 w-full h-32 object-cover rounded-lg border border-gray-200"
                    />
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
                  <label htmlFor="published" className="text-sm text-gray-700">Published</label>
                </div>

                {/* Featured in Hero toggle */}
                <div
                  className="flex items-start gap-3 p-3 rounded-lg border"
                  style={{ borderColor: formData.featuredInHero ? '#FA7902' : '#e5e7eb', background: formData.featuredInHero ? '#fff8f0' : '#f9fafb' }}
                >
                  <input
                    id="featuredInHero"
                    name="featuredInHero"
                    type="checkbox"
                    checked={formData.featuredInHero}
                    onChange={handleField}
                    className="w-4 h-4 mt-0.5 shrink-0"
                    style={{ accentColor: '#FA7902' }}
                  />
                  <label htmlFor="featuredInHero" className="cursor-pointer select-none">
                    <span className="text-sm font-semibold" style={{ color: '#041476' }}>
                      ⭐ Feature in Hero Section
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      This news will appear in the "Latest Updates" card on the homepage hero section.
                    </p>
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving} className="admin-btn admin-btn-primary flex-1">
                    {saving ? 'Saving...' : editId ? 'Update' : 'Add News Item'}
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
              <h3 className="text-lg font-bold text-primary mb-5">All News Items ({items.length})</h3>
              {loading ? (
                <p className="text-gray-500">Loading...</p>
              ) : items.length === 0 ? (
                <p className="text-gray-400 text-sm">No news items yet. Add one using the form.</p>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item._id} className="border border-gray-200 rounded-lg p-4 flex gap-4 items-start">
                      {/* Image or date badge */}
                      {item.image ? (
                        <img
                          src={`${BASE}${item.image}`}
                          alt={item.title}
                          className="shrink-0 w-16 h-16 object-cover rounded-lg border border-gray-100"
                        />
                      ) : (
                        <div
                          className="shrink-0 w-12 flex flex-col items-center justify-center rounded-lg py-1.5 text-white text-center"
                          style={{ background: '#041476' }}
                        >
                          <span className="text-base font-bold leading-none">
                            {new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit' })}
                          </span>
                          <span className="text-xs font-semibold">
                            {new Date(item.date).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}
                          </span>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-primary text-sm">{item.title}</h4>
                          {!item.published && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Draft</span>
                          )}
                          {item.featuredInHero && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: '#fff3e0', color: '#e65c00' }}>⭐ Hero</span>
                          )}
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                            {item.linkType}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-gray-500 text-xs mt-0.5 truncate">{item.description}</p>
                        )}
                        <p className="text-gray-400 text-xs mt-0.5">{formatDate(item.date)}</p>
                      </div>

                      <div className="flex gap-2 shrink-0">
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
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

