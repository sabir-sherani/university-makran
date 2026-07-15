import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import AdminHeader from '../../components/AdminHeader';
import axios from 'axios';

// TipTap uses browser APIs — load only on client
const RichTextEditor = dynamic(() => import('../../components/RichTextEditor'), { ssr: false });

const API = process.env.NEXT_PUBLIC_API_URL;
const BASE = API ? API.replace('/api', '') : 'http://localhost:5000';

function imgUrl(p) {
  if (!p) return null;
  if (p.startsWith('http')) return p;
  return `${BASE}${p}`;
}

const emptyForm = {
  name: '',
  about: '',
  hodName: '',
  hodPosition: '',
  hodSpecialization: '',
  hodAbout: '',
  hodMessage: '',
  hodImage: null,
  order: 0,
};

const emptyStaffMember = {
  name: '',
  jobTitle: '',
  education: '',
  email: '',
  phone: '',
  bio: '',
  image: null,
  imagePreview: '',
  existingImage: '',
};

export default function AdministrationAdmin() {
  const [depts, setDepts]           = useState([]);
  const [formData, setFormData]     = useState(emptyForm);
  const [editId, setEditId]         = useState(null);
  const [staffList, setStaffList]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState('');
  const [hodPreview, setHodPreview] = useState('');
  const hodRef = useRef();

  useEffect(() => { fetchDepts(); }, []);

  async function fetchDepts() {
    try {
      const res = await axios.get(`${API}/admin-depts`);
      setDepts(res.data || []);
    } catch { /* silent */ }
    setLoading(false);
  }

  function handleField(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleHodImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormData((prev) => ({ ...prev, hodImage: file }));
    setHodPreview(URL.createObjectURL(file));
  }

  // ── Staff helpers ────────────────────────────────────────────────────────────

  function addStaffRow() {
    setStaffList((prev) => [...prev, { ...emptyStaffMember }]);
  }

  function removeStaffRow(idx) {
    setStaffList((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateStaff(idx, field, value) {
    setStaffList((prev) => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  }

  function handleStaffImage(idx, e) {
    const file = e.target.files?.[0];
    if (!file) return;
    updateStaff(idx, 'image', file);
    updateStaff(idx, 'imagePreview', URL.createObjectURL(file));
  }

  function resetForm() {
    setFormData(emptyForm);
    setHodPreview('');
    setStaffList([]);
    setEditId(null);
    setMsg('');
    if (hodRef.current) hodRef.current.value = '';
  }

  async function startEdit(dept) {
    // The list API returns a lightweight projection without staff — fetch the full record.
    let full = dept;
    try {
      const res = await axios.get(`${API}/admin-depts/${dept._id}`);
      full = res.data;
    } catch { /* fall back to whatever the list gave us */ }

    setEditId(full._id);
    setFormData({
      name:             full.name || '',
      about:            full.about || '',
      hodName:          full.hod?.name           || '',
      hodPosition:      full.hod?.position       || '',
      hodSpecialization:full.hod?.specialization || '',
      hodAbout:         full.hod?.about          || '',
      hodMessage:       full.hod?.message        || '',
      hodImage:         null,
      order:            full.order || 0,
    });
    setHodPreview(full.hod?.image ? imgUrl(full.hod.image) : '');
    setStaffList((full.staff || []).map((m) => ({
      name:          m.name || '',
      jobTitle:      m.jobTitle || '',
      education:     m.education || '',
      email:         m.email || '',
      phone:         m.phone || '',
      bio:           m.bio || '',
      image:         null,
      imagePreview:  '',
      existingImage: m.image || '',
    })));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const fd = new FormData();
      fd.append('name',             formData.name);
      fd.append('about',            formData.about);
      fd.append('hodName',          formData.hodName);
      fd.append('hodPosition',      formData.hodPosition);
      fd.append('hodSpecialization',formData.hodSpecialization);
      fd.append('hodAbout',         formData.hodAbout);
      fd.append('hodMessage',       formData.hodMessage);
      fd.append('order',            formData.order);
      if (formData.hodImage) fd.append('hodImage', formData.hodImage);

      const staffJson = staffList.map((m) => ({
        name:          m.name,
        jobTitle:      m.jobTitle,
        education:     m.education,
        email:         m.email,
        phone:         m.phone,
        bio:           m.bio || '',
        image:         m.existingImage || '',
      }));
      fd.append('staffJson', JSON.stringify(staffJson));
      staffList.forEach((m, i) => {
        if (m.image) fd.append(`staffImage_${i}`, m.image);
      });

      if (editId) {
        await axios.put(`${API}/admin-depts/${editId}`, fd);
        setMsg('Department updated successfully.');
      } else {
        await axios.post(`${API}/admin-depts`, fd);
        setMsg('Department created successfully.');
      }
      resetForm();
      fetchDepts();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Error saving department.');
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this department? This cannot be undone.')) return;
    try {
      await axios.delete(`${API}/admin-depts/${id}`);
      fetchDepts();
    } catch {
      alert('Error deleting department.');
    }
  }

  return (
    <>
      <Head><title>Manage Administration - Admin Dashboard</title></Head>
      <AdminHeader />

      <div className="ml-0 lg:ml-56 p-8">
        <h2 className="text-3xl font-bold text-primary mb-8">
          {editId ? 'Edit Department' : 'Administration Departments'}
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── FORM ── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6" style={{ maxHeight: 'calc(100vh - 3rem)', overflowY: 'auto' }}>
              <h3 className="text-lg font-bold text-primary mb-5">
                {editId ? 'Edit Department' : 'Add Department'}
              </h3>

              {msg && (
                <div className={`mb-4 px-4 py-2 rounded text-sm ${msg.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                  {msg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">

                {/* ── Department basics ── */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department Name *</label>
                  <input name="name" value={formData.name} onChange={handleField} required placeholder="e.g. IT Department" className="admin-input" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">About Department</label>
                  <RichTextEditor
                    value={formData.about}
                    onChange={(html) => setFormData((prev) => ({ ...prev, about: html }))}
                    placeholder="Write about this department..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                  <input name="order" type="number" value={formData.order} onChange={handleField} min={0} className="admin-input" />
                </div>

                {/* ── Head Person ── */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-bold text-gray-800 mb-3">Head Person</h4>
                  <div className="space-y-3">

                    {/* Photo */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Photo (JPG/PNG, max 2MB)</label>
                      <input ref={hodRef} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleHodImage} className="admin-input text-sm" />
                      {hodPreview && (
                        <img
                          src={hodPreview}
                          alt="preview"
                          className="mt-2 w-20 h-20 rounded-xl object-cover border"
                          style={{ objectPosition: 'top center' }}
                        />
                      )}
                    </div>

                    <input name="hodName" value={formData.hodName} onChange={handleField} placeholder="Full Name" className="admin-input" />
                    <input name="hodPosition" value={formData.hodPosition} onChange={handleField} placeholder="Position (e.g. Director, HOD, Registrar, Dean)" className="admin-input" />
                    <input name="hodSpecialization" value={formData.hodSpecialization} onChange={handleField} placeholder="Specialization (e.g. Network Administration)" className="admin-input" />

                    {/* Rich text for HOD about */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">About HOD</label>
                      <RichTextEditor
                        value={formData.hodAbout}
                        onChange={(html) => setFormData((prev) => ({ ...prev, hodAbout: html }))}
                        placeholder="Write about the HOD..."
                      />
                    </div>

                    {/* Rich text for HOD message */}
                    <div className="border-t pt-3">
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Message from the Head of Department
                      </label>
                      <p className="text-xs text-gray-400 mb-2">
                        A personal message or welcome note from the head — displayed prominently on the department page.
                      </p>
                      <RichTextEditor
                        value={formData.hodMessage}
                        onChange={(html) => setFormData((prev) => ({ ...prev, hodMessage: html }))}
                        placeholder="Write the head's message here…"
                      />
                    </div>
                  </div>
                </div>

                {/* ── Staff ── */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-gray-800">Staff Members</h4>
                    <button type="button" onClick={addStaffRow} className="text-xs font-semibold text-primary hover:underline">
                      + Add Member
                    </button>
                  </div>

                  {staffList.length === 0 && (
                    <p className="text-xs text-gray-400">No staff added yet.</p>
                  )}

                  <div className="space-y-4">
                    {staffList.map((member, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-3 space-y-2 relative bg-gray-50/50">
                        <button
                          type="button"
                          onClick={() => removeStaffRow(idx)}
                          className="absolute top-2 right-2 text-xs text-red-500 hover:text-red-700 font-bold leading-none"
                          title="Remove"
                        >
                          ✕
                        </button>

                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Member #{idx + 1}
                        </p>

                        {/* Photo */}
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Photo</label>
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp"
                            onChange={(e) => handleStaffImage(idx, e)}
                            className="admin-input text-xs"
                          />
                          {(member.imagePreview || member.existingImage) && (
                            <img
                              src={member.imagePreview || imgUrl(member.existingImage)}
                              alt="staff"
                              className="mt-1.5 w-14 h-14 rounded-xl object-cover border"
                              style={{ objectPosition: 'top center' }}
                            />
                          )}
                        </div>

                        {/* Name */}
                        <input
                          value={member.name}
                          onChange={(e) => updateStaff(idx, 'name', e.target.value)}
                          placeholder="Full Name *"
                          required
                          className="admin-input"
                        />

                        {/* Job Title */}
                        <input
                          value={member.jobTitle}
                          onChange={(e) => updateStaff(idx, 'jobTitle', e.target.value)}
                          placeholder="Job Title"
                          className="admin-input"
                        />

                        {/* Education */}
                        <input
                          value={member.education}
                          onChange={(e) => updateStaff(idx, 'education', e.target.value)}
                          placeholder="Education (e.g. BSc Computer Science)"
                          className="admin-input"
                        />

                        {/* Email */}
                        <input
                          type="email"
                          value={member.email}
                          onChange={(e) => updateStaff(idx, 'email', e.target.value)}
                          placeholder="Email address"
                          className="admin-input"
                        />

                        {/* Phone */}
                        <input
                          value={member.phone}
                          onChange={(e) => updateStaff(idx, 'phone', e.target.value)}
                          placeholder="Phone / Extension"
                          className="admin-input"
                        />

                        {/* Bio / Publications */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Publications / Bio</label>
                          <RichTextEditor
                            extended
                            value={member.bio || ''}
                            onChange={(html) => updateStaff(idx, 'bio', html)}
                            placeholder="Write about this staff member — publications, research interests, background…"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving} className="admin-btn admin-btn-primary flex-1">
                    {saving ? 'Saving...' : editId ? 'Update Department' : 'Add Department'}
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
              <h3 className="text-lg font-bold text-primary mb-5">All Departments ({depts.length})</h3>
              {loading ? (
                <p className="text-gray-500">Loading...</p>
              ) : depts.length === 0 ? (
                <p className="text-gray-400 text-sm">No departments yet. Add one using the form.</p>
              ) : (
                <div className="space-y-3">
                  {depts.map((dept) => {
                    const hodPhoto = imgUrl(dept.hod?.image);
                    return (
                      <div key={dept._id} className="border border-gray-200 rounded-lg p-4 flex items-center gap-4">
                        {/* HOD avatar */}
                        {hodPhoto ? (
                          <img
                            src={hodPhoto}
                            alt={dept.hod?.name}
                            className="w-12 h-12 rounded-full object-cover shrink-0"
                            style={{ objectPosition: 'top center' }}
                          />
                        ) : (
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shrink-0"
                            style={{ background: '#041476' }}
                          >
                            {dept.name.charAt(0)}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-primary truncate">{dept.name}</h4>
                            {dept.slug && (
                              <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded">
                                /{dept.slug}
                              </span>
                            )}
                          </div>
                          {dept.hod?.name && (
                            <p className="text-sm text-gray-500 truncate">
                              {dept.hod.position || 'Head'}: {dept.hod.name}
                            </p>
                          )}
                          {dept.about && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{dept.about}</p>
                          )}
                        </div>

                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => startEdit(dept)}
                            className="admin-btn text-xs px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(dept._id)}
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

