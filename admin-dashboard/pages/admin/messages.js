import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import AdminHeader from '../../components/AdminHeader';
import axios from 'axios';
import {
  LuMail, LuMailOpen, LuTrash2, LuMailCheck,
  LuPhone, LuUser, LuCalendar, LuMessageSquare,
} from 'react-icons/lu';

const API = process.env.NEXT_PUBLIC_API_URL;

function fmtDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function Messages() {
  const [messages, setMessages]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState(null);
  const [filter, setFilter]       = useState('all');  // all | unread | read
  const [msg, setMsg]             = useState({ text: '', ok: true });

  useEffect(() => { fetchMessages(); }, []);

  async function fetchMessages() {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/contact`);
      setMessages(res.data || []);
    } catch {
      setMessages([]);
    }
    setLoading(false);
  }

  function flash(text, ok = true) {
    setMsg({ text, ok });
    setTimeout(() => setMsg({ text: '', ok: true }), 3000);
  }

  async function markRead(id, read) {
    try {
      await axios.put(`${API}/contact/${id}`, { read });
      setMessages(prev => prev.map(m => m._id === id ? { ...m, read } : m));
    } catch {
      flash('Error updating message.', false);
    }
  }

  async function markAllRead() {
    try {
      await axios.put(`${API}/contact/mark-all-read`);
      setMessages(prev => prev.map(m => ({ ...m, read: true })));
      flash('All messages marked as read.');
    } catch {
      flash('Error updating messages.', false);
    }
  }

  async function deleteMessage(id) {
    if (!confirm('Delete this message? This cannot be undone.')) return;
    try {
      await axios.delete(`${API}/contact/${id}`);
      setMessages(prev => prev.filter(m => m._id !== id));
      if (expanded === id) setExpanded(null);
      flash('Message deleted.');
    } catch {
      flash('Error deleting message.', false);
    }
  }

  const filtered = useMemo(() => {
    if (filter === 'unread') return messages.filter(m => !m.read);
    if (filter === 'read')   return messages.filter(m =>  m.read);
    return messages;
  }, [messages, filter]);

  const unreadCount = messages.filter(m => !m.read).length;

  return (
    <>
      <Head><title>Messages — Admin Dashboard</title></Head>
      <AdminHeader />

      <div className="ml-0 lg:ml-56 min-h-screen bg-gray-50 p-8">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-bold text-primary flex items-center gap-3">
              <LuMessageSquare size={28} />
              Contact Messages
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {messages.length} total · <span className="font-semibold text-red-500">{unreadCount} unread</span>
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

        {/* ── Filter tabs ── */}
        <div className="flex gap-2 mb-5">
          {[
            { key: 'all',    label: 'All',    count: messages.length },
            { key: 'unread', label: 'Unread', count: unreadCount },
            { key: 'read',   label: 'Read',   count: messages.length - unreadCount },
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

        {/* ── Messages list ── */}
        <div className="space-y-2">
          {loading ? (
            <div className="bg-white rounded-2xl p-12 text-center text-gray-400 shadow-sm border border-gray-100">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading messages…
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 text-center text-gray-400 shadow-sm border border-gray-100">
              <LuMailOpen size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No {filter !== 'all' ? filter : ''} messages found.</p>
            </div>
          ) : (
            filtered.map(m => {
              const isOpen = expanded === m._id;
              return (
                <div
                  key={m._id}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-200 ${
                    !m.read ? 'border-blue-200 shadow-blue-50' : 'border-gray-100'
                  }`}
                >
                  {/* Row header — clickable to expand */}
                  <div
                    className={`flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${isOpen ? 'bg-gray-50' : ''}`}
                    onClick={() => {
                      setExpanded(isOpen ? null : m._id);
                      if (!m.read) markRead(m._id, true);
                    }}
                  >
                    {/* Read/unread dot */}
                    <div className="mt-1 shrink-0">
                      {m.read
                        ? <LuMailOpen size={18} className="text-gray-400" />
                        : <LuMail size={18} className="text-blue-500" />
                      }
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold text-sm ${m.read ? 'text-gray-700' : 'text-gray-900'}`}>
                          {m.name}
                        </span>
                        {!m.read && (
                          <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full font-semibold">New</span>
                        )}
                        <span className="text-xs text-gray-400">{m.email}</span>
                      </div>
                      <p className={`text-sm mt-0.5 truncate ${m.read ? 'text-gray-500' : 'text-gray-700 font-medium'}`}>
                        {m.subject}
                      </p>
                      {!isOpen && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">{m.message}</p>
                      )}
                    </div>

                    {/* Date + actions */}
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className="text-xs text-gray-400 hidden sm:block">{fmtDate(m.createdAt)}</span>

                      {/* Mark read/unread toggle */}
                      <button
                        onClick={e => { e.stopPropagation(); markRead(m._id, !m.read); }}
                        title={m.read ? 'Mark as unread' : 'Mark as read'}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        {m.read ? <LuMail size={15} /> : <LuMailOpen size={15} />}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={e => { e.stopPropagation(); deleteMessage(m._id); }}
                        title="Delete"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <LuTrash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded body */}
                  {isOpen && (
                    <div className="px-5 pb-5 border-t border-gray-100">
                      <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-500">
                          <LuUser size={14} className="shrink-0" />
                          <span className="font-medium text-gray-700">{m.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500">
                          <LuMailOpen size={14} className="shrink-0" />
                          <a href={`mailto:${m.email}`} className="text-blue-600 hover:underline">{m.email}</a>
                        </div>
                        {m.phone && (
                          <div className="flex items-center gap-2 text-gray-500">
                            <LuPhone size={14} className="shrink-0" />
                            <a href={`tel:${m.phone}`} className="hover:underline">{m.phone}</a>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-gray-400 text-xs sm:col-span-3">
                          <LuCalendar size={13} className="shrink-0" />
                          {fmtDate(m.createdAt)}
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap border border-gray-100">
                        {m.message}
                      </div>

                      <div className="flex gap-3 mt-4">
                        <a
                          href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject)}`}
                          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-colors"
                        >
                          <LuMail size={14} /> Reply via Email
                        </a>
                        <button
                          onClick={() => deleteMessage(m._id)}
                          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        >
                          <LuTrash2 size={14} /> Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>
    </>
  );
}

