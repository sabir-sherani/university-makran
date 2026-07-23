import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import AdminHeader from '../../components/AdminHeader';
import RecycleBinPanel from '../../components/RecycleBinPanel';
import axios from 'axios';
import {
  LuBookOpen, LuFlaskConical, LuPalette, LuUpload, LuX,
  LuClock, LuLayers, LuFileText, LuPencil, LuTrash2,
  LuPlus, LuImage, LuCheckCircle,
} from 'react-icons/lu';

const API      = process.env.NEXT_PUBLIC_API_URL;
const BASE_URL = API ? API.replace('/api', '') : '';

const CATEGORIES = [
  { value: 'Science', label: 'Science', Icon: LuFlaskConical, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  { value: 'Arts',    label: 'Arts',    Icon: LuPalette,      color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
];

const emptyForm = {
  title: '', category: 'Science', duration: '', semesters: '',
  shortDescription: '', level: 'Undergraduate',
};

function imgSrc(image) {
  if (!image) return null;
  if (image.startsWith('http') || image.startsWith('/uploads')) return `${BASE_URL}${image}`;
  return image;
}

export default function Programs() {
  const [programs, setPrograms]       = useState([]);
  const [formData, setFormData]       = useState(emptyForm);
  const [imageFile, setImageFile]     = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [editId, setEditId]           = useState(null);
  const [existingImage, setExistingImage] = useState('');
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [errors, setErrors]           = useState({});
  const [flash, setFlash]             = useState({ text: '', ok: true });
  const [filterCat, setFilterCat]     = useState('all');
  const [trashItems, setTrashItems]   = useState([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [showTrash, setShowTrash]     = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { fetchPrograms(); fetchTrash(); }, []);

  async function fetchTrash() {
    setTrashLoading(true);
    try {
      const res = await axios.get(`${API}/programs/trash`);
      setTrashItems(res.data || []);
    } catch { setTrashItems([]); }
    setTrashLoading(false);
  }

  async function handleRestore(id) {
    try {
      await axios.patch(`${API}/programs/${id}/restore`);
      fetchPrograms(); fetchTrash();
    } catch { showFlash('Error restoring program.', false); }
  }

  async function handlePermanentDelete(id) {
    if (!confirm('Permanently delete this program? This cannot be undone.')) return;
    try {
      await axios.delete(`${API}/programs/${id}/permanent`);
      fetchTrash();
    } catch { showFlash('Error deleting program.', false); }
  }

  async function handleEmptyTrash() {
    if (!confirm('Permanently delete ALL trashed programs? This cannot be undone.')) return;
    try {
      await Promise.all(trashItems.map(p => axios.delete(`${API}/programs/${p._id}/permanent`)));
      fetchTrash();
    } catch { showFlash('Error emptying trash.', false); }
  }

  async function fetchPrograms() {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/programs`);
      setPrograms(res.data || []);
    } catch { setPrograms([]); }
    setLoading(false);
  }

  function showFlash(text, ok = true) {
    setFlash({ text, ok });
    setTimeout(() => setFlash({ text: '', ok: true }), 3500);
  }

  function handleField(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  }

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 200 * 1024) {
      setErrors(prev => ({ ...prev, image: 'Image must be under 200 KB' }));
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setErrors(prev => ({ ...prev, image: '' }));
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    setExistingImage('');
    if (fileRef.current) fileRef.current.value = '';
  }

  function validate() {
    const errs = {};
    if (!formData.title.trim())    errs.title    = 'Program title is required';
    if (!formData.category)        errs.category = 'Please select a category';
    if (!formData.duration.trim()) errs.duration = 'Duration is required';
    return errs;
  }

  function resetForm() {
    setFormData(emptyForm);
    setImageFile(null);
    setImagePreview(null);
    setExistingImage('');
    setEditId(null);
    setErrors({});
    if (fileRef.current) fileRef.current.value = '';
  }

  function startEdit(prog) {
    setEditId(prog._id);
    setFormData({
      title:            prog.title || '',
      category:         prog.category || 'Science',
      duration:         prog.duration || '',
      semesters:        prog.semesters || '',
      shortDescription: prog.shortDescription || '',
      level:            prog.level || 'Undergraduate',
    });
    const src = imgSrc(prog.image);
    setExistingImage(prog.image || '');
    setImagePreview(src);
    setImageFile(null);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => fd.append(k, v));
      if (imageFile) fd.append('image', imageFile);
      else if (existingImage) fd.append('existingImage', existingImage);

      if (editId) {
        await axios.put(`${API}/programs/${editId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        showFlash('Program updated successfully.');
      } else {
        await axios.post(`${API}/programs`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        showFlash('Program added successfully.');
      }
      resetForm();
      fetchPrograms();
    } catch (err) {
      showFlash(err.response?.data?.message || 'Error saving program.', false);
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm('Move this program to the recycle bin?')) return;
    try {
      await axios.delete(`${API}/programs/${id}`);
      showFlash('Program moved to recycle bin.');
      fetchPrograms(); fetchTrash();
    } catch {
      showFlash('Error deleting program.', false);
    }
  }

  const displayed = filterCat === 'all' ? programs : programs.filter(p => p.category === filterCat);

  return (
    <>
      <Head><title>Manage Programs — Admin Dashboard</title></Head>
      <AdminHeader />

      <RecycleBinPanel
        open={showTrash}
        onClose={() => setShowTrash(false)}
        items={trashItems}
        loading={trashLoading}
        onRestore={handleRestore}
        onPermanentDelete={handlePermanentDelete}
        onEmptyTrash={handleEmptyTrash}
        label="program"
      />

      <div className="ml-0 lg:ml-56 min-h-screen p-6 lg:p-8" style={{ background: '#F1F5FF' }}>

        {/* Page header */}
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold flex items-center gap-3" style={{ color: '#041476' }}>
              <LuBookOpen size={28} /> Manage Programs
            </h2>
            <p className="text-gray-500 text-sm mt-1">Create and manage Science &amp; Arts degree programs</p>
          </div>
          <button
            onClick={() => setShowTrash(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-colors shrink-0"
            style={{ borderColor: trashItems.length ? '#fca5a5' : '#e5e7eb', color: trashItems.length ? '#dc2626' : '#6b7280', background: trashItems.length ? '#fef2f2' : '#f9fafb' }}
          >
            <LuTrash2 size={15} />
            Recycle Bin
            {trashItems.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold text-white bg-red-500">{trashItems.length}</span>
            )}
          </button>
        </div>

        {/* Flash */}
        {flash.text && (
          <div className={`mb-6 px-5 py-3.5 rounded-xl text-sm font-medium border flex items-center gap-2 ${flash.ok ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
            <LuCheckCircle size={16} /> {flash.text}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">

          {/* ── FORM ── */}
          <div className="xl:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-6">
              {/* Form header */}
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between"
                style={{ background: 'linear-gradient(135deg, #041476, #0d1e9e)' }}>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editId ? 'Edit Program' : 'Add New Program'}
                  </h3>
                  <p className="text-white/50 text-xs mt-0.5">
                    {editId ? 'Update the program details below' : 'Fill in the details to create a new program'}
                  </p>
                </div>
                {editId && (
                  <button onClick={resetForm} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                    <LuX size={15} />
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">

                {/* Category */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {CATEGORIES.map(({ value, label, Icon, color, bg, border }) => (
                      <label
                        key={value}
                        className="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200"
                        style={{
                          borderColor: formData.category === value ? color : '#e5e7eb',
                          background:  formData.category === value ? bg : '#fff',
                        }}
                      >
                        <input
                          type="radio" name="category" value={value}
                          checked={formData.category === value}
                          onChange={handleField} className="sr-only"
                        />
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: formData.category === value ? color : '#f3f4f6' }}>
                          <Icon size={15} style={{ color: formData.category === value ? '#fff' : '#9ca3af' }} />
                        </div>
                        <span className="text-sm font-semibold" style={{ color: formData.category === value ? color : '#4b5563' }}>
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>
                  {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Program Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="title" value={formData.title} onChange={handleField}
                    placeholder="e.g. BS (Hons) Computer Science"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors outline-none focus:ring-2 focus:ring-blue-100 ${errors.title ? 'border-red-400' : 'border-gray-200 focus:border-primary'}`}
                  />
                  {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                </div>

                {/* Duration + Semesters row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Duration <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <LuClock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        name="duration" value={formData.duration} onChange={handleField}
                        placeholder="e.g. 4 Years"
                        className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-colors ${errors.duration ? 'border-red-400' : 'border-gray-200 focus:border-primary'}`}
                      />
                    </div>
                    {errors.duration && <p className="text-red-500 text-xs mt-1">{errors.duration}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Total Semesters</label>
                    <div className="relative">
                      <LuLayers size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        name="semesters" value={formData.semesters} onChange={handleField}
                        placeholder="e.g. 8"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Image upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Featured Image
                  </label>

                  {imagePreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-gray-200" style={{ height: 160 }}>
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button" onClick={clearImage}
                        className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors shadow-md"
                      >
                        <LuX size={13} />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 px-3 py-1.5 text-xs text-white font-medium"
                        style={{ background: 'rgba(0,0,0,0.5)' }}>
                        Click ✕ to remove
                      </div>
                    </div>
                  ) : (
                    <label
                      htmlFor="prog-image-upload"
                      className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 hover:border-primary hover:bg-blue-50/30"
                      style={{ borderColor: errors.image ? '#f87171' : '#d1d5db', height: 120 }}
                    >
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                        <LuImage size={20} className="text-gray-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-600">Click to upload image</p>
                        <p className="text-xs text-gray-400 mt-0.5">JPG, JPEG, PNG or WebP</p>
                      </div>
                    </label>
                  )}

                  <input
                    id="prog-image-upload" ref={fileRef} type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    onChange={handleImageChange} className="hidden"
                  />
                  <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                    <LuUpload size={11} />
                    Recommended: 1200×800px · Ratio 3:2 · Max 200 KB · WebP most recommended
                  </p>
                  {errors.image && <p className="text-red-500 text-xs mt-1">{errors.image}</p>}
                </div>

                {/* Short description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Short Description
                    <span className="text-gray-400 font-normal ml-1 text-xs">(optional)</span>
                  </label>
                  <div className="relative">
                    <LuFileText size={14} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
                    <textarea
                      name="shortDescription" value={formData.shortDescription} onChange={handleField}
                      rows={3}
                      placeholder="Brief overview of this program (shown on the program card)..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary transition-colors resize-none"
                    />
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit" disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:translate-y-0"
                  style={{ background: 'linear-gradient(135deg, #041476, #0d1e9e)' }}
                >
                  {saving ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</>
                  ) : editId ? (
                    <><LuPencil size={15} /> Update Program</>
                  ) : (
                    <><LuPlus size={15} /> Add Program</>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* ── LIST ── */}
          <div className="xl:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              {/* List header */}
              <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold" style={{ color: '#041476' }}>
                    All Programs
                    <span className="ml-2 text-sm font-normal text-gray-400">({displayed.length})</span>
                  </h3>
                </div>
                {/* Category filter tabs */}
                <div className="flex gap-2">
                  {[
                    { key: 'all',     label: 'All',     count: programs.length },
                    { key: 'Science', label: 'Science', count: programs.filter(p => p.category === 'Science').length },
                    { key: 'Arts',    label: 'Arts',    count: programs.filter(p => p.category === 'Arts').length },
                  ].map(t => (
                    <button
                      key={t.key}
                      onClick={() => setFilterCat(t.key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filterCat === t.key ? 'text-white' : 'text-gray-500 border border-gray-200 hover:border-primary hover:text-primary bg-white'}`}
                      style={filterCat === t.key ? { background: '#041476' } : {}}
                    >
                      {t.label} ({t.count})
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#041476', borderTopColor: 'transparent' }} />
                  </div>
                ) : displayed.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <LuBookOpen size={40} className="mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No programs found.</p>
                    <p className="text-sm mt-1">Use the form to add a new program.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {displayed.map(prog => {
                      const cat = CATEGORIES.find(c => c.value === prog.category) || CATEGORIES[0];
                      const thumb = imgSrc(prog.image);
                      return (
                        <div key={prog._id}
                          className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-200 group"
                        >
                          {/* Thumbnail */}
                          <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-gray-100 flex items-center justify-center"
                            style={{ background: cat.bg }}>
                            {thumb ? (
                              <img src={thumb} alt={prog.title} className="w-full h-full object-cover" />
                            ) : (
                              <cat.Icon size={22} style={{ color: cat.color }} />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span
                                className="text-xs font-bold px-2 py-0.5 rounded-full"
                                style={{ background: cat.bg, color: cat.color, border: `1px solid ${cat.border}` }}
                              >
                                {prog.category}
                              </span>
                              {prog.level && (
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                  {prog.level}
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-sm text-gray-800 truncate">{prog.title}</h4>
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-3">
                              {prog.duration && <span className="flex items-center gap-1"><LuClock size={11} />{prog.duration}</span>}
                              {prog.semesters && <span className="flex items-center gap-1"><LuLayers size={11} />{prog.semesters} Semesters</span>}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEdit(prog)}
                              className="p-2 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                              title="Edit"
                            >
                              <LuPencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(prog._id)}
                              className="p-2 rounded-lg text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
                              title="Delete"
                            >
                              <LuTrash2 size={14} />
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
      </div>
    </>
  );
}

