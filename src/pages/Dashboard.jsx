import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Megaphone, Globe, PhoneCall, CalendarDays, Trophy } from 'lucide-react';
import { api, getUser } from '../api';
import { formatDate, statusClass, sourceClass, salesName } from '../utils';

function Bars({ rows, labelFn = (l) => l }) {
  const max = Math.max(1, ...rows.map((r) => Number(r.count)));
  return (
    <div className="bars">
      {rows.map((r) => (
        <div className="bar-row" key={r.label}>
          <div className="bar-label" title={r.label}>{labelFn(r.label)}</div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(Number(r.count) / max) * 100}%` }} />
          </div>
          <div className="bar-value">{r.count}</div>
        </div>
      ))}
      {rows.length === 0 && <p className="muted">No data yet</p>}
    </div>
  );
}

function Trend({ rows }) {
  const map = Object.fromEntries(rows.map((r) => [r.day, Number(r.count)]));
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString('en-CA');
    days.push({ key, count: map[key] || 0, label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) });
  }
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <div className="trend">
      {days.map((d) => (
        <div className="trend-col" key={d.key} title={`${d.label}: ${d.count} leads`}>
          <div className="trend-bar" style={{ height: `${(d.count / max) * 100}%` }} />
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const user = getUser();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('stats.php').then(setStats).catch((e) => setError(e.message));
    api('leads.php', { params: { limit: 6 } }).then((d) => setRecent(d.leads)).catch(() => {});
  }, []);

  if (error) return <div className="alert error">{error}</div>;
  if (!stats) return <div className="loading">Loading dashboard…</div>;

  const t = stats.totals;
  const cards = [
    { label: 'Total Leads', value: t.total, icon: Users, to: '/leads', tone: 'navy' },
    { label: 'Google Ads', value: t.google_ads, icon: Megaphone, to: '/leads/google', tone: 'orange' },
    { label: 'Website', value: t.website, icon: Globe, to: '/leads/website', tone: 'blue' },
    { label: 'Manual', value: t.manual, icon: PhoneCall, to: '/leads/manual', tone: 'purple' },
    { label: 'This Month', value: t.this_month, icon: CalendarDays, to: '/leads', tone: 'teal' },
    { label: 'Won', value: t.won, icon: Trophy, to: '/leads', tone: 'green' },
  ];

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Welcome, {user?.name}</h1>
          <p className="muted">
            {t.today} new {t.today === 1 ? 'lead' : 'leads'} today · {t.open_new} waiting for first contact
          </p>
        </div>
      </div>

      <div className="kpi-grid">
        {cards.map(({ label, value, icon: Icon, to, tone }) => (
          <Link to={to} key={label} className={`kpi kpi-${tone}`}>
            <div className="kpi-icon"><Icon size={20} /></div>
            <div>
              <div className="kpi-value">{value}</div>
              <div className="kpi-label">{label}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Leads in the last 30 days</h3>
        </div>
        <Trend rows={stats.last_30_days} />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head"><h3>By Status</h3></div>
          <Bars rows={stats.by_status} />
        </div>
        <div className="card">
          <div className="card-head"><h3>By Source</h3></div>
          <Bars rows={stats.by_source} />
        </div>
      </div>

      <div className="grid-2">
        {stats.by_salesperson && (
          <div className="card">
            <div className="card-head"><h3>By Salesperson</h3></div>
            <Bars rows={stats.by_salesperson} labelFn={(l) => (l === 'Not assigned' ? l : salesName(l))} />
          </div>
        )}
        <div className="card">
          <div className="card-head">
            <h3>Recent Leads</h3>
            <Link to="/leads" className="link">View all</Link>
          </div>
          <div className="recent-list">
            {recent.map((l) => (
              <div className="recent-item" key={l.id} onClick={() => navigate(`/leads/${l.id}`)}>
                <div>
                  <div className="recent-name">{l.full_name}</div>
                  <div className="muted small">
                    {l.company || l.product_category} · {formatDate(l.created_at)}
                  </div>
                </div>
                <div className="recent-tags">
                  <span className={sourceClass(l.lead_source)}>{l.lead_source}</span>
                  <span className={statusClass(l.status)}>{l.status}</span>
                </div>
              </div>
            ))}
            {recent.length === 0 && <p className="muted">No leads yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}