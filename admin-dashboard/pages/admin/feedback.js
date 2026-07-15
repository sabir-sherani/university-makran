import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import AdminHeader from '../../components/AdminHeader';
import axios from 'axios';
import {
  LuMessageSquare, LuTrash2, LuMail, LuMailOpen, LuMailCheck, LuStar, LuX,
  LuPaperclip, LuUser, LuBriefcase, LuBuilding2, LuHash, LuTag, LuFileText,
} from 'react-icons/lu';

const API  = process.env.NEXT_PUBLIC_API_URL;
const BASE = API ? API.replace('/api', '') : 'http://localhost:5000';

function fmtDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

const STARS = [1, 2, 3, 4, 5];

function isImage(url) {
  return /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
}

function DetailRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <span className="mt-0.5 text-gray-400 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm text-gray-800 break-words">{value}</p>
      </div>
    </div>
  );
}

function FeedbackModal({ item, onClose, onDelete, onToggleRead }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const attachUrl = item.attachmentUrl ? `${BASE}${item.attachmentUrl}` : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ background: '#041476' }}>
              {(item.name || 'A')[0].toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">{item.name || 'Anonymous'}</p>
              {item.referenceNumber && (
                <p className="text-xs text-gray-400 font-mono">{item.referenceNumber}</p>
              )}
            </div>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <LuX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-1">

          {/* Rating */}
          {item.rating != null && (
            <div className="flex items-center gap-1 mb-3">
              {STARS.map(s => (
                <LuStar key={s} size={14}
                  className={s <= item.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />
              ))}
              <span className="text-xs text-gray-500 ml-1 font-semibold">{item.rating}/5</span>
            </div>
          )}

          <DetailRow icon={<LuUser size={14} />}       label="Name"          value={item.name} />
          <DetailRow icon={<LuMail size={14} />}       label="Email"         value={item.email} />
          <DetailRow icon={<LuHash size={14} />}       label="University ID" value={item.universityId} />
          <DetailRow icon={<LuBriefcase size={14} />}  label="Role"          value={item.role} />
          <DetailRow icon={<LuBuilding2 size={14} />}  label="Department"    value={item.department} />
          <DetailRow icon={<LuTag size={14} />}        label="Category"      value={item.category} />
          <DetailRow icon={<LuFileText size={14} />}   label="Subject"       value={item.subject} />

          {/* Feedback message */}
          <div className="py-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Feedback</p>
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
              {item.feedback}
            </div>
          </div>

          {/* Attachment */}
          {attachUrl && (
            <div className="py-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <LuPaperclip size={12} /> Attachment
              </p>
              {isImage(item.attachmentUrl) ? (
                <div className="rounded-xl overflow-hidden border border-gray-200">
                  <img src={attachUrl} alt="Attachment"
                    className="w-full max-h-72 object-contain bg-gray-50 cursor-pointer"
                    onClick={() => window.open(attachUrl, '_blank')} />
                  <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-xs text-gray-500 truncate">{item.attachmentUrl.split('/').pop()}</span>
                    <a href={attachUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-semibold text-blue-600 hover:underline shrink-0 ml-2">
                      Open ↗
                    </a>
                  </div>
                </div>
              ) : (
                <a href={attachUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: '#fff3e0' }}>
                    <LuPaperclip size={16} style={{ color: '#FA7902' }} />
                  </div>
                  <span className="text-sm text-gray-700 font-medium truncate group-hover:text-blue-700">
                    {item.attachmentUrl.split('/').pop()}
                  </span>
                  <span className="ml-auto text-xs text-blue-500 shrink-0">Download ↗</span>
                </a>
              )}
            </div>
          )}

          <p className="text-xs text-gray-400 pt-2">{fmtDate(item.createdAt)}</p>
        </div>

        {/* Footer actions */}
        <div className="flex gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button onClick={() => { onToggleRead(item._id, !item.read); onClose(); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors flex-1 justify-center">
            {item.read ? <><LuMail size={15} /> Mark Unread</> : <><LuMailOpen size={15} /> Mark Read</>}
          </button>
          <button onClick={() => { onDelete(item._id); onClose(); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 transition-colors">
            <LuTrash2 size={15} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Feedback() {
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState('all');
  const [msg, setMsg]                   = useState({ text: '', ok: true });
  const [selected, setSelected]         = useState(null);

  useEffect(() => { fetchFeedback(); }, []);

  async function fetchFeedback() {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/feedback`);
      setFeedbackList(res.data || []);
    } catch {
      setFeedbackList([]);
    }
    setLoading(false);
  }

  function flash(text, ok = true) {
    setMsg({ text, ok });
    setTimeout(() => setMsg({ text: '', ok: true }), 3000);
  }

  async function markRead(id, read) {
    try {
      await axios.put(`${API}/feedback/${id}`, { read });
      setFeedbackList(prev => prev.map(f => f._id === id ? { ...f, read } : f));
    } catch {
      flash('Error updating feedback.', false);
    }
  }

  async function markAllRead() {
    try {
      await Promise.all(
        feedbackList.filter(f => !f.read).map(f => axios.put(`${API}/feedback/${f._id}`, { read: true }))
      );
      setFeedbackList(prev => prev.map(f => ({ ...f, read: true })));
      flash('All feedback marked as read.');
    } catch {
      flash('Error updating feedback.', false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this feedback? This cannot be undone.')) return;
    try {
      await axios.delete(`${API}/feedback/${id}`);
      setFeedbackList(prev => prev.filter(f => f._id !== id));
      flash('Feedback deleted.');
    } catch {
      flash('Error deleting feedback.', false);
    }
  }

  const unreadCount = feedbackList.filter(f => !f.read).length;

  const filtered = useMemo(() => {
    if (filter === 'unread') return feedbackList.filter(f => !f.read);
    if (filter === 'read')   return feedbackList.filter(f =>  f.read);
    return feedbackList;
  }, [feedbackList, filter]);

  return (
    <>
      <Head><title>Feedback — Admin Dashboard</title></Head>
      <AdminHeader />

      <div className="ml-0 lg:ml-56 min-h-screen bg-gray-50 p-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-bold text-primary flex items-center gap-3">
              <LuMessageSquare size={28} />
              User Feedback
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {feedbackList.length} total · <span className="font-semibold text-red-500">{unreadCount} unread</span>
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-colors shadow-sm"
            >
              <LuMailCheck size={16} />
              Mark all as read
            </button>
          )}
        </div>

        {/* Flash */}
        {msg.text && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium border ${msg.ok ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
            {msg.text}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5">
          {[
            { key: 'all',    label: 'All',    count: feedbackList.length },
            { key: 'unread', label: 'Unread', count: unreadCount },
            { key: 'read',   label: 'Read',   count: feedbackList.length - unreadCount },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                filter === t.key
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-primary hover:text-primary'
              }`}
            >
              {t.label} <span className="ml-1 opacity-70">({t.count})</span>
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white rounded-2xl p-12 text-center text-gray-400 shadow-sm border border-gray-100">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading feedback…
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 text-center text-gray-400 shadow-sm border border-gray-100">
              <LuMessageSquare size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No {filter !== 'all' ? filter : ''} feedback found.</p>
            </div>
          ) : (
            filtered.map(item => (
              <div
                key={item._id}
                onClick={() => { setSelected(item); if (!item.read) markRead(item._id, true); }}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow ${
                  !item.read ? 'border-blue-200 shadow-blue-50' : 'border-gray-100'
                }`}
              >
                <div className="flex items-start gap-4 px-5 py-4">
                  {/* Read indicator */}
                  <div className="mt-1 shrink-0">
                    {item.read
                      ? <LuMailOpen size={18} className="text-gray-400" />
                      : <LuMail size={18} className="text-blue-500" />
                    }
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`font-bold text-sm ${item.read ? 'text-gray-700' : 'text-gray-900'}`}>
                        {item.name || 'Anonymous'}
                      </span>
                      {!item.read && (
                        <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full font-semibold">New</span>
                      )}
                      {item.email && <span className="text-xs text-gray-400">{item.email}</span>}
                      {item.category && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{item.category}</span>
                      )}
                    </div>

                    {/* Rating */}
                    {item.rating != null && (
                      <div className="flex items-center gap-1 mb-2">
                        {STARS.map(s => (
                          <LuStar
                            key={s}
                            size={12}
                            className={s <= item.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}
                          />
                        ))}
                        <span className="text-xs text-gray-500 ml-1">{item.rating}/5</span>
                      </div>
                    )}

                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">{item.feedback}</p>

                    <div className="flex items-center gap-3 mt-2">
                      <p className="text-xs text-gray-400">{fmtDate(item.createdAt)}</p>
                      {item.attachmentUrl && (
                        <span className="flex items-center gap-1 text-xs text-orange-500 font-medium">
                          <LuPaperclip size={11} /> Attachment
                        </span>
                      )}
                      <span className="ml-auto text-xs text-blue-400 font-medium">Click to open →</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => markRead(item._id, !item.read)}
                      title={item.read ? 'Mark as unread' : 'Mark as read'}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                    >
                      {item.read ? <LuMail size={15} /> : <LuMailOpen size={15} />}
                    </button>
                    <button
                      onClick={() => handleDelete(item._id)}
                      title="Delete"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <LuTrash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* Detail modal */}
      {selected && (
        <FeedbackModal
          item={selected}
          onClose={() => setSelected(null)}
          onDelete={(id) => { handleDelete(id); setSelected(null); }}
          onToggleRead={markRead}
        />
      )}
    </>
  );
}

