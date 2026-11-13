import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Upload, CheckCheck, X, Trash2, ChevronRight, ExternalLink } from 'lucide-react';
import { api, getUser } from '../api';
import { scanCard } from '../cardScanner';
import { CUSTOMER_TYPES, INDIAN_STATES, OFFLINE_SOURCES, salesName } from '../utils';

const STATUS_LABEL = {
  queued: 'Waiting',
  scanning: 'Reading…',
  ready: 'Ready',
  review: 'Check details',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Error',
};

let nextId = 1;

function isComplete(f, common) {
  return Boolean(f.full_name && f.phone && (f.product_category || common.product_category));
}

export default function BulkCards() {
  const navigate = useNavigate();
  const isAdmin = getUser()?.role === 'admin';
  const fileRef = useRef(null);
  const busy = useRef(false);

  const [meta, setMeta] = useState({ salespeople: [], categories: [] });
  const [common, setCommon] = useState({
    event: '', product_category: '', lead_source: 'Exhibition',
    customer_type: 'Institution', default_state: '', assigned_sales_email: 'auto',
  });
  const [cards, setCards] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [tick, setTick] = useState(0);
  const [savingAll, setSavingAll] = useState(false);

  useEffect(() => {
    api('meta.php').then(setMeta).catch(() => {});
  }, []);

  // Warn before closing the page if some cards are not saved yet
  useEffect(() => {
    const unsaved = cards.some((c) => c.status !== 'saved');
    const handler = (e) => {
      if (unsaved) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [cards]);

  function updateCard(id, patch) {
    setCards((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  // Read cards one by one in the background
  useEffect(() => {
    if (busy.current) return;
    const next = cards.find((c) => c.status === 'queued');
    if (!next) return;
    busy.current = true;
    updateCard(next.id, { status: 'scanning', progress: 0 });
    scanCard(next.file, (p) => updateCard(next.id, { progress: p }))
      .then(({ text, fields }) => {
        updateCard(next.id, {
          text,
          fields: { ...fields, product_category: '' },
          status: isComplete(fields, common) ? 'ready' : 'review',
        });
      })
      .catch((e) => updateCard(next.id, { status: 'error', error: e.message || 'Could not read this card' }))
      .finally(() => {
        busy.current = false;
        setTick((t) => t + 1);
      });
  }, [cards, tick, common]);

  function addFiles(fileList) {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
    setCards((list) => [
      ...list,
      ...files.map((file) => ({
        id: nextId++,
        file,
        preview: URL.createObjectURL(file),
        status: 'queued',
        progress: 0,
        text: '',
        fields: { full_name: '', designation: '', company: '', phone: '', email: '', state: '', city: '', notes: '', product_category: '' },
        error: '',
        leadId: null,
      })),
    ]);
  }

  function removeCard(id) {
    setCards((list) => {
      const card = list.find((c) => c.id === id);
      if (card) URL.revokeObjectURL(card.preview);
      return list.filter((c) => c.id !== id);
    });
    if (selectedId === id) setSelectedId(null);
  }

  function editField(id, key, value) {
    setCards((list) =>
      list.map((c) => {
        if (c.id !== id) return c;
        const fields = { ...c.fields, [key]: value };
        const status = ['saved', 'saving', 'queued', 'scanning'].includes(c.status)
          ? c.status
          : isComplete(fields, common) ? 'ready' : 'review';
        return { ...c, fields, status, error: '' };
      })
    );
  }

  async function saveCard(card) {
    const f = card.fields;
    const category = f.product_category || common.product_category;
    if (!f.full_name || !f.phone || !category) {
      updateCard(card.id, { status: 'review', error: 'Name, phone and product category are required' });
      return false;
    }
    updateCard(card.id, { status: 'saving', error: '' });
    try {
      const res = await api('add_lead.php', {
        method: 'POST',
        body: {
          full_name: f.full_name,
          phone: f.phone,
          email: f.email,
          company: f.company,
          customer_type: common.customer_type,
          product_category: category,
          country: 'India',
          state: f.state || common.default_state,
          city: f.city,
          lead_source: common.lead_source,
          assigned_sales_email: common.assigned_sales_email,
          inquiry_details: [common.event && `Exhibition / Event: ${common.event}`, f.notes].filter(Boolean).join('\n'),
        },
      });
      updateCard(card.id, { status: 'saved', leadId: res.id });
      return true;
    } catch (e) {
      updateCard(card.id, { status: 'review', error: e.message });
      return false;
    }
  }

  async function saveAllReady() {
    setSavingAll(true);
    const ready = cards.filter((c) => c.status === 'ready');
    for (const card of ready) {
      // eslint-disable-next-line no-await-in-loop
      await saveCard(card);
    }
    setSavingAll(false);
  }

  function clearSaved() {
    cards.filter((c) => c.status === 'saved').forEach((c) => URL.revokeObjectURL(c.preview));
    setCards((list) => list.filter((c) => c.status !== 'saved'));
    setSelectedId(null);
  }

  const counts = cards.reduce((acc, c) => ({ ...acc, [c.status]: (acc[c.status] || 0) + 1 }), {});
  const selected = cards.find((c) => c.id === selectedId) || null;
  const nextUnsaved = selected
    ? cards.find((c) => c.id !== selected.id && ['ready', 'review'].includes(c.status))
    : null;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Scan Business Cards</h1>
          <p className="muted">Upload all your exhibition cards at once. Check each card, then save them as leads.</p>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate('/leads/new')}>Add single lead</button>
      </div>

      <div className="card">
        <h3 className="section-title">Common details for all cards</h3>
        <div className="form-grid">
          <label className="field">
            <span>Exhibition / Event name</span>
            <input placeholder="e.g. NIRMANX EXPO 2027" value={common.event} onChange={(e) => setCommon({ ...common, event: e.target.value })} />
          </label>
          <label className="field">
            <span>Product Category *</span>
            <input list="bulk-category-list" value={common.product_category} onChange={(e) => setCommon({ ...common, product_category: e.target.value })} />
            <datalist id="bulk-category-list">
              {meta.categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </label>
          <label className="field">
            <span>Lead Source</span>
            <select value={common.lead_source} onChange={(e) => setCommon({ ...common, lead_source: e.target.value })}>
              {OFFLINE_SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Customer Type</span>
            <select value={common.customer_type} onChange={(e) => setCommon({ ...common, customer_type: e.target.value })}>
              {CUSTOMER_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Default State (if not on card)</span>
            <select value={common.default_state} onChange={(e) => setCommon({ ...common, default_state: e.target.value })}>
              <option value="">Not known</option>
              {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          {isAdmin && (
            <label className="field">
              <span>Assign To</span>
              <select value={common.assigned_sales_email} onChange={(e) => setCommon({ ...common, assigned_sales_email: e.target.value })}>
                <option value="auto">Auto (by state)</option>
                {meta.salespeople.map((em) => <option key={em} value={em}>{salesName(em)}</option>)}
              </select>
            </label>
          )}
        </div>
      </div>

      <div
        className="dropzone"
        onClick={() => fileRef.current.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
      >
        <Upload size={28} />
        <div><strong>Click to upload card photos</strong> or drag and drop them here</div>
        <div className="muted small">You can select many images at once (JPG or PNG)</div>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
      </div>

      {cards.length > 0 && (
        <div className="bulk-toolbar">
          <div className="bulk-counts">
            <span>{cards.length} cards</span>
            {(counts.queued || 0) + (counts.scanning || 0) > 0 && <span className="pill">Reading {(counts.queued || 0) + (counts.scanning || 0)}</span>}
            {counts.ready > 0 && <span className="pill card-st-ready">Ready {counts.ready}</span>}
            {counts.review > 0 && <span className="pill card-st-review">Check {counts.review}</span>}
            {counts.saved > 0 && <span className="pill card-st-saved">Saved {counts.saved}</span>}
          </div>
          <div className="bulk-actions">
            {counts.saved > 0 && <button className="btn btn-ghost" onClick={clearSaved}>Clear saved</button>}
            <button className="btn btn-accent" disabled={!counts.ready || savingAll} onClick={saveAllReady}>
              <CheckCheck size={16} /> {savingAll ? 'Saving…' : `Save all ready (${counts.ready || 0})`}
            </button>
          </div>
        </div>
      )}

      <div className="card-grid">
        {cards.map((c) => (
          <div key={c.id} className={`biz-card st-${c.status}`} onClick={() => setSelectedId(c.id)}>
            <div className="biz-card-img">
              <img src={c.preview} alt="Business card" />
              <span className={`pill biz-status card-st-${c.status}`}>{STATUS_LABEL[c.status]}</span>
            </div>
            {c.status === 'scanning' || c.status === 'queued' ? (
              <div className="biz-card-body">
                <div className="progress"><div style={{ width: `${Math.round((c.progress || 0) * 100)}%` }} /></div>
                <div className="muted small">{c.status === 'queued' ? 'Waiting…' : `Reading ${Math.round(c.progress * 100)}%`}</div>
              </div>
            ) : (
              <div className="biz-card-body">
                <div className="biz-name">{c.fields.full_name || <span className="missing">Name not found</span>}</div>
                <div className="biz-line">{c.fields.company || '—'}</div>
                <div className="biz-line">{c.fields.phone || <span className="missing">Phone not found</span>}</div>
                <div className="biz-line">{c.fields.email || '—'}</div>
                {c.error && <div className="biz-error">{c.error}</div>}
              </div>
            )}
          </div>
        ))}
      </div>

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelectedId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Card details</h3>
              <button className="icon-btn" onClick={() => setSelectedId(null)} aria-label="Close"><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="modal-image">
                <img src={selected.preview} alt="Business card" />
                {selected.text && (
                  <details className="ocr-text">
                    <summary>Show scanned text</summary>
                    <pre>{selected.text}</pre>
                  </details>
                )}
              </div>
              <div className="modal-form">
                {selected.status === 'saved' ? (
                  <div className="alert success">
                    Saved as lead #{selected.leadId}.{' '}
                    <Link to={`/leads/${selected.leadId}`}>Open lead <ExternalLink size={12} /></Link>
                  </div>
                ) : null}
                {['queued', 'scanning'].includes(selected.status) && <div className="alert">Still reading this card…</div>}

                {[
                  ['full_name', 'Name *'],
                  ['designation', 'Designation'],
                  ['company', 'Company'],
                  ['phone', 'Phone *'],
                  ['email', 'Email'],
                  ['city', 'City'],
                ].map(([key, label]) => (
                  <label className="field" key={key}>
                    <span>{label}</span>
                    <input
                      value={selected.fields[key] || ''}
                      disabled={selected.status === 'saved'}
                      onChange={(e) => editField(selected.id, key, e.target.value)}
                    />
                  </label>
                ))}
                <label className="field">
                  <span>State</span>
                  <select
                    value={selected.fields.state || ''}
                    disabled={selected.status === 'saved'}
                    onChange={(e) => editField(selected.id, 'state', e.target.value)}
                  >
                    <option value="">{common.default_state ? `Default (${common.default_state})` : 'Not known'}</option>
                    {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Product Category {common.product_category ? '(optional — uses common)' : '*'}</span>
                  <input
                    list="bulk-category-list"
                    placeholder={common.product_category}
                    value={selected.fields.product_category || ''}
                    disabled={selected.status === 'saved'}
                    onChange={(e) => editField(selected.id, 'product_category', e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Notes</span>
                  <textarea
                    rows={4}
                    value={selected.fields.notes || ''}
                    disabled={selected.status === 'saved'}
                    onChange={(e) => editField(selected.id, 'notes', e.target.value)}
                  />
                </label>

                {selected.error && <div className="alert error">{selected.error}</div>}

                <div className="modal-actions">
                  <button className="btn btn-ghost" onClick={() => removeCard(selected.id)}>
                    <Trash2 size={16} /> Remove
                  </button>
                  {nextUnsaved && (
                    <button className="btn btn-ghost" onClick={() => setSelectedId(nextUnsaved.id)}>
                      Next card <ChevronRight size={16} />
                    </button>
                  )}
                  {selected.status !== 'saved' && (
                    <button
                      className="btn btn-primary"
                      disabled={['queued', 'scanning', 'saving'].includes(selected.status)}
                      onClick={async () => {
                        const ok = await saveCard(selected);
                        if (ok && nextUnsaved) setSelectedId(nextUnsaved.id);
                      }}
                    >
                      {selected.status === 'saving' ? 'Saving…' : 'Save Lead'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}