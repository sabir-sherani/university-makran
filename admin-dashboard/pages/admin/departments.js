import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AdminHeader from '../../components/AdminHeader';
import axios from 'axios';

const API  = process.env.NEXT_PUBLIC_API_URL;
const BASE = API ? API.replace('/api', '') : 'http://localhost:5000';

export default function DepartmentsList() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [newName, setNewName]         = useState('');
  const [creating, setCreating]       = useState(false);
  const [msg, setMsg]                 = useState('');
  const router = useRouter();

  useEffect(() => { fetchDepartments(); }, []);

  async function fetchDepartments() {
    try {
      const res = await axios.get(`${API}/departments`);
      setDepartments(res.data || []);
    } catch {}
    setLoading(false);
  }

  async function createDepartment(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setMsg('');
    try {
      const fd = new FormData();
      fd.append('name', newName.trim());
      const res = await axios.post(`${API}/departments`, fd);
      router.push(`/admin/departments/${res.data._id}`);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Error creating department.');
      setCreating(false);
    }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API}/departments/${id}`);
      fetchDepartments();
    } catch {
      alert('Error deleting department.');
    }
  }

  return (
    <>
      <Head><title>Departments — Admin Dashboard</title></Head>
      <AdminHeader />

      <div className="ml-0 lg:ml-56 p-8">
        <h2 className="text-3xl font-bold text-primary mb-8">Manage Departments</h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Create panel ── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
              <h3 className="text-lg font-bold text-primary mb-2">Add New Department</h3>
              <p className="text-xs text-gray-400 mb-5">
                Enter a name to create the department. You'll add all tab content in the editor.
              </p>

              {msg && (
                <div className="mb-4 px-4 py-2 rounded text-sm bg-red-50 text-red-700">{msg}</div>
              )}

              <form onSubmit={createDepartment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department Name *</label>
                  <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    required
                    placeholder="e.g. Computer Science"
                    className="admin-input"
                  />
                </div>
                <button
                  type="submit"
                  disabled={creating}
                  className="admin-btn admin-btn-primary w-full flex items-center justify-center gap-2"
                >
                  {creating ? 'Creating…' : <>Create & Open Editor <span>→</span></>}
                </button>
              </form>
            </div>
          </div>

          {/* ── Departments list ── */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-primary mb-5">
                All Departments ({departments.length})
              </h3>

              {loading ? (
                <p className="text-gray-400">Loading…</p>
              ) : departments.length === 0 ? (
                <p className="text-gray-400 text-sm">No departments yet. Create one using the form.</p>
              ) : (
                <div className="space-y-3">
                  {departments.map(dept => (
                    <div
                      key={dept._id}
                      className="border border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:border-primary/30 transition-colors"
                    >
                      {/* Thumbnail */}
                      {dept.bannerImage ? (
                        <img
                          src={`${BASE}${dept.bannerImage}`}
                          alt={dept.name}
                          className="w-16 h-16 object-cover rounded-lg shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary shrink-0">
                          {dept.name.charAt(0)}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-primary">{dept.name}</h4>
                          {dept.slug && (
                            <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded">
                              /{dept.slug}
                            </span>
                          )}
                        </div>
                        {dept.hod?.name && (
                          <p className="text-gray-500 text-sm">HOD: {dept.hod.name}</p>
                        )}
                        {dept.description && (
                          <p className="text-gray-400 text-xs truncate mt-0.5">{dept.description}</p>
                        )}
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <Link
                          href={`/admin/departments/${dept._id}`}
                          className="admin-btn text-xs px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded font-medium"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(dept._id, dept.name)}
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

