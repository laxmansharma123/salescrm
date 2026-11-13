import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getToken } from './api';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LeadsPage from './pages/LeadsPage';
import LeadDetail from './pages/LeadDetail';
import AddLead from './pages/AddLead';
import BulkCards from './pages/BulkCards';

function Protected({ children }) {
  return getToken() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <Protected>
              <Layout />
            </Protected>
          }
        >
          <Route index element={<Dashboard />} />
          <Route
            path="leads"
            element={<LeadsPage key="all" source="" title="All Leads" subtitle="Every inquiry from all sources" />}
          />
          <Route
            path="leads/google"
            element={
              <LeadsPage key="google" source="google_ads" title="Google Ads Leads" subtitle="Leads that came from your paid Google campaigns" />
            }
          />
          <Route
            path="leads/website"
            element={
              <LeadsPage key="website" source="website" title="Website Leads" subtitle="Organic search, direct visits and referrals" />
            }
          />
          <Route
            path="leads/manual"
            element={
              <LeadsPage key="manual" source="manual" title="Manual Leads" subtitle="Phone calls, exhibitions, references and walk-ins" />
            }
          />
          <Route path="leads/new" element={<AddLead />} />
          <Route path="leads/cards" element={<BulkCards />} />
          <Route path="leads/:id" element={<LeadDetail />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}