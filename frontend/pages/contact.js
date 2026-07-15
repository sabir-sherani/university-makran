import React, { useState } from 'react';
import Head from 'next/head';
import Header from '../components/Header.js';
import Footer from '../components/Footer.js';
import HeroSection from '../components/HeroSection.js';
import { FaPhone, FaEnvelope, FaMapMarkerAlt, FaUniversity, FaUserTie, FaUserGraduate } from 'react-icons/fa';
import axios from 'axios';

const contactOffices = [
  {
    title: 'Administration',
    icon: FaUniversity,
    email: 'info@uomp.edu.pk',
    phone: '0855-642053',
    color: '#041476',
    light: '#eef2ff',
    border: '#c7d2fe',
  },
  {
    title: 'Vice Chancellor',
    icon: FaUserGraduate,
    email: 'vc@uomp.edu.pk',
    phone: '0855-642054',
    color: '#1a3a6b',
    light: '#f0f4fb',
    border: '#c6d4ee',
  },
  {
    title: 'Registrar',
    icon: FaUserTie,
    email: 'registrar@uomp.edu.pk',
    phone: '0855-642054',
    color: '#0d5c3a',
    light: '#eef2ff',
    border: '#c6e8d6',
  },
];

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', subject: '', message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/contact`, formData);
      setSubmitted(true);
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to send message. Please try again.');
    }
    setLoading(false);
  };

  return (
    <>
      <Head>
        <title>Contact Us - University of Makran, Panjgur</title>
      </Head>

      <Header />
      <HeroSection title="Contact Us" subtitle="Get in Touch with University of Makran" />

      <div className="bg-gray-50 py-16">
        <div className="container space-y-12">

          {/* ── THREE CONTACT COLUMNS ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {contactOffices.map((office) => {
              const Icon = office.icon;
              return (
                <div
                  key={office.title}
                  className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Colored top bar */}
                  <div className="h-1.5" style={{ background: office.color }} />

                  <div className="p-6">
                    {/* Icon + title */}
                    <div className="flex items-center gap-3 mb-5">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: office.light, border: `1px solid ${office.border}` }}
                      >
                        <Icon size={20} style={{ color: office.color }} />
                      </div>
                      <h3 className="text-lg font-bold" style={{ color: office.color }}>
                        {office.title}
                      </h3>
                    </div>

                    {/* Email */}
                    <a
                      href={`mailto:${office.email}`}
                      className="flex items-center gap-3 text-gray-600 hover:text-gray-900 transition-colors mb-3 group"
                    >
                      <FaEnvelope size={14} className="shrink-0 text-gray-400 group-hover:text-gray-600" />
                      <span className="text-sm">{office.email}</span>
                    </a>

                    {/* Phone */}
                    <a
                      href={`tel:${office.phone.replace(/-/g, '')}`}
                      className="flex items-center gap-3 text-gray-600 hover:text-gray-900 transition-colors group"
                    >
                      <FaPhone size={13} className="shrink-0 text-gray-400 group-hover:text-gray-600" />
                      <span className="text-sm font-medium">{office.phone}</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── FORM + ADDRESS ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Contact Form — takes 2/3 */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-md p-8">
              <h3 className="text-2xl font-bold text-primary mb-6">Send us a Message</h3>

              {submitted && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6 text-sm font-medium">
                  ✓ Message sent — we will get back to you soon.
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Name *</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} required
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Subject *</label>
                    <input type="text" name="subject" value={formData.subject} onChange={handleChange} required
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Message *</label>
                  <textarea name="message" value={formData.message} onChange={handleChange} required rows={5}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors resize-none" />
                </div>

                <button type="submit" disabled={loading} className="btn btn-primary w-full">
                  {loading ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>

            {/* Address card — takes 1/3 */}
            <div className="flex flex-col gap-5">
              <div className="bg-white rounded-2xl shadow-md p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                    <FaMapMarkerAlt size={18} className="text-primary" />
                  </div>
                  <h3 className="font-bold text-primary text-lg">Address</h3>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Noori Naseer Khan Chowk<br />
                  District Panjgur<br />
                  Balochistan, Pakistan
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-md p-6">
                <h3 className="font-bold text-primary text-base mb-3">Office Hours</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Monday – Friday</span>
                    <span className="font-medium">9:00 AM – 5:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saturday</span>
                    <span className="font-medium">10:00 AM – 2:00 PM</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Sunday</span>
                    <span>Closed</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── GOOGLE MAP ── */}
          <div className="rounded-2xl overflow-hidden shadow-md border border-gray-100">
            <div className="bg-white px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <FaMapMarkerAlt className="text-primary" />
              <span className="font-semibold text-gray-700 text-sm">
                University of Makran — Noori Naseer Khan Chowk, Panjgur, Balochistan
              </span>
            </div>
            <iframe
              title="University of Makran Location"
              src="https://maps.google.com/maps?q=University+of+Makran+Panjgur+Balochistan+Pakistan&t=&z=15&ie=UTF8&iwloc=&output=embed"
              width="100%"
              height="420"
              style={{ border: 0, display: 'block' }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

        </div>
      </div>

      <Footer />
    </>
  );
}
