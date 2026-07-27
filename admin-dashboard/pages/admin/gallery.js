import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import AdminHeader from '../../components/AdminHeader';
import axios from 'axios';

const API  = process.env.NEXT_PUBLIC_API_URL;
const BASE = API ? API.replace('/api', '') : 'http://localhost:5000';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 2014 }, (_, i) => CURRENT_YEAR - i);
const CATEGORIES   = ['General', 'Campus', 'Events', 'Academic', 'Sports', 'Convocation', 'Faculty', 'Other'];

const emptyForm = {
  title: '', description: '', category: 'General',
  month: '', year: '', program: '',
  order: 0, published: true, image: null,
};

export default function GalleryAdmin() {
  const [items, setItems]       = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editId, setEditId]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState('');
  const [preview, setPreview]   = useState('');
  const imgRef = useRef();

  // Bulk upload state
  const [bulkFiles, setBulkFiles]       = useState([]);
  const [bulkPreviews, setBulkPreviews] = useState([]);
  const [bulkCategory, setBulkCategory] = useState('General');
  const [bulkMonth, setBulkMonth]       = useState('');
  const [bulkYear, setBulkYear]         = useState('');
  const [bulkProgram, setBulkProgram]   = useState('');
  const [bulkSaving, setBulkSaving]     = useState(false);
  const [bulkMsg, setBulkMsg]           = useState('');
  const bulkRef = useRef();

  // Drag-and-drop reorder state
  const [dragIdx, setDragIdx]         = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    try {
      const res = await axios.get(`${API}/gallery/all`);
      setItems(res.data || []);
    } catch { /* silent */ }
    setLoading(false);
  }

  function handleField(e) {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  function handleImg(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormData(prev => ({ ...prev, image: file }));
    setPreview(URL.createObjectURL(file));
  }

  function resetForm() {
    setFormData(emptyForm);
    setPreview('');
    setEditId(null);
    setMsg('');
    if (imgRef.current) imgRef.current.value = '';
  }

  function handleBulkSelect(e) {
    const files = Array.from(e.target.files || []);
    const oversized = files.filter(f => f.size > 1 * 1024 * 1024);
    if (oversized.length > 0) {
      setBulkMsg(`${oversized.length} file(s) exceed 1 MB and were removed: ${oversized.map(f => f.name).join(', ')}`);
      const valid = files.filter(f => f.size <= 1 * 1024 * 1024);
      setBulkFiles(valid);
      setBulkPreviews(valid.map(f => URL.createObjectURL(f)));
    } else {
      setBulkMsg('');
      setBulkFiles(files);
      setBulkPreviews(files.map(f => URL.createObjectURL(f)));
    }
  }

  function removeBulkFile(idx) {
    setBulkFiles(prev => prev.filter((_, i) => i !== idx));
    setBulkPreviews(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleBulkSubmit(e) {
    e.preventDefault();
    if (bulkFiles.length === 0) { setBulkMsg('Please select at least one image.'); return; }
    setBulkSaving(true);
    setBulkMsg('');
    try {
      const fd = new FormData();
      bulkFiles.forEach(f => fd.append('images', f));
      fd.append('category', bulkCategory);
      fd.append('month',    bulkMonth   || '');
      fd.append('year',     bulkYear    || '');
      fd.append('program',  bulkProgram || '');
      const res = await axios.post(`${API}/gallery/bulk`, fd);
      setBulkMsg(`✅ ${res.data.count} photo(s) uploaded successfully.`);
      setBulkFiles([]);
      setBulkPreviews([]);
      setBulkMonth('');
      setBulkYear('');
      setBulkProgram('');
      if (bulkRef.current) bulkRef.current.value = '';
      fetchItems();
    } catch (err) {
      setBulkMsg(err.response?.data?.message || 'Error uploading photos.');
    }
    setBulkSaving(false);
  }

  function onDragStart(idx) { setDragIdx(idx); }

  function onDragOver(e, idx) {
    e.preventDefault();
    if (idx !== dragIdx) setDragOverIdx(idx);
  }

  async function onDrop(idx) {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return; }
    const reordered = [...items];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    const withOrder = reordered.map((item, i) => ({ ...item, order: i }));
    setItems(withOrder);
    setDragIdx(null);
    setDragOverIdx(null);
    try {
      await axios.put(`${API}/gallery/reorder`, withOrder.map((item, i) => ({ id: item._id, order: i })));
    } catch { /* silent */ }
  }

  function onDragEnd() { setDragIdx(null); setDragOverIdx(null); }

  function startEdit(item) {
    setEditId(item._id);
    setFormData({
      title:       item.title       || '',
      description: item.description || '',
      category:    item.category    || 'General',
      month:       item.month       ?? '',
      year:        item.year        ?? '',
      program:     item.program     || '',
      order:       item.order       ?? 0,
      published:   item.published   !== false,
      image:       null,
    });
    setPreview(item.image ? (item.image.startsWith('http') ? item.image : `${BASE}${item.image}`) : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!editId && !formData.image) { setMsg('Please select an image.'); return; }
    setSaving(true);
    setMsg('');
    try {
      const fd = new FormData();
      fd.append('title',       formData.title);
      fd.append('description', formData.description);
      fd.append('category',    formData.category);
      fd.append('month',       formData.month   || '');
      fd.append('year',        formData.year    || '');
      fd.append('program',     formData.program || '');
      fd.append('order',       formData.order);
      fd.append('published',   formData.published ? 'true' : 'false');
      if (formData.image) fd.append('image', formData.image);

      if (editId) {
        await axios.put(`${API}/gallery/${editId}`, fd);
        setMsg('Photo updated successfully.');
      } else {
        await axios.post(`${API}/gallery`, fd);
        setMsg('Photo added successfully.');
      }
      resetForm();
      fetchItems();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Error saving photo.');
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this photo? This cannot be undone.')) return;
    try {
      await axios.delete(`${API}/gallery/${id}`);
      fetchItems();
    } catch { alert('Error deleting photo.'); }
  }

  return (
    <>
      <Head><title>Manage Gallery - Admin Dashboard</title></Head>
      <AdminHeader />

      <div className="ml-0 lg:ml-56 p-8">
        <h2 className="text-3xl font-bold text-primary mb-8">
          {editId ? 'Edit Gallery Photo' : 'Manage Gallery'}
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* ── SINGLE UPLOAD FORM ── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
              <h3 className="text-lg font-bold text-primary mb-5">
                {editId ? 'Edit Photo' : 'Add Single Photo'}
              </h3>

              {msg && (
                <div className={`mb-4 px-4 py-2 rounded text-sm ${msg.includes('Error') || msg.includes('Please') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                  {msg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Image upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Photo {!editId && <span className="text-red-500">*</span>}
                    <span className="ml-1 text-xs text-gray-400 font-normal">(max 1 MB)</span>
                  </label>
                  <input ref={imgRef} type="file" accept=".jpg,.jpeg,.png,.webp,.gif"
                    onChange={handleImg} className="admin-input text-sm" />
                  {preview && (
                    <img src={preview} alt="Preview"
                      className="mt-2 w-full h-44 object-cover rounded-lg border border-gray-200" />
                  )}
                  {editId && !formData.image && (
                    <p className="text-xs text-gray-400 mt-1">Leave empty to keep existing photo.</p>
                  )}
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Caption / Title</label>
                  <input name="title" value={formData.title} onChange={handleField}
                    placeholder="Short caption (optional)" className="admin-input" />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea name="description" value={formData.description} onChange={handleField}
                    rows={2} placeholder="Brief description (optional)" className="admin-input" />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select name="category" value={formData.category} onChange={handleField} className="admin-input">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Month + Year row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                    <select name="month" value={formData.month} onChange={handleField} className="admin-input">
                      <option value="">-- No Month --</option>
                      {MONTH_NAMES.map((m, i) => (
                        <option key={i + 1} value={i + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    <select name="year" value={formData.year} onChange={handleField} className="admin-input">
                      <option value="">-- No Year --</option>
                      {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                {/* Program */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Program</label>
                  <input name="program" value={formData.program} onChange={handleField}
                    placeholder="e.g. Computer Science (optional)" className="admin-input" />
                </div>

                {/* Order */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                  <input name="order" type="number" value={formData.order} onChange={handleField}
                    min={0} className="admin-input" placeholder="0 = first" />
                </div>

                {/* Published */}
                <div className="flex items-center gap-2">
                  <input id="published" name="published" type="checkbox" checked={formData.published}
                    onChange={handleField} className="w-4 h-4 accent-primary" />
                  <label htmlFor="published" className="text-sm text-gray-700">Published (visible on website)</label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving} className="admin-btn admin-btn-primary flex-1">
                    {saving ? 'Saving...' : editId ? 'Update Photo' : 'Add Photo'}
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

          {/* ── BULK UPLOAD ── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
              <h3 className="text-lg font-bold text-primary mb-5">Upload Multiple Photos</h3>

              {bulkMsg && (
                <div className={`mb-4 px-4 py-2 rounded text-sm ${bulkMsg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {bulkMsg}
                </div>
              )}

              <form onSubmit={handleBulkSubmit} className="space-y-4">
                {/* File picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Images <span className="text-red-500">*</span>
                    <span className="ml-1 text-xs text-gray-400 font-normal">(JPG, PNG, WEBP — max 1 MB each)</span>
                  </label>
                  <input ref={bulkRef} type="file" accept=".jpg,.jpeg,.png,.webp,.gif"
                    multiple onChange={handleBulkSelect} className="admin-input text-sm" />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={bulkCategory} onChange={e => setBulkCategory(e.target.value)} className="admin-input">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Month + Year row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                    <select value={bulkMonth} onChange={e => setBulkMonth(e.target.value)} className="admin-input">
                      <option value="">-- No Month --</option>
                      {MONTH_NAMES.map((m, i) => (
                        <option key={i + 1} value={i + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    <select value={bulkYear} onChange={e => setBulkYear(e.target.value)} className="admin-input">
                      <option value="">-- No Year --</option>
                      {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                {/* Program */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Program</label>
                  <input value={bulkProgram} onChange={e => setBulkProgram(e.target.value)}
                    placeholder="e.g. Computer Science (optional)" className="admin-input" />
                </div>

                {/* Preview grid */}
                {bulkPreviews.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">{bulkFiles.length} photo(s) selected — hover to remove</p>
                    <div className="flex flex-wrap gap-2">
                      {bulkPreviews.map((src, idx) => (
                        <div key={idx} className="relative group" style={{ width: 72, height: 72 }}>
                          <img src={src} alt="" className="w-full h-full object-cover rounded-lg border border-gray-200" />
                          <button type="button" onClick={() => removeBulkFile(idx)}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-2 border-white">
                            ×
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 text-white text-center py-0.5 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ background: 'rgba(0,0,0,0.55)', fontSize: 9 }}>
                            {(bulkFiles[idx]?.size / 1024).toFixed(0)} KB
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Submit */}
                <div className="pt-2">
                  <button type="submit" disabled={bulkSaving || bulkFiles.length === 0}
                    className="admin-btn admin-btn-primary w-full"
                    style={{ background: '#FA7902', borderColor: '#FA7902' }}>
                    {bulkSaving ? 'Uploading...' : bulkFiles.length > 0 ? `Upload ${bulkFiles.length} Photo(s)` : 'Upload Photos'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* ── GRID ── */}
          <div className="lg:col-span-2" style={{ gridColumn: '1 / -1' }}>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-primary mb-5">
                All Photos ({items.length})
              </h3>

              {loading ? (
                <p className="text-gray-500">Loading...</p>
              ) : items.length === 0 ? (
                <p className="text-gray-400 text-sm">No photos yet. Add one using the form above.</p>
              ) : (
                <>
                  <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
                    <span style={{ fontSize: 14 }}>⠿</span> Drag to reorder — saved automatically
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {items.map((item, idx) => (
                      <div key={item._id}
                        draggable
                        onDragStart={() => onDragStart(idx)}
                        onDragOver={e => onDragOver(e, idx)}
                        onDrop={() => onDrop(idx)}
                        onDragEnd={onDragEnd}
                        className="group relative rounded-lg overflow-hidden border shadow-sm"
                        style={{
                          aspectRatio: '1',
                          cursor: 'grab',
                          opacity: dragIdx === idx ? 0.35 : 1,
                          borderColor: dragOverIdx === idx ? '#041476' : '#f3f4f6',
                          boxShadow: dragOverIdx === idx ? '0 0 0 2px #041476' : undefined,
                          transition: 'opacity 0.15s, box-shadow 0.15s, border-color 0.15s',
                        }}>

                        <img src={item.image?.startsWith('http') ? item.image : `${BASE}${item.image}`}
                          alt={item.title || 'Gallery'}
                          className="w-full h-full object-cover pointer-events-none" />

                        {/* Drag handle */}
                        <div className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: 'rgba(0,0,0,0.45)', borderRadius: 4, padding: '1px 4px', color: '#fff', fontSize: 11, lineHeight: 1.6, letterSpacing: 1, userSelect: 'none' }}>
                          ⠿
                        </div>

                        {/* Month/Year badge */}
                        {item.month && item.year && (
                          <div className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-0"
                            style={{ /* hidden on hover since drag handle shows */ }} />
                        )}

                        {/* Action overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/55 transition-all duration-200 flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                          <button onClick={() => startEdit(item)}
                            className="px-3 py-1 text-xs font-bold bg-white text-blue-700 rounded-lg hover:bg-blue-50 transition-colors">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(item._id)}
                            className="px-3 py-1 text-xs font-bold bg-white text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                            Delete
                          </button>
                        </div>

                        {/* Meta labels */}
                        <div className="absolute bottom-0 left-0 right-0"
                          style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.7),transparent)', padding: '14px 6px 4px' }}>
                          {item.title && (
                            <p className="text-white text-xs font-medium truncate">{item.title}</p>
                          )}
                          {(item.month && item.year) && (
                            <p className="text-xs truncate" style={{ color: '#FA7902', fontWeight: 600, fontSize: 10 }}>
                              {MONTH_NAMES[item.month - 1]} {item.year}
                            </p>
                          )}
                          {item.program && (
                            <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9 }}>
                              {item.program}
                            </p>
                          )}
                        </div>

                        {!item.published && (
                          <div className="absolute top-1.5 right-1.5">
                            <span className="text-xs bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded font-bold">Draft</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
