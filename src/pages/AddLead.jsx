import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Upload, Layers } from 'lucide-react';
import { api, getUser } from '../api';
import { scanCard } from '../cardScanner';
import { OFFLINE_SOURCES, CUSTOMER_TYPES, INDIAN_STATES, salesName } from '../utils';

const EMPTY = {
  full_name: '', phone: '', email: '', company: '', customer_type: 'Institution',
  product_category: '', sub_category: '', country: 'India', state: '', city: '',
  lead_source: 'Phone Call', assigned_sales_email: 'auto', inquiry_details: '',
};

export default function AddLead() {
  const navigate = useNavigate();
  const isAdmin = getUser()?.role === 'admin';
  const [form, setForm] = useState(EMPTY);
  const [meta, setMeta] = useState({ salespeople: [], categories: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [scan, setScan] = useState({ status: 'idle', progress: 0, preview: '', error: '' });
  const cameraRef = useRef(null);
  const fileRef = useRef(null);
  const previewRef = useRef('');

  useEffect(() => {
    api('meta.php').then(setMeta).catch(() => {});
    return () => previewRef.current && URL.revokeObjectURL(previewRef.current);
  }, []);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleCard(file) {
    if (!file) return;
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = URL.createObjectURL(file);
    setScan({ status: 'scanning', progress: 0, preview: previewRef.current, error: '' });
    try {
      const { fields } = await scanCard(file, (p) => setScan((s) => ({ ...s, progress: p })));
      setForm((f) => ({
        ...f,
        full_name: fields.full_name || f.full_name,
        phone: fields.phone || f.phone,
        email: fields.email || f.email,
        company: fields.company || f.company,
        country: 'India',
        state: fields.state || f.state,
        city: fields.city || f.city,
        lead_source: 'Exhibition',
        inquiry_details: [fields.notes, f.inquiry_details].filter(Boolean).join('\n'),
      }));
      setScan((s) => ({ ...s, status: 'done' }));
    } catch (err) {
      setScan((s) => ({ ...s, status: 'error', error: err.message || 'Could not read this card.' }));
    }
  }

  function onPick(e) {
    handleCard(e.target.files[0]);
    e.target.value = '';
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await api('add_lead.php', { method: 'POST', body: form });
      navigate(`/leads/${res.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div>
      <button className="back-link" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> Back
      </button>

      <div className="page-head">
        <div>
          <h1>Add Lead</h1>
          <p className="muted">For inquiries that came by phone, exhibition, reference or walk-in</p>
        </div>
      </div>

      <div className="card scan-card">
        <div className="scan-info">
          <h3>Scan a business card</h3>
          <p className="muted">
            Take a photo or upload a card image. The details below fill in automatically — check them before saving.
          </p>
          <div className="scan-actions">
            <button type="button" className="btn btn-primary" onClick={() => cameraRef.current.click()} disabled={scan.status === 'scanning'}>
              <Camera size={16} /> Take Photo
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => fileRef.current.click()} disabled={scan.status === 'scanning'}>
              <Upload size={16} /> Upload Image
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => navigate('/leads/cards')}>
              <Layers size={16} /> Bulk Upload Cards
            </button>
          </div>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} />

          {scan.status === 'scanning' && (
            <div className="scan-progress">
              <div className="progress"><div style={{ width: `${Math.round(scan.progress * 100)}%` }} /></div>
              <span className="muted small">Reading card… {Math.round(scan.progress * 100)}%</span>
            </div>
          )}
          {scan.status === 'done' && <div className="alert success">Details filled from the card. Please check them below.</div>}
          {scan.status === 'error' && <div className="alert error">{scan.error}</div>}
        </div>
        {scan.preview && <img className="scan-preview" src={scan.preview} alt="Business card" />}
      </div>

      <form className="card form-card" onSubmit={submit}>
        <h3 className="section-title">Customer Details</h3>
        <div className="form-grid">
          <label className="field">
            <span>Customer Name *</span>
            <input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} required />
          </label>
          <label className="field">
            <span>Phone *</span>
            <input value={form.phone} onChange={(e) => set('phone', e.target.value)} required />
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </label>
          <label className="field">
            <span>Company</span>
            <input value={form.company} onChange={(e) => set('company', e.target.value)} />
          </label>
          <label className="field">
            <span>Customer Type</span>
            <select value={form.customer_type} onChange={(e) => set('customer_type', e.target.value)}>
              {CUSTOMER_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Lead Source *</span>
            <select value={form.lead_source} onChange={(e) => set('lead_source', e.target.value)}>
              {OFFLINE_SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
        </div>

        <h3 className="section-title">Requirement</h3>
        <div className="form-grid">
          <label className="field">
            <span>Product Category *</span>
            <input list="category-list" value={form.product_category} onChange={(e) => set('product_category', e.target.value)} required />
            <datalist id="category-list">
              {meta.categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </label>
          <label className="field">
            <span>Sub Category</span>
            <input value={form.sub_category} onChange={(e) => set('sub_category', e.target.value)} />
          </label>
          <label className="field full">
            <span>Inquiry Details / Notes</span>
            <textarea rows={5} value={form.inquiry_details} onChange={(e) => set('inquiry_details', e.target.value)} />
          </label>
        </div>

        <h3 className="section-title">Location & Assignment</h3>
        <div className="form-grid">
          <label className="field">
            <span>Country *</span>
            <select value={form.country} onChange={(e) => set('country', e.target.value)}>
              <option>India</option>
              <option>Other than India</option>
            </select>
          </label>
          {form.country === 'India' && (
            <>
              <label className="field">
                <span>State</span>
                <select value={form.state} onChange={(e) => set('state', e.target.value)}>
                  <option value="">Not known</option>
                  {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
              <label className="field">
                <span>City</span>
                <input value={form.city} onChange={(e) => set('city', e.target.value)} />
              </label>
            </>
          )}
          {isAdmin && (
            <label className="field">
              <span>Assign To</span>
              <select value={form.assigned_sales_email} onChange={(e) => set('assigned_sales_email', e.target.value)}>
                <option value="auto">Auto (by state)</option>
                {meta.salespeople.map((em) => <option key={em} value={em}>{salesName(em)}</option>)}
              </select>
            </label>
          )}
        </div>

        <p className="muted small">
          {isAdmin
            ? 'If state is not known and Auto is selected, the lead goes to "Needs Mapping" so you can assign it later.'
            : 'This lead will be assigned to you.'}
        </p>
        {error && <div className="alert error">{error}</div>}

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Lead'}</button>
        </div>
      </form>
    </div>
  );
}