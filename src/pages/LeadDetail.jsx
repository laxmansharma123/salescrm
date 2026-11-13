import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MessageCircle } from 'lucide-react';
import { api, getUser } from '../api';
import { STATUSES, formatDateTime, statusClass, sourceClass, salesName, whatsappLink } from '../utils';

function Row({ label, value }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="info-row">
      <div className="info-label">{label}</div>
      <div className="info-value">{value}</div>
    </div>
  );
}

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getUser();
  const isAdmin = user?.role === 'admin';

  const [lead, setLead] = useState(null);
  const [notes, setNotes] = useState([]);
  const [salespeople, setSalespeople] = useState([]);
  const [status, setStatus] = useState('');
  const [assigned, setAssigned] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function applyData(d) {
    setLead(d.lead);
    setNotes(d.notes);
    setStatus(d.lead.status);
    setAssigned(d.lead.assigned_sales_email || '');
  }

  useEffect(() => {
    api('lead.php', { params: { id } }).then(applyData).catch((e) => setError(e.message));
    if (isAdmin) {
      api('meta.php').then((m) => setSalespeople(m.salespeople)).catch(() => {});
    }
  }, [id, isAdmin]);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const body = { id: Number(id), status, note };
      if (isAdmin) body.assigned_sales_email = assigned;
      const d = await api('lead.php', { method: 'POST', body });
      applyData(d);
      setNote('');
      setMessage('Saved');
      setTimeout(() => setMessage(''), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (error && !lead) return <div className="alert error">{error}</div>;
  if (!lead) return <div className="loading">Loading lead…</div>;

  const wa = whatsappLink(lead.phone);
  const location = lead.country === 'India'
    ? [lead.city, lead.state, 'India'].filter(Boolean).join(', ')
    : 'Outside India (Export)';
  const assignOptions = Array.from(new Set([...salespeople, lead.assigned_sales_email].filter(Boolean)));

  return (
    <div>
      <button className="back-link" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> Back
      </button>

      <div className="lead-header card">
        <div className="lead-title">
          <div className="avatar big">{lead.full_name.charAt(0).toUpperCase()}</div>
          <div>
            <h1>{lead.full_name}</h1>
            <div className="muted">{lead.company || 'No company'} · Lead #{lead.id}</div>
            <div className="lead-tags">
              <span className={sourceClass(lead.lead_source)}>{lead.lead_source}</span>
              <span className={statusClass(lead.status)}>{lead.status}</span>
            </div>
          </div>
        </div>
        <div className="quick-actions">
          <a className="btn btn-ghost" href={`tel:${lead.phone}`}><Phone size={16} /> Call</a>
          {wa && <a className="btn btn-ghost" href={wa} target="_blank" rel="noreferrer"><MessageCircle size={16} /> WhatsApp</a>}
          {lead.email && <a className="btn btn-ghost" href={`mailto:${lead.email}`}><Mail size={16} /> Email</a>}
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <div className="card">
            <div className="card-head"><h3>Customer</h3></div>
            <Row label="Name" value={lead.full_name} />
            <Row label="Phone" value={lead.phone} />
            <Row label="Email" value={lead.email} />
            <Row label="Company" value={lead.company} />
            <Row label="Customer Type" value={lead.customer_type} />
            <Row label="Location" value={location} />
          </div>

          <div className="card">
            <div className="card-head"><h3>Requirement</h3></div>
            <Row label="Product Category" value={lead.product_category} />
            <Row label="Sub Category" value={lead.sub_category} />
            <Row label="Inquiry Details" value={<span className="pre">{lead.inquiry_details || '-'}</span>} />
          </div>

          <div className="card">
            <div className="card-head"><h3>Lead Source</h3></div>
            <Row label="Source" value={lead.lead_source} />
            <Row label="UTM Source" value={lead.utm_source} />
            <Row label="UTM Medium" value={lead.utm_medium} />
            <Row label="Campaign" value={lead.utm_campaign} />
            <Row label="Keyword (utm_term)" value={lead.utm_term} />
            <Row label="GCLID" value={lead.gclid} />
            <Row label="Landing Page" value={lead.landing_page} />
            <Row label="Referrer" value={lead.referrer_url} />
            <Row label="Received" value={formatDateTime(lead.created_at)} />
          </div>
        </div>

        <div className="detail-side">
          <form className="card" onSubmit={save}>
            <div className="card-head"><h3>Update Lead</h3></div>

            <label className="field">
              <span>Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>

            {isAdmin ? (
              <label className="field">
                <span>Assigned To</span>
                <select value={assigned} onChange={(e) => setAssigned(e.target.value)}>
                  <option value="">Not assigned</option>
                  {assignOptions.map((em) => (
                    <option key={em} value={em}>{salesName(em)} ({em})</option>
                  ))}
                </select>
              </label>
            ) : (
              <Row label="Assigned To" value={salesName(lead.assigned_sales_email)} />
            )}

            <label className="field">
              <span>Follow-up note</span>
              <textarea
                rows={4}
                placeholder="e.g. Called customer, sending quotation tomorrow"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>

            {error && <div className="alert error">{error}</div>}
            {message && <div className="alert success">{message}</div>}

            <button className="btn btn-primary btn-block" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </form>

          <div className="card">
            <div className="card-head"><h3>Activity</h3></div>
            <div className="timeline">
              {notes.map((n) => (
                <div className="timeline-item" key={n.id}>
                  <div className="timeline-dot" />
                  <div>
                    <div className="timeline-text">{n.note}</div>
                    <div className="muted small">{n.user_name || 'System'} · {formatDateTime(n.created_at)}</div>
                  </div>
                </div>
              ))}
              <div className="timeline-item">
                <div className="timeline-dot first" />
                <div>
                  <div className="timeline-text">Lead received via {lead.lead_source}</div>
                  <div className="muted small">{formatDateTime(lead.created_at)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}