import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Toast } from './components/Toast';
import { RequestListPage } from './pages/RequestListPage';
import { RequestFormPage } from './pages/RequestFormPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { LoginPage } from './pages/LoginPage';

export default function App() {
  return (
    <Router>
      <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
        <Navbar />
        <Routes>
          <Route path="/" element={<RequestListPage />} />
          <Route path="/create" element={<RequestFormPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
        <Toast />
      </div>
    </Router>
  );
}
