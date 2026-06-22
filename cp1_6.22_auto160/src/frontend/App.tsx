import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider } from './context/UserContext';
import Navbar from './components/Navbar';
import ScheduleModule from './modules/schedule/ScheduleModule';
import RecommendSidebar from './modules/recommend/RecommendSidebar';
import { useActivityReminder } from './modules/notify/useActivityReminder';

function AppContent() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  useActivityReminder();

  const handleMenuClick = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className="app-layout">
      <Navbar onMenuClick={handleMenuClick} />
      
      <main className="app-main">
        <ScheduleModule />
      </main>

      <aside className="app-sidebar">
        <RecommendSidebar />
      </aside>

      <RecommendSidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
    </div>
  );
}

function App() {
  return (
    <Router>
      <UserProvider>
        <Routes>
          <Route path="/" element={<AppContent />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </UserProvider>
    </Router>
  );
}

export default App;
