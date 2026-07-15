import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import AdminHeader from '../../components/AdminHeader';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

const emptyForm = { name: '', designation: '', department: '', photo: null };

export default function Faculty() {
  const [faculty, setFaculty]           = useState([]);
  const [departments, setDepartments]   = useState([]);
  const [formData, setFormData]         = useState(emptyForm);
  const [editId, setEditId]             = useState(null);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [msg, setMsg]                   = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const fileRef = useRef();

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    try {
      const [fRes, dRes] = await Promise.all([
        axios.get(`${API}/faculty`),
        axios.get(`${API}/departments`),
      ]);
      setFaculty(fRes.data || []);
      setDepartments(dRes.data || []);
    } catch { /* silent */ }
    setLoading(false);
  }

  function handleField(e) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormData((prev) => ({ ...prev, photo: file }));
    setPhotoPreview(URL.createObjectURL(file));
  }

  function resetForm() {
    setFormData(emptyForm);
    setPhotoPreview('');
    setEditId(null);
    setMsg('');
    if (fileRef.current) fileRef.current.value = '';
  }

  function startEdit(member) {
    setEditId(member._id);
    setFormData({
      name:        member.name || '',
      designation: member.designation || '',
      department:  member.department?._id || member.department || '',
      photo:       null,
    });
    const base = API.replace('/api', '');
    setPhotoPreview(member.photo ? `${base}${member.photo}` : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const fd = new FormData();
      fd.append('name',        formData.name);
      fd.append('designation', formData.designation);
      fd.append('department',  formData.department);
      if (formData.photo) fd.append('photo', formData.photo);

      if (editId) {
        await axios.put(`${API}/faculty/${editId}`, fd);
        setMsg('Faculty member updated.');
      } else {
        await axios.post(`${API}/faculty`, fd);
        setMsg('Faculty member added.');
      }
      resetForm();
      fetchAll();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Error saving faculty member.');
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this faculty member?')) return;
    try {
      await axios.delete(`${API}/faculty/${id}`);
      fetchAll();
    } catch { alert('Error deleting.'); }
  }

  const base = API.replace('/api', '');

  return (
    <>
      <Head><title>Manage Faculty - Admin Dashboard</title></Head>
      <AdminHeader />

      <div className="ml-0 lg:ml-56 p-8">
        <h2 className="text-3xl font-bold text-primary mb-8">Manage Faculty & Staff</h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── FORM ── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
              <h3 className="text-lg font-bold text-primary mb-5">
                {editId ? 'Edit Member' : 'Add Faculty / Staff'}
              </h3>

              {msg && (
                <div className={`mb-4 px-4 py-2 rounded text-sm ${msg.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                  {msg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input name="name" value={formData.name} onChange={handleField} required placeholder="e.g. Dr. Ahmad Kakar" className="admin-input" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                  <input name="designation" value={formData.designation} onChange={handleField} placeholder="e.g. Associate Professor" className="admin-input" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select name="department" value={formData.department} onChange={handleField} className="admin-input">
                    <option value="">— Select Department —</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Photo (JPG/PNG, max 2MB)</label>
                  <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleFile} className="admin-input text-sm" />
                  {photoPreview && (
                    <img src={photoPreview} alt="Preview" className="mt-2 w-20 h-20 object-cover rounded-full border shadow" />
                  )}
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="submit" disabled={saving} className="admin-btn admin-btn-primary flex-1">
                    {saving ? 'Saving...' : editId ? 'Update' : 'Add Member'}
                  </button>
                  {editId && (
                    <button type="button" onClick={resetForm} className="admin-btn admin-btn-danger">Cancel</button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* ── LIST ── */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-primary mb-5">All Faculty & Staff ({faculty.length})</h3>

              {loading ? (
                <p className="text-gray-500">Loading...</p>
              ) : faculty.length === 0 ? (
                <p className="text-gray-400 text-sm">No faculty members found.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {faculty.map((member) => {
                    const photo = member.photo ? `${base}${member.photo}` : null;
                    return (
                      <div key={member._id} className="border border-gray-200 rounded-lg p-4 flex items-center gap-4">
                        {photo ? (
                          <img src={photo} alt={member.name} className="w-14 h-14 rounded-full object-cover border shadow shrink-0" />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary shrink-0">
                            {member.name.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-800 truncate">{member.name}</h4>
                          {member.designation && <p className="text-sm text-gray-500 truncate">{member.designation}</p>}
                          {member.department?.name && <p className="text-xs text-gray-400">{member.department.name}</p>}
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <button onClick={() => startEdit(member)} className="admin-btn text-xs px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(member._id)} className="admin-btn admin-btn-danger text-xs">
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

