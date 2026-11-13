import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { api } from '../api';
import { STATUSES, INDIAN_STATES, formatDate, statusClass, sourceClass, salesName } from '../utils';

const EMPTY_FILTERS = { q: '', status: '', state: '', date_from: '', date_to: '' };

export default function LeadsPage({ source, title, subtitle }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Wait until the user stops typing before searching
  useEffect(() => {
    if (search === filters.q) return undefined;
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, q: search }));
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search, filters.q]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api('leads.php', { params: { source, ...filters, page, limit: 20 } })
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [source, filters, page]);

  function update(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  function clearAll() {
    setSearch('');
    setFilters(EMPTY_FILTERS);
    setPage(1);
  }

  const hasFilters = Object.values(filters).some((v) => v !== '');

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
        </div>
        <button className="btn btn-accent" onClick={() => navigate('/leads/new')}>
          <Plus size={18} /> Add Lead
        </button>
      </div>

      <div className="card filters">
        <div className="search-box">
          <Search size={18} />
          <input
            placeholder="Search name, company, phone, email, city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={filters.status} onChange={(e) => update('status', e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={filters.state} onChange={(e) => update('state', e.target.value)}>
          <option value="">All states</option>
          {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <label className="date-field">
          <span>From</span>
          <input type="date" value={filters.date_from} onChange={(e) => update('date_from', e.target.value)} />
        </label>
        <label className="date-field">
          <span>To</span>
          <input type="date" value={filters.date_to} onChange={(e) => update('date_to', e.target.value)} />
        </label>
        {hasFilters && (
          <button className="btn btn-ghost" onClick={clearAll}>
            <X size={16} /> Clear
          </button>
        )}
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="card table-card">
        <div className="table-meta">
          {data ? `${data.total} ${data.total === 1 ? 'lead' : 'leads'}` : ' '}
          {loading && <span className="muted"> · loading…</span>}
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Phone</th>
                <th>Product</th>
                <th>Location</th>
                <th>Source</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {data?.leads.map((l) => (
                <tr key={l.id} onClick={() => navigate(`/leads/${l.id}`)}>
                  <td>
                    <div className="cell-main">{l.full_name}</div>
                    <div className="cell-sub">{l.company || l.email || '-'}</div>
                  </td>
                  <td>{l.phone}</td>
                  <td>
                    <div>{l.product_category}</div>
                    {l.sub_category && <div className="cell-sub">{l.sub_category}</div>}
                  </td>
                  <td>{l.country === 'India' ? [l.city, l.state].filter(Boolean).join(', ') : 'Export'}</td>
                  <td>
                    <span className={sourceClass(l.lead_source)}>{l.lead_source}</span>
                    {l.utm_campaign && <div className="cell-sub">{l.utm_campaign}</div>}
                  </td>
                  <td><span className={statusClass(l.status)}>{l.status}</span></td>
                  <td>{salesName(l.assigned_sales_email)}</td>
                  <td className="nowrap">{formatDate(l.created_at)}</td>
                </tr>
              ))}
              {data && data.leads.length === 0 && (
                <tr className="empty-row">
                  <td colSpan="8">No leads found{hasFilters ? ' for these filters' : ''}.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {data && data.pages > 1 && (
          <div className="pager">
            <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft size={16} /> Prev
            </button>
            <span>Page {data.page} of {data.pages}</span>
            <button className="btn btn-ghost" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}