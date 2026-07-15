import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AdminHeader from '../../../components/AdminHeader';
import axios from 'axios';

const RichText = dynamic(() => import('../../../components/RichTextEditor'), { ssr: false });

const API  = process.env.NEXT_PUBLIC_API_URL;
const BASE = API ? API.replace('/api', '') : 'http://localhost:5000';

// ── Blank templates ───────────────────────────────────────────────────────────

const emptyStaff      = () => ({ photo: null, photoPreview: '', existingPhoto: '', name: '', jobTitle: '', education: '', email: '', phone: '', bio: '' });
const emptyFeeRow     = () => ({ description: '', fee: '' });
const emptyCourse     = () => ({ courseTitle: '', creditHours: '', theoryLab: '', code: '' });
const emptySemester   = () => ({ title: '', courses: [emptyCourse()] });
const emptyProgram    = () => ({ heading: '', description: '' });
const emptyGalleryImg = () => ({ file: null, preview: '', existingUrl: '', subtitle: '' });

const TABS = [
  { key: 'about',      label: 'About Dept',             icon: '📋' },
  { key: 'hod',        label: 'HOD & Staff',            icon: '👤' },
  { key: 'mission',    label: 'Mission & Vision',       icon: '🎯' },
  { key: 'facilities', label: 'Facilities & Resources', icon: '🏫' },
  { key: 'engagement', label: 'Student Engagement',     icon: '🤝' },
  { key: 'courses',    label: 'Course Content',         icon: '📚' },
  { key: 'fee',        label: 'Fee Structure',          icon: '💰' },
  { key: 'programs',   label: 'Degree Programs',        icon: '🎓' },
];

// ── Small reusable pieces ─────────────────────────────────────────────────────

function FieldLabel({ children, required }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function SectionCard({ title, children, action }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
        <h4 className="font-semibold text-gray-800 text-sm">{title}</h4>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function AddRowBtn({ onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors mt-3"
    >
      <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm">+</span>
      {label}
    </button>
  );
}

function RemoveBtn({ onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="text-red-400 hover:text-red-600 transition-colors shrink-0 w-7 h-7 flex items-center justify-center rounded hover:bg-red-50">
      ✕
    </button>
  );
}

// ── Photo upload field ────────────────────────────────────────────────────────

function PhotoField({ preview, onChange, label, shape = 'rounded-lg', size = 'w-20 h-20' }) {
  const ref = useRef();
  return (
    <div className="flex items-center gap-3">
      {preview ? (
        <img src={preview} alt="" className={`${size} object-cover object-top ${shape} border border-gray-200 shrink-0`} />
      ) : (
        <div className={`${size} ${shape} bg-gray-100 flex items-center justify-center text-gray-400 shrink-0 border border-dashed border-gray-300`}>
          <span className="text-2xl">📷</span>
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
        <input ref={ref} type="file" accept=".jpg,.jpeg,.png,.webp"
          onChange={e => { const f = e.target.files?.[0]; if (f) onChange(f, URL.createObjectURL(f)); }}
          className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
        />
      </div>
    </div>
  );
}

// ── Fee table section ─────────────────────────────────────────────────────────

function FeeTableSection({ title, titleKey, rows, rowsKey, setForm }) {
  function updateTitle(v) { setForm(f => ({ ...f, [titleKey]: v })); }
  function addRow() { setForm(f => ({ ...f, [rowsKey]: [...f[rowsKey], emptyFeeRow()] })); }
  function removeRow(i) { setForm(f => ({ ...f, [rowsKey]: f[rowsKey].filter((_, j) => j !== i) })); }
  function updateRow(i, field, v) {
    setForm(f => ({ ...f, [rowsKey]: f[rowsKey].map((r, j) => j === i ? { ...r, [field]: v } : r) }));
  }

  return (
    <SectionCard
      title={title}
      action={<AddRowBtn onClick={addRow} label="Add Row" />}
    >
      <div className="mb-3">
        <FieldLabel>Table Heading</FieldLabel>
        <input value={rows.title !== undefined ? rows.title : ''} onChange={e => updateTitle(e.target.value)}
          placeholder="e.g. Admission Time Fee Structure" className="admin-input" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2 font-semibold text-gray-600 w-8">S#</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Description</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600 w-32">Fee</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.rows.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-400 text-xs">No rows yet — click "Add Row"</td></tr>
            ) : rows.rows.map((row, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                <td className="px-3 py-2">
                  <input value={row.description} onChange={e => updateRow(i, 'description', e.target.value)}
                    placeholder="e.g. Admission Fee" className="admin-input py-1.5 text-xs" />
                </td>
                <td className="px-3 py-2">
                  <input value={row.fee} onChange={e => updateRow(i, 'fee', e.target.value)}
                    placeholder="e.g. 5,000" className="admin-input py-1.5 text-xs" />
                </td>
                <td className="px-2 py-2"><RemoveBtn onClick={() => removeRow(i)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

// ── Main editor page ──────────────────────────────────────────────────────────

export default function DepartmentEditor() {
  const router = useRouter();
  const { id }  = router.query;

  const [activeTab, setActiveTab] = useState('about');
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState({ text: '', ok: true });
  const [deptName, setDeptName]   = useState('');
  const [staffOpen, setStaffOpen] = useState([]);

  const [form, setForm] = useState({
    name: '', slug: '',
    bannerImage: null, bannerPreview: '', existingBanner: '',

    aboutHeading: '', aboutDescription: '',

    hodPhoto: null, hodPhotoPreview: '', existingHodPhoto: '',
    hodName: '', hodQualification: '', hodEmail: '',
    hodDescriptionHeading: '', hodDescription: '',
    staff: [],

    feeAdmissionTitle: 'Admission Time Fee Structure',
    feeAdmissionRows:  [],
    feeSemesterTitle:  'Per Semester Fee Structure',
    feeSemesterRows:   [],

    missionHeading: '', missionDescription: '',
    visionHeading: '',  visionDescription: '',

    semesters: [],
    degreePrograms: [],

    facilitiesHeading: '',
    facilitiesDescription: '',
    facilitiesImages: [],

    engagementHeading: '',
    engagementDescription: '',
    engagementImages: [],

  });

  useEffect(() => {
    if (!id) return;
    axios.get(`${API}/departments/${id}`)
      .then(({ data }) => {
        setDeptName(data.name);
        setForm({
          name: data.name || '', slug: data.slug || '',
          bannerImage: null,
          bannerPreview: data.bannerImage ? `${BASE}${data.bannerImage}` : '',
          existingBanner: data.bannerImage || '',

          aboutHeading:     data.aboutHeading     || '',
          aboutDescription: data.aboutDescription || '',

          hodPhoto: null,
          hodPhotoPreview:  data.hod?.photo ? `${BASE}${data.hod.photo}` : '',
          existingHodPhoto: data.hod?.photo || '',
          hodName:               data.hod?.name               || '',
          hodQualification:      data.hod?.qualification      || '',
          hodEmail:              data.hod?.email              || '',
          hodDescriptionHeading: data.hod?.descriptionHeading || '',
          hodDescription:        data.hod?.description        || '',

          staff: (data.staff || []).map(m => ({
            photo: null, photoPreview: m.photo ? `${BASE}${m.photo}` : '',
            existingPhoto: m.photo || '', _id: m._id,
            name: m.name || '', jobTitle: m.jobTitle || '',
            education: m.education || '', email: m.email || '', phone: m.phone || '',
            bio: m.bio || '',
          })),

          feeAdmissionTitle: data.feeAdmissionTitle || 'Admission Time Fee Structure',
          feeAdmissionRows:  data.feeAdmissionRows  || [],
          feeSemesterTitle:  data.feeSemesterTitle  || 'Per Semester Fee Structure',
          feeSemesterRows:   data.feeSemesterRows   || [],

          missionHeading:     data.missionHeading     || '',
          missionDescription: data.missionDescription || '',
          visionHeading:      data.visionHeading      || '',
          visionDescription:  data.visionDescription  || '',

          semesters: (data.semesters || []).map(s => ({
            _id: s._id, title: s.title || '',
            courses: (s.courses || []).map(c => ({
              courseTitle: c.courseTitle || '', creditHours: c.creditHours || '',
              theoryLab: c.theoryLab || '', code: c.code || '',
            })),
          })),

          degreePrograms: (data.degreePrograms || []).map(p => ({
            _id: p._id, heading: p.heading || '', description: p.description || '',
          })),

          facilitiesHeading:     data.facilitiesResources?.heading     || '',
          facilitiesDescription: data.facilitiesResources?.description || '',
          facilitiesImages: (data.facilitiesResources?.images || []).map(img => ({
            file: null, preview: img.image ? `${BASE}${img.image}` : '',
            existingUrl: img.image || '', subtitle: img.subtitle || '',
          })),

          engagementHeading:     data.studentEngagement?.heading     || '',
          engagementDescription: data.studentEngagement?.description || '',
          engagementImages: (data.studentEngagement?.images || []).map(img => ({
            file: null, preview: img.image ? `${BASE}${img.image}` : '',
            existingUrl: img.image || '', subtitle: img.subtitle || '',
          })),

        });
        setStaffOpen((data.staff || []).map(() => false));
      })
      .catch(() => router.push('/admin/departments'))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Field helpers ─────────────────────────────────────────────────────────

  function setF(field, value) { setForm(f => ({ ...f, [field]: value })); }

  // Staff
  function addStaff()          { setForm(f => ({ ...f, staff: [...f.staff, emptyStaff()] })); setStaffOpen(o => [...o, true]); }
  function removeStaff(i)      { setForm(f => ({ ...f, staff: f.staff.filter((_, j) => j !== i) })); setStaffOpen(o => o.filter((_, j) => j !== i)); }
  function toggleStaff(i)      { setStaffOpen(o => o.map((v, j) => j === i ? !v : v)); }
  function updateStaff(i, k, v){ setForm(f => ({ ...f, staff: f.staff.map((m, j) => j === i ? { ...m, [k]: v } : m) })); }
  function staffPhoto(i, file, prev) { updateStaff(i, 'photo', file); updateStaff(i, 'photoPreview', prev); }

  // Semesters
  function addSemester()        { setForm(f => ({ ...f, semesters: [...f.semesters, emptySemester()] })); }
  function removeSemester(i)    { setForm(f => ({ ...f, semesters: f.semesters.filter((_, j) => j !== i) })); }
  function setSemTitle(i, v)    { setForm(f => ({ ...f, semesters: f.semesters.map((s, j) => j === i ? { ...s, title: v } : s) })); }
  function addCourse(si)        { setForm(f => ({ ...f, semesters: f.semesters.map((s, j) => j === si ? { ...s, courses: [...s.courses, emptyCourse()] } : s) })); }
  function removeCourse(si, ci) { setForm(f => ({ ...f, semesters: f.semesters.map((s, j) => j === si ? { ...s, courses: s.courses.filter((_, k) => k !== ci) } : s) })); }
  function updateCourse(si, ci, k, v) {
    setForm(f => ({
      ...f, semesters: f.semesters.map((s, j) => j === si
        ? { ...s, courses: s.courses.map((c, k2) => k2 === ci ? { ...c, [k]: v } : c) }
        : s),
    }));
  }

  // Degree programs
  function addProgram()           { setForm(f => ({ ...f, degreePrograms: [...f.degreePrograms, emptyProgram()] })); }
  function removeProgram(i)       { setForm(f => ({ ...f, degreePrograms: f.degreePrograms.filter((_, j) => j !== i) })); }
  function updateProgram(i, k, v) { setForm(f => ({ ...f, degreePrograms: f.degreePrograms.map((p, j) => j === i ? { ...p, [k]: v } : p) })); }

  // Facilities images
  function addFacilityImg()           { setForm(f => ({ ...f, facilitiesImages: [...f.facilitiesImages, emptyGalleryImg()] })); }
  function removeFacilityImg(i)       { setForm(f => ({ ...f, facilitiesImages: f.facilitiesImages.filter((_, j) => j !== i) })); }
  function updateFacilityImg(i, k, v) { setForm(f => ({ ...f, facilitiesImages: f.facilitiesImages.map((img, j) => j === i ? { ...img, [k]: v } : img) })); }
  function facilityImgUpload(i, file, prev) { updateFacilityImg(i, 'file', file); updateFacilityImg(i, 'preview', prev); }

  // Engagement images
  function addEngagementImg()           { setForm(f => ({ ...f, engagementImages: [...f.engagementImages, emptyGalleryImg()] })); }
  function removeEngagementImg(i)       { setForm(f => ({ ...f, engagementImages: f.engagementImages.filter((_, j) => j !== i) })); }
  function updateEngagementImg(i, k, v) { setForm(f => ({ ...f, engagementImages: f.engagementImages.map((img, j) => j === i ? { ...img, [k]: v } : img) })); }
  function engagementImgUpload(i, file, prev) { updateEngagementImg(i, 'file', file); updateEngagementImg(i, 'preview', prev); }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    setMsg({ text: '', ok: true });
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('slug', form.slug);
      if (form.bannerImage instanceof File) fd.append('bannerImage', form.bannerImage);
      if (form.hodPhoto instanceof File)    fd.append('hodPhoto', form.hodPhoto);
      form.staff.forEach((m, i) => {
        if (m.photo instanceof File) fd.append(`staffPhoto_${i}`, m.photo);
      });

      fd.append('aboutHeading',     form.aboutHeading);
      fd.append('aboutDescription', form.aboutDescription);
      fd.append('existingHodPhoto', form.existingHodPhoto || '');
      fd.append('hodName',               form.hodName);
      fd.append('hodQualification',      form.hodQualification);
      fd.append('hodEmail',              form.hodEmail);
      fd.append('hodDescriptionHeading', form.hodDescriptionHeading);
      fd.append('hodDescription',        form.hodDescription);
      fd.append('staffJson', JSON.stringify(form.staff.map(m => ({
        name: m.name, jobTitle: m.jobTitle, education: m.education,
        email: m.email, phone: m.phone, bio: m.bio || '', existingPhoto: m.existingPhoto || '',
      }))));

      fd.append('feeAdmissionTitle',    form.feeAdmissionTitle);
      fd.append('feeSemesterTitle',     form.feeSemesterTitle);
      fd.append('feeAdmissionRowsJson', JSON.stringify(form.feeAdmissionRows));
      fd.append('feeSemesterRowsJson',  JSON.stringify(form.feeSemesterRows));

      fd.append('missionHeading',     form.missionHeading);
      fd.append('missionDescription', form.missionDescription);
      fd.append('visionHeading',      form.visionHeading);
      fd.append('visionDescription',  form.visionDescription);

      fd.append('semestersJson',     JSON.stringify(form.semesters.map(s => ({
        title: s.title, courses: s.courses,
      }))));
      fd.append('degreeProgramsJson', JSON.stringify(form.degreePrograms.map(p => ({
        heading: p.heading, description: p.description,
      }))));

      fd.append('facilitiesHeading',     form.facilitiesHeading);
      fd.append('facilitiesDescription', form.facilitiesDescription);
      fd.append('facilitiesImagesJson', JSON.stringify(form.facilitiesImages.map(img => ({
        existingUrl: img.existingUrl || '', subtitle: img.subtitle,
      }))));
      form.facilitiesImages.forEach((img, i) => {
        if (img.file instanceof File) fd.append(`facilityImg_${i}`, img.file);
      });

      fd.append('engagementHeading',     form.engagementHeading);
      fd.append('engagementDescription', form.engagementDescription);
      fd.append('engagementImagesJson', JSON.stringify(form.engagementImages.map(img => ({
        existingUrl: img.existingUrl || '', subtitle: img.subtitle,
      }))));
      form.engagementImages.forEach((img, i) => {
        if (img.file instanceof File) fd.append(`engagementImg_${i}`, img.file);
      });

      await axios.put(`${API}/departments/${id}`, fd);
      setMsg({ text: 'Saved successfully!', ok: true });
      setDeptName(form.name);
    } catch (err) {
      setMsg({ text: err.response?.data?.message || 'Error saving.', ok: false });
    }
    setSaving(false);
  }

  if (loading) return (
    <>
      <AdminHeader />
      <div className="ml-0 lg:ml-56 p-8 flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-400">Loading department…</p>
      </div>
    </>
  );

  return (
    <>
      <Head><title>Edit {deptName} — Admin</title></Head>
      <AdminHeader />

      <div className="ml-0 lg:ml-56">

        {/* ── Top bar ── */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center gap-4 px-8 py-3">
            <Link href="/admin/departments" className="text-sm text-gray-400 hover:text-primary transition-colors flex items-center gap-1">
              ← Departments
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-semibold text-gray-700 truncate flex-1">{deptName}</span>

            {msg.text && (
              <span className={`text-xs font-medium px-3 py-1 rounded-full ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {msg.text}
              </span>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="admin-btn admin-btn-primary px-5 py-2 text-sm shrink-0"
            >
              {saving ? 'Saving…' : 'Save All Changes'}
            </button>
          </div>
        </div>

        {/* ── General fields (always visible) ── */}
        <div className="px-8 pt-6 pb-2 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <FieldLabel required>Department Name</FieldLabel>
            <input value={form.name} onChange={e => setF('name', e.target.value)}
              placeholder="e.g. Computer Science" className="admin-input" />
          </div>
          <div>
            <FieldLabel>URL Slug</FieldLabel>
            <input value={form.slug} onChange={e => setF('slug', e.target.value)}
              placeholder="auto-generated from name" className="admin-input font-mono text-xs" />
          </div>
          <div>
            <FieldLabel>Banner Image</FieldLabel>
            <input type="file" accept=".jpg,.jpeg,.png,.webp"
              onChange={e => { const f = e.target.files?.[0]; if (f) { setF('bannerImage', f); setF('bannerPreview', URL.createObjectURL(f)); }}}
              className="text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
            <p className="mt-1 text-xs text-gray-400">
              Recommended: <span className="font-medium text-gray-500">1920 × 400 px</span> &nbsp;·&nbsp; Ratio 48:10 (wide landscape) &nbsp;·&nbsp; Max <span className="font-medium text-gray-500">200 KB</span> &nbsp;·&nbsp; JPG, PNG or WebP
            </p>
            {form.bannerPreview && (
              <img src={form.bannerPreview} alt="" className="mt-2 h-16 w-full object-cover rounded-lg border" />
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="border-b border-gray-200 px-8">
          <div className="flex gap-0 overflow-x-auto scrollbar-hide">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-150 ${
                  activeTab === t.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab content ── */}
        <div className="px-8 py-6 bg-gray-50 min-h-screen">

          {/* ── TAB 1: About ── */}
          {activeTab === 'about' && (
            <div className="space-y-5 max-w-3xl">
              <SectionCard title="About the Department">
                <div className="space-y-4">
                  <div>
                    <FieldLabel>Section Heading</FieldLabel>
                    <input value={form.aboutHeading} onChange={e => setF('aboutHeading', e.target.value)}
                      placeholder="e.g. About the Department of Computer Science" className="admin-input" />
                  </div>
                  <div>
                    <FieldLabel>Description</FieldLabel>
                    <RichText extended value={form.aboutDescription}
                      onChange={v => setF('aboutDescription', v)}
                      placeholder="Write a detailed description of the department…" />
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          {/* ── TAB 2: HOD & Staff ── */}
          {activeTab === 'hod' && (
            <div className="space-y-5 max-w-4xl">
              {/* HOD */}
              <SectionCard title="Head of Department (HOD)">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Left col */}
                  <div className="space-y-3">
                    <PhotoField
                      preview={form.hodPhotoPreview}
                      onChange={(file, prev) => { setF('hodPhoto', file); setF('hodPhotoPreview', prev); }}
                      label="HOD Photo (JPG/PNG, max 3MB)"
                      shape="rounded-xl"
                      size="w-28 h-36"
                    />
                    <div>
                      <FieldLabel>Full Name</FieldLabel>
                      <input value={form.hodName} onChange={e => setF('hodName', e.target.value)}
                        placeholder="Prof. Dr. …" className="admin-input" />
                    </div>
                    <div>
                      <FieldLabel>Qualification / Education</FieldLabel>
                      <input value={form.hodQualification} onChange={e => setF('hodQualification', e.target.value)}
                        placeholder="PhD Computer Science, …" className="admin-input" />
                    </div>
                    <div>
                      <FieldLabel>Email</FieldLabel>
                      <input type="email" value={form.hodEmail} onChange={e => setF('hodEmail', e.target.value)}
                        placeholder="hod@uomp.edu.pk" className="admin-input" />
                    </div>
                  </div>
                  {/* Right col */}
                  <div className="space-y-3">
                    <div>
                      <FieldLabel>Section Heading</FieldLabel>
                      <input value={form.hodDescriptionHeading} onChange={e => setF('hodDescriptionHeading', e.target.value)}
                        placeholder="e.g. Message from the HOD" className="admin-input" />
                    </div>
                    <div>
                      <FieldLabel>Description / Message</FieldLabel>
                      <RichText extended value={form.hodDescription}
                        onChange={v => setF('hodDescription', v)}
                        placeholder="HOD's welcome message or bio…" />
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Staff */}
              <SectionCard
                title={`Department Staff (${form.staff.length})`}
                action={<AddRowBtn onClick={addStaff} label="Add Staff Member" />}
              >
                {form.staff.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No staff members yet. Click "Add Staff Member".</p>
                ) : (
                  <div className="space-y-2">
                    {form.staff.map((m, i) => {
                      const isOpen = staffOpen[i] ?? true;
                      return (
                        <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                          {/* Accordion header — always visible */}
                          <div
                            className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                            onClick={() => toggleStaff(i)}
                          >
                            {m.photoPreview ? (
                              <img src={m.photoPreview} alt="" className="w-8 h-8 rounded-full object-cover object-top shrink-0 border border-gray-200" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                {m.name ? m.name.charAt(0).toUpperCase() : '#'}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-gray-800 truncate block">
                                {m.name || `Staff Member #${i + 1}`}
                              </span>
                              {m.jobTitle && (
                                <span className="text-xs text-gray-400 truncate block">{m.jobTitle}</span>
                              )}
                            </div>
                            <span className="text-gray-400 text-xs shrink-0">{isOpen ? '▲' : '▼'}</span>
                            <div onClick={e => e.stopPropagation()}>
                              <RemoveBtn onClick={() => removeStaff(i)} />
                            </div>
                          </div>

                          {/* Expandable body */}
                          {isOpen && (
                            <div className="p-4 space-y-3 border-t border-gray-100">
                              <PhotoField
                                preview={m.photoPreview}
                                onChange={(f, p) => staffPhoto(i, f, p)}
                                label="Photo (JPG/PNG)"
                                shape="rounded-lg"
                                size="w-16 h-16"
                              />
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input value={m.name} onChange={e => updateStaff(i, 'name', e.target.value)}
                                  placeholder="Full Name" className="admin-input" />
                                <input value={m.jobTitle} onChange={e => updateStaff(i, 'jobTitle', e.target.value)}
                                  placeholder="Job Title" className="admin-input" />
                                <input value={m.education} onChange={e => updateStaff(i, 'education', e.target.value)}
                                  placeholder="Education / Qualification" className="admin-input" />
                                <input type="email" value={m.email} onChange={e => updateStaff(i, 'email', e.target.value)}
                                  placeholder="Email Address" className="admin-input" />
                                <input value={m.phone} onChange={e => updateStaff(i, 'phone', e.target.value)}
                                  placeholder="Phone Number" className="admin-input sm:col-span-2" />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Publications / Bio</label>
                                <RichText extended
                                  value={m.bio || ''}
                                  onChange={v => updateStaff(i, 'bio', v)}
                                  placeholder="Write about this staff member — publications, research interests, background…"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>
            </div>
          )}

          {/* ── TAB 3: Fee Structure ── */}
          {activeTab === 'fee' && (
            <div className="space-y-5 max-w-3xl">
              <FeeTableSection
                title="Admission Time Fee"
                titleKey="feeAdmissionTitle"
                rowsKey="feeAdmissionRows"
                rows={{ title: form.feeAdmissionTitle, rows: form.feeAdmissionRows }}
                setForm={setForm}
              />
              <FeeTableSection
                title="Per Semester Fee"
                titleKey="feeSemesterTitle"
                rowsKey="feeSemesterRows"
                rows={{ title: form.feeSemesterTitle, rows: form.feeSemesterRows }}
                setForm={setForm}
              />
            </div>
          )}

          {/* ── TAB 4: Mission & Vision ── */}
          {activeTab === 'mission' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl">
              <SectionCard title="🎯 Mission">
                <div className="space-y-3">
                  <div>
                    <FieldLabel>Heading</FieldLabel>
                    <input value={form.missionHeading} onChange={e => setF('missionHeading', e.target.value)}
                      placeholder="Our Mission" className="admin-input" />
                  </div>
                  <div>
                    <FieldLabel>Description</FieldLabel>
                    <RichText extended value={form.missionDescription}
                      onChange={v => setF('missionDescription', v)}
                      placeholder="Describe the department's mission…" />
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="👁 Vision">
                <div className="space-y-3">
                  <div>
                    <FieldLabel>Heading</FieldLabel>
                    <input value={form.visionHeading} onChange={e => setF('visionHeading', e.target.value)}
                      placeholder="Our Vision" className="admin-input" />
                  </div>
                  <div>
                    <FieldLabel>Description</FieldLabel>
                    <RichText extended value={form.visionDescription}
                      onChange={v => setF('visionDescription', v)}
                      placeholder="Describe the department's vision…" />
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          {/* ── TAB 5: Course Content ── */}
          {activeTab === 'courses' && (
            <div className="space-y-5 max-w-4xl">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-700">Semester-wise Course Structure</h3>
                <AddRowBtn onClick={addSemester} label="Add Semester" />
              </div>

              {form.semesters.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
                  <p className="text-gray-400 text-sm">No semesters yet. Click "Add Semester" to begin.</p>
                </div>
              ) : form.semesters.map((sem, si) => (
                <div key={si} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Semester header */}
                  <div className="flex items-center gap-3 px-5 py-3 bg-primary text-white">
                    <input
                      value={sem.title}
                      onChange={e => setSemTitle(si, e.target.value)}
                      placeholder={`Semester ${si + 1} Title`}
                      className="flex-1 bg-white/20 text-white placeholder-white/60 rounded px-3 py-1 text-sm font-medium outline-none border border-white/30 focus:border-white"
                    />
                    <button type="button" onClick={() => addCourse(si)}
                      className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded border border-white/30 font-medium transition-colors">
                      + Add Course
                    </button>
                    <button type="button" onClick={() => removeSemester(si)}
                      className="text-xs bg-red-500/60 hover:bg-red-500/80 px-3 py-1 rounded font-medium transition-colors">
                      Remove
                    </button>
                  </div>

                  {/* Course table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-3 py-2 font-semibold text-gray-600 w-8">S#</th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-600">Course Title</th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-600 w-28">Credit Hours</th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-600 w-28">Theory+Lab</th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-600 w-24">Code</th>
                          <th className="w-8" />
                        </tr>
                      </thead>
                      <tbody>
                        {sem.courses.length === 0 ? (
                          <tr><td colSpan={6} className="px-3 py-3 text-center text-gray-400 text-xs">No courses — click "+ Add Course"</td></tr>
                        ) : sem.courses.map((c, ci) => (
                          <tr key={ci} className="border-b border-gray-100">
                            <td className="px-3 py-2 text-gray-400 text-xs">{ci + 1}</td>
                            <td className="px-2 py-1.5">
                              <input value={c.courseTitle} onChange={e => updateCourse(si, ci, 'courseTitle', e.target.value)}
                                placeholder="e.g. Data Structures" className="admin-input py-1 text-xs" />
                            </td>
                            <td className="px-2 py-1.5">
                              <input value={c.creditHours} onChange={e => updateCourse(si, ci, 'creditHours', e.target.value)}
                                placeholder="3" className="admin-input py-1 text-xs text-center" />
                            </td>
                            <td className="px-2 py-1.5">
                              <input value={c.theoryLab} onChange={e => updateCourse(si, ci, 'theoryLab', e.target.value)}
                                placeholder="3+0" className="admin-input py-1 text-xs text-center" />
                            </td>
                            <td className="px-2 py-1.5">
                              <input value={c.code} onChange={e => updateCourse(si, ci, 'code', e.target.value)}
                                placeholder="CS-101" className="admin-input py-1 text-xs font-mono" />
                            </td>
                            <td className="px-2 py-1.5">
                              <RemoveBtn onClick={() => removeCourse(si, ci)} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── TAB 6: Degree Programs ── */}
          {activeTab === 'programs' && (
            <div className="space-y-5 max-w-3xl">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-700">Degree Programs</h3>
                <AddRowBtn onClick={addProgram} label="Add Program" />
              </div>

              {form.degreePrograms.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
                  <p className="text-gray-400 text-sm">No degree programs yet. Click "Add Program".</p>
                </div>
              ) : form.degreePrograms.map((p, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 relative">
                  <div className="absolute top-4 right-4">
                    <RemoveBtn onClick={() => removeProgram(i)} />
                  </div>
                  <div className="space-y-3 pr-10">
                    <div>
                      <FieldLabel>Program Heading</FieldLabel>
                      <input value={p.heading} onChange={e => updateProgram(i, 'heading', e.target.value)}
                        placeholder="e.g. BS Computer Science" className="admin-input" />
                    </div>
                    <div>
                      <FieldLabel>Description</FieldLabel>
                      <RichText extended value={p.description}
                        onChange={v => updateProgram(i, 'description', v)}
                        placeholder="Describe this program — curriculum, duration, eligibility…" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── TAB 7: Facilities & Resources ── */}
          {activeTab === 'facilities' && (
            <div className="space-y-5 max-w-3xl">
              <SectionCard title="Facilities & Resources">
                <div className="space-y-4">
                  <div>
                    <FieldLabel>Section Heading</FieldLabel>
                    <input value={form.facilitiesHeading} onChange={e => setF('facilitiesHeading', e.target.value)}
                      placeholder="e.g. Our Facilities & Resources" className="admin-input" />
                  </div>
                  <div>
                    <FieldLabel>Description</FieldLabel>
                    <RichText extended value={form.facilitiesDescription}
                      onChange={v => setF('facilitiesDescription', v)}
                      placeholder="Describe the department's facilities and resources…" />
                  </div>

                  {/* Gallery */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <FieldLabel>Gallery Images</FieldLabel>
                      <AddRowBtn onClick={addFacilityImg} label="Add Image" />
                    </div>
                    {form.facilitiesImages.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">
                        No images yet — click "Add Image" above.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {form.facilitiesImages.map((img, i) => (
                          <div key={i} className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                            <div className="relative aspect-video bg-gray-100">
                              {img.preview ? (
                                <img src={img.preview} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl">🏫</div>
                              )}
                              <button type="button" onClick={() => removeFacilityImg(i)}
                                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600">✕</button>
                            </div>
                            <div className="p-2 space-y-1.5">
                              <input type="file" accept=".jpg,.jpeg,.png,.webp"
                                onChange={e => { const f = e.target.files?.[0]; if (f) facilityImgUpload(i, f, URL.createObjectURL(f)); }}
                                className="text-xs text-gray-500 w-full file:mr-1 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                              <input value={img.subtitle} onChange={e => updateFacilityImg(i, 'subtitle', e.target.value)}
                                placeholder="Subtitle / caption" className="admin-input text-xs py-1" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          {/* ── TAB 8: Student Engagement ── */}
          {activeTab === 'engagement' && (
            <div className="space-y-5 max-w-3xl">
              <SectionCard title="Student Engagement">
                <div className="space-y-4">
                  <div>
                    <FieldLabel>Section Heading</FieldLabel>
                    <input value={form.engagementHeading} onChange={e => setF('engagementHeading', e.target.value)}
                      placeholder="e.g. Student Life & Engagement" className="admin-input" />
                  </div>
                  <div>
                    <FieldLabel>Description</FieldLabel>
                    <RichText extended value={form.engagementDescription}
                      onChange={v => setF('engagementDescription', v)}
                      placeholder="Describe student activities, clubs, and engagement opportunities…" />
                  </div>

                  {/* Gallery */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <FieldLabel>Gallery Images</FieldLabel>
                      <AddRowBtn onClick={addEngagementImg} label="Add Image" />
                    </div>
                    {form.engagementImages.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">
                        No images yet — click "Add Image" above.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {form.engagementImages.map((img, i) => (
                          <div key={i} className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                            <div className="relative aspect-video bg-gray-100">
                              {img.preview ? (
                                <img src={img.preview} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl">🤝</div>
                              )}
                              <button type="button" onClick={() => removeEngagementImg(i)}
                                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600">✕</button>
                            </div>
                            <div className="p-2 space-y-1.5">
                              <input type="file" accept=".jpg,.jpeg,.png,.webp"
                                onChange={e => { const f = e.target.files?.[0]; if (f) engagementImgUpload(i, f, URL.createObjectURL(f)); }}
                                className="text-xs text-gray-500 w-full file:mr-1 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                              <input value={img.subtitle} onChange={e => updateEngagementImg(i, 'subtitle', e.target.value)}
                                placeholder="Subtitle / caption" className="admin-input text-xs py-1" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
