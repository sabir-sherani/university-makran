import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import Image from 'next/image';
import AdminHeader from '../../components/AdminHeader';
import RecycleBinPanel from '../../components/RecycleBinPanel';
import axios from 'axios';
import formatApiError from '../../utils/formatApiError';
import {
  LuBookOpen, LuFlaskConical, LuPalette, LuUpload, LuX,
  LuClock, LuLayers, LuFileText, LuPencil, LuTrash2,
  LuPlus, LuImage, LuCheckCircle,
} from 'react-icons/lu';

const RichText = dynamic(() => import('../../components/RichTextEditor'), { ssr: false });

const API      = process.env.NEXT_PUBLIC_API_URL;
const BASE_URL = API ? API.replace(/\/api\/?$/, '') : '';

const CATEGORIES = [
  { value: 'Science', label: 'Science', Icon: LuFlaskConical, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  { value: 'Arts',    label: 'Arts',    Icon: LuPalette,      color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
];

const emptyForm = {
  title: '', category: 'Science', duration: '', semesters: '',
  shortDescription: '', level: 'Undergraduate', department: '',
};

// Course content and fees are held apart from `formData` on purpose: the submit
// handler flattens formData into FormData field by field, which would turn these
// arrays into "[object Object]".
const emptyCourseRow   = () => ({ courseTitle: '', creditHours: '', theoryLab: '', code: '' });
const emptySemester    = () => ({ title: '', courses: [emptyCourseRow()] });
const emptyFeeRow      = () => ({ description: '', fee: '' });
const emptyTableRow    = (cols = 0) => ({ cells: Array.from({ length: cols }, () => ''), label: '', highlight: false });
const emptyCustomTable = () => ({
  title: '', showSerial: true, serialLabel: 'S/N',
  columns: ['Column 1', 'Column 2'], rows: [emptyTableRow(2)],
});

const emptyAcademic = {
  courseHeading: '', courseDescription: '', courseSemesters: [], courseTables: [],
  feeHeading: '', feeDescription: '',
  feeAdmissionTitle: 'Admission Time Fee Structure', feeAdmissionRows: [],
  feeSemesterTitle:  'Per Semester Fee Structure',   feeSemesterRows:  [],
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
  const [deptList, setDeptList]       = useState([]); // [{_id, name}]
  const [errors, setErrors]           = useState({});
  const [flash, setFlash]             = useState({ text: '', ok: true });
  const [filterCat, setFilterCat]     = useState('all');
  const [acad, setAcad]               = useState(emptyAcademic);
  const [acadTab, setAcadTab]         = useState('courses');
  const [acadOpen, setAcadOpen]       = useState(false);
  const [trashItems, setTrashItems]   = useState([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [showTrash, setShowTrash]     = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    fetchPrograms();
    fetchTrash();
    axios.get(`${API}/departments?all=1`)
      .then(res => setDeptList(res.data || []))
      .catch(() => {});
  }, []);

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
    if (!formData.department)      errs.department = 'Please select a department';
    if (!formData.title.trim())    errs.title      = 'Program title is required';
    if (!formData.category)        errs.category   = 'Please select a category';
    if (!formData.duration.trim()) errs.duration   = 'Duration is required';
    return errs;
  }

  function resetForm() {
    setFormData(emptyForm);
    setImageFile(null);
    setImagePreview(null);
    setExistingImage('');
    setEditId(null);
    setErrors({});
    setAcad(emptyAcademic);
    setAcadTab('courses');
    setAcadOpen(false);
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
      department:       prog.department?._id || prog.department || '',
    });
    setAcad({
      courseHeading:     prog.courseHeading     || '',
      courseDescription: prog.courseDescription || '',
      courseSemesters: (prog.courseSemesters || []).map((sm) => ({
        title: sm.title || '',
        courses: (sm.courses || []).map((c) => ({
          courseTitle: c.courseTitle || '', creditHours: c.creditHours || '',
          theoryLab:   c.theoryLab   || '', code:        c.code        || '',
        })),
      })),
      // Rows are rebuilt against the column count, so an older record with a
      // ragged row still lines up in the editor.
      courseTables: (prog.courseTables || []).map((t) => {
        const columns = t.columns || [];
        return {
          title: t.title || '', showSerial: t.showSerial !== false,
          serialLabel: t.serialLabel || 'S/N', columns,
          rows: (t.rows || []).map((r) => ({
            cells: Array.from({ length: columns.length }, (_, i) => r.cells?.[i] || ''),
            label: r.label || '', highlight: !!r.highlight,
          })),
        };
      }),
      feeHeading:        prog.feeHeading        || '',
      feeDescription:    prog.feeDescription    || '',
      feeAdmissionTitle: prog.feeAdmissionTitle || 'Admission Time Fee Structure',
      feeAdmissionRows: (prog.feeAdmissionRows || []).map((r) => ({ description: r.description || '', fee: r.fee || '' })),
      feeSemesterTitle:  prog.feeSemesterTitle  || 'Per Semester Fee Structure',
      feeSemesterRows:  (prog.feeSemesterRows  || []).map((r) => ({ description: r.description || '', fee: r.fee || '' })),
    });
    setAcadTab('courses');

    const src = imgSrc(prog.image);
    setExistingImage(prog.image || '');
    setImagePreview(src);
    setImageFile(null);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Course content & fee editors ────────────────────────────────────────
  const setA = (k, v) => setAcad((p) => ({ ...p, [k]: v }));

  // Semesters
  const addSemester    = () => setA('courseSemesters', [...acad.courseSemesters, emptySemester()]);
  const removeSemester = (i) => setA('courseSemesters', acad.courseSemesters.filter((_, j) => j !== i));
  const setSemTitle    = (i, v) => setA('courseSemesters', acad.courseSemesters.map((sm, j) => j === i ? { ...sm, title: v } : sm));
  const addCourse      = (si) => setA('courseSemesters', acad.courseSemesters.map((sm, j) => j === si ? { ...sm, courses: [...sm.courses, emptyCourseRow()] } : sm));
  const removeCourse   = (si, ci) => setA('courseSemesters', acad.courseSemesters.map((sm, j) => j === si ? { ...sm, courses: sm.courses.filter((_, k) => k !== ci) } : sm));
  const updateCourse   = (si, ci, k, v) => setA('courseSemesters', acad.courseSemesters.map((sm, j) =>
    j === si ? { ...sm, courses: sm.courses.map((c, k2) => k2 === ci ? { ...c, [k]: v } : c) } : sm));

  // Custom tables — every change goes through mapTable so adding or removing a
  // column always reshapes the existing rows with it, otherwise the cells fall
  // out of step with the headings.
  const mapTable = (ti, fn) => setA('courseTables', acad.courseTables.map((t, j) => j === ti ? fn(t) : t));
  const addTable      = () => setA('courseTables', [...acad.courseTables, emptyCustomTable()]);
  const removeTable   = (ti) => setA('courseTables', acad.courseTables.filter((_, j) => j !== ti));
  const updateTable   = (ti, k, v) => mapTable(ti, (t) => ({ ...t, [k]: v }));
  const addColumn     = (ti) => mapTable(ti, (t) => ({ ...t,
    columns: [...t.columns, 'Column ' + (t.columns.length + 1)],
    rows: t.rows.map((r) => ({ ...r, cells: [...r.cells, ''] })) }));
  const removeColumn  = (ti, ci) => mapTable(ti, (t) => ({ ...t,
    columns: t.columns.filter((_, j) => j !== ci),
    rows: t.rows.map((r) => ({ ...r, cells: r.cells.filter((_, j) => j !== ci) })) }));
  const renameColumn  = (ti, ci, v) => mapTable(ti, (t) => ({ ...t, columns: t.columns.map((c, j) => j === ci ? v : c) }));
  const addTableRow   = (ti) => mapTable(ti, (t) => ({ ...t, rows: [...t.rows, emptyTableRow(t.columns.length)] }));
  const removeTableRow = (ti, ri) => mapTable(ti, (t) => ({ ...t, rows: t.rows.filter((_, j) => j !== ri) }));
  const updateTableRow = (ti, ri, k, v) => mapTable(ti, (t) => ({ ...t, rows: t.rows.map((r, j) => j === ri ? { ...r, [k]: v } : r) }));
  const updateCell     = (ti, ri, ci, v) => mapTable(ti, (t) => ({ ...t,
    rows: t.rows.map((r, j) => j === ri ? { ...r, cells: r.cells.map((c, k) => k === ci ? v : c) } : r) }));

  // Fee rows — `list` is whichever of the two fee tables is being edited.
  const addFeeRow    = (list) => setA(list, [...acad[list], emptyFeeRow()]);
  const removeFeeRow = (list, i) => setA(list, acad[list].filter((_, j) => j !== i));
  const updateFeeRow = (list, i, k, v) => setA(list, acad[list].map((r, j) => j === i ? { ...r, [k]: v } : r));

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

      fd.append('courseHeading',     acad.courseHeading);
      fd.append('courseDescription', acad.courseDescription);
      fd.append('courseSemestersJson', JSON.stringify(acad.courseSemesters));
      fd.append('courseTablesJson',    JSON.stringify(acad.courseTables));

      fd.append('feeHeading',           acad.feeHeading);
      fd.append('feeDescription',       acad.feeDescription);
      fd.append('feeAdmissionTitle',    acad.feeAdmissionTitle);
      fd.append('feeSemesterTitle',     acad.feeSemesterTitle);
      fd.append('feeAdmissionRowsJson', JSON.stringify(acad.feeAdmissionRows));
      fd.append('feeSemesterRowsJson',  JSON.stringify(acad.feeSemesterRows));

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
      showFlash(formatApiError(err, 'Error saving program.'), false);
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

                {/* Department */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="department" value={formData.department} onChange={handleField}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors outline-none focus:ring-2 focus:ring-blue-100 ${errors.department ? 'border-red-400' : 'border-gray-200 focus:border-primary'}`}
                  >
                    <option value="">— Select Department —</option>
                    {deptList.map(d => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                  {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department}</p>}
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
                {/* ══ Course Content & Fee Structure ══ */}
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <button type="button" onClick={() => setAcadOpen((o) => !o)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <span className="text-sm font-bold text-gray-700">Course Content &amp; Fee Structure</span>
                    <span className="text-xs text-gray-400">{acadOpen ? 'Hide ▲' : 'Edit ▼'}</span>
                  </button>

                  {acadOpen && (
                    <div className="p-4 space-y-4">
                      <p className="text-xs text-gray-500">
                        These are specific to this program — BS AI, BS CS and BS IT each keep their own.
                      </p>

                      {/* sub-tabs, mirroring the public page */}
                      <div className="flex gap-1 p-1 rounded-lg bg-gray-100">
                        {[['courses', 'Course Content'], ['fee', 'Fee Structure']].map(([k, label]) => (
                          <button key={k} type="button" onClick={() => setAcadTab(k)}
                            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${acadTab === k ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
                            {label}
                          </button>
                        ))}
                      </div>

                      {acadTab === 'courses' ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Section Heading</label>
                            <input value={acad.courseHeading} onChange={(e) => setA('courseHeading', e.target.value)}
                              placeholder="e.g. Course Curriculum" className="admin-input text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                            <RichText extended value={acad.courseDescription}
                              onChange={(v) => setA('courseDescription', v)}
                              placeholder="Overview of this program's curriculum…" />
                          </div>

                          {/* Semesters */}
                          <div className="flex items-center justify-between pt-1">
                            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Semester-wise Courses</h4>
                            <button type="button" onClick={addSemester} className="text-xs font-semibold text-primary">+ Add Semester</button>
                          </div>

                          {acad.courseSemesters.length === 0 ? (
                            <p className="text-xs text-gray-400 border border-dashed border-gray-300 rounded-lg py-6 text-center">
                              No semesters yet.
                            </p>
                          ) : acad.courseSemesters.map((sem, si) => (
                            <div key={si} className="rounded-lg border border-gray-200 overflow-hidden">
                              <div className="flex items-center gap-2 px-3 py-2 bg-primary text-white">
                                <input value={sem.title} onChange={(e) => setSemTitle(si, e.target.value)}
                                  placeholder={`Semester ${si + 1}`}
                                  className="flex-1 bg-white/20 text-white placeholder-white/60 rounded px-2 py-1 text-xs outline-none border border-white/30" />
                                <button type="button" onClick={() => addCourse(si)} className="text-[11px] bg-white/20 px-2 py-1 rounded">+ Course</button>
                                <button type="button" onClick={() => removeSemester(si)} className="text-[11px] bg-red-500/60 px-2 py-1 rounded">Remove</button>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
                                      <th className="text-left px-2 py-1.5 w-6">#</th>
                                      <th className="text-left px-2 py-1.5">Course Title</th>
                                      <th className="text-left px-2 py-1.5 w-20">Cr. Hrs</th>
                                      <th className="text-left px-2 py-1.5 w-20">Th+Lab</th>
                                      <th className="text-left px-2 py-1.5 w-20">Code</th>
                                      <th className="w-7" />
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sem.courses.length === 0 ? (
                                      <tr><td colSpan={6} className="px-2 py-2 text-center text-gray-400">No courses</td></tr>
                                    ) : sem.courses.map((c, ci) => (
                                      <tr key={ci} className="border-b border-gray-100">
                                        <td className="px-2 py-1 text-gray-400">{ci + 1}</td>
                                        <td className="px-1 py-1"><input value={c.courseTitle} onChange={(e) => updateCourse(si, ci, 'courseTitle', e.target.value)} placeholder="Data Structures" className="admin-input py-1 text-xs" /></td>
                                        <td className="px-1 py-1"><input value={c.creditHours} onChange={(e) => updateCourse(si, ci, 'creditHours', e.target.value)} placeholder="3" className="admin-input py-1 text-xs text-center" /></td>
                                        <td className="px-1 py-1"><input value={c.theoryLab} onChange={(e) => updateCourse(si, ci, 'theoryLab', e.target.value)} placeholder="3+0" className="admin-input py-1 text-xs text-center" /></td>
                                        <td className="px-1 py-1"><input value={c.code} onChange={(e) => updateCourse(si, ci, 'code', e.target.value)} placeholder="CS-101" className="admin-input py-1 text-xs" /></td>
                                        <td className="px-1 py-1"><button type="button" onClick={() => removeCourse(si, ci)} className="text-red-400 hover:text-red-600">✕</button></td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))}

                          {/* Extra tables */}
                          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Additional Tables</h4>
                            <button type="button" onClick={addTable} className="text-xs font-semibold text-primary">+ Add Table</button>
                          </div>

                          {acad.courseTables.map((t, ti) => (
                            <div key={ti} className="rounded-lg border border-gray-200 overflow-hidden">
                              <div className="flex items-center gap-2 px-3 py-2 bg-primary text-white">
                                <input value={t.title} onChange={(e) => updateTable(ti, 'title', e.target.value)}
                                  placeholder="Table heading — e.g. BS 4 Years, Courses Semester-wise"
                                  className="flex-1 bg-white/20 text-white placeholder-white/60 rounded px-2 py-1 text-xs outline-none border border-white/30" />
                                <button type="button" onClick={() => removeTable(ti)} className="text-[11px] bg-red-500/60 px-2 py-1 rounded">Remove</button>
                              </div>

                              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[11px] font-semibold text-gray-600">Column headings</span>
                                  <button type="button" onClick={() => addColumn(ti)} className="text-[11px] font-semibold text-primary">+ Add Column</button>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {t.columns.map((c, ci) => (
                                    <div key={ci} className="flex items-center gap-1 bg-white border border-gray-200 rounded px-1.5 py-0.5">
                                      <input value={c} onChange={(e) => renameColumn(ti, ci, e.target.value)}
                                        placeholder={'Column ' + (ci + 1)} className="text-[11px] outline-none w-28 text-gray-700" />
                                      <button type="button" onClick={() => removeColumn(ti, ci)} className="text-red-400 text-[11px]">✕</button>
                                    </div>
                                  ))}
                                </div>
                                <label className="flex items-center gap-1.5 mt-2 text-[11px] text-gray-600">
                                  <input type="checkbox" checked={t.showSerial} onChange={(e) => updateTable(ti, 'showSerial', e.target.checked)} className="rounded border-gray-300" />
                                  Number rows automatically
                                  {t.showSerial && (
                                    <input value={t.serialLabel} onChange={(e) => updateTable(ti, 'serialLabel', e.target.value)}
                                      placeholder="S/N" className="border border-gray-200 rounded px-1.5 py-0.5 w-14 ml-1 outline-none" />
                                  )}
                                </label>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
                                      {t.showSerial && <th className="text-left px-2 py-1.5 w-16">{t.serialLabel || 'S/N'}</th>}
                                      {t.columns.map((c, ci) => <th key={ci} className="text-left px-2 py-1.5">{c || 'Column ' + (ci + 1)}</th>)}
                                      <th className="text-left px-2 py-1.5 w-14">Bold</th>
                                      <th className="w-7" />
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {t.rows.map((r, ri) => {
                                      const number = t.rows.slice(0, ri + 1).filter((x) => !x.highlight).length;
                                      return (
                                        <tr key={ri} className={'border-b border-gray-100 ' + (r.highlight ? 'bg-primary/5' : '')}>
                                          {t.showSerial && (
                                            <td className="px-2 py-1">
                                              {r.highlight
                                                ? <input value={r.label} onChange={(e) => updateTableRow(ti, ri, 'label', e.target.value)} placeholder="Total" className="admin-input py-1 text-xs font-semibold" />
                                                : <span className="text-gray-400">{number}</span>}
                                            </td>
                                          )}
                                          {t.columns.map((_, ci) => (
                                            <td key={ci} className="px-1 py-1">
                                              <input value={r.cells[ci] || ''} onChange={(e) => updateCell(ti, ri, ci, e.target.value)}
                                                className={'admin-input py-1 text-xs ' + (r.highlight ? 'font-semibold' : '')} />
                                            </td>
                                          ))}
                                          <td className="px-2 py-1">
                                            <input type="checkbox" checked={r.highlight} onChange={(e) => updateTableRow(ti, ri, 'highlight', e.target.checked)} className="rounded border-gray-300" />
                                          </td>
                                          <td className="px-1 py-1"><button type="button" onClick={() => removeTableRow(ti, ri)} className="text-red-400 hover:text-red-600">✕</button></td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                              <div className="px-3 py-2">
                                <button type="button" onClick={() => addTableRow(ti)} className="text-xs font-semibold text-primary">+ Add Row</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Section Heading</label>
                            <input value={acad.feeHeading} onChange={(e) => setA('feeHeading', e.target.value)}
                              placeholder="e.g. Fee Structure" className="admin-input text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                            <RichText extended value={acad.feeDescription}
                              onChange={(v) => setA('feeDescription', v)}
                              placeholder="Notes about this program's fees…" />
                          </div>

                          {[
                            { titleKey: 'feeAdmissionTitle', rowsKey: 'feeAdmissionRows' },
                            { titleKey: 'feeSemesterTitle',  rowsKey: 'feeSemesterRows'  },
                          ].map(({ titleKey, rowsKey }) => (
                            <div key={rowsKey} className="rounded-lg border border-gray-200 overflow-hidden">
                              <div className="px-3 py-2 bg-primary">
                                <input value={acad[titleKey]} onChange={(e) => setA(titleKey, e.target.value)}
                                  className="w-full bg-white/20 text-white placeholder-white/60 rounded px-2 py-1 text-xs outline-none border border-white/30" />
                              </div>
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
                                    <th className="text-left px-2 py-1.5 w-6">#</th>
                                    <th className="text-left px-2 py-1.5">Description</th>
                                    <th className="text-left px-2 py-1.5 w-28">Fee (PKR)</th>
                                    <th className="w-7" />
                                  </tr>
                                </thead>
                                <tbody>
                                  {acad[rowsKey].length === 0 ? (
                                    <tr><td colSpan={4} className="px-2 py-2 text-center text-gray-400">No rows</td></tr>
                                  ) : acad[rowsKey].map((r, i) => (
                                    <tr key={i} className="border-b border-gray-100">
                                      <td className="px-2 py-1 text-gray-400">{i + 1}</td>
                                      <td className="px-1 py-1"><input value={r.description} onChange={(e) => updateFeeRow(rowsKey, i, 'description', e.target.value)} placeholder="Admission Fee" className="admin-input py-1 text-xs" /></td>
                                      <td className="px-1 py-1"><input value={r.fee} onChange={(e) => updateFeeRow(rowsKey, i, 'fee', e.target.value)} placeholder="5000" className="admin-input py-1 text-xs" /></td>
                                      <td className="px-1 py-1"><button type="button" onClick={() => removeFeeRow(rowsKey, i)} className="text-red-400 hover:text-red-600">✕</button></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              <div className="px-3 py-2">
                                <button type="button" onClick={() => addFeeRow(rowsKey)} className="text-xs font-semibold text-primary">+ Add Row</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

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

