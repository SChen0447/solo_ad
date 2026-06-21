import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { AppProvider } from './frontend/context/AppContext';
import Home from '@/pages/Home';
import ApplicationList from './frontend/components/ApplicationList';
import FollowUpPanel from './frontend/components/FollowUpPanel';
import PetDetail from './frontend/components/PetDetail';
import ApplicationForm from './frontend/components/ApplicationForm';
import { useAppContext } from './frontend/context/AppContext';
import type { FollowUpReminder } from '../shared/types';

function ReminderToast({ reminders }: { reminders: FollowUpReminder[] }) {
  if (reminders.length === 0) return null;
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        background: '#FFFFFF',
        border: '2px solid #F58F29',
        borderRadius: '12px',
        padding: '14px 20px',
        boxShadow: '0px 4px 16px rgba(0,0,0,0.12)',
        zIndex: 2000,
        maxWidth: '340px',
        animation: 'reminderIn 0.3s ease-out',
      }}
    >
      <style>{`
        @keyframes reminderIn {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <span style={{ fontSize: '18px', flexShrink: 0 }}>🔔</span>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#E65100', marginBottom: '4px' }}>
            回访提醒
          </div>
          {reminders.map((r) => (
            <div key={r.applicationId} style={{ fontSize: '13px', color: '#666', marginBottom: '2px' }}>
              {r.petName}（{r.applicantName}）领养已{r.daysSinceAdoption}天，请及时回访
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { reminders, showDetail, showApplicationForm } = useAppContext();

  return (
    <div style={{ minHeight: '100vh', background: '#F0F2F5' }}>
      <nav
        style={{
          height: '64px',
          background: '#F58F29',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '32px' }}>
          <span style={{ fontSize: '24px' }}>🐾</span>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap' }}>
            宠物救助领养平台
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[
            { to: '/', label: '首页' },
            { to: '/applications', label: '申请管理' },
            { to: '/followups', label: '回访管理' },
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              style={({ isActive }) => ({
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#F58F29' : '#FFFFFF',
                background: isActive ? '#FFFFFF' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/applications" element={<ApplicationList />} />
        <Route path="/followups" element={<FollowUpPanel />} />
      </Routes>

      {showDetail && <PetDetail />}
      {showApplicationForm && <ApplicationForm />}
      <ReminderToast reminders={reminders} />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </Router>
  );
}
