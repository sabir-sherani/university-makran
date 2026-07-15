import React, { useState, useRef } from 'react';
import Head from 'next/head';
import Header from '../components/Header.js';
import Footer from '../components/Footer.js';
import axios from 'axios';

const DEPARTMENTS = [
  'Education',
  'Computer Science',
  'Botany',
  'English',
  'International Relations (IR)',
  'Social Work',
  'Balochi',
  'BBA',
];

const CATEGORIES = [
  'Academic Programs',
  'Faculty & Teaching',
  'Campus Facilities',
  'Student Services',
  'Administration',
  'Fee & Finance',
  'Examinations',
  'General',
];

const ROLES = ['Student', 'Teacher', 'HOD', 'Staff', 'Parent / Guardian', 'Alumni', 'Visitor'];

const WHY_CARDS = [
  { icon: '📈', title: 'Drive Improvement', desc: 'Your insights directly influence how we enhance academic programs and campus services for everyone.' },
  { icon: '🎓', title: 'Shape Education', desc: 'Student and faculty feedback shapes curriculum updates, teaching methods, and learning resources.' },
  { icon: '🏛️', title: 'Improve Facilities', desc: 'Share your experience with labs, library, classrooms, and hostels so we can address gaps quickly.' },
  { icon: '🤝', title: 'Build Community', desc: 'Constructive feedback fosters a culture of openness, trust, and continuous collaboration.' },
  { icon: '📋', title: 'Policy Development', desc: 'Leadership uses aggregated feedback to craft policies that genuinely reflect the community\'s needs.' },
  { icon: '⚡', title: 'Quick Action', desc: 'Every submission is reviewed by the relevant department and acted upon within a defined timeframe.' },
];

const HOW_STEPS = [
  { num: '01', title: 'Fill the Form', desc: 'Complete the feedback form above with your details and message.' },
  { num: '02', title: 'Submit Securely', desc: 'Your submission is encrypted and sent directly to the quality team.' },
  { num: '03', title: 'Receive Reference', desc: 'A unique reference number (e.g. UOMP-FB-2026-00001) is issued instantly.' },
  { num: '04', title: 'Review & Route', desc: 'Our team categorises and routes feedback to the relevant department head.' },
  { num: '05', title: 'Response & Action', desc: 'You receive an acknowledgment and, where applicable, an update on actions taken.' },
];

const FAQS = [
  {
    q: 'Is my feedback anonymous?',
    a: 'You may leave the Name and University ID fields blank to submit anonymously. However, providing your contact details allows us to follow up with you directly.',
  },
  {
    q: 'How long does it take to receive a response?',
    a: 'General feedback is acknowledged within 3 working days. Specific complaints or suggestions that require department-level review may take up to 10 working days.',
  },
  {
    q: 'What file types can I attach?',
    a: 'You can attach JPG, PNG, or PDF files up to 5 MB in size to support your feedback with evidence or screenshots.',
  },
  {
    q: 'Can I track my submitted feedback?',
    a: 'Yes. Save your reference number (e.g. UOMP-FB-2026-00001) and contact the Quality Enhancement Cell at qec@uom.edu.pk to request a status update.',
  },
  {
    q: 'Will my feedback affect my academic standing?',
    a: 'Absolutely not. All feedback is handled confidentially by the administration. No individual submission is ever shared with teaching staff in an attributable form.',
  },
];

export default function FeedbackPortal() {
  const formRef = useRef(null);

  const [form, setForm] = useState({
    name: '', email: '', universityId: '', role: '', department: '',
    category: '', subject: '', feedback: '', rating: 0, confirm: false,
  });
  const [attachment, setAttachment] = useState(null);
  const [attachError, setAttachError] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [refNum, setRefNum] = useState('');
  const [serverError, setServerError] = useState('');
  const [openFaq, setOpenFaq] = useState(null);

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    setAttachError('');
    if (!file) { setAttachment(null); return; }
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.type)) { setAttachError('Only JPG, PNG, or PDF files are allowed.'); setAttachment(null); return; }
    if (file.size > 5 * 1024 * 1024) { setAttachError('File must be under 5 MB.'); setAttachment(null); return; }
    setAttachment(file);
  };

  const validate = () => {
    const e = {};
    if (!form.feedback.trim()) e.feedback = 'Feedback message is required.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address.';
    if (!form.confirm) e.confirm = 'Please confirm before submitting.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;
    setLoading(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (k !== 'confirm') data.append(k, v); });
      if (attachment) data.append('attachment', attachment);
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/feedback`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setRefNum(res.data.referenceNumber || '');
      setSubmitted(true);
      setForm({ name: '', email: '', universityId: '', role: '', department: '', category: '', subject: '', feedback: '', rating: 0, confirm: false });
      setAttachment(null);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  const resetForm = () => { setSubmitted(false); setRefNum(''); scrollToForm(); };

  return (
    <>
      <Head>
        <title>Feedback Portal — University of Makran, Panjgur</title>
        <meta name="description" content="Share your feedback with the University of Makran, Panjgur. Help us improve academic programs, facilities, and services." />
      </Head>

      <Header />

      {/* ─── HERO ─── */}
      <section style={{ background: 'linear-gradient(135deg, #041476 0%, #0a2299 60%, #1a3ab8 100%)', minHeight: '480px' }}
        className="relative flex items-center justify-center overflow-hidden px-4 py-20">
        {/* decorative circles */}
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', top: -80, right: -80 }} />
        <div style={{ position: 'absolute', width: 250, height: 250, borderRadius: '50%', background: 'rgba(250,121,2,0.12)', bottom: -60, left: -60 }} />
        <div className="relative z-10 text-center max-w-3xl mx-auto">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(250,121,2,0.18)', border: '1px solid rgba(250,121,2,0.4)', borderRadius: 999, padding: '6px 18px', marginBottom: 20 }}>
            <span style={{ fontSize: 14, color: '#FA7902', fontWeight: 600, letterSpacing: '0.05em' }}>QUALITY ENHANCEMENT CELL</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 800, color: '#fff', lineHeight: 1.15, marginBottom: 20 }}>
            Your Voice Shapes<br /><span style={{ color: '#FA7902' }}>Our University</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: 18, maxWidth: 580, margin: '0 auto 32px', lineHeight: 1.7 }}>
            Share your honest experiences with academic programs, faculty, facilities, and services. Every submission is reviewed and acted upon.
          </p>
          <button onClick={scrollToForm}
            style={{ background: '#FA7902', color: '#fff', fontWeight: 700, fontSize: 16, padding: '14px 36px', borderRadius: 12, border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(250,121,2,0.4)', transition: 'transform 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Share Feedback ↓
          </button>
        </div>
      </section>

      {/* ─── WHY CARDS ─── */}
      <section style={{ background: '#f8f9fe', padding: '72px 16px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="text-center" style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(1.6rem,3vw,2.4rem)', fontWeight: 800, color: '#041476', marginBottom: 12 }}>Why Your Feedback Matters</h2>
            <p style={{ color: '#64748b', maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>Every comment, suggestion, and concern you share drives meaningful change across our institution.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
            {WHY_CARDS.map((c, i) => (
              <div key={i}
                style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', boxShadow: '0 2px 16px rgba(4,20,118,0.07)', border: '1px solid rgba(4,20,118,0.07)', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(4,20,118,0.13)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 16px rgba(4,20,118,0.07)'; }}
              >
                <div style={{ fontSize: 36, marginBottom: 12 }}>{c.icon}</div>
                <h3 style={{ fontWeight: 700, color: '#041476', fontSize: 17, marginBottom: 8 }}>{c.title}</h3>
                <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7 }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEEDBACK FORM ─── */}
      <section ref={formRef} style={{ background: '#fff', padding: '72px 16px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <div className="text-center" style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(1.6rem,3vw,2.4rem)', fontWeight: 800, color: '#041476', marginBottom: 12 }}>Submit Your Feedback</h2>
            <p style={{ color: '#64748b', lineHeight: 1.7 }}>Fields marked <span style={{ color: '#e53e3e' }}>*</span> are required. You may leave personal fields blank to submit anonymously.</p>
          </div>

          {/* ── Success ── */}
          {submitted ? (
            <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '2px solid #22c55e', borderRadius: 20, padding: '48px 32px', textAlign: 'center', boxShadow: '0 4px 24px rgba(34,197,94,0.12)' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
              <h3 style={{ fontWeight: 800, fontSize: 24, color: '#16a34a', marginBottom: 8 }}>Thank You for Your Feedback!</h3>
              <p style={{ color: '#15803d', marginBottom: 24, lineHeight: 1.7 }}>
                Your submission has been received and will be reviewed by our Quality Enhancement Cell within 3 working days.
              </p>
              {refNum && (
                <div style={{ display: 'inline-block', background: '#041476', color: '#fff', borderRadius: 12, padding: '14px 32px', marginBottom: 24 }}>
                  <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4, letterSpacing: '0.1em' }}>YOUR REFERENCE NUMBER</div>
                  <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: '0.05em', color: '#FA7902' }}>{refNum}</div>
                  <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>Save this number to track your feedback</div>
                </div>
              )}
              <br />
              <button onClick={resetForm}
                style={{ background: '#041476', color: '#fff', fontWeight: 700, padding: '12px 28px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 15 }}>
                Submit Another Response
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} encType="multipart/form-data">
              <div style={{ background: '#f8f9fe', borderRadius: 20, padding: '36px', boxShadow: '0 2px 24px rgba(4,20,118,0.07)', border: '1px solid rgba(4,20,118,0.08)' }}>

                {serverError && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', color: '#dc2626', fontSize: 14, marginBottom: 24 }}>
                    {serverError}
                  </div>
                )}

                {/* Personal Info */}
                <div style={{ marginBottom: 28 }}>
                  <h3 style={{ fontWeight: 700, color: '#041476', fontSize: 15, marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid rgba(4,20,118,0.1)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Personal Information <span style={{ fontWeight: 400, opacity: 0.5 }}>(Optional)</span>
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                    <FieldGroup label="Full Name" error={errors.name}>
                      <input name="name" value={form.name} onChange={handleChange}
                        placeholder="e.g. Ahmed Khan"
                        style={inputStyle(errors.name)} />
                    </FieldGroup>
                    <FieldGroup label="Email Address" error={errors.email}>
                      <input name="email" type="email" value={form.email} onChange={handleChange}
                        placeholder="you@example.com"
                        style={inputStyle(errors.email)} />
                    </FieldGroup>
                    <FieldGroup label="University ID" error={errors.universityId}>
                      <input name="universityId" value={form.universityId} onChange={handleChange}
                        placeholder="e.g. UOM-2024-001"
                        style={inputStyle(errors.universityId)} />
                    </FieldGroup>
                    <FieldGroup label="Role">
                      <select name="role" value={form.role} onChange={handleChange} style={inputStyle()}>
                        <option value="">— Select your role —</option>
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </FieldGroup>
                    <FieldGroup label="Department">
                      <select name="department" value={form.department} onChange={handleChange} style={inputStyle()}>
                        <option value="">— Select department —</option>
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </FieldGroup>
                  </div>
                </div>

                {/* Feedback Details */}
                <div style={{ marginBottom: 28 }}>
                  <h3 style={{ fontWeight: 700, color: '#041476', fontSize: 15, marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid rgba(4,20,118,0.1)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Feedback Details
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 16 }}>
                    <FieldGroup label="Category">
                      <select name="category" value={form.category} onChange={handleChange} style={inputStyle()}>
                        <option value="">— Select category —</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </FieldGroup>
                    <FieldGroup label="Subject">
                      <input name="subject" value={form.subject} onChange={handleChange}
                        placeholder="Brief subject of your feedback"
                        style={inputStyle()} />
                    </FieldGroup>
                  </div>
                  <FieldGroup label={<>Feedback Message <span style={{ color: '#e53e3e' }}>*</span></>} error={errors.feedback}>
                    <textarea name="feedback" value={form.feedback} onChange={handleChange}
                      rows={6}
                      placeholder="Please describe your feedback, suggestion, or concern in detail..."
                      style={{ ...inputStyle(errors.feedback), resize: 'vertical', minHeight: 140, fontFamily: 'inherit' }} />
                  </FieldGroup>
                </div>

                {/* Rating */}
                <div style={{ marginBottom: 28 }}>
                  <h3 style={{ fontWeight: 700, color: '#041476', fontSize: 15, marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid rgba(4,20,118,0.1)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Overall Rating
                  </h3>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button key={star} type="button"
                        onClick={() => setForm(p => ({ ...p, rating: star }))}
                        style={{ fontSize: 36, background: 'none', border: 'none', cursor: 'pointer', transition: 'transform 0.15s',
                          color: form.rating >= star ? '#FA7902' : '#d1d5db' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.25)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      >★</button>
                    ))}
                    <span style={{ fontSize: 13, color: '#94a3b8', marginLeft: 8 }}>
                      {form.rating === 0 ? 'Click to rate' : ['','Poor','Fair','Good','Very Good','Excellent'][form.rating]}
                    </span>
                  </div>
                </div>

                {/* Attachment */}
                <div style={{ marginBottom: 28 }}>
                  <h3 style={{ fontWeight: 700, color: '#041476', fontSize: 15, marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid rgba(4,20,118,0.1)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Attachment <span style={{ fontWeight: 400, opacity: 0.5 }}>(Optional)</span>
                  </h3>
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: `2px dashed ${attachError ? '#fca5a5' : '#cbd5e1'}`, borderRadius: 12, padding: '28px 20px', cursor: 'pointer', background: '#fff', transition: 'border-color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#041476'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = attachError ? '#fca5a5' : '#cbd5e1'}
                  >
                    <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFile} style={{ display: 'none' }} />
                    <span style={{ fontSize: 32, marginBottom: 8 }}>📎</span>
                    {attachment
                      ? <span style={{ color: '#041476', fontWeight: 600, fontSize: 14 }}>📄 {attachment.name}</span>
                      : <>
                          <span style={{ color: '#64748b', fontWeight: 600, fontSize: 14 }}>Click to upload a file</span>
                          <span style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>JPG, PNG or PDF — max 5 MB</span>
                        </>}
                  </label>
                  {attachError && <p style={{ color: '#dc2626', fontSize: 12, marginTop: 6 }}>{attachError}</p>}
                </div>

                {/* Confirmation */}
                <div style={{ marginBottom: 28 }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
                    <input type="checkbox" name="confirm" checked={form.confirm} onChange={handleChange}
                      style={{ width: 18, height: 18, marginTop: 2, accentColor: '#041476', flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: '#475569', lineHeight: 1.6 }}>
                      I confirm that the information I have provided is accurate and that I understand my feedback will be reviewed by the University of Makran's Quality Enhancement Cell in accordance with the Feedback Policy.
                    </span>
                  </label>
                  {errors.confirm && <p style={{ color: '#dc2626', fontSize: 12, marginTop: 6 }}>{errors.confirm}</p>}
                </div>

                {/* Submit */}
                <button type="submit" disabled={loading}
                  style={{ width: '100%', background: loading ? '#94a3b8' : '#041476', color: '#fff', fontWeight: 700, fontSize: 16, padding: '16px', borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s, transform 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#0a2299'; }}
                  onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#041476'; }}
                >
                  {loading
                    ? <><Spinner /> Submitting…</>
                    : '📨 Submit Feedback'}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section style={{ background: 'linear-gradient(135deg, #041476 0%, #0a2299 100%)', padding: '72px 16px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="text-center" style={{ marginBottom: 52 }}>
            <h2 style={{ fontSize: 'clamp(1.6rem,3vw,2.4rem)', fontWeight: 800, color: '#fff', marginBottom: 12 }}>How It Works</h2>
            <p style={{ color: 'rgba(255,255,255,0.68)', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>From submission to action — a transparent, five-step process.</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
            {HOW_STEPS.map((s, i) => (
              <div key={i} style={{ flex: '1 1 180px', maxWidth: 200, textAlign: 'center', position: 'relative' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#FA7902', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontWeight: 800, fontSize: 18, color: '#fff', boxShadow: '0 4px 16px rgba(250,121,2,0.4)' }}>{s.num}</div>
                {i < HOW_STEPS.length - 1 && (
                  <div style={{ position: 'absolute', top: 28, left: 'calc(50% + 28px)', width: 'calc(100% - 56px)', height: 2, background: 'rgba(255,255,255,0.15)' }} className="hidden md:block" />
                )}
                <h4 style={{ fontWeight: 700, color: '#fff', fontSize: 15, marginBottom: 6 }}>{s.title}</h4>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEEDBACK POLICY ─── */}
      <section style={{ background: '#f8f9fe', padding: '72px 16px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.5rem,3vw,2.2rem)', fontWeight: 800, color: '#041476', marginBottom: 24 }}>Feedback Policy</h2>
          <div style={{ background: '#fff', borderRadius: 16, padding: '36px', boxShadow: '0 2px 16px rgba(4,20,118,0.07)', lineHeight: 1.8, color: '#475569', fontSize: 15 }}>
            {[
              ['Confidentiality', 'All personal information submitted through this form is treated as strictly confidential. No personal data is shared with third parties or made available to faculty/staff in an identifiable form.'],
              ['Use of Feedback', 'Submitted feedback is reviewed by the Quality Enhancement Cell and, where appropriate, escalated to the relevant department head, Dean, or Vice Chancellor.'],
              ['Anonymity', 'You may submit feedback without providing any personal information. Anonymous submissions receive equal attention, though we cannot provide personalised follow-up responses.'],
              ['Inappropriate Content', 'Submissions that contain abusive, defamatory, or fraudulent content will be discarded and may be reported to the Student Disciplinary Committee.'],
              ['Data Retention', 'Feedback records are retained for a minimum of three academic years for quality assurance and institutional research purposes.'],
            ].map(([title, body], i) => (
              <div key={i} style={{ marginBottom: i < 4 ? 20 : 0 }}>
                <span style={{ fontWeight: 700, color: '#041476' }}>{title}. </span>{body}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section style={{ background: '#fff', padding: '72px 16px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <div className="text-center" style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(1.5rem,3vw,2.2rem)', fontWeight: 800, color: '#041476', marginBottom: 12 }}>Frequently Asked Questions</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FAQS.map((f, i) => (
              <div key={i} style={{ border: `1px solid ${openFaq === i ? '#041476' : '#e2e8f0'}`, borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.2s' }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', background: openFaq === i ? '#f0f4ff' : '#fff', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 12 }}>
                  <span style={{ fontWeight: 700, color: '#041476', fontSize: 15 }}>{f.q}</span>
                  <span style={{ color: '#FA7902', fontSize: 22, fontWeight: 700, flexShrink: 0, transition: 'transform 0.2s', transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0)' }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 20px 18px', color: '#475569', fontSize: 14, lineHeight: 1.8 }}>{f.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CONTACT CARDS ─── */}
      <section style={{ background: '#f8f9fe', padding: '72px 16px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div className="text-center" style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(1.5rem,3vw,2.2rem)', fontWeight: 800, color: '#041476', marginBottom: 12 }}>Contact the QEC</h2>
            <p style={{ color: '#64748b', lineHeight: 1.7 }}>Prefer to reach us directly? The Quality Enhancement Cell is available through the following channels.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
            {[
              { icon: '✉️', title: 'Email', lines: ['qec@uom.edu.pk', 'For formal inquiries & follow-ups'] },
              { icon: '🕐', title: 'Office Hours', lines: ['Mon–Fri: 9:00 AM – 4:00 PM', 'Closed on weekends & public holidays'] },
              { icon: '📍', title: 'Location', lines: ['Administration Block', 'University of Makran, Panjgur, Balochistan'] },
            ].map((c, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', boxShadow: '0 2px 16px rgba(4,20,118,0.07)', border: '1px solid rgba(4,20,118,0.07)', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>{c.icon}</div>
                <h3 style={{ fontWeight: 700, color: '#041476', fontSize: 16, marginBottom: 8 }}>{c.title}</h3>
                {c.lines.map((l, j) => <p key={j} style={{ color: j === 0 ? '#FA7902' : '#94a3b8', fontSize: j === 0 ? 15 : 13, fontWeight: j === 0 ? 600 : 400, marginBottom: 2 }}>{l}</p>)}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── BOTTOM COMMITMENT ─── */}
      <section style={{ background: 'linear-gradient(135deg, #FA7902 0%, #e56d00 100%)', padding: '56px 16px', textAlign: 'center' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏛️</div>
          <h2 style={{ fontWeight: 800, color: '#fff', fontSize: 'clamp(1.4rem,3vw,2rem)', marginBottom: 12 }}>Our Commitment to You</h2>
          <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: 16, lineHeight: 1.8, marginBottom: 28 }}>
            The University of Makran is committed to continuous improvement. Every piece of feedback you submit is a direct investment in our shared future. We pledge to listen, reflect, and act.
          </p>
          <button onClick={scrollToForm}
            style={{ background: '#fff', color: '#FA7902', fontWeight: 800, fontSize: 15, padding: '14px 32px', borderRadius: 12, border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            Submit Your Feedback
          </button>
        </div>
      </section>

      <Footer />
    </>
  );
}

function FieldGroup({ label, error, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontWeight: 600, color: '#374151', fontSize: 13, marginBottom: 6 }}>{label}</label>
      {children}
      {error && <p style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>{error}</p>}
    </div>
  );
}

function inputStyle(hasError) {
  return {
    width: '100%', boxSizing: 'border-box',
    padding: '10px 14px',
    border: `1.5px solid ${hasError ? '#fca5a5' : '#e2e8f0'}`,
    borderRadius: 10, fontSize: 14, outline: 'none',
    background: '#fff', color: '#1e293b',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  };
}

function Spinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
